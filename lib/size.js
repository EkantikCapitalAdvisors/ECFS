// Size math. Compute, never hard-code. Any multiple above SIZING.maxMultiple throws.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ECA_SIZE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function usd(v) {
    return '$' + Math.round(v).toLocaleString('en-US');
  }
  function pct(v) {
    // 0.01 -> "1%", 0.00625 -> "0.625%"
    const p = Math.round(v * 100 * 1000) / 1000;
    return p.toLocaleString('en-US', { maximumFractionDigits: 3 }) + '%';
  }

  function sizeById(cfg, id) {
    return cfg.SIZING.sizes.find(s => s.id === id) || null;
  }

  // Missing, unknown or above-limit ids fall back to the default size.
  function resolveSizeId(cfg, id) {
    const s = sizeById(cfg, id);
    if (!s || s.multiple > cfg.SIZING.maxMultiple) return cfg.SIZING.default;
    return s.id;
  }

  function compute(cfg, multiple) {
    if (typeof multiple !== 'number' || !isFinite(multiple) || multiple <= 0) {
      throw new Error('Invalid size multiple: ' + multiple);
    }
    if (multiple > cfg.SIZING.maxMultiple) {
      throw new Error('Size ' + multiple + 'x is above the ' + cfg.SIZING.maxMultiple + 'x limit');
    }
    const total = cfg.PORTFOLIO.totalUsd;
    const dailyLimitUsd = total * cfg.SIZING.baseDailyRiskPct * multiple;
    const R = dailyLimitUsd / cfg.RULES_R.daily;
    const rules = {};
    for (const k of Object.keys(cfg.RULES_R)) {
      const usdV = R * cfg.RULES_R[k];
      rules[k] = { r: cfg.RULES_R[k], usd: usdV, pct: usdV / total };
    }
    return {
      multiple,
      R,
      rPct: R / total,
      dailyLimitUsd,
      rules,
      riskShareOfFutures: R / cfg.PORTFOLIO.sleeves.futures,
    };
  }

  // Loss limits are rules, not return claims: always shown in dollars.
  function limit(cfg, multiple, r) {
    const m = compute(cfg, multiple);
    const v = m.R * r;
    return usd(v) + ' · ' + pct(v / cfg.PORTFOLIO.totalUsd) + ' of ' + usd(cfg.PORTFOLIO.totalUsd) + ' · ' + r + 'R';
  }

  // Targets and buffers: dollars only once targets are live.
  function fig(cfg, multiple, r) {
    if (!cfg.FLAGS.targetsLive) return r + 'R';
    return limit(cfg, multiple, r);
  }

  return { usd, pct, sizeById, resolveSizeId, compute, limit, fig };
});
