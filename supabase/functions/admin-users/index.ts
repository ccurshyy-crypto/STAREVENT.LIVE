// =============================================================================
// Supabase Edge Function: admin-users
// Deploy to your Supabase project with:
//   supabase functions deploy admin-users
//
// Required Edge Function Secrets (set via `supabase secrets set`):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_EDGE_SECRET (shared server-to-server secret matching server.ts)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

function isUserBanned(bannedUntil?: string | null): boolean {
  if (!bannedUntil) return false;
  const ts = Date.parse(bannedUntil);
  return Number.isFinite(ts) && ts > Date.now();
}

function buildWorkspaceUid(userId: string, existingUid?: string | null): string {
  if (existingUid && typeof existingUid === 'string' && existingUid.trim().length >= 3) {
    return existingUid.trim().toUpperCase().slice(0, 32);
  }
  return `USR-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const expectedEdgeSecret = Deno.env.get('ADMIN_EDGE_SECRET')?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { ok: false, error: 'Supabase Admin environment variables are not configured.' },
      500
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Server-side Main Admin permission check on EVERY request:
  //    Accepts EITHER:
  //      (a) Verified server-to-server `x-admin-edge-secret` header (from server.ts requireOwnerAdmin), OR
  //      (b) Verified Supabase Auth Bearer JWT whose user_roles.role === 'owner_admin'
  let authorized = false;

  const providedEdgeSecret = req.headers.get('x-admin-edge-secret')?.trim() || '';
  if (expectedEdgeSecret && providedEdgeSecret && timingSafeEqual(providedEdgeSecret, expectedEdgeSecret)) {
    authorized = true;
  } else {
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (jwt) {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
      if (!userErr && userData?.user) {
        const { data: roleRow } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (roleRow?.role === 'owner_admin') {
          authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    return jsonResponse(
      { ok: false, error: 'Forbidden: Main Admin permissions required.' },
      403
    );
  }

  // 2. Parse & validate action payload
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400);
  }

  const action = typeof payload.action === 'string' ? payload.action : '';

  try {
    // -------------------------------------------------------------------------
    // LIST USERS
    // -------------------------------------------------------------------------
    if (action === 'list') {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 500);
      }

      const authUsers = data?.users ?? [];
      const [profilesRes, rolesRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, uid, full_name, is_active'),
        supabaseAdmin.from('user_roles').select('user_id, role'),
      ]);

      const profileMap = new Map<
        string,
        { uid?: string; full_name?: string; is_active?: boolean }
      >();
      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        for (const p of profilesRes.data) {
          profileMap.set(String(p.id), p);
        }
      }

      const roleMap = new Map<string, string>();
      if (!rolesRes.error && Array.isArray(rolesRes.data)) {
        for (const r of rolesRes.data) {
          roleMap.set(String(r.user_id), String(r.role));
        }
      }

      const users = authUsers.map((u) => {
        const prof = profileMap.get(u.id);
        const role =
          roleMap.get(u.id) ||
          (typeof u.user_metadata?.role === 'string' ? u.user_metadata.role : 'operator');
        const banned = isUserBanned((u as { banned_until?: string | null }).banned_until);
        const metaActive = u.user_metadata?.is_active !== false;
        const profileActive = prof?.is_active !== false;
        const isActive = !banned && metaActive && profileActive;

        return {
          userId: u.id,
          email: u.email || '',
          workspaceUid: buildWorkspaceUid(
            u.id,
            prof?.uid || (typeof u.user_metadata?.uid === 'string' ? u.user_metadata.uid : null)
          ),
          role,
          isActive,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
        };
      });

      return jsonResponse({ ok: true, users });
    }

    // -------------------------------------------------------------------------
    // CREATE USER
    // -------------------------------------------------------------------------
    if (action === 'create') {
      const email =
        typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
      const password = typeof payload.password === 'string' ? payload.password : '';

      if (!EMAIL_REGEX.test(email) || email.length > 254) {
        return jsonResponse({ ok: false, error: 'Please enter a valid Login ID (Email).' }, 400);
      }
      if (password.length < 8 || password.length > 128) {
        return jsonResponse(
          { ok: false, error: 'Password must be between 8 and 128 characters.' },
          400
        );
      }

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'operator',
          is_active: true,
        },
      });

      if (createErr || !created?.user) {
        return jsonResponse(
          { ok: false, error: createErr?.message || 'Failed to create user in Supabase Auth.' },
          400
        );
      }

      const userId = created.user.id;
      const workspaceUid = buildWorkspaceUid(userId);
      const displayName = email.split('@')[0] || 'Tournament User';

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: 'operator',
          uid: workspaceUid,
          is_active: true,
        },
      });

      // Best-effort profile & role persistence (succeeds once schema.sql tables exist)
      await supabaseAdmin.from('profiles').upsert(
        {
          id: userId,
          uid: workspaceUid,
          full_name: displayName,
          email,
          is_active: true,
        },
        { onConflict: 'id' }
      );

      await supabaseAdmin.from('user_roles').upsert(
        {
          user_id: userId,
          role: 'operator',
        },
        { onConflict: 'user_id' }
      );

      return jsonResponse(
        {
          ok: true,
          user: {
            userId,
            email,
            workspaceUid,
            role: 'operator',
            isActive: true,
            createdAt: created.user.created_at,
            lastSignInAt: null,
          },
        },
        201
      );
    }

    // -------------------------------------------------------------------------
    // RESET PASSWORD
    // -------------------------------------------------------------------------
    if (action === 'reset_password') {
      const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
      const newPassword = typeof payload.password === 'string' ? payload.password : '';

      if (!UUID_REGEX.test(userId)) {
        return jsonResponse({ ok: false, error: 'Invalid user ID.' }, 400);
      }
      if (newPassword.length < 8 || newPassword.length > 128) {
        return jsonResponse(
          { ok: false, error: 'New password must be between 8 and 128 characters.' },
          400
        );
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 400);
      }
      return jsonResponse({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTIVATE / DEACTIVATE USER
    // -------------------------------------------------------------------------
    if (action === 'set_status') {
      const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
      const isActive = payload.isActive === true;

      if (!UUID_REGEX.test(userId)) {
        return jsonResponse({ ok: false, error: 'Invalid user ID.' }, 400);
      }

      // Guard against deactivating a Main Admin account
      const { data: roleRow } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (roleRow?.role === 'owner_admin' && !isActive) {
        return jsonResponse(
          { ok: false, error: 'Cannot deactivate a Main Admin account.' },
          400
        );
      }

      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const currentMeta = existingUser?.user?.user_metadata ?? {};

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : '876000h',
        user_metadata: {
          ...currentMeta,
          is_active: isActive,
        },
      });

      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 400);
      }

      await supabaseAdmin
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId);

      return jsonResponse({ ok: true, isActive });
    }

    // -------------------------------------------------------------------------
    // DELETE USER
    // -------------------------------------------------------------------------
    if (action === 'delete') {
      const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
      if (!UUID_REGEX.test(userId)) {
        return jsonResponse({ ok: false, error: 'Invalid user ID.' }, 400);
      }

      const { data: roleRow } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      if (roleRow?.role === 'owner_admin') {
        return jsonResponse(
          { ok: false, error: 'Cannot delete a Main Admin account.' },
          400
        );
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 400);
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unsupported admin action.' }, 400);
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unexpected server error.',
      },
      500
    );
  }
});
