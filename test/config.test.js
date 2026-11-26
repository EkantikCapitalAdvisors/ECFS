'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CFG = require('../config.js');
const { findNulls, sanity } = require('../scripts/check-config.js');

test('config passes sanity checks and has no [DATA REQUIRED] fields', () => {
  assert.deepEqual(sanity(CFG), []);
  assert.deepEqual(findNulls(CFG), []);
});

test('nulls are reported', () => {
  const copy = JSON.parse(JSON.stringify(CFG));
  copy.SITE.email = null;
  assert.ok(findNulls(copy).includes('SITE.email'));
});

test('targets and public-data settings', () => {
  assert.equal(CFG.TARGET.quarterReturnPct, 0.10);
  assert.equal(CFG.TARGET.maxDrawdownPct, 0.10);
  assert.equal(CFG.TARGET.minAccountUsd, 50000);
  assert.equal(CFG.LIVE.showDollars, false);
  assert.equal(CFG.CAMPAIGNS.firstQuarter, '2027-Q1');
});
