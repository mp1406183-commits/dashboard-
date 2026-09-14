/* Income page: this month's income by source, quick-add form, full history. */

function renderIncome(){
  const root = document.getElementById('root');
  const { income } = computeStats();
  const { prevIncome } = computeDeltas();
  const { entries: catEntries, total: catTotal } = computeCategoryBreakdown('income');
  const allIncome = state.transactions.filter(t => t.type === 'income').slice().sort((a,b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  const allTimeIncome = state.transactions.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
  const topSource = catEntries[0];

  root.innerHTML = `
    <div class="stats">
      <div class="stat-card income"><div class="label">Income · ${monthLabel()}</div><div class="value">${fmt(income)}</div>${deltaHtml(income, prevIncome, true)}</div>
      <div class="stat-card"><div class="label">All-time income</div><div class="value">${fmt(allTimeIncome)}</div></div>
      <div class="stat-card"><div class="label">Top source · ${monthLabel()}</div><div class="value" style="font-size:16px;">${topSource ? escapeHtml(topSource[0]) : '—'}</div></div>
    </div>

    <div class="panels">
      <div class="panel">
        <h2>Income by source</h2>
        ${catTotal === 0 ? `<div class="empty-note">No income logged this month yet.</div>` : `
          <div class="donut-row">
            <div class="donut" style="background:${donutGradient(catEntries, catTotal)}"></div>
            <div class="legend">${catEntries.map((e,i) => `<div class="legend-item"><span class="legend-dot" style="background:${colorFor(i)}"></span><span class="legend-cat">${escapeHtml(e[0])}</span><span class="legend-amt">${fmt(e[1])}</span></div>`).join('')}</div>
          </div>
        `}
      </div>
      <div class="panel">
        <h2>Quick add</h2>
        <div class="panel-sub">Log income without leaving this tab.</div>
        <div class="form-grid income-grid">
          <div class="field"><label>Description</label><input type="text" id="qiNote" placeholder="e.g. Paycheck"></div>
          <div class="field"><label>Category</label><select id="qiCategory">${INCOME_CATS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
          <div class="field"><label>Account</label><select id="qiAccount">${accountOptions()}</select></div>
          <div class="field"><label>Amount</label><input type="number" id="qiAmount" placeholder="0.00" min="0" step="0.01"></div>
        </div>
        <input type="text" id="qiCategoryOther" placeholder="Type your own category" style="display:none; margin-top:10px; width:100%; background:var(--surface); border:1px solid var(--border); color:var(--text); padding:8px 10px; border-radius:5px; font-size:12.5px;">
        <button class="btn-primary" id="qiSubmit" style="margin-top:12px;">Add income</button>
      </div>
    </div>

    <div class="section-box">
      <div class="section-head"><h2>Income history</h2></div>
      ${allIncome.length === 0 ? `<div class="no-data">No income logged yet.</div>` : `
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Source</th><th>Account</th><th class="num">Amount</th><th></th></tr></thead>
        <tbody>
          ${allIncome.map(t => `
            <tr>
              <td class="date">${parseLocalDate(t.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</td>
              <td>${escapeHtml(t.note) || '—'}</td>
              <td class="cat">${escapeHtml(t.category)}</td>
              <td class="acct">${escapeHtml(accountName(t.accountId))}</td>
              <td class="amt income">+${fmt(t.amount)}</td>
              <td class="del"><button class="del-btn" data-id="${t.id}">×</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      `}
    </div>
  `;

  const qiCategorySelect = document.getElementById('qiCategory');
  const qiCategoryOtherInput = document.getElementById('qiCategoryOther');
  const toggleQiOther = () => { qiCategoryOtherInput.style.display = qiCategorySelect.value === 'Other' ? 'block' : 'none'; };
  qiCategorySelect.onchange = toggleQiOther;
  toggleQiOther();
  document.getElementById('qiSubmit').onclick = () => {
    const note = document.getElementById('qiNote').value.trim();
    let category = document.getElementById('qiCategory').value;
    if(category === 'Other'){
      const custom = document.getElementById('qiCategoryOther').value.trim();
      if(custom) category = custom;
    }
    const accountId = document.getElementById('qiAccount').value;
    const amount = parseFloat(document.getElementById('qiAmount').value);
    if(!amount || amount <= 0){ alert('Enter a valid amount.'); return; }
    addTransaction({ id: uid(), type: 'income', date: new Date().toISOString().slice(0,10), note, category, amount, accountId, goalId: null });
  };
  document.querySelectorAll('.del-btn[data-id]').forEach(btn => { btn.onclick = () => deleteTransaction(btn.dataset.id); });
}

onStateChange = renderIncome;

initPage({
  tab: 'income',
  actionLabel: '+ Add income',
  onAction: () => { const el = document.getElementById('qiNote'); if(el) el.focus(); },
  onReady: renderIncome
});
