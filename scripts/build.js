#!/usr/bin/env node
// Build: score the live campaigns (feeds/live.json, written by scripts/ibkr-flex.js), score the
// combined demo record by quarter, and render index.html from src/index.template.html + config.js.
// Everything is rendered at build time; the daily workflow rebuilds after each trading day.
//   node scripts/build.js            dev build: null config fields render as red [DATA REQUIRED] chips
//   node scripts/build.js --prod     production: fails while any required config field is null
//   node scripts/build.js --offline  skip fetching the demo feeds, reuse feeds/demo.json
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CFG = require(path.join(ROOT, 'config.js'));
const REC = require(path.join(ROOT, 'lib/records.js'));
const CAMP = require(path.join(ROOT, 'lib/campaigns.js'));
const { findNulls, sanity } = require('./check-config.js');

const args = new Set(process.argv.slice(2));
const PROD = args.has('--prod');
const OFFLINE = args.has('--offline');
const TODAY = process.env.BUILD_TODAY || new Intl.DateTimeFormat('en-CA', { timeZone: CFG.SITE.timeZone }).format(new Date());

const T = CFG.TARGET;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CHIP = '<span class="flag" title="Fill in config.js before the production deploy">[DATA REQUIRED]</span>';
const usd = v => '$' + Math.round(v).toLocaleString('en-US');
const pct0 = v => (Math.round(v * 1000) / 10).toString().replace(/\.0$/, '') + '%';
const pct1 = v => (v * 100).toFixed(1) + '%';
const sPct = v => (v >= 0 ? '+' : '−') + (Math.abs(v) * 100).toFixed(1) + '%';
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = iso => { const [y, m, d] = iso.split('-').map(Number); return MON[m - 1] + ' ' + d + ', ' + y; };
const shortDate = iso => { const [, m, d] = iso.split('-').map(Number); return MON[m - 1].slice(0, 3) + ' ' + d; };

// ---------- Demo record (both engines, one account) ----------
async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(url + ' HTTP ' + res.status);
  return res.json();
}
const iso = p => p ? p.y + '-' + String(p.mo).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : null;

function demoTrades(futRaw, optRaw) {
  const fut = REC.cleanFutures(futRaw).map(x => ({ date: iso(x.p), pl: x.t.dollar_pl || 0 }));
  const opt = (Array.isArray(optRaw) ? optRaw : []).filter(t => t.outcome !== 'Open')
    .map(t => ({ date: iso(REC.parseTS(t.entry_time || t.trade_date || t.datetime)), pl: t.dollar_pl || 0 }));
  const all = fut.concat(opt);
  return { trades: all.filter(x => x.date), undated: all.filter(x => !x.date).length };
}

async function demoSnapshot() {
  const file = path.join(ROOT, 'feeds', 'demo.json');
  if (!OFFLINE) {
    try {
      const [f, o] = await Promise.all([fetchJSON(CFG.DEMO.futuresUrl), fetchJSON(CFG.DEMO.optionsUrl)]);
      const { trades, undated } = demoTrades(f, o);
      const quarters = CAMP.fromTrades(trades, CFG.DEMO.startUsd).map(q => { delete q.series; return q; });
      const snap = { ok: quarters.length > 0, fetchedAt: new Date().toISOString(), startUsd: CFG.DEMO.startUsd, trades: trades.length, undated, quarters };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(snap) + '\n');
    } catch (e) {
      console.warn('demo feeds unavailable, keeping the last snapshot:', e.message);
    }
  }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

function readLive() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'feeds', 'live.json'), 'utf8')); } catch (e) { return null; }
}

// ---------- SVG pieces ----------
function ring(ret) {
  const R = 74, C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, ret / T.quarterReturnPct));
  const cls = ret < 0 ? 'ring__val ring__val--neg' : 'ring__val';
  return '<svg class="ring" viewBox="0 0 180 180" role="img" aria-label="' + esc(sPct(ret) + ' of a ' + pct0(T.quarterReturnPct) + ' target') + '">' +
    '<circle class="ring__track" cx="90" cy="90" r="' + R + '"/>' +
    '<circle class="ring__fill" cx="90" cy="90" r="' + R + '" stroke-dasharray="' + (C * frac).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 90 90)"/>' +
    '<text class="' + cls + '" x="90" y="88" text-anchor="middle">' + esc(sPct(ret)) + '</text>' +
    '<text class="ring__sub" x="90" y="112" text-anchor="middle">of ' + esc(pct0(T.quarterReturnPct)) + ' target</text></svg>';
}

