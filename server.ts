import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  adminApproveUpiQrPayment,
  adminRejectUpiQrPayment,
  buildOwnerUpiPaymentIntent,
  createCashfreeProductionOrder,
  generateUniqueCashfreeOrderId,
  generateUniqueUpiQrOrderId,
  getCashfreeProductionConfig,
  getCustomerThemeEntitlements,
  getUnlockRecord,
  isCashfreeConfigured,
  isUnlockRecordActive,
  listAdminAuditLogs,
  listAllPaymentRecords,
  listAllUnlockRecords,
  OWNER_UPI_ID,
  OWNER_UPI_PAYEE_NAME,
  OWNER_UPI_STATIC_QR_IMAGE,
  PAID_THEME_PRODUCTS,
  persistPaymentRecord,
  persistUnlockRecord,
  processVerifiedCashfreeWebhook,
  recordAdminAuditLog,
  resolvePaidThemeProduct,
  resolvePaidThemeProductByCode,
  sanitizeCustomerId,
  sanitizeOrderId,
  submitUpiQrUtrProof,
  verifyCashfreeWebhookSignature,
  verifyOrderDirectlyWithCashfree,
  WORLDCUP_FIXED_AMOUNT_INR,
  WORLDCUP_FIXED_CURRENCY,
  WORLDCUP_PRODUCT_NAME,
  type PaidThemeId,
  type WorldCupPaymentRecord,
  type WorldCupUnlockRecord,
} from './server/cashfreePayments.js';

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
  expectedRole: 'owner_admin' | 'overlay_controller' | 'customer_session'
): {
  valid: boolean;
  jti?: string;
  loginId?: string;
  assignedUser?: string;
  uid?: string;
  email?: string;
} {
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
      email?: string;
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
      email: parsed.email,
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

const CUSTOMER_SESSION_COOKIE = 'sel_customer_session';

function parseCookieHeader(headerValue: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headerValue) return out;
  for (const part of headerValue.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function verifyCookieOriginOrCsrfHeader(req: express.Request): boolean {
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return true;
  }
  const origin = req.headers.origin;
  if (!origin || typeof origin !== 'string') return false;
  try {
    const parsedOrigin = new URL(origin);
    const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    return Boolean(expectedHost) && parsedOrigin.host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}

function setCustomerSessionCookie(res: express.Response, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  );
}

function clearCustomerSessionCookie(res: express.Response): void {
  res.setHeader(
    'Set-Cookie',
    `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`
  );
}

function getServerSupabasePublicAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    'sb_publishable_SyrDtT05ElI0DYMlzQBbnA_tGZFbvkf'
  );
}

interface AuthenticatedCustomer {
  customerId: string;
  customerName: string;
  customerEmail: string;
  authSource: 'customer_session' | 'supabase_jwt';
}

async function resolveAuthenticatedCustomer(
  req: express.Request,
  requireCsrfCheckForCookie = false
): Promise<AuthenticatedCustomer | null> {
  const bearer = extractBearerToken(req);

  // 1. Check server-signed customer_session Bearer token
  if (bearer) {
    const signed = verifySignedToken(bearer, 'customer_session');
    if (signed.valid && signed.uid) {
      return {
        customerId: sanitizeCustomerId(signed.uid),
        customerName: signed.assignedUser || signed.uid,
        customerEmail: signed.email || 'customer@starevent.live',
        authSource: 'customer_session',
      };
    }

    // 2. Check live Supabase Auth JWT directly against Supabase Auth API
    try {
      const sbUrl = getServerSupabaseUrl();
      const anonKey = getServerSupabasePublicAnonKey();
      const userRes = await fetch(`${sbUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${bearer}`,
        },
      });
      if (userRes.ok) {
        const userJson = (await userRes.json().catch(() => null)) as {
          id?: string;
          email?: string;
          user_metadata?: Record<string, unknown>;
        } | null;
        if (userJson?.id) {
          let profileUid: string | null = null;
          let profileName: string | null = null;
          const supabaseAdmin = getSupabaseAdminClient();
          if (supabaseAdmin) {
            const { data: prof } = await supabaseAdmin
              .from('profiles')
              .select('uid, full_name, is_active')
              .eq('id', userJson.id)
              .maybeSingle();
            if (prof) {
              if (prof.is_active === false) return null;
              profileUid = typeof prof.uid === 'string' ? prof.uid : null;
              profileName = typeof prof.full_name === 'string' ? prof.full_name : null;
            }
          }
          const uid = deriveWorkspaceUid(
            userJson.id,
            profileUid ||
              (typeof userJson.user_metadata?.uid === 'string'
                ? userJson.user_metadata.uid
                : null)
          );
          return {
            customerId: sanitizeCustomerId(uid),
            customerName: profileName || userJson.email || uid,
            customerEmail: userJson.email || 'customer@starevent.live',
            authSource: 'supabase_jwt',
          };
        }
      }
    } catch {
      // Ignore network errors and reject below
    }
  }

  // 3. Check HttpOnly signed customer_session cookie (survives Cashfree full-page redirect)
  const cookies = parseCookieHeader(req.headers.cookie);
  const cookieToken = cookies[CUSTOMER_SESSION_COOKIE];
  if (cookieToken) {
    if (requireCsrfCheckForCookie && !verifyCookieOriginOrCsrfHeader(req)) {
      return null;
    }
    const signed = verifySignedToken(cookieToken, 'customer_session');
    if (signed.valid && signed.uid) {
      return {
        customerId: sanitizeCustomerId(signed.uid),
        customerName: signed.assignedUser || signed.uid,
        customerEmail: signed.email || 'customer@starevent.live',
        authSource: 'customer_session',
      };
    }
  }

  return null;
}

