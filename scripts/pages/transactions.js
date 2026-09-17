/* Transactions page: filterable ledger + the add-entry form. */

let addOpen = false;
let entryType = 'expense';

function renderTransactions(){
  const root = document.getElementById('root');
  const filtered = state.transactions.filter(t => {
    if(filters.type !== 'all' && t.type !== filters.type) return false;
    if(filters.category !== 'all' && t.category !== filters.category) return false;
    if(filters.account !== 'all' && t.accountId !== filters.account) return false;
    if(filters.direction === 'credit' && t.type !== 'income') return false;
    if(filters.direction === 'debit' && t.type === 'income') return false;
    if(filters.search){
      const s = filters.search.toLowerCase();
      const noteMatch = (t.note || '').toLowerCase().includes(s);
      const catMatch = (t.category || '').toLowerCase().includes(s);
      if(!noteMatch && !catMatch) return false;
    }
    return true;
  });
  const allCats = filters.type === 'all'
    ? [...new Set([...EXPENSE_CATS, ...INCOME_CATS, ...INVESTMENT_CATS, ...state.transactions.map(t => t.category)])].sort((a,b) => a.localeCompare(b))
    : [...new Set([...categoryOptionsFor(filters.type), ...state.transactions.filter(t => t.type === filters.type).map(t => t.category)])];

  root.innerHTML = `
    <div class="section-box">
      <div class="section-head">
        <h2>Transactions</h2>
        <div class="filters">
          <input id="searchInput" type="text" placeholder="Search notes or category" value="${escapeHtml(filters.search)}">
          <select id="typeFilter">
            <option value="all" ${filters.type==='all'?'selected':''}>All types</option>
            <option value="income" ${filters.type==='income'?'selected':''}>Income</option>
            <option value="expense" ${filters.type==='expense'?'selected':''}>Expense</option>
            <option value="saving" ${filters.type==='saving'?'selected':''}>Saving</option>
            <option value="investment" ${filters.type==='investment'?'selected':''}>Investment</option>
          </select>
          <select id="catFilter"><option value="all">All categories</option>${allCats.map(c => `<option value="${c}" ${filters.category===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select>
          <select id="acctFilter"><option value="all">All accounts</option>${state.accounts.map(a => `<option value="${a.id}" ${filters.account===a.id?'selected':''}>${escapeHtml(a.name)}</option>`).join('')}</select>
          <select id="directionFilter">
            <option value="all" ${filters.direction==='all'?'selected':''}>Credit &amp; Debit</option>
            <option value="credit" ${filters.direction==='credit'?'selected':''}>Credit (money in)</option>
            <option value="debit" ${filters.direction==='debit'?'selected':''}>Debit (money out)</option>
          </select>
        </div>
      </div>

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin: -6px 0 16px;">
        <button class="btn-ghost" id="exportExcelBtn">⬇ Export to Excel</button>
        <button class="btn-ghost" id="importExcelBtn">⬆ Import from Excel</button>
        <input type="file" id="importExcelInput" accept=".xlsx,.xls" style="display:none">
        <span class="panel-sub" style="margin:0;">Export gives you the exact column layout to fill in and re-import.</span>
      </div>

      <div class="form-panel ${addOpen ? 'open' : ''}" id="addEntryPanel">
        <div class="toggle-pills">
          <button class="pill ${entryType==='income'?'active-income':''}" id="pillIncome">Income</button>
          <button class="pill ${entryType==='expense'?'active-expense':''}" id="pillExpense">Expense</button>
          <button class="pill ${entryType==='saving'?'active-saving':''}" id="pillSaving">Saving</button>
          <button class="pill ${entryType==='investment'?'active-investment':''}" id="pillInvestment">Investment</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Date</label><input type="date" id="fDate" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="field"><label>Description</label><input type="text" id="fNote" placeholder="e.g. Groceries"></div>
          <div class="field"><label>Category</label><select id="fCategory">${categoryOptionsFor(entryType).map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
          <div class="field"><label>Account</label><select id="fAccount">${accountOptions()}</select></div>
          <div class="field"><label>Amount</label><input type="number" id="fAmount" placeholder="0.00" min="0" step="0.01"></div>
          <button class="btn-primary" id="submitEntryBtn">Add</button>
        </div>
        <input type="text" id="fCategoryOther" placeholder="Type your own category" style="display:none; margin-top:10px; width:100%; background:var(--surface); border:1px solid var(--border); color:var(--text); padding:8px 10px; border-radius:5px; font-size:12.5px;">
        ${entryType === 'saving' && state.goals.length === 0 ? `<div class="empty-note" style="margin-top:10px">No savings goals yet — this will be tracked as general savings.</div>` : ''}
      </div>

      ${filtered.length === 0 ? `<div class="no-data">No transactions match. ${state.transactions.length === 0 ? 'Add your first entry above.' : ''}</div>` : `
      <div class="panel-sub" style="margin:0 0 10px;">${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'} shown</div>
      <div class="txn-lines">
        ${filtered.map(t => `
          <div class="txn-line">
            <div class="txn-main">
              <div class="txn-desc">${escapeHtml(t.note) || '—'}</div>
              <div class="txn-meta">${parseLocalDate(t.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} · ${escapeHtml(t.category)} · ${escapeHtml(accountName(t.accountId))}</div>
            </div>
            <div class="txn-right">
              <span class="amt ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount).replace('-','')}</span>
              <button class="del-btn" data-id="${t.id}">×</button>
            </div>
          </div>
        `).join('')}
      </div>
      `}
    </div>
  `;

  document.getElementById('searchInput').oninput = (e) => { filters.search = e.target.value; renderTransactions(); };
  document.getElementById('typeFilter').onchange = (e) => { filters.type = e.target.value; filters.category = 'all'; renderTransactions(); };
  document.getElementById('catFilter').onchange = (e) => { filters.category = e.target.value; renderTransactions(); };
  document.getElementById('acctFilter').onchange = (e) => { filters.account = e.target.value; renderTransactions(); };
  document.getElementById('directionFilter').onchange = (e) => { filters.direction = e.target.value; renderTransactions(); };
  document.getElementById('pillIncome').onclick = () => { entryType = 'income'; renderTransactions(); openAddEntry(); };
  document.getElementById('pillExpense').onclick = () => { entryType = 'expense'; renderTransactions(); openAddEntry(); };
  document.getElementById('pillSaving').onclick = () => { entryType = 'saving'; renderTransactions(); openAddEntry(); };
  document.getElementById('pillInvestment').onclick = () => { entryType = 'investment'; renderTransactions(); openAddEntry(); };
  const fCategorySelect = document.getElementById('fCategory');
  const fCategoryOtherInput = document.getElementById('fCategoryOther');
  const toggleFOther = () => { fCategoryOtherInput.style.display = fCategorySelect.value === 'Other' ? 'block' : 'none'; };
  fCategorySelect.onchange = toggleFOther;
  toggleFOther();
  document.getElementById('submitEntryBtn').onclick = () => {
    const date = document.getElementById('fDate').value;
    const note = document.getElementById('fNote').value.trim();
    let category = document.getElementById('fCategory').value;
    if(category === 'Other'){
      const custom = document.getElementById('fCategoryOther').value.trim();
      if(custom) category = custom;
    }
    const accountId = document.getElementById('fAccount').value;
    const amount = parseFloat(document.getElementById('fAmount').value);
    if(!date || !amount || amount <= 0){ alert('Please enter a valid date and amount.'); return; }
    const goal = entryType === 'saving' ? state.goals.find(g => g.name === category) : null;
    addTransaction({ id: uid(), type: entryType, date, note, category, amount, accountId, goalId: goal ? goal.id : null });
    addOpen = false;
  };
  document.querySelectorAll('.del-btn[data-id]').forEach(btn => { btn.onclick = () => deleteTransaction(btn.dataset.id); });

  document.getElementById('exportExcelBtn').onclick = () => exportToExcel();
  document.getElementById('importExcelBtn').onclick = () => document.getElementById('importExcelInput').click();
  document.getElementById('importExcelInput').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try{
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const { added, skipped } = importFromWorkbook(wb);
        const parts = [];
        if(added.transactions) parts.push(`${added.transactions} transaction${added.transactions === 1 ? '' : 's'}`);
        if(added.accounts) parts.push(`${added.accounts} account${added.accounts === 1 ? '' : 's'}`);
        if(added.goals) parts.push(`${added.goals} goal${added.goals === 1 ? '' : 's'}`);
        if(added.debts) parts.push(`${added.debts} debt${added.debts === 1 ? '' : 's'}`);
        if(added.sips) parts.push(`${added.sips} SIP${added.sips === 1 ? '' : 's'}`);
        if(added.budgets) parts.push(`${added.budgets} budget${added.budgets === 1 ? '' : 's'}`);
        const summary = parts.length ? `Imported ${parts.join(', ')}.` : 'Nothing new to import.';
        alert(summary + (skipped ? ` Skipped ${skipped} row(s) with missing/invalid data.` : ''));
      }catch(err){
        console.error('Excel import failed', err);
        alert("Couldn't read that file. Use Export to Excel first to get the exact expected format, then edit and re-import that file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };
}

function openAddEntry(){
  addOpen = true;
  const panel = document.getElementById('addEntryPanel');
  if(panel) panel.classList.add('open');
}

onStateChange = renderTransactions;

initPage({
  tab: 'transactions',
  actionLabel: '+ Add entry',
  onAction: () => { addOpen = !addOpen; renderTransactions(); },
  onReady: () => {
    // Deep link from Overview's "+ Add entry" button: transactions.html?add=1
    if(new URLSearchParams(window.location.search).get('add') === '1') addOpen = true;
    renderTransactions();
  }
});
