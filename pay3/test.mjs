import assert from 'node:assert/strict';
import { split, form, startCheckout, lockPlan, verify, WORKS, sweep, finishCheckout } from './core.js';
import { createHmac } from 'node:crypto';
let n = 0; const t = async (name, f) => { await f(); n++; console.log('ok', name); };

await t('split adds up', () => {
  assert.deepEqual(split(260000), [86667, 86667, 86666]);
  assert.deepEqual(split(150000), [50000, 50000, 50000]);
  assert.deepEqual(split(1040000), [346667, 346667, 346666]);
  for (const w of Object.values(WORKS)) assert.equal(split(w.total).reduce((a, b) => a + b), w.total);
});
await t('form encoding', () => assert.equal(form({ a: { 0: { b: 1 } }, c: 'x y' }), 'a%5B0%5D%5Bb%5D=1&c=x%20y'));

function mock(routes) {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); for (const [re, body] of routes) if (re.test(url) && (!body.method || body.method === init.method)) return { ok: true, json: async () => (typeof body.res === 'function' ? body.res(url, init) : body.res) }; throw new Error('no route ' + url); };
  f.calls = calls; return f;
}
const env = { STRIPE_SECRET_KEY: 'sk_test_x' };

await t('unknown work refused, nothing called', async () => { const f = mock([]); const r = await startCheckout(env, 'nope', new Date(), f); assert.equal(r.status, 400); assert.equal(f.calls.length, 0); });
await t('not configured', async () => { const r = await startCheckout({}, 'communion', new Date(), mock([])); assert.equal(r.error, 'not_configured'); });
await t('reserved painting refused', async () => {
  const f = mock([[/subscriptions\/search/, { res: { data: [{ id: 'sub_1' }] } }]]);
  const r = await startCheckout(env, 'communion', new Date(), f); assert.equal(r.status, 409); assert.equal(f.calls.length, 1);
});
await t('checkout session: first third, monthly, terms with dates', async () => {
  const f = mock([[/subscriptions\/search/, { res: { data: [] } }], [/checkout\/sessions/, { res: { url: 'https://checkout.stripe.com/x' } }]]);
  const r = await startCheckout(env, '91028cd1413748419e020d2d4b60667d', new Date(Date.UTC(2026, 10, 26)), f);
  assert.equal(r.url, 'https://checkout.stripe.com/x');
  const body = decodeURIComponent(f.calls[1].init.body);
  assert.match(body, /mode=subscription/); assert.match(body, /\[unit_amount\]=86667/); assert.match(body, /\[interval\]=month/);
  assert.match(body, /\$866\.67 today, \$866\.67 on December 26, 2026 and \$866\.66 on January 26, 2027 \(total \$2,600/);
  assert.match(body, /subscription_data\[metadata\]\[total\]=260000/);
  assert.equal(f.calls[1].init.headers.Authorization, 'Bearer sk_test_x');
});
await t('lockPlan: 2 + 1 phases, cancel at end', async () => {
  const f = mock([
    [/subscriptions\/sub_1$/, { method: 'GET', res: { id: 'sub_1', status: 'active', schedule: null, metadata: { kind: 'pay3', total: '260000' }, items: { data: [{ price: { id: 'price_1', product: 'prod_1' } }] } } }],
    [/subscription_schedules$/, { res: { id: 'sub_sched_1', phases: [{ start_date: 111 }] } }],
    [/subscription_schedules\/sub_sched_1/, { res: { id: 'sub_sched_1' } }]]);
  const r = await lockPlan(env, { mode: 'subscription', subscription: 'sub_1', metadata: { kind: 'pay3' } }, f);
  assert.equal(r, 'locked');
  const body = decodeURIComponent(f.calls[2].init.body);
  assert.match(body, /end_behavior=cancel/); assert.match(body, /phases\[0\]\[iterations\]=2/); assert.match(body, /phases\[1\]\[iterations\]=1/);
  assert.match(body, /phases\[1\]\[items\]\[0\]\[price_data\]\[unit_amount\]=86666/); assert.match(body, /phases\[0\]\[start_date\]=111/);
});
await t('lockPlan: equal payments → one phase of 3', async () => {
  const f = mock([
    [/subscriptions\/sub_2$/, { method: 'GET', res: { id: 'sub_2', status: 'active', schedule: null, metadata: { kind: 'pay3', total: '150000' }, items: { data: [{ price: { id: 'p', product: 'pr' } }] } } }],
    [/subscription_schedules$/, { res: { id: 's2', phases: [{ start_date: 5 }] } }], [/subscription_schedules\/s2/, { res: {} }]]);
  await lockPlan(env, { mode: 'subscription', subscription: 'sub_2', metadata: { kind: 'pay3' } }, f);
  const body = decodeURIComponent(f.calls[2].init.body); assert.match(body, /phases\[0\]\[iterations\]=3/); assert.doesNotMatch(body, /phases\[1\]/);
});
await t('lockPlan ignores other checkouts and is idempotent', async () => {
  assert.equal(await lockPlan(env, { mode: 'payment', metadata: {} }, mock([])), 'ignored');
  const f = mock([[/subscriptions\/sub_3$/, { res: { id: 'sub_3', schedule: 'sched_x', metadata: { kind: 'pay3', total: '1' }, items: { data: [] } } }]]);
  assert.equal(await lockPlan(env, { mode: 'subscription', subscription: 'sub_3', metadata: { kind: 'pay3' } }, f), 'already_scheduled');
});
await t('webhook signature', async () => {
  const p = '{"a":1}', now = 1800000000, sig = createHmac('sha256', 'whsec_x').update(now + '.' + p).digest('hex');
  assert.equal(await verify(p, `t=${now},v1=${sig}`, 'whsec_x', 300, now), true);
  assert.equal(await verify(p, `t=${now},v1=${sig}`, 'whsec_y', 300, now), false);
  assert.equal(await verify(p + ' ', `t=${now},v1=${sig}`, 'whsec_x', 300, now), false);
  assert.equal(await verify(p, `t=${now - 1000},v1=${sig}`, 'whsec_x', 300, now), false);
});
await t('success redirect locks the plan and thanks the buyer', async () => {
  const f = mock([
    [/checkout\/sessions\/cs_1/, { res: { mode: 'subscription', subscription: 'sub_9', metadata: { kind: 'pay3', title: 'Golden Hour' } } }],
    [/subscriptions\/sub_9$/, { method: 'GET', res: { id: 'sub_9', status: 'active', schedule: null, metadata: { kind: 'pay3', total: '150000' }, items: { data: [{ price: { id: 'p', product: 'pr' } }] } } }],
    [/subscription_schedules$/, { res: { id: 's9', phases: [{ start_date: 1 }] } }], [/subscription_schedules\/s9/, { res: {} }]]);
  const r = await finishCheckout(env, 'cs_1', f);
  assert.equal(r.result, 'locked'); assert.match(r.url, /thank-you\.html\?plan=1&work=Golden%20Hour/);
});
await t('sweep locks only unlocked plans', async () => {
  const f = mock([
    [/subscriptions\/search/, { res: { data: [
      { id: 'a', status: 'active', schedule: 'sched', metadata: { kind: 'pay3', total: '150000' }, items: { data: [] } },
      { id: 'b', status: 'active', schedule: null, metadata: { kind: 'pay3', total: '150000' }, items: { data: [{ price: { id: 'p', product: 'pr' } }] } }] } }],
    [/subscription_schedules$/, { res: { id: 'sb', phases: [{ start_date: 1 }] } }], [/subscription_schedules\/sb/, { res: {} }]]);
  assert.deepEqual(await sweep(env, f), ['locked']);
});
console.log(n, 'tests passed');
