// POST /api/stripe-webhook ← Stripe (event: checkout.session.completed)
// After the first Pay in 3 payment, fixes the plan to exactly three monthly charges and then stops.
import { verify, lockPlan } from '../../pay3/core.js';

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const ok = await verify(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response('bad signature', { status: 400 });
  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });
  try {
    const r = await lockPlan(env, event.data.object);
    return new Response(r, { status: 200 });
  } catch (e) {
    return new Response('error: ' + e.message, { status: 500 }); // Stripe retries automatically
  }
}
