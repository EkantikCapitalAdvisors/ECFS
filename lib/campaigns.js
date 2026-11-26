// Quarterly campaigns. Each calendar quarter is scored on two numbers:
//   return       time-weighted, deposits and withdrawals excluded
//   max drawdown deepest fall from the quarter's running peak (the quarter's start counts as a peak)
// A completed quarter is "Met" when return >= target and max drawdown < limit.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ECA_CAMPAIGNS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const pad = n => String(n).padStart(2, '0');
  const DAY = 86400000;

  // 'YYYY-MM-DD' or 'YYYYMMDD' -> 'YYYY-MM-DD'
  function normDate(s) {
    const m = String(s || '').match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }
  function quarterOf(iso) {
    const [y, m] = iso.split('-').map(Number);
    return y + '-Q' + (Math.floor((m - 1) / 3) + 1);
  }
  function quarterBounds(id) {
    const [y, q] = id.split('-Q').map(Number);
    const m0 = (q - 1) * 3 + 1, m1 = m0 + 2;
    const last = new Date(Date.UTC(y, m1, 0)).getUTCDate();
    return { start: y + '-' + pad(m0) + '-01', end: y + '-' + pad(m1) + '-' + pad(last) };
  }
  function nextQuarter(id) {
    const [y, q] = id.split('-Q').map(Number);
    return q === 4 ? (y + 1) + '-Q1' : y + '-Q' + (q + 1);
  }
  function quarterLabel(id) {
    const [y, q] = id.split('-Q');
    return 'Q' + q + ' ' + y;
  }
  const t = iso => Date.parse(iso + 'T00:00:00Z');

  function round(v, n) { const f = Math.pow(10, n == null ? 4 : n); return Math.round(v * f) / f; }

  // Generic engine: steps = [{date, r}] in order, r = that step's return on the equity before it.
  function fromSteps(steps, firstQuarter) {
    const out = new Map();
    for (const s of steps) {
      const q = quarterOf(s.date);
      if (firstQuarter && q < firstQuarter) continue;
      if (!out.has(q)) out.set(q, { id: q, idx: 1, peak: 1, dd: 0, n: 0, series: [] });
      const Q = out.get(q);
      Q.idx *= 1 + s.r;
      if (Q.idx > Q.peak) Q.peak = Q.idx;
      Q.dd = Math.max(Q.dd, (Q.peak - Q.idx) / Q.peak);
      Q.n++;
      const last = Q.series[Q.series.length - 1];
      const pt = { date: s.date, ret: round(Q.idx - 1), dd: round((Q.peak - Q.idx) / Q.peak) };
      if (last && last.date === s.date) Q.series[Q.series.length - 1] = pt; else Q.series.push(pt);
    }
    return Array.from(out.values()).sort((a, b) => (a.id < b.id ? -1 : 1)).map(Q => ({
      id: Q.id, label: quarterLabel(Q.id), ...quarterBounds(Q.id),
      returnPct: round(Q.idx - 1), maxDrawdownPct: round(Q.dd), steps: Q.n,
      firstDate: Q.series[0].date, lastDate: Q.series[Q.series.length - 1].date, series: Q.series,
    }));
  }

  // Live account: daily rows [{date, nav, flow}] where flow = deposits (+) / withdrawals (-) that day.
  // Day return = (nav - flow - prevNav) / prevNav. The first row only sets the base.
  function fromDailyNav(rows, firstQuarter) {
    const clean = rows.map(r => ({ date: normDate(r.date), nav: +r.nav, flow: +(r.flow || 0) }))
      .filter(r => r.date && isFinite(r.nav) && r.nav > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const steps = [];
    for (let i = 1; i < clean.length; i++) {
      const p = clean[i - 1].nav, c = clean[i];
      steps.push({ date: c.date, r: (c.nav - c.flow - p) / p });
    }
    return fromSteps(steps, firstQuarter);
  }

  // Demo record: closed trades [{date, pl}] on a single account that starts at startUsd.
  function fromTrades(trades, startUsd) {
    let eq = startUsd;
    const steps = [];
    trades.filter(x => x.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).forEach(x => {
      steps.push({ date: x.date, r: x.pl / eq });
      eq += x.pl;
    });
    return fromSteps(steps);
  }

  // Score one campaign against the targets as of `today` (ISO date).
  function evaluate(c, target, limit, today) {
    const complete = today > c.end;
    const hitTarget = c.returnPct >= target;
    const heldDD = c.maxDrawdownPct < limit;
    const span = t(c.end) - t(c.start) + DAY;
    const elapsed = Math.min(1, Math.max(0, (t(c.lastDate) - t(c.start) + DAY) / span));
    const pace = target * elapsed;
    let status;
    if (complete) status = hitTarget && heldDD ? 'met' : 'missed';
    else if (!heldDD) status = 'dd-limit';
    else if (hitTarget) status = 'target-reached';
    else status = c.returnPct >= pace ? 'on-pace' : 'behind';
    const daysLeft = complete ? 0 : Math.max(0, Math.round((t(c.end) - t(today)) / DAY));
    return Object.assign({}, c, { complete, hitTarget, heldDD, status, pacePct: round(pace), elapsedPct: round(elapsed), daysLeft });
  }

  const STATUS_TEXT = {
    met: 'Met', missed: 'Missed', 'dd-limit': 'Drawdown limit hit',
    'target-reached': 'Target reached', 'on-pace': 'On pace', behind: 'Behind pace',
  };

  return { normDate, quarterOf, quarterBounds, nextQuarter, quarterLabel, fromSteps, fromDailyNav, fromTrades, evaluate, STATUS_TEXT };
});