function meter(dd) {
  const w = Math.max(0, Math.min(100, dd / T.maxDrawdownPct * 100));
  return '<div class="meter' + (dd >= T.maxDrawdownPct ? ' meter--over' : '') + '" role="img" aria-label="Deepest drawdown ' + esc(pct1(dd)) + ' of a ' + esc(pct0(T.maxDrawdownPct)) + ' limit">' +
    '<span style="width:' + w.toFixed(1) + '%"></span></div>' +
    '<div class="meter__scale"><span>0%</span><span>limit ' + esc(pct0(T.maxDrawdownPct)) + '</span></div>';
}

// Cumulative return through the quarter against the straight pace line to the target.
function paceChart(c) {
  const W = 1000, H = 280, P = { l: 48, r: 12, t: 14, b: 26 };
  const t0 = Date.parse(c.start), t1 = Date.parse(c.end);
  const x = d => P.l + (Date.parse(d) - t0) / (t1 - t0) * (W - P.l - P.r);
  const vals = c.series.map(s => s.ret);
  const max = Math.max(T.quarterReturnPct * 1.1, ...vals), min = Math.min(0, ...vals);
  const y = v => P.t + (max - v) * (H - P.t - P.b) / (max - min || 1);
  const line = [{ date: c.start, ret: 0 }].concat(c.series).map((s, i) => (i ? 'L' : 'M') + x(s.date).toFixed(1) + ' ' + y(s.ret).toFixed(1)).join(' ');
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Quarter-to-date return against the pace to the target">' +
    '<line class="chart__axis" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '"/>' +
    '<line class="chart__target" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(T.quarterReturnPct).toFixed(1) + '" y2="' + y(T.quarterReturnPct).toFixed(1) + '"/>' +
    '<line class="chart__pace" x1="' + x(c.start).toFixed(1) + '" y1="' + y(0).toFixed(1) + '" x2="' + x(c.end).toFixed(1) + '" y2="' + y(T.quarterReturnPct).toFixed(1) + '"/>' +
    '<path class="chart__line" d="' + line + '"/>' +
    '<text class="chart__tick" x="' + (P.l - 6) + '" y="' + (y(T.quarterReturnPct) + 4).toFixed(1) + '" text-anchor="end">' + pct0(T.quarterReturnPct) + '</text>' +
    '<text class="chart__tick" x="' + (P.l - 6) + '" y="' + (y(0) + 4).toFixed(1) + '" text-anchor="end">0%</text>' +
    '<text class="chart__tick" x="' + P.l + '" y="' + (H - 6) + '">' + shortDate(c.start) + '</text>' +
    '<text class="chart__tick" x="' + (W - P.r) + '" y="' + (H - 6) + '" text-anchor="end">' + shortDate(c.end) + '</text>' +
    '</svg><p class="legend"><span class="lg lg--line"></span>Quarter to date <span class="lg lg--pace"></span>Even pace to ' + pct0(T.quarterReturnPct) + ' <span class="lg lg--target"></span>Target</p>';
}

const pill = (status, text) => '<span class="pill pill--' + status + '">' + esc(text || CAMP.STATUS_TEXT[status]) + '</span>';

