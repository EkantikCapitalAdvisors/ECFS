// Page behavior. All numbers are rendered at build time (rebuilt after each trading day),
// so this only handles the menu, section reveal, referral capture and click events.
(function () {
  'use strict';
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  document.documentElement.classList.add('js');

  // ---------- Referral + events ----------
  const url = new URL(window.location.href);
  const ref = url.searchParams.get('ref') || null;
  if (ref) {
    url.searchParams.delete('ref');
    try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch (e) { /* file:// */ }
  }
  function track(name, extra) {
    const ev = Object.assign({ event: name, ref }, extra || {});
    const sink = Array.isArray(window.dataLayer) ? window.dataLayer : (window.ekaEvents = window.ekaEvents || []);
    sink.push(ev);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-evt]');
    if (!a) return;
    const engine = a.getAttribute('data-engine-evt');
    track(a.getAttribute('data-evt'), engine ? { engine } : null);
  });

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

  const yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
