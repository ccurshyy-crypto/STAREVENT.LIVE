-- =============================================================================
-- STAR EVENT LIVE · CRICKET TOURNAMENT MANAGEMENT & VMIX OVERLAY SCHEMA
-- Run this migration in your Supabase SQL Editor to provision normalized tables,
-- foreign keys, Realtime publication, Storage buckets, and RLS policies.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. PROFILES & ROLES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uid text unique not null,
  full_name text not null,
  email text,
  mobile text,
  channel_title text default 'STAR EVENT LIVE',
  channel_logo_url text,
  plan_name text default 'Pro Broadcast',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner_admin', 'operator', 'viewer')) default 'operator',
  updated_at timestamptz not null default now()
);

-- 2. SECURE OVERLAY CONTROLLER ACCOUNTS (HASHED PASSWORDS ONLY - NEVER PLAINTEXT)
create table if not exists public.overlay_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  login_id text unique not null,
  assigned_user text not null,
  password_salt text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TOURNAMENTS & GROUPS
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  name text not null,
  short_name text not null,
  logo_url text,
  venue text,
  tournament_type text not null default 'League + Knockout',
  ball_type text not null default 'Tennis',
  match_format text not null default 'T10',
  total_overs integer not null default 6 check (total_overs > 0 and total_overs <= 50),
  start_date date,
  end_date date,
  status text not null check (status in ('upcoming', 'active', 'completed')) default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 4. TEAMS, PLAYERS & TOURNAMENT ASSIGNMENTS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  name text not null,
  short_name text not null,
  color_tag text not null default 'Blue',
  place text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  unique (tournament_id, team_id)
);

create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  photo_url text,
  jersey_no integer default 0,
  role text not null check (role in ('Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper')) default 'All-Rounder',
  batting_style text default 'Right-hand bat',
  bowling_style text default 'Right-arm medium',
  is_captain boolean not null default false,
  is_wicketkeeper boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. MATCHES, INNINGS & BALL-BY-BALL EVENTS
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete set null,
  team_a_id uuid not null references public.teams(id),
  team_b_id uuid not null references public.teams(id),
  match_name text not null,
  match_type text not null default 'LEAGUE',
  match_date date,
  match_time text,
  venue text,
  total_overs integer not null default 6,
  ball_type text not null default 'Tennis',
  toss_winner_id uuid references public.teams(id),
  toss_decision text check (toss_decision in ('Bat', 'Bowl')),
  current_innings integer not null default 1 check (current_innings in (1, 2)),
  status text not null check (status in ('not_started', 'live', 'innings_break', 'completed')) default 'not_started',
  result_text text default 'Not Started',
  player_of_match_id uuid references public.team_players(id),
  created_at timestamptz not null default now(),
  constraint chk_distinct_teams check (team_a_id <> team_b_id)
);

create table if not exists public.innings (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  match_id uuid not null references public.matches(id) on delete cascade,
  innings_number integer not null check (innings_number in (1, 2)),
  batting_team_id uuid not null references public.teams(id),
  bowling_team_id uuid not null references public.teams(id),
  runs integer not null default 0,
  wickets integer not null default 0,
  legal_balls integer not null default 0,
  target integer,
  extras_wd integer not null default 0,
  extras_nb integer not null default 0,
  extras_lb integer not null default 0,
  extras_bye integer not null default 0,
  extras_penalty integer not null default 0,
  striker_id uuid references public.team_players(id),
  non_striker_id uuid references public.team_players(id),
  bowler_id uuid references public.team_players(id),
  completed boolean not null default false,
  unique (match_id, innings_number)
);

create table if not exists public.innings_players (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  innings_id uuid not null references public.innings(id) on delete cascade,
  player_id uuid not null references public.team_players(id) on delete cascade,
  batting_order integer,
  is_playing_xi boolean not null default true
);

