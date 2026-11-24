#!/usr/bin/env node
// Build: fetch the two engine feeds (build-time, never from the browser), compute the
// record summaries, and render index.html from src/index.template.html + config.js.
//   node scripts/build.js            dev build: null config fields render as red [DATA REQUIRED] chips
//   node scripts/build.js --prod     production: fails while any required config field is null
//   node scripts/build.js --offline  skip the feed fetch, keep the existing /feeds snapshot
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CFG = require(path.join(ROOT, 'config.js'));
const SIZE = require(path.join(ROOT, 'lib/size.js'));
const REC = require(path.join(ROOT, 'lib/records.js'));
const { findNulls } = require('./check-config.js');

const args = new Set(process.argv.slice(2));
const PROD = args.has('--prod');
const OFFLINE = args.has('--offline');

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
const CHIP = '<span class="flag" title="Fill in config.js before the production deploy">[DATA REQUIRED]</span>';

function fmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return mon + ' ' + d + ', ' + y;
}
function labelText(l) {
  return l === 'OWN MONEY' ? 'Own-money' : l === 'DEMO' ? 'Demo' : null;
}
function badge(l) {
  if (l === 'DEMO') return '<span class="badge badge--demo">DEMO</span>';
  if (l === 'OWN MONEY') return '<span class="badge badge--own">OWN MONEY</span>';
  return CHIP;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(url + ' HTTP ' + res.status);
  return res.json();
}

async function buildFeeds() {
  const dir = path.join(ROOT, 'feeds');
  fs.mkdirSync(dir, { recursive: true });
  if (OFFLINE) return readFeeds();
  const fetchedAt = new Date().toISOString();
  const out = {};
  try {
    const [raw, standdown] = await Promise.all([
      fetchJSON(CFG.FEEDS.futuresUrl),
      fetchJSON(CFG.FEEDS.standdownUrl).catch(() => null),
    ]);
    const summary = REC.futuresSummary(raw);
    out.futures = { ok: !!summary, fetchedAt, summary, status: standdown && standdown.current_tier ? { code: standdown.current_tier, updatedAt: fetchedAt } : null };
  } catch (e) {
    console.warn('futures feed unavailable:', e.message);
  }
  try {
    const raw = await fetchJSON(CFG.FEEDS.optionsUrl);
    const summary = REC.optionsSummary(raw, CFG.ENGINES.options.record.startUsd);
    out.options = { ok: !!summary, fetchedAt, summary, status: null };
  } catch (e) {
    console.warn('options feed unavailable:', e.message);
  }
  for (const k of ['futures', 'options']) {
    const file = path.join(dir, k + '.json');
    if (out[k]) fs.writeFileSync(file, JSON.stringify(out[k]) + '\n');
    else if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ ok: false, fetchedAt: null, summary: null }) + '\n');
  }
  return readFeeds();
}
function readFeeds() {
  const r = k => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'feeds', k + '.json'), 'utf8')); } catch (e) { return null; } };
  return { futures: r('futures'), options: r('options') };
}

