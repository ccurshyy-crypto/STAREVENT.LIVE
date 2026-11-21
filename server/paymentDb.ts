import crypto from 'crypto';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type PlanId = '1day' | '1week' | '1month';
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export type PaymentMethod = 'cashfree_qr' | 'upi_manual' | 'owner_key';
export type GatewayEnv = 'sandbox' | 'production';

export interface ServerPlan {
  id: PlanId;
  amount: number;
  originalPrice: number;
  durationHours: number;
  label: string;
}

export const SERVER_PLANS: Record<PlanId, ServerPlan> = {
  '1day': { id: '1day', amount: 1, originalPrice: 49, durationHours: 24, label: "1 Day Pass (Today's Offer)" },
  '1week': { id: '1week', amount: 149, originalPrice: 299, durationHours: 168, label: '1 Week Pass' },
  '1month': { id: '1month', amount: 1499, originalPrice: 2499, durationHours: 720, label: '1 Month Pass' },
};

export const VALID_SKUS = new Set<string>([
  'kabaddi-classic',
  'haldi-classic',
  'haldi-modern',
]);

export function resolvePlan(rawPlanId: unknown): ServerPlan {
  const key = String(rawPlanId || '1day').trim().toLowerCase() as PlanId;
  return SERVER_PLANS[key] ?? SERVER_PLANS['1day'];
}

export interface PaymentOrderRecord {
  orderId: string;
  cfOrderId?: string;
  cfPaymentId?: string;
  paymentSessionId?: string;
  sku: string; // specific SKU or 'all'
  planId: PlanId;
  durationHours: number;
  amount: number;
  originalPrice: number;
  currency: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  utrRef: string;
  proofImage?: string;
  proofHash?: string;
  paymentMethod: PaymentMethod;
  gatewayEnv?: GatewayEnv;
  gatewayQrImageUrl?: string;
  upiIntentUrl?: string;
  qrCloseBy?: number;
  status: OrderStatus;
  unlockCode?: string;
  rejectionReason?: string;
  createdAt: number;
  verifiedAt?: number;
  expiresAt?: number;
}

export interface OverlaySubscriptionRecord {
  id: string;
  orderId: string;
  sku: string;
  planId: PlanId;
  unlockCode: string;
  status: 'active' | 'expired' | 'revoked';
  startsAt: number;
  expiresAt: number;
  revokedAt?: number;
  createdAt: number;
}

let dbInstance: DatabaseSync | null = null;
let resolvedDbPath: string | null = null;

function resolveDatabasePath(): string {
  if (resolvedDbPath) return resolvedDbPath;

  const customPath = (process.env.DATABASE_PATH || '').trim();
  if (customPath) {
    const dir = path.dirname(customPath);
    fs.mkdirSync(dir, { recursive: true });
    resolvedDbPath = customPath;
    return resolvedDbPath;
  }

  // Prefer persistent ./data directory in local/Node servers; fall back to /tmp on read-only serverless runtimes (Vercel)
  const localDataDir = path.resolve(__dirname, '..', 'data');
  try {
    fs.mkdirSync(localDataDir, { recursive: true });
    fs.accessSync(localDataDir, fs.constants.W_OK);
    resolvedDbPath = path.join(localDataDir, 'star-event-payments.db');
    return resolvedDbPath;
  } catch {
    const tmpDir = '/tmp';
    resolvedDbPath = path.join(tmpDir, 'star-event-payments.db');
    return resolvedDbPath;
  }
}

export function generateOrderId(): string {
  const rand = crypto.randomInt(100000, 999999);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `OVL-${rand}-${suffix}`;
}