create table if not exists public.ball_events (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  match_id uuid not null references public.matches(id) on delete cascade,
  innings_id uuid not null references public.innings(id) on delete cascade,
  over_number integer not null,
  ball_in_over integer not null,
  is_legal boolean not null default true,
  runs_off_bat integer not null default 0,
  extra_type text not null default 'none',
  extra_runs integer not null default 0,
  total_runs integer not null default 0,
  is_boundary_4 boolean not null default false,
  is_boundary_6 boolean not null default false,
  is_wicket boolean not null default false,
  wicket_type text,
  dismissed_player_id uuid references public.team_players(id),
  fielder_name text,
  striker_id uuid references public.team_players(id),
  non_striker_id uuid references public.team_players(id),
  bowler_id uuid references public.team_players(id),
  created_at timestamptz not null default now()
);

create table if not exists public.batting_scorecards (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  innings_id uuid not null references public.innings(id) on delete cascade,
  player_id uuid not null references public.team_players(id) on delete cascade,
  batting_position integer not null,
  runs integer not null default 0,
  balls integer not null default 0,
  fours integer not null default 0,
  sixes integer not null default 0,
  dismissal_text text default 'not out',
  is_out boolean not null default false,
  unique (innings_id, player_id)
);

create table if not exists public.bowling_scorecards (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  innings_id uuid not null references public.innings(id) on delete cascade,
  player_id uuid not null references public.team_players(id) on delete cascade,
  legal_balls integer not null default 0,
  maidens integer not null default 0,
  runs integer not null default 0,
  wickets integer not null default 0,
  wides integer not null default 0,
  no_balls integer not null default 0,
  unique (innings_id, player_id)
);

create table if not exists public.fall_of_wickets (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  innings_id uuid not null references public.innings(id) on delete cascade,
  wicket_number integer not null,
  score_at_fall integer not null,
  overs_at_fall text not null,
  player_id uuid references public.team_players(id),
  wicket_type text
);

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  innings_id uuid not null references public.innings(id) on delete cascade,
  wicket_number integer not null,
  batter_1_id uuid references public.team_players(id),
  batter_2_id uuid references public.team_players(id),
  runs integer not null default 0,
  balls integer not null default 0
);

