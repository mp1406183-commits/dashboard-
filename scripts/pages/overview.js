/* Overview page: top-line stats, account balances, category breakdown, budgets. */

function renderOverview(){
  const root = document.getElementById('root');
  const { balance, income, expense, saved, invested } = computeStats();
  const { prevIncome, prevExpense, prevSaved, prevInvested } = computeDeltas();
  const { entries: catEntries, total: catTotal } = computeCategoryBreakdown('expense');
  const expSummary = computeMonthlyExpenseSummary();

  root.innerHTML = `
    <div class="stats">
      <div class="stat-card"><div class="label">Balance</div><div class="value">${fmt(balance)}</div></div>
      <div class="stat-card income"><div class="label">Income · ${monthLabel()}</div><div class="value">${fmt(income)}</div>${deltaHtml(income, prevIncome, true)}</div>
      <div class="stat-card expense"><div class="label">Expenses · ${monthLabel()}</div><div class="value">${fmt(expense)}</div>${deltaHtml(expense, prevExpense, false)}</div>
      <div class="stat-card glow"><div class="label">Saved · ${monthLabel()}</div><div class="value">${fmt(saved)}</div>${deltaHtml(saved, prevSaved, true)}</div>
      <div class="stat-card invest"><div class="label">Invested · ${monthLabel()}</div><div class="value">${fmt(invested)}</div>${deltaHtml(invested, prevInvested, true)}</div>
    </div>

    <div class="accounts-strip">
      ${state.accounts.map(a => {
        const bal = accountBalance(a);
        return `<div class="account-chip"><div class="name">${escapeHtml(a.name)}</div><div class="bal ${bal<0?'neg':''}">${fmt(bal)}</div></div>`;
      }).join('')}
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <h2>This month's expenses</h2>
      <div class="mini-stats">
        <div class="mini-stat"><div class="label">Total spent</div><div class="value" style="color:var(--expense)">${fmt(expSummary.total)}</div></div>
        <div class="mini-stat"><div class="label">Daily average</div><div class="value">${fmt(expSummary.dailyAvg)}</div></div>
        <div class="mini-stat"><div class="label">Transactions</div><div class="value">${expSummary.count}</div></div>
        <div class="mini-stat"><div class="label">Largest expense</div><div class="value">${fmt(expSummary.largest)}</div></div>
      </div>
    </div>

    <div class="panels">
      <div class="panel">
        <h2>Spending by category</h2>
        ${catTotal === 0 ? `<div class="empty-note">No expenses logged this month yet.</div>` : `
          <div class="donut-row">
            <div class="donut" style="background:${donutGradient(catEntries, catTotal)}"></div>
            <div class="legend">${catEntries.slice(0,6).map((e,i) => `<div class="legend-item"><span class="legend-dot" style="background:${colorFor(i)}"></span><span class="legend-cat">${escapeHtml(e[0])}</span><span class="legend-amt">${fmt(e[1])}</span></div>`).join('')}</div>
          </div>
        `}
      </div>
      <div class="panel">
        <h2>Budgets · ${monthLabel()}</h2>
        ${state.budgets.length === 0 ? `<div class="empty-note">No budgets set yet.</div>` : state.budgets.map(b => {
          const spent = state.transactions.filter(t => t.type === 'expense' && t.category === b.category && isThisMonth(t.date)).reduce((s,t) => s+t.amount, 0);
          const pct = Math.min(100, (spent / b.limit) * 100);
          const over = spent > b.limit;
          return `<div class="budget-row"><div class="top"><span>${escapeHtml(b.category)}</span><span class="amt ${over ? 'over' : ''}">${fmt(spent)} / ${fmt(b.limit)}</span></div><div class="bar"><div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div></div>`;
        }).join('')}
        <div class="add-budget">
          <select id="budgetCat">${EXPENSE_CATS.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
          <input id="budgetLimit" type="number" placeholder="Monthly limit" min="0" step="1" style="width:110px">
          <button class="btn-ghost" id="saveBudgetBtn">Set</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveBudgetBtn').onclick = () => {
    const category = document.getElementById('budgetCat').value;
    const limit = parseFloat(document.getElementById('budgetLimit').value);
    if(!limit || limit <= 0){ alert('Enter a valid monthly limit.'); return; }
    addBudget(category, limit);
  };
}

onStateChange = renderOverview;

initPage({
  tab: 'overview',
  actionLabel: '+ Add entry',
  onAction: () => { window.location.href = 'transactions.html?add=1'; },
  onReady: renderOverview
});
