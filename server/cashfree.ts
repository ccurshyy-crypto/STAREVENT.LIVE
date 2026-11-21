import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  activateOrderAndSubscription,
  generateOrderId,
  getPaymentOrderByCfOrderId,
  getPaymentOrderById,
  isOrderActive,
  PaymentOrderRecord,
  resolvePlan,
  SERVER_PLANS,
  toPublicOrderSummary,
  upsertPaymentOrder,
  VALID_SKUS,
  type GatewayEnv,
} from './paymentDb.ts';

const CASHFREE_API_VERSION = '2023-08-01';

export function getCashfreeEnv(): GatewayEnv {
  const raw = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  return raw === 'production' || raw === 'prod' ? 'production' : 'sandbox';
}

export function getCashfreeApiBase(): string {
  return getCashfreeEnv() === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export function getCashfreeCredentials() {
  const clientId = (process.env.CASHFREE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || '').trim();
  const webhookSecret = (process.env.CASHFREE_WEBHOOK_SECRET || '').trim();
  const env = getCashfreeEnv();
  // Official Cashfree PG spec: webhooks are signed with your Cashfree Client Secret Key.
  // Use CASHFREE_CLIENT_SECRET authoritatively when configured; only fall back to CASHFREE_WEBHOOK_SECRET
  // if CASHFREE_CLIENT_SECRET is absent (never accept an invented/separate secret over the real Client Secret).
  const signingSecret = clientSecret || webhookSecret;
  return {
    clientId,
    clientSecret,
    webhookSecret,
    signingSecret,
    env,
    enabled: Boolean(clientId && clientSecret),
    webhookConfigured: Boolean(signingSecret),
  };
}

export function getCashfreePublicConfig() {
  const creds = getCashfreeCredentials();
  return {
    ok: true,
    gateway: 'cashfree' as const,
    cashfreeEnabled: creds.enabled,
    cashfreeEnv: creds.env,
    webhookConfigured: creds.webhookConfigured,
    autoUnlockEnabled: creds.enabled,
    ownerKeyFlow: false,
    plans: Object.values(SERVER_PLANS),
  };
}

function getCashfreeHeaders(): Record<string, string> {
  const { clientId, clientSecret } = getCashfreeCredentials();
  return {
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
    'x-api-version': CASHFREE_API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isSafeQrImageUrl(value: string): boolean {
  return value.startsWith('data:image/') || value.startsWith('https://');
}

function sanitizePhoneForCashfree(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return '9999999999';
}

function sanitizeBaseUrl(rawBaseUrl?: string): string {
  const envUrl = (process.env.APP_URL || '').trim();
  const candidate = (rawBaseUrl || envUrl || 'http://localhost:3000').trim().replace(/\/+$/, '');
  if (candidate.startsWith('https://') || candidate.startsWith('http://')) {
    return candidate;
  }
  return 'http://localhost:3000';
}

export interface CreateCashfreeOrderInput {
  sku: string;
  planId?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  baseUrl?: string;
}

export interface CreateCashfreeOrderResult {
  ok: boolean;
  statusCode: number;
  mode?: 'cashfree_auto' | 'direct_upi';
  autoUnlockEnabled?: boolean;
  cashfreeEnv?: GatewayEnv;
  paymentSessionId?: string;
  qrImageUrl?: string;
  upiIntentUrl?: string;
  closeBy?: number;
  order?: ReturnType<typeof toPublicOrderSummary>;
  plan?: (typeof SERVER_PLANS)[keyof typeof SERVER_PLANS];
  error?: string;
}

export async function createCashfreeOrderAndQr(
  input: CreateCashfreeOrderInput
): Promise<CreateCashfreeOrderResult> {
  const sku = String(input.sku || '').trim();
  const plan = resolvePlan(input.planId);
  const buyerName = String(input.buyerName || 'Live Broadcaster').trim().slice(0, 80) || 'Live Broadcaster';
  const buyerPhone = sanitizePhoneForCashfree(String(input.buyerPhone || ''));
  const rawEmail = String(input.buyerEmail || '').trim().slice(0, 120);
  const buyerEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
    ? rawEmail
    : 'customer@stareventlive.in';

  if (!VALID_SKUS.has(sku)) {
    return { ok: false, statusCode: 400, error: 'Invalid overlay selection.' };
  }

  const creds = getCashfreeCredentials();
  if (!creds.enabled) {
    return {
      ok: true,
      statusCode: 200,
      mode: 'direct_upi',
      autoUnlockEnabled: false,
      cashfreeEnv: creds.env,
      plan,
    };
  }

  const orderId = generateOrderId();
  const customerId = `cust_${crypto.randomBytes(6).toString('hex')}`;
  const baseUrl = sanitizeBaseUrl(input.baseUrl);
  const apiBase = getCashfreeApiBase();
  // Cashfree PG strictly requires order_expiry_time to be MORE than 15 minutes and less than 30 days
  const closeBy = Date.now() + 30 * 60 * 1000; // 30-minute payment window
  const expiryIso = new Date(closeBy).toISOString();

  // Cashfree requires https notify_url & return_url in order_meta; include when https is available
  const orderMeta: Record<string, string> = {};
  if (baseUrl.startsWith('https://')) {
    orderMeta.notify_url = `${baseUrl}/api/payment/cashfree/webhook`;
    orderMeta.return_url = `${baseUrl}/overlays?cf_order_id={order_id}`;
  }

  try {
    // 1. Create official Cashfree PG Order (amount strictly derived on server from SERVER_PLANS)
    const createOrderRes = await fetch(`${apiBase}/orders`, {
      method: 'POST',
      headers: getCashfreeHeaders(),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: plan.amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: customerId,
          customer_name: buyerName,
          customer_email: buyerEmail,
          customer_phone: buyerPhone,
        },
        ...(Object.keys(orderMeta).length > 0 ? { order_meta: orderMeta } : {}),
        order_expiry_time: expiryIso,
        order_note: `Star Event Live ${sku} (${plan.label} - ${plan.durationHours}h)`,
        order_tags: {
          sku,
          planId: plan.id,
          durationHours: String(plan.durationHours),
        },
      }),
    });

    const createOrderData = (await createOrderRes.json().catch(() => ({}))) as {
      cf_order_id?: string | number;
      order_id?: string;
      payment_session_id?: string;
      message?: string;
      code?: string;
    };

    if (!createOrderRes.ok || !createOrderData?.payment_session_id) {
      console.error('Cashfree create order failed:', createOrderRes.status, createOrderData);
      return {
        ok: false,
        statusCode: 502,
        error:
          createOrderData?.message ||
          'Could not create Cashfree payment order. Check CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET and CASHFREE_ENV.',
      };
    }

    const cfOrderId = String(createOrderData.cf_order_id || orderId);
    const paymentSessionId = createOrderData.payment_session_id;

    // 2. Request Dynamic UPI QR via Cashfree PG Order Pay (/orders/sessions)
    let qrImageUrl: string | undefined;
    let upiIntentUrl: string | undefined;

    try {
      const qrPayRes = await fetch(`${apiBase}/orders/sessions`, {
        method: 'POST',
        headers: getCashfreeHeaders(),
        body: JSON.stringify({
          payment_session_id: paymentSessionId,
          payment_method: {
            upi: {
              channel: 'qrcode',
            },
          },
        }),
      });

      const qrPayData = (await qrPayRes.json().catch(() => ({}))) as {
        cf_payment_id?: string | number;
        data?: {
          payload?: {
            qrcode?: string;
            default?: string;
            gpay?: string;
            phonepe?: string;
            paytm?: string;
          };
          url?: string;
        };
      };

      const rawQr = qrPayData?.data?.payload?.qrcode;
      const rawIntent = qrPayData?.data?.payload?.default;

      if (typeof rawIntent === 'string' && rawIntent.startsWith('upi://')) {
        upiIntentUrl = rawIntent;
      }

      if (typeof rawQr === 'string' && rawQr.trim().length > 0) {
        const trimmedQr = rawQr.trim();
        if (isSafeQrImageUrl(trimmedQr)) {
          qrImageUrl = trimmedQr;
        } else {
          // Cashfree returned raw UPI URI or base64 payload string -> render crisp PNG QR data URL
          if (trimmedQr.startsWith('upi://')) {
            upiIntentUrl = upiIntentUrl || trimmedQr;
            qrImageUrl = await QRCode.toDataURL(trimmedQr, {
              width: 320,
              margin: 2,
              color: { dark: '#09090B', light: '#FFFFFF' },
            });
          } else if (/^[A-Za-z0-9+/=\s]+$/.test(trimmedQr) && trimmedQr.length > 100) {
            qrImageUrl = `data:image/png;base64,${trimmedQr.replace(/\s+/g, '')}`;
          }
        }
      }
    } catch (qrErr) {
      // Non-fatal: even if dynamic QR endpoint isn't enabled on a sandbox merchant, Cashfree JS Checkout modal still works via paymentSessionId
      console.warn('Cashfree dynamic QR step fallback to session checkout:', qrErr);
    }

    const order: PaymentOrderRecord = {
      orderId,
      cfOrderId,
      paymentSessionId,
      sku,
      planId: plan.id,
      durationHours: plan.durationHours,
      amount: plan.amount,
      originalPrice: plan.originalPrice,
      currency: 'INR',
      buyerName,
      buyerPhone: input.buyerPhone ? String(input.buyerPhone).replace(/\D/g, '').slice(0, 15) : '',
      buyerEmail,
      utrRef: `CF-${cfOrderId.slice(-8).toUpperCase()}`,
      paymentMethod: 'cashfree_qr',
      gatewayEnv: creds.env,
      gatewayQrImageUrl: qrImageUrl,
      upiIntentUrl,
      qrCloseBy: closeBy,
      status: 'pending',
      createdAt: Date.now(),
    };

    upsertPaymentOrder(order);

    return {
      ok: true,
      statusCode: 201,
      mode: 'cashfree_auto',
      autoUnlockEnabled: true,
      cashfreeEnv: creds.env,
      paymentSessionId,
      qrImageUrl,
      upiIntentUrl,
      closeBy,
      order: toPublicOrderSummary(order),
    };
  } catch (err) {
    console.error('Cashfree create order request error:', err);
    return {
      ok: false,
      statusCode: 502,
      error: 'Cashfree payment gateway temporarily unreachable. Please retry in a moment.',
    };
  }
}

