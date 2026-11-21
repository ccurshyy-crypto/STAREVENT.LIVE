import {
  findApprovedOrderByUnlockCode,
  getOrderExpiresAt,
  VALID_SKUS,
} from '../../server/paymentDb.ts';
import {
  readJsonBody,
  sendJson,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../_utils.ts';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const body = await readJsonBody(req);
  const code = String(body.unlockCode || '').trim().toUpperCase();
  const requestedSku = String(body.sku || '').trim();

  if (!code) {
    sendJson(res, 400, { ok: false, error: 'Please enter your Unlock Key.' });
    return;
  }

  const match = findApprovedOrderByUnlockCode(code, requestedSku || undefined);
  if (!match || !match.unlockCode) {
    const anySkuMatch = findApprovedOrderByUnlockCode(code);
    if (anySkuMatch) {
      sendJson(res, 403, {
        ok: false,
        error: 'This Unlock Key is valid for a different overlay. Please select the matching overlay.',
      });
      return;
    }

    sendJson(res, 403, {
      ok: false,
      error: 'Invalid or locked Unlock Key. Pay via QR (₹1 Today Offer / ₹149 / ₹1,499) to unlock.',
    });
    return;
  }

  const expiresAt = getOrderExpiresAt(match);
  if (expiresAt <= Date.now()) {
    sendJson(res, 403, {
      ok: false,
      expired: true,
      error:
        'This Unlock Key has expired and auto-locked. Please select a fresh plan (₹1 Today Offer / ₹149 / ₹1,499).',
    });
    return;
  }

  const unlockedSkus = match.sku === 'all' ? Array.from(VALID_SKUS) : [match.sku];
  sendJson(res, 200, {
    ok: true,
    sku: match.sku,
    planId: match.planId || '1day',
    unlockedSkus,
    orderId: match.orderId,
    unlockCode: match.unlockCode,
    expiresAt,
  });
}