function context(feeds) {
  const def = SIZE.sizeById(CFG, CFG.SIZING.default).multiple;
  const m1 = SIZE.compute(CFG, 1);
  const m2 = SIZE.compute(CFG, 2);
  const total = CFG.PORTFOLIO.totalUsd;
  const fut = CFG.ENGINES.futures, opt = CFG.ENGINES.options;
  const html = {};
  const t = {
    'site.title': CFG.SITE.title,
    'site.bookCallUrl': CFG.SITE.bookCallUrl,
    'site.email': CFG.SITE.email,
    'site.witness': CFG.SITE.witness,
    'site.protocolUrl': CFG.SITE.protocolUrl,
    'site.feeLine': CFG.SITE.feeLine,
    'site.publisher': CFG.SITE.publisher,
    'site.homeUrl': CFG.SITE.homeUrl,
    total: SIZE.usd(total),
    dailyPct: SIZE.pct(CFG.SIZING.baseDailyRiskPct),
    targetPct1: SIZE.pct(m1.rules.target.pct),
    targetPct2: SIZE.pct(m2.rules.target.pct),
    annual1: SIZE.usd(m1.rules.target.usd * 12),
    annual2: SIZE.usd(m2.rules.target.usd * 12),
    futuresSleeve: SIZE.usd(CFG.PORTFOLIO.sleeves.futures),
    optionsSleeve: SIZE.usd(CFG.PORTFOLIO.sleeves.options),
    futuresShare: Math.round(CFG.PORTFOLIO.sleeves.futures / total * 100),
    optionsShare: Math.round(CFG.PORTFOLIO.sleeves.options / total * 100),
    riskShare2: SIZE.pct(m2.riskShareOfFutures),
    monthlyPct2: SIZE.pct(m2.rules.monthly.pct),
    planningMonthlyR: Math.round(CFG.PLANNING.annualR / 12 * 10) / 10,
    'planning.annualR': CFG.PLANNING.annualR,
    'planning.buildText': CFG.PLANNING.buildText,
    minAccount: SIZE.usd(CFG.SITE.minAccountUsd),
    unit: SIZE.usd(CFG.SITE.unitUsd),
    capacity: SIZE.usd(CFG.SITE.capacityUsd),
    year: new Date().getFullYear(),
    buildId: Date.now().toString(36),
    buildMode: PROD ? 'prod' : 'dev',
    disclosure: CFG.DISCLOSURE,
    'eng.futures.dashboardUrl': fut.dashboardUrl,
    'eng.futures.discordUrl': fut.discordUrl,
    'eng.futures.stopRule': fut.stopRule,
    'eng.options.dashboardUrl': opt.dashboardUrl,
    'eng.options.discordUrl': opt.discordUrl,
    'eng.options.stopRule': opt.stopRule,
    'startDate.futures': fmtDate(fut.record.startDate),
    'startDate.options': fmtDate(opt.record.startDate),
  };
  for (const k of Object.keys(CFG.RULES_R)) {
    t['r.' + k] = CFG.RULES_R[k];
    t['fig.' + k] = SIZE.fig(CFG, def, CFG.RULES_R[k]);
    t['limit.' + k] = SIZE.limit(CFG, def, CFG.RULES_R[k]);
  }

  html['badge.futures'] = badge(fut.record.label);
  html['badge.options'] = badge(opt.record.label);
  html['statusChip.futures'] = '<span class="status" data-status="futures" hidden></span>';
  html['statusChip.options'] = '<span class="status" data-status="options" hidden></span>';
  const lf = labelText(fut.record.label), lo = labelText(opt.record.label);
  html.recordsLine = !lf || !lo ? CHIP + ' records.' : (lf === lo ? lf + ' records.' : 'Futures: ' + lf.toLowerCase() + ' record. Options: ' + lo.toLowerCase() + ' record.');

  // Hero size chips + size toggle buttons
  html.heroChips = CFG.SIZING.sizes.map(s => {
    const m = SIZE.compute(CFG, s.multiple);
    let label = s.id + ' · ' + SIZE.pct(m.dailyLimitUsd / total) + ' daily loss limit';
    if (CFG.FLAGS.targetsLive) label += ' · ' + SIZE.usd(m.rules.target.usd) + ' a month target · ' + SIZE.usd(m.rules.buffer.usd) + ' banked first';
    const on = s.multiple === def;
    return '      <button type="button" class="chip" role="radio" aria-checked="' + on + '" data-size="' + s.id + '">' + esc(label) + '</button>';
  }).join('\n');
  html.segButtons = CFG.SIZING.sizes.map(s => {
    const on = s.multiple === def;
    return '      <button type="button" class="seg__btn" role="radio" aria-checked="' + on + '" data-size="' + s.id + '">' + esc(s.label) + '</button>';
  }).join('\n');

  // Rules table (both sizes always shown; the toggle highlights the selected column)
  const rows = [
    ['Risk per futures trade', 1, '1R', 'limit'],
    ['Daily loss limit', CFG.RULES_R.daily, CFG.RULES_R.daily + 'R', 'limit'],
    ['Weekly loss limit', CFG.RULES_R.weekly, CFG.RULES_R.weekly + 'R', 'limit'],
    ['Monthly loss limit', CFG.RULES_R.monthly, CFG.RULES_R.monthly + 'R', 'limit'],
    ['Monthly cash target', CFG.RULES_R.target, CFG.RULES_R.target + 'R', 'fig'],
    ['Banked before the first withdrawal', CFG.RULES_R.buffer, CFG.RULES_R.buffer + 'R (3 months)', 'fig'],
    ['Withdrawals pause if the buffer falls below', CFG.RULES_R.pauseBelow, CFG.RULES_R.pauseBelow + 'R (1 month)', 'fig'],
    ['Withdrawals resume when the buffer is back to', CFG.RULES_R.resumeAt, CFG.RULES_R.resumeAt + 'R (3 months)', 'fig'],
  ];
  html.rulesRows = rows.map(([name, r, inR, kind]) => {
    const cells = CFG.SIZING.sizes.map(s => {
      const m = SIZE.compute(CFG, s.multiple);
      const v = m.R * r;
      const sel = s.multiple === def ? ' is-sel' : '';
      if (kind === 'fig' && !CFG.FLAGS.targetsLive) return '<td data-col="' + s.id + '" class="' + sel.trim() + '"><span class="num">' + r + 'R</span></td>';
      return '<td data-col="' + s.id + '" class="' + sel.trim() + '"><span class="num">' + SIZE.usd(v) + '</span><small>' + SIZE.pct(v / total) + ' of ' + SIZE.usd(total) + '</small></td>';
    }).join('');
    return '          <tr><th scope="row">' + esc(name) + '</th><td class="num">' + esc(inR) + '</td>' + cells + '</tr>';
  }).join('\n');

  html.optionsRulesRows = opt.rules.map(x =>
    '          <tr><th scope="row">' + esc(x.rule) + '</th><td>' + (x.level == null ? CHIP : esc(x.level)) + '</td><td>' + esc(x.action) + '</td></tr>'
  ).join('\n');

  return { t, html, feeds };
}

