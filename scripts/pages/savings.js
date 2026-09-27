/* Savings page: goals (with forecast) and SIPs (recurring mutual-fund plans). */

let goalFormOpen = false;
let sipFormOpen = false;

function renderSavings(){
  const root = document.getElementById('root');
  const totalSaved = state.goals.reduce((s,g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s,g) => s + g.target, 0);

  root.innerHTML = `
    <div class="stats" style="grid-template-columns: 1fr 1fr;">
      <div class="stat-card glow"><div class="label">Total saved</div><div class="value">${fmt(totalSaved)}</div></div>
      <div class="stat-card"><div class="label">Across ${state.goals.length} goal${state.goals.length === 1 ? '' : 's'}</div><div class="value">${fmt(totalTarget)} target</div></div>
    </div>

    <div class="section-box">
      <div class="section-head"><h2>Savings goals</h2></div>
      <div class="form-panel ${goalFormOpen ? 'open' : ''}" id="goalFormPanel">
        <div class="form-grid goal-grid">
          <div class="field"><label>Goal name</label><input type="text" id="gName" placeholder="e.g. Emergency fund"></div>
          <div class="field"><label>Target amount</label><input type="number" id="gTarget" placeholder="0.00" min="0" step="1"></div>
          <button class="btn-primary" id="submitGoalBtn">Create</button>
        </div>
      </div>
      ${state.goals.length === 0 ? `<div class="empty-note">No savings goals yet. Create one above — an emergency fund, a trip, a down payment.</div>` : state.goals.map(g => {
        const pct = Math.min(100, (g.saved / g.target) * 100);
        const f = goalForecast(g);
        let forecastLine = '';
        if(f && f.done) forecastLine = `<div class="goal-forecast">✓ Goal reached</div>`;
        else if(f) forecastLine = `<div class="goal-forecast">Projected: funded by ${f.etaLabel} at ~${fmt(f.avgMonthly)}/mo</div>`;
        return `
          <div class="goal-row">
            <div class="goal-main">
              <div class="goal-top"><span class="goal-name">${escapeHtml(g.name)}</span><span class="goal-amt"><span class="saved">${fmt(g.saved)}</span> / ${fmt(g.target)}</span></div>
              <div class="bar"><div class="bar-fill gold" style="width:${pct}%"></div></div>
              <div class="goal-pct">${pct.toFixed(0)}% funded</div>
              ${forecastLine}
            </div>
            <div class="goal-actions">
              <select class="contribAccount" data-goal="${g.id}">${accountOptions()}</select>
              <input type="number" placeholder="Amount" min="0" step="1" class="contribInput" data-goal="${g.id}">
              <button class="btn-small contribBtn" data-goal="${g.id}">Add</button>
              <button class="del-btn goalDelBtn" data-goal="${g.id}" style="opacity:1">×</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="section-box" style="margin-top:16px;">
      <div class="section-head">
        <h2>SIPs · Mutual Funds</h2>
        <button class="btn-small" id="toggleSipFormBtn">+ New SIP</button>
      </div>
      <div class="panel-sub">Track recurring systematic investment plans — log each month's installment as it happens.</div>
      <div class="form-panel ${sipFormOpen ? 'open' : ''}" id="sipFormPanel">
        <div class="form-grid sip-grid">
          <div class="field"><label>Fund / plan name</label><input type="text" id="sName" placeholder="e.g. Nifty Index Fund"></div>
          <div class="field"><label>Fund type</label><select id="sFundType">${INVESTMENT_CATS.map(c => `<option value="${c}" ${c==='Mutual Funds'?'selected':''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label>Monthly amount</label><input type="number" id="sAmount" placeholder="0.00" min="0" step="1"></div>
          <div class="field"><label>Account</label><select id="sAccount">${accountOptions()}</select></div>
          <button class="btn-primary" id="submitSipBtn">Create</button>
        </div>
      </div>
      ${state.sips.length === 0 ? `<div class="empty-note">No SIPs yet. Set one up to track a recurring mutual fund investment.</div>` : state.sips.map(s => {
        const { total, count } = sipTotals(s);
        return `
          <div class="goal-row">
            <div class="goal-main">
              <div class="goal-top">
                <span class="goal-name">${escapeHtml(s.name)}<span class="account-type">${escapeHtml(s.fundType)}</span></span>
                <span class="goal-amt"><span class="saved">${fmt(total)}</span> invested</span>
              </div>
              <div class="goal-pct">${fmt(s.monthlyAmount)}/mo · ${count} installment${count === 1 ? '' : 's'} logged · via ${escapeHtml(accountName(s.accountId))}</div>
            </div>
            <div class="goal-actions">
              <button class="btn-small sipLogBtn" data-sip="${s.id}">Log this month</button>
              <button class="del-btn sipDelBtn" data-sip="${s.id}" style="opacity:1">×</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('submitGoalBtn').onclick = () => {
    const name = document.getElementById('gName').value.trim();
    const target = parseFloat(document.getElementById('gTarget').value);
    if(!name || !target || target <= 0){ alert('Enter a goal name and a valid target amount.'); return; }
    addGoal(name, target);
    goalFormOpen = false;
  };
  document.querySelectorAll('.contribBtn').forEach(btn => {
    btn.onclick = () => {
      const goalId = btn.dataset.goal;
      const input = document.querySelector(`.contribInput[data-goal="${goalId}"]`);
      const accountSelect = document.querySelector(`.contribAccount[data-goal="${goalId}"]`);
      const amount = parseFloat(input.value);
      if(!amount || amount <= 0){ alert('Enter a valid contribution amount.'); return; }
      contributeToGoal(goalId, amount, accountSelect.value);
    };
  });
  document.querySelectorAll('.goalDelBtn').forEach(btn => { btn.onclick = () => deleteGoal(btn.dataset.goal); });

  document.getElementById('toggleSipFormBtn').onclick = () => {
    sipFormOpen = !sipFormOpen;
    document.getElementById('sipFormPanel').classList.toggle('open', sipFormOpen);
  };
  document.getElementById('submitSipBtn').onclick = () => {
    const name = document.getElementById('sName').value.trim();
    const fundType = document.getElementById('sFundType').value;
    const monthlyAmount = parseFloat(document.getElementById('sAmount').value);
    const accountId = document.getElementById('sAccount').value;
    if(!name || !monthlyAmount || monthlyAmount <= 0){ alert('Enter a plan name and a valid monthly amount.'); return; }
    addSIP(name, fundType, monthlyAmount, accountId);
    sipFormOpen = false;
  };
  document.querySelectorAll('.sipLogBtn').forEach(btn => { btn.onclick = () => logSIPContribution(btn.dataset.sip); });
  document.querySelectorAll('.sipDelBtn').forEach(btn => { btn.onclick = () => deleteSIP(btn.dataset.sip); });
}

onStateChange = renderSavings;

initPage({
  tab: 'savings',
  actionLabel: '+ New goal',
  onAction: () => {
    goalFormOpen = !goalFormOpen;
    document.getElementById('goalFormPanel').classList.toggle('open', goalFormOpen);
  },
  onReady: renderSavings
});
