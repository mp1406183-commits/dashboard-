-- Run this ONCE if you previously got:
--   ERROR: 42703: column "user_id" does not exist
-- That means a `finance_data` table already existed with a different shape.
-- This drops it so the real schema can be created cleanly.

drop table if exists public.finance_data cascade;
