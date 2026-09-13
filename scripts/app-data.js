/* ======================================================================
   FD - Finance Dashboard — app-data.js
   Shared data layer: constants, state, persistence, CRUD.
   Loaded by every page BEFORE app-shell.js / app-analytics.js / the page's
   own script.

   NOTE ON STORAGE: the original single-file version used Claude's
   `window.storage` artifact API. Split into standalone files like this,
   there is no such API, so this version saves everything to the
   browser's own localStorage instead. That means data now lives in
   *this browser, on this device* — open the files from a different
   browser/computer and you'll see empty profiles, same as before.
   ====================================================================== */

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------
const PROFILES_KEY = 'finance-profiles';
const CURRENT_PROFILE_KEY = 'finance-current-profile-id';
const dataKey = () => `finance-data-${currentProfileId}`;

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
// filename each tab lives in — kept separate from the label in case a page is ever renamed
const TAB_PAGES = { overview: 'overview.html', income: 'income.html', transactions: 'transactions.html', savings: 'savings.html', accounts: 'accounts.html', debt: 'debt.html', insights: 'insights.html' };

// ----------------------------------------------------------------------
// Mutable app state
// ----------------------------------------------------------------------
function emptyState(){
  return { transactions: [], budgets: [], goals: [], accounts: [], sips: [], debts: [] };
}
let state = emptyState();
let filters = { search: '', type: 'all', category: 'all', account: 'all', direction: 'all' };
let profiles = [];
let currentProfileId = localStorage.getItem(CURRENT_PROFILE_KEY) || null;

// Each page sets this to its own "re-render my content" function right after
// it builds its DOM, so that CRUD calls below can refresh the view in place
// instead of every button needing its own re-render logic.
let onStateChange = null;
function notifyChange(){ if(typeof onStateChange === 'function') onStateChange(); }

// ----------------------------------------------------------------------
// Small utilities
// ----------------------------------------------------------------------
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function fmt(n){
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtCompact(n){
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if(abs >= 1000) return sign + '$' + (abs/1000).toFixed(1) + 'k';
  return sign + '$' + abs.toFixed(0);
}
function svgIcon(name){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}
function monthLabel(){ return new Date().toLocaleDateString(undefined, { month:'long', year:'numeric' }); }
function parseLocalDate(dateStr){ return new Date(dateStr + 'T00:00:00'); }
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
// Profile persistence (localStorage)
// ----------------------------------------------------------------------
function loadProfiles(){
  try{
    const raw = localStorage.getItem(PROFILES_KEY);
    profiles = raw ? JSON.parse(raw) : [];
  }catch(e){
    profiles = [];
  }
}
function saveProfiles(){
  try{ localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); }
  catch(e){ console.error('Failed to save profiles', e); }
}

function setCurrentProfile(id){
  currentProfileId = id;
  if(id) localStorage.setItem(CURRENT_PROFILE_KEY, id);
  else localStorage.removeItem(CURRENT_PROFILE_KEY);
}

function loadProfileData(){
  try{
    const raw = localStorage.getItem(dataKey());
    if(raw){
      const parsed = JSON.parse(raw);
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
    state = emptyState();
  }

  // Seed sensible default accounts on first use, and backfill anything
  // saved before a field existed so older data keeps working.
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
  if(needsSave) save();
}

function save(){
  try{ localStorage.setItem(dataKey(), JSON.stringify(state)); }
  catch(e){ console.error('Failed to save profile data', e); }
}

// ---- Profile actions ----
function createProfile(name, pin, phone){
  loadProfiles();
  const p = { id: uid(), name, pin, phone: phone || '' };
  profiles.push(p);
  saveProfiles();
  setCurrentProfile(p.id);
  loadProfileData();
  window.location.href = 'overview.html';
}
function deleteProfile(id){
  loadProfiles();
  const p = profiles.find(x => x.id === id);
  if(!p) return;
  if(!confirm(`Remove "${p.name}" and permanently delete all of their data? This cannot be undone.`)) return;
  profiles = profiles.filter(x => x.id !== id);
  saveProfiles();
  try{ localStorage.removeItem(`finance-data-${id}`); }catch(e){ /* nothing stored yet, fine */ }
  if(currentProfileId === id){
    logout(); // deleting your own active profile logs you out
    return;
  }
  notifyChange();
}
function logout(){
  setCurrentProfile(null);
  window.location.href = 'login.html';
}
function clearAll(){
  if(!confirm("Clear all of this profile's transactions, budgets, goals, accounts, and SIPs? This cannot be undone.")) return;
  state = emptyState();
  save();
  loadProfileData();
  notifyChange();
}

// ----------------------------------------------------------------------
// Data mutations (transactions, budgets, goals, accounts, SIPs, debts)
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
    id: uid(), type: 'saving', date: new Date().toISOString().slice(0,10),
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
    id: uid(), type: 'investment', date: new Date().toISOString().slice(0,10),
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
    id: uid(), type: 'expense', date: new Date().toISOString().slice(0,10),
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
