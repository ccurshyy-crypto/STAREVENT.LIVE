import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelRequestLike extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface VercelResponseLike extends ServerResponse {
  status?: (code: number) => VercelResponseLike;
  json?: (data: unknown) => void;
}

export function sendJson(res: VercelResponseLike, statusCode: number, data: unknown) {
  if (typeof res.status === 'function') {
    const chained = res.status(statusCode);
    if (typeof chained.json === 'function') {
      chained.json(data);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function readJsonBody(req: VercelRequestLike): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try {
    const parsed = JSON.parse(raw.toString('utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function getQueryParam(req: VercelRequestLike, key: string): string {
  if (req.query && key in req.query) {
    const val = req.query[key];
    return Array.isArray(val) ? String(val[0] || '') : String(val || '');
  }
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return url.searchParams.get(key) || '';
  } catch {
    return '';
  }
}

export function getRequestBaseUrl(req: IncomingMessage): string {
  const envUrl = (process.env.APP_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const vercelUrl = (process.env.VERCEL_URL || '').trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}
