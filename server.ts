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

// In-memory one-time claimed admin password hash (only used when process.env.ADMIN_PASSCODE is unset)
let claimedAdminCredential: { salt: string; hashHex: string } | null = null;
const revokedTokenIds = new Set<string>();

// Lightweight per-IP rate limiting for admin auth endpoints
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 12;
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

function issueAdminToken(): string {
  const jti = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + SESSION_TTL_MS;
  const payloadB64 = Buffer.from(JSON.stringify({ role: 'owner_admin', jti, exp }), 'utf8').toString(
    'base64url'
  );
  const sigB64 = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

function verifyAdminToken(token: string): { valid: boolean; jti?: string } {
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
    };
    if (
      parsed.role !== 'owner_admin' ||
      typeof parsed.jti !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return { valid: false };
    }
    if (Date.now() > parsed.exp || revokedTokenIds.has(parsed.jti)) {
      return { valid: false };
    }
    return { valid: true, jti: parsed.jti };
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

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'star-event-live' });
  });

  // Owner-only Admin Auth Endpoints (no secrets exposed to browser)
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
    const token = issueAdminToken();
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
      // Configured environment secret always overrides any claimed fallback hash
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
    const token = issueAdminToken();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, token });
  });

  app.get('/api/admin/verify', (req, res) => {
    const token = extractBearerToken(req);
    const result = verifyAdminToken(token);
    res.setHeader('Cache-Control', 'no-store');
    if (!result.valid) {
      res.status(401).json({ ok: false });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractBearerToken(req);
    const result = verifyAdminToken(token);
    if (result.valid && result.jti) {
      revokedTokenIds.add(result.jti);
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
