#!/usr/bin/env node
// Lists every null in config.js (= [DATA REQUIRED]). In production mode (--prod) exits 1 while any remain.
'use strict';
const path = require('path');

function walk(obj, prefix, out) {
  if (obj === null) { out.push(prefix); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, prefix + '[' + i + ']', out)); return; }
  if (typeof obj === 'object') for (const k of Object.keys(obj)) walk(obj[k], prefix ? prefix + '.' + k : k, out);
}

function findNulls(cfg) {
  const out = [];
  for (const k of Object.keys(cfg)) if (k !== 'OPTIONAL_NULLS') walk(cfg[k], k, out);
  const optional = new Set(cfg.OPTIONAL_NULLS || []);
  return out.filter(p => !optional.has(p));
}

function sanity(cfg) {
  const errs = [];
  const { sleeves, totalUsd } = cfg.PORTFOLIO;
  if (sleeves.futures + sleeves.options !== totalUsd) errs.push('PORTFOLIO.sleeves do not add up to PORTFOLIO.totalUsd');
  if (!/^\d{4}-Q[1-4]$/.test(cfg.CAMPAIGNS.firstQuarter)) errs.push('CAMPAIGNS.firstQuarter must look like 2027-Q1');
  const T = cfg.TARGET;
  if (!(T.quarterReturnPct > 0 && T.quarterReturnPct < 1)) errs.push('TARGET.quarterReturnPct must be a fraction, e.g. 0.10');
  if (!(T.maxDrawdownPct > 0 && T.maxDrawdownPct < 1)) errs.push('TARGET.maxDrawdownPct must be a fraction, e.g. 0.10');
  if (!/HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS/.test(cfg.HYPOTHETICAL || '')) errs.push('HYPOTHETICAL statement missing');
  return errs;
}

module.exports = { findNulls, sanity };

if (require.main === module) {
  const cfg = require(path.join(__dirname, '..', 'config.js'));
  const prod = process.argv.includes('--prod');
  const nulls = findNulls(cfg);
  const errs = sanity(cfg);
  errs.forEach(e => console.error('config error: ' + e));
  if (nulls.length) console.log('[DATA REQUIRED] ' + nulls.length + ' field(s):\n  ' + nulls.join('\n  '));
  else console.log('No [DATA REQUIRED] fields remain.');
  if (errs.length || (prod && nulls.length)) process.exit(1);
}
