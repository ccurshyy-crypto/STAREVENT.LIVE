import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Ephemeral per-process HMAC signing key fallback (overridden by ADMIN_SESSION_SECRET if set)
const SESSION_SIGNING_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Owner Admin credential state (process.env.ADMIN_PASSCODE overrides any one-time claimed scrypt hash)
let claimedAdminCredential: { salt: string; hashHex: string } | null = null;
const revokedTokenIds = new Set<string>();

// Server-side hashed Scoreboard Overlay Control accounts (NEVER plaintext passwords)
interface OverlayAccountRecord {
  loginId: string;
  assignedUser: string;
  uid: string;
  salt: string;
  hashHex: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const overlayAccounts = new Map<string, OverlayAccountRecord>();

// Lightweight per-IP rate limiting for auth endpoints
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 15;
const authAttempts = new Map<string, { count: number; resetAt: number }>();

function getConfiguredPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function getClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX_ATTEMPTS;
}

function resetRateLimit(ip: string): void {
  authAttempts.delete(ip);
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function hashPasswordScrypt(password: string, saltHex?: string): { salt: string; hashHex: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return { salt, hashHex: derived.toString('hex') };
}

function verifyScryptPassword(password: string, stored: { salt: string; hashHex: string }): boolean {
  const candidate = crypto.scryptSync(password, stored.salt, 64);
  const expected = Buffer.from(stored.hashHex, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function sanitizeLoginId(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

function issueSignedToken(payload: Record<string, unknown>): string {
  const jti = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + SESSION_TTL_MS;
  const payloadB64 = Buffer.from(JSON.stringify({ ...payload, jti, exp }), 'utf8').toString(
    'base64url'
  );
  const sigB64 = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

function verifySignedToken(
  token: string,
  expectedRole: 'owner_admin' | 'overlay_controller'
): { valid: boolean; jti?: string; loginId?: string; assignedUser?: string; uid?: string } {
  if (!token || typeof token !== 'string') return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { valid: false };

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payloadB64)
    .digest();
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sigB64, 'base64url');
  } catch {
    return { valid: false };
  }
  if (providedSig.length !== expectedSig.length) return { valid: false };
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return { valid: false };

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      role?: string;
      jti?: string;
      exp?: number;
      loginId?: string;
      assignedUser?: string;
      uid?: string;
    };
    if (
      parsed.role !== expectedRole ||
      typeof parsed.jti !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return { valid: false };
    }
    if (Date.now() > parsed.exp || revokedTokenIds.has(parsed.jti)) {
      return { valid: false };
    }
    if (expectedRole === 'overlay_controller' && parsed.loginId) {
      const acct = overlayAccounts.get(parsed.loginId);
      if (acct && !acct.isActive) return { valid: false };
    }
    return {
      valid: true,
      jti: parsed.jti,
      loginId: parsed.loginId,
      assignedUser: parsed.assignedUser,
      uid: parsed.uid,
    };
  } catch {
    return { valid: false };
  }
}

function extractBearerToken(req: express.Request): string {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice(7).trim();
}

