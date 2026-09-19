-- ============================================================================
-- FD - Finance Dashboard — Supabase schema
-- Run this ONCE, in full, in your project's SQL Editor (Supabase Dashboard →
-- SQL Editor → New query → paste this whole file → Run).
--
-- This version adds separate "Personal" and "Business" ledgers: each user
-- now has up to two rows in finance_data — one per book — completely
-- independent from each other (own accounts, transactions, budgets, goals,
-- debts, SIPs). If you already ran an earlier version of this schema, this
-- file safely drops and recreates the table (fine, since you're still in
-- testing — no real data is preserved across this specific change).
--
-- Design: Supabase Auth (auth.users) handles email/password accounts and
-- sessions for you — you do not need to build sign-up/login tables yourself.
-- This app stores each user's name in their auth user's metadata (set at
-- sign-up) and stores each ledger's entire finance dataset (transactions,
-- budgets, goals, accounts, SIPs, debts) as a single JSON document per
-- (user, book) pair. Row Level Security ensures a user can only ever read
-- or write their own rows.
-- ============================================================================

create extension if not exists "pgcrypto";

drop table if exists public.finance_data cascade;

-- One row per (user, book) — book is 'personal' or 'business' — holding
-- that ledger's whole app state as JSON.
create table public.finance_data (
  user_id    uuid not null references auth.users(id) on delete cascade,
  book       text not null default 'personal' check (book in ('personal', 'business')),
  data       jsonb not null default '{"transactions":[],"budgets":[],"goals":[],"accounts":[],"sips":[],"debts":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book)
);

alter table public.finance_data enable row level security;

-- A user may only see, create, change, or remove their own rows (either book).
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
-- 3. Two other Security Advisor warnings you may see — "Public Can Execute
--    SECURITY DEFINER Function" and "Signed-In Users Can Execute SECURITY
--    DEFINER Function" on public.rls_auto_enable() — are about a helper
--    function Supabase itself adds to your project, not anything in this
--    schema. Nothing here creates or depends on it.
-- ============================================================================
