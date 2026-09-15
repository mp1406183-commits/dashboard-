-- ============================================================================
-- FD - Finance Dashboard — Supabase schema
-- Run this ONCE, in full, in your project's SQL Editor (Supabase Dashboard →
-- SQL Editor → New query → paste this whole file → Run).
--
-- Design: Supabase Auth (auth.users) handles email/password accounts and
-- sessions for you — you do not need to build sign-up/login tables yourself.
-- This app stores each user's name in their auth user's metadata (set at
-- sign-up) and stores their entire finance dataset (transactions, budgets,
-- goals, accounts, SIPs, debts) as a single JSON document per user in the
-- table below. Row Level Security ensures a user can only ever read or write
-- their own row.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Start clean in case a table with this name already exists from an earlier,
-- differently-shaped attempt. Safe to run even if the table doesn't exist yet.
drop table if exists public.finance_data cascade;

-- One row per user, holding their whole app state as JSON.
create table public.finance_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{"transactions":[],"budgets":[],"goals":[],"accounts":[],"sips":[],"debts":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_data enable row level security;

-- A user may only see, create, change, or remove their own data.
create policy "select own finance data"
  on public.finance_data for select
  using (auth.uid() = user_id);

create policy "insert own finance data"
  on public.finance_data for insert
  with check (auth.uid() = user_id);

create policy "update own finance data"
  on public.finance_data for update
  using (auth.uid() = user_id);

create policy "delete own finance data"
  on public.finance_data for delete
  using (auth.uid() = user_id);

-- Keep updated_at current automatically on every write.
-- `set search_path = public` fixes the Supabase Security Advisor warning
-- "Function Search Path Mutable" (a mutable search_path on a function that
-- runs with the definer's privileges can be hijacked by a malicious schema
-- earlier in the caller's search path — pinning it closes that off).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_data_set_updated_at on public.finance_data;
create trigger finance_data_set_updated_at
  before update on public.finance_data
  for each row
  execute procedure public.set_updated_at();

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. A user's display name is stored on the auth user itself (raw_user_meta_data
--    ->> 'name'), set via the `data: { name }` option passed to
--    supabase.auth.signUp() in scripts/pages/login.js. You don't need a
--    separate "profiles" table for it.
--
-- 2. By default Supabase requires email confirmation before a new account can
--    log in. For quick local testing you can turn this off under
--    Authentication → Providers → Email → "Confirm email". For anything
--    real-world, leave it on.
--
-- 3. If you'd rather normalize the data into real tables (transactions,
--    accounts, goals, etc. as separate rows with foreign keys) instead of one
--    JSON blob, that's a reasonable next step — this schema optimizes for
--    getting the existing app working with minimal rewrite.
--
-- 4. Two other Security Advisor warnings you may see — "Public Can Execute
--    SECURITY DEFINER Function" and "Signed-In Users Can Execute SECURITY
--    DEFINER Function" on public.rls_auto_enable() — are about a helper
--    function Supabase itself adds to your project, not anything in this
--    schema. Nothing here creates or depends on it.
-- ============================================================================
