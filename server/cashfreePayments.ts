import crypto from 'crypto';
import QRCode from 'qrcode';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CASHFREE_PRODUCTION_BASE_URL = 'https://api.cashfree.com/pg';
export const WORLDCUP_PRODUCT_CODE = 'worldcup_scoreboard';
export const WORLDCUP_PRODUCT_NAME = 'WorldCup Scoreboard';
export const WORLDCUP_FIXED_AMOUNT_INR = 149;
export const LIGHTNING_PRO_PRODUCT_CODE = 'lightning_pro_scoreboard';
export const LIGHTNING_PRO_PRODUCT_NAME = 'Lightning Premier Scoreboard';
export const LIGHTNING_PRO_FIXED_AMOUNT_INR = 79;
export const WORLDCUP_FIXED_CURRENCY = 'INR';

export const OWNER_UPI_ID = (process.env.OWNER_UPI_ID || 'crushyyphotography@oksbi').trim();
export const OWNER_UPI_PAYEE_NAME = (process.env.OWNER_UPI_NAME || 'Crushyyphotography').trim();
export const OWNER_UPI_STATIC_QR_IMAGE =
  '/assets/aistudio/WhatsApp_Image_2026-11-19_at_2.32.59_AM_c3b23480.jpeg';

export type PaidThemeId = 'worldcup' | 'lightning-pro';

export interface PaidThemeProductConfig {
  themeId: PaidThemeId;
  productCode: string;
  productName: string;
  amountInr: number;
  currency: 'INR';
  orderPrefix: string;
}

export const PAID_THEME_PRODUCTS: Record<PaidThemeId, PaidThemeProductConfig> = {
  worldcup: {
    themeId: 'worldcup',
    productCode: WORLDCUP_PRODUCT_CODE,
    productName: WORLDCUP_PRODUCT_NAME,
    amountInr: WORLDCUP_FIXED_AMOUNT_INR,
    currency: 'INR',
    orderPrefix: 'WC',
  },
  'lightning-pro': {
    themeId: 'lightning-pro',
    productCode: LIGHTNING_PRO_PRODUCT_CODE,
    productName: LIGHTNING_PRO_PRODUCT_NAME,
    amountInr: LIGHTNING_PRO_FIXED_AMOUNT_INR,
    currency: 'INR',
    orderPrefix: 'LP',
  },
};

export function resolvePaidThemeProduct(raw: unknown): PaidThemeProductConfig | null {
  const val = String(raw || '').trim().toLowerCase();
  if (!val || val === 'worldcup' || val === WORLDCUP_PRODUCT_CODE) {
    return PAID_THEME_PRODUCTS.worldcup;
  }
  if (val === 'lightning-pro' || val === LIGHTNING_PRO_PRODUCT_CODE) {
    return PAID_THEME_PRODUCTS['lightning-pro'];
  }
  return null;
}

export function resolvePaidThemeProductByCode(productCode: string): PaidThemeProductConfig | null {
  if (productCode === WORLDCUP_PRODUCT_CODE) return PAID_THEME_PRODUCTS.worldcup;
  if (productCode === LIGHTNING_PRO_PRODUCT_CODE) return PAID_THEME_PRODUCTS['lightning-pro'];
  return null;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type UnlockStatus = 'LOCKED' | 'UNLOCKED';

export interface WorldCupPaymentRecord {
  order_id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  product_code: string;
  product_name: string;
  expected_amount: number;
  currency: string;
  cf_order_id: string | null;
  cf_payment_id: string | null;
  payment_status: PaymentStatus;
  cashfree_raw_status: string | null;
  unlock_status: UnlockStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorldCupUnlockRecord {
  customer_id: string;
  product_code: string;
  unlock_status: UnlockStatus;
  grant_source: 'cashfree' | 'admin_manual';
  order_id: string | null;
  cf_payment_id: string | null;
  unlocked_at: string;
  expires_at: string | null;
  granted_by: string | null;
  grant_reason: string | null;
  updated_at: string;
}

export interface PaymentAdminAuditLog {
  id: string;
  actor: string;
  action: 'MANUAL_GRANT' | 'MANUAL_REVOKE';
  customer_id: string;
  reason: string;
  ip_address: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  webhookSecret: string;
  apiVersion: string;
}

export function getCashfreeProductionConfig(): CashfreeConfig | null {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  if (!appId || !secretKey) return null;
  const webhookSecret = (process.env.CASHFREE_WEBHOOK_SECRET || '').trim() || secretKey;
  const apiVersion = (process.env.CASHFREE_API_VERSION || '').trim() || '2023-08-01';
  return { appId, secretKey, webhookSecret, apiVersion };
}

export function isCashfreeConfigured(): boolean {
  return getCashfreeProductionConfig() !== null;
}

export function sanitizeCustomerId(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 48);
}

export function sanitizeOrderId(raw: unknown): string {
  return String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 50);
}

