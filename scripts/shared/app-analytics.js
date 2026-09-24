/* ======================================================================
   Money Manager — app-analytics.js
   Stats, chart-building and insight generation. Depends on app-data.js
   being loaded first (uses `state`, `fmt`, `fmtCompact`, `colorFor`, etc).
   ====================================================================== */

function computeStats(){
  const all = state.transactions;
  const balance = all.reduce((s,t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
  const thisMonth = all.filter(t => isThisMonth(t.date));
  const sumType = (type) => thisMonth.filter(t => t.type === type).reduce((s,t) => s + t.amount, 0);
  return {
    balance,
    income: sumType('income'),
    expense: sumType('expense'),
    saved: sumType('saving'),
    invested: sumType('investment')
  };
}
function computeDeltas(){
  const prevM = state.transactions.filter(t => isPrevMonth(t.date));
  const sumType = (type) => prevM.filter(t => t.type === type).reduce((s,t) => s + t.amount, 0);
  return {
    prevIncome: sumType('income'),
    prevExpense: sumType('expense'),
    prevSaved: sumType('saving'),
    prevInvested: sumType('investment')
  };
}
function computeCategoryBreakdown(type){
  const thisMonth = state.transactions.filter(t => t.type === type && isThisMonth(t.date));
  const byCat = {};
  thisMonth.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const total = Object.values(byCat).reduce((a,b) => a+b, 0);
  const entries = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  return { entries, total };
}
function computeMonthlyExpenseSummary(){
  const now = new Date();
  const daysElapsed = Math.max(1, now.getDate());
  const monthExpenses = state.transactions.filter(t => t.type === 'expense' && isThisMonth(t.date));
  const total = monthExpenses.reduce((s,t) => s + t.amount, 0);
  const largest = monthExpenses.reduce((m,t) => Math.max(m, t.amount), 0);
  return { total, count: monthExpenses.length, dailyAvg: total / daysElapsed, largest };
}
function donutGradient(entries, total){
  if(total === 0) return 'conic-gradient(var(--surface-alt) 0 100%)';
  let acc = 0;
  const parts = entries.map((e,i) => {
    const pct = e[1]/total*100; const start = acc; acc += pct;
    return `${colorFor(i)} ${start}% ${acc}%`;
  });
  return `conic-gradient(${parts.join(',')})`;
}
function last6Months(){
  const out = []; const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    out.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString(undefined,{month:'short'}) });
  }
  return out;
}
function monthlySeries(){
  const months = last6Months();
  const sumFor = (type, mo) => state.transactions
    .filter(t => t.type === type)
    .filter(t => { const d = parseLocalDate(t.date); return d.getFullYear() === mo.y && d.getMonth() === mo.m; })
    .reduce((s,t) => s + t.amount, 0);
  return {
    months,
    income: months.map(mo => sumFor('income', mo)),
    expense: months.map(mo => sumFor('expense', mo)),
    investment: months.map(mo => sumFor('investment', mo))
  };
}
function buildTrendChart(months, incomeArr, expenseArr, investArr){
  const W = 640, H = 200, padL = 42, padB = 26, padT = 14, padR = 14;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...incomeArr, ...expenseArr, ...investArr);
  const n = Math.max(1, months.length - 1);
  const x = i => padL + (i/n) * innerW;
  const y = v => padT + innerH - (v/maxVal) * innerH;
  const path = arr => arr.map((v,i) => `${i===0?'M':'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const gridLines = [0,0.25,0.5,0.75,1].map(f => {
    const yy = padT + innerH*(1-f);
    return `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="var(--border)" stroke-width="1"/>
            <text x="${padL-8}" y="${yy+3}" text-anchor="end" font-size="9" fill="var(--text-faint)" font-family="var(--mono)">${fmtCompact(maxVal*f)}</text>`;
  }).join('');
  const xLabels = months.map((mo,i) => `<text x="${x(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--text-faint)">${mo.label}</text>`).join('');
  const dots = (arr,color) => arr.map((v,i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${color}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto;">
    ${gridLines}
    <path d="${path(expenseArr)}" fill="none" stroke="var(--expense)" stroke-width="2"/>
    <path d="${path(incomeArr)}" fill="none" stroke="var(--income)" stroke-width="2"/>
    <path d="${path(investArr)}" fill="none" stroke="var(--invest)" stroke-width="2" stroke-dasharray="4 3"/>
    ${dots(expenseArr,'var(--expense)')}${dots(incomeArr,'var(--income)')}${dots(investArr,'var(--invest)')}
    ${xLabels}
  </svg>`;
}
function totalStartingBalance(){
  return state.accounts.reduce((s,a) => s + (a.startingBalance || 0), 0);
}
// Only income/expense change total net worth — saving and investment are internal
// transfers between buckets (cash -> goal/investment), not a change in what you own.
function cumulativeNetCashflow(uptoDate){
  return state.transactions
    .filter(t => t.type === 'income' || t.type === 'expense')
    .filter(t => !uptoDate || parseLocalDate(t.date) <= uptoDate)
    .reduce((s,t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
}
function netWorthToday(){
  return totalStartingBalance() + cumulativeNetCashflow() - totalDebt();
}
function netWorthSeries(){
  const months = last6Months();
  const base = totalStartingBalance();
  const values = months.map(mo => {
    const endOfMonth = new Date(mo.y, mo.m + 1, 0);
    return base + cumulativeNetCashflow(endOfMonth);
  });
  return { months, values };
}
function buildAreaChart(months, values, color){
  const W = 640, H = 160, padL = 46, padB = 24, padT = 14, padR = 14;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = (maxVal - minVal) || 1;
  const n = Math.max(1, months.length - 1);
  const x = i => padL + (i/n) * innerW;
  const y = v => padT + innerH - ((v - minVal)/range) * innerH;
  const linePath = values.map((v,i) => `${i===0?'M':'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(values.length-1).toFixed(1)} ${y(minVal).toFixed(1)} L ${x(0).toFixed(1)} ${y(minVal).toFixed(1)} Z`;
  const gridLines = [0,0.5,1].map(f => {
    const yy = padT + innerH*(1-f);
    const val = minVal + range*f;
    return `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="var(--border)" stroke-width="1"/>
            <text x="${padL-8}" y="${yy+3}" text-anchor="end" font-size="9" fill="var(--text-faint)" font-family="var(--mono)">${fmtCompact(val)}</text>`;
  }).join('');
  const xLabels = months.map((mo,i) => `<text x="${x(i)}" y="${H-4}" text-anchor="middle" font-size="10" fill="var(--text-faint)">${mo.label}</text>`).join('');
  const dots = values.map((v,i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${color}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto;">
    ${gridLines}
    <path d="${areaPath}" fill="${color}" opacity="0.12" stroke="none"/>
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2"/>
    ${dots}
    ${xLabels}
  </svg>`;
}
function goalForecast(goal){
  const contributions = state.transactions.filter(t => t.type === 'saving' && t.goalId === goal.id);
  if(contributions.length === 0) return null;
  const dates = contributions.map(c => parseLocalDate(c.date).getTime());
  const earliest = new Date(Math.min(...dates));
  const now = new Date();
  const monthsElapsed = Math.max(1, (now.getFullYear()-earliest.getFullYear())*12 + (now.getMonth()-earliest.getMonth()) + 1);
  const totalContributed = contributions.reduce((s,c) => s+c.amount, 0);
  const avgMonthly = totalContributed / monthsElapsed;
  const remaining = goal.target - goal.saved;
  if(remaining <= 0) return { done: true };
  if(avgMonthly <= 0) return null;
  const monthsNeeded = Math.ceil(remaining/avgMonthly);
  const eta = new Date(now.getFullYear(), now.getMonth()+monthsNeeded, 1);
  return { monthsNeeded, etaLabel: eta.toLocaleDateString(undefined,{month:'short',year:'numeric'}), avgMonthly };
}
function buildInsights(){
  const insights = [];
  const { income, expense, saved, invested } = computeStats();
  const { prevExpense } = computeDeltas();
  const { entries: catEntries, total: catTotal } = computeCategoryBreakdown('expense');

  if(catTotal > 0){
    const top = catEntries[0];
    insights.push({ tag:'info', text: `${top[0]} is your top expense category this month at ${fmt(top[1])} (${((top[1]/catTotal)*100).toFixed(0)}% of spend).` });
  }
  if(prevExpense > 0){
    const pct = pctChange(expense, prevExpense);
    if(Math.abs(pct) >= 5){
      insights.push({ tag: pct > 0 ? 'warn' : 'good', text: `Expenses are ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(0)}% vs last month (${fmt(expense)} vs ${fmt(prevExpense)}).` });
    }
  }
  if(income > 0){
    const rate = (saved/income)*100;
    insights.push({ tag: rate >= 15 ? 'good' : 'info', text: `You're saving ${rate.toFixed(0)}% of this month's income.` });
  }
  if(invested > 0){
    insights.push({ tag:'info', text: `You invested ${fmt(invested)} this month.` });
  }
  state.budgets.forEach(b => {
    const spent = state.transactions.filter(t => t.type === 'expense' && t.category === b.category && isThisMonth(t.date)).reduce((s,t) => s+t.amount, 0);
    if(spent > b.limit) insights.push({ tag:'warn', text: `${b.category} budget is over by ${fmt(spent-b.limit)} this month.` });
  });
  state.goals.forEach(g => {
    const f = goalForecast(g);
    const safeName = escapeHtml(g.name);
    if(f && f.done) insights.push({ tag:'good', text: `"${safeName}" is fully funded.` });
    else if(f) insights.push({ tag:'info', text: `At current pace, "${safeName}" reaches its goal around ${f.etaLabel} (~${fmt(f.avgMonthly)}/mo).` });
  });
  if(insights.length === 0) insights.push({ tag:'info', text: 'Add a few transactions and this panel will start surfacing trends automatically.' });
  return insights;
}

function deltaHtml(curr, prev, invert){
  if(prev === 0 && curr === 0) return '';
  const pct = pctChange(curr, prev);
  const rising = pct > 0;
  const cls = pct === 0 ? 'flat' : (invert ? (rising ? 'down' : 'up') : (rising ? 'up' : 'down'));
  const arrow = pct === 0 ? '→' : (rising ? '↑' : '↓');
  return `<div class="delta ${cls}">${arrow} ${Math.abs(pct).toFixed(0)}% vs last mo.</div>`;
}