function render(tpl, ctx) {
  let out = tpl;
  // Conditional blocks
  const keep = { live: CFG.FLAGS.targetsLive, off: !CFG.FLAGS.targetsLive, capacity: CFG.FLAGS.showCapacity };
  for (const [name, on] of Object.entries(keep)) {
    const re = new RegExp('<!--' + name + '-->([\\s\\S]*?)<!--/' + name + '-->\\n?', 'g');
    out = out.replace(re, on ? '$1' : '');
  }
  out = out.replace(/\{\{([\w.]+)\}\}/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(ctx.html, key)) return ctx.html[key];
    if (!Object.prototype.hasOwnProperty.call(ctx.t, key)) throw new Error('Unknown template token: ' + key);
    const v = ctx.t[key];
    return v == null ? CHIP : esc(v);
  });
  // Deepest-drawdown sentence from the build-time snapshot (app.js refreshes it live)
  const f = ctx.feeds && ctx.feeds.futures;
  if (f && f.ok && f.summary) {
    const asOf = new Intl.DateTimeFormat('en-US', { timeZone: CFG.SITE.timeZone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(f.fetchedAt));
    out = out.replace('<span data-dd-sentence>The deepest drawdown so far is on the dashboard.</span>',
      '<span data-dd-sentence>The deepest futures drawdown in the record so far is ' + f.summary.deepestDrawdownR + 'R (as of ' + esc(asOf) + ').</span>');
  }
  return out;
}

(async function main() {
  if (PROD) {
    const nulls = findNulls(CFG);
    if (nulls.length) {
      console.error('Production build blocked. Fill these config.js fields first:\n  ' + nulls.join('\n  '));
      process.exit(1);
    }
  }
  const feeds = await buildFeeds();
  const tpl = fs.readFileSync(path.join(ROOT, 'src/index.template.html'), 'utf8');
  const html = render(tpl, context(feeds));
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  console.log('Built index.html (' + (PROD ? 'prod' : 'dev') + '). Feeds: futures=' + !!(feeds.futures && feeds.futures.ok) + ' options=' + !!(feeds.options && feeds.options.ok));
})().catch(e => { console.error(e); process.exit(1); });
