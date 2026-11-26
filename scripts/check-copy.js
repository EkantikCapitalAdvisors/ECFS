#!/usr/bin/env node
// Forbidden-string sweep over the rendered page and the source files (scripts/ and test/ excluded).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const FORBIDDEN = /guarantee|protect|\bcap\b|\bcapped\b|never lose|skip the crashes|principal protected|fiduciary|sec registered|copy[- ]?trad|mirror|invest now|pre-regist|reserve your|founding|26% CAGR|predisposal|\bECFS\b|20,000|16R/i;
const ABOVE_2X = /\b[3-9]x\b/i;

function files() {
  const list = ['index.html', 'config.js', 'app.js', 'styles.css', 'feeds/live.json'];
  for (const dir of ['src', 'lib']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) list.push(path.join(dir, f));
  }
  return list.filter(f => fs.existsSync(path.join(ROOT, f)));
}

let bad = 0;
for (const f of files()) {
  const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [name, re] of [['forbidden', FORBIDDEN], ['above-2x', ABOVE_2X]]) {
      const m = line.match(re);
      if (m) { bad++; console.error(f + ':' + (i + 1) + ' [' + name + '] "' + m[0] + '"  ' + line.trim().slice(0, 140)); }
    }
  });
}
// Any mention of backtests or demo results needs the hypothetical-performance statement on the page.
const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (/backtest|demo record/i.test(page) && !page.includes('HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN LIMITATIONS')) {
  bad++; console.error('index.html mentions backtests or demo results without the hypothetical-performance statement');
}
// The live snapshot must never carry an IBKR account number.
const liveFile = path.join(ROOT, 'feeds', 'live.json');
if (fs.existsSync(liveFile) && /\b[DU]\d{6,8}\b/.test(fs.readFileSync(liveFile, 'utf8'))) {
  bad++; console.error('feeds/live.json contains what looks like an IBKR account ID');
}
if (bad) { console.error(bad + ' finding(s).'); process.exit(1); }
console.log('check:copy passed — no forbidden strings, no size above 2x.');