// ---------- Sections ----------
function liveSection(live) {
  const first = CAMP.quarterBounds(CFG.CAMPAIGNS.firstQuarter);
  const curId = CAMP.quarterOf(TODAY);
  const campaigns = live && live.ok && Array.isArray(live.campaigns) ? live.campaigns : [];
  const cur = campaigns.find(c => c.id === curId);

  if (!cur) {
    const before = TODAY < first.start;
    const head = before
      ? 'Campaign 1 · ' + CAMP.quarterLabel(CFG.CAMPAIGNS.firstQuarter) + ' starts ' + longDate(first.start)
      : 'Campaign ' + (campaigns.length + 1) + ' · ' + CAMP.quarterLabel(curId);
    const note = before
      ? 'The live account is scored from the first trading day of ' + CAMP.quarterLabel(CFG.CAMPAIGNS.firstQuarter) + '. Progress toward the ' + pct0(T.quarterReturnPct) + ' target and the drawdown so far appear here after that day’s close.'
      : 'Live numbers appear here after the first trading day’s close.' + (live && live.asOf ? ' Last account update: ' + longDate(live.asOf) + '.' : '');
    return '    <div class="campaign card card--accent">\n' +
      '      <div class="campaign__ring">' + ring(0) + '</div>\n' +
      '      <div class="campaign__body"><h3>' + esc(head) + '</h3>' + pill('pending', before ? 'Not started' : 'Waiting for data') +
      '<p>' + esc(note) + '</p>' +
      '<dl class="kv"><div><dt>Return target</dt><dd class="num">' + pct0(T.quarterReturnPct) + '</dd></div><div><dt>Drawdown limit</dt><dd class="num">&lt; ' + pct0(T.maxDrawdownPct) + '</dd></div><div><dt>Quarter</dt><dd class="num">' + shortDate(before ? first.start : CAMP.quarterBounds(curId).start) + ' – ' + shortDate(before ? first.end : CAMP.quarterBounds(curId).end) + '</dd></div></dl></div>\n' +
      '    </div>';
  }

  const n = campaigns.indexOf(cur) + 1;
  const toGo = Math.max(0, T.quarterReturnPct - cur.returnPct);
  return '    <div class="campaign card card--accent">\n' +
    '      <div class="campaign__ring">' + ring(cur.returnPct) + '</div>\n' +
    '      <div class="campaign__body"><h3>Campaign ' + n + ' · ' + esc(cur.label) + '</h3>' + pill(cur.status) +
    '<p class="asof">Account value as of the ' + esc(longDate(cur.lastDate)) + ' close · ' + cur.daysLeft + ' days left in the quarter</p>' +
    '<dl class="kv">' +
    '<div><dt>Quarter to date</dt><dd class="num ' + (cur.returnPct >= 0 ? 'pos' : 'neg') + '">' + sPct(cur.returnPct) + '</dd></div>' +
    '<div><dt>Even pace today</dt><dd class="num">' + sPct(cur.pacePct) + '</dd></div>' +
    '<div><dt>Still to go</dt><dd class="num">' + pct1(toGo) + '</dd></div>' +
    '</dl>' +
    '<h4 class="chart-h">Deepest drawdown this quarter: <span class="num">' + pct1(cur.maxDrawdownPct) + '</span></h4>' + meter(cur.maxDrawdownPct) +
    '</div>\n' +
    '      <div class="campaign__chart">' + paceChart(cur) + '</div>\n' +
    '    </div>';
}

function scoreTable(rows, opts) {
  const head = '<thead><tr><th scope="col">' + (opts.first || 'Campaign') + '</th><th scope="col">Return</th><th scope="col">Deepest drawdown</th><th scope="col">' + pct0(T.quarterReturnPct) + ' target</th><th scope="col">Drawdown under ' + pct0(T.maxDrawdownPct) + '</th><th scope="col">Result</th></tr></thead>';
  const yes = ok => ok ? '<span class="tick">Yes</span>' : '<span class="cross">No</span>';
  const body = rows.map(r => '<tr><th scope="row">' + r.name + '</th>' +
    '<td class="num ' + (r.returnPct >= 0 ? 'pos' : 'neg') + '">' + sPct(r.returnPct) + '</td>' +
    '<td class="num">' + pct1(r.maxDrawdownPct) + '</td>' +
    '<td>' + (r.complete ? yes(r.hitTarget) : '—') + '</td><td>' + (r.complete ? yes(r.heldDD) : '—') + '</td>' +
    '<td>' + r.result + '</td></tr>').join('');
  return '    <div class="table-scroll"><table class="tbl tbl--score">' + head + '<tbody>' + body + '</tbody></table></div>';
}

function scoreboard(live) {
  const campaigns = live && live.ok && Array.isArray(live.campaigns) ? live.campaigns : [];
  if (!campaigns.length) {
    const b = CAMP.quarterBounds(CFG.CAMPAIGNS.firstQuarter);
    return '    <p class="empty">No live campaign has been scored yet. Campaign 1 runs ' + esc(longDate(b.start)) + ' to ' + esc(longDate(b.end)) + '.</p>';
  }
  const rows = campaigns.slice().reverse().map((c, i, arr) => Object.assign({}, c, {
    name: 'Campaign ' + (arr.length - i) + ' · ' + esc(c.label),
    result: c.complete ? pill(c.status) : pill(c.status) + ' <small>in progress</small>',
  }));
  const done = campaigns.filter(c => c.complete);
  const met = done.filter(c => c.status === 'met').length;
  return scoreTable(rows, {}) + (done.length ? '\n    <p class="after"><em>Met ' + met + ' of ' + done.length + ' completed campaign' + (done.length === 1 ? '' : 's') + '.</em></p>' : '');
}

