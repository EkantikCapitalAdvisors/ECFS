#!/usr/bin/env node
// Pulls the live account's daily NAV from the IBKR Flex Web Service and writes feeds/live.json.
// Only percentages are written: no account ID, no dollar balance (unless LIVE.showDollars).
//
// Secrets (GitHub Actions → repository secrets):
//   IBKR_FLEX_TOKEN     Flex Web Service token (read-only)
//   IBKR_FLEX_QUERY_ID  Activity Flex Query ID. The query needs:
//     - Net Asset Value (NAV) in Base, daily breakdown ("EquitySummaryByReportDateInBase")
//     - Cash Transactions, type Deposits/Withdrawals
//     - Period: Last 365 Calendar Days (or Year to Date), format XML
// Without the secrets the script leaves feeds/live.json as it is and exits 0.
'use strict';
const fs = require('fs');
const path = require('path');
const CFG = require('../config.js');
const CAMP = require('../lib/campaigns.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'feeds', 'live.json');
const BASE = process.env.IBKR_FLEX_BASE || 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService';

function attrs(tag) {
  const o = {};
  tag.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { o[k] = v; return ''; });
  return o;
}
function elements(xml, name) {
  const re = new RegExp('<' + name + '\\b[^>]*?/?>', 'g');
  return (xml.match(re) || []).map(attrs);
}
const tagText = (xml, name) => { const m = xml.match(new RegExp('<' + name + '>([^<]*)</' + name + '>')); return m ? m[1].trim() : null; };

// Statement XML -> [{date, nav, flow}]
function parseStatement(xml) {
  const nav = new Map();
  for (const e of elements(xml, 'EquitySummaryByReportDateInBase')) {
    const d = CAMP.normDate(e.reportDate);
    const v = parseFloat(e.total);
    if (d && isFinite(v)) nav.set(d, v);
  }
  const flows = new Map();
  for (const e of elements(xml, 'CashTransaction')) {
    if (!/deposit|withdraw/i.test(e.type || '')) continue;
    if (e.levelOfDetail && !/detail/i.test(e.levelOfDetail)) continue;
    const d = CAMP.normDate(e.reportDate || e.settleDate || e.dateTime);
    const amt = parseFloat(e.amount) * (parseFloat(e.fxRateToBase) || 1);
    if (d && isFinite(amt)) flows.set(d, (flows.get(d) || 0) + amt);
  }
  return Array.from(nav.entries()).sort().map(([date, v]) => ({ date, nav: v, flow: flows.get(date) || 0 }));
}

function buildLive(rows, today) {
  const T = CFG.TARGET;
  const campaigns = CAMP.fromDailyNav(rows, CFG.CAMPAIGNS.firstQuarter)
    .map(c => CAMP.evaluate(c, T.quarterReturnPct, T.maxDrawdownPct, today));
  const last = rows.length ? rows[rows.length - 1].date : null;
  const out = { ok: true, source: 'ibkr-flex', fetchedAt: new Date().toISOString(), asOf: last, campaigns };
  if (CFG.LIVE.showDollars && rows.length) out.navUsd = Math.round(rows[rows.length - 1].nav);
  return out;
}

async function getStatement(token, queryId) {
  const v = '&v=3';
  const send = await (await fetch(BASE + '/SendRequest?t=' + encodeURIComponent(token) + '&q=' + encodeURIComponent(queryId) + v)).text();
  if (tagText(send, 'Status') !== 'Success') throw new Error('SendRequest failed: ' + (tagText(send, 'ErrorMessage') || send.slice(0, 200)));
  const ref = tagText(send, 'ReferenceCode');
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 5000 + i * 3000));
    const res = await (await fetch(BASE + '/GetStatement?t=' + encodeURIComponent(token) + '&q=' + encodeURIComponent(ref) + v)).text();
    if (res.includes('<FlexQueryResponse')) return res;
    const code = tagText(res, 'ErrorCode');
    if (code !== '1019' && code !== '1018') throw new Error('GetStatement failed: ' + (tagText(res, 'ErrorMessage') || res.slice(0, 200)));
  }
  throw new Error('Statement not ready after retries');
}

module.exports = { parseStatement, buildLive };

if (require.main === module) {
  (async () => {
    const token = process.env.IBKR_FLEX_TOKEN, q = process.env.IBKR_FLEX_QUERY_ID;
    if (!token || !q) { console.log('IBKR Flex secrets not set; feeds/live.json left unchanged.'); return; }
    try {
      const xml = await getStatement(token, q);
      const rows = parseStatement(xml);
      if (!rows.length) throw new Error('No daily NAV rows in the statement. Check the query has NAV in Base with a daily breakdown.');
      const today = new Date().toISOString().slice(0, 10);
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, JSON.stringify(buildLive(rows, today)) + '\n');
      console.log('feeds/live.json written: ' + rows.length + ' days, last ' + rows[rows.length - 1].date);
    } catch (e) {
      // Keep the previous snapshot; the page shows its as-of date, so staleness is visible.
      console.error('IBKR Flex pull failed: ' + e.message);
      process.exitCode = 1;
    }
  })();
}
