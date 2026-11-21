import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDefaultOverlayState, type LiveOverlayState } from './src/types/overlay.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';
const ENV_ADMIN_PIN = (process.env.OVERLAY_ADMIN_PIN || '').trim();
const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours default
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const VALID_SKUS = new Set([
  'kabaddi-classic',
  'haldi-classic',
  'haldi-modern',
]);

export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

interface OverlayOrder {
  orderId: string;
  sku: string; // specific SKU or 'all' for master unlock key
  amount: number;
  originalPrice: number;
  buyerName: string;
  buyerPhone: string;
  utrRef: string;
  proofImage?: string;
  proofHash?: string;
  paymentMethod?: 'upi_manual' | 'owner_key';
  status: OrderStatus;
  unlockCode?: string;
  rejectionReason?: string;
  createdAt: number;
  verifiedAt?: number;
  expiresAt?: number;
}

interface StoredAdminAuth {
  salt: string;
  hash: string;
  createdAt: number;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'overlay-orders.json');
const ADMIN_AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAdminAuth(): StoredAdminAuth | null {
  try {
    if (!fs.existsSync(ADMIN_AUTH_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.salt === 'string' && typeof parsed.hash === 'string') {
      return parsed as StoredAdminAuth;
    }
    return null;
  } catch {
    return null;
  }
}

function saveAdminAuth(record: StoredAdminAuth) {
  ensureDataDir();
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(record, null, 2), 'utf-8');
}

function hashPasswordScrypt(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Active owner session tokens (stored in server memory only)
const adminSessions = new Map<string, number>(); // token -> expiresAt
// Simple brute-force throttle for admin login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function createAdminSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return token;
}

