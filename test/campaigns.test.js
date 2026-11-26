'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../lib/campaigns.js');

const near = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-4), a + ' != ' + b);

test('quarter helpers', () => {
  assert.equal(C.quarterOf('2027-02-15'), '2027-Q1');
  assert.equal(C.quarterOf('2027-12-31'), '2027-Q4');
  assert.deepEqual(C.quarterBounds('2027-Q1'), { start: '2027-01-01', end: '2027-03-31' });
  assert.deepEqual(C.quarterBounds('2028-Q1'), { start: '2028-01-01', end: '2028-03-31' });
  assert.deepEqual(C.quarterBounds('2027-Q2'), { start: '2027-04-01', end: '2027-06-30' });
  assert.equal(C.nextQuarter('2027-Q4'), '2028-Q1');
  assert.equal(C.normDate('20270103'), '2027-01-03');
});

test('daily NAV: time-weighted return ignores deposits and withdrawals', () => {
  const rows = [
    { date: '2026-12-31', nav: 50000 },
    { date: '2027-01-04', nav: 51000 },             // +2%
    { date: '2027-01-05', nav: 61000, flow: 10000 }, // deposit, 0% return
    { date: '2027-01-06', nav: 57950 },             // -5%
    { date: '2027-01-07', nav: 55000, flow: -3000 }, // withdrawal: (55000+3000-57950)/57950 ≈ +0.086%
  ];
  const [q] = C.fromDailyNav(rows, '2027-Q1');
  near(q.returnPct, 1.02 * 1 * 0.95 * (58000 / 57950) - 1);
  near(q.maxDrawdownPct, 0.05);
  assert.equal(q.firstDate, '2027-01-04');
  assert.equal(q.series.length, 4);
});

test('quarters before the first campaign are ignored', () => {
  const rows = [{ date: '2026-11-30', nav: 100 }, { date: '2026-12-01', nav: 110 }, { date: '2027-01-04', nav: 121 }];
  const qs = C.fromDailyNav(rows, '2027-Q1');
  assert.deepEqual(qs.map(q => q.id), ['2027-Q1']);
  near(qs[0].returnPct, 0.1);
});

test('drawdown counts the quarter start as a peak and resets each quarter', () => {
  const qs = C.fromTrades([
    { date: '2027-01-10', pl: -5000 }, // 50k -> 45k: 10% down from the start
    { date: '2027-02-10', pl: 10000 },
    { date: '2027-04-10', pl: -1100 },
  ], 50000);
  near(qs[0].maxDrawdownPct, 0.10);
  near(qs[0].returnPct, 0.10);
  near(qs[1].maxDrawdownPct, 1100 / 55000);
});

test('scoring: met needs both the target and the drawdown limit', () => {
  const base = { start: '2027-01-01', end: '2027-03-31', lastDate: '2027-03-31' };
  const ev = (r, dd, today) => C.evaluate(Object.assign({}, base, { returnPct: r, maxDrawdownPct: dd }), 0.10, 0.10, today || '2027-04-02');
  assert.equal(ev(0.11, 0.04).status, 'met');
  assert.equal(ev(0.10, 0.0999).status, 'met');
  assert.equal(ev(0.12, 0.10).status, 'missed');  // drawdown must stay under the limit
  assert.equal(ev(0.06, 0.02).status, 'missed');
  assert.equal(ev(-0.03, 0.05).status, 'missed');
});

test('in-progress status: pace, target reached, drawdown limit', () => {
  const mid = { start: '2027-01-01', end: '2027-03-31', lastDate: '2027-02-14' }; // 45 of 90 days
  const ev = (r, dd) => C.evaluate(Object.assign({}, mid, { returnPct: r, maxDrawdownPct: dd }), 0.10, 0.10, '2027-02-15');
  near(ev(0.05, 0).pacePct, 0.05, 1e-3);
  assert.equal(ev(0.06, 0.01).status, 'on-pace');
  assert.equal(ev(0.03, 0.01).status, 'behind');
  assert.equal(ev(0.10, 0.01).status, 'target-reached');
  assert.equal(ev(0.05, 0.11).status, 'dd-limit');
  assert.equal(ev(0.05, 0.01).complete, false);
  assert.equal(ev(0.05, 0.01).daysLeft, 44);
});
