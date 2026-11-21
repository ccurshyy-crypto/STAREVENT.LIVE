import {
  getOrderExpiresAt,
  getPaymentOrderById,
  isOrderActive,
  orderCoversSku,
  VALID_SKUS,
  type PlanId,
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
  const tokens = Array.isArray(body.tokens) ? body.tokens : [];
  const now = Date.now();
  const verified: Array<{
    sku: string;
    orderId: string;
    unlockCode: string;
    planId?: PlanId;
    expiresAt: number;
  }> = [];

  for (const item of tokens) {
    if (!item || typeof item !== 'object') continue;
    const tokenObj = item as Record<string, unknown>;
    const sku = String(tokenObj.sku || '');
    const orderId = String(tokenObj.orderId || '').toUpperCase();
    const unlockCode = String(tokenObj.unlockCode || '').toUpperCase();
    if (!VALID_SKUS.has(sku) || !orderId || !unlockCode) continue;

    const match = getPaymentOrderById(orderId);
    if (
      match &&
      isOrderActive(match, now) &&
      orderCoversSku(match, sku) &&
      match.unlockCode?.toUpperCase() === unlockCode
    ) {
      verified.push({
        sku,
        orderId: match.orderId,
        unlockCode: match.unlockCode,
        planId: match.planId,
        expiresAt: getOrderExpiresAt(match),
      });
    }
  }

  sendJson(res, 200, { ok: true, verified });
}
