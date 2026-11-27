// Pay in 3 with automatic monthly charges, on Stripe.
// Used by the Cloudflare Pages Functions in /functions/api (they run on www.kimberlymarnell.com).
// Secrets are set by Kimberly in Cloudflare → Pages → kimberlymarnell → Settings → Variables:
//   STRIPE_SECRET_KEY      (Stripe → Developers → API keys → Secret key)
//   STRIPE_WEBHOOK_SECRET  (Stripe → Developers → Webhooks → this endpoint → Signing secret)
// Nothing secret is stored in this repository.

export const SITE = 'https://www.kimberlymarnell.com';

// key = the painting's full-price Bluevine link id (same keys as dist/buy.js). total in cents.
export const WORKS = {
  '91028cd1413748419e020d2d4b60667d': { t: 'Queen of the Night', total: 260000, img: 'img/queen-of-the-night.jpg', page: 'queen-of-the-night.html' },
  '8698eec1870a433f9008e3293f392963': { t: 'Golden Hour', total: 260000, img: 'img/golden-hour.jpg', page: 'golden-hour.html' },
  'b8f4179cad2f44e797e10085c0237dcb': { t: 'Take Me Back', total: 260000, img: 'img/take-me-back.jpg', page: 'take-me-back.html' },
  '2499c431a8884d76ba2bc0ab5b51a43b': { t: 'Going Home', total: 260000, img: 'img/going-home.jpg', page: 'going-home.html' },
  '93d40d6841584ba5823933ab5fdc313a': { t: 'My Body', total: 260000, img: 'img/my-body.jpg' },
  'bc24fd5b4349443fb54e446239c274a7': { t: 'The Comfort of Frosting', total: 260000, img: 'img/the-comfort-of-frosting.jpg' },
  '23d07117242f4d06b17e5237744458a2': { t: 'Appealing Tides of Excess', total: 260000, img: 'img/appealing-tides-of-excess.jpg' },
  'e8ed01d5c72a438dbf43207e64272a56': { t: 'New Beginnings', total: 260000, img: 'img/new-beginnings.jpg' },
  'bb693256e8b243949bc29787ff58d15d': { t: 'Flourish', total: 150000, img: 'img/flourish.jpg', page: 'flourish.html' },
  'b247ba669f7e40d7af80056336f0a284': { t: 'Impossible Traffic', total: 150000, img: 'img/impossible-traffic.jpg' },
  '69a5b6e71e0b4080bb9dea0b92bc9cb2': { t: 'Comfy', total: 150000, img: 'img/comfy.jpg' },
  '313a43052f984c728d1f2ea5e4bb782a': { t: 'Look Me in the Eye', total: 150000, img: 'img/look-me-in-the-eye.jpg' },
  '7907f98280ba4642807ad86fb5ac9ae3': { t: 'Blue Vibes', total: 150000, img: 'img/blue-vibes.jpg' },
  'communion': { t: 'Communion with the Earth', total: 1040000, img: 'img/communion-with-the-earth.jpg', page: 'communion-with-the-earth.html' }
};

// three payments in cents that add up exactly: [first, second, last]
export function split(total) {
  const first = Math.ceil(total / 3);
  return [first, first, total - 2 * first];
}
export const usd = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });

function addMonths(d, m) { const x = new Date(d); const day = x.getUTCDate(); x.setUTCMonth(x.getUTCMonth() + m); if (x.getUTCDate() < day) x.setUTCDate(0); return x; }
const fmt = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// form-encode nested params the way the Stripe API expects
export function form(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  }
  return out.join('&');
}

export async function stripe(env, method, path, params, fetchImpl = fetch) {
  const res = await fetchImpl('https://api.stripe.com/v1/' + path + (method === 'GET' && params ? '?' + form(params) : ''), {
    method,
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' },
    body: method === 'GET' ? undefined : form(params || {})
  });
  const data = await res.json();
  if (!res.ok) { const e = new Error((data.error && data.error.message) || 'stripe_error'); e.stripe = data.error; throw e; }
  return data;
}

// Is this painting already reserved by an active Pay in 3 plan?
export async function reserved(env, key, fetchImpl) {
  const r = await stripe(env, 'GET', 'subscriptions/search', { query: `metadata['work']:'${key}' AND status:'active'` }, fetchImpl);
  return (r.data || []).length > 0;
}

