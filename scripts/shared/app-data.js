/* ======================================================================
   Money Manager — app-data.js
   Shared data layer: constants, state, persistence (Supabase), CRUD.
   Loaded by every page AFTER supabase-client.js and BEFORE app-shell.js /
   app-analytics.js / the page's own script.

   PERSISTENCE: accounts and sessions are handled by Supabase Auth
   (email + password). Each signed-in user's whole finance dataset
   (transactions, budgets, goals, accounts, SIPs, debts) is stored as one
   JSON document in the `finance_data` table — see supabase-schema.sql.
   ====================================================================== */

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------
const EXPENSE_CATS = ['Housing','Rent/Mortgage','Utilities','Groceries','Dining Out','Transport','Fuel','Insurance','Health & Medical','Fitness','Education','Childcare','Pets','Entertainment','Subscriptions','Shopping','Clothing','Personal Care','Travel','Gifts & Donations','Taxes','Debt Payment','Bills & Fees','Home Maintenance','Electronics','Other'];
const INCOME_CATS = ['Salary','Bonus','Freelance','Business Income','Investment','Dividends','Interest','Rental Income','Gift','Refund','Government Benefit','Pension','Other'];
const INVESTMENT_CATS = ['Stocks','Mutual Funds','ETFs','Crypto','Real Estate','Bonds','Retirement (401k/IRA)','Gold & Commodities','Fixed Deposit','PPF','Startup/Private Equity','Other'];
const ACCOUNT_TYPES = ['Cash','Bank','UPI','Net Banking','RTGS','Checking','Savings','Credit Card','Other'];
const PALETTE = ['#AD8A3B','#93233F','#0E6B5C','#5B3A8E','#6B6558','#3B5B78','#8C6E4F','#4F6F52'];

const ICONS = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  income: '<polyline points="4,17 10,11 14,15 20,7"/><polyline points="14,7 20,7 20,13"/>',
  transactions: '<circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none"/><line x1="9" y1="6" x2="21" y2="6"/><circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none"/><line x1="9" y1="12" x2="21" y2="12"/><circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none"/><line x1="9" y1="18" x2="21" y2="18"/>',
  savings: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  accounts: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><line x1="2.5" y1="10.5" x2="21.5" y2="10.5"/>',
  debt: '<rect x="2.5" y="4" width="19" height="16" rx="2.2"/><line x1="7" y1="14.5" x2="17" y2="14.5"/>',
  insights: '<line x1="4" y1="20" x2="4" y2="12"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="22" y1="20" x2="22" y2="8"/>'
};
const TAB_LABELS = { overview: 'Overview', income: 'Income', transactions: 'Transactions', savings: 'Savings', accounts: 'Accounts', debt: 'Debt', insights: 'Insights' };
const TAB_PAGES = { overview: 'overview.html', income: 'income.html', transactions: 'transactions.html', savings: 'savings.html', accounts: 'accounts.html', debt: 'debt.html', insights: 'insights.html' };

// ----------------------------------------------------------------------
// Mutable app state
// ----------------------------------------------------------------------
function emptyState(){
  return { transactions: [], budgets: [], goals: [], accounts: [], sips: [], debts: [] };
}
let state = emptyState();
let filters = { search: '', type: 'all', category: 'all', account: 'all', direction: 'all' };

// The signed-in Supabase user, set by initPage()/login.js once a session
// is confirmed: { id, email, name }
let currentUser = null;

// Which ledger is active right now: 'personal' or 'business'. Personal and
// Business are fully separate — separate accounts (each gets its own Cash/
// Bank/UPI), separate transactions, budgets, goals, debts, SIPs, and
// separate Excel export/import. Kept in localStorage since it's just a UI
// preference (which ledger you're looking at), not sensitive data — it
// needs to survive full page navigation since this is a multi-page site.
const BOOK_LABELS = { personal: 'Personal', business: 'Business' };
let currentBook = localStorage.getItem('finance-current-book') || 'personal';
function setCurrentBook(book){
  currentBook = book;
  localStorage.setItem('finance-current-book', book);
}

