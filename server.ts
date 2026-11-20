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
const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const OVERLAY_PRICE_INR = 99;
const OVERLAY_ORIGINAL_PRICE_INR = 149;

// Ephemeral in-memory HMAC signing secret for owner session tokens (overrideable via env)
const SESSION_SIGNING_SECRET =
  (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

const VALID_SKUS = new Set([
  'kabaddi-classic',
  'kabaddi-modern',
  'haldi-classic',
  'haldi-modern',
  'banner-theme1',
  'banner-theme2',
  'banner-theme3',
  'banner-theme4',
]);

export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

interface OverlayOrder {
  orderId: string;
  sku: string;
  amount: number;
  originalPrice: number;
  buyerName: string;
  buyerPhone: string;
  utrRef: string;
  proofImage?: string;
  proofHash?: string;
  paymentMethod?: 'upi_manual' | 'razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
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

function savePersistedOrders(list: OverlayOrder[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist overlay orders:', err);
  }
}

function loadStoredAdminAuth(): StoredAdminAuth | null {
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

function saveStoredAdminAuth(auth: StoredAdminAuth) {
  ensureDataDir();
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(auth, null, 2), 'utf-8');
}

function getEnvAdminPasscode(): string {
  const raw = (process.env.OVERLAY_ADMIN_PIN || '').trim();
  // Ignore unconfigured placeholder values
  if (!raw || raw === 'MY_OVERLAY_ADMIN_PIN') return '';
  return raw;
}

function getRazorpayCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret || keyId.startsWith('MY_') || keySecret.startsWith('MY_')) {
    return null;
  }
  return { keyId, keySecret };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashPasswordScrypt(password: string, salt?: string): { salt: string; hash: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifyOwnerSecret(provided: string): boolean {
  const cleaned = provided.trim();
  if (!cleaned) return false;

  // Configured env passcode always overrides any claimed fallback hash
  const envPass = getEnvAdminPasscode();
  if (envPass) {
    return timingSafeStringEqual(cleaned, envPass);
  }

  const stored = loadStoredAdminAuth();
  if (!stored) return false;
  const computed = hashPasswordScrypt(cleaned, stored.salt);
  return timingSafeStringEqual(computed.hash, stored.hash);
}

// Active owner session tokens stored in memory
const adminSessions = new Map<string, number>();

function issueAdminSessionToken(): string {
  const nonce = crypto.randomBytes(24).toString('hex');
  const exp = Date.now() + ADMIN_SESSION_TTL_MS;
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(`${nonce}.${exp}`)
    .digest('hex');
  const token = `${nonce}.${exp}.${sig}`;
  adminSessions.set(token, exp);
  return token;
}

function verifyAdminSession(req: express.Request, res: express.Response): boolean {
  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'Owner sign-in required.' });
    return false;
  }
  const token = authHeader.slice(7).trim();
  const exp = adminSessions.get(token);
  if (!exp || exp <= Date.now()) {
    adminSessions.delete(token);
    res.status(401).json({ ok: false, error: 'Owner session expired. Please sign in again.' });
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    res.status(401).json({ ok: false, error: 'Invalid session token.' });
    return false;
  }
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('hex');
  if (!timingSafeStringEqual(parts[2], expectedSig)) {
    adminSessions.delete(token);
    res.status(401).json({ ok: false, error: 'Invalid session signature.' });
    return false;
  }
  return true;
}

// Simple per-IP sliding window rate limiter to prevent brute-force & fake order spam
const rateBuckets = new Map<string, number[]>();

