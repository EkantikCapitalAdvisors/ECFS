// Single source of truth for cashflow.ekantikcapital.com.
// null = [DATA REQUIRED]. Dev build: red chip. Production build (--prod): fails.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ECA_CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SITE = {
    title: 'Cash-Flow Strategy | Ekantik Capital Advisors',
    name: 'Cash-Flow Strategy',
    publisher: 'Ekantik Capital Advisors LLC',
    homeUrl: 'https://ekantikcapital.com',
    bookCallUrl: 'https://cal.com/ekantik',
    email: 'info@ekantikcapital.com',
    feeLine: 'Phase 1 has no management fee.',
    timeZone: 'America/Chicago',
  };

  // The two numbers every quarter is scored on.
  const TARGET = {
    quarterReturnPct: 0.10, // target return per calendar quarter
    maxDrawdownPct: 0.10,   // drawdown limit per quarter (must stay below)
    minAccountUsd: 50000,
  };

  const PORTFOLIO = {
    totalUsd: 50000,
    sleeves: { futures: 40000, options: 10000 },
  };

  // Live campaigns are scored from the IBKR account (scripts/ibkr-flex.js -> feeds/live.json).
  const CAMPAIGNS = {
    firstQuarter: '2027-Q1',
  };
  const LIVE = {
    broker: 'Interactive Brokers',
    showDollars: false, // percentages only on the public page
  };

  // Demo (paper) records of the two engines, combined as one account for reference.
  const DEMO = {
    futuresUrl: 'https://raw.githubusercontent.com/EkantikCapitalAdvisors/Accelerator/main/data/tenx_trades.json',
    optionsUrl: 'https://raw.githubusercontent.com/EkantikCapitalAdvisors/Accelerator/main/data/options_trades.json',
    startUsd: 50000,
  };

  const ENGINES = {
    futures: {
      name: 'Futures engine',
      instrument: 'S&P 500 futures (ES / MES)',
      discordUrl: 'https://discord.gg/GprT4S8Vrj',
      dashboardUrl: 'https://accelerator.ekantikcapital.com/experiment.html',
    },
    options: {
      name: 'Options engine',
      instrument: 'Short-dated index options',
      discordUrl: 'https://discord.gg/GawjC6ef7t',
      dashboardUrl: 'https://accelerator.ekantikcapital.com/options-dashboard.html',
    },
  };

  // Fields that may be null without blocking a production build.
  const OPTIONAL_NULLS = [];

  const DISCLOSURE =
    'Ekantik Capital Advisors LLC is a financial publisher. This page is educational, of general circulation and not personalized to anyone. It is not investment advice and not an offer to sell, or a solicitation of an offer to buy, any security or advisory service. The 10% quarterly return and 10% drawdown figures are targets, not forecasts or promises; many quarters may miss them, and losses can exceed the drawdown limit. The targets were derived from backtests and a demo record, which are hypothetical. Live campaign figures come from a single Interactive Brokers account, are time-weighted, exclude deposits and withdrawals, and are after commissions but before any subscription fees; your results will differ with timing, slippage, sizing and adherence. Futures are leveraged and losses can exceed the amount deposited. Options can lose the full premium paid. Past performance is not indicative of future results.';

  // CFTC Rule 4.41(b)(1) statement for hypothetical or simulated results.
  const HYPOTHETICAL =
    'HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN LIMITATIONS. UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS DO NOT REPRESENT ACTUAL TRADING. ALSO, SINCE THE TRADES HAVE NOT BEEN EXECUTED, THE RESULTS MAY HAVE UNDER-OR-OVER COMPENSATED FOR THE IMPACT, IF ANY, OF CERTAIN MARKET FACTORS, SUCH AS LACK OF LIQUIDITY. SIMULATED TRADING PROGRAMS IN GENERAL ARE ALSO SUBJECT TO THE FACT THAT THEY ARE DESIGNED WITH THE BENEFIT OF HINDSIGHT. NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY TO ACHIEVE PROFIT OR LOSSES SIMILAR TO THOSE SHOWN.';

  return { SITE, TARGET, PORTFOLIO, CAMPAIGNS, LIVE, DEMO, ENGINES, OPTIONAL_NULLS, DISCLOSURE, HYPOTHETICAL };
});