// Each page sets this to its own "re-render my content" function right after
// it builds its DOM, so that CRUD calls below can refresh the view in place.
let onStateChange = null;
function notifyChange(){ if(typeof onStateChange === 'function') onStateChange(); }

// ----------------------------------------------------------------------
// Small utilities
// ----------------------------------------------------------------------
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function fmt(n){
  const sign = n < 0 ? '-' : '';
  return sign + '₹' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtCompact(n){
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if(abs >= 1000) return sign + '₹' + (abs/1000).toFixed(1) + 'k';
  return sign + '₹' + abs.toFixed(0);
}
function svgIcon(name){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}
function monthLabel(){ return new Date().toLocaleDateString(undefined, { month:'long', year:'numeric' }); }
// Accepts either a plain "YYYY-MM-DD" date or a full ISO timestamp
// ("YYYY-MM-DDTHH:MM:SS") — the latter is what new entries store now so
// they carry a time, not just a date.
function parseLocalDate(dateStr){
  if(!dateStr) return new Date(NaN);
  if(String(dateStr).includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00');
}
// Full "Month D, YYYY, h:mm AM/PM" display used everywhere a transaction's
// date is shown.
function fmtDateTime(dateStr){
  return parseLocalDate(dateStr).toLocaleString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
// Shorter "Mon D, YYYY, h:mm AM/PM" variant for tighter table rows.
function fmtDateTimeShort(dateStr){
  return parseLocalDate(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function isThisMonth(dateStr){
  const d = parseLocalDate(dateStr); const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
function isPrevMonth(dateStr){
  const d = parseLocalDate(dateStr); const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth()-1, 1);
  return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
}
function pctChange(curr, prev){
  if(prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
function initials(name){ return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join(''); }
function colorFor(i){ return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length]; }
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function accountName(id){ const a = state.accounts.find(a => a.id === id); return a ? a.name : 'Unassigned'; }
function accountBalance(a){
  const delta = state.transactions
    .filter(t => t.accountId === a.id)
    .reduce((s,t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
  return (a.startingBalance || 0) + delta;
}
function accountOptions(selectedId){
  return state.accounts.map(a => `<option value="${a.id}" ${a.id===selectedId?'selected':''}>${escapeHtml(a.name)}</option>`).join('');
}
function categoryOptionsFor(type){
  if(type === 'income') return INCOME_CATS;
  if(type === 'investment') return INVESTMENT_CATS;
  if(type === 'saving') return state.goals.length ? state.goals.map(g => g.name) : ['General savings'];
  return EXPENSE_CATS;
}

// ----------------------------------------------------------------------
// Auth (Supabase)
// ----------------------------------------------------------------------
// Wraps a promise so that a stalled network call (no response, no error —
// which the Supabase client doesn't time out on by itself) fails visibly
// after `ms` instead of leaving the page stuck on "Loading…" forever.
function withTimeout(promise, ms, message){
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Resolves the current session, if any, and sets `currentUser`. Returns
// the Supabase user object, or null if nobody is signed in.
async function getCurrentUser(){
  const { data: { session }, error } = await sb.auth.getSession();
  if(error || !session){ currentUser = null; return null; }
  const u = session.user;
  currentUser = { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email };
  return currentUser;
}

async function signUp(name, email, password){
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { name } }
  });
  if(error) return { error };
  // Projects with "Confirm email" ON return a user but no session yet.
  if(!data.session) return { needsEmailConfirmation: true };
  await getCurrentUser();
  await loadProfileData();
  return { ok: true };
}
async function signIn(email, password){
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) return { error };
  currentUser = { id: data.user.id, email: data.user.email, name: (data.user.user_metadata && data.user.user_metadata.name) || data.user.email };
  await loadProfileData();
  return { ok: true };
}
async function signOut(){
  await sb.auth.signOut();
  currentUser = null;
  state = emptyState();
  window.location.href = 'login.html';
}

// ----------------------------------------------------------------------
// Data persistence (Supabase `finance_data` table — one JSON row per
// user PER BOOK: (user_id, book) is the primary key, so Personal and
// Business are two totally independent rows).
// ----------------------------------------------------------------------
async function loadProfileData(){
  if(!currentUser){ state = emptyState(); return; }
  try{
    const { data, error } = await sb
      .from('finance_data')
      .select('data')
      .eq('user_id', currentUser.id)
      .eq('book', currentBook)
      .maybeSingle();
    if(error) throw error;
    if(data && data.data){
      const parsed = data.data;
      state = {
        transactions: parsed.transactions || [],
        budgets: parsed.budgets || [],
        goals: parsed.goals || [],
        accounts: parsed.accounts || [],
        sips: parsed.sips || [],
        debts: parsed.debts || []
      };
    }else{
      state = emptyState();
    }
  }catch(e){
    console.error('Failed to load finance data', e);
    state = emptyState();
  }

  // Seed sensible default accounts on first use of THIS book, and backfill
  // anything saved before a field existed so older data keeps working.
  let needsSave = false;
  if(state.accounts.length === 0){
    state.accounts.push({ id: uid(), name: 'Cash', type: 'Cash', startingBalance: 0 });
    needsSave = true;
  }
  ['Bank','UPI'].forEach(name => {
    if(!state.accounts.some(a => a.name === name)){
      state.accounts.push({ id: uid(), name, type: name, startingBalance: 0 });
      needsSave = true;
    }
  });
  const defaultAccountId = state.accounts[0].id;
  state.transactions.forEach(t => {
    if(!t.accountId){ t.accountId = defaultAccountId; needsSave = true; }
  });

  filters = { search: '', type: 'all', category: 'all', account: 'all', direction: 'all' };
  if(needsSave) await save();
}

// Fire-and-forget upsert: the UI updates instantly from in-memory `state`;
// this writes it to Supabase in the background. Errors are logged, not
// thrown, so a flaky connection never blocks the page.
async function save(){
  if(!currentUser) return;
  try{
    const { error } = await sb
      .from('finance_data')
      .upsert({ user_id: currentUser.id, book: currentBook, data: state }, { onConflict: 'user_id,book' });
    if(error) throw error;
  }catch(e){
    console.error('Failed to save finance data', e);
  }
}

function clearAll(){
  if(!confirm(`Clear all of your ${BOOK_LABELS[currentBook]} transactions, budgets, goals, accounts, and SIPs? This cannot be undone.`)) return;
  state = emptyState();
  save();
  loadProfileData().then(notifyChange);
}

// ----------------------------------------------------------------------
// Data mutations (transactions, budgets, goals, accounts, SIPs, debts)
// Each mutates in-memory `state`, saves to Supabase, then refreshes the UI.
// ----------------------------------------------------------------------
function addTransaction(t){
  state.transactions.unshift(t);
  if(t.type === 'saving' && t.goalId){
    const goal = state.goals.find(g => g.id === t.goalId);
    if(goal) goal.saved += t.amount;
  }
  save();
  notifyChange();
}
function deleteTransaction(id){
  const t = state.transactions.find(x => x.id === id);
  if(t && t.type === 'saving' && t.goalId){
    const goal = state.goals.find(g => g.id === t.goalId);
    if(goal) goal.saved = Math.max(0, goal.saved - t.amount);
  }
  state.transactions = state.transactions.filter(x => x.id !== id);
  save();
  notifyChange();
}

function addBudget(category, limit){
  state.budgets = state.budgets.filter(b => b.category !== category);
  state.budgets.push({ category, limit });
  save();
  notifyChange();
}

function addGoal(name, target){
  state.goals.push({ id: uid(), name, target, saved: 0 });
  save();
  notifyChange();
}
function deleteGoal(id){
  if(!confirm('Delete this goal? Its contribution history stays in Transactions, but will no longer be linked.')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  save();
  notifyChange();
}
function contributeToGoal(goalId, amount, accountId){
  const goal = state.goals.find(g => g.id === goalId);
  if(!goal) return;
  addTransaction({
    id: uid(), type: 'saving', date: new Date().toISOString(),
    note: 'Contribution to ' + goal.name, category: goal.name, amount, goalId, accountId
  });
}

function addAccount(name, type, startingBalance){
  state.accounts.push({ id: uid(), name, type, startingBalance: startingBalance || 0 });
  save();
  notifyChange();
}
function deleteAccount(id){
  if(state.accounts.length === 1){ alert('You need at least one account. Add another before removing this one.'); return; }
  const linkedCount = state.transactions.filter(t => t.accountId === id).length;
  const msg = linkedCount > 0
    ? `This account has ${linkedCount} transaction${linkedCount === 1 ? '' : 's'}. Deleting it will unlink them — they'll stay in your history but won't count toward any account balance. Continue?`
    : 'Delete this account?';
  if(!confirm(msg)) return;
  state.transactions.forEach(t => { if(t.accountId === id) t.accountId = null; });
  state.accounts = state.accounts.filter(a => a.id !== id);
  save();
  notifyChange();
}

function addSIP(name, fundType, monthlyAmount, accountId){
  state.sips.push({ id: uid(), name, fundType, monthlyAmount, accountId, startDate: new Date().toISOString().slice(0,10) });
  save();
  notifyChange();
}
function deleteSIP(id){
  if(!confirm('Delete this SIP? Past contributions stay in Transactions but will no longer be linked.')) return;
  state.sips = state.sips.filter(s => s.id !== id);
  save();
  notifyChange();
}
function logSIPContribution(sipId){
  const sip = state.sips.find(s => s.id === sipId);
  if(!sip) return;
  addTransaction({
    id: uid(), type: 'investment', date: new Date().toISOString(),
    note: 'SIP: ' + sip.name, category: sip.fundType, amount: sip.monthlyAmount,
    accountId: sip.accountId, goalId: null, sipId: sip.id
  });
}
function sipTotals(sip){
  const txns = state.transactions.filter(t => t.sipId === sip.id);
  return { total: txns.reduce((s,t) => s + t.amount, 0), count: txns.length };
}

function addDebt(name, balance, apr, minPayment){
  state.debts.push({ id: uid(), name, balance, apr, minPayment });
  save();
  notifyChange();
}
function deleteDebt(id){
  if(!confirm('Delete this debt? Past payments stay in Transactions but will no longer be linked.')) return;
  state.debts = state.debts.filter(d => d.id !== id);
  save();
  notifyChange();
}
function makeDebtPayment(debtId, amount, accountId){
  const debt = state.debts.find(d => d.id === debtId);
  if(!debt) return;
  debt.balance = Math.max(0, debt.balance - amount);
  addTransaction({
    id: uid(), type: 'expense', date: new Date().toISOString(),
    note: 'Debt payment: ' + debt.name, category: 'Debt Payment', amount,
    accountId, goalId: null, debtId: debt.id
  });
}
// Standard amortization: months to pay off a balance at a fixed monthly payment
function payoffMonths(balance, apr, payment){
  if(balance <= 0) return 0;
  if(!payment || payment <= 0) return null;
  const r = (apr || 0) / 100 / 12;
  if(r === 0) return Math.ceil(balance / payment);
  if(payment <= balance * r) return null; // payment never covers interest — balance never shrinks
  const n = Math.log(payment / (payment - balance * r)) / Math.log(1 + r);
  return Math.ceil(n);
}
function debtPayoffInfo(d){
  const months = payoffMonths(d.balance, d.apr, d.minPayment);
  if(months === null) return { months: null };
  if(months === 0) return { months: 0, done: true };
  const totalPaid = d.minPayment * months;
  const totalInterest = Math.max(0, totalPaid - d.balance);
  const eta = new Date(); eta.setMonth(eta.getMonth() + months);
  return { months, totalInterest, etaLabel: eta.toLocaleDateString(undefined, { month:'short', year:'numeric' }) };
}
function totalDebt(){ return state.debts.reduce((s,d) => s + d.balance, 0); }

// ----------------------------------------------------------------------
// Excel import / export
// Uses the SheetJS "xlsx" library, loaded via CDN as the global `XLSX` on
// pages that offer this feature (see transactions.html). Export writes
// every part of your data to a workbook with one sheet per data type;
// import reads that same shape back in, so round-tripping (export, edit
// in Excel, re-import) works, and matching accounts/goals/debts/SIPs by
// name means you can add new rows in Excel and import just those too.
// ----------------------------------------------------------------------
function buildWorkbook(){
  const wb = XLSX.utils.book_new();

  const txnRows = state.transactions.map(t => ({
    Date: t.date,
    Type: t.type,
    Category: t.category,
    Note: t.note || '',
    Amount: t.amount,
    Account: accountName(t.accountId)
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txnRows), 'Transactions');

  const acctRows = state.accounts.map(a => ({ Name: a.name, Type: a.type, 'Starting Balance': a.startingBalance || 0 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acctRows), 'Accounts');

  const goalRows = state.goals.map(g => ({ Name: g.name, Target: g.target, Saved: g.saved }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalRows), 'Goals');

  const debtRows = state.debts.map(d => ({ Name: d.name, Balance: d.balance, 'APR %': d.apr, 'Monthly Payment': d.minPayment }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtRows), 'Debts');

  const sipRows = state.sips.map(s => ({ Name: s.name, 'Fund Type': s.fundType, 'Monthly Amount': s.monthlyAmount, Account: accountName(s.accountId) }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sipRows), 'SIPs');

  const budgetRows = state.budgets.map(b => ({ Category: b.category, 'Monthly Limit': b.limit }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetRows), 'Budgets');

  return wb;
}

function exportToExcel(){
  const wb = buildWorkbook();
  const filename = `money-manager-${currentBook}-${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function findOrCreateAccountByName(name, added){
  const trimmed = String(name || '').trim();
  if(!trimmed) return state.accounts[0].id;
  let acct = state.accounts.find(a => a.name.toLowerCase() === trimmed.toLowerCase());
  if(!acct){
    acct = { id: uid(), name: trimmed, type: 'Other', startingBalance: 0 };
    state.accounts.push(acct);
    if(added) added.accounts++;
  }
  return acct.id;
}

const VALID_TXN_TYPES = ['income', 'expense', 'saving', 'investment'];

// The sheet names our own Export produces. If a workbook has none of these,
// it isn't a round-tripped export — fall through to the generic importer
// below instead, which works on an arbitrary spreadsheet.
const APP_EXPORT_SHEETS = ['Transactions', 'Accounts', 'Goals', 'Debts', 'SIPs', 'Budgets'];

// Reads any workbook and adds what it can. If the file matches this app's
// own Export layout (sheet names Transactions/Accounts/etc.), every part of
// it is imported precisely. Otherwise the first sheet is scanned as a plain
// transaction list, auto-detecting Date/Amount/Type/Category/Note/Account
// columns from common header names, so "any Excel file" works too.
function importFromWorkbook(wb){
  const isAppExport = APP_EXPORT_SHEETS.some(name => wb.Sheets && wb.Sheets[name]);
  return isAppExport ? importFromAppFormat(wb) : importFromGenericSheet(wb);
}

// Reads a workbook (in the same shape buildWorkbook() writes) and merges it
// into the current account: existing accounts/goals/debts/SIPs are matched
// by name and left alone (never overwritten), new ones are created;
// budgets are upserted by category; every transaction row becomes a new
// transaction. Returns counts so the caller can show a summary.
function importFromAppFormat(wb){
  const sheet = (name) => wb.Sheets[name] ? XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' }) : [];
  const added = { accounts: 0, goals: 0, debts: 0, sips: 0, budgets: 0, transactions: 0 };
  let skipped = 0;

  // Accounts first, so transactions/SIPs below can reference them by name.
  sheet('Accounts').forEach(row => {
    const name = String(row.Name || '').trim();
    if(!name) return;
    if(!state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())){
      state.accounts.push({ id: uid(), name, type: String(row.Type || 'Other'), startingBalance: Number(row['Starting Balance']) || 0 });
      added.accounts++;
    }
  });

  sheet('Goals').forEach(row => {
    const name = String(row.Name || '').trim();
    if(!name) return;
    if(!state.goals.some(g => g.name.toLowerCase() === name.toLowerCase())){
      state.goals.push({ id: uid(), name, target: Number(row.Target) || 0, saved: Number(row.Saved) || 0 });
      added.goals++;
    }
  });

  sheet('Debts').forEach(row => {
    const name = String(row.Name || '').trim();
    if(!name) return;
    if(!state.debts.some(d => d.name.toLowerCase() === name.toLowerCase())){
      state.debts.push({ id: uid(), name, balance: Number(row.Balance) || 0, apr: Number(row['APR %']) || 0, minPayment: Number(row['Monthly Payment']) || 0 });
      added.debts++;
    }
  });

  sheet('SIPs').forEach(row => {
    const name = String(row.Name || '').trim();
    if(!name) return;
    if(!state.sips.some(s => s.name.toLowerCase() === name.toLowerCase())){
      const accountId = findOrCreateAccountByName(row.Account, added);
      state.sips.push({ id: uid(), name, fundType: String(row['Fund Type'] || 'Mutual Funds'), monthlyAmount: Number(row['Monthly Amount']) || 0, accountId, startDate: new Date().toISOString().slice(0,10) });
      added.sips++;
    }
  });

  sheet('Budgets').forEach(row => {
    const category = String(row.Category || '').trim();
    const limit = Number(row['Monthly Limit']);
    if(!category || !limit) return;
    state.budgets = state.budgets.filter(b => b.category !== category);
    state.budgets.push({ category, limit });
    added.budgets++;
  });

  sheet('Transactions').forEach(row => {
    const type = String(row.Type || '').trim().toLowerCase();
    const amount = Number(row.Amount);
    let date = row.Date;
    if(typeof date === 'number'){
      // Excel serial date number (SheetJS gives one if cellDates wasn't set)
      const d = XLSX.SSF.parse_date_code(date);
      date = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }else if(date instanceof Date){
      date = date.toISOString();
    }else{
      date = String(date || '').trim();
    }
    if(!VALID_TXN_TYPES.includes(type) || !amount || !date){ skipped++; return; }
    const accountId = findOrCreateAccountByName(row.Account, added);
    const category = String(row.Category || 'Other').trim();
    let goalId = null;
    if(type === 'saving'){
      const goal = state.goals.find(g => g.name.toLowerCase() === category.toLowerCase());
      if(goal){
        goalId = goal.id;
        goal.saved += amount;
      }
    }
    state.transactions.unshift({ id: uid(), type, date, note: String(row.Note || ''), category, amount, accountId, goalId });
    added.transactions++;
  });

  save();
  notifyChange();
  return { added, skipped };
}

// ----------------------------------------------------------------------
// Generic import: any spreadsheet with a date and an amount somewhere in
// it. Auto-detects likely column meanings from common header names (works
// with bank/UPI exports, budgeting-app exports, hand-built sheets, etc.)
// rather than requiring this app's own template.
// ----------------------------------------------------------------------
const IMPORT_HEADER_ALIASES = {
  date: ['date', 'txn date', 'transaction date', 'value date', 'posted date', 'posting date'],
  amount: ['amount', 'amt', 'value', 'transaction amount', 'txn amount'],
  debit: ['debit', 'withdrawal', 'debit amount', 'dr', 'paid out', 'money out'],
  credit: ['credit', 'deposit', 'credit amount', 'cr', 'paid in', 'money in'],
  type: ['type', 'txn type', 'transaction type', 'dr/cr', 'entry type'],
  category: ['category', 'cat', 'tag', 'tags'],
  note: ['note', 'notes', 'description', 'narration', 'particulars', 'remark', 'remarks', 'details', 'memo'],
  account: ['account', 'account name', 'acc', 'bank', 'wallet', 'source']
};

function normalizeHeader(h){ return String(h == null ? '' : h).trim().toLowerCase(); }

function findImportColumn(headers, aliases){
  return headers.find(h => aliases.includes(normalizeHeader(h)));
}

function parseImportDate(raw){
  if(typeof raw === 'number'){
    const d = XLSX.SSF.parse_date_code(raw);
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}T${String(d.H||0).padStart(2,'0')}:${String(d.M||0).padStart(2,'0')}:00`;
  }
  if(raw instanceof Date) return raw.toISOString();
  const str = String(raw == null ? '' : raw).trim();
  if(!str) return '';
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? str : parsed.toISOString();
}

function parseImportAmount(raw){
  if(typeof raw === 'number') return raw;
  const cleaned = String(raw == null ? '' : raw).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function importFromGenericSheet(wb){
  const added = { accounts: 0, goals: 0, debts: 0, sips: 0, budgets: 0, transactions: 0 };
  let skipped = 0;

  const sheetName = (wb.SheetNames && wb.SheetNames[0]) || Object.keys(wb.Sheets || {})[0];
  const sheetObj = sheetName ? wb.Sheets[sheetName] : null;
  if(!sheetObj) return { added, skipped, error: "That file doesn't seem to have any sheets." };

  const rows = XLSX.utils.sheet_to_json(sheetObj, { defval: '' });
  if(!rows.length) return { added, skipped, error: 'That sheet looks empty.' };

  const headers = Object.keys(rows[0]);
  const col = {
    date: findImportColumn(headers, IMPORT_HEADER_ALIASES.date),
    amount: findImportColumn(headers, IMPORT_HEADER_ALIASES.amount),
    debit: findImportColumn(headers, IMPORT_HEADER_ALIASES.debit),
    credit: findImportColumn(headers, IMPORT_HEADER_ALIASES.credit),
    type: findImportColumn(headers, IMPORT_HEADER_ALIASES.type),
    category: findImportColumn(headers, IMPORT_HEADER_ALIASES.category),
    note: findImportColumn(headers, IMPORT_HEADER_ALIASES.note),
    account: findImportColumn(headers, IMPORT_HEADER_ALIASES.account)
  };

  if(!col.date || (!col.amount && !col.debit && !col.credit)){
    return { added, skipped, error: "Couldn't find a date column and an amount (or debit/credit) column in this file. Rename your columns to something like \"Date\" and \"Amount\" and try again." };
  }

  // Every imported row needs an account to land in; reuse the first
  // existing one, or create a placeholder "Imported" account if there is
  // none yet, so nothing is silently dropped.
  let defaultAccountId = state.accounts[0] ? state.accounts[0].id : null;
  if(!defaultAccountId){
    const acct = { id: uid(), name: 'Imported', type: 'Other', startingBalance: 0 };
    state.accounts.push(acct);
    added.accounts++;
    defaultAccountId = acct.id;
  }

  rows.forEach(row => {
    const date = parseImportDate(row[col.date]);

    let amount = 0, type = '';
    if(col.debit || col.credit){
      const debit = parseImportAmount(row[col.debit]);
      const credit = parseImportAmount(row[col.credit]);
      if(credit > 0){ amount = credit; type = 'income'; }
      else if(debit > 0){ amount = debit; type = 'expense'; }
    }else{
      const raw = parseImportAmount(row[col.amount]);
      amount = Math.abs(raw);
      type = raw < 0 ? 'expense' : 'income';
    }

    // An explicit Type/Dr-Cr column, when present, overrides the sign guess above.
    if(col.type){
      const t = normalizeHeader(row[col.type]);
      if(VALID_TXN_TYPES.includes(t)) type = t;
      else if(['credit', 'cr', 'deposit', 'in', 'income'].includes(t)) type = 'income';
      else if(['debit', 'dr', 'withdrawal', 'out', 'expense'].includes(t)) type = 'expense';
    }
    if(!type) type = 'expense';

    if(!date || !amount){ skipped++; return; }

    let accountId = defaultAccountId;
    if(col.account && String(row[col.account]).trim()){
      accountId = findOrCreateAccountByName(row[col.account], added);
    }

    const category = (col.category && String(row[col.category]).trim()) || 'Other';
    const note = (col.note && String(row[col.note]).trim()) || '';

    state.transactions.unshift({ id: uid(), type, date, note, category, amount, accountId, goalId: null });
    added.transactions++;
  });

  save();
  notifyChange();
  return { added, skipped };
}