export function generateUniqueCashfreeOrderId(themeId: PaidThemeId = 'worldcup'): string {
  const prefix = PAID_THEME_PRODUCTS[themeId]?.orderPrefix || 'WC';
  const ts = Date.now();
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Official Cashfree PG Webhook Signature Verification:
 * Base64(HMAC-SHA256(webhookTimestamp + rawRequestBody, webhookSecret))
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  webhookSecret: string
): boolean {
  if (!rawBody || !timestampHeader || !signatureHeader || !webhookSecret) {
    return false;
  }
  const timestamp = timestampHeader.trim();
  const providedSig = signatureHeader.trim();
  if (!timestamp || !providedSig) return false;

  const signedPayload = `${timestamp}${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('base64');

  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const providedBuf = Buffer.from(providedSig, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

// Authoritative server-side stores (backed by Supabase PostgreSQL when SUPABASE_SERVICE_ROLE_KEY is configured)
const paymentRecordsByOrderId = new Map<string, WorldCupPaymentRecord>();
const usedCfPaymentIds = new Map<string, string>(); // cf_payment_id -> order_id (unique constraint)
const unlockRecordsByCustomerProduct = new Map<string, WorldCupUnlockRecord>(); // `${customerId}::${productCode}`
const processedWebhookKeys = new Set<string>();
const adminAuditLogs: PaymentAdminAuditLog[] = [];

function unlockKey(customerId: string, productCode: string): string {
  return `${sanitizeCustomerId(customerId)}::${productCode}`;
}

// Per-order mutex to prevent concurrent verify + webhook race conditions
const orderLocks = new Map<string, Promise<void>>();

export async function withOrderLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
  const prev = orderLocks.get(orderId) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  orderLocks.set(orderId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (orderLocks.get(orderId) === next) {
      orderLocks.delete(orderId);
    }
  }
}

export function isUnlockRecordActive(record: WorldCupUnlockRecord | null | undefined): boolean {
  if (!record || record.unlock_status !== 'UNLOCKED') return false;
  if (!record.expires_at) return true;
  const expMs = Date.parse(record.expires_at);
  return Number.isFinite(expMs) && expMs > Date.now();
}

export async function persistPaymentRecord(
  supabaseAdmin: SupabaseClient | null,
  record: WorldCupPaymentRecord
): Promise<{ ok: boolean; duplicatePaymentId?: boolean }> {
  if (record.cf_payment_id) {
    const existingOwner = usedCfPaymentIds.get(record.cf_payment_id);
    if (existingOwner && existingOwner !== record.order_id) {
      return { ok: false, duplicatePaymentId: true };
    }
  }

  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('worldcup_payments')
        .upsert(record, { onConflict: 'order_id' });
      if (error) {
        if (error.code === '23505') {
          return { ok: false, duplicatePaymentId: true };
        }
        // Table may not yet be migrated in Supabase; continue updating server store below
      }
    } catch {
      // Table may not yet be migrated in Supabase; server-side store remains authoritative
    }
  }

  paymentRecordsByOrderId.set(record.order_id, record);
  if (record.cf_payment_id) {
    usedCfPaymentIds.set(record.cf_payment_id, record.order_id);
  }
  return { ok: true };
}

async function hasProcessedWebhookEvent(
  supabaseAdmin: SupabaseClient | null,
  eventKey: string
): Promise<boolean> {
  if (processedWebhookKeys.has(eventKey)) {
    return true;
  }
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('cashfree_webhook_events')
        .select('event_key')
        .eq('event_key', eventKey)
        .maybeSingle();
      if (!error && data) {
        processedWebhookKeys.add(eventKey);
        return true;
      }
    } catch {
      // Fallback to in-memory deduplication set if table not yet migrated
    }
  }
  return false;
}

async function markWebhookEventProcessed(
  supabaseAdmin: SupabaseClient | null,
  params: { eventKey: string; orderId: string; cfPaymentId: string | null; eventType: string }
): Promise<void> {
  processedWebhookKeys.add(params.eventKey);
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('cashfree_webhook_events').upsert(
      {
        event_key: params.eventKey,
        order_id: params.orderId,
        cf_payment_id: params.cfPaymentId,
        event_type: params.eventType || null,
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'event_key' }
    );
  } catch {
    // Fallback to in-memory set if table not yet migrated
  }
}

export async function getPaymentRecord(
  supabaseAdmin: SupabaseClient | null,
  orderId: string
): Promise<WorldCupPaymentRecord | null> {
  const cleanId = sanitizeOrderId(orderId);
  if (!cleanId) return null;

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('worldcup_payments')
        .select('*')
        .eq('order_id', cleanId)
        .maybeSingle();
      if (!error && data) {
        const rec = data as WorldCupPaymentRecord;
        paymentRecordsByOrderId.set(rec.order_id, rec);
        if (rec.cf_payment_id) {
          usedCfPaymentIds.set(rec.cf_payment_id, rec.order_id);
        }
        return rec;
      }
    } catch {
      // Fallback to server memory index
    }
  }
  return paymentRecordsByOrderId.get(cleanId) ?? null;
}

export async function isCfPaymentIdUsedByAnotherOrder(
  supabaseAdmin: SupabaseClient | null,
  cfPaymentId: string,
  currentOrderId: string
): Promise<boolean> {
  const existingLocal = usedCfPaymentIds.get(cfPaymentId);
  if (existingLocal && existingLocal !== currentOrderId) {
    return true;
  }
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('worldcup_payments')
        .select('order_id')
        .eq('cf_payment_id', cfPaymentId)
        .maybeSingle();
      if (!error && data && String(data.order_id) !== currentOrderId) {
        usedCfPaymentIds.set(cfPaymentId, String(data.order_id));
        return true;
      }
    } catch {
      // Ignore if table not yet migrated
    }
  }
  return false;
}

export async function persistUnlockRecord(
  supabaseAdmin: SupabaseClient | null,
  record: WorldCupUnlockRecord
): Promise<void> {
  const productCode = record.product_code || WORLDCUP_PRODUCT_CODE;
  const normalized: WorldCupUnlockRecord = {
    ...record,
    customer_id: sanitizeCustomerId(record.customer_id),
    product_code: productCode,
  };
  unlockRecordsByCustomerProduct.set(unlockKey(normalized.customer_id, productCode), normalized);
  if (!supabaseAdmin) return;
  try {
    const { error } = await supabaseAdmin
      .from('worldcup_unlocks')
      .upsert(normalized, { onConflict: 'customer_id,product_code' });
    if (error && productCode === WORLDCUP_PRODUCT_CODE) {
      // Legacy fallback if composite PK migration has not yet been applied
      await supabaseAdmin
        .from('worldcup_unlocks')
        .upsert(normalized, { onConflict: 'customer_id' });
    }
  } catch {
    // Ignore if table not yet migrated
  }
}

export async function getUnlockRecord(
  supabaseAdmin: SupabaseClient | null,
  customerId: string,
  productCode: string = WORLDCUP_PRODUCT_CODE
): Promise<WorldCupUnlockRecord | null> {
  const cleanId = sanitizeCustomerId(customerId);
  if (!cleanId) return null;

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('worldcup_unlocks')
        .select('*')
        .eq('customer_id', cleanId)
        .eq('product_code', productCode)
        .maybeSingle();
      if (!error && data) {
        const rec = data as WorldCupUnlockRecord;
        unlockRecordsByCustomerProduct.set(unlockKey(rec.customer_id, rec.product_code || productCode), rec);
        return rec;
      }
    } catch {
      // Fallback to server memory index
    }
  }
  return unlockRecordsByCustomerProduct.get(unlockKey(cleanId, productCode)) ?? null;
}

export async function getCustomerThemeEntitlements(
  supabaseAdmin: SupabaseClient | null,
  customerId: string
): Promise<{
  unlockedThemes: Record<PaidThemeId, boolean>;
  records: Record<PaidThemeId, WorldCupUnlockRecord | null>;
}> {
  const [wcRec, lpRec] = await Promise.all([
    getUnlockRecord(supabaseAdmin, customerId, WORLDCUP_PRODUCT_CODE),
    getUnlockRecord(supabaseAdmin, customerId, LIGHTNING_PRO_PRODUCT_CODE),
  ]);
  return {
    unlockedThemes: {
      worldcup: isUnlockRecordActive(wcRec),
      'lightning-pro': isUnlockRecordActive(lpRec),
    },
    records: {
      worldcup: wcRec,
      'lightning-pro': lpRec,
    },
  };
}

export async function recordAdminAuditLog(
  supabaseAdmin: SupabaseClient | null,
  entry: Omit<PaymentAdminAuditLog, 'id' | 'created_at'>
): Promise<PaymentAdminAuditLog> {
  const fullEntry: PaymentAdminAuditLog = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  adminAuditLogs.unshift(fullEntry);
  if (adminAuditLogs.length > 500) {
    adminAuditLogs.length = 500;
  }
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('payment_admin_audit_logs').insert(fullEntry);
    } catch {
      // Ignore if table not yet migrated
    }
  }
  return fullEntry;
}

export async function listAllPaymentRecords(
  supabaseAdmin: SupabaseClient | null
): Promise<WorldCupPaymentRecord[]> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('worldcup_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && Array.isArray(data)) {
        for (const row of data as WorldCupPaymentRecord[]) {
          paymentRecordsByOrderId.set(row.order_id, row);
          if (row.cf_payment_id) {
            usedCfPaymentIds.set(row.cf_payment_id, row.order_id);
          }
        }
        return data as WorldCupPaymentRecord[];
      }
    } catch {
      // Fallback to memory index
    }
  }
  return Array.from(paymentRecordsByOrderId.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export async function listAllUnlockRecords(
  supabaseAdmin: SupabaseClient | null
): Promise<WorldCupUnlockRecord[]> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('worldcup_unlocks')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (!error && Array.isArray(data)) {
        for (const row of data as WorldCupUnlockRecord[]) {
          unlockRecordsByCustomerProduct.set(
            unlockKey(row.customer_id, row.product_code || WORLDCUP_PRODUCT_CODE),
            row
          );
        }
        return data as WorldCupUnlockRecord[];
      }
    } catch {
      // Fallback to memory index
    }
  }
  return Array.from(unlockRecordsByCustomerProduct.values()).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

export async function listAdminAuditLogs(
  supabaseAdmin: SupabaseClient | null
): Promise<PaymentAdminAuditLog[]> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && Array.isArray(data)) {
        return data as PaymentAdminAuditLog[];
      }
    } catch {
      // Fallback to memory index
    }
  }
  return [...adminAuditLogs];
}

// ===========================================================================
// CASHFREE PRODUCTION REST API CALLS (https://api.cashfree.com/pg ONLY)
// ===========================================================================

export interface CashfreeCreateOrderResult {
  ok: boolean;
  cfOrderId?: string;
  paymentSessionId?: string;
  orderStatus?: string;
  error?: string;
  httpStatus?: number;
}

export async function createCashfreeProductionOrder(params: {
  config: CashfreeConfig;
  product?: PaidThemeProductConfig;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl?: string;
}): Promise<CashfreeCreateOrderResult> {
  const {
    config,
    product = PAID_THEME_PRODUCTS.worldcup,
    orderId,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    returnUrl,
    notifyUrl,
  } = params;

  const safePhone = customerPhone.replace(/\D/g, '').slice(-10);
  const resolvedPhone = safePhone.length === 10 ? safePhone : '9890175727';
  const resolvedEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ? customerEmail
    : 'customer@starevent.live';

  const orderMeta: Record<string, string> = {
    return_url: returnUrl,
  };
  if (notifyUrl && notifyUrl.startsWith('https://')) {
    orderMeta.notify_url = notifyUrl;
  }

  const payload = {
    order_id: orderId,
    order_amount: product.amountInr,
    order_currency: product.currency,
    customer_details: {
      customer_id: customerId,
      customer_name: customerName.slice(0, 80) || customerId,
      customer_email: resolvedEmail,
      customer_phone: resolvedPhone,
    },
    order_meta: orderMeta,
    order_note: `${product.productName} Unlock (${customerId})`,
  };

  const response = await fetch(`${CASHFREE_PRODUCTION_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-client-id': config.appId,
      'x-client-secret': config.secretKey,
      'x-api-version': config.apiVersion,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof body.payment_session_id !== 'string') {
    return {
      ok: false,
      httpStatus: response.status,
      error:
        typeof body.message === 'string'
          ? body.message
          : 'Cashfree rejected order creation. Please verify Production API keys.',
    };
  }

  return {
    ok: true,
    cfOrderId: typeof body.cf_order_id === 'string' || typeof body.cf_order_id === 'number'
      ? String(body.cf_order_id)
      : undefined,
    paymentSessionId: body.payment_session_id,
    orderStatus: typeof body.order_status === 'string' ? body.order_status : 'ACTIVE',
  };
}