-- 6. OVERLAY SETTINGS, THEMES, RESULTS, POINTS TABLE & AUDIT LOGS
create table if not exists public.overlay_settings (
  id uuid primary key default gen_random_uuid(),
  owner_uid text unique not null,
  active_match_id uuid references public.matches(id) on delete set null,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.overlay_theme_settings (
  id uuid primary key default gen_random_uuid(),
  owner_uid text unique not null,
  theme_id text not null default 'ipl-2023-dynamic',
  custom_colors jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.match_results (
  match_id uuid primary key references public.matches(id) on delete cascade,
  owner_uid text not null,
  winner_team_id uuid references public.teams(id),
  result_summary text not null,
  completed_at timestamptz not null default now()
);

create table if not exists public.points_table (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  played integer not null default 0,
  won integer not null default 0,
  lost integer not null default 0,
  tied integer not null default 0,
  no_result integer not null default 0,
  points integer not null default 0,
  nrr numeric(6,3) not null default 0.000,
  unique (tournament_id, team_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  entity_type text not null,
  entity_id text not null,
  actor text not null,
  action text not null,
  reason text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Existing live_scoreboards table used for real-time vMix overlay synchronization
create table if not exists public.live_scoreboards (
  match_id text primary key,
  sport text not null default 'cricket',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security across all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.overlay_accounts enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_groups enable row level security;
alter table public.teams enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.team_players enable row level security;
alter table public.matches enable row level security;
alter table public.innings enable row level security;
alter table public.innings_players enable row level security;
alter table public.ball_events enable row level security;
alter table public.batting_scorecards enable row level security;
alter table public.bowling_scorecards enable row level security;
alter table public.fall_of_wickets enable row level security;
alter table public.partnerships enable row level security;
alter table public.overlay_settings enable row level security;
alter table public.overlay_theme_settings enable row level security;
alter table public.match_results enable row level security;
alter table public.points_table enable row level security;
alter table public.audit_logs enable row level security;

-- Add account status flag to profiles for admin activation/deactivation
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Helper function to verify Main Admin role securely inside RLS policies
create or replace function public.is_main_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'owner_admin'
  );
$$;

-- RLS Policies for public.profiles
-- Users can only read their own profile; Main Admins can read all profiles.
-- Only service_role (Admin API / Edge Function) can insert, delete, or toggle is_active.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_main_admin());

drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
create policy "profiles_update_own_safe_fields"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id and is_active = true)
  with check (
    auth.uid() = id
    and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
    and uid = (select p.uid from public.profiles p where p.id = auth.uid())
  );

-- RLS Policies for public.user_roles
-- Users can read their own role; Main Admins can read all roles.
-- No client insert/update/delete policies: role mutations require service_role.
drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_main_admin());

-- Storage bucket for tournament logos, team logos & player photos
insert into storage.buckets (id, name, public)
values ('cricket-media', 'cricket-media', true)
on conflict (id) do nothing;

-- =============================================================================
-- 7. CASHFREE PRODUCTION PAYMENTS, SERVER-SIDE UNLOCKS & ADMIN AUDIT LOGS
--    Strict server-side service_role write control (no client-side unlocking).
-- =============================================================================
create table if not exists public.worldcup_payments (
  order_id text primary key,
  customer_id text not null,
  customer_email text,
  customer_name text,
  product_code text not null default 'worldcup_scoreboard',
  product_name text not null default 'WorldCup Scoreboard',
  expected_amount numeric(10,2) not null,
  currency text not null default 'INR' check (currency = 'INR'),
  cf_order_id text,
  cf_payment_id text unique,
  payment_status text not null check (payment_status in ('PENDING', 'PAID', 'FAILED', 'CANCELLED')) default 'PENDING',
  cashfree_raw_status text,
  unlock_status text not null check (unlock_status in ('LOCKED', 'UNLOCKED')) default 'LOCKED',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_worldcup_payments_catalog_price check (
    (product_code = 'worldcup_scoreboard' and expected_amount = 149.00)
    or (product_code = 'lightning_pro_scoreboard' and expected_amount = 79.00)
  )
);

-- Safe migration for existing deployments adding Lightning Premier ₹79 pricing
alter table public.worldcup_payments
  drop constraint if exists worldcup_payments_expected_amount_check;
alter table public.worldcup_payments
  drop constraint if exists chk_worldcup_payments_catalog_price;
alter table public.worldcup_payments
  add constraint chk_worldcup_payments_catalog_price check (
    (product_code = 'worldcup_scoreboard' and expected_amount = 149.00)
    or (product_code = 'lightning_pro_scoreboard' and expected_amount = 79.00)
  );

create index if not exists idx_worldcup_payments_customer_id
  on public.worldcup_payments (customer_id, created_at desc);

create index if not exists idx_worldcup_payments_status
  on public.worldcup_payments (payment_status, created_at desc);

create table if not exists public.worldcup_unlocks (
  customer_id text not null,
  product_code text not null default 'worldcup_scoreboard',
  unlock_status text not null check (unlock_status in ('LOCKED', 'UNLOCKED')) default 'LOCKED',
  grant_source text not null check (grant_source in ('cashfree', 'admin_manual')),
  order_id text unique references public.worldcup_payments(order_id) on delete set null,
  cf_payment_id text unique,
  unlocked_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by text,
  grant_reason text,
  updated_at timestamptz not null default now(),
  primary key (customer_id, product_code)
);

-- Safe migration to composite primary key (customer_id, product_code) for existing databases
alter table public.worldcup_unlocks
  drop constraint if exists worldcup_unlocks_pkey;
alter table public.worldcup_unlocks
  add primary key (customer_id, product_code);

create table if not exists public.payment_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null check (action in ('MANUAL_GRANT', 'MANUAL_REVOKE')),
  customer_id text not null,
  reason text not null,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_admin_audit_logs_customer
  on public.payment_admin_audit_logs (customer_id, created_at desc);

-- Webhook event deduplication table (prevents duplicate webhook processing across restarts)
create table if not exists public.cashfree_webhook_events (
  event_key text primary key,
  order_id text not null,
  cf_payment_id text,
  event_type text,
  processed_at timestamptz not null default now()
);

-- Enable RLS with NO anon/authenticated write policies (backend service_role ONLY)
alter table public.worldcup_payments enable row level security;
alter table public.worldcup_unlocks enable row level security;
alter table public.payment_admin_audit_logs enable row level security;
alter table public.cashfree_webhook_events enable row level security;

-- Atomic PostgreSQL transaction to verify catalog price & uniqueness and mark a payment PAID + UNLOCKED
create or replace function public.complete_worldcup_payment_tx(
  p_order_id text,
  p_customer_id text,
  p_cf_order_id text,
  p_cf_payment_id text,
  p_verified_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.worldcup_payments%rowtype;
  v_existing_order text;
  v_valid_price boolean;
begin
  select *
  into v_payment
  from public.worldcup_payments
  where order_id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_FOUND', 'message', 'Order not found.');
  end if;

  if v_payment.customer_id <> p_customer_id then
    return jsonb_build_object('ok', false, 'code', 'CUSTOMER_MISMATCH', 'message', 'Order customer mismatch.');
  end if;

  v_valid_price := (
    (v_payment.product_code = 'worldcup_scoreboard' and v_payment.expected_amount = 149.00)
    or (v_payment.product_code = 'lightning_pro_scoreboard' and v_payment.expected_amount = 79.00)
  );

  if not v_valid_price or upper(v_payment.currency) <> 'INR' then
    return jsonb_build_object('ok', false, 'code', 'AMOUNT_MISMATCH', 'message', 'Order amount/currency mismatch.');
  end if;

  if v_payment.payment_status = 'PAID' and v_payment.unlock_status = 'UNLOCKED' then
    return jsonb_build_object('ok', true, 'already_paid', true, 'cf_payment_id', v_payment.cf_payment_id);
  end if;

  select order_id
  into v_existing_order
  from public.worldcup_payments
  where cf_payment_id = p_cf_payment_id
    and order_id <> p_order_id
  limit 1;

  if found then
    update public.worldcup_payments
    set payment_status = 'FAILED',
        cashfree_raw_status = 'DUPLICATE_PAYMENT_ID_REJECTED',
        unlock_status = 'LOCKED',
        updated_at = p_verified_at
    where order_id = p_order_id;

    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID already used.');
  end if;

  update public.worldcup_payments
  set cf_order_id = coalesce(p_cf_order_id, cf_order_id),
      cf_payment_id = p_cf_payment_id,
      payment_status = 'PAID',
      cashfree_raw_status = 'SUCCESS',
      unlock_status = 'UNLOCKED',
      verified_at = p_verified_at,
      updated_at = p_verified_at
  where order_id = p_order_id;

  insert into public.worldcup_unlocks (
    customer_id,
    product_code,
    unlock_status,
    grant_source,
    order_id,
    cf_payment_id,
    unlocked_at,
    expires_at,
    granted_by,
    grant_reason,
    updated_at
  )
  values (
    p_customer_id,
    v_payment.product_code,
    'UNLOCKED',
    'cashfree',
    p_order_id,
    p_cf_payment_id,
    p_verified_at,
    null,
    null,
    null,
    p_verified_at
  )
  on conflict (customer_id, product_code) do update
  set unlock_status = 'UNLOCKED',
      grant_source = 'cashfree',
      order_id = excluded.order_id,
      cf_payment_id = excluded.cf_payment_id,
      unlocked_at = excluded.unlocked_at,
      expires_at = null,
      granted_by = null,
      grant_reason = null,
      updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'already_paid', false, 'cf_payment_id', p_cf_payment_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID unique constraint violation.');
end;
$$;