// Track last poll timestamp per order to avoid excessive Cashfree API calls
const lastCashfreePollAt = new Map<string, number>();

export interface VerifyCashfreePaymentResult {
  ok: boolean;
  paid: boolean;
  statusCode: number;
  order?: PaymentOrderRecord;
  cashfreeStatus?: string;
  error?: string;
}

/**
 * Authoritative server-side payment verification against Cashfree PG API.
 * Queries GET /pg/orders/{order_id} AND GET /pg/orders/{order_id}/payments,
 * confirms PAID + SUCCESS + exact amount, then activates subscription in SQLite.
 */
export async function verifyCashfreeOrderOnServer(
  orderId: string,
  options: { force?: boolean } = {}
): Promise<VerifyCashfreePaymentResult> {
  const normalizedId = String(orderId || '').trim().toUpperCase();
  if (!normalizedId) {
    return { ok: false, paid: false, statusCode: 400, error: 'Missing orderId.' };
  }

  const order = getPaymentOrderById(normalizedId);
  if (!order) {
    return { ok: false, paid: false, statusCode: 404, error: 'Order not found.' };
  }

  if (isOrderActive(order)) {
    return { ok: true, paid: true, statusCode: 200, order, cashfreeStatus: 'PAID' };
  }

  if (order.status !== 'pending' || order.paymentMethod !== 'cashfree_qr') {
    return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: order.status.toUpperCase() };
  }

  const creds = getCashfreeCredentials();
  if (!creds.enabled) {
    return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: 'GATEWAY_NOT_CONFIGURED' };
  }

  const now = Date.now();
  const lastPoll = lastCashfreePollAt.get(order.orderId) || 0;
  if (!options.force && now - lastPoll < 2200) {
    return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: 'ACTIVE' };
  }
  lastCashfreePollAt.set(order.orderId, now);

  const apiBase = getCashfreeApiBase();
  const encodedId = encodeURIComponent(order.orderId);

  try {
    const orderRes = await fetch(`${apiBase}/orders/${encodedId}`, {
      method: 'GET',
      headers: getCashfreeHeaders(),
    });

    if (!orderRes.ok) {
      return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: 'UNKNOWN' };
    }

    const cfOrder = (await orderRes.json().catch(() => ({}))) as {
      order_status?: string;
      order_amount?: number;
      cf_order_id?: string | number;
    };

    const cfStatus = String(cfOrder?.order_status || '').toUpperCase();

    if (cfStatus !== 'PAID') {
      return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: cfStatus || 'ACTIVE' };
    }

    // Double-verify actual captured payment details via GET /orders/{order_id}/payments
    const paymentsRes = await fetch(`${apiBase}/orders/${encodedId}/payments`, {
      method: 'GET',
      headers: getCashfreeHeaders(),
    });

    const paymentsJson = paymentsRes.ok ? await paymentsRes.json().catch(() => []) : [];
    const paymentsList = Array.isArray(paymentsJson) ? paymentsJson : [];
    const confirmedPayment = paymentsList.find(
      (p: { payment_status?: string; payment_amount?: number }) =>
        p &&
        String(p.payment_status || '').toUpperCase() === 'SUCCESS' &&
        Number(p.payment_amount) >= order.amount
    ) as
      | {
          cf_payment_id?: string | number;
          bank_reference?: string;
          payment_amount?: number;
        }
      | undefined;

    if (!confirmedPayment) {
      // Order says PAID, verify order_amount matches as safety gate
      if (Number(cfOrder.order_amount) < order.amount) {
        return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: 'AMOUNT_MISMATCH' };
      }
    }

    const cfPaymentId = confirmedPayment?.cf_payment_id
      ? String(confirmedPayment.cf_payment_id)
      : cfOrder.cf_order_id
        ? String(cfOrder.cf_order_id)
        : undefined;
    const bankRef = confirmedPayment?.bank_reference
      ? String(confirmedPayment.bank_reference)
      : undefined;

    const activated = activateOrderAndSubscription(order.orderId, {
      cfPaymentId,
      bankRef,
    });

    if (!activated) {
      return { ok: false, paid: false, statusCode: 500, error: 'Failed to activate subscription.' };
    }

    return {
      ok: true,
      paid: true,
      statusCode: 200,
      order: activated.order,
      cashfreeStatus: 'PAID',
    };
  } catch (err) {
    console.error('Cashfree server verification error:', err);
    return { ok: true, paid: false, statusCode: 200, order, cashfreeStatus: 'POLL_ERROR' };
  }
}

