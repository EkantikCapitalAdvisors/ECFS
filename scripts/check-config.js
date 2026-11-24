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
  for (const k of ['FLAGS', 'SITE', 'PORTFOLIO', 'RULES_R', 'SIZING', 'PLANNING', 'FEEDS', 'ENGINES']) walk(cfg[k], k, out);
  const optional = new Set(cfg.OPTIONAL_NULLS || []);
  return out.filter(p => !optional.has(p));
}

function sanity(cfg) {
  const errs = [];
  const { sleeves, totalUsd } = cfg.PORTFOLIO;
  if (sleeves.futures + sleeves.options !== totalUsd) errs.push('PORTFOLIO.sleeves do not add up to PORTFOLIO.totalUsd');
  if (cfg.SIZING.sizes.some(s => s.multiple > cfg.SIZING.maxMultiple)) errs.push('SIZING.sizes lists a size above maxMultiple');
  if (!cfg.SIZING.sizes.some(s => s.id === cfg.SIZING.default)) errs.push('SIZING.default is not one of SIZING.sizes');
  for (const e of ['futures', 'options']) {
    const l = cfg.ENGINES[e].record.label;
    if (l != null && l !== 'DEMO' && l !== 'OWN MONEY') errs.push('ENGINES.' + e + '.record.label must be "DEMO" or "OWN MONEY"');
  }
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