// Step 1: buyer chooses Pay in 3 → Stripe Checkout (first payment today, card saved for the next two)
export async function startCheckout(env, key, now = new Date(), fetchImpl) {
  const w = WORKS[key];
  if (!w) return { status: 400, error: 'unknown_work' };
  if (!env.STRIPE_SECRET_KEY) return { status: 503, error: 'not_configured' };
  if (await reserved(env, key, fetchImpl)) return { status: 409, error: 'reserved' };
  const [a, b, c] = split(w.total);
  const d2 = fmt(addMonths(now, 1)), d3 = fmt(addMonths(now, 2));
  const terms = `Pay in 3 for ${w.t}: ${usd(a)} today, ${usd(b)} on ${d2} and ${usd(c)} on ${d3} (total ${usd(w.total)}, no interest or fees). ` +
    `By paying you authorize Haven Industries LLC (Haven Art House) to charge this payment method automatically on those dates. ` +
    `Your first payment reserves the painting; it ships free and insured in the US after the final payment. To change or cancel, email studio@kimberlymarnell.com before the next payment date.`;
  const session = await stripe(env, 'POST', 'checkout/sessions', {
    mode: 'subscription',
    line_items: { 0: { quantity: 1, price_data: { currency: 'usd', unit_amount: a, recurring: { interval: 'month' },
      product_data: { name: `${w.t} · Pay in 3`, description: `Original painting by Kimberly Marnell. 3 monthly payments, total ${usd(w.total)}.`, images: { 0: `${SITE}/${w.img}` } } } } },
    subscription_data: { description: `${w.t} · Pay in 3 (total ${usd(w.total)})`, metadata: { kind: 'pay3', work: key, title: w.t, total: w.total, first: a, last: c } },
    metadata: { kind: 'pay3', work: key, title: w.t, total: w.total },
    billing_address_collection: 'required',
    shipping_address_collection: { allowed_countries: { 0: 'US' } },
    phone_number_collection: { enabled: true },
    custom_text: { submit: { message: terms } },
    success_url: `${SITE}/thank-you.html?plan=1&work=${encodeURIComponent(w.t)}`,
    cancel_url: `${SITE}/${w.page || 'index.html#originals'}`
  }, fetchImpl);
  return { status: 303, url: session.url };
}

// Step 2: after the first payment, fix the plan to exactly three charges and stop
export async function lockPlan(env, session, fetchImpl) {
  if (!session || session.mode !== 'subscription' || !session.metadata || session.metadata.kind !== 'pay3') return 'ignored';
  const sub = await stripe(env, 'GET', 'subscriptions/' + session.subscription, null, fetchImpl);
  if (sub.schedule) return 'already_scheduled';
  const total = Number(sub.metadata.total), [a, , c] = split(total);
  const item = sub.items.data[0];
  const sched = await stripe(env, 'POST', 'subscription_schedules', { from_subscription: sub.id }, fetchImpl);
  const phases = a === c
    ? { 0: { start_date: sched.phases[0].start_date, items: { 0: { price: item.price.id, quantity: 1 } }, iterations: 3 } }
    : { 0: { start_date: sched.phases[0].start_date, items: { 0: { price: item.price.id, quantity: 1 } }, iterations: 2 },
        1: { items: { 0: { quantity: 1, price_data: { currency: 'usd', product: item.price.product, unit_amount: c, recurring: { interval: 'month' } } } }, iterations: 1 } };
  await stripe(env, 'POST', 'subscription_schedules/' + sched.id, { end_behavior: 'cancel', proration_behavior: 'none', phases }, fetchImpl);
  return 'locked';
}

// Stripe webhook signature check (t=…,v1=… HMAC-SHA256 of "t.payload")
export async function verify(payload, header, secret, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')).filter((x) => x.length === 2).map(([k, v]) => [k, v]));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!parts.t || !sigs.length || Math.abs(nowSec - Number(parts.t)) > toleranceSec) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts.t + '.' + payload));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => s.length === hex.length && [...s].every((ch, i) => ch === hex[i]));
}