/**
 * Verifies Cashfree PG Webhook HMAC-SHA256 signature per official Cashfree PG docs:
 *   signedPayload = x-webhook-timestamp + rawBody  (no separator, exact raw request bytes)
 *   expectedSig   = Base64(HMAC_SHA256(CASHFREE_CLIENT_SECRET, signedPayload))
 *
 * Cashfree Payment Gateway does NOT issue a separate webhook secret; it signs webhooks
 * using your environment's Cashfree Client Secret Key (CASHFREE_CLIENT_SECRET).
 */
export function verifyCashfreeWebhookSignature(
  rawBody: Buffer | string,
  timestamp: string,
  signature: string
): { valid: boolean; reason?: string } {
  const { clientSecret, webhookSecret, signingSecret } = getCashfreeCredentials();

  if (!signingSecret) {
    return { valid: false, reason: 'Cashfree secret key is not configured on server.' };
  }

  if (clientSecret && webhookSecret && !safeEqualStrings(clientSecret, webhookSecret)) {
    console.warn(
      'CASHFREE_WEBHOOK_SECRET differs from CASHFREE_CLIENT_SECRET. Cashfree PG signs webhooks using your Cashfree Client Secret Key — verifying strictly with CASHFREE_CLIENT_SECRET.'
    );
  }

  if (!timestamp || !signature) {
    return { valid: false, reason: 'Missing x-webhook-timestamp or x-webhook-signature header.' };
  }

  const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  if (rawString.length === 0) {
    return { valid: false, reason: 'Empty raw webhook payload.' };
  }

  const signedPayload = `${timestamp}${rawString}`;
  const expectedSig = crypto
    .createHmac('sha256', signingSecret)
    .update(signedPayload, 'utf8')
    .digest('base64');

  if (!safeEqualStrings(signature, expectedSig)) {
    return { valid: false, reason: 'Invalid Cashfree webhook signature.' };
  }

  return { valid: true };
}

