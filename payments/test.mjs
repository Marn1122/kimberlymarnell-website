// Offline test: fake Stripe, check the split and the price checks.
import worker from './worker.js';
const calls = [];
let intents = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url); const body = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null;
  calls.push({ u, body });
  if (u.endsWith('checkout/sessions')) return new Response(JSON.stringify({ id: 'cs_test', url: 'https://checkout.stripe.com/c/pay/cs_test' }), { status: 200 });
  if (u.includes('payment_intents/search')) return new Response(JSON.stringify({ data: intents }), { status: 200 });
  return new Response('{}', { status: 404 });
};
// test artist with Stripe
AFC.ARTISTS.push({ slug: 'jane-doe', name: 'Jane Doe', payWith: 'stripe', styles: ['Pets'], mediums: ['Oil'], images: [],
  pricing: { mode: 'flat', sizes: { '8x10': 180, '16x20': 650, '24x36': 1600 }, extraPct: 0.25, rushPct: 0.25, depositPct: 0.5, payInFullUnder: 300 } });
const env = { STRIPE_SECRET_KEY: 'sk_test_x', ARTIST_ACCOUNTS: '{"jane-doe":"acct_123ABC"}', SITE_URL: 'https://www.artistsforcommission.com' };
const post = (o) => new Request('https://pay.example/checkout', { method: 'POST', body: new URLSearchParams(o) });
let ok = 0, bad = 0; const t = (name, c) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + name); };

let r = await worker.fetch(post({ artist: 'jane-doe', subject: 'pet', size: '16x20', count: '1', plan: 'deposit', email: 'a@b.co', name: 'Ann' }), env);
let b = calls.at(-1).body;
t('redirects to Stripe', r.status === 303 && r.headers.get('location').startsWith('https://checkout.stripe.com'));
t('deposit 50% of $650 = 32500', b['line_items[0][price_data][unit_amount]'] === '32500');
t('fee 10% = 3250', b['payment_intent_data[application_fee_amount]'] === '3250');
t('goes to artist account', b['payment_intent_data[transfer_data][destination]'] === 'acct_123ABC');
t('order id in metadata', /^AFC-[0-9A-F]{8}$/.test(b['payment_intent_data[metadata][order_id]']));
t('total stored 65000', b['metadata[total_cents]'] === '65000');

calls.length = 0;
r = await worker.fetch(post({ artist: 'jane-doe', subject: 'person', size: '24x36', count: '2', rush: 'on', plan: 'full', email: 'a@b.co' }), env);
b = calls.at(-1).body;
// 1600 + 25% extra = 2000, + 25% rush = 2500 → $2,500 full, fee $250
t('full + extra + rush = 250000', b['line_items[0][price_data][unit_amount]'] === '250000');
t('fee 25000', b['payment_intent_data[application_fee_amount]'] === '25000');

calls.length = 0;
r = await worker.fetch(post({ artist: 'jane-doe', subject: 'pet', size: '8x10', count: '1', plan: 'deposit', email: 'a@b.co' }), env);
b = calls.at(-1).body;
t('under $300 paid in full = 18000', b['line_items[0][price_data][unit_amount]'] === '18000' && b['payment_intent_data[application_fee_amount]'] === '1800');

calls.length = 0;
r = await worker.fetch(post({ artist: 'jane-doe', subject: 'pet', size: '99x99', count: '1', email: 'a@b.co', price: '1' }), env);
t('fake size refused, no Stripe call', r.headers.get('location').includes('error=size') && calls.length === 0);
r = await worker.fetch(post({ artist: 'kimberly-marnell', subject: 'pet', size: '16x20', count: '1', email: 'a@b.co' }), env);
t('Kimberly uses her own form', r.headers.get('location').includes('error=artist'));
r = await worker.fetch(post({ artist: 'jane-doe', subject: 'pet', size: '16x20', count: '1', email: 'nope' }), env);
t('bad email refused', r.headers.get('location').includes('error=email'));
r = await worker.fetch(post({ artist: 'jane-doe', subject: 'pet', size: '16x20', count: '1', email: 'a@b.co' }), { ...env, ARTIST_ACCOUNTS: '{}' });
t('artist without Stripe account refused', r.headers.get('location').includes('error=not-ready'));

// balance
intents = [{ status: 'succeeded', amount_received: 32500, amount_refunded: 0, receipt_email: 'a@b.co', metadata: { order_id: 'AFC-1A2B3C4D', artist: 'jane-doe', total_cents: '65000', item: '16 × 20 in pet portrait' } }];
calls.length = 0;
r = await worker.fetch(new Request('https://pay.example/balance?order=AFC-1A2B3C4D'), env);
b = calls.at(-1).body;
t('balance 32500, fee 3250, to artist', b['line_items[0][price_data][unit_amount]'] === '32500' && b['payment_intent_data[application_fee_amount]'] === '3250' && b['payment_intent_data[transfer_data][destination]'] === 'acct_123ABC');
intents.push({ status: 'succeeded', amount_received: 32500, amount_refunded: 0, metadata: {} });
r = await worker.fetch(new Request('https://pay.example/balance?order=AFC-1A2B3C4D'), env);
t('fully paid order not charged again', r.headers.get('location').includes('error=nothing-owed'));
r = await worker.fetch(new Request('https://pay.example/balance?order=../../x'), env);
t('bad order id refused', r.headers.get('location').includes('error=order'));
t('secret key only in header', !JSON.stringify(calls.map(c => c.body)).includes('sk_test'));
console.log(ok + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
