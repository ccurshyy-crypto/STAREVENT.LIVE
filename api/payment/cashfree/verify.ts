import { verifyCashfreeOrderOnServer } from '../../../server/cashfree.ts';
import { toPublicOrderSummary } from '../../../server/paymentDb.ts';
import {
  getQueryParam,
  readJsonBody,
  sendJson,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../../_utils.ts';

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  let orderId = getQueryParam(req, 'orderId') || getQueryParam(req, 'order_id');
  if (!orderId && req.method === 'POST') {
    const body = await readJsonBody(req);
    orderId = String(body.orderId || body.order_id || '');
  }

  const result = await verifyCashfreeOrderOnServer(orderId, { force: true });
  res.setHeader('Cache-Control', 'no-store');
  if (!result.ok) {
    sendJson(res, result.statusCode, { ok: false, paid: false, error: result.error });
    return;
  }

  sendJson(res, result.statusCode, {
    ok: true,
    paid: result.paid,
    cashfreeStatus: result.cashfreeStatus,
    order: result.order ? toPublicOrderSummary(result.order) : undefined,
  });
}