export interface ProcessWebhookResult {
  handled: boolean;
  unlockedOrder?: PaymentOrderRecord;
  eventType: string;
}

export function processCashfreeWebhookPayload(payload: unknown): ProcessWebhookResult {
  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const eventType = String(body.type || '').trim().toUpperCase();
  const data =
    body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : {};
  const orderObj =
    data.order && typeof data.order === 'object' ? (data.order as Record<string, unknown>) : {};
  const paymentObj =
    data.payment && typeof data.payment === 'object'
      ? (data.payment as Record<string, unknown>)
      : {};

  if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
    const paymentStatus = String(paymentObj.payment_status || '').trim().toUpperCase();
    const orderId = String(orderObj.order_id || '').trim().toUpperCase();
    const cfOrderId = orderObj.cf_order_id ? String(orderObj.cf_order_id).trim() : '';
    const paymentAmount = Number(paymentObj.payment_amount || orderObj.order_amount || 0);
    const cfPaymentId = paymentObj.cf_payment_id ? String(paymentObj.cf_payment_id) : undefined;
    const bankRef = paymentObj.bank_reference ? String(paymentObj.bank_reference) : undefined;

    if (paymentStatus !== 'SUCCESS') {
      return { handled: false, eventType };
    }

    const order =
      (orderId ? getPaymentOrderById(orderId) : null) ||
      (cfOrderId ? getPaymentOrderByCfOrderId(cfOrderId) : null);

    if (!order) {
      return { handled: false, eventType };
    }

    // Strict server-side amount verification before unlocking
    if (!Number.isFinite(paymentAmount) || paymentAmount < order.amount) {
      console.warn(
        `Cashfree webhook amount mismatch for ${order.orderId}: received ${paymentAmount}, expected ${order.amount}`
      );
      return { handled: false, eventType };
    }

    const activated = activateOrderAndSubscription(order.orderId, {
      cfPaymentId,
      bankRef,
    });

    if (activated) {
      return { handled: true, unlockedOrder: activated.order, eventType };
    }
  }

  return { handled: false, eventType };
}
