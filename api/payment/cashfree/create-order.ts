import { createCashfreeOrderAndQr } from '../../../server/cashfree.ts';
import {
  getRequestBaseUrl,
  readJsonBody,
  sendJson,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../../_utils.ts';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const body = await readJsonBody(req);
  const result = await createCashfreeOrderAndQr({
    sku: String(body.sku || ''),
    planId: body.planId ? String(body.planId) : undefined,
    previousOrderId: body.previousOrderId ? String(body.previousOrderId) : undefined,
    buyerName: body.buyerName ? String(body.buyerName) : undefined,
    buyerPhone: body.buyerPhone ? String(body.buyerPhone) : undefined,
    buyerEmail: body.buyerEmail ? String(body.buyerEmail) : undefined,
    baseUrl: getRequestBaseUrl(req),
  });

  const { statusCode, ...payload } = result;
  res.setHeader('Cache-Control', 'no-store');
  sendJson(res, statusCode, payload);
}