function isAdminSessionValid(token: string): boolean {
  const exp = adminSessions.get(token);
  if (!exp) return false;
  if (exp <= Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function getAuthSource(): 'env' | 'claimed' | 'unclaimed' {
  if (ENV_ADMIN_PIN.length > 0) return 'env';
  return loadAdminAuth() ? 'claimed' : 'unclaimed';
}

function verifyOwnerPassword(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (ENV_ADMIN_PIN.length > 0) {
    return safeEqualStrings(trimmed, ENV_ADMIN_PIN);
  }
  const stored = loadAdminAuth();
  if (!stored) return false;
  const computed = hashPasswordScrypt(trimmed, stored.salt);
  return safeEqualStrings(computed, stored.hash);
}

function requireAdminAuth(req: express.Request, res: express.Response): boolean {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (isAdminSessionValid(token)) {
      return true;
    }
  }

  // Backward-compatible PIN header if ENV pin is configured
  const headerPin = String(req.headers['x-admin-pin'] || '').trim();
  if (headerPin && verifyOwnerPassword(headerPin)) {
    return true;
  }

  res.status(401).json({ ok: false, error: 'Owner authentication required. Please sign in.' });
  return false;
}

function getOrderExpiresAt(order: OverlayOrder): number {
  if (typeof order.expiresAt === 'number') return order.expiresAt;
  const base = order.verifiedAt || order.createdAt;
  return base + UNLOCK_DURATION_MS;
}

function isOrderActive(order: OverlayOrder, now = Date.now()): boolean {
  return order.status === 'approved' && Boolean(order.unlockCode) && getOrderExpiresAt(order) > now;
}

function orderCoversSku(order: OverlayOrder, requestedSku?: string): boolean {
  if (!requestedSku) return true;
  return order.sku === 'all' || order.sku === requestedSku;
}

function loadPersistedOrders(): OverlayOrder[] {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePersistedOrders(orders: OverlayOrder[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist overlay orders:', err);
  }
}

function generateOrderId(): string {
  const rand = crypto.randomInt(100000, 999999);
  return `OVL-${rand}`;
}

function generateUnlockCode(): string {
  // 12 uppercase alphanumeric characters (easy to type, cryptographically unguessable)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makeBlock = () => {
    let out = '';
    for (let i = 0; i < 4; i++) {
      out += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    return out;
  };
  return `STAR-${makeBlock()}-${makeBlock()}-${makeBlock()}`;
}

function isFakeUtr(utr: string): boolean {
  if (!/^\d{12}$/.test(utr)) return true;
  const fakePatterns = new Set([
    '123456789012',
    '012345678901',
    '987654321098',
    '123456123456',
    '111111222222',
    '112233445566',
    '999999888888',
  ]);
  return (
    /^(\d)\1{11}$/.test(utr) ||
    fakePatterns.has(utr) ||
    new Set(utr.split('')).size < 4 ||
    /(\d)\1{6,}/.test(utr)
  );
}

// Authoritative server-side room store for OBS & vMix Browser Sources
const rooms = new Map<string, LiveOverlayState>();
const sseClients = new Map<string, Set<express.Response>>();

// Authoritative server-side payment orders & owner-issued unlock keys store
const orders: OverlayOrder[] = loadPersistedOrders();
const orderSseClients = new Map<string, Set<express.Response>>();

function sanitizeRoomId(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40);
  return cleaned || 'star-live-1';
}

function getOrCreateRoom(roomId: string): LiveOverlayState {
  const safeId = sanitizeRoomId(roomId);
  let state = rooms.get(safeId);
  if (!state) {
    state = createDefaultOverlayState(safeId);
    rooms.set(safeId, state);
  }
  return state;
}

function broadcastRoomState(roomId: string, state: LiveOverlayState) {
  const clients = sseClients.get(roomId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    state,
    connectedDisplays: clients.size,
  });

  for (const res of clients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

function toPublicOrderSummary(order: OverlayOrder) {
  const expiresAt = order.status === 'approved' ? getOrderExpiresAt(order) : undefined;
  const expired = Boolean(expiresAt && expiresAt <= Date.now());
  return {
    orderId: order.orderId,
    sku: order.sku,
    amount: order.amount,
    originalPrice: order.originalPrice,
    status: order.status,
    utrRef:
      order.utrRef.length === 12
        ? `${order.utrRef.slice(0, 4)}••••${order.utrRef.slice(-4)}`
        : order.utrRef,
    unlockCode: order.status === 'approved' && !expired ? order.unlockCode : undefined,
    rejectionReason:
      order.status === 'rejected' || order.status === 'revoked' ? order.rejectionReason : undefined,
    createdAt: order.createdAt,
    verifiedAt: order.verifiedAt,
    expiresAt,
    expired,
  };
}

function notifyOrderWatchers(order: OverlayOrder) {
  const clients = orderSseClients.get(order.orderId);
  if (!clients || clients.size === 0) return;
  const payload = JSON.stringify({ order: toPublicOrderSummary(order) });
  for (const res of clients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  // Allow up to 1.5MB for compressed payment screenshot proof or team logos
  app.use(express.json({ limit: '1.5mb' }));

  // Allow OBS / vMix local browser inputs to fetch state cleanly
  app.use('/api', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Payment config info
  app.get('/api/payment/config', (_req, res) => {
    res.json({ ok: true, razorpayEnabled: false, ownerKeyFlow: true });
  });

  // ---------------------------------------------------------------------------
  // OWNER AUTHENTICATION ENDPOINTS (One-Time Setup / Sign In / Sign Out)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/auth-status', (_req, res) => {
    res.json({ ok: true, source: getAuthSource() });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (getAuthSource() !== 'unclaimed') {
      res.status(409).json({
        ok: false,
        error: 'Owner password is already configured. Please sign in.',
      });
      return;
    }

    const password = String(req.body?.password || '').trim();
    if (password.length < 6 || password.length > 100) {
      res.status(400).json({
        ok: false,
        error: 'Choose a strong owner password between 6 and 100 characters.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPasswordScrypt(password, salt);
    saveAdminAuth({ salt, hash, createdAt: Date.now() });

    const token = createAdminSession();
    res.json({ ok: true, token });
  });

  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (record && record.resetAt > now && record.count >= 12) {
      res.status(429).json({
        ok: false,
        error: 'Too many failed login attempts. Please wait 5 minutes and try again.',
      });
      return;
    }

    const password = String(req.body?.password || '').trim();
    if (!verifyOwnerPassword(password)) {
      const nextCount = record && record.resetAt > now ? record.count + 1 : 1;
      loginAttempts.set(ip, { count: nextCount, resetAt: now + 5 * 60 * 1000 });
      res.status(401).json({ ok: false, error: 'Incorrect Owner Password.' });
      return;
    }

    loginAttempts.delete(ip);
    const token = createAdminSession();
    res.json({ ok: true, token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      adminSessions.delete(authHeader.slice(7).trim());
    }
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // CUSTOMER PAYMENT SUBMISSION & UNLOCK KEY VERIFICATION
  // ---------------------------------------------------------------------------
  // 1. Submit a ₹99 UPI payment proof -> creates PENDING order (NEVER auto-unlocks!)
  app.post('/api/overlay/orders', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sku = String(body.sku || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 80);
    const buyerPhone = String(body.buyerPhone || '').replace(/\D/g, '').slice(0, 15);
    const utrRef = String(body.utrRef || '').replace(/\D/g, '').slice(0, 12);
    const rawProof = typeof body.proofImage === 'string' ? body.proofImage : '';
    const proofImage =
      rawProof.startsWith('data:image/') && rawProof.length <= 900_000 ? rawProof : undefined;

    if (!VALID_SKUS.has(sku)) {
      res.status(400).json({ ok: false, error: 'Invalid overlay selection.' });
      return;
    }
    if (buyerName.length < 2) {
      res.status(400).json({ ok: false, error: 'Please enter your full name.' });
      return;
    }
    if (buyerPhone.length < 10) {
      res.status(400).json({ ok: false, error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (isFakeUtr(utrRef)) {
      res.status(400).json({
        ok: false,
        error: 'Invalid or fake 12-digit UPI UTR blocked. Enter your real UPI receipt UTR.',
      });
      return;
    }
    if (!proofImage) {
      res.status(400).json({
        ok: false,
        error: 'Please attach your real ₹99 UPI payment screenshot.',
      });
      return;
    }

    const proofHash = crypto.createHash('sha256').update(proofImage).digest('hex');

    // Block reusing a rejected/fraudulent UTR or duplicate screenshot
    const duplicate = orders.find((o) => o.utrRef === utrRef);
    if (duplicate) {
      if (duplicate.status === 'pending' && duplicate.sku === sku && duplicate.buyerPhone === buyerPhone) {
        res.json({ ok: true, order: toPublicOrderSummary(duplicate), existing: true });
        return;
      }
      res.status(409).json({
        ok: false,
        error:
          duplicate.status === 'rejected' || duplicate.status === 'revoked'
            ? 'This UTR was rejected / blocked. Please pay real ₹99 and contact owner for a key.'
            : 'This 12-digit UPI UTR has already been used.',
      });
      return;
    }

    const duplicateProof = orders.find((o) => o.proofHash && o.proofHash === proofHash);
    if (duplicateProof) {
      res.status(409).json({
        ok: false,
        error: 'This payment screenshot was already submitted. Duplicate receipts are blocked.',
      });
      return;
    }

    const order: OverlayOrder = {
      orderId: generateOrderId(),
      sku,
      amount: 99,
      originalPrice: 149,
      buyerName,
      buyerPhone,
      utrRef,
      proofImage,
      proofHash,
      paymentMethod: 'upi_manual',
      status: 'pending',
      createdAt: Date.now(),
    };

    orders.unshift(order);
    savePersistedOrders(orders);

    res.status(201).json({
      ok: true,
      order: toPublicOrderSummary(order),
    });
  });

  // 2. Poll current payment verification status of an order
  app.get('/api/overlay/orders/:orderId/status', (req, res) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }
    res.json({ ok: true, order: toPublicOrderSummary(order) });
  });

  // 3. Real-time SSE stream for a buyer waiting on ₹99 payment confirmation
  app.get('/api/overlay/orders/:orderId/stream', (req, res) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clients = orderSseClients.get(orderId);
    if (!clients) {
      clients = new Set();
      orderSseClients.set(orderId, clients);
    }
    clients.add(res);

    res.write(`data: ${JSON.stringify({ order: toPublicOrderSummary(order) })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients?.delete(res);
    });
  });

  // 4. Verify an Owner-Issued Unlock Key (STAR-XXXX-XXXX-XXXX) -> unlocks single overlay OR all overlays!
  app.post('/api/overlay/verify-unlock', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const code = String(body.unlockCode || '').trim().toUpperCase();
    const requestedSku = String(body.sku || '').trim();

    if (!code) {
      res.status(400).json({ ok: false, error: 'Please enter your Unlock Key.' });
      return;
    }

    const match = orders.find(
      (o) =>
        o.status === 'approved' &&
        o.unlockCode?.toUpperCase() === code &&
        orderCoversSku(o, requestedSku)
    );

    if (!match || !match.unlockCode) {
      // Check if code exists for a different overlay SKU to give a helpful message
      const wrongSkuMatch = orders.find(
        (o) => o.status === 'approved' && o.unlockCode?.toUpperCase() === code
      );
      if (wrongSkuMatch) {
        res.status(403).json({
          ok: false,
          error:
            'This Unlock Key is valid for a different overlay. Please select the matching overlay.',
        });
        return;
      }

      res.status(403).json({
        ok: false,
        error: 'Invalid or locked Unlock Key. Pay ₹99 and get your verified key from the owner.',
      });
      return;
    }

    const expiresAt = getOrderExpiresAt(match);
    if (expiresAt <= Date.now()) {
      res.status(403).json({
        ok: false,
        expired: true,
        error:
          'This Unlock Key has expired and auto-locked. Please pay ₹99 to get a fresh Unlock Key.',
      });
      return;
    }

    const unlockedSkus = match.sku === 'all' ? Array.from(VALID_SKUS) : [match.sku];

    res.json({
      ok: true,
      sku: match.sku,
      unlockedSkus,
      orderId: match.orderId,
      unlockCode: match.unlockCode,
      expiresAt,
    });
  });

  // 5. Server-side validation of locally cached unlock tokens (auto-drops expired/revoked tokens)
  app.post('/api/overlay/validate-tokens', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const tokens = Array.isArray(body.tokens) ? body.tokens : [];
    const now = Date.now();
    const verified: Array<{ sku: string; orderId: string; unlockCode: string; expiresAt: number }> =
      [];

    for (const item of tokens) {
      if (!item || typeof item !== 'object') continue;
      const sku = String(item.sku || '');
      const orderId = String(item.orderId || '').toUpperCase();
      const unlockCode = String(item.unlockCode || '').toUpperCase();
      if (!VALID_SKUS.has(sku)) continue;

      const match = orders.find(
        (o) =>
          isOrderActive(o, now) &&
          orderCoversSku(o, sku) &&
          o.orderId === orderId &&
          o.unlockCode?.toUpperCase() === unlockCode
      );
      if (match && match.unlockCode) {
        verified.push({
          sku,
          orderId: match.orderId,
          unlockCode: match.unlockCode,
          expiresAt: getOrderExpiresAt(match),
        });
      }
    }

    res.json({ ok: true, verified });
  });

  // 5b. Live OBS / vMix Browser Source access check
  app.get('/api/overlay/access', (req, res) => {
    const sku = String(req.query.sku || '').trim();
    const token = String(req.query.token || '').trim().toUpperCase();
    const now = Date.now();

    if (sku === 'kabaddi-demo') {
      res.json({ ok: true, active: true, freeDemo: true, sku: 'kabaddi-demo' });
      return;
    }

    if (!token) {
      res.status(403).json({ ok: false, active: false, reason: 'missing_token' });
      return;
    }

    const match = orders.find(
      (o) =>
        o.status === 'approved' &&
        o.unlockCode?.toUpperCase() === token &&
        orderCoversSku(o, sku)
    );

    if (!match) {
      res.status(403).json({ ok: false, active: false, reason: 'invalid_token' });
      return;
    }

    const expiresAt = getOrderExpiresAt(match);
    if (expiresAt <= now) {
      res.status(403).json({ ok: false, active: false, reason: 'expired', expiresAt });
      return;
    }

    res.json({ ok: true, active: true, sku: sku || match.sku, expiresAt });
  });

  // ---------------------------------------------------------------------------
  // OWNER ADMIN ENDPOINTS (Generate Unlock Keys, Approve/Reject/Revoke)
  // ---------------------------------------------------------------------------
  // 6. Owner Admin: list all keys & payment verification requests
  app.get('/api/admin/orders', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const now = Date.now();
    const enriched = orders.map((o) => {
      const expiresAt = o.status === 'approved' ? getOrderExpiresAt(o) : undefined;
      return {
        ...o,
        expiresAt,
        isExpired: Boolean(expiresAt && expiresAt <= now),
      };
    });
    res.json({ ok: true, orders: enriched });
  });

  // 6b. Owner Admin: Direct 1-Click Unlock Key Generator (after real payment received!)
  app.post('/api/admin/keys/generate', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sku = String(body.sku || 'all').trim();
    const buyerName = String(body.buyerName || 'Verified Customer').trim().slice(0, 80) || 'Verified Customer';
    const buyerPhone = String(body.buyerPhone || '').replace(/\D/g, '').slice(0, 15);
    const note = String(body.note || '').trim().slice(0, 40);
    const rawHours = Number(body.durationHours);
    const durationHours = Number.isFinite(rawHours) ? Math.max(1, Math.min(720, Math.round(rawHours))) : 24;

    if (sku !== 'all' && !VALID_SKUS.has(sku)) {
      res.status(400).json({ ok: false, error: 'Invalid overlay selection for Unlock Key.' });
      return;
    }

    const now = Date.now();
    const unlockCode = generateUnlockCode();
    const order: OverlayOrder = {
      orderId: generateOrderId(),
      sku,
      amount: 99,
      originalPrice: 149,
      buyerName,
      buyerPhone,
      utrRef: note || `KEY-${durationHours}H`,
      paymentMethod: 'owner_key',
      status: 'approved',
      unlockCode,
      createdAt: now,
      verifiedAt: now,
      expiresAt: now + durationHours * 60 * 60 * 1000,
    };

    orders.unshift(order);
    savePersistedOrders(orders);

    res.status(201).json({
      ok: true,
      order: {
        ...order,
        isExpired: false,
      },
    });
  });

  // 7. Owner Admin: approve ₹99 payment request -> generates Unlock Key & starts 24h validity
  app.post('/api/admin/orders/:orderId/approve', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    // Optional last-4 UTR double check if provided by owner console
    const confirmLast4 = String(req.body?.confirmUtrLast4 || '').replace(/\D/g, '').trim();
    if (confirmLast4 && order.utrRef.length === 12 && !order.utrRef.endsWith(confirmLast4)) {
      res.status(400).json({
        ok: false,
        error: 'Last 4 digits did not match this order UTR. Please re-check your GPay/Bank receipt.',
      });
      return;
    }

    const now = Date.now();
    order.status = 'approved';
    order.unlockCode = order.unlockCode || generateUnlockCode();
    order.rejectionReason = undefined;
    order.verifiedAt = now;
    order.expiresAt = now + UNLOCK_DURATION_MS;
    savePersistedOrders(orders);
    notifyOrderWatchers(order);

    res.json({
      ok: true,
      order: {
        ...order,
        isExpired: false,
      },
    });
  });

  // 8. Owner Admin: reject unpaid / invalid UTR request
  app.post('/api/admin/orders/:orderId/reject', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 140);
    order.status = 'rejected';
    order.unlockCode = undefined;
    order.rejectionReason =
      reason || '₹99 payment not received for this UTR. Please check and resubmit.';
    order.verifiedAt = Date.now();
    savePersistedOrders(orders);
    notifyOrderWatchers(order);

    res.json({ ok: true, order });
  });

  // 9. Owner Admin: immediately revoke & lock an active Unlock Key
  app.post('/api/admin/orders/:orderId/revoke', (req, res) => {
    if (!requireAdminAuth(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 140);
    order.status = 'revoked';
    order.unlockCode = undefined;
    order.rejectionReason = reason || 'Unlock Key revoked by owner.';
    order.verifiedAt = Date.now();
    savePersistedOrders(orders);
    notifyOrderWatchers(order);

    res.json({ ok: true, order });
  });

  // ---------------------------------------------------------------------------
  // LIVE BROADCAST OVERLAY SYNC (OBS & vMix SSE)
  // ---------------------------------------------------------------------------
  app.get('/api/overlay/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const state = getOrCreateRoom(roomId);
    const connectedDisplays = sseClients.get(roomId)?.size ?? 0;
    res.json({ state, connectedDisplays });
  });

  app.post('/api/overlay/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const current = getOrCreateRoom(roomId);
    const patch = req.body && typeof req.body === 'object' ? req.body : {};

    const nextState: LiveOverlayState = {
      ...current,
      ...patch,
      roomId,
      updatedAt: Date.now(),
    };

    rooms.set(roomId, nextState);
    broadcastRoomState(roomId, nextState);

    const connectedDisplays = sseClients.get(roomId)?.size ?? 0;
    res.json({ state: nextState, connectedDisplays });
  });

  app.get('/api/overlay/:roomId/stream', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const state = getOrCreateRoom(roomId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clients = sseClients.get(roomId);
    if (!clients) {
      clients = new Set();
      sseClients.set(roomId, clients);
    }
    clients.add(res);

    broadcastRoomState(roomId, state);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients?.delete(res);
      if (clients && clients.size > 0) {
        broadcastRoomState(roomId, getOrCreateRoom(roomId));
      }
    });
  });

  // Long-lived browser caching for pre-optimized web media assets
  app.use(
    '/assets/optimized',
    express.static(path.resolve(__dirname, 'public/assets/optimized'), {
      maxAge: '365d',
      immutable: true,
    })
  );

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Event Live server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
