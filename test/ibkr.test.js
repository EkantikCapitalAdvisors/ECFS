'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStatement, buildLive } = require('../scripts/ibkr-flex.js');

const XML = `<FlexQueryResponse queryName="nav" type="AF"><FlexStatements count="1">
<FlexStatement accountId="U0000000" fromDate="20261201" toDate="20270108">
<EquitySummaryInBase>
<EquitySummaryByReportDateInBase accountId="U0000000" currency="USD" reportDate="20261231" cash="1" total="50000" />
<EquitySummaryByReportDateInBase accountId="U0000000" currency="USD" reportDate="20270104" cash="1" total="51000" />
<EquitySummaryByReportDateInBase accountId="U0000000" currency="USD" reportDate="20270105" cash="1" total="61000" />
</EquitySummaryInBase>
<CashTransactions>
<CashTransaction accountId="U0000000" currency="USD" fxRateToBase="1" type="Deposits/Withdrawals" amount="10000" reportDate="20270105" levelOfDetail="DETAIL" />
<CashTransaction accountId="U0000000" currency="USD" fxRateToBase="1" type="Broker Interest Received" amount="12.5" reportDate="20270105" levelOfDetail="DETAIL" />
</CashTransactions>
</FlexStatement></FlexStatements></FlexQueryResponse>`;

test('parses daily NAV and deposits from a Flex statement', () => {
  const rows = parseStatement(XML);
  assert.deepEqual(rows, [
    { date: '2026-12-31', nav: 50000, flow: 0 },
    { date: '2027-01-04', nav: 51000, flow: 0 },
    { date: '2027-01-05', nav: 61000, flow: 10000 },
  ]);
});

test('the published snapshot carries percentages only, never the account or balance', () => {
  const live = buildLive(parseStatement(XML), '2027-01-06');
  const s = JSON.stringify(live);
  assert.ok(!s.includes('U0000000'));
  assert.ok(!('navUsd' in live));
  assert.ok(!/51000|61000|50000/.test(s));
  assert.equal(live.campaigns.length, 1);
  assert.equal(live.campaigns[0].returnPct, 0.02);
  assert.equal(live.asOf, '2027-01-05');
});