function getClientIp(req: express.Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(bucketKey: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = (rateBuckets.get(bucketKey) || []).filter((ts) => ts > cutoff);
  if (existing.length >= maxRequests) {
    rateBuckets.set(bucketKey, existing);
    return false;
  }
  existing.push(now);
  rateBuckets.set(bucketKey, existing);
  return true;
}

// Strict anti-fraud validation for Indian 12-digit UPI UTR / RRN numbers
function validateUpiUtr(utr: string): { valid: boolean; reason?: string } {
  if (!/^\d{12}$/.test(utr)) {
    return {
      valid: false,
      reason: 'Please enter the exact 12-digit UPI UTR / Reference Number from your GPay/PhonePe receipt.',
    };
  }
  // Reject all identical digits (000000000000, 111111111111, etc.)
  if (/^(\d)\1{11}$/.test(utr)) {
    return { valid: false, reason: 'Invalid UTR pattern detected. Please enter a real UPI UTR.' };
  }
  // Reject trivial ascending/descending runs (123456789012, 987654321098, 012345678901)
  const fakePatterns = new Set([
    '123456789012',
    '012345678901',
    '987654321098',
    '123456123456',
    '111111222222',
    '112233445566',
    '999999888888',
  ]);
  if (fakePatterns.has(utr)) {
    return { valid: false, reason: 'Fake/test UTR number rejected. Only genuine ₹99 UPI UTRs are accepted.' };
  }
  // Require at least 4 distinct digits (real NPCI RRNs have date + bank + random sequence)
  const uniqueDigits = new Set(utr.split('')).size;
  if (uniqueDigits < 4) {
    return { valid: false, reason: 'Invalid UTR number. Please copy the exact 12-digit UTR from your UPI receipt.' };
  }
  // Reject 6+ consecutive identical digits (e.g. 420000000123)
  if (/(\d)\1{6,}/.test(utr)) {
    return { valid: false, reason: 'Suspicious UTR format rejected. Please submit your real 12-digit UPI UTR.' };
  }
  return { valid: true };
}

function hashProofImage(dataUrl: string): string {
  return crypto.createHash('sha256').update(dataUrl).digest('hex');
}

function getOrderExpiresAt(order: OverlayOrder): number {
  if (typeof order.expiresAt === 'number') return order.expiresAt;
  const base = order.verifiedAt || order.createdAt;
  return base + UNLOCK_DURATION_MS;
}

function isOrderActive(order: OverlayOrder, now = Date.now()): boolean {
  return order.status === 'approved' && Boolean(order.unlockCode) && getOrderExpiresAt(order) > now;
}

function generateOrderId(): string {
  // 48-bit unpredictable order ID prevents enumeration
  return `OVL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function generateUnlockCode(): string {
  // 48-bit high-entropy unlock token (STAR-XXXX-XXXX-XXXX)
  const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `STAR-${p1}-${p2}-${p3}`;
}

// Authoritative server-side room store for OBS & vMix Browser Sources
const rooms = new Map<string, LiveOverlayState>();
const sseClients = new Map<string, Set<express.Response>>();

// Authoritative server-side payment orders store
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

function maskUtr(utr: string): string {
  if (utr.length <= 4) return utr;
  return `${'•'.repeat(utr.length - 4)}${utr.slice(-4)}`;
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
    utrRef: maskUtr(order.utrRef),
    unlockCode: order.status === 'approved' && !expired ? order.unlockCode : undefined,
    rejectionReason:
      order.status === 'rejected' || order.status === 'revoked'
        ? order.rejectionReason
        : undefined,
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
  app.set('trust proxy', 1);
  // Allow up to 1.5MB for compressed payment screenshot proof
  app.use(express.json({ limit: '1.5mb' }));

  // Scoped CORS: public wildcard ONLY for OBS / vMix overlay playback endpoints (NEVER admin routes)
  app.use('/api/overlay', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 0. Payment gateway capabilities (tells UI whether instant bank-verified Razorpay is active)
  app.get('/api/payment/config', (_req, res) => {
    const rzp = getRazorpayCredentials();
    res.json({
      ok: true,
      amountInr: OVERLAY_PRICE_INR,
      razorpayEnabled: Boolean(rzp),
      razorpayKeyId: rzp ? rzp.keyId : undefined,
    });
  });

  // 0b. Create a real Razorpay order (when RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET are configured)
  app.post('/api/payment/razorpay/create-order', async (req, res) => {
    const rzp = getRazorpayCredentials();
    if (!rzp) {
      res.status(503).json({ ok: false, error: 'Online gateway not configured. Use UPI QR verification.' });
      return;
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`rzp-create:${ip}`, 10, 15 * 60 * 1000)) {
      res.status(429).json({ ok: false, error: 'Too many checkout attempts. Please wait a few minutes.' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sku = String(body.sku || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 80);
    const buyerPhone = String(body.buyerPhone || '').replace(/\D/g, '').slice(0, 15);

    if (!VALID_SKUS.has(sku)) {
      res.status(400).json({ ok: false, error: 'Invalid overlay selection.' });
      return;
    }
    if (buyerName.length < 2 || buyerPhone.length < 10) {
      res.status(400).json({ ok: false, error: 'Please enter your name and valid 10-digit mobile number.' });
      return;
    }

    try {
      const receiptId = generateOrderId();
      const auth = Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: OVERLAY_PRICE_INR * 100, // exact ₹99 in paise, server-enforced
          currency: 'INR',
          receipt: receiptId,
          notes: { sku, buyerName, buyerPhone },
        }),
      });
      const rzpData = (await rzpRes.json()) as { id?: string; amount?: number; currency?: string; error?: { description?: string } };
      if (!rzpRes.ok || !rzpData?.id) {
        res.status(502).json({
          ok: false,
          error: rzpData?.error?.description || 'Could not initialize verified payment order.',
        });
        return;
      }

      const order: OverlayOrder = {
        orderId: receiptId,
        sku,
        amount: OVERLAY_PRICE_INR,
        originalPrice: OVERLAY_ORIGINAL_PRICE_INR,
        buyerName,
        buyerPhone,
        utrRef: rzpData.id,
        paymentMethod: 'razorpay',
        razorpayOrderId: rzpData.id,
        status: 'pending',
        createdAt: Date.now(),
      };
      orders.unshift(order);
      savePersistedOrders(orders);

      res.json({
        ok: true,
        orderId: order.orderId,
        razorpayOrderId: rzpData.id,
        razorpayKeyId: rzp.keyId,
        amount: OVERLAY_PRICE_INR * 100,
        currency: 'INR',
      });
    } catch {
      res.status(502).json({ ok: false, error: 'Payment gateway unreachable. Please try again.' });
    }
  });

  // 0c. Cryptographically verify Razorpay payment signature (HMAC-SHA256) -> real bank confirmation
  app.post('/api/payment/razorpay/verify', async (req, res) => {
    const rzp = getRazorpayCredentials();
    if (!rzp) {
      res.status(503).json({ ok: false, error: 'Online gateway not configured.' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const razorpayOrderId = String(body.razorpay_order_id || '').trim();
    const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
    const razorpaySignature = String(body.razorpay_signature || '').trim();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ ok: false, error: 'Missing payment verification parameters.' });
      return;
    }

    const expectedSig = crypto
      .createHmac('sha256', rzp.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!timingSafeStringEqual(expectedSig, razorpaySignature)) {
      res.status(403).json({
        ok: false,
        error: 'Payment signature verification failed. Overlay remains locked.',
      });
      return;
    }

    const order = orders.find(
      (o) => o.paymentMethod === 'razorpay' && o.razorpayOrderId === razorpayOrderId
    );
    if (!order) {
      res.status(404).json({ ok: false, error: 'Matching order not found.' });
      return;
    }

    // Confirm captured status & exact ₹99 amount directly with Razorpay server API
    try {
      const auth = Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString('base64');
      const payRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      const payData = (await payRes.json()) as {
        status?: string;
        amount?: number;
        currency?: string;
        order_id?: string;
      };
      if (
        !payRes.ok ||
        (payData.status !== 'captured' && payData.status !== 'authorized') ||
        payData.amount !== OVERLAY_PRICE_INR * 100 ||
        payData.currency !== 'INR' ||
        payData.order_id !== razorpayOrderId
      ) {
        res.status(403).json({
          ok: false,
          error: 'Bank payment confirmation incomplete or amount mismatch. Overlay remains locked.',
        });
        return;
      }
    } catch {
      res.status(502).json({
        ok: false,
        error: 'Could not confirm payment status with bank gateway.',
      });
      return;
    }

    const now = Date.now();
    order.status = 'approved';
    order.razorpayPaymentId = razorpayPaymentId;
    order.unlockCode = order.unlockCode || generateUnlockCode();
    order.verifiedAt = now;
    order.expiresAt = now + UNLOCK_DURATION_MS;
    savePersistedOrders(orders);
    notifyOrderWatchers(order);

    res.json({
      ok: true,
      order: toPublicOrderSummary(order),
    });
  });

  // 1. Submit a ₹99 UPI payment proof -> STRICT anti-fraud checks + creates PENDING order (NEVER auto-unlocks!)
  app.post('/api/overlay/orders', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`order-submit:${ip}`, 8, 15 * 60 * 1000)) {
      res.status(429).json({
        ok: false,
        error: 'Too many payment proof submissions. Please wait 15 minutes before retrying.',
      });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const sku = String(body.sku || '').trim();
    const buyerName = String(body.buyerName || '').trim().slice(0, 80);
    const buyerPhone = String(body.buyerPhone || '').replace(/\D/g, '').slice(0, 15);
    const utrRef = String(body.utrRef || '').replace(/\D/g, '').slice(0, 12);
    const rawProof = typeof body.proofImage === 'string' ? body.proofImage : '';
    const isValidProofImage =
      (rawProof.startsWith('data:image/jpeg;base64,') ||
        rawProof.startsWith('data:image/png;base64,') ||
        rawProof.startsWith('data:image/webp;base64,')) &&
      rawProof.length >= 2_500 &&
      rawProof.length <= 900_000;

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

    const utrCheck = validateUpiUtr(utrRef);
    if (!utrCheck.valid) {
      res.status(400).json({ ok: false, error: utrCheck.reason });
      return;
    }

    // Mandatory payment receipt screenshot to deter fake UTR submissions
    if (!isValidProofImage) {
      res.status(400).json({
        ok: false,
        error:
          'Genuine ₹99 UPI payment screenshot is mandatory for verification. Please upload your GPay/PhonePe receipt.',
      });
      return;
    }

    const proofHash = hashProofImage(rawProof);

    // Block reuse of ANY previously submitted UTR (including previously rejected/fraud-flagged UTRs!)
    const duplicateUtr = orders.find((o) => o.utrRef === utrRef);
    if (duplicateUtr) {
      if (
        duplicateUtr.status === 'pending' &&
        duplicateUtr.sku === sku &&
        duplicateUtr.buyerPhone === buyerPhone
      ) {
        res.json({ ok: true, order: toPublicOrderSummary(duplicateUtr), existing: true });
        return;
      }
      if (duplicateUtr.status === 'rejected' || duplicateUtr.status === 'revoked') {
        res.status(403).json({
          ok: false,
          error:
            'This UTR was already rejected as unpaid/invalid and is permanently blocked. Please make a real ₹99 payment.',
        });
        return;
      }
      res.status(409).json({
        ok: false,
        error: 'This 12-digit UPI UTR has already been used for another order.',
      });
      return;
    }

    // Anti-fraud SHA-256 screenshot fingerprint check: block reusing the same receipt image with a different UTR
    const duplicateReceipt = orders.find((o) => o.proofHash && o.proofHash === proofHash);
    if (duplicateReceipt) {
      res.status(409).json({
        ok: false,
        error:
          'This exact payment screenshot was already submitted earlier. Duplicate/reused receipts are blocked.',
      });
      return;
    }

    const order: OverlayOrder = {
      orderId: generateOrderId(),
      sku,
      amount: OVERLAY_PRICE_INR,
      originalPrice: OVERLAY_ORIGINAL_PRICE_INR,
      buyerName,
      buyerPhone,
      utrRef,
      proofImage: rawProof,
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

  // 4. Verify an owner-issued Unlock Code (STAR-XXXX-XXXX-XXXX ONLY — never orderId!)
  app.post('/api/overlay/verify-unlock', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`verify-unlock:${ip}`, 12, 15 * 60 * 1000)) {
      res.status(429).json({
        ok: false,
        error: 'Too many code attempts. Please wait 15 minutes before trying again.',
      });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const code = String(body.unlockCode || '').trim().toUpperCase();
    const requestedSku = String(body.sku || '').trim();

    if (!code || !code.startsWith('STAR-')) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a valid verified Unlock Code (e.g. STAR-XXXX-XXXX-XXXX).',
      });
      return;
    }

    const match = orders.find(
      (o) =>
        o.status === 'approved' &&
        Boolean(o.unlockCode) &&
        timingSafeStringEqual(o.unlockCode!.toUpperCase(), code) &&
        (!requestedSku || o.sku === requestedSku)
    );

    if (!match || !match.unlockCode) {
      res.status(403).json({
        ok: false,
        error:
          'Unlock code not found, revoked, or ₹99 payment is not yet verified. Overlay remains locked.',
      });
      return;
    }

    const expiresAt = getOrderExpiresAt(match);
    if (expiresAt <= Date.now()) {
      res.status(403).json({
        ok: false,
        expired: true,
        error:
          'This 24-hour overlay pass has expired and auto-locked. Please pay ₹99 again to unlock for 24 hours.',
      });
      return;
    }

    res.json({
      ok: true,
      sku: match.sku,
      orderId: match.orderId,
      unlockCode: match.unlockCode,
      expiresAt,
    });
  });

  // 5. Server-side validation of locally cached unlock tokens (drops expired, spoofed, or revoked tokens)
  app.post('/api/overlay/validate-tokens', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 20) : [];
    const now = Date.now();
    const verified: Array<{ sku: string; orderId: string; unlockCode: string; expiresAt: number }> =
      [];

    for (const item of tokens) {
      if (!item || typeof item !== 'object') continue;
      const sku = String(item.sku || '');
      const orderId = String(item.orderId || '').toUpperCase();
      const unlockCode = String(item.unlockCode || '').toUpperCase();
      if (!sku || !orderId || !unlockCode) continue;

      const match = orders.find(
        (o) =>
          isOrderActive(o, now) &&
          o.sku === sku &&
          o.orderId === orderId &&
          Boolean(o.unlockCode) &&
          timingSafeStringEqual(o.unlockCode!.toUpperCase(), unlockCode)
      );
      if (match && match.unlockCode) {
        verified.push({
          sku: match.sku,
          orderId: match.orderId,
          unlockCode: match.unlockCode,
          expiresAt: getOrderExpiresAt(match),
        });
      }
    }

    res.json({ ok: true, verified });
  });

  // 5b. Live OBS / vMix Browser Source & PNG Export 24-hour server access gate
  app.get('/api/overlay/access', (req, res) => {
    const sku = String(req.query.sku || '').trim();
    const token = String(req.query.token || '').trim().toUpperCase();
    const now = Date.now();

    if (!token) {
      res.status(403).json({ ok: false, active: false, reason: 'missing_token' });
      return;
    }

    const match = orders.find(
      (o) =>
        o.status === 'approved' &&
        Boolean(o.unlockCode) &&
        timingSafeStringEqual(o.unlockCode!.toUpperCase(), token) &&
        (!sku || o.sku === sku)
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

    res.json({ ok: true, active: true, sku: match.sku, expiresAt });
  });

  // ============================================================================
  // OWNER AUTH & ANTI-FRAUD VERIFICATION CONSOLE ROUTES (NO WILDCARD CORS)
  // ============================================================================

  // Check if owner password is configured via Secrets or first-run claimed setup
  app.get('/api/admin/auth-status', (_req, res) => {
    const hasEnv = Boolean(getEnvAdminPasscode());
    const hasStored = Boolean(loadStoredAdminAuth());
    res.json({
      ok: true,
      configured: hasEnv || hasStored,
      source: hasEnv ? 'env' : hasStored ? 'claimed' : 'unclaimed',
    });
  });

  // One-time atomic first-run Owner Password claim (locks permanently once claimed or env set)
  app.post('/api/admin/setup', (req, res) => {
    if (getEnvAdminPasscode() || loadStoredAdminAuth()) {
      res.status(409).json({
        ok: false,
        error: 'Owner password is already configured. Please sign in with your existing password.',
      });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const password = String(body.password || '').trim();
    if (password.length < 6 || password.length > 64) {
      res.status(400).json({
        ok: false,
        error: 'Choose a strong owner password between 6 and 64 characters.',
      });
      return;
    }

    const hashed = hashPasswordScrypt(password);
    saveStoredAdminAuth({
      salt: hashed.salt,
      hash: hashed.hash,
      createdAt: Date.now(),
    });

    const token = issueAdminSessionToken();
    res.status(201).json({ ok: true, token });
  });

  // Owner Sign-In (strict brute-force rate limit + server-verified scrypt/env check)
  app.post('/api/admin/login', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`admin-login:${ip}`, 6, 15 * 60 * 1000)) {
      res.status(429).json({
        ok: false,
        error: 'Too many failed login attempts. Owner console locked for 15 minutes.',
      });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const password = String(body.password || '').trim();

    if (!verifyOwnerSecret(password)) {
      res.status(401).json({ ok: false, error: 'Incorrect owner password.' });
      return;
    }

    const token = issueAdminSessionToken();
    res.json({ ok: true, token });
  });

  // Owner Sign-Out (revokes current in-memory Bearer token)
  app.post('/api/admin/logout', (req, res) => {
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.startsWith('Bearer ')) {
      adminSessions.delete(authHeader.slice(7).trim());
    }
    res.json({ ok: true });
  });

  // 6. Owner Admin: list all ₹99 payment verification requests with 24h expiry metadata
  app.get('/api/admin/orders', (req, res) => {
    if (!verifyAdminSession(req, res)) return;
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

  // 7. Owner Admin: approve ₹99 payment -> requires owner to confirm last 4 digits of real UTR!
  app.post('/api/admin/orders/:orderId/approve', (req, res) => {
    if (!verifyAdminSession(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    // Two-step real-money guard: require owner to type the exact last 4 digits of UTR from their GPay/SBI statement
    const confirmUtrLast4 = String(req.body?.confirmUtrLast4 || '').replace(/\D/g, '').trim();
    const expectedLast4 = order.utrRef.slice(-4);
    if (order.paymentMethod !== 'razorpay' && confirmUtrLast4 !== expectedLast4) {
      res.status(400).json({
        ok: false,
        error: `Please check your Google Pay / Bank statement and type the exact last 4 digits of the verified UTR to approve.`,
      });
      return;
    }

    const now = Date.now();
    order.status = 'approved';
    order.unlockCode = generateUnlockCode();
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

  // 8. Owner Admin: reject fake / unpaid UTR request (permanently blocks this UTR & screenshot)
  app.post('/api/admin/orders/:orderId/reject', (req, res) => {
    if (!verifyAdminSession(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 160);
    order.status = 'rejected';
    order.unlockCode = undefined;
    order.expiresAt = undefined;
    order.rejectionReason =
      reason ||
      '₹99 real payment was not received on crushyyphotography@oksbi. This UTR is blocked.';
    order.verifiedAt = Date.now();
    savePersistedOrders(orders);
    notifyOrderWatchers(order);

    res.json({ ok: true, order });
  });

  // 9. Owner Admin: immediately revoke & lock an active approved order (fraud/chargeback kill switch)
  app.post('/api/admin/orders/:orderId/revoke', (req, res) => {
    if (!verifyAdminSession(req, res)) return;
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found.' });
      return;
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 160);
    order.status = 'revoked';
    order.unlockCode = undefined;
    order.expiresAt = Date.now();
    order.rejectionReason =
      reason || 'Access revoked by owner — payment could not be verified.';
    order.verifiedAt = Date.now();
    savePersistedOrders(orders);
    notifyOrderWatchers(order);

    res.json({
      ok: true,
      order: {
        ...order,
        isExpired: true,
      },
    });
  });

  // Get current room state
  app.get('/api/overlay/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const state = getOrCreateRoom(roomId);
    const connectedDisplays = sseClients.get(roomId)?.size ?? 0;
    res.json({ state, connectedDisplays });
  });

  // Update room state & broadcast to all connected OBS/vMix browser sources
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

  // Real-time Server-Sent Events stream for OBS / vMix Browser Sources & Control Desks
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
