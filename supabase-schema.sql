-- FD Finance Dashboard — Supabase schema (email/password auth version)
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste → Run).
--
-- If you previously ran the old version of this file (with a
-- finance_profiles table + PIN login), drop that table first:
--   drop table if exists finance_profiles cascade;

create table if not exists finance_data (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security -------------------------------------------------
-- Now that the app uses real Supabase Auth, each request carries the
-- signed-in user's own access token (not just the shared anon key), so
-- RLS can check auth.uid() and give every user access to ONLY their
-- own row. This is real per-user isolation, unlike the old PIN system.

alter table finance_data enable row level security;

create policy "users manage their own finance data"
  on finance_data for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Email confirmation ---------------------------------------------------
-- By default, new Supabase projects require users to click a
-- confirmation link before they can log in. To let people sign up and
-- start using the app immediately, go to:
--   Authentication → Providers → Email → toggle OFF "Confirm email"
-- (Or leave it on if you'd rather require verified emails — the app
-- already shows a "check your email" message in that case.)
