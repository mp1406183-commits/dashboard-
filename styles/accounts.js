/* Accounts page: list of accounts with running balances. */

let accountFormOpen = false;

function renderAccounts(){
  const root = document.getElementById('root');
  const total = state.accounts.reduce((s,a) => s + accountBalance(a), 0);
  root.innerHTML = `
    <div class="stats" style="grid-template-columns: 1fr 1fr;">
      <div class="stat-card"><div class="label">Combined balance</div><div class="value">${fmt(total)}</div></div>
      <div class="stat-card"><div class="label">Accounts</div><div class="value">${state.accounts.length}</div></div>
    </div>
    <div class="section-box">
      <div class="section-head"><h2>Bank accounts</h2></div>
      <div class="form-panel ${accountFormOpen ? 'open' : ''}" id="accountFormPanel">
        <div class="form-grid account-grid">
          <div class="field"><label>Account name</label><input type="text" id="aName" placeholder="e.g. Chase Checking"></div>
          <div class="field"><label>Type</label><select id="aType">${ACCOUNT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
          <div class="field"><label>Starting balance</label><input type="number" id="aBalance" placeholder="0.00" step="0.01"></div>
          <button class="btn-primary" id="submitAccountBtn">Create</button>
        </div>
      </div>
      ${state.accounts.map(a => {
        const bal = accountBalance(a);
        const count = state.transactions.filter(t => t.accountId === a.id).length;
        return `
          <div class="account-row">
            <div class="account-main">
              <div class="account-top"><span class="account-name">${escapeHtml(a.name)}<span class="account-type">${escapeHtml(a.type)}</span></span></div>
              <div class="goal-pct">${count} transaction${count === 1 ? '' : 's'}${a.startingBalance ? ' · starting balance ' + fmt(a.startingBalance) : ''}</div>
            </div>
            <div class="account-actions">
              <span class="account-bal ${bal < 0 ? 'neg' : ''}">${fmt(bal)}</span>
              <button class="del-btn accountDelBtn" data-account="${a.id}" style="opacity:1">×</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('submitAccountBtn').onclick = () => {
    const name = document.getElementById('aName').value.trim();
    const type = document.getElementById('aType').value;
    const startingBalance = parseFloat(document.getElementById('aBalance').value) || 0;
    if(!name){ alert('Enter an account name.'); return; }
    addAccount(name, type, startingBalance);
    accountFormOpen = false;
  };
  document.querySelectorAll('.accountDelBtn').forEach(btn => { btn.onclick = () => deleteAccount(btn.dataset.account); });
}

onStateChange = renderAccounts;

initPage({
  tab: 'accounts',
  actionLabel: '+ New account',
  onAction: () => {
    accountFormOpen = !accountFormOpen;
    document.getElementById('accountFormPanel').classList.toggle('open', accountFormOpen);
  },
  onReady: renderAccounts
});
