# Automatic 10% split — setup guide for Kimberly

When a buyer pays an artist on artistsforcommission.com:

1. The buyer pays on Stripe's secure checkout page.
2. Stripe splits the payment automatically, the moment it goes through:
   - **90%** goes to the artist's own Stripe account, and Stripe pays it out to their bank.
   - **10%** stays in **your** Stripe account (the "application fee"). Stripe's card fee comes out of your 10%.
3. Nobody sends money by hand. You see every payment and every fee in your Stripe Dashboard.

Your own commissions keep using your current order form and Bluevine link, so no fee is taken from you.

The pieces:
- `artistsforcommission/artists.js`: the list of artists, their prices and the 10% fee. The website and the payment worker both read this one file, so the price a buyer sees is the price Stripe charges.
- `payments/worker.js`: a small free program on Cloudflare that prices each order and opens Stripe checkout with the split. It never trusts a price sent by a browser.
- `payments/upload/worker.js`: the same program as one file, ready to paste into Cloudflare.

---

## Part A — Stripe (one time, about 20 minutes)

You do these steps yourself in your own Stripe account. Never paste a secret key into a chat, an email or the website.

1. **Turn on Connect.** Stripe Dashboard → **Connect** → **Get started**. Choose **Marketplace**. Finish the **platform profile** Stripe asks for.
2. **Branding.** Settings → Connect → **Branding**: name "Artists for Commission", your icon and color. Artists see this when they sign up.
3. **Artist accounts.** Use **Express** accounts. Stripe handles the artists' identity checks, bank details and tax forms, and artists get a simple Stripe dashboard to see their payouts.
4. **Secret key.** Developers → **API keys**. Start with the **test mode** key, `sk_test_…`. Keep it on your screen for Part B.

**What Connect costs:** on top of normal card fees, Stripe charges platforms that set their own fees $2 for each artist who gets paid in a month, plus 0.25% + 25¢ on each payout. Example on an $800 order: you keep $80, minus the card fee (about $23.50), minus the payout fee (about $2.05), so roughly **$54**, less $2 a month for each artist who was paid that month.

## Part B — Cloudflare (one time, about 10 minutes, free)

1. Create a free account at cloudflare.com.
2. Go to **Workers & Pages** → **Create** → **Create Worker**. Name it `afc-payments` → **Deploy**.
3. Click **Edit code**. Delete what's there, paste everything from `payments/upload/worker.js`, then click **Deploy**.
4. Go to **Settings** → **Variables and Secrets** and add these three:
   - `STRIPE_SECRET_KEY`: type **Secret**. Paste your Stripe secret key.
   - `ARTIST_ACCOUNTS`: type **Text**. Value `{}` for now.
   - `SITE_URL`: type **Text**. Value `https://www.artistsforcommission.com`
5. Copy the worker's address. It looks like `https://afc-payments.YOURNAME.workers.dev`. Send me only this address. Never send the key. I'll put it into the site as `AFC_PAY_URL` in `site.js`.

Free plan limit: 100,000 requests a day, far more than checkout needs.

## Part C — Test before real money

1. With the **test** key in place, add a test artist (see Part D, steps 1–3, in test mode).
2. Place an order on the site and pay with Stripe's test card `4242 4242 4242 4242`, any future date and any CVC.
3. In Stripe (test mode) check that:
   - **Payments** shows the payment.
   - **Connect** → the test artist's balance shows 90%.
   - **Collected fees** shows your 10%.
4. Open the balance link on the thank-you page and pay it. Check that the same split happened.
5. When everything checks out, swap `STRIPE_SECRET_KEY` for your **live** key `sk_live_…`. Then add the real artists again in live mode, because test accounts don't carry over.

## Part D — Adding an approved artist (each time)

1. Stripe → **Connect** → **Connected accounts** → **+ Create** → Express → **Continue**. Stripe gives you a one-time sign-up link.
2. Email that link to the artist. They enter their own details and bank account on Stripe's page. Stripe emails you when they're done.
3. Copy their account ID (starts with `acct_`) from the Connected accounts list.
4. Cloudflare → `afc-payments` → Settings → `ARTIST_ACCOUNTS`. Add them, for example:
   `{"jane-doe":"acct_1ABC234"}`. For a second artist: `{"jane-doe":"acct_1ABC234","sam-lee":"acct_9XYZ876"}`
5. Ask me to add the artist's page, images and prices to `artists.js`. Then paste the new `upload/worker.js` into Cloudflare again (Edit code → paste → Deploy). The site goes through the usual approval and publishing steps.

Until step 4 is done, that artist's checkout politely says they're still setting up payments, and nothing is charged.

## Part E — Refunds and disputes

- **Refunds:** Stripe → the payment → **Refund**. Tick **Reverse the transfer**, so the artist's 90% comes back, and **Refund application fee**, so your 10% is returned too. Otherwise the whole refund comes out of your balance.
- **Disputes (chargebacks):** with this setup the platform (you) is responsible first. Stripe takes the disputed amount from your balance. You can then reverse the artist's transfer to recover their share. This is why the artist terms should cover refunds and disputes.

## Before going live, also

- Have the **artist terms** and **buyer terms** reviewed: the 10% fee, refunds, disputes, copyright, and ordering through the site.
- Ask your accountant about **sales tax** on commissions and your reporting duties as a marketplace. Stripe can send the artists' 1099 tax forms.
- Remove the yellow preview bar and the example artist (`EXAMPLE` in `artists.js`).
