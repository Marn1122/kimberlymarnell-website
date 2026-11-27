/* Haven Art House checkout: one clear purchase sheet for every original.
   Any "Buy" link to a painting's Bluevine page (or the Communion reserve email) opens this sheet first,
   where the buyer chooses Pay in full or Pay in 3 and sees exactly what they pay and when.
   To add or change a painting, edit WORKS below. plan = the Bluevine link for one third of the price. */
(function () {
  var MAIL = 'studio@kimberlymarnell.com';
  // key = Bluevine link id of the full-price payment
  var WORKS = {
    '91028cd1413748419e020d2d4b60667d': { t: 'Queen of the Night', p: 2600, img: 'img/queen-of-the-night.jpg', plan: '' },
    '8698eec1870a433f9008e3293f392963': { t: 'Golden Hour', p: 2600, img: 'img/golden-hour.jpg', plan: '' },
    'b8f4179cad2f44e797e10085c0237dcb': { t: 'Take Me Back', p: 2600, img: 'img/take-me-back.jpg', plan: '' },
    '2499c431a8884d76ba2bc0ab5b51a43b': { t: 'Going Home', p: 2600, img: 'img/going-home.jpg', plan: '' },
    '93d40d6841584ba5823933ab5fdc313a': { t: 'My Body', p: 2600, img: 'img/my-body.jpg', plan: '' },
    'bc24fd5b4349443fb54e446239c274a7': { t: 'The Comfort of Frosting', p: 2600, img: 'img/the-comfort-of-frosting.jpg', plan: '' },
    '23d07117242f4d06b17e5237744458a2': { t: 'Appealing Tides of Excess', p: 2600, img: 'img/appealing-tides-of-excess.jpg', plan: '' },
    'e8ed01d5c72a438dbf43207e64272a56': { t: 'New Beginnings', p: 2600, img: 'img/new-beginnings.jpg', plan: '' },
    'bb693256e8b243949bc29787ff58d15d': { t: 'Flourish', p: 1500, img: 'img/flourish.jpg', plan: '' },
    'b247ba669f7e40d7af80056336f0a284': { t: 'Impossible Traffic', p: 1500, img: 'img/impossible-traffic.jpg', plan: '' },
    '69a5b6e71e0b4080bb9dea0b92bc9cb2': { t: 'Comfy', p: 1500, img: 'img/comfy.jpg', plan: '' },
    '313a43052f984c728d1f2ea5e4bb782a': { t: 'Look Me in the Eye', p: 1500, img: 'img/look-me-in-the-eye.jpg', plan: '' },
    '7907f98280ba4642807ad86fb5ac9ae3': { t: 'Blue Vibes', p: 1500, img: 'img/blue-vibes.jpg', plan: '' },
    'communion': { t: 'Communion with the Earth', p: 10400, img: 'img/communion-with-the-earth.jpg', plan: '', invoice: true }
  };
  var money = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  function parts(p) { var a = Math.ceil(p * 100 / 3) / 100; a = Math.round(a * 100) / 100; var last = Math.round((p - 2 * a) * 100) / 100; return [a, a, last]; }
  function addMonths(d, m) { var x = new Date(d); var day = x.getDate(); x.setMonth(x.getMonth() + m); if (x.getDate() < day) x.setDate(0); return x; }
  var fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); };
  function keyFor(a) {
    var h = a.getAttribute('href') || '';
    var m = h.match(/pay\.bluevine\.com\/p\/([a-z0-9]+)/);
    if (m && WORKS[m[1]]) return m[1];
    if (/^mailto:/.test(h) && /Reserve(%3A|:)(%20| )Communion/.test(h)) return 'communion';
    return null;
  }
  function fullHref(k) { return k === 'communion' ? null : 'https://pay.bluevine.com/p/' + k; }
  function mailto(subj, body) { return 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body); }

  var css = '.kmb{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:"Inter Tight",system-ui,-apple-system,sans-serif;animation:kmbf .25s ease both}' +
    '.kmb[hidden]{display:none}@keyframes kmbf{from{opacity:0}}@keyframes kmbu{from{opacity:0;transform:translateY(24px) scale(.98)}}' +
    '.kmb-s{--k:#1d1d1f;--m:#6e6e73;--l:rgba(0,0,0,.1);--c:#fff;--c2:#f5f5f7;--r:#b8174f;background:var(--c);color:var(--k);width:min(860px,100%);max-height:calc(100dvh - 32px);overflow:auto;border-radius:28px;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);box-shadow:0 40px 120px -30px rgba(0,0,0,.6);animation:kmbu .35s cubic-bezier(.2,.7,.2,1) both}' +
    '@media (prefers-color-scheme:dark){.kmb-s{--k:#f5f5f7;--m:#a1a1a6;--l:rgba(255,255,255,.14);--c:#161618;--c2:#0d0d0f;--r:#ff7a9a}}' +
    '.kmb-a{background:var(--c2);padding:28px;display:flex;align-items:center;justify-content:center}.kmb-a img{width:100%;max-height:520px;object-fit:contain;border-radius:8px}' +
    '.kmb-b{padding:30px 30px 26px;display:flex;flex-direction:column;gap:14px;position:relative}' +
    '.kmb-x{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:0;background:var(--c2);color:var(--k);font-size:22px;line-height:1;cursor:pointer}' +
    '.kmb h2{margin:0;padding-right:44px;font-size:30px;line-height:1.08;letter-spacing:-.035em;font-weight:700}.kmb .kmb-p{margin:0;color:var(--m);font-size:15px}' +
    '.kmb fieldset{border:0;margin:6px 0 0;padding:0;display:grid;gap:10px}.kmb legend{font-weight:600;margin-bottom:8px;font-size:15px}' +
    '.kmb label{display:grid;grid-template-columns:auto 1fr auto;gap:4px 12px;align-items:start;padding:16px 18px;border:2px solid var(--l);border-radius:16px;cursor:pointer;font-size:16px}' +
    '.kmb label:has(input:checked){border-color:var(--r)}.kmb input{margin:3px 0 0;accent-color:var(--r);width:18px;height:18px}' +
    '.kmb label b{font-weight:600}.kmb label .amt{font-weight:600;white-space:nowrap}.kmb label small{grid-column:2/4;color:var(--m);font-size:13.5px;line-height:1.45}' +
    '.kmb ol{margin:0;padding:0;list-style:none;display:grid;gap:0;border:1px solid var(--l);border-radius:16px;overflow:hidden}' +
    '.kmb ol li{display:flex;justify-content:space-between;gap:12px;padding:11px 16px;font-size:15px;border-top:1px solid var(--l)}.kmb ol li:first-child{border-top:0;font-weight:600}.kmb ol li span:last-child{white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.kmb ol li.tot{background:var(--c2);color:var(--m)}' +
    '.kmb ul{margin:0;padding:0 0 0 18px;color:var(--m);font-size:14px;display:grid;gap:6px}' +
    '.kmb-go{display:block;text-align:center;background:var(--r);color:#fff!important;text-decoration:none!important;padding:16px;border-radius:14px;font-size:17px;font-weight:600;margin-top:4px}.kmb-go:hover{filter:brightness(1.08)}' +
    '.kmb-f{margin:0;font-size:12.5px;color:var(--m)}.kmb-f a{color:inherit}' +
    '@media (max-width:720px){.kmb{place-items:end center;padding:0}.kmb-s{grid-template-columns:1fr;border-radius:24px 24px 0 0;max-height:94dvh}.kmb-a{padding:16px}.kmb-a img{max-height:200px}.kmb-b{padding:22px 20px calc(22px + env(safe-area-inset-bottom))}.kmb h2{font-size:26px}}' +
    '.km-plan-btn{cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){.kmb,.kmb-s{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var root, last;
  function build() {
    root = document.createElement('div'); root.className = 'kmb'; root.hidden = true;
    root.innerHTML = '<div class="kmb-s" role="dialog" aria-modal="true" aria-labelledby="kmb-t"><div class="kmb-a"><img alt=""></div><div class="kmb-b">' +
      '<button type="button" class="kmb-x" aria-label="Close">×</button><div><h2 id="kmb-t"></h2><p class="kmb-p"></p></div>' +
      '<fieldset><legend>How would you like to pay?</legend>' +
      '<label><input type="radio" name="kmb-m" value="full"><b>Pay in full</b><span class="amt" data-x="full"></span><small data-x="fulls"></small></label>' +
      '<label><input type="radio" name="kmb-m" value="plan"><b>Pay in 3</b><span class="amt" data-x="plan"></span><small>Three monthly payments. No interest, no fees.</small></label>' +
      '</fieldset><ol data-x="sched"></ol><ul data-x="notes"></ul><a class="kmb-go" target="_blank" rel="noopener"></a>' +
      '<p class="kmb-f">Original art is final sale for change of mind; damaged or misdescribed work is always made right (<a href="returns.html">returns policy</a>). Questions? <a href="mailto:' + MAIL + '">' + MAIL + '</a></p></div></div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) { if (e.target === root || e.target.closest('.kmb-x')) close(); });
    root.addEventListener('change', function () { render(); });
    document.addEventListener('keydown', function (e) { if (!root.hidden && e.key === 'Escape') close(); });
  }
  var cur;
  function q(x) { return root.querySelector('[data-x="' + x + '"]'); }
  function render() {
    var w = WORKS[cur], mode = root.querySelector('input:checked').value, ps = parts(w.p), today = new Date();
    q('full').textContent = money(w.p);
    q('plan').textContent = money(ps[0]) + '/mo';
    q('fulls').textContent = w.invoice ? 'Invoiced for card or bank transfer.' : 'One secure payment by card or bank transfer.';
    var sched = q('sched'), notes = q('notes'), go = root.querySelector('.kmb-go');
    if (mode === 'full') {
      sched.innerHTML = '<li><span>Today</span><span>' + money(w.p) + '</span></li>';
      notes.innerHTML = '<li>Ships free and insured in the US, with a signed certificate of authenticity.</li>' +
        (w.invoice ? '<li>Kimberly replies with an invoice to reserve this major work.</li>' : '<li>Checkout shows the merchant name Haven Industries LLC, the company behind Haven Art House.</li>');
      if (w.invoice) { go.href = mailto('Reserve: ' + w.t, 'Hi Kimberly,\n\nI would like to buy ' + w.t + ' (' + money(w.p) + ') and pay in full.\n\nName:\nCity, State:\nPhone (optional):\n\nPlease send me an invoice for card or bank transfer.\n'); go.removeAttribute('target'); go.textContent = 'Request invoice · ' + money(w.p); }
      else { go.href = fullHref(cur); go.target = '_blank'; go.textContent = 'Pay ' + money(w.p) + ' securely ↗'; }
    } else {
      sched.innerHTML = '<li><span>Today · reserves the painting</span><span>' + money(ps[0]) + '</span></li>' +
        '<li><span>' + fmt(addMonths(today, 1)) + '</span><span>' + money(ps[1]) + '</span></li>' +
        '<li><span>' + fmt(addMonths(today, 2)) + '</span><span>' + money(ps[2]) + '</span></li>' +
        '<li class="tot"><span>Total · no interest or fees</span><span>' + money(w.p) + '</span></li>';
      notes.innerHTML = '<li>Your first payment reserves the painting and takes it off sale.</li>' +
        '<li>Before each payment you get an email reminder with a secure payment link.</li>' +
        '<li>It ships free and insured in the US, with its certificate, after the final payment.</li>' +
        '<li>To change or cancel, email before the next payment date; refunds follow the returns policy.</li>';
      if (w.plan) { go.href = w.plan; go.target = '_blank'; go.textContent = 'Pay ' + money(ps[0]) + ' today ↗'; }
      else { go.href = mailto('Pay in 3: ' + w.t, 'Hi Kimberly,\n\nI would like to buy ' + w.t + ' (' + money(w.p) + ') with Pay in 3: ' + money(ps[0]) + ' today, then ' + money(ps[1]) + ' and ' + money(ps[2]) + ' monthly, no interest or fees. Please send my first payment link.\n\nName:\nCity, State:\nPhone (optional):\n'); go.removeAttribute('target'); go.textContent = 'Start Pay in 3 · ' + money(ps[0]) + ' today'; }
    }
  }
  function open(k, mode) {
    if (!root) build();
    cur = k; var w = WORKS[k]; last = document.activeElement;
    var im = root.querySelector('.kmb-a img'); im.src = w.img; im.alt = w.t;
    root.querySelector('#kmb-t').textContent = w.t;
    root.querySelector('.kmb-p').textContent = 'One-of-a-kind original · ' + money(w.p);
    root.querySelector('input[value="' + (mode === 'plan' ? 'plan' : 'full') + '"]').checked = true;
    render(); root.hidden = false; document.documentElement.style.overflow = 'hidden';
    root.querySelector('.kmb-x').focus();
  }
  function close() { root.hidden = true; document.documentElement.style.overflow = ''; if (last && last.focus) last.focus(); }
  window.KMBuy = { open: open, works: WORKS };

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[href], [data-km-plan]'); if (!a || (root && root.contains(a))) return;
    var k = a.getAttribute('data-km-plan') || keyFor(a); if (!k || !WORKS[k]) return;
    e.preventDefault(); open(k, a.hasAttribute('data-km-plan') ? 'plan' : 'full');
  });

  // a visible "Pay in 3" choice next to each Buy button on painting and series pages
  function addPlanButtons() {
    [].forEach.call(document.querySelectorAll('.actions a.btn.primary'), function (a) {
      var k = keyFor(a); if (!k || a.parentNode.querySelector('[data-km-plan]')) return;
      var ps = parts(WORKS[k].p), b = document.createElement('a');
      b.className = 'btn km-plan-btn'; b.href = '#'; b.setAttribute('data-km-plan', k); b.setAttribute('role', 'button');
      b.textContent = 'Pay in 3 · ' + money(ps[0]) + '/mo';
      a.insertAdjacentElement('afterend', b);
      if (/^Buy now$/.test(a.textContent.trim())) a.textContent = 'Buy · ' + money(WORKS[k].p);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPlanButtons); else addPlanButtons();
})();
