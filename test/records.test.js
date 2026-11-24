'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const REC = require('../lib/records.js');

const fut = [
  { trade_num: 1, entry_time: '2026-01-05 09:40:00', direction: 'Long', dollar_pl: 500, risk_dollars: 250 },
  { trade_num: 2, entry_time: '2026-01-06 10:00:00', direction: 'Short', dollar_pl: -250, risk_dollars: 250 },
  { trade_num: 2, entry_time: '2026-01-06 10:00:00', direction: 'Short', dollar_pl: -250, risk_dollars: 250 }, // duplicate
  { trade_num: 3, entry_time: '2026-02-02 09:35:00', direction: 'Long', dollar_pl: -500, risk_dollars: 250 },
  { trade_num: 4, entry_time: '2026-02-03 09:35:00', direction: 'Long', dollar_pl: 750, risk_dollars: 250 },
];

test('futures summary: R, win rate, profit factor, drawdown, monthly', () => {
  const s = REC.futuresSummary(fut);
  assert.equal(s.trades, 4);
  assert.equal(s.totalR, 2);          // 2 - 1 - 2 + 3
  assert.equal(s.avgR, 0.5);
  assert.equal(s.winRate, 0.5);
  assert.equal(s.profitFactor, 1.67); // 1250 / 750
  assert.equal(s.deepestDrawdownR, 3); // peak 2 -> -1
  assert.deepEqual(s.cumulativeR, [2, 1, -1, 2]);
  assert.deepEqual(s.monthlyR, [{ month: '2026-01', r: 1 }, { month: '2026-02', r: 1 }]);
  assert.equal(s.last5[0].closed, '2026-02-03');
  assert.equal(s.last5[0].r, 3);
});

test('options summary: balance, multiple, % drawdown, open fills excluded', () => {
  const opt = [
    { entry_time: '2026-07-01 10:00', ticker: 'SPY', direction: 'Long', option_type: 'Call', dollar_pl: 2000, outcome: 'Win' },
    { entry_time: '2026-07-02 10:00', ticker: 'QQQ', direction: 'Long', option_type: 'Put', dollar_pl: -3000, outcome: 'Loss' },
    { entry_time: '2026-08-03 10:00', ticker: 'SPY', direction: 'Long', option_type: 'Call', dollar_pl: 5000, outcome: 'Win' },
    { entry_time: '2026-08-04 10:00', ticker: 'SPY', direction: 'Long', option_type: 'Call', dollar_pl: 999, outcome: 'Open' },
  ];
  const s = REC.optionsSummary(opt, 10000);
  assert.equal(s.fills, 3);
  assert.equal(s.balance, 14000);
  assert.equal(s.multiple, 1.4);
  assert.equal(s.deepestDrawdownPct, 0.25); // 12000 -> 9000
  assert.deepEqual(s.monthlyUsd, [{ month: '2026-07', usd: -1000 }, { month: '2026-08', usd: 5000 }]);
  assert.equal(s.last5[0].underlying, 'SPY');
});

test('empty or malformed feeds give null (empty state)', () => {
  for (const raw of [null, undefined, [], {}, 'x']) {
    assert.equal(REC.futuresSummary(raw), null);
    assert.equal(REC.optionsSummary(raw, 10000), null);
  }
});

test('timestamp parsing handles ISO and US formats', () => {
  assert.deepEqual(REC.parseTS('2026-03-04 1:05 PM'), { y: 2026, mo: 3, d: 4, h: 13, mi: 5, s: 0 });
  assert.deepEqual(REC.parseTS('3/4/2026 12:10 AM'), { y: 2026, mo: 3, d: 4, h: 0, mi: 10, s: 0 });
  assert.equal(REC.parseTS('garbage'), null);
});