function demoSection(demo) {
  if (!demo || !demo.ok) return { table: '    <p class="empty">The demo records are on the two dashboards below while the feed connects.</p>', summary: 'Demo records shown on the dashboards.' };
  const DAY = 86400000;
  const qs = demo.quarters.map(q => {
    const e = CAMP.evaluate(q, T.quarterReturnPct, T.maxDrawdownPct, TODAY);
    e.partial = (Date.parse(q.firstDate) - Date.parse(q.start)) > 14 * DAY;
    return e;
  });
  const rows = qs.map(q => Object.assign({}, q, {
    name: esc(q.label) + (q.partial ? ' <small>from ' + esc(shortDate(q.firstDate)) + '</small>' : ''),
    complete: q.complete && !q.partial,
    result: q.partial ? pill('pending', 'Partial quarter') : q.complete ? pill(q.status) : pill('pending', 'In progress'),
  }));
  const scored = qs.filter(q => q.complete && !q.partial);
  const met = scored.filter(q => q.status === 'met').length;
  const worst = Math.max(...qs.map(q => q.maxDrawdownPct));
  const summary = 'Complete demo quarters that met the ' + pct0(T.quarterReturnPct) + ' target: ' + met + ' of ' + scored.length + '. Deepest drawdown in any demo quarter: ' + pct1(worst) +
    '. Assumes the futures and options demo trades ran in one ' + usd(demo.startUsd) + ' account at the dollar sizes recorded, before subscription fees.' +
    (demo.undated ? ' ' + demo.undated + ' undated trades are left out.' : '') + ' Demo results are hypothetical.';
  return { table: scoreTable(rows, { first: 'Quarter' }), summary };
}

// ---------- Render ----------
function context(live, demo) {
  const f = CFG.ENGINES.futures, o = CFG.ENGINES.options;
  const d = demoSection(demo);
  const first = CAMP.quarterBounds(CFG.CAMPAIGNS.firstQuarter);
  const t = {
    'site.title': CFG.SITE.title, 'site.bookCallUrl': CFG.SITE.bookCallUrl, 'site.email': CFG.SITE.email,
    'site.feeLine': CFG.SITE.feeLine, 'site.publisher': CFG.SITE.publisher, 'site.homeUrl': CFG.SITE.homeUrl,
    'live.broker': CFG.LIVE.broker,
    target: pct0(T.quarterReturnPct), ddLimit: pct0(T.maxDrawdownPct), minAccount: usd(T.minAccountUsd),
    futuresSleeve: usd(CFG.PORTFOLIO.sleeves.futures), optionsSleeve: usd(CFG.PORTFOLIO.sleeves.options),
    demoStart: usd(CFG.DEMO.startUsd), demoSummary: d.summary,
    firstCampaignStart: longDate(first.start), firstCampaignLabel: CAMP.quarterLabel(CFG.CAMPAIGNS.firstQuarter),
    'eng.futures.instrument': f.instrument, 'eng.options.instrument': o.instrument,
    'eng.futures.discordUrl': f.discordUrl, 'eng.options.discordUrl': o.discordUrl,
    'eng.futures.dashboardUrl': f.dashboardUrl, 'eng.options.dashboardUrl': o.dashboardUrl,
    disclosure: CFG.DISCLOSURE, hypothetical: CFG.HYPOTHETICAL,
    year: TODAY.slice(0, 4), buildId: Date.now().toString(36), buildMode: PROD ? 'prod' : 'dev',
  };
  const html = { liveCampaign: liveSection(live), scoreboard: scoreboard(live), demoTable: d.table };
  return { t, html };
}

function render(tpl, ctx) {
  return tpl.replace(/\{\{([\w.]+)\}\}/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(ctx.html, key)) return ctx.html[key];
    if (!Object.prototype.hasOwnProperty.call(ctx.t, key)) throw new Error('Unknown template token: ' + key);
    const v = ctx.t[key];
    return v == null ? CHIP : esc(v);
  });
}

async function main() {
  const errs = sanity(CFG);
  if (errs.length) { errs.forEach(e => console.error('config error: ' + e)); process.exit(1); }
  if (PROD) {
    const nulls = findNulls(CFG);
    if (nulls.length) { console.error('Production build blocked. [DATA REQUIRED]:\n  ' + nulls.join('\n  ')); process.exit(1); }
  }
  const demo = await demoSnapshot();
  const live = readLive();
  const tpl = fs.readFileSync(path.join(ROOT, 'src/index.template.html'), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'index.html'), render(tpl, context(live, demo)));
  console.log('Built index.html (' + (PROD ? 'prod' : 'dev') + ', ' + TODAY + '). Demo quarters: ' + (demo && demo.ok ? demo.quarters.length : 0) +
    '. Live campaigns: ' + (live && live.campaigns ? live.campaigns.length : 0) + '.');
}

module.exports = { demoTrades, liveSection, scoreboard, render };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
