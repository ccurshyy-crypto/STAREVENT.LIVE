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
  let transactionId =
    getQueryParam(req, 'transactionId') || getQueryParam(req, 'transaction_id') || '';

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    if (!orderId) {
      orderId = String(body.orderId || body.order_id || '');
    }
    if (!transactionId && (body.transactionId || body.transaction_id)) {
      transactionId = String(body.transactionId || body.transaction_id || '');
    }
  }

  const trimmedTx = transactionId.trim();
  const result = await verifyCashfreeOrderOnServer(orderId, {
    force: true,
    transactionId: trimmedTx.length > 0 ? trimmedTx : undefined,
  });

  res.setHeader('Cache-Control', 'no-store');
  if (!result.ok) {
    sendJson(res, result.statusCode, {
      ok: false,
      paid: false,
      cashfreeStatus: result.cashfreeStatus,
      error: result.error,
    });
    return;
  }

  sendJson(res, result.statusCode, {
    ok: true,
    paid: result.paid,
    cashfreeStatus: result.cashfreeStatus,
    verifiedTransactionId: result.verifiedTransactionId,
    message: result.message,
    order: result.order ? toPublicOrderSummary(result.order) : undefined,
  });
}