function serializeOverlayAccount(rec: OverlayAccountRecord) {
  return {
    loginId: rec.loginId,
    assignedUser: rec.assignedUser,
    uid: rec.uid,
    isActive: rec.isActive,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'star-event-live' });
  });

  // =========================================================================
  // 1. OWNER-ONLY ADMIN AUTH ENDPOINTS
  // =========================================================================
  app.get('/api/admin/status', (_req, res) => {
    const envConfigured = getConfiguredPasscode().length > 0;
    const claimed = Boolean(claimedAdminCredential);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      configured: envConfigured,
      claimed,
      requiresClaim: !envConfigured && !claimed,
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: 'Too many attempts. Please try again later.' });
      return;
    }

    if (getConfiguredPasscode().length > 0 || claimedAdminCredential) {
      res.status(409).json({
        ok: false,
        error: 'Owner admin credentials are already configured. Please sign in.',
      });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Owner password must be between 8 and 128 characters.',
      });
      return;
    }

    claimedAdminCredential = hashPasswordScrypt(password);
    resetRateLimit(ip);
    const token = issueSignedToken({ role: 'owner_admin' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, token });
  });

  app.post('/api/admin/login', (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: 'Too many attempts. Please wait and retry.' });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (!password || password.length > 128) {
      res.status(400).json({ ok: false, error: 'Please enter your owner admin password.' });
      return;
    }

    const configuredPasscode = getConfiguredPasscode();
    let authorized = false;

    if (configuredPasscode.length > 0) {
      authorized = timingSafeTextEqual(password, configuredPasscode);
    } else if (claimedAdminCredential) {
      authorized = verifyScryptPassword(password, claimedAdminCredential);
    } else {
      res.status(409).json({
        ok: false,
        error: 'Owner admin password is not claimed yet. Complete first-run setup first.',
      });
      return;
    }

    if (!authorized) {
      res.status(401).json({ ok: false, error: 'Invalid owner admin password.' });
      return;
    }

    resetRateLimit(ip);
    const token = issueSignedToken({ role: 'owner_admin' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, token });
  });

  app.get('/api/admin/verify', (req, res) => {
    const token = extractBearerToken(req);
    const result = verifySignedToken(token, 'owner_admin');
    res.setHeader('Cache-Control', 'no-store');
    if (!result.valid) {
      res.status(401).json({ ok: false });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractBearerToken(req);
    const result = verifySignedToken(token, 'owner_admin');
    if (result.valid && result.jti) {
      revokedTokenIds.add(result.jti);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  // =========================================================================
  // 2. ADMIN-ONLY SCOREBOARD OVERLAY ACCOUNT MANAGEMENT (SCRYPT HASHED)
  // =========================================================================
  const requireOwnerAdmin: express.RequestHandler = (req, res, next) => {
    const token = extractBearerToken(req);
    const verified = verifySignedToken(token, 'owner_admin');
    if (!verified.valid) {
      res.status(401).json({ ok: false, error: 'Owner admin authentication required.' });
      return;
    }
    next();
  };

  app.get('/api/admin/overlay-accounts', requireOwnerAdmin, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      accounts: Array.from(overlayAccounts.values()).map(serializeOverlayAccount),
    });
  });

  app.post('/api/admin/overlay-accounts', requireOwnerAdmin, (req, res) => {
    const loginId = sanitizeLoginId(req.body?.loginId);
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const assignedUser =
      typeof req.body?.assignedUser === 'string'
        ? req.body.assignedUser.trim().slice(0, 80)
        : '';
    const uid = sanitizeLoginId(req.body?.uid || loginId);

    if (loginId.length < 3) {
      res.status(400).json({
        ok: false,
        error: 'Overlay Login ID must be at least 3 characters (letters, numbers, - or _).',
      });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Overlay password must be between 6 and 128 characters.',
      });
      return;
    }
    if (overlayAccounts.has(loginId)) {
      res.status(409).json({ ok: false, error: `Overlay Login ID "${loginId}" already exists.` });
      return;
    }

    const { salt, hashHex } = hashPasswordScrypt(password);
    const nowIso = new Date().toISOString();
    const record: OverlayAccountRecord = {
      loginId,
      assignedUser: assignedUser || 'Authorized Operator',
      uid,
      salt,
      hashHex,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    overlayAccounts.set(loginId, record);

    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json({ ok: true, account: serializeOverlayAccount(record) });
  });

  app.patch('/api/admin/overlay-accounts/:loginId', requireOwnerAdmin, (req, res) => {
    const loginId = sanitizeLoginId(req.params.loginId);
    const existing = overlayAccounts.get(loginId);
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Overlay account not found.' });
      return;
    }

    if (typeof req.body?.assignedUser === 'string') {
      existing.assignedUser = req.body.assignedUser.trim().slice(0, 80) || existing.assignedUser;
    }
    if (typeof req.body?.uid === 'string' && sanitizeLoginId(req.body.uid).length >= 3) {
      existing.uid = sanitizeLoginId(req.body.uid);
    }
    if (typeof req.body?.isActive === 'boolean') {
      existing.isActive = req.body.isActive;
    }
    if (typeof req.body?.newPassword === 'string' && req.body.newPassword.trim().length > 0) {
      const nextPass = req.body.newPassword.trim();
      if (nextPass.length < 6 || nextPass.length > 128) {
        res.status(400).json({
          ok: false,
          error: 'New password must be between 6 and 128 characters.',
        });
        return;
      }
      const { salt, hashHex } = hashPasswordScrypt(nextPass);
      existing.salt = salt;
      existing.hashHex = hashHex;
    }
    existing.updatedAt = new Date().toISOString();
    overlayAccounts.set(loginId, existing);

    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, account: serializeOverlayAccount(existing) });
  });

  app.delete('/api/admin/overlay-accounts/:loginId', requireOwnerAdmin, (req, res) => {
    const loginId = sanitizeLoginId(req.params.loginId);
    if (!overlayAccounts.delete(loginId)) {
      res.status(404).json({ ok: false, error: 'Overlay account not found.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  // =========================================================================
  // 3. SEPARATE SCOREBOARD OVERLAY CONTROL AUTH (PRIVATE CONTROLLER GATE)
  // =========================================================================
  app.get('/api/overlay-auth/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      hasOverlayAccounts: overlayAccounts.size > 0,
      ownerPasscodeConfigured:
        getConfiguredPasscode().length > 0 || Boolean(claimedAdminCredential),
    });
  });

  app.post('/api/overlay-auth/login', (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: 'Too many login attempts. Please wait.' });
      return;
    }

    const loginId = sanitizeLoginId(req.body?.loginId);
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!loginId || !password) {
      res.status(400).json({ ok: false, error: 'Please enter both Login ID and Password.' });
      return;
    }

    // 1. Check dedicated hashed overlay accounts first
    const account = overlayAccounts.get(loginId);
    if (account) {
      if (!account.isActive) {
        res.status(403).json({
          ok: false,
          error: 'This Scoreboard Overlay Control account has been deactivated.',
        });
        return;
      }
      if (!verifyScryptPassword(password, account)) {
        res.status(401).json({ ok: false, error: 'Invalid Login ID or Password.' });
        return;
      }
      resetRateLimit(ip);
      const token = issueSignedToken({
        role: 'overlay_controller',
        loginId: account.loginId,
        assignedUser: account.assignedUser,
        uid: account.uid,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        token,
        account: serializeOverlayAccount(account),
      });
      return;
    }

    // 2. Also allow owner admin credentials (loginId === 'ADMIN' or 'OWNER') when configured/claimed
    if (loginId === 'ADMIN' || loginId === 'OWNER') {
      const configuredPasscode = getConfiguredPasscode();
      const ownerOk =
        configuredPasscode.length > 0
          ? timingSafeTextEqual(password, configuredPasscode)
          : claimedAdminCredential
            ? verifyScryptPassword(password, claimedAdminCredential)
            : false;

      if (ownerOk) {
        resetRateLimit(ip);
        const token = issueSignedToken({
          role: 'overlay_controller',
          loginId,
          assignedUser: 'Star Event Live Admin',
          uid: loginId,
        });
        res.setHeader('Cache-Control', 'no-store');
        res.json({
          ok: true,
          token,
          account: {
            loginId,
            assignedUser: 'Star Event Live Admin',
            uid: loginId,
            isActive: true,
          },
        });
        return;
      }
    }

    res.status(401).json({
      ok: false,
      error: 'Authorized Access Only — Invalid Login ID or Password.',
    });
  });

  app.get('/api/overlay-auth/verify', (req, res) => {
    const token = extractBearerToken(req);
    const verified = verifySignedToken(token, 'overlay_controller');
    res.setHeader('Cache-Control', 'no-store');
    if (!verified.valid) {
      res.status(401).json({ ok: false });
      return;
    }
    res.json({
      ok: true,
      loginId: verified.loginId,
      assignedUser: verified.assignedUser,
      uid: verified.uid,
    });
  });

  app.post('/api/overlay-auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    const verified = verifySignedToken(token, 'overlay_controller');
    if (verified.valid && verified.jti) {
      revokedTokenIds.add(verified.jti);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Event Live running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
