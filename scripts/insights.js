/* Insights page: trend charts + rule-based insights generated from the data. */

function renderInsights(){
  const root = document.getElementById('root');
  const { months, income, expense, investment } = monthlySeries();
  const insights = buildInsights();
  const { months: nwMonths, values: nwValues } = netWorthSeries();
  root.innerHTML = `
    <div class="panel" style="margin-bottom:20px;">
      <h2>Net worth trend — last 6 months</h2>
      <div class="panel-sub">Cash + savings + investments, minus today's total debt. Only income and expenses move this line — saving and investing just shift money between buckets you still own.</div>
      ${buildAreaChart(nwMonths, nwValues, 'var(--glow)')}
      <div class="mini-stats" style="margin-top:10px;">
        <div class="mini-stat"><div class="label">Net worth today</div><div class="value">${fmt(netWorthToday())}</div></div>
        <div class="mini-stat"><div class="label">Total debt</div><div class="value" style="color:var(--expense)">${fmt(totalDebt())}</div></div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:20px;">
      <h2>Income vs. expenses vs. investing — last 6 months</h2>
      <div class="chart-legend">
        <span><span class="sw" style="background:var(--income)"></span>Income</span>
        <span><span class="sw" style="background:var(--expense)"></span>Expenses</span>
        <span><span class="sw" style="background:var(--invest)"></span>Investment</span>
      </div>
      ${buildTrendChart(months, income, expense, investment)}
    </div>
    <div class="panel">
      <h2>Auto insights</h2>
      <div class="panel-sub">Generated from your current data — updates as you log more.</div>
      <div class="insight-list">${insights.map(i => `<div class="insight-item"><span class="tag ${i.tag}"></span><span>${i.text}</span></div>`).join('')}</div>
    </div>
  `;
}

onStateChange = renderInsights;

initPage({
  tab: 'insights',
  actionLabel: null,
  onReady: renderInsights
});