function resolvePublicOrigin(req: express.Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
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

// ===========================================================================
// SERVER-SIDE SUPABASE ADMIN CLIENT & EDGE FUNCTION BRIDGE (NEVER EXPOSED TO CLIENT)
// ===========================================================================
const DEFAULT_SUPABASE_URL = 'https://snhvvmabdzrcunssbqfn.supabase.co';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

function getServerSupabaseUrl(): string {
  const envUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  return normalizeSupabaseUrl(envUrl || DEFAULT_SUPABASE_URL);
}

function getValidatedEdgeFunctionUrl(): string | null {
  const raw = process.env.SUPABASE_EDGE_FUNCTION_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const isSupabaseHost =
      host.endsWith('.supabase.co') || host.endsWith('.supabase.in');
    if (!isSupabaseHost) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

let cachedSupabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return null;
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(getServerSupabaseUrl(), serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedSupabaseAdmin;
}

function isSupabaseUserBanned(bannedUntil?: string | null): boolean {
  if (!bannedUntil) return false;
  const ts = Date.parse(bannedUntil);
  return Number.isFinite(ts) && ts > Date.now();
}

function deriveWorkspaceUid(userId: string, existingUid?: string | null): string {
  if (existingUid && typeof existingUid === 'string' && existingUid.trim().length >= 3) {
    return existingUid.trim().toUpperCase().slice(0, 32);
  }
  return `USR-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function invokeAdminUsersEdgeFunction(
  body: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> } | null> {
  const edgeUrl = getValidatedEdgeFunctionUrl();
  const edgeSecret = process.env.ADMIN_EDGE_SECRET?.trim();
  if (!edgeUrl || !edgeSecret) return null;

  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-admin-edge-secret': edgeSecret,
  };
  if (anonKey) {
    headers['apikey'] = anonKey;
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  const upstream = await fetch(edgeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const parsed = (await upstream.json().catch(() => ({
    ok: false,
    error: 'Invalid response from Supabase Edge Function.',
  }))) as Record<string, unknown>;
  return { status: upstream.status, data: parsed };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // =========================================================================
  // 0. CASHFREE PRODUCTION WEBHOOK (RAW BODY REQUIRED BEFORE express.json)
  //    Verifies official HMAC-SHA256 signature on untouched raw request body.
  // =========================================================================
  app.post(
    '/api/webhooks/cashfree',
    express.raw({ type: '*/*', limit: '1mb' }),
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const cfConfig = getCashfreeProductionConfig();
      if (!cfConfig) {
        res.status(503).json({
          ok: false,
          error: 'Cashfree Production webhook secret is not configured on the server.',
        });
        return;
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ ok: false, error: 'Empty webhook payload.' });
        return;
      }

      const rawBody = req.body.toString('utf8');
      const timestamp = req.header('x-webhook-timestamp');
      const signature = req.header('x-webhook-signature');

      const sigValid = verifyCashfreeWebhookSignature(
        rawBody,
        timestamp,
        signature,
        cfConfig.webhookSecret
      );
      if (!sigValid) {
        res.status(401).json({ ok: false, error: 'Invalid Cashfree webhook signature.' });
        return;
      }

      let parsedPayload: Record<string, unknown>;
      try {
        const rawJson = JSON.parse(rawBody) as unknown;
        if (!rawJson || typeof rawJson !== 'object') {
          res.status(400).json({ ok: false, error: 'Malformed webhook JSON.' });
          return;
        }
        parsedPayload = rawJson as Record<string, unknown>;
      } catch {
        res.status(400).json({ ok: false, error: 'Malformed webhook JSON.' });
        return;
      }

      try {
        const result = await processVerifiedCashfreeWebhook({
          supabaseAdmin: getSupabaseAdminClient(),
          eventPayload: parsedPayload,
          webhookTimestamp: timestamp || '',
        });
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'Webhook processing error.',
        });
      }
    }
  );

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
    if (password.length < 4 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Owner PIN / password must be between 4 and 128 characters.',
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

  app.post('/api/admin/change-password', requireOwnerAdmin, (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: 'Too many attempts. Please wait and retry.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');

    if (getConfiguredPasscode().length > 0) {
      res.status(409).json({
        ok: false,
        error: 'Owner passcode is managed by the ADMIN_PASSCODE environment secret. Update it in Settings -> Secrets.',
      });
      return;
    }

    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : '';
    const newPassword =
      typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

    if (!currentPassword || !claimedAdminCredential || !verifyScryptPassword(currentPassword, claimedAdminCredential)) {
      res.status(401).json({ ok: false, error: 'Current owner PIN / password is incorrect.' });
      return;
    }
    if (newPassword.length < 4 || newPassword.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'New owner PIN / password must be between 4 and 128 characters.',
      });
      return;
    }

    claimedAdminCredential = hashPasswordScrypt(newPassword);
    resetRateLimit(ip);
    res.json({ ok: true });
  });

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
  // 2B. MAIN ADMIN SUPABASE AUTH USER CREATION & MANAGEMENT
  //     Strictly requires verified owner_admin Bearer token on EVERY request.
  //     Uses Supabase Edge Function (if configured) or server-side Admin API.
  // =========================================================================
  const respondMissingSupabaseAdminConfig = (res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({
      ok: false,
      configRequired: true,
      error:
        'Server-side Supabase Admin credentials are not configured yet. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_EDGE_FUNCTION_URL + ADMIN_EDGE_SECRET) in server Secrets.',
    });
  };

  app.get('/api/admin/users', requireOwnerAdmin, async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const edgeResult = await invokeAdminUsersEdgeFunction({ action: 'list' });
      if (edgeResult) {
        res.status(edgeResult.status).json(edgeResult.data);
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) {
        respondMissingSupabaseAdminConfig(res);
        return;
      }

      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (error) {
        res.status(500).json({ ok: false, error: error.message });
        return;
      }

      const authUsers = data?.users ?? [];
      const [profilesRes, rolesRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, uid, full_name, is_active'),
        supabaseAdmin.from('user_roles').select('user_id, role'),
      ]);

      const profileMap = new Map<
        string,
        { uid?: string; full_name?: string; is_active?: boolean }
      >();
      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        for (const p of profilesRes.data) {
          profileMap.set(String(p.id), p);
        }
      }

      const roleMap = new Map<string, string>();
      if (!rolesRes.error && Array.isArray(rolesRes.data)) {
        for (const r of rolesRes.data) {
          roleMap.set(String(r.user_id), String(r.role));
        }
      }

      const users = authUsers.map((u) => {
        const prof = profileMap.get(u.id);
        const role =
          roleMap.get(u.id) ||
          (typeof u.user_metadata?.role === 'string' ? u.user_metadata.role : 'operator');
        const banned = isSupabaseUserBanned(
          (u as { banned_until?: string | null }).banned_until
        );
        const metaActive = u.user_metadata?.is_active !== false;
        const profileActive = prof?.is_active !== false;

        return {
          userId: u.id,
          email: u.email || '',
          workspaceUid: deriveWorkspaceUid(
            u.id,
            prof?.uid || (typeof u.user_metadata?.uid === 'string' ? u.user_metadata.uid : null)
          ),
          role,
          isActive: !banned && metaActive && profileActive,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
        };
      });

      res.json({ ok: true, users });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to load Supabase users.',
      });
    }
  });

  app.post('/api/admin/users', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      res.status(400).json({ ok: false, error: 'Please enter a valid Login ID (Email).' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Password must be between 8 and 128 characters.',
      });
      return;
    }

    try {
      const edgeResult = await invokeAdminUsersEdgeFunction({
        action: 'create',
        email,
        password,
      });
      if (edgeResult) {
        res.status(edgeResult.status).json(edgeResult.data);
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) {
        respondMissingSupabaseAdminConfig(res);
        return;
      }

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'operator',
          is_active: true,
        },
      });

      if (createErr || !created?.user) {
        res.status(400).json({
          ok: false,
          error: createErr?.message || 'Failed to create user in Supabase Authentication.',
        });
        return;
      }

      const userId = created.user.id;
      const workspaceUid = deriveWorkspaceUid(userId);
      const displayName = email.split('@')[0] || 'Tournament User';

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: 'operator',
          uid: workspaceUid,
          is_active: true,
        },
      });

      await supabaseAdmin.from('profiles').upsert(
        {
          id: userId,
          uid: workspaceUid,
          full_name: displayName,
          email,
          is_active: true,
        },
        { onConflict: 'id' }
      );

      await supabaseAdmin.from('user_roles').upsert(
        {
          user_id: userId,
          role: 'operator',
        },
        { onConflict: 'user_id' }
      );

      res.status(201).json({
        ok: true,
        user: {
          userId,
          email,
          workspaceUid,
          role: 'operator',
          isActive: true,
          createdAt: created.user.created_at,
          lastSignInAt: null,
        },
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to create user.',
      });
    }
  });

  app.patch('/api/admin/users/:userId/reset-password', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const userId = typeof req.params.userId === 'string' ? req.params.userId.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!UUID_REGEX.test(userId)) {
      res.status(400).json({ ok: false, error: 'Invalid User ID.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'New password must be between 8 and 128 characters.',
      });
      return;
    }

    try {
      const edgeResult = await invokeAdminUsersEdgeFunction({
        action: 'reset_password',
        userId,
        password,
      });
      if (edgeResult) {
        res.status(edgeResult.status).json(edgeResult.data);
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) {
        respondMissingSupabaseAdminConfig(res);
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) {
        res.status(400).json({ ok: false, error: error.message });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to reset user password.',
      });
    }
  });

  app.patch('/api/admin/users/:userId/status', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const userId = typeof req.params.userId === 'string' ? req.params.userId.trim() : '';
    if (!UUID_REGEX.test(userId)) {
      res.status(400).json({ ok: false, error: 'Invalid User ID.' });
      return;
    }
    if (typeof req.body?.isActive !== 'boolean') {
      res.status(400).json({ ok: false, error: 'isActive boolean flag is required.' });
      return;
    }
    const isActive = req.body.isActive;

    try {
      const edgeResult = await invokeAdminUsersEdgeFunction({
        action: 'set_status',
        userId,
        isActive,
      });
      if (edgeResult) {
        res.status(edgeResult.status).json(edgeResult.data);
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) {
        respondMissingSupabaseAdminConfig(res);
        return;
      }

      const { data: roleRow } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (roleRow?.role === 'owner_admin' && !isActive) {
        res.status(400).json({ ok: false, error: 'Cannot deactivate a Main Admin account.' });
        return;
      }

      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const currentMeta = existingUser?.user?.user_metadata ?? {};

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : '876000h',
        user_metadata: {
          ...currentMeta,
          is_active: isActive,
        },
      });
      if (error) {
        res.status(400).json({ ok: false, error: error.message });
        return;
      }

      await supabaseAdmin
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId);

      res.json({ ok: true, isActive });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to update user account status.',
      });
    }
  });

  app.delete('/api/admin/users/:userId', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const userId = typeof req.params.userId === 'string' ? req.params.userId.trim() : '';
    if (!UUID_REGEX.test(userId)) {
      res.status(400).json({ ok: false, error: 'Invalid User ID.' });
      return;
    }

    try {
      const edgeResult = await invokeAdminUsersEdgeFunction({
        action: 'delete',
        userId,
      });
      if (edgeResult) {
        res.status(edgeResult.status).json(edgeResult.data);
        return;
      }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) {
        respondMissingSupabaseAdminConfig(res);
        return;
      }

      const { data: roleRow } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (roleRow?.role === 'owner_admin') {
        res.status(400).json({ ok: false, error: 'Cannot delete a Main Admin account.' });
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        res.status(400).json({ ok: false, error: error.message });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to delete user.',
      });
    }
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

  // =========================================================================
  // 4. SERVER-VERIFIED CUSTOMER AUTH FOR CASHFREE PAYMENTS
  //    Issues signed HttpOnly session cookie + in-memory Bearer token.
  // =========================================================================
  app.post('/api/customer-auth/login', async (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ ok: false, error: 'Too many login attempts. Please wait.' });
      return;
    }

    const loginId = typeof req.body?.loginId === 'string' ? req.body.loginId.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    res.setHeader('Cache-Control', 'no-store');

    if (!loginId || !password || /[*%]/.test(loginId)) {
      res.status(400).json({ ok: false, error: 'Valid Login ID and Password are required.' });
      return;
    }

    try {
      const sbClient =
        getSupabaseAdminClient() ||
        createClient(getServerSupabaseUrl(), getServerSupabasePublicAnonKey(), {
          auth: { autoRefreshToken: false, persistSession: false },
        });

      const escaped = loginId.replace(/[\\%_]/g, (ch: string) => `\\${ch}`);
      const { data, error } = await sbClient
        .from('overlay_access_keys')
        .select('access_id, password, label, is_active')
        .ilike('access_id', escaped);

      if (error || !Array.isArray(data) || data.length === 0) {
        res.status(401).json({ ok: false, error: 'Invalid Login ID or Password.' });
        return;
      }

      const exactRow = data.find(
        (r) =>
          String(r.access_id || '').trim().toLowerCase() === loginId.toLowerCase() &&
          timingSafeTextEqual(String(r.password || '').trim(), password)
      );

      if (!exactRow) {
        res.status(401).json({ ok: false, error: 'Invalid Login ID or Password.' });
        return;
      }
      if (exactRow.is_active !== true) {
        res.status(403).json({ ok: false, error: 'This account is inactive.' });
        return;
      }

      resetRateLimit(ip);
      const canonicalUid = sanitizeCustomerId(exactRow.access_id);
      const label = typeof exactRow.label === 'string' && exactRow.label.trim()
        ? exactRow.label.trim()
        : canonicalUid;

      const token = issueSignedToken({
        role: 'customer_session',
        uid: canonicalUid,
        loginId: canonicalUid,
        assignedUser: label,
      });
      setCustomerSessionCookie(res, token);
      res.json({ ok: true, token, customerId: canonicalUid, label });
    } catch {
      res.status(500).json({ ok: false, error: 'Could not verify customer session.' });
    }
  });

  app.post('/api/customer-auth/logout', (req, res) => {
    const bearer = extractBearerToken(req);
    const cookies = parseCookieHeader(req.headers.cookie);
    for (const candidate of [bearer, cookies[CUSTOMER_SESSION_COOKIE]]) {
      if (!candidate) continue;
      const verified = verifySignedToken(candidate, 'customer_session');
      if (verified.valid && verified.jti) {
        revokedTokenIds.add(verified.jti);
      }
    }
    clearCustomerSessionCookie(res);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  // =========================================================================
  // 5. CASHFREE PRODUCTION PAYMENT & SERVER-SIDE UNLOCK ENDPOINTS
  //    - Fixed server-side prices: WorldCup ₹149 INR, Lightning Premier ₹79 INR.
  //    - Zero UTR/manual client unlocking. Zero sandbox/demo bypasses.
  // =========================================================================
  app.get('/api/payments/worldcup/status', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customer = await resolveAuthenticatedCustomer(req, false);
    if (!customer) {
      res.status(401).json({
        ok: false,
        unlocked: false,
        unlockedThemes: { worldcup: false, 'lightning-pro': false },
        error: 'Customer authentication required.',
      });
      return;
    }

    const { unlockedThemes, records } = await getCustomerThemeEntitlements(
      getSupabaseAdminClient(),
      customer.customerId
    );
    const wcRec = records.worldcup;
    const wcUnlocked = unlockedThemes.worldcup;

    const buildThemeDetail = (themeId: PaidThemeId) => {
      const rec = records[themeId];
      const active = unlockedThemes[themeId];
      return {
        unlocked: active,
        grantSource: active ? rec?.grant_source ?? null : null,
        orderId: active ? rec?.order_id ?? null : null,
        cfPaymentId: active ? rec?.cf_payment_id ?? null : null,
        unlockedAt: active ? rec?.unlocked_at ?? null : null,
        expiresAt: active ? rec?.expires_at ?? null : null,
      };
    };

    res.json({
      ok: true,
      unlocked: wcUnlocked,
      unlockedThemes,
      themeEntitlements: {
        worldcup: buildThemeDetail('worldcup'),
        'lightning-pro': buildThemeDetail('lightning-pro'),
      },
      customerId: customer.customerId,
      productName: WORLDCUP_PRODUCT_NAME,
      amount: WORLDCUP_FIXED_AMOUNT_INR,
      currency: WORLDCUP_FIXED_CURRENCY,
      cashfreeConfigured: isCashfreeConfigured(),
      grantSource: wcUnlocked ? wcRec?.grant_source ?? null : null,
      orderId: wcUnlocked ? wcRec?.order_id ?? null : null,
      cfPaymentId: wcUnlocked ? wcRec?.cf_payment_id ?? null : null,
      unlockedAt: wcUnlocked ? wcRec?.unlocked_at ?? null : null,
      expiresAt: wcUnlocked ? wcRec?.expires_at ?? null : null,
    });
  });

  // Read-only server entitlement check for OBS / vMix Standalone Overlay rendering
  app.get('/api/payments/worldcup/entitlement/:uid', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const uid = sanitizeCustomerId(req.params.uid);
    if (!uid) {
      res.status(400).json({
        ok: false,
        unlocked: false,
        unlockedThemes: { worldcup: false, 'lightning-pro': false },
      });
      return;
    }
    const { unlockedThemes } = await getCustomerThemeEntitlements(
      getSupabaseAdminClient(),
      uid
    );
    res.json({
      ok: true,
      uid,
      unlocked: unlockedThemes.worldcup,
      unlockedThemes,
    });
  });

  app.post('/api/payments/worldcup/create-order', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customer = await resolveAuthenticatedCustomer(req, true);
    if (!customer) {
      res.status(401).json({
        ok: false,
        error: 'Please sign in again to initiate Cashfree payment.',
      });
      return;
    }

    const product = resolvePaidThemeProduct(req.body?.themeId ?? 'worldcup');
    if (!product) {
      res.status(400).json({
        ok: false,
        error: 'Unknown scoreboard theme product requested.',
      });
      return;
    }

    // Strictly reject any tampered amount or currency supplied by the client
    if (
      req.body &&
      req.body.amount !== undefined &&
      Number(req.body.amount) !== product.amountInr
    ) {
      res.status(400).json({
        ok: false,
        error: `Order amount for ${product.productName} is fixed at ₹${product.amountInr} ${product.currency} on the server.`,
      });
      return;
    }
    if (
      req.body &&
      req.body.currency !== undefined &&
      String(req.body.currency).trim().toUpperCase() !== product.currency
    ) {
      res.status(400).json({
        ok: false,
        error: `Order currency is fixed at ${product.currency} on the server.`,
      });
      return;
    }

    const cfConfig = getCashfreeProductionConfig();
    if (!cfConfig) {
      res.status(503).json({
        ok: false,
        configRequired: true,
        error:
          'Cashfree Production keys (CASHFREE_APP_ID and CASHFREE_SECRET_KEY) are not configured on the server yet.',
      });
      return;
    }

    // Check if customer already has an active verified unlock for this exact theme
    const existingUnlock = await getUnlockRecord(
      getSupabaseAdminClient(),
      customer.customerId,
      product.productCode
    );
    if (isUnlockRecordActive(existingUnlock)) {
      res.json({
        ok: true,
        alreadyUnlocked: true,
        unlocked: true,
        themeId: product.themeId,
        orderId: existingUnlock?.order_id ?? null,
      });
      return;
    }

    const orderId = generateUniqueCashfreeOrderId(product.themeId);
    const origin = resolvePublicOrigin(req);
    const returnUrl = `${origin}/?cf_order_id=${encodeURIComponent(orderId)}&cf_theme=${encodeURIComponent(product.themeId)}`;
    const notifyUrl = `${origin}/api/webhooks/cashfree`;

    const customerPhone =
      typeof req.body?.customerPhone === 'string' ? req.body.customerPhone : '';
    const customerEmail =
      typeof req.body?.customerEmail === 'string' && EMAIL_REGEX.test(req.body.customerEmail.trim())
        ? req.body.customerEmail.trim()
        : customer.customerEmail;

    try {
      const cfResult = await createCashfreeProductionOrder({
        config: cfConfig,
        orderId,
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerEmail,
        customerPhone,
        returnUrl,
        notifyUrl,
        product,
      });

      if (!cfResult.ok || !cfResult.paymentSessionId) {
        res.status(502).json({
          ok: false,
          error: cfResult.error || 'Cashfree Production API could not create order.',
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const paymentRecord: WorldCupPaymentRecord = {
        order_id: orderId,
        customer_id: customer.customerId,
        customer_email: customerEmail,
        customer_name: customer.customerName,
        product_code: product.productCode,
        product_name: product.productName,
        expected_amount: product.amountInr,
        currency: product.currency,
        cf_order_id: cfResult.cfOrderId || null,
        cf_payment_id: null,
        payment_status: 'PENDING',
        cashfree_raw_status: cfResult.orderStatus || 'ACTIVE',
        unlock_status: 'LOCKED',
        verified_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      await persistPaymentRecord(getSupabaseAdminClient(), paymentRecord);

      res.status(201).json({
        ok: true,
        themeId: product.themeId,
        orderId,
        paymentSessionId: cfResult.paymentSessionId,
        amount: product.amountInr,
        currency: product.currency,
        mode: 'production',
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to connect to Cashfree Production API.',
      });
    }
  });

  app.post('/api/payments/worldcup/verify', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customer = await resolveAuthenticatedCustomer(req, true);
    if (!customer) {
      res.status(401).json({
        ok: false,
        unlocked: false,
        error: 'Customer authentication required.',
      });
      return;
    }

    // Explicitly reject any legacy UTR, screenshot, or client-supplied payment/transaction ID attempts
    if (
      req.body &&
      (req.body.utr ||
        req.body.utrNumber ||
        req.body.manualTransactionId ||
        req.body.transactionId ||
        req.body.paymentId ||
        req.body.cfPaymentId ||
        req.body.screenshot)
    ) {
      res.status(400).json({
        ok: false,
        unlocked: false,
        error:
          'Manual UTR, screenshot, or client-supplied payment ID verification is disabled. Payments are verified strictly with Cashfree Production servers.',
      });
      return;
    }

    const orderId = sanitizeOrderId(req.body?.orderId);
    if (!orderId) {
      res.status(400).json({
        ok: false,
        unlocked: false,
        error: 'A valid Cashfree orderId is required for verification.',
      });
      return;
    }

    const cfConfig = getCashfreeProductionConfig();
    if (!cfConfig) {
      res.status(503).json({
        ok: false,
        unlocked: false,
        error: 'Cashfree Production credentials are not configured on the server.',
      });
      return;
    }

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      const outcome = await verifyOrderDirectlyWithCashfree({
        supabaseAdmin,
        config: cfConfig,
        orderId,
        expectedCustomerId: customer.customerId,
      });

      if ('notFound' in outcome) {
        res.status(404).json({
          ok: false,
          unlocked: false,
          error: outcome.reason,
        });
        return;
      }

      const product = resolvePaidThemeProductByCode(outcome.record.product_code);
      const entitlements = await getCustomerThemeEntitlements(supabaseAdmin, customer.customerId);

      res.json({
        ok: outcome.verified,
        unlocked: outcome.unlocked,
        themeId: product?.themeId || 'worldcup',
        unlockedThemes: entitlements.unlockedThemes,
        paymentStatus: outcome.paymentStatus,
        orderId: outcome.record.order_id,
        cfPaymentId: outcome.cfPaymentId,
        amount: outcome.record.expected_amount,
        currency: outcome.record.currency,
        verifiedAt: outcome.record.verified_at,
        message: outcome.reason,
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        unlocked: false,
        error: err instanceof Error ? err.message : 'Cashfree server verification failed.',
      });
    }
  });

  // =========================================================================
  // 5B. OWNER DIRECT UPI QR PAYMENT ENDPOINTS (crushyyphotography@oksbi)
  //     - Generates dynamic amount-locked UPI QR codes (₹79 / ₹149).
  //     - Customer UTR submission NEVER unlocks automatically (stays PENDING/LOCKED).
  //     - Only authenticated Owner Admin approval unlocks the theme.
  // =========================================================================
  app.post('/api/payments/upi-qr/create-order', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customer = await resolveAuthenticatedCustomer(req, true);
    if (!customer) {
      res.status(401).json({
        ok: false,
        error: 'Please sign in again to generate your UPI payment QR.',
      });
      return;
    }

    const product = resolvePaidThemeProduct(req.body?.themeId ?? 'worldcup');
    if (!product) {
      res.status(400).json({ ok: false, error: 'Unknown scoreboard theme product requested.' });
      return;
    }

    if (
      req.body &&
      req.body.amount !== undefined &&
      Number(req.body.amount) !== product.amountInr
    ) {
      res.status(400).json({
        ok: false,
        error: `Amount for ${product.productName} is fixed at ₹${product.amountInr} INR on the server.`,
      });
      return;
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const existingUnlock = await getUnlockRecord(
      supabaseAdmin,
      customer.customerId,
      product.productCode
    );
    if (isUnlockRecordActive(existingUnlock)) {
      res.json({
        ok: true,
        alreadyUnlocked: true,
        unlocked: true,
        themeId: product.themeId,
        orderId: existingUnlock?.order_id ?? null,
      });
      return;
    }

    const orderId = generateUniqueUpiQrOrderId(product.themeId);
    const customerEmail =
      typeof req.body?.customerEmail === 'string' && EMAIL_REGEX.test(req.body.customerEmail.trim())
        ? req.body.customerEmail.trim()
        : customer.customerEmail;

    try {
      const intent = await buildOwnerUpiPaymentIntent({ orderId, product });
      const nowIso = new Date().toISOString();
      const paymentRecord: WorldCupPaymentRecord = {
        order_id: orderId,
        customer_id: customer.customerId,
        customer_email: customerEmail,
        customer_name: customer.customerName,
        product_code: product.productCode,
        product_name: product.productName,
        expected_amount: product.amountInr,
        currency: product.currency,
        cf_order_id: 'OWNER_UPI_QR',
        cf_payment_id: null,
        payment_status: 'PENDING',
        cashfree_raw_status: 'UPI_QR_AWAITING_PAYMENT',
        unlock_status: 'LOCKED',
        verified_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      await persistPaymentRecord(supabaseAdmin, paymentRecord);

      res.status(201).json({
        ok: true,
        themeId: product.themeId,
        productName: product.productName,
        orderId,
        amount: product.amountInr,
        currency: product.currency,
        upiId: intent.upiId,
        payeeName: intent.payeeName,
        upiUri: intent.upiUri,
        qrDataUrl: intent.qrDataUrl,
        staticQrImageUrl: intent.staticQrImageUrl,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Could not generate dynamic UPI QR code.',
      });
    }
  });

  app.post('/api/payments/upi-qr/submit-proof', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customer = await resolveAuthenticatedCustomer(req, true);
    if (!customer) {
      res.status(401).json({
        ok: false,
        unlocked: false,
        error: 'Customer authentication required.',
      });
      return;
    }

    const result = await submitUpiQrUtrProof({
      supabaseAdmin: getSupabaseAdminClient(),
      orderId: req.body?.orderId,
      customerId: customer.customerId,
      utrRaw: req.body?.utr,
    });

    if (!result.ok) {
      res.status(result.status).json({
        ok: false,
        unlocked: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
      unlocked: result.unlocked,
      paymentStatus: result.paymentStatus,
      orderId: result.orderId,
      utr: result.utr,
      message: result.message,
    });
  });

  // =========================================================================
  // 6. ADMIN-ONLY PAYMENT LEDGER & AUDITED MANUAL ACCESS GRANT
  //    Strictly protected by requireOwnerAdmin Bearer token.
  // =========================================================================
  app.get('/api/admin/payments/worldcup', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const statusFilter = String(req.query.status || 'ALL').toUpperCase();
    const supabaseAdmin = getSupabaseAdminClient();
    const [allPayments, allUnlocks, auditLogs] = await Promise.all([
      listAllPaymentRecords(supabaseAdmin),
      listAllUnlockRecords(supabaseAdmin),
      listAdminAuditLogs(supabaseAdmin),
    ]);

    const payments =
      statusFilter === 'ALL'
        ? allPayments
        : allPayments.filter((p) => p.payment_status === statusFilter);

    res.json({
      ok: true,
      cashfreeConfigured: isCashfreeConfigured(),
      ownerUpiId: OWNER_UPI_ID,
      ownerUpiPayeeName: OWNER_UPI_PAYEE_NAME,
      ownerStaticQrImageUrl: OWNER_UPI_STATIC_QR_IMAGE,
      fixedAmountInr: WORLDCUP_FIXED_AMOUNT_INR,
      products: PAID_THEME_PRODUCTS,
      payments,
      unlocks: allUnlocks,
      auditLogs,
    });
  });

  app.post('/api/admin/payments/upi-qr/approve', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await adminApproveUpiQrPayment({
      supabaseAdmin: getSupabaseAdminClient(),
      orderId: req.body?.orderId,
      actor: 'owner_admin',
      ipAddress: getClientIp(req),
      note: typeof req.body?.note === 'string' ? req.body.note : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      payment: result.payment,
      unlock: result.unlock,
      auditLog: result.auditLog,
    });
  });

  app.post('/api/admin/payments/upi-qr/reject', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await adminRejectUpiQrPayment({
      supabaseAdmin: getSupabaseAdminClient(),
      orderId: req.body?.orderId,
      actor: 'owner_admin',
      ipAddress: getClientIp(req),
      reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      payment: result.payment,
      auditLog: result.auditLog,
    });
  });

  app.post('/api/admin/payments/worldcup/manual-grant', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customerId = sanitizeCustomerId(req.body?.customerId);
    const product = resolvePaidThemeProduct(req.body?.themeId ?? req.body?.productCode ?? 'worldcup');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 240) : '';
    const durationDaysRaw = req.body?.durationDays;
    const durationDays =
      typeof durationDaysRaw === 'number' && Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
        ? Math.min(365, Math.floor(durationDaysRaw))
        : null;

    if (!product) {
      res.status(400).json({ ok: false, error: 'Invalid scoreboard theme product.' });
      return;
    }
    if (customerId.length < 3) {
      res.status(400).json({ ok: false, error: 'Valid Customer ID / Access ID is required.' });
      return;
    }
    if (reason.length < 5) {
      res.status(400).json({
        ok: false,
        error: 'An audit reason (at least 5 characters) is mandatory for manual access grants.',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const supabaseAdmin = getSupabaseAdminClient();
    const unlockRec: WorldCupUnlockRecord = {
      customer_id: customerId,
      product_code: product.productCode,
      unlock_status: 'UNLOCKED',
      grant_source: 'admin_manual',
      order_id: null,
      cf_payment_id: null,
      unlocked_at: nowIso,
      expires_at: expiresAt,
      granted_by: 'owner_admin',
      grant_reason: reason,
      updated_at: nowIso,
    };

    await persistUnlockRecord(supabaseAdmin, unlockRec);
    const auditEntry = await recordAdminAuditLog(supabaseAdmin, {
      actor: 'owner_admin',
      action: 'MANUAL_GRANT',
      customer_id: customerId,
      reason,
      ip_address: getClientIp(req),
      metadata: {
        theme_id: product.themeId,
        product_code: product.productCode,
        product_name: product.productName,
        expires_at: expiresAt,
      },
    });

    res.status(201).json({ ok: true, unlock: unlockRec, auditLog: auditEntry });
  });

  app.post('/api/admin/payments/worldcup/revoke', requireOwnerAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const customerId = sanitizeCustomerId(req.body?.customerId);
    const product = resolvePaidThemeProduct(req.body?.themeId ?? req.body?.productCode ?? 'worldcup');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 240) : '';

    if (!product) {
      res.status(400).json({ ok: false, error: 'Invalid scoreboard theme product.' });
      return;
    }
    if (customerId.length < 3) {
      res.status(400).json({ ok: false, error: 'Valid Customer ID is required.' });
      return;
    }
    if (reason.length < 5) {
      res.status(400).json({ ok: false, error: 'An audit reason (at least 5 characters) is required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const supabaseAdmin = getSupabaseAdminClient();
    const existing = await getUnlockRecord(supabaseAdmin, customerId, product.productCode);
    const revokedRec: WorldCupUnlockRecord = {
      customer_id: customerId,
      product_code: product.productCode,
      unlock_status: 'LOCKED',
      grant_source: existing?.grant_source || 'admin_manual',
      order_id: existing?.order_id || null,
      cf_payment_id: existing?.cf_payment_id || null,
      unlocked_at: existing?.unlocked_at || nowIso,
      expires_at: nowIso,
      granted_by: 'owner_admin',
      grant_reason: reason,
      updated_at: nowIso,
    };

    await persistUnlockRecord(supabaseAdmin, revokedRec);
    const auditEntry = await recordAdminAuditLog(supabaseAdmin, {
      actor: 'owner_admin',
      action: 'MANUAL_REVOKE',
      customer_id: customerId,
      reason,
      ip_address: getClientIp(req),
      metadata: {
        theme_id: product.themeId,
        product_code: product.productCode,
        product_name: product.productName,
      },
    });

    res.json({ ok: true, unlock: revokedRec, auditLog: auditEntry });
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