export interface CashfreePaymentItem {
  cf_payment_id?: string | number;
  order_id?: string;
  payment_status?: string;
  payment_amount?: number;
  order_amount?: number;
  payment_currency?: string;
  payment_time?: string;
  payment_message?: string;
}

export interface CashfreeOrderDetails {
  order_id?: string;
  cf_order_id?: string | number;
  order_amount?: number;
  order_currency?: string;
  order_status?: string;
  customer_details?: {
    customer_id?: string;
  };
}

export interface ServerVerificationOutcome {
  verified: boolean;
  unlocked: boolean;
  paymentStatus: PaymentStatus;
  cfPaymentId: string | null;
  reason: string;
  record: WorldCupPaymentRecord;
}

/**
 * Fetches authoritative order + payments directly from Cashfree Production API
 * and validates ALL required conditions before updating database and unlocking.
 */
export async function verifyOrderDirectlyWithCashfree(params: {
  supabaseAdmin: SupabaseClient | null;
  config: CashfreeConfig;
  orderId: string;
  expectedCustomerId: string;
}): Promise<ServerVerificationOutcome | { notFound: true; reason: string }> {
  const { supabaseAdmin, config, orderId, expectedCustomerId } = params;

  return withOrderLock(orderId, async () => {
    const existing = await getPaymentRecord(supabaseAdmin, orderId);
    if (!existing) {
      return { notFound: true as const, reason: 'Payment order not found.' };
    }

    // Strict customer ownership enforcement
    if (existing.customer_id !== expectedCustomerId) {
      return {
        notFound: true as const,
        reason: 'This order does not belong to the currently signed-in customer.',
      };
    }

    // Already verified & paid -> idempotent return
    if (existing.payment_status === 'PAID' && existing.unlock_status === 'UNLOCKED') {
      const unlockRec = await getUnlockRecord(
        supabaseAdmin,
        existing.customer_id,
        existing.product_code || WORLDCUP_PRODUCT_CODE
      );
      if (isUnlockRecordActive(unlockRec)) {
        return {
          verified: true,
          unlocked: true,
          paymentStatus: 'PAID' as const,
          cfPaymentId: existing.cf_payment_id,
          reason: 'Payment already verified.',
          record: existing,
        };
      }
    }

    const headers = {
      Accept: 'application/json',
      'x-client-id': config.appId,
      'x-client-secret': config.secretKey,
      'x-api-version': config.apiVersion,
    };

    const [orderRes, paymentsRes] = await Promise.all([
      fetch(`${CASHFREE_PRODUCTION_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers,
      }),
      fetch(`${CASHFREE_PRODUCTION_BASE_URL}/orders/${encodeURIComponent(orderId)}/payments`, {
        method: 'GET',
        headers,
      }),
    ]);

    if (!orderRes.ok || !paymentsRes.ok) {
      return {
        verified: false,
        unlocked: false,
        paymentStatus: existing.payment_status,
        cfPaymentId: existing.cf_payment_id,
        reason: 'Could not verify payment with Cashfree Production API right now.',
        record: existing,
      };
    }

    const cfOrder = (await orderRes.json().catch(() => ({}))) as CashfreeOrderDetails;
    const cfPaymentsRaw = (await paymentsRes.json().catch(() => [])) as unknown;
    const cfPayments: CashfreePaymentItem[] = Array.isArray(cfPaymentsRaw)
      ? (cfPaymentsRaw as CashfreePaymentItem[])
      : [];

    return evaluateAndPersistCashfreeVerification({
      supabaseAdmin,
      existing,
      cfOrder,
      cfPayments,
    });
  });
}

export async function evaluateAndPersistCashfreeVerification(params: {
  supabaseAdmin: SupabaseClient | null;
  existing: WorldCupPaymentRecord;
  cfOrder: CashfreeOrderDetails | null;
  cfPayments: CashfreePaymentItem[];
}): Promise<ServerVerificationOutcome> {
  const { supabaseAdmin, existing, cfOrder, cfPayments } = params;
  const nowIso = new Date().toISOString();

  // Strictly resolve authoritative server catalog price for this product
  const catalogProduct = resolvePaidThemeProductByCode(
    existing.product_code || WORLDCUP_PRODUCT_CODE
  );
  if (
    !catalogProduct ||
    Math.round(Number(existing.expected_amount) * 100) !== catalogProduct.amountInr * 100
  ) {
    return {
      verified: false,
      unlocked: false,
      paymentStatus: 'FAILED',
      cfPaymentId: null,
      reason: 'Order does not match an authorized server product price.',
      record: existing,
    };
  }

  const expectedAmountInr = catalogProduct.amountInr;
  const expectedCurrency = catalogProduct.currency;

  // Check order ID, amount, currency, and customer ownership on Cashfree order object
  if (cfOrder) {
    if (cfOrder.order_id && cfOrder.order_id !== existing.order_id) {
      return {
        verified: false,
        unlocked: false,
        paymentStatus: 'FAILED',
        cfPaymentId: null,
        reason: 'Order ID mismatch from Cashfree.',
        record: existing,
      };
    }
    if (
      typeof cfOrder.order_amount === 'number' &&
      Math.round(cfOrder.order_amount * 100) !== expectedAmountInr * 100
    ) {
      const updated: WorldCupPaymentRecord = {
        ...existing,
        payment_status: 'FAILED',
        cashfree_raw_status: 'AMOUNT_MISMATCH',
        unlock_status: 'LOCKED',
        updated_at: nowIso,
      };
      await persistPaymentRecord(supabaseAdmin, updated);
      return {
        verified: false,
        unlocked: false,
        paymentStatus: 'FAILED',
        cfPaymentId: null,
        reason: `Expected ₹${expectedAmountInr} ${expectedCurrency}, received mismatched order amount.`,
        record: updated,
      };
    }
    if (
      cfOrder.order_currency &&
      cfOrder.order_currency.toUpperCase() !== expectedCurrency
    ) {
      const updated: WorldCupPaymentRecord = {
        ...existing,
        payment_status: 'FAILED',
        cashfree_raw_status: 'CURRENCY_MISMATCH',
        unlock_status: 'LOCKED',
        updated_at: nowIso,
      };
      await persistPaymentRecord(supabaseAdmin, updated);
      return {
        verified: false,
        unlocked: false,
        paymentStatus: 'FAILED',
        cfPaymentId: null,
        reason: `Currency mismatch (expected ${expectedCurrency}).`,
        record: updated,
      };
    }
    if (
      cfOrder.customer_details?.customer_id &&
      sanitizeCustomerId(cfOrder.customer_details.customer_id) !== existing.customer_id
    ) {
      return {
        verified: false,
        unlocked: false,
        paymentStatus: 'FAILED',
        cfPaymentId: null,
        reason: 'Order customer mismatch.',
        record: existing,
      };
    }
  }

  // Locate a strictly valid SUCCESS payment matching exact catalog amount & currency
  const successPayment = cfPayments.find((p) => {
    const status = String(p.payment_status || '').toUpperCase();
    const pid =
      p.cf_payment_id !== undefined && p.cf_payment_id !== null
        ? String(p.cf_payment_id).trim()
        : '';
    const pOrderId = String(p.order_id || '').trim();
    const pAmount = Number(p.payment_amount ?? p.order_amount ?? 0);
    const pCurrency = String(p.payment_currency || '').toUpperCase();

    return (
      status === 'SUCCESS' &&
      pid.length > 0 &&
      pOrderId === existing.order_id &&
      Math.round(pAmount * 100) === expectedAmountInr * 100 &&
      pCurrency === expectedCurrency
    );
  });

  if (successPayment && successPayment.cf_payment_id !== undefined) {
    const cfPaymentId = String(successPayment.cf_payment_id).trim();

    // Prevent reused payment ID across orders
    const reused = await isCfPaymentIdUsedByAnotherOrder(
      supabaseAdmin,
      cfPaymentId,
      existing.order_id
    );
    if (reused) {
      const updated: WorldCupPaymentRecord = {
        ...existing,
        payment_status: 'FAILED',
        cashfree_raw_status: 'DUPLICATE_PAYMENT_ID_REJECTED',
        unlock_status: 'LOCKED',
        updated_at: nowIso,
      };
      await persistPaymentRecord(supabaseAdmin, updated);
      return {
        verified: false,
        unlocked: false,
        paymentStatus: 'FAILED',
        cfPaymentId: null,
        reason: 'Payment ID was already used for another order.',
        record: updated,
      };
    }

    // All conditions verified -> atomically mark PAID & UNLOCKED (using DB transaction RPC when available)
    const paidRecord: WorldCupPaymentRecord = {
      ...existing,
      cf_order_id:
        cfOrder?.cf_order_id !== undefined ? String(cfOrder.cf_order_id) : existing.cf_order_id,
      cf_payment_id: cfPaymentId,
      payment_status: 'PAID',
      cashfree_raw_status: 'SUCCESS',
      unlock_status: 'UNLOCKED',
      verified_at: nowIso,
      updated_at: nowIso,
    };

    const unlockRecord: WorldCupUnlockRecord = {
      customer_id: existing.customer_id,
      product_code: catalogProduct.productCode,
      unlock_status: 'UNLOCKED',
      grant_source: 'cashfree',
      order_id: existing.order_id,
      cf_payment_id: cfPaymentId,
      unlocked_at: nowIso,
      expires_at: null,
      granted_by: null,
      grant_reason: null,
      updated_at: nowIso,
    };

    let committedViaRpc = false;
    if (supabaseAdmin) {
      try {
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
          'complete_worldcup_payment_tx',
          {
            p_order_id: existing.order_id,
            p_customer_id: existing.customer_id,
            p_cf_order_id: paidRecord.cf_order_id,
            p_cf_payment_id: cfPaymentId,
            p_verified_at: nowIso,
          }
        );
        if (!rpcError && rpcData && typeof rpcData === 'object') {
          const resObj = rpcData as { ok?: boolean; code?: string; message?: string };
          if (resObj.ok === false) {
            const rejected: WorldCupPaymentRecord = {
              ...existing,
              payment_status: 'FAILED',
              cashfree_raw_status: resObj.code || 'TX_REJECTED',
              unlock_status: 'LOCKED',
              updated_at: nowIso,
            };
            paymentRecordsByOrderId.set(rejected.order_id, rejected);
            return {
              verified: false,
              unlocked: false,
              paymentStatus: 'FAILED',
              cfPaymentId: null,
              reason: resObj.message || 'Payment verification rejected by database constraints.',
              record: rejected,
            };
          }
          committedViaRpc = true;
          paymentRecordsByOrderId.set(paidRecord.order_id, paidRecord);
          usedCfPaymentIds.set(cfPaymentId, paidRecord.order_id);
          unlockRecordsByCustomerProduct.set(
            unlockKey(unlockRecord.customer_id, unlockRecord.product_code),
            unlockRecord
          );
        }
      } catch {
        // Fall through to checked upsert fallback when RPC is not yet migrated
      }
    }

    if (!committedViaRpc) {
      const persisted = await persistPaymentRecord(supabaseAdmin, paidRecord);
      if (!persisted.ok && persisted.duplicatePaymentId) {
        const duplicateRejected: WorldCupPaymentRecord = {
          ...existing,
          payment_status: 'FAILED',
          cashfree_raw_status: 'DUPLICATE_PAYMENT_ID_REJECTED',
          unlock_status: 'LOCKED',
          updated_at: nowIso,
        };
        await persistPaymentRecord(supabaseAdmin, duplicateRejected);
        return {
          verified: false,
          unlocked: false,
          paymentStatus: 'FAILED',
          cfPaymentId: null,
          reason: 'Payment ID was already used for another order.',
          record: duplicateRejected,
        };
      }
      await persistUnlockRecord(supabaseAdmin, unlockRecord);
    }

    return {
      verified: true,
      unlocked: true,
      paymentStatus: 'PAID',
      cfPaymentId,
      reason: `Cashfree payment verified successfully. ${catalogProduct.productName} unlocked.`,
      record: paidRecord,
    };
  }

  // Check if payment was attempted with wrong amount / wrong currency / failed / cancelled / pending
  const latestAttempt = cfPayments[0];
  const rawStatus = String(
    latestAttempt?.payment_status || cfOrder?.order_status || 'PENDING'
  ).toUpperCase();

  let mappedStatus: PaymentStatus = 'PENDING';
  let reason = 'Payment is still pending confirmation from Cashfree.';

  if (rawStatus === 'SUCCESS') {
    // Reached here only if SUCCESS had wrong amount, wrong currency, or mismatched order ID
    mappedStatus = 'FAILED';
    reason = `Payment failed validation (must be exactly ₹${expectedAmountInr} ${expectedCurrency} for this order).`;
  } else if (rawStatus === 'FAILED' || rawStatus === 'FLAGGED') {
    mappedStatus = 'FAILED';
    reason = latestAttempt?.payment_message || 'Payment failed on Cashfree.';
  } else if (
    rawStatus === 'USER_DROPPED' ||
    rawStatus === 'CANCELLED' ||
    rawStatus === 'EXPIRED' ||
    rawStatus === 'VOID'
  ) {
    mappedStatus = 'CANCELLED';
    reason = 'Payment was cancelled or abandoned before completion.';
  }

  const updatedRecord: WorldCupPaymentRecord = {
    ...existing,
    cf_payment_id:
      latestAttempt?.cf_payment_id !== undefined && mappedStatus !== 'PENDING'
        ? existing.cf_payment_id
        : existing.cf_payment_id,
    payment_status: mappedStatus,
    cashfree_raw_status: rawStatus,
    unlock_status: 'LOCKED',
    updated_at: nowIso,
  };
  await persistPaymentRecord(supabaseAdmin, updatedRecord);

  return {
    verified: false,
    unlocked: false,
    paymentStatus: mappedStatus,
    cfPaymentId: null,
    reason,
    record: updatedRecord,
  };
}

/**
 * Processes a signature-verified Cashfree webhook payload with strict deduplication.
 */
export async function processVerifiedCashfreeWebhook(params: {
  supabaseAdmin: SupabaseClient | null;
  eventPayload: Record<string, unknown>;
  webhookTimestamp: string;
}): Promise<{ ok: boolean; duplicate?: boolean; unlocked?: boolean; message: string }> {
  const { supabaseAdmin, eventPayload, webhookTimestamp } = params;

  const eventType = String(eventPayload.type || '').toUpperCase();
  const dataObj = (eventPayload.data && typeof eventPayload.data === 'object'
    ? eventPayload.data
    : {}) as Record<string, unknown>;

  const orderObj = (dataObj.order && typeof dataObj.order === 'object'
    ? dataObj.order
    : {}) as Record<string, unknown>;
  const paymentObj = (dataObj.payment && typeof dataObj.payment === 'object'
    ? dataObj.payment
    : {}) as Record<string, unknown>;
  const customerObj = (dataObj.customer_details && typeof dataObj.customer_details === 'object'
    ? dataObj.customer_details
    : {}) as Record<string, unknown>;

  const orderId = sanitizeOrderId(orderObj.order_id || paymentObj.order_id);
  const cfPaymentId =
    paymentObj.cf_payment_id !== undefined && paymentObj.cf_payment_id !== null
      ? String(paymentObj.cf_payment_id).trim()
      : '';
  const paymentStatusRaw = String(paymentObj.payment_status || '').toUpperCase();
  const paymentAmount = Number(paymentObj.payment_amount ?? orderObj.order_amount ?? 0);
  const orderAmount = Number(orderObj.order_amount ?? paymentAmount);
  const currency = String(
    paymentObj.payment_currency || orderObj.order_currency || ''
  ).toUpperCase();

  if (!orderId) {
    return { ok: false, message: 'Webhook missing order_id.' };
  }

  const dedupeKey = `${eventType}:${orderId}:${cfPaymentId || 'none'}:${paymentStatusRaw}:${webhookTimestamp}`;
  if (await hasProcessedWebhookEvent(supabaseAdmin, dedupeKey)) {
    return { ok: true, duplicate: true, message: 'Duplicate webhook ignored.' };
  }

  return withOrderLock(orderId, async () => {
    const existing = await getPaymentRecord(supabaseAdmin, orderId);
    if (!existing) {
      return { ok: false, message: `Unknown order_id ${orderId}.` };
    }

    // Already processed & paid -> idempotent no-op
    if (existing.payment_status === 'PAID' && existing.unlock_status === 'UNLOCKED') {
      await markWebhookEventProcessed(supabaseAdmin, {
        eventKey: dedupeKey,
        orderId,
        cfPaymentId: cfPaymentId || null,
        eventType,
      });
      return { ok: true, duplicate: true, unlocked: true, message: 'Order already paid.' };
    }

    const isSuccessEvent =
      paymentStatusRaw === 'SUCCESS' &&
      (!eventType || eventType === 'PAYMENT_SUCCESS_WEBHOOK');

    const cfOrder: CashfreeOrderDetails = {
      order_id: orderId,
      order_amount: Number.isFinite(orderAmount) ? orderAmount : undefined,
      order_currency: currency || undefined,
      order_status: isSuccessEvent ? 'PAID' : 'ACTIVE',
      customer_details: {
        customer_id:
          typeof customerObj.customer_id === 'string' ? customerObj.customer_id : undefined,
      },
    };

    const cfPayments: CashfreePaymentItem[] = [
      {
        cf_payment_id: cfPaymentId || undefined,
        order_id: orderId,
        payment_status: isSuccessEvent
          ? 'SUCCESS'
          : eventType === 'PAYMENT_USER_DROPPED_WEBHOOK'
            ? 'USER_DROPPED'
            : paymentStatusRaw === 'SUCCESS'
              ? 'FAILED'
              : paymentStatusRaw || 'FAILED',
        payment_amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
        order_amount: Number.isFinite(orderAmount) ? orderAmount : 0,
        payment_currency: currency,
        payment_message:
          typeof paymentObj.payment_message === 'string'
            ? paymentObj.payment_message
            : undefined,
      },
    ];

    const outcome = await evaluateAndPersistCashfreeVerification({
      supabaseAdmin,
      existing,
      cfOrder,
      cfPayments,
    });

    await markWebhookEventProcessed(supabaseAdmin, {
      eventKey: dedupeKey,
      orderId,
      cfPaymentId: cfPaymentId || null,
      eventType,
    });
    return {
      ok: true,
      unlocked: outcome.unlocked,
      message: outcome.reason,
    };
  });
}

// ===========================================================================
// OWNER DIRECT UPI QR PAYMENT FLOW (crushyyphotography@oksbi)
//   - Generates dynamic amount-locked UPI QR codes on the server.
//   - Customer UTR submission NEVER unlocks automatically (status stays PENDING/LOCKED).
//   - Strictly enforces 12-digit UTR format & global uniqueness (no UTR reuse).
//   - Unlocks ONLY when authenticated Owner Admin approves after checking bank/GPay receipt.
// ===========================================================================

export function generateUniqueUpiQrOrderId(themeId: PaidThemeId = 'worldcup'): string {
  const prefix = PAID_THEME_PRODUCTS[themeId]?.orderPrefix || 'WC';
  const ts = Date.now();
  const rand = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `UPI_${prefix}_${ts}_${rand}`;
}

export function sanitizeUpiUtr(raw: unknown): string | null {
  const digits = String(raw || '')
    .trim()
    .replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(digits)) {
    return null;
  }
  return digits;
}

export async function buildOwnerUpiPaymentIntent(params: {
  orderId: string;
  product: PaidThemeProductConfig;
}): Promise<{
  upiId: string;
  payeeName: string;
  upiUri: string;
  qrDataUrl: string;
  staticQrImageUrl: string;
}> {
  const { orderId, product } = params;
  const note = `${product.orderPrefix} ${orderId.slice(-8)}`;
  const upiParams = new URLSearchParams({
    pa: OWNER_UPI_ID,
    pn: OWNER_UPI_PAYEE_NAME,
    am: product.amountInr.toFixed(2),
    cu: product.currency,
    tr: orderId,
    tn: note,
  });
  const upiUri = `upi://pay?${upiParams.toString()}`;
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  return {
    upiId: OWNER_UPI_ID,
    payeeName: OWNER_UPI_PAYEE_NAME,
    upiUri,
    qrDataUrl,
    staticQrImageUrl: OWNER_UPI_STATIC_QR_IMAGE,
  };
}

export async function submitUpiQrUtrProof(params: {
  supabaseAdmin: SupabaseClient | null;
  orderId: string;
  customerId: string;
  utrRaw: unknown;
}): Promise<
  | {
      ok: true;
      unlocked: boolean;
      paymentStatus: PaymentStatus;
      orderId: string;
      utr: string;
      message: string;
    }
  | { ok: false; status: number; error: string }
> {
  const cleanOrderId = sanitizeOrderId(params.orderId);
  if (!cleanOrderId) {
    return { ok: false, status: 400, error: 'A valid UPI QR Order ID is required.' };
  }

  const utr = sanitizeUpiUtr(params.utrRaw);
  if (!utr) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter a valid 12-digit numeric UPI UTR / Reference Number.',
    };
  }

  return withOrderLock(cleanOrderId, async () => {
    const existing = await getPaymentRecord(params.supabaseAdmin, cleanOrderId);
    if (!existing) {
      return { ok: false, status: 404, error: 'UPI QR order not found on server.' };
    }

    if (sanitizeCustomerId(existing.customer_id) !== sanitizeCustomerId(params.customerId)) {
      return {
        ok: false,
        status: 403,
        error: 'This UPI QR order does not belong to the currently logged-in customer.',
      };
    }

    if (!existing.order_id.startsWith('UPI_')) {
      return {
        ok: false,
        status: 400,
        error: 'Manual UTR proof is only accepted for Owner UPI QR orders.',
      };
    }

    if (existing.payment_status === 'PAID' && existing.unlock_status === 'UNLOCKED') {
      return {
        ok: true,
        unlocked: true,
        paymentStatus: 'PAID',
        orderId: existing.order_id,
        utr,
        message: 'Payment has already been verified and unlocked by the owner.',
      };
    }

    if (existing.payment_status === 'FAILED' || existing.payment_status === 'CANCELLED') {
      return {
        ok: false,
        status: 400,
        error: 'This order was rejected or cancelled. Please generate a fresh QR order.',
      };
    }

    const uniqueRefKey = `UPI_UTR_${utr}`;
    const alreadyUsed = await isCfPaymentIdUsedByAnotherOrder(
      params.supabaseAdmin,
      uniqueRefKey,
      existing.order_id
    );
    if (alreadyUsed) {
      return {
        ok: false,
        status: 409,
        error:
          'This 12-digit UTR number has already been submitted on another order. Reused UTR numbers are blocked.',
      };
    }

    const nowIso = new Date().toISOString();
    const pendingRecord: WorldCupPaymentRecord = {
      ...existing,
      cf_payment_id: uniqueRefKey,
      payment_status: 'PENDING',
      cashfree_raw_status: 'UPI_QR_PROOF_SUBMITTED',
      unlock_status: 'LOCKED', // STRICT SECURITY: Never auto-unlock on customer UTR input
      verified_at: null,
      updated_at: nowIso,
    };

    const persisted = await persistPaymentRecord(params.supabaseAdmin, pendingRecord);
    if (!persisted.ok && persisted.duplicatePaymentId) {
      return {
        ok: false,
        status: 409,
        error: 'Duplicate UTR detected and blocked by database uniqueness check.',
      };
    }

    return {
      ok: true,
      unlocked: false,
      paymentStatus: 'PENDING',
      orderId: existing.order_id,
      utr,
      message:
        'UTR submitted! Payment is pending owner verification on Crushyyphotography UPI. Your theme will unlock automatically once confirmed.',
    };
  });
}

export async function adminApproveUpiQrPayment(params: {
  supabaseAdmin: SupabaseClient | null;
  orderId: string;
  actor: string;
  ipAddress: string;
  note?: string;
}): Promise<
  | {
      ok: true;
      payment: WorldCupPaymentRecord;
      unlock: WorldCupUnlockRecord;
      auditLog: PaymentAdminAuditLog;
    }
  | { ok: false; status: number; error: string }
> {
  const cleanOrderId = sanitizeOrderId(params.orderId);
  if (!cleanOrderId) {
    return { ok: false, status: 400, error: 'Valid Order ID is required.' };
  }

  return withOrderLock(cleanOrderId, async () => {
    const existing = await getPaymentRecord(params.supabaseAdmin, cleanOrderId);
    if (!existing) {
      return { ok: false, status: 404, error: 'Payment order not found.' };
    }

    const product = resolvePaidThemeProductByCode(existing.product_code);
    if (!product || Math.abs(Number(existing.expected_amount) - product.amountInr) > 0.001) {
      return {
        ok: false,
        status: 400,
        error: 'Order product or amount does not match server catalog pricing.',
      };
    }

    const nowIso = new Date().toISOString();
    const reasonText =
      (params.note || '').trim().slice(0, 220) ||
      `Owner verified ₹${product.amountInr} UPI QR payment (${existing.cf_payment_id || existing.order_id})`;

    const paidRecord: WorldCupPaymentRecord = {
      ...existing,
      payment_status: 'PAID',
      cashfree_raw_status: 'UPI_QR_OWNER_APPROVED',
      unlock_status: 'UNLOCKED',
      verified_at: nowIso,
      updated_at: nowIso,
    };

    const unlockRecord: WorldCupUnlockRecord = {
      customer_id: existing.customer_id,
      product_code: product.productCode,
      unlock_status: 'UNLOCKED',
      grant_source: 'admin_manual',
      order_id: existing.order_id,
      cf_payment_id: existing.cf_payment_id,
      unlocked_at: nowIso,
      expires_at: null,
      granted_by: params.actor,
      grant_reason: reasonText,
      updated_at: nowIso,
    };

    await persistPaymentRecord(params.supabaseAdmin, paidRecord);
    await persistUnlockRecord(params.supabaseAdmin, unlockRecord);

    const auditLog = await recordAdminAuditLog(params.supabaseAdmin, {
      actor: params.actor,
      action: 'MANUAL_GRANT',
      customer_id: existing.customer_id,
      reason: reasonText,
      ip_address: params.ipAddress,
      metadata: {
        flow: 'upi_qr_owner_approve',
        order_id: existing.order_id,
        utr_ref: existing.cf_payment_id,
        theme_id: product.themeId,
        product_code: product.productCode,
        amount_inr: product.amountInr,
      },
    });

    return { ok: true, payment: paidRecord, unlock: unlockRecord, auditLog };
  });
}

export async function adminRejectUpiQrPayment(params: {
  supabaseAdmin: SupabaseClient | null;
  orderId: string;
  actor: string;
  ipAddress: string;
  reason?: string;
}): Promise<
  | { ok: true; payment: WorldCupPaymentRecord; auditLog: PaymentAdminAuditLog }
  | { ok: false; status: number; error: string }
> {
  const cleanOrderId = sanitizeOrderId(params.orderId);
  if (!cleanOrderId) {
    return { ok: false, status: 400, error: 'Valid Order ID is required.' };
  }

  return withOrderLock(cleanOrderId, async () => {
    const existing = await getPaymentRecord(params.supabaseAdmin, cleanOrderId);
    if (!existing) {
      return { ok: false, status: 404, error: 'Payment order not found.' };
    }

    const nowIso = new Date().toISOString();
    const reasonText =
      (params.reason || '').trim().slice(0, 220) ||
      `Owner rejected UPI QR order ${existing.order_id} (payment not received / invalid UTR)`;

    const rejectedRecord: WorldCupPaymentRecord = {
      ...existing,
      payment_status: 'FAILED',
      cashfree_raw_status: 'UPI_QR_OWNER_REJECTED',
      unlock_status: 'LOCKED',
      verified_at: null,
      updated_at: nowIso,
    };

    await persistPaymentRecord(params.supabaseAdmin, rejectedRecord);

    const auditLog = await recordAdminAuditLog(params.supabaseAdmin, {
      actor: params.actor,
      action: 'MANUAL_REVOKE',
      customer_id: existing.customer_id,
      reason: reasonText,
      ip_address: params.ipAddress,
      metadata: {
        flow: 'upi_qr_owner_reject',
        order_id: existing.order_id,
        utr_ref: existing.cf_payment_id,
        product_code: existing.product_code,
      },
    });

    return { ok: true, payment: rejectedRecord, auditLog };
  });
}

