import {
  processCashfreeWebhookPayload,
  verifyCashfreeWebhookSignature,
} from '../../../server/cashfree.ts';
import {
  readRawBody,
  sendJson,
  type VercelRequestLike,
  type VercelResponseLike,
} from '../../_utils.ts';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const rawTs = req.headers['x-webhook-timestamp'];
  const rawSig = req.headers['x-webhook-signature'];
  const timestamp = Array.isArray(rawTs) ? String(rawTs[0] || '') : String(rawTs || '');
  const signature = Array.isArray(rawSig) ? String(rawSig[0] || '') : String(rawSig || '');
  const rawBody = await readRawBody(req);

  if (!rawBody || rawBody.length === 0) {
    sendJson(res, 400, { ok: false, error: 'Missing raw webhook payload.' });
    return;
  }

  const check = verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
  if (!check.valid) {
    const status = check.reason?.includes('not configured') ? 503 : 401;
    sendJson(res, status, { ok: false, error: check.reason || 'Invalid webhook signature.' });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString('utf8'));
  } catch {
    sendJson(res, 400, { ok: false, error: 'Malformed JSON payload.' });
    return;
  }

  const processed = processCashfreeWebhookPayload(parsed);
  sendJson(res, 200, {
    ok: true,
    handled: processed.handled,
    eventType: processed.eventType,
  });
}
