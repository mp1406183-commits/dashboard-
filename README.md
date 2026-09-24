# Money Manager — multi-page version (Supabase auth)

Each panel is its own linked page, organized into folders, with real
email + password accounts backed by Supabase.

```
index.html                     ← redirects to pages/login.html
README.md
supabase-schema.sql            ← run this in your Supabase project first
pages/
  login.html                   Log In / Sign Up (email + password)
  overview.html                stats, account balances, spending, budgets
  income.html                  income breakdown, quick-add, history table
  transactions.html            filterable ledger + add-entry form
  savings.html                 savings goals + SIP (recurring investment) tracking
  accounts.html                bank accounts and balances
  debt.html                    debts with amortized payoff projections
  insights.html                trend charts + auto-generated insights
scripts/
  shared/
    supabase-client.js          ← put your Supabase URL + anon key here
    app-data.js                 constants, state, auth, persistence, all create/update/delete logic
    app-analytics.js            stats, chart-building, insight generation
    app-shell.js                 sidebar nav, header, user badge, login guard
  pages/
    overview.js, income.js, transactions.js, savings.js,
    accounts.js, debt.js, insights.js, login.js
                                 one file per page, its own render + event wiring
styles/
  styles.css                    all styling, shared by every page
```

## Setup (do this before opening the app)

1. **Create a Supabase project** at supabase.com if you don't have one.
2. **Run the schema**: open your project's SQL Editor and run the whole
   contents of `supabase-schema.sql`. This creates the `finance_data` table
   and its Row Level Security policies (a user can only ever read/write
   their own data).
3. **Get your API keys**: Project Settings → API → copy the *Project URL*
   and the *anon public* key.
4. **Paste them in** `scripts/shared/supabase-client.js`:
   ```js
   const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
   ```
5. Open `index.html` in a browser, click **Sign Up**, and create an
   account with your name, email, and a password.

By default Supabase requires confirming your email before you can log in.
For quick local testing you can turn this off under **Authentication →
Providers → Email → "Confirm email"**.

## How auth and data work
- **Accounts**: handled entirely by Supabase Auth (email + password). This
  app never sees or stores your password itself.
- **Your name**: saved on your Supabase user's metadata at sign-up.
- **Your data** (transactions, budgets, goals, accounts, SIPs, debts): saved
  as a single JSON document per user in the `finance_data` table, readable
  and writable only by you (enforced by Row Level Security — see
  `supabase-schema.sql`).
- Because it's a real backend now, your data follows you to any browser or
  device where you log in with the same account — unlike a purely local
  version, nothing is tied to one browser.

## Running it
Just open the top-level `index.html` in a browser (a local static server
like `python3 -m http.server` also works, and is required on some browsers
for `fetch`-based scripts to run reliably from `file://`).
