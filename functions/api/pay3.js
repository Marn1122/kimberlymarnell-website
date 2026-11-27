// GET /api/pay3?work=<key> → sends the buyer to Stripe Checkout for Pay in 3 (automatic monthly charges)
import { startCheckout, SITE } from '../../pay3/core.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!/kimberlymarnell\.com$|\.pages\.dev$|localhost/.test(url.hostname)) return new Response('Not found', { status: 404 });
  const key = url.searchParams.get('work') || '';
  if (url.searchParams.get('check') === '1') return Response.json({ ok: true, configured: !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET });
  try {
    const r = await startCheckout(env, key);
    if (r.url) return Response.redirect(r.url, 303);
    return Response.redirect(`${SITE}/pay-in-3-unavailable.html?reason=${r.error}`, 303);
  } catch (e) {
    return Response.redirect(`${SITE}/pay-in-3-unavailable.html?reason=error`, 303);
  }
}