export function generateUnlockCode(): string {
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

export function getOrderDurationMs(order: Pick<PaymentOrderRecord, 'durationHours' | 'planId'>): number {
  const hours =
    typeof order.durationHours === 'number' && order.durationHours > 0
      ? order.durationHours
      : order.planId && SERVER_PLANS[order.planId]
        ? SERVER_PLANS[order.planId].durationHours
        : 24;
  return hours * 60 * 60 * 1000;
}

export function getOrderExpiresAt(order: PaymentOrderRecord): number {
  if (typeof order.expiresAt === 'number' && order.expiresAt > 0) return order.expiresAt;
  const base = order.verifiedAt || order.createdAt;
  return base + getOrderDurationMs(order);
}

export function orderCoversSku(order: Pick<PaymentOrderRecord, 'sku'>, requestedSku?: string): boolean {
  if (!requestedSku) return true;
  return order.sku === 'all' || order.sku === requestedSku;
}

export function isOrderActive(order: PaymentOrderRecord, now = Date.now()): boolean {
  return order.status === 'approved' && Boolean(order.unlockCode) && getOrderExpiresAt(order) > now;
}

function rowToOrder(row: Record<string, unknown>): PaymentOrderRecord {
  const rawMethod = String(row.payment_method || 'upi_manual');
  const paymentMethod: PaymentMethod =
    rawMethod === 'cashfree_qr' || rawMethod === 'owner_key' || rawMethod === 'upi_manual'
      ? rawMethod
      : 'upi_manual';
  const rawPlan = String(row.plan_id || '1day') as PlanId;
  const planId: PlanId = rawPlan in SERVER_PLANS ? rawPlan : '1day';
  const rawStatus = String(row.status || 'pending') as OrderStatus;
  const status: OrderStatus =
    rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'revoked'
      ? rawStatus
      : 'pending';
  const rawEnv = row.gateway_env ? String(row.gateway_env) : undefined;
  const gatewayEnv: GatewayEnv | undefined =
    rawEnv === 'sandbox' || rawEnv === 'production' ? rawEnv : undefined;

  return {
    orderId: String(row.order_id),
    cfOrderId: row.cf_order_id ? String(row.cf_order_id) : undefined,
    cfPaymentId: row.cf_payment_id ? String(row.cf_payment_id) : undefined,
    paymentSessionId: row.payment_session_id ? String(row.payment_session_id) : undefined,
    sku: String(row.sku),
    planId,
    durationHours: Number(row.duration_hours) || SERVER_PLANS[planId].durationHours,
    amount: Number(row.amount) || SERVER_PLANS[planId].amount,
    originalPrice: Number(row.original_price) || SERVER_PLANS[planId].originalPrice,
    currency: String(row.currency || 'INR'),
    buyerName: String(row.buyer_name || 'Live Broadcaster'),
    buyerPhone: String(row.buyer_phone || ''),
    buyerEmail: row.buyer_email ? String(row.buyer_email) : undefined,
    utrRef: String(row.utr_ref || ''),
    proofImage: row.proof_image ? String(row.proof_image) : undefined,
    proofHash: row.proof_hash ? String(row.proof_hash) : undefined,
    paymentMethod,
    gatewayEnv,
    gatewayQrImageUrl: row.gateway_qr_image_url ? String(row.gateway_qr_image_url) : undefined,
    upiIntentUrl: row.upi_intent_url ? String(row.upi_intent_url) : undefined,
    qrCloseBy: typeof row.qr_close_by === 'number' ? row.qr_close_by : undefined,
    status,
    unlockCode: row.unlock_code ? String(row.unlock_code) : undefined,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    createdAt: Number(row.created_at) || Date.now(),
    verifiedAt: typeof row.verified_at === 'number' ? row.verified_at : undefined,
    expiresAt: typeof row.expires_at === 'number' ? row.expires_at : undefined,
  };
}

function rowToSubscription(row: Record<string, unknown>): OverlaySubscriptionRecord {
  const rawPlan = String(row.plan_id || '1day') as PlanId;
  const planId: PlanId = rawPlan in SERVER_PLANS ? rawPlan : '1day';
  const rawStatus = String(row.status || 'active');
  const status: 'active' | 'expired' | 'revoked' =
    rawStatus === 'revoked' || rawStatus === 'expired' ? rawStatus : 'active';
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    sku: String(row.sku),
    planId,
    unlockCode: String(row.unlock_code),
    status,
    startsAt: Number(row.starts_at),
    expiresAt: Number(row.expires_at),
    revokedAt: typeof row.revoked_at === 'number' ? row.revoked_at : undefined,
    createdAt: Number(row.created_at),
  };
}

function initDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDatabasePath();
  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS payment_orders (
      order_id TEXT PRIMARY KEY,
      cf_order_id TEXT,
      cf_payment_id TEXT,
      payment_session_id TEXT,
      sku TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      duration_hours INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      original_price INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT NOT NULL DEFAULT '',
      buyer_email TEXT,
      utr_ref TEXT NOT NULL DEFAULT '',
      proof_image TEXT,
      proof_hash TEXT,
      payment_method TEXT NOT NULL,
      gateway_env TEXT,
      gateway_qr_image_url TEXT,
      upi_intent_url TEXT,
      qr_close_by INTEGER,
      status TEXT NOT NULL,
      unlock_code TEXT,
      rejection_reason TEXT,
      created_at INTEGER NOT NULL,
      verified_at INTEGER,
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS overlay_subscriptions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      unlock_code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      starts_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES payment_orders(order_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payment_orders_cf_order_id ON payment_orders(cf_order_id);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_unlock_code ON payment_orders(unlock_code);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_utr_ref ON payment_orders(utr_ref);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_unlock_code ON overlay_subscriptions(unlock_code);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id ON overlay_subscriptions(order_id);
  `);

  dbInstance = db;
  migrateLegacyJsonIfNeeded(db);
  return db;
}

function migrateLegacyJsonIfNeeded(db: DatabaseSync) {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as total FROM payment_orders').get() as
      | { total?: number }
      | undefined;
    if ((countRow?.total ?? 0) > 0) return;

    const legacyJsonPath = path.resolve(__dirname, '..', 'data', 'overlay-orders.json');
    if (!fs.existsSync(legacyJsonPath)) return;

    const raw = fs.readFileSync(legacyJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    for (const item of parsed) {
      if (!item || typeof item !== 'object' || typeof item.orderId !== 'string') continue;
      const plan = resolvePlan(item.planId);
      const rawMethod = String(item.paymentMethod || 'upi_manual');
      const paymentMethod: PaymentMethod =
        rawMethod === 'owner_key'
          ? 'owner_key'
          : rawMethod === 'cashfree_qr'
            ? 'cashfree_qr'
            : 'upi_manual';
      const createdAt = Number(item.createdAt) || Date.now();
      const verifiedAt = typeof item.verifiedAt === 'number' ? item.verifiedAt : undefined;
      const durationHours = Number(item.durationHours) || plan.durationHours;
      const expiresAt =
        typeof item.expiresAt === 'number'
          ? item.expiresAt
          : item.status === 'approved'
            ? (verifiedAt || createdAt) + durationHours * 60 * 60 * 1000
            : undefined;

      const record: PaymentOrderRecord = {
        orderId: String(item.orderId).toUpperCase(),
        sku: String(item.sku || 'kabaddi-classic'),
        planId: plan.id,
        durationHours,
        amount: Number(item.amount) || plan.amount,
        originalPrice: Number(item.originalPrice) || plan.originalPrice,
        currency: 'INR',
        buyerName: String(item.buyerName || 'Customer'),
        buyerPhone: String(item.buyerPhone || ''),
        utrRef: String(item.utrRef || ''),
        proofImage: typeof item.proofImage === 'string' ? item.proofImage : undefined,
        proofHash: typeof item.proofHash === 'string' ? item.proofHash : undefined,
        paymentMethod,
        status:
          item.status === 'approved' || item.status === 'rejected' || item.status === 'revoked'
            ? item.status
            : 'pending',
        unlockCode: typeof item.unlockCode === 'string' ? item.unlockCode.toUpperCase() : undefined,
        rejectionReason: typeof item.rejectionReason === 'string' ? item.rejectionReason : undefined,
        createdAt,
        verifiedAt,
        expiresAt,
      };

      upsertPaymentOrder(record);
      if (record.status === 'approved' && record.unlockCode && record.expiresAt) {
        upsertSubscriptionForOrder(record);
      }
    }
  } catch (err) {
    console.error('Legacy orders migration skipped:', err);
  }
}

export function getPaymentDbPath(): string {
  initDatabase();
  return resolveDatabasePath();
}

export function upsertPaymentOrder(order: PaymentOrderRecord): PaymentOrderRecord {
  const db = initDatabase();
  db.prepare(`
    INSERT INTO payment_orders (
      order_id, cf_order_id, cf_payment_id, payment_session_id,
      sku, plan_id, duration_hours, amount, original_price, currency,
      buyer_name, buyer_phone, buyer_email, utr_ref, proof_image, proof_hash,
      payment_method, gateway_env, gateway_qr_image_url, upi_intent_url, qr_close_by,
      status, unlock_code, rejection_reason, created_at, verified_at, expires_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(order_id) DO UPDATE SET
      cf_order_id = excluded.cf_order_id,
      cf_payment_id = excluded.cf_payment_id,
      payment_session_id = excluded.payment_session_id,
      sku = excluded.sku,
      plan_id = excluded.plan_id,
      duration_hours = excluded.duration_hours,
      amount = excluded.amount,
      original_price = excluded.original_price,
      currency = excluded.currency,
      buyer_name = excluded.buyer_name,
      buyer_phone = excluded.buyer_phone,
      buyer_email = excluded.buyer_email,
      utr_ref = excluded.utr_ref,
      proof_image = excluded.proof_image,
      proof_hash = excluded.proof_hash,
      payment_method = excluded.payment_method,
      gateway_env = excluded.gateway_env,
      gateway_qr_image_url = excluded.gateway_qr_image_url,
      upi_intent_url = excluded.upi_intent_url,
      qr_close_by = excluded.qr_close_by,
      status = excluded.status,
      unlock_code = excluded.unlock_code,
      rejection_reason = excluded.rejection_reason,
      verified_at = excluded.verified_at,
      expires_at = excluded.expires_at
  `).run(
    order.orderId,
    order.cfOrderId ?? null,
    order.cfPaymentId ?? null,
    order.paymentSessionId ?? null,
    order.sku,
    order.planId,
    order.durationHours,
    order.amount,
    order.originalPrice,
    order.currency || 'INR',
    order.buyerName,
    order.buyerPhone || '',
    order.buyerEmail ?? null,
    order.utrRef || '',
    order.proofImage ?? null,
    order.proofHash ?? null,
    order.paymentMethod,
    order.gatewayEnv ?? null,
    order.gatewayQrImageUrl ?? null,
    order.upiIntentUrl ?? null,
    order.qrCloseBy ?? null,
    order.status,
    order.unlockCode ?? null,
    order.rejectionReason ?? null,
    order.createdAt,
    order.verifiedAt ?? null,
    order.expiresAt ?? null
  );
  return order;
}

export function upsertSubscriptionForOrder(order: PaymentOrderRecord): OverlaySubscriptionRecord | null {
  if (!order.unlockCode) return null;
  const db = initDatabase();
  const now = Date.now();
  const startsAt = order.verifiedAt || now;
  const expiresAt = getOrderExpiresAt(order);
  const subStatus: 'active' | 'expired' | 'revoked' =
    order.status === 'revoked'
      ? 'revoked'
      : expiresAt <= now
        ? 'expired'
        : 'active';

  const existing = db
    .prepare('SELECT id FROM overlay_subscriptions WHERE order_id = ?')
    .get(order.orderId) as { id?: string } | undefined;

  const subId = existing?.id || `SUB-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  db.prepare(`
    INSERT INTO overlay_subscriptions (
      id, order_id, sku, plan_id, unlock_code, status, starts_at, expires_at, revoked_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(unlock_code) DO UPDATE SET
      status = excluded.status,
      starts_at = excluded.starts_at,
      expires_at = excluded.expires_at,
      revoked_at = excluded.revoked_at
  `).run(
    subId,
    order.orderId,
    order.sku,
    order.planId,
    order.unlockCode.toUpperCase(),
    subStatus,
    startsAt,
    expiresAt,
    subStatus === 'revoked' ? now : null,
    now
  );

  return {
    id: subId,
    orderId: order.orderId,
    sku: order.sku,
    planId: order.planId,
    unlockCode: order.unlockCode.toUpperCase(),
    status: subStatus,
    startsAt,
    expiresAt,
    revokedAt: subStatus === 'revoked' ? now : undefined,
    createdAt: now,
  };
}

export function listPaymentOrders(): PaymentOrderRecord[] {
  const db = initDatabase();
  const rows = db
    .prepare('SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT 500')
    .all() as Record<string, unknown>[];
  return rows.map(rowToOrder);
}

export function getPaymentOrderById(orderId: string): PaymentOrderRecord | null {
  const db = initDatabase();
  const normalized = orderId.trim().toUpperCase();
  const row = db
    .prepare('SELECT * FROM payment_orders WHERE order_id = ? LIMIT 1')
    .get(normalized) as Record<string, unknown> | undefined;
  return row ? rowToOrder(row) : null;
}

export function getPaymentOrderByCfOrderId(cfOrderId: string): PaymentOrderRecord | null {
  const db = initDatabase();
  const row = db
    .prepare('SELECT * FROM payment_orders WHERE cf_order_id = ? LIMIT 1')
    .get(cfOrderId.trim()) as Record<string, unknown> | undefined;
  return row ? rowToOrder(row) : null;
}

export function findPaymentOrderByUtr(utrRef: string): PaymentOrderRecord | null {
  const db = initDatabase();
  const row = db
    .prepare('SELECT * FROM payment_orders WHERE utr_ref = ? LIMIT 1')
    .get(utrRef.trim()) as Record<string, unknown> | undefined;
  return row ? rowToOrder(row) : null;
}

export function findPaymentOrderByProofHash(proofHash: string): PaymentOrderRecord | null {
  const db = initDatabase();
  const row = db
    .prepare('SELECT * FROM payment_orders WHERE proof_hash = ? LIMIT 1')
    .get(proofHash.trim()) as Record<string, unknown> | undefined;
  return row ? rowToOrder(row) : null;
}

export function findApprovedOrderByUnlockCode(
  unlockCode: string,
  requestedSku?: string
): PaymentOrderRecord | null {
  const db = initDatabase();
  const normalized = unlockCode.trim().toUpperCase();
  const rows = db
    .prepare('SELECT * FROM payment_orders WHERE status = ? AND UPPER(unlock_code) = ?')
    .all('approved', normalized) as Record<string, unknown>[];
  const mapped = rows.map(rowToOrder);
  if (!requestedSku) return mapped[0] ?? null;
  return mapped.find((o) => orderCoversSku(o, requestedSku)) ?? null;
}

export function getSubscriptionByUnlockCode(unlockCode: string): OverlaySubscriptionRecord | null {
  const db = initDatabase();
  const normalized = unlockCode.trim().toUpperCase();
  const row = db
    .prepare('SELECT * FROM overlay_subscriptions WHERE UPPER(unlock_code) = ? LIMIT 1')
    .get(normalized) as Record<string, unknown> | undefined;
  if (!row) return null;
  const sub = rowToSubscription(row);
  // Automatically transition expired subscriptions
  if (sub.status === 'active' && sub.expiresAt <= Date.now()) {
    db.prepare('UPDATE overlay_subscriptions SET status = ? WHERE id = ?').run('expired', sub.id);
    sub.status = 'expired';
  }
  return sub;
}

export function activateOrderAndSubscription(
  orderId: string,
  details: { cfPaymentId?: string; bankRef?: string; unlockCode?: string } = {}
): { order: PaymentOrderRecord; subscription: OverlaySubscriptionRecord } | null {
  const existing = getPaymentOrderById(orderId);
  if (!existing) return null;

  // Idempotent: if already approved & active, return existing records without resetting expiry
  if (existing.status === 'approved' && existing.unlockCode) {
    const existingSub =
      getSubscriptionByUnlockCode(existing.unlockCode) || upsertSubscriptionForOrder(existing)!;
    return { order: existing, subscription: existingSub };
  }

  const now = Date.now();
  const unlockCode = (details.unlockCode || existing.unlockCode || generateUnlockCode()).toUpperCase();
  const expiresAt = now + getOrderDurationMs(existing);

  const nextUtr =
    details.bankRef && /^\d{12}$/.test(details.bankRef)
      ? details.bankRef
      : details.bankRef
        ? details.bankRef.slice(0, 32)
        : details.cfPaymentId
          ? `CF-${details.cfPaymentId}`
          : existing.utrRef;

  const updated: PaymentOrderRecord = {
    ...existing,
    status: 'approved',
    unlockCode,
    cfPaymentId: details.cfPaymentId || existing.cfPaymentId,
    utrRef: nextUtr,
    rejectionReason: undefined,
    verifiedAt: now,
    expiresAt,
  };

  upsertPaymentOrder(updated);
  const subscription = upsertSubscriptionForOrder(updated)!;
  return { order: updated, subscription };
}

export function rejectPaymentOrder(orderId: string, reason?: string): PaymentOrderRecord | null {
  const existing = getPaymentOrderById(orderId);
  if (!existing) return null;

  const updated: PaymentOrderRecord = {
    ...existing,
    status: 'rejected',
    unlockCode: undefined,
    rejectionReason:
      reason?.trim().slice(0, 140) ||
      `₹${existing.amount} payment not received. Please check and try again.`,
    verifiedAt: Date.now(),
  };
  upsertPaymentOrder(updated);
  return updated;
}

export function revokeOrderAndSubscription(
  orderId: string,
  reason?: string
): PaymentOrderRecord | null {
  const existing = getPaymentOrderById(orderId);
  if (!existing) return null;
  const db = initDatabase();
  const now = Date.now();

  const updated: PaymentOrderRecord = {
    ...existing,
    status: 'revoked',
    unlockCode: undefined,
    rejectionReason: reason?.trim().slice(0, 140) || 'Unlock Key revoked by owner.',
    verifiedAt: now,
  };
  upsertPaymentOrder(updated);

  db.prepare(
    'UPDATE overlay_subscriptions SET status = ?, revoked_at = ? WHERE order_id = ?'
  ).run('revoked', now, existing.orderId);

  return updated;
}

export function toPublicOrderSummary(order: PaymentOrderRecord) {
  const expiresAt = order.status === 'approved' ? getOrderExpiresAt(order) : undefined;
  const expired = Boolean(expiresAt && expiresAt <= Date.now());
  return {
    orderId: order.orderId,
    cfOrderId: order.cfOrderId,
    sku: order.sku,
    planId: order.planId || '1day',
    durationHours: order.durationHours || 24,
    amount: order.amount,
    originalPrice: order.originalPrice,
    paymentMethod: order.paymentMethod || 'upi_manual',
    gatewayEnv: order.gatewayEnv,
    paymentSessionId: order.status === 'pending' ? order.paymentSessionId : undefined,
    gatewayQrImageUrl: order.status === 'pending' ? order.gatewayQrImageUrl : undefined,
    upiIntentUrl: order.status === 'pending' ? order.upiIntentUrl : undefined,
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
