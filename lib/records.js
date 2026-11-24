// Record metrics for the two engines. Definitions follow the accelerator dashboards
// (js/render-dashboard.js for futures, js/render-options-dash.js for options):
//   R per trade     = dollar_pl / risk_dollars (trades with risk_dollars > 0)
//   win             = dollar_pl > 0
//   profit factor   = gross profit / |gross loss| in dollars
// The futures record is reported in R only. The two records are never combined.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ECA_RECORDS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseTS(raw) {
    if (!raw) return null;
    let m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (m) {
      let h = +(m[4] || 0); const ap = (m[7] || '').toUpperCase();
      if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
      return { y: +m[1], mo: +m[2], d: +m[3], h, mi: +(m[5] || 0), s: +(m[6] || 0) };
    }
    m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (m) {
      let h = +(m[4] || 0); const ap = (m[7] || '').toUpperCase();
      if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
      return { y: +m[3], mo: +m[1], d: +m[2], h, mi: +(m[5] || 0), s: +(m[6] || 0) };
    }
    return null;
  }
  function tsKey(p) {
    return p ? Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) : 0;
  }
  function isoDate(p) {
    return p ? p.y + '-' + String(p.mo).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : null;
  }
  function monthKey(p) {
    return p ? p.y + '-' + String(p.mo).padStart(2, '0') : null;
  }
  // Some feed rows carry no timestamp; date ranges use the dated rows only.
  function firstDated(rows) { const x = rows.find(r => r.p); return x ? isoDate(x.p) : null; }
  function lastDated(rows) { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].p) return isoDate(rows[i].p); return null; }
  function round(v, n) {
    const f = Math.pow(10, n == null ? 2 : n);
    return Math.round(v * f) / f;
  }

  // Same dedupe as the futures dashboard: one row per trade_num,
  // keep the first record, prefer one with non-zero P&L.
  function cleanFutures(raw) {
    const byNum = new Map();
    (Array.isArray(raw) ? raw : []).forEach(t => {
      const k = t.trade_num || JSON.stringify(t);
      if (!byNum.has(k)) byNum.set(k, t);
      else if ((byNum.get(k).dollar_pl || 0) === 0 && (t.dollar_pl || 0) !== 0) byNum.set(k, t);
    });
    const arr = Array.from(byNum.values()).map(t => ({ t, p: parseTS(t.entry_time || t.entryTime || t.exit_time || t.trade_date) }));
    arr.sort((a, b) => tsKey(a.p) - tsKey(b.p));
    return arr;
  }

  function futuresSummary(raw) {
    const rows = cleanFutures(raw);
    const withR = rows.filter(x => (x.t.risk_dollars || 0) > 0);
    if (!withR.length) return null;
    const Rs = withR.map(x => (x.t.dollar_pl || 0) / x.t.risk_dollars);
    const pls = rows.map(x => x.t.dollar_pl || 0);
    const gp = pls.filter(v => v > 0).reduce((a, v) => a + v, 0);
    const gl = Math.abs(pls.filter(v => v <= 0).reduce((a, v) => a + v, 0));
    const wins = pls.filter(v => v > 0).length;

    let cum = 0, peak = 0, maxDD = 0;
    const cumulative = [];
    const monthly = new Map();
    withR.forEach((x, i) => {
      cum += Rs[i];
      if (cum > peak) peak = cum;
      if (peak - cum > maxDD) maxDD = peak - cum;
      cumulative.push(round(cum, 3));
      const mk = monthKey(x.p);
      if (mk) monthly.set(mk, (monthly.get(mk) || 0) + Rs[i]);
    });

    const last5 = withR.slice(-5).reverse().map((x, j) => {
      const i = withR.length - 1 - j;
      return { closed: isoDate(x.p), direction: x.t.direction || '', r: round(Rs[i], 2) };
    });

    return {
      trades: withR.length,
      avgR: round(Rs.reduce((a, v) => a + v, 0) / Rs.length, 3),
      winRate: round(wins / rows.length, 4),
      profitFactor: gl > 0 ? round(gp / gl, 2) : null,
      deepestDrawdownR: round(maxDD, 2),
      totalR: round(cum, 2),
      firstDate: firstDated(withR),
      lastDate: lastDated(withR),
      cumulativeR: cumulative,
      monthlyR: Array.from(monthly.entries()).map(([m, v]) => ({ month: m, r: round(v, 2) })),
      last5,
    };
  }

  // Options: open positions excluded until closed, as on the options dashboard.
  function optionsSummary(raw, startUsd) {
    const rows = (Array.isArray(raw) ? raw : [])
      .filter(t => t.outcome !== 'Open')
      .map(t => ({ t, p: parseTS(t.entry_time || t.trade_date || t.datetime) }));
    rows.sort((a, b) => tsKey(a.p) - tsKey(b.p));
    if (!rows.length) return null;
    const pls = rows.map(x => x.t.dollar_pl || 0);
    const wins = pls.filter(v => v > 0).length;
    let bal = startUsd, peakBal = startUsd, maxDDPct = 0;
    const balances = [];
    const monthly = new Map();
    rows.forEach((x, i) => {
      bal += pls[i];
      if (bal > peakBal) peakBal = bal;
      const dd = (peakBal - bal) / peakBal;
      if (dd > maxDDPct) maxDDPct = dd;
      balances.push(round(bal, 2));
      const mk = monthKey(x.p);
      if (mk) monthly.set(mk, (monthly.get(mk) || 0) + pls[i]);
    });
    const last5 = rows.slice(-5).reverse().map(x => ({
      closed: isoDate(x.p),
      underlying: x.t.ticker || '',
      side: [x.t.direction, x.t.option_type].filter(Boolean).join(' '),
      usd: round(x.t.dollar_pl || 0, 2),
      r: x.t.risk_dollars > 0 ? round((x.t.dollar_pl || 0) / x.t.risk_dollars, 2) : null,
    }));
    return {
      fills: rows.length,
      balance: round(bal, 2),
      startUsd,
      multiple: round(bal / startUsd, 2),
      winRate: round(wins / rows.length, 4),
      deepestDrawdownPct: round(maxDDPct, 4),
      firstDate: firstDated(rows),
      lastDate: lastDated(rows),
      balances,
      monthlyUsd: Array.from(monthly.entries()).map(([m, v]) => ({ month: m, usd: round(v, 2) })),
      last5,
    };
  }

  return { parseTS, cleanFutures, futuresSummary, optionsSummary };
});
