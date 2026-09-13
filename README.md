# FD - Finance Dashboard — multi-page version

The original was one large HTML file with every panel switched by JavaScript.
This version splits it into a real linked multi-page site: each panel is its
own `.html` file with its own `.js`, and the sidebar links between them with
normal `<a href>` navigation.

## Folder structure
```
index.html          — entry point; redirects into pages/
README.md
pages/               — one .html file per panel
  login.html
  overview.html
  income.html
  transactions.html
  savings.html
  accounts.html
  debt.html
  insights.html
scripts/             — one .js file per panel, plus shared logic
  app-data.js         (constants, state, persistence, all create/update/delete logic)
  app-analytics.js    (stats, chart-building, insight generation)
  app-shell.js        (shared chrome: sidebar nav, header, profile badge, login guard)
  login.js / overview.js / income.js / transactions.js / savings.js /
  accounts.js / debt.js / insights.js
styles/
  styles.css          — all styling
```

## What changed under the hood
The original saved data with Claude's `window.storage` artifact API, which
only exists inside a Claude artifact. Standalone files like these have no
such API, so this version saves everything to the browser's own
**localStorage** instead. Practically that means:
- Your profiles and data live in *this browser, on this device*.
- Opening these files in a different browser (or a different computer)
  starts empty — nothing carries over automatically.
- Clearing your browser's site data for these files will erase it.

Everything else — profiles/PINs, transactions, budgets, goals, SIPs,
accounts, debts, and all the charts/insights — works exactly as before.

## Running it
Open `index.html` in a browser — it redirects into `pages/login.html` (or
straight to `pages/overview.html` if you're already signed into a profile).
No build step, no server required (though if your browser is picky about
`file://` pages, running any static file server from this folder — e.g.
`python3 -m http.server` — also works).

