// Single source of truth for cashflow.ekantikcapital.com.
// null = [DATA REQUIRED]. Dev build: red chip. Production build (--prod): fails.
// Size-based dollar figures are never typed here or in copy: lib/size.js computes them.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ECA_CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FLAGS = {
    targetsLive: false,  // true only after attorney review + witness countersignature
    showCapacity: false, // true only after the capacity limit is confirmed and its measure stated
  };

  const SITE = {
    title: 'One Portfolio, Two Engines | Ekantik Capital Advisors',
    publisher: 'Ekantik Capital Advisors LLC',
    homeUrl: 'https://ekantikcapital.com',
    bookCallUrl: 'https://cal.com/ekantik',
    email: 'info@ekantikcapital.com',
    witness: 'Manish Dharod',
    protocolUrl: 'https://accelerator.ekantikcapital.com/falsifiability-protocol-v2.html',
    feeLine: 'Phase 1 has no management fee.',
    minAccountUsd: 50000,
    unitUsd: 50000,
    capacityUsd: 5000000,
    timeZone: 'America/Chicago',
  };

  const PORTFOLIO = {
    totalUsd: 50000,
    sleeves: { futures: 40000, options: 10000 },
    surplusRule: 'stays', // surplus above a full buffer stays in the futures account
  };

  // Every futures rule is written in R.
  // R = the dollars risked on one futures trade, entry to stop.
  const RULES_R = {
    target: 2,     // monthly cash target
    buffer: 6,     // banked before the first withdrawal = 3 months of target
    pauseBelow: 2, // withdrawals pause if the buffer falls below 1 month of target
    resumeAt: 6,   // withdrawals resume when the buffer is back to 3 months
    daily: 2,      // daily loss limit
    weekly: 4,     // weekly loss limit
    monthly: 8,    // monthly loss limit
  };

  // Alerts are sized at 1x: the futures daily loss limit = 1% of the portfolio.
  const SIZING = {
    baseDailyRiskPct: 0.01,
    sizes: [
      { id: '1x', label: '1x · as alerted', multiple: 1 },
      { id: '2x', label: '2x · double size', multiple: 2 },
    ],
    maxMultiple: 2,       // never show or compute a size above this
    default: '1x',
    appliesTo: 'futures', // options always run at 1x on their own ladder
  };

  const PLANNING = {
    annualR: 30,                      // conservative futures planning rate, as published on accelerator
    buildText: 'two to three months', // 6R buffer at about 2.5R a month
    recordRiskPct: 0.0125,            // risk share of the futures account the published record was run at
  };

  const FEEDS = {
    // Public JSON the two accelerator dashboards read. Fetched at build time only;
    // the browser reads the same-origin snapshot in /feeds.
    futuresUrl: 'https://raw.githubusercontent.com/EkantikCapitalAdvisors/Accelerator/main/data/tenx_trades.json',
    optionsUrl: 'https://raw.githubusercontent.com/EkantikCapitalAdvisors/Accelerator/main/data/options_trades.json',
    standdownUrl: 'https://raw.githubusercontent.com/EkantikCapitalAdvisors/Accelerator/main/data/standdown-state.json',
    pollMarketMs: 60 * 1000,
    pollOffMs: 15 * 60 * 1000,
    staleAfterMs: 15 * 60 * 1000,
    sampleTarget: 100,
  };

  const ENGINES = {
    futures: {
      name: 'Cash-Flow Engine',
      short: 'Futures',
      job: 'Monthly cash',
      instrument: 'S&P 500 futures (ES / MES)',
      discordUrl: 'https://discord.gg/GprT4S8Vrj',
      dashboardUrl: 'https://accelerator.ekantikcapital.com/experiment.html',
      record: { label: null, startDate: null },        // label: 'DEMO' | 'OWN MONEY'
      status: { code: 'T0', updatedAt: null },
      stopRule:
        'If the last 100 trades average $0 or less, trading stops. A restart needs a 50-trade test, a written cause analysis, a 48-hour cool-off and witness sign-off.',
    },
    options: {
      name: 'Compounding Engine',
      short: 'Options',
      job: 'Long-term growth',
      instrument: 'Short-dated options',
      discordUrl: 'https://discord.gg/GawjC6ef7t',
      dashboardUrl: 'https://accelerator.ekantikcapital.com/options-dashboard.html',
      record: { label: null, startDate: '2026-06-30', startUsd: 10000 },
      status: { code: 'T0', updatedAt: null },
      rules: [
        { rule: 'Starting size', level: '1 contract', action: 'The full sleeve is treated as at risk' },
        { rule: 'Step up', level: '6 profitable, unrelated trades at the current size', action: 'Size doubles: 1 → 2 → 4 → 8 → 16' },
        { rule: 'Step down', level: 'Profits fall back to the last step', action: 'Size drops one level at once' },
        { rule: 'Daily', level: '1 realized loss', action: 'Done for the day' },
        { rule: 'Weekly premium-loss limit', level: null, action: 'Done for the week' },
        { rule: 'Monthly', level: '2 losing weeks in a row', action: 'Done for the month' },
      ],
      stopRule:
        'If the last 100 trades average $0 or less, the engine goes to review. Two step-downs within 14 days pause it until the witness signs a restart.',
    },
  };

  // Fields that may be null without blocking a production build (null = hide the element).
  const OPTIONAL_NULLS = ['ENGINES.futures.status.updatedAt', 'ENGINES.options.status.updatedAt'];

  const DISCLOSURE =
    'Ekantik Capital Advisors LLC is a financial publisher. This page is educational, of general circulation and not personalized to anyone. It is not investment advice and not an offer to sell, or a solicitation of an offer to buy, any security or advisory service. Monthly cash targets are targets, not forecasts; they may be reduced, paused or never reached. Each engine’s record is labeled as a demo (paper) account or an own-money account; demo results are hypothetical and real results would differ. Figures assume every alert is followed without deviation; real results vary with timing, slippage and adherence. Alerts are sized at 1x for a $50,000 portfolio; sizes above 2x are outside the published rules. Futures are leveraged and losses can exceed the amount deposited. Options can lose the full premium paid. Loss limits stop new trades; they are not floors. Past performance is not indicative of future results.';

  return { FLAGS, SITE, PORTFOLIO, RULES_R, SIZING, PLANNING, FEEDS, ENGINES, OPTIONAL_NULLS, DISCLOSURE };
});
