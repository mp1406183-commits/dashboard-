# FD — Finance Dashboard

## Setup

1. **Run the schema.** Open your Supabase project → SQL Editor → New query →
   paste the contents of `supabase-schema.sql` → Run.
   (If you'd previously run an older version with a `finance_profiles`
   table, drop it first — see the comment at the top of the SQL file.)

2. **Check email confirmation settings (optional).** By default, Supabase
   requires users to click a confirmation link before their first login
   works. To let people sign up and start using the app immediately, go to
   Authentication → Providers → Email → turn off "Confirm email". Leaving
   it on is fine too — the app already shows a "check your email" message
   in that case.

3. **Open `finance-dashboard.html`** in any browser. Sign up with an email
   and password, and start tracking. Data is stored in your Supabase
   Postgres database, scoped per-user via Row Level Security — so it
   follows you to any device you log in from.

## Notes

- The anon key baked into the HTML is meant to be public-ish (it's how any
  Supabase browser app talks to your project) — real security comes from
  the Row Level Security policy in the schema, which only lets a logged-in
  user read/write their own row.
- There's no "remember me" — the app doesn't persist your session in the
  browser, so you'll log in again each time you open the file.
