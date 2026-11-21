import {
  findApprovedOrderByUnlockCode,
  getOrderExpiresAt,
  getSubscriptionByUnlockCode,
} from '../../server/paymentDb.ts';
import {
  getQueryParam,
  sendJson,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../_utils.ts';

export default function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const sku = getQueryParam(req, 'sku').trim();
  const token = getQueryParam(req, 'token').trim().toUpperCase();
  const now = Date.now();

  res.setHeader('Cache-Control', 'no-store');

  if (sku === 'kabaddi-demo') {
    sendJson(res, 200, { ok: true, active: true, freeDemo: true, sku: 'kabaddi-demo' });
    return;
  }

  if (!token) {
    sendJson(res, 403, { ok: false, active: false, reason: 'missing_token' });
    return;
  }

  const sub = getSubscriptionByUnlockCode(token);
  if (sub) {
    if (sub.status === 'revoked') {
      sendJson(res, 403, { ok: false, active: false, reason: 'revoked' });
      return;
    }
    if (sku && sub.sku !== 'all' && sub.sku !== sku) {
      sendJson(res, 403, { ok: false, active: false, reason: 'sku_mismatch' });
      return;
    }
    if (sub.expiresAt <= now) {
      sendJson(res, 403, { ok: false, active: false, reason: 'expired', expiresAt: sub.expiresAt });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      active: true,
      sku: sku || sub.sku,
      planId: sub.planId,
      expiresAt: sub.expiresAt,
    });
    return;
  }

  const match = findApprovedOrderByUnlockCode(token, sku || undefined);
  if (!match) {
    sendJson(res, 403, { ok: false, active: false, reason: 'invalid_token' });
    return;
  }

  const expiresAt = getOrderExpiresAt(match);
  if (expiresAt <= now) {
    sendJson(res, 403, { ok: false, active: false, reason: 'expired', expiresAt });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    active: true,
    sku: sku || match.sku,
    planId: match.planId,
    expiresAt,
  });
}
