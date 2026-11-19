/* Artists for Commission — payment worker (Cloudflare Worker, no dependencies).

   What it does
   - A buyer submits an order for an artist → this worker prices it from artists.js
     (never trusts a price sent by the browser) and opens Stripe Checkout.
   - Stripe splits the payment automatically: the platform keeps the 10% application
     fee and the rest is transferred to the artist's connected Stripe account.
   - The balance link (/balance?order=…) charges whatever is still owed on an order,
     split the same way.

   Settings (Cloudflare → Worker → Settings → Variables and secrets)
   - STRIPE_SECRET_KEY  (secret)  Kimberly's Stripe secret key. Never put it in this file.
   - ARTIST_ACCOUNTS    (text)    JSON, artist slug → Stripe connected account ID,
                                  e.g. {"jane-doe":"acct_1ABC..."}
   - SITE_URL           (text)    https://www.artistsforcommission.com
*/
import './artists.js';
const AFC = globalThis.AFC;

const STRIPE = 'https://api.stripe.com/v1/';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const site = (env.SITE_URL || 'https://www.artistsforcommission.com').replace(/\/$/, '');
    try {
      if (url.pathname === '/health') return new Response('ok');
      if (url.pathname === '/checkout' && request.method === 'POST') return await checkout(request, env, site);
      if (url.pathname === '/balance' && request.method === 'GET') return await balance(url, env, site);
      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.log('error', e && e.stack || e);
      const back = url.pathname === '/balance' ? '/order-done.html' : '/order.html';
      return Response.redirect(site + back + '?error=' + encodeURIComponent(publicError(e)), 303);
    }
  }
};

function publicError(e) {
  const m = String(e && e.message || e);
  if (['subject', 'size', 'count', 'artist', 'email', 'order', 'nothing-owed', 'not-ready'].includes(m)) return m;
  return 'payment';
}

function accountFor(env, slug) {
  let map = {};
  try { map = JSON.parse(env.ARTIST_ACCOUNTS || '{}'); } catch (e) { throw new Error('not-ready'); }
  const acct = map[slug];
  if (!acct || !/^acct_[A-Za-z0-9]+$/.test(acct)) throw new Error('not-ready');
  return acct;
}

async function checkout(request, env, site) {
  const f = await request.formData();
  const artist = AFC.find(String(f.get('artist') || ''), false);
  if (!artist || artist.payWith !== 'stripe') throw new Error('artist');
  const acct = accountFor(env, artist.slug);

  const email = String(f.get('email') || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) throw new Error('email');

  const q = AFC.quote(artist, {
    subject: String(f.get('subject') || ''), size: String(f.get('size') || ''), count: f.get('count'),
    rush: f.get('rush') === 'on', plan: f.get('plan') === 'full' ? 'full' : 'deposit'
  });
  const orderId = 'AFC-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const name = String(f.get('name') || '').slice(0, 100);
  const notes = String(f.get('notes') || '').slice(0, 450);
  const stage = q.full ? 'full' : 'deposit';

  const meta = {
    order_id: orderId, artist: artist.slug, stage, total_cents: String(q.total),
    item: q.label, buyer_name: name, notes
  };
  const session = await stripe(env, 'checkout/sessions', {
    mode: 'payment',
    customer_email: email,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': q.due,
    'line_items[0][price_data][product_data][name]':
      (q.full ? 'Commission (paid in full): ' : 'Commission deposit: ') + q.label + ' by ' + artist.name,
    'line_items[0][price_data][product_data][description]': 'Order ' + orderId + '. Total ' + usd(q.total) + '.',
    'payment_intent_data[application_fee_amount]': q.fee,
    'payment_intent_data[transfer_data][destination]': acct,
    'payment_intent_data[description]': 'Artists for Commission order ' + orderId + ' (' + stage + ')',
    ...flat('payment_intent_data[metadata]', meta),
    ...flat('metadata', meta),
    success_url: site + '/order-done.html?order=' + orderId + '&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: site + '/order.html?artist=' + encodeURIComponent(artist.slug) + '&cancelled=1'
  });
  return Response.redirect(session.url, 303);
}

async function balance(url, env, site) {
  const orderId = String(url.searchParams.get('order') || '').toUpperCase();
  if (!/^AFC-[0-9A-F]{8}$/.test(orderId)) throw new Error('order');
  const found = await stripeGet(env, 'payment_intents/search', { query: "metadata['order_id']:'" + orderId + "'", limit: 20 });
  const paid = (found.data || []).filter(pi => pi.status === 'succeeded');
  if (!paid.length) throw new Error('order');
  const first = paid[0].metadata;
  const total = parseInt(first.total_cents, 10);
  const already = paid.reduce((s, pi) => s + pi.amount_received - (pi.amount_refunded || 0), 0);
  const owed = total - already;
  if (!(owed > 0)) throw new Error('nothing-owed');
  const artist = AFC.find(first.artist, false);
  if (!artist || artist.payWith !== 'stripe') throw new Error('artist');
  const acct = accountFor(env, artist.slug);
  const fee = Math.round(owed * AFC.FEE);
  const meta = { order_id: orderId, artist: artist.slug, stage: 'balance', total_cents: String(total), item: first.item || '' };
  const session = await stripe(env, 'checkout/sessions', {
    mode: 'payment',
    customer_email: paid[0].receipt_email || undefined,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': owed,
    'line_items[0][price_data][product_data][name]': 'Commission balance: ' + (first.item || 'order') + ' by ' + artist.name,
    'line_items[0][price_data][product_data][description]': 'Order ' + orderId + '. Total ' + usd(total) + ', already paid ' + usd(already) + '.',
    'payment_intent_data[application_fee_amount]': fee,
    'payment_intent_data[transfer_data][destination]': acct,
    'payment_intent_data[description]': 'Artists for Commission order ' + orderId + ' (balance)',
    ...flat('payment_intent_data[metadata]', meta),
    ...flat('metadata', meta),
    success_url: site + '/order-done.html?order=' + orderId + '&paid=balance',
    cancel_url: site + '/order-done.html?order=' + orderId
  });
  return Response.redirect(session.url, 303);
}

function flat(prefix, obj) {
  const out = {};
  for (const k in obj) if (obj[k] !== '' && obj[k] != null) out[prefix + '[' + k + ']'] = obj[k];
  return out;
}
function usd(c) { return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0 }); }

async function stripe(env, path, params) {
  const body = new URLSearchParams();
  for (const k in params) if (params[k] !== undefined) body.append(k, String(params[k]));
  const r = await fetch(STRIPE + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const j = await r.json();
  if (!r.ok) throw new Error('stripe ' + (j.error && j.error.message));
  return j;
}
async function stripeGet(env, path, params) {
  const r = await fetch(STRIPE + path + '?' + new URLSearchParams(params), {
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY }
  });
  const j = await r.json();
  if (!r.ok) throw new Error('stripe ' + (j.error && j.error.message));
  return j;
}
