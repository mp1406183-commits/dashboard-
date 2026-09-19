/* Debt page: loans/cards with real payoff date + total interest at current payment. */

let debtFormOpen = false;

function renderDebt(){
  const root = document.getElementById('root');
  const total = totalDebt();
  const totalMin = state.debts.reduce((s,d) => s + d.minPayment, 0);
  root.innerHTML = `
    <div class="stats" style="grid-template-columns: 1fr 1fr;">
      <div class="stat-card expense"><div class="label">Total debt</div><div class="value">${fmt(total)}</div></div>
      <div class="stat-card"><div class="label">Monthly minimums</div><div class="value">${fmt(totalMin)}</div></div>
    </div>
    <div class="section-box">
      <div class="section-head"><h2>Debts</h2></div>
      <div class="panel-sub">Track loans and credit card balances — see the real payoff date and total interest at your current payment.</div>
      <div class="form-panel ${debtFormOpen ? 'open' : ''}" id="debtFormPanel">
        <div class="form-grid" style="grid-template-columns: 1.2fr 0.9fr 0.7fr 0.9fr auto;">
          <div class="field"><label>Debt name</label><input type="text" id="dName" placeholder="e.g. Visa Credit Card"></div>
          <div class="field"><label>Current balance</label><input type="number" id="dBalance" placeholder="0.00" min="0" step="0.01"></div>
          <div class="field"><label>APR %</label><input type="number" id="dApr" placeholder="e.g. 22.9" min="0" step="0.1"></div>
          <div class="field"><label>Monthly payment</label><input type="number" id="dPayment" placeholder="0.00" min="0" step="1"></div>
          <button class="btn-primary" id="submitDebtBtn">Add</button>
        </div>
      </div>
      ${state.debts.length === 0 ? `<div class="empty-note">No debts tracked. Add a credit card or loan above to see its real payoff date.</div>` : state.debts.map(d => {
        const info = debtPayoffInfo(d);
        let payoffLine;
        if(d.balance <= 0) payoffLine = `<div class="goal-forecast">✓ Paid off</div>`;
        else if(info.months === null) payoffLine = `<div class="goal-forecast" style="color:var(--expense)">At this payment, the balance will never shrink — interest exceeds the payment.</div>`;
        else payoffLine = `<div class="goal-forecast">Paid off in ${info.months} mo. (~${info.etaLabel}) · ~${fmt(info.totalInterest)} interest total</div>`;
        return `
          <div class="goal-row">
            <div class="goal-main">
              <div class="goal-top">
                <span class="goal-name">${escapeHtml(d.name)}<span class="account-type">${d.apr}% APR</span></span>
                <span class="goal-amt"><span class="saved" style="color:var(--expense)">${fmt(d.balance)}</span> owed</span>
              </div>
              <div class="goal-pct">${fmt(d.minPayment)}/mo payment</div>
              ${payoffLine}
            </div>
            <div class="goal-actions">
              <select class="debtPayAccount" data-debt="${d.id}">${accountOptions()}</select>
              <input type="number" placeholder="Amount" min="0" step="1" class="debtPayInput" data-debt="${d.id}">
              <button class="btn-small debtPayBtn" data-debt="${d.id}">Pay</button>
              <button class="del-btn debtDelBtn" data-debt="${d.id}" style="opacity:1">×</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('submitDebtBtn').onclick = () => {
    const name = document.getElementById('dName').value.trim();
    const balance = parseFloat(document.getElementById('dBalance').value);
    const apr = parseFloat(document.getElementById('dApr').value) || 0;
    const minPayment = parseFloat(document.getElementById('dPayment').value);
    if(!name || isNaN(balance) || balance < 0){ alert('Enter a debt name and a valid balance.'); return; }
    if(!minPayment || minPayment <= 0){ alert('Enter a valid monthly payment.'); return; }
    addDebt(name, balance, apr, minPayment);
    debtFormOpen = false;
  };
  document.querySelectorAll('.debtPayBtn').forEach(btn => {
    btn.onclick = () => {
      const debtId = btn.dataset.debt;
      const input = document.querySelector(`.debtPayInput[data-debt="${debtId}"]`);
      const accountSelect = document.querySelector(`.debtPayAccount[data-debt="${debtId}"]`);
      const amount = parseFloat(input.value);
      if(!amount || amount <= 0){ alert('Enter a valid payment amount.'); return; }
      makeDebtPayment(debtId, amount, accountSelect.value);
    };
  });
  document.querySelectorAll('.debtDelBtn').forEach(btn => { btn.onclick = () => deleteDebt(btn.dataset.debt); });
}

onStateChange = renderDebt;

initPage({
  tab: 'debt',
  actionLabel: '+ Add debt',
  onAction: () => {
    debtFormOpen = !debtFormOpen;
    document.getElementById('debtFormPanel').classList.toggle('open', debtFormOpen);
  },
  onReady: renderDebt
});
