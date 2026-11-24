'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CFG = require('../config.js');
const { findNulls, sanity } = require('../scripts/check-config.js');

test('config passes sanity checks', () => {
  assert.deepEqual(sanity(CFG), []);
});

test('nulls are reported as [DATA REQUIRED]; optional ones are skipped', () => {
  const n = findNulls(CFG);
  for (const opt of CFG.OPTIONAL_NULLS) assert.ok(!n.includes(opt));
  const copy = JSON.parse(JSON.stringify(CFG));
  copy.SITE.email = null;
  assert.ok(findNulls(copy).includes('SITE.email'));
});

test('Commit 1 ships with targets off and capacity hidden', () => {
  assert.equal(CFG.FLAGS.targetsLive, false);
  assert.equal(CFG.FLAGS.showCapacity, false);
});
