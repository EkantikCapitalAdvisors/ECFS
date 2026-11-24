'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CFG = require('../config.js');
const SIZE = require('../lib/size.js');

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' != ' + b);

test('1x matches the spec size table', () => {
  const m = SIZE.compute(CFG, 1);
  near(m.dailyLimitUsd, 500);
  near(m.R, 250); near(m.rPct, 0.005);
  const want = { daily: [500, 0.01], weekly: [1000, 0.02], monthly: [2000, 0.04], target: [500, 0.01], buffer: [1500, 0.03], pauseBelow: [500, 0.01], resumeAt: [1500, 0.03] };
  for (const [k, [usd, pct]] of Object.entries(want)) { near(m.rules[k].usd, usd); near(m.rules[k].pct, pct); }
  near(m.riskShareOfFutures, 0.00625);
});

test('2x doubles every figure and matches the record risk share', () => {
  const a = SIZE.compute(CFG, 1), b = SIZE.compute(CFG, 2);
  near(b.R, 500); near(b.dailyLimitUsd, 1000);
  for (const k of Object.keys(a.rules)) near(b.rules[k].usd, 2 * a.rules[k].usd);
  near(b.rules.monthly.pct, 0.08);
  near(b.riskShareOfFutures, CFG.PLANNING.recordRiskPct);
});

test('any size above 2x throws', () => {
  assert.throws(() => SIZE.compute(CFG, 3));
  assert.throws(() => SIZE.compute(CFG, 2.5));
  assert.throws(() => SIZE.compute(CFG, 0));
  assert.throws(() => SIZE.compute(CFG, NaN));
});

test('URL size falls back to the default', () => {
  assert.equal(SIZE.resolveSizeId(CFG, '2x'), '2x');
  assert.equal(SIZE.resolveSizeId(CFG, '1x'), '1x');
  for (const bad of [null, undefined, '', '3x', '10x', 'abc']) assert.equal(SIZE.resolveSizeId(CFG, bad), '1x');
});

test('limit strings are in dollars, % of portfolio and R', () => {
  assert.equal(SIZE.limit(CFG, 1, 2), '$500 · 1% of $50,000 · 2R');
  assert.equal(SIZE.limit(CFG, 2, 8), '$4,000 · 8% of $50,000 · 8R');
});

test('targets stay in R while targetsLive is false', () => {
  assert.equal(CFG.FLAGS.targetsLive, false);
  assert.equal(SIZE.fig(CFG, 1, 2), '2R');
  assert.equal(SIZE.fig(CFG, 2, 6), '6R');
});

test('sizes listed never exceed the max', () => {
  assert.equal(CFG.SIZING.maxMultiple, 2);
  assert.ok(CFG.SIZING.sizes.every(s => s.multiple <= 2));
  assert.equal(CFG.PORTFOLIO.sleeves.futures + CFG.PORTFOLIO.sleeves.options, CFG.PORTFOLIO.totalUsd);
});
