import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://snhvvmabdzrcunssbqfn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_SyrDtT05ElI0DYMlzQBbnA_tGZFbvkf';

/**
 * Normalizes a Supabase URL so both project URLs and REST endpoint URLs
 * (e.g. https://<ref>.supabase.co/rest/v1/) work cleanly with @supabase/supabase-js.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const rawEnvUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? String(import.meta.env.VITE_SUPABASE_URL)
    : DEFAULT_SUPABASE_URL;

const rawEnvAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? String(import.meta.env.VITE_SUPABASE_ANON_KEY)
    : DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_URL = normalizeSupabaseUrl(rawEnvUrl || DEFAULT_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (rawEnvAnonKey || DEFAULT_SUPABASE_ANON_KEY).trim();
export const SUPABASE_SCOREBOARD_TABLE = 'live_scoreboards';
export const SUPABASE_KABADDI_SPORT = 'kabaddi';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return cachedClient;
}
