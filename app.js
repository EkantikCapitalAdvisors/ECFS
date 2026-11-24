// Page behavior: size toggle (URL only, no storage), record panels from the same-origin
// feed snapshot, polling, referral events, menu, section reveal.
(function () {
  'use strict';
  const CFG = window.ECA_CONFIG, SIZE = window.ECA_SIZE;
  if (!CFG || !SIZE) return;
  const DEV = document.body.getAttribute('data-build') !== 'prod';
  const CHIP = '<span class="flag">[DATA REQUIRED]</span>';
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  document.documentElement.classList.add('js');

  // ---------- Referral + events ----------
  const url = new URL(window.location.href);
  const ref = url.searchParams.get('ref') || null;
  if (ref) url.searchParams.delete('ref');
  let sizeId = SIZE.resolveSizeId(CFG, url.searchParams.get('size'));

  function track(name, extra) {
    const ev = Object.assign({ event: name, ref, size: sizeId }, extra || {});
    const sink = Array.isArray(window.dataLayer) ? window.dataLayer : (window.ekaEvents = window.ekaEvents || []);
    sink.push(ev);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-evt]');
    if (!a) return;
    const engine = a.getAttribute('data-engine-evt');
    track(a.getAttribute('data-evt'), engine ? { engine } : null);
  });

  // ---------- Size toggle ----------
  function writeUrl() {
    if (sizeId === CFG.SIZING.default) url.searchParams.delete('size');
    else url.searchParams.set('size', sizeId);
    try { history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash); } catch (e) { /* file:// */ }
  }
  function applySize() {
    const mult = SIZE.sizeById(CFG, sizeId).multiple;
    $$('[data-size]').forEach(b => b.setAttribute('aria-checked', String(b.getAttribute('data-size') === sizeId)));
    $$('[data-col]').forEach(c => c.classList.toggle('is-sel', c.getAttribute('data-col') === sizeId));
    $$('[data-fig]').forEach(el => { el.textContent = SIZE.fig(CFG, mult, +el.getAttribute('data-fig')); });
    $$('[data-limit]').forEach(el => { el.textContent = SIZE.limit(CFG, mult, +el.getAttribute('data-limit')); });
  }
  function setSize(id, fromUser) {
    const next = SIZE.resolveSizeId(CFG, id);
    if (next === sizeId && !fromUser) return;
    sizeId = next;
    applySize();
    writeUrl();
    if (fromUser) track('size_toggle');
  }
  $$('[data-size]').forEach(b => b.addEventListener('click', () => setSize(b.getAttribute('data-size'), true)));
  // Arrow keys inside each radiogroup
  $$('[role="radiogroup"]').forEach(g => g.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const btns = $$('[data-size]', g); const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = btns[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? btns.length - 1 : 1)) % btns.length];
    n.focus(); setSize(n.getAttribute('data-size'), true);
  }));
  applySize();
  writeUrl();

  // ---------- Menu ----------
  const btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) { btn.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); } });
  }

  // ---------- Reveal ----------
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-on');
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(s => io.observe(s));
  }

  // ---------- Time helpers (America/Chicago) ----------
  const TZ = CFG.SITE.timeZone;
  function ctParts(d) {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return { wd: p.weekday, min: (+p.hour % 24) * 60 + +p.minute };
  }
  function marketHours(d) {
    const { wd, min } = ctParts(d || new Date());
    return !['Sat', 'Sun'].includes(wd) && min >= 8 * 60 + 30 && min <= 15 * 60 + 15;
  }
  const fmtCT = d => new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' CT';
  const fmtDay = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return m + '/' + d + '/' + String(y).slice(2); };
  const fmtR = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + 'R';
  const fmtUsdSigned = v => (v >= 0 ? '+' : '−') + SIZE.usd(Math.abs(v));
  const pct0 = v => Math.round(v * 100) + '%';

  // ---------- Charts (inline SVG, no gradients) ----------
  function lineChart(values, opts) {
    const W = 520, H = 170, P = { l: 44, r: 10, t: 12, b: 22 };
    if (!values.length) return '';
    const min = Math.min(opts.base != null ? opts.base : 0, ...values), max = Math.max(opts.base != null ? opts.base : 0, ...values);
    const span = max - min || 1;
    const x = i => P.l + (values.length === 1 ? 0 : i * (W - P.l - P.r) / (values.length - 1));
    const y = v => P.t + (max - v) * (H - P.t - P.b) / span;
    const d = values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const ref = opts.base != null ? opts.base : 0;
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label) + '">' +
      '<line class="chart__axis" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(ref).toFixed(1) + '" y2="' + y(ref).toFixed(1) + '"/>' +
      '<text class="chart__tick" x="' + (P.l - 6) + '" y="' + (y(max) + 4).toFixed(1) + '" text-anchor="end">' + esc(opts.fmt(max)) + '</text>' +
      '<text class="chart__tick" x="' + (P.l - 6) + '" y="' + (y(min) + 4).toFixed(1) + '" text-anchor="end">' + esc(opts.fmt(min)) + '</text>' +
      '<path class="chart__line" d="' + d + '"/>' +
      '<text class="chart__tick" x="' + P.l + '" y="' + (H - 4) + '">' + esc(opts.first) + '</text>' +
      '<text class="chart__tick" x="' + (W - P.r) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(opts.last) + '</text>' +
      '</svg>';
  }
  function barChart(items, opts) {
    const W = 520, H = 180, P = { l: 10, r: 10, t: 18, b: 36 };
    if (!items.length) return '';
    const vals = items.map(i => i.v);
    const max = Math.max(0, ...vals), min = Math.min(0, ...vals), span = max - min || 1;
    const bw = (W - P.l - P.r) / items.length;
    const y = v => P.t + (max - v) * (H - P.t - P.b) / span;
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label) + '">';
    s += '<line class="chart__axis" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '"/>';
    items.forEach((it, i) => {
      const up = it.v >= 0, x0 = P.l + i * bw + bw * 0.15, w = bw * 0.7;
      const y0 = y(Math.max(0, it.v)), h = Math.max(1, Math.abs(y(it.v) - y(0)));
      s += '<rect class="' + (up ? 'bar-up' : 'bar-down') + '" x="' + x0.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
      s += '<text class="chart__val" x="' + (x0 + w / 2).toFixed(1) + '" y="' + (up ? y0 - 4 : y0 + h + 11).toFixed(1) + '" text-anchor="middle">' + esc(opts.fmt(it.v)) + '</text>';
      s += '<text class="chart__tick" x="' + (x0 + w / 2).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(it.k) + '</text>';
    });
    return s + '</svg>';
  }
  const monLabel = m => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m.split('-')[1] - 1];
  const tile = (k, v) => '<div class="tile"><span class="tile__k">' + esc(k) + '</span><span class="tile__v num">' + v + '</span></div>';

  // ---------- Panels ----------
  function labelHtml(eng) {
    const l = CFG.ENGINES[eng].record.label;
    if (l === 'DEMO') return 'Demo';
    if (l === 'OWN MONEY') return 'Own money';
    return DEV ? CHIP : '';
  }

  function renderFutures(feed) {
    const s = feed.summary;
    return '<div class="tiles">' +
      tile('Trades', s.trades) + tile('Average per trade', fmtR(s.avgR)) + tile('Win rate', pct0(s.winRate)) +
      tile('Profit factor', s.profitFactor == null ? 'n/a' : s.profitFactor.toFixed(2)) +
      tile('Deepest drawdown', '−' + s.deepestDrawdownR.toFixed(2) + 'R') + tile('Total', fmtR(s.totalR)) + '</div>' +
      '<h4 class="chart-h">Cumulative R, trade by trade</h4>' +
      lineChart(s.cumulativeR, { label: 'Cumulative R by trade', fmt: v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(0) + 'R', first: 'Trade 1', last: 'Trade ' + s.trades }) +
      '<h4 class="chart-h">Realized R by month</h4>' +
      barChart(s.monthlyR.map(m => ({ k: monLabel(m.month), v: m.r })), { label: 'Realized R by month', fmt: v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) }) +
      '<div class="table-scroll"><table class="tbl tbl--small"><caption>Last 5 trades</caption><thead><tr><th scope="col">Closed (CT)</th><th scope="col">Direction</th><th scope="col">Result (R)</th></tr></thead><tbody>' +
      s.last5.map(t => '<tr><td class="num">' + fmtDay(t.closed) + '</td><td>' + esc(t.direction) + '</td><td class="num ' + (t.r >= 0 ? 'pos' : 'neg') + '">' + fmtR(t.r) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function renderOptions(feed) {
    const s = feed.summary;
    return '<div class="tiles">' +
      tile('Balance', SIZE.usd(s.balance) + '<small> from ' + SIZE.usd(s.startUsd) + '</small>') + tile('Growth multiple', s.multiple.toFixed(2) + 'x') +
      tile('Closed fills', s.fills) + tile('Win rate', pct0(s.winRate)) + tile('Deepest drawdown', '−' + (s.deepestDrawdownPct * 100).toFixed(1) + '%') + '</div>' +
      '<h4 class="chart-h">Balance after each closed fill</h4>' +
      lineChart(s.balances, { label: 'Balance after each closed fill', base: s.startUsd, fmt: v => SIZE.usd(v), first: 'Fill 1', last: 'Fill ' + s.fills }) +
      '<h4 class="chart-h">Realized $ by month</h4>' +
      barChart(s.monthlyUsd.map(m => ({ k: monLabel(m.month), v: m.usd })), { label: 'Realized dollars by month', fmt: v => (v >= 0 ? '+' : '−') + SIZE.usd(Math.abs(v)) }) +
      '<div class="table-scroll"><table class="tbl tbl--small"><caption>Last 5 fills</caption><thead><tr><th scope="col">Closed (CT)</th><th scope="col">Underlying</th><th scope="col">Side</th><th scope="col">Result</th></tr></thead><tbody>' +
      s.last5.map(t => '<tr><td class="num">' + fmtDay(t.closed) + '</td><td>' + esc(t.underlying) + '</td><td>' + esc(t.side) + '</td><td class="num ' + (t.usd >= 0 ? 'pos' : 'neg') + '">' + fmtUsdSigned(t.usd) + (t.r != null ? ' · ' + fmtR(t.r) : '') + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function setStatus(eng, feed) {
    const el = document.querySelectorAll('[data-status="' + eng + '"]');
    const st = (feed && feed.status) || (CFG.ENGINES[eng].status.updatedAt ? CFG.ENGINES[eng].status : null);
    el.forEach(e => {
      if (!st) { e.hidden = true; return; }
      e.hidden = false;
      e.className = 'status status--' + String(st.code).toLowerCase();
      e.textContent = st.code + (st.updatedAt ? ' · ' + fmtCT(new Date(st.updatedAt)) : '');
    });
  }

  function paint(eng, feed) {
    const panel = document.querySelector('.panel[data-engine="' + eng + '"]');
    const proof = document.querySelector('[data-proof="' + eng + '"]');
    const ok = feed && feed.ok && feed.summary;
    setStatus(eng, ok ? feed : null);
    if (!panel) return;
    const body = panel.querySelector('[data-body]'), asof = panel.querySelector('[data-asof]'), sample = panel.querySelector('[data-sample]');
    if (!ok) {
      body.innerHTML = '<p class="empty">Live numbers are on the dashboard while the feed connects.</p>';
      asof.textContent = ''; sample.hidden = true; if (proof) proof.hidden = true;
      return;
    }
    const s = feed.summary;
    body.innerHTML = eng === 'futures' ? renderFutures(feed) : renderOptions(feed);
    const fetched = new Date(feed.fetchedAt);
    const delayed = marketHours() && (Date.now() - fetched.getTime() > CFG.FEEDS.staleAfterMs);
    panel.classList.toggle('is-stale', delayed);
    asof.innerHTML = delayed
      ? '<span class="delayed">DATA DELAYED</span> Last updated ' + esc(fmtCT(fetched))
      : 'As of ' + esc(fmtCT(fetched));
    const n = eng === 'futures' ? s.trades : s.fills, target = CFG.FEEDS.sampleTarget;
    sample.hidden = false;
    sample.innerHTML = '<div class="sample__bar" aria-hidden="true"><span style="width:' + Math.min(100, n / target * 100).toFixed(1) + '%"></span></div>' +
      '<p>' + (n >= target
        ? n + ' ' + (eng === 'futures' ? 'trades' : 'fills') + '. Past the ' + target + ' where results start to mean something.'
        : n + ' of ' + target + ' ' + (eng === 'futures' ? 'trades' : 'fills') + '. Results start to mean something at ' + target + '.') + '</p>';
    if (proof) {
      const lbl = labelHtml(eng);
      proof.innerHTML = eng === 'futures'
        ? 'Cash-Flow Engine · ' + s.trades + ' trades · ' + (s.avgR >= 0 ? '+' : '−') + Math.abs(s.avgR).toFixed(2) + 'R per trade' + (lbl ? ' · ' + lbl : '')
        : 'Compounding Engine · ' + s.fills + ' fills · ' + s.multiple.toFixed(2) + 'x since first fill ' + fmtDay(s.firstDate) + (lbl ? ' · ' + lbl : '');
      proof.hidden = false;
    }
    if (eng === 'futures') {
      const dd = document.querySelector('[data-dd-sentence]');
      if (dd) dd.textContent = 'The deepest futures drawdown in the record so far is ' + s.deepestDrawdownR + 'R (as of ' + fmtCT(fetched) + ').';
    }
  }

  async function load() {
    for (const eng of ['futures', 'options']) {
      let feed = null;
      try {
        const r = await fetch('feeds/' + eng + '.json?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) feed = await r.json();
      } catch (e) { feed = null; }
      paint(eng, feed);
    }
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return;
    timer = setTimeout(() => { load().finally(schedule); }, marketHours() ? CFG.FEEDS.pollMarketMs : CFG.FEEDS.pollOffMs);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else { load(); schedule(); } });
  load().finally(schedule);

  const yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
