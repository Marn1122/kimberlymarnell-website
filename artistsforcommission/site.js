/* Artists for Commission — shared data and behaviour for every page. */

/* The artist list, prices and fee live in artists.js (loaded before this file). */

window.afcMoney = function (n) {
  return '$' + Math.round(n).toLocaleString('en-US');
};

(function () {
  /* mobile menu */
  var nav = document.querySelector('.gnav');
  var btn = nav && nav.querySelector('.menu');
  if (btn) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  });

  /* gentle scroll reveal */
  var els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* fee text anywhere on the page */
  var pct = Math.round(window.AFC_FEE * 100);
  document.querySelectorAll('[data-fee]').forEach(function (e) { e.textContent = pct + '%'; });
  document.querySelectorAll('[data-keep]').forEach(function (e) { e.textContent = (100 - pct) + '%'; });
})();

/* Address of the payment worker (Cloudflare). Empty until it is set up; checkout stays off while empty. */
window.AFC_PAY_URL = window.AFC_PAY_URL || '';
