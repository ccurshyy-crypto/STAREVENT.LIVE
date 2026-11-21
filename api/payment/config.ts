import { getCashfreePublicConfig } from '../../server/cashfree.ts';
import { sendJson, type VercelRequestLike, type VercelResponseLike } from '../_utils.ts';

export default function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  sendJson(res, 200, getCashfreePublicConfig());
}
