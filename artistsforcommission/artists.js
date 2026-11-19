/* Artists for Commission — the ONE list of artists, their prices and the platform fee.
   Used by the website (directory, order page) AND by the payment worker, so the price
   a buyer sees is the price Stripe charges. Edit here only.

   Stripe account IDs are NOT kept here. They live in the payment worker's
   ARTIST_ACCOUNTS setting in Cloudflare (see payments/SETUP.md). */
(function (g) {
  var FEE = 0.10; // platform fee taken from each artist payment (10%)

  var SIZES_SQIN = [[8,10],[11,14],[12,16],[16,20],[18,24],[20,24],[24,30],[24,36]];

  var ARTISTS = [
    {
      slug: 'kimberly-marnell',
      name: 'Kimberly Marnell',
      founding: true,
      location: 'Irvine, California',
      page: 'artist-kimberly-marnell.html',
      payWith: 'own-form', // Kimberly's own order form (commission.html), no platform fee
      orderUrl: 'commission.html',
      styles: ['Pets', 'People & families', 'Homes & places'],
      mediums: ['Oil', 'Acrylic'],
      blurb: 'Expressive portraits in oil and acrylic, often wrapped in flowers, sky and warm light.',
      images: ['img/golden-hour.jpg', 'img/queen-of-the-night.jpg', 'img/take-me-back.jpg'],
      pricing: { mode: 'sqin', rates: { pet: 2.5, person: 3.0, home: 2.5 }, extraPct: 0.25, rushPct: 0.25,
                 depositPct: 0.5, payInFullUnder: 500 }
    }
    /* New approved artists go here, for example:
    ,{
      slug: 'jane-doe', name: 'Jane Doe', location: 'Austin, TX', page: 'artist.html?a=jane-doe',
      payWith: 'stripe', styles: ['Pets'], mediums: ['Oil'], blurb: '…', images: ['img/artists/jane-doe-1.jpg'],
      pricing: { mode: 'flat', sizes: { '8x10': 180, '16x20': 650, '24x36': 1600 }, extraPct: 0.25, rushPct: 0.25,
                 depositPct: 0.5, payInFullUnder: 300 }
    } */
  ];

  function find(slug, allowExample) {
    for (var i = 0; i < ARTISTS.length; i++) if (ARTISTS[i].slug === slug) return ARTISTS[i];
    return null;
  }

  function sizes(artist) {
    var p = artist.pricing;
    if (p.mode === 'flat') return Object.keys(p.sizes);
    return SIZES_SQIN.map(function (s) { return s[0] + 'x' + s[1]; });
  }

  /* Price in whole cents. Throws on anything not offered, so a tampered order cannot be charged. */
  function quote(artist, o) {
    var p = artist.pricing, subject = o.subject, size = String(o.size || ''), count = parseInt(o.count, 10);
    if (['pet', 'person', 'home'].indexOf(subject) < 0) throw new Error('subject');
    if (sizes(artist).indexOf(size) < 0) throw new Error('size');
    if (!(count >= 1 && count <= 8)) throw new Error('count');
    var wh = size.split('x').map(Number), base;
    if (p.mode === 'flat') base = p.sizes[size] * 100;
    else base = Math.round(wh[0] * wh[1] * p.rates[subject] * 100);
    var extra = Math.round(base * p.extraPct * (count - 1));
    var rush = o.rush && p.rushPct ? Math.round((base + extra) * p.rushPct) : 0;
    var total = base + extra + rush;
    var full = total < p.payInFullUnder * 100 || o.plan === 'full';
    var due = full ? total : Math.round(total * p.depositPct);
    var fee = Math.round(due * FEE);
    return { base: base, extra: extra, rush: rush, total: total, full: full, due: due, fee: fee, artistGets: due - fee,
             label: size.replace('x', ' × ') + ' in ' + ({ pet: 'pet portrait', person: 'portrait', home: 'home painting' })[subject] +
                    (count > 1 ? ' · ' + count + ' subjects' : '') + (rush ? ' · rush' : '') };
  }

  g.AFC = { FEE: FEE, ARTISTS: ARTISTS, find: find, sizes: sizes, quote: quote };
  g.AFC_FEE = FEE;
  g.AFC_ARTISTS = ARTISTS.map(function (a) {
    var from = a.pricing.mode === 'flat' ? Math.min.apply(null, Object.keys(a.pricing.sizes).map(function (k) { return a.pricing.sizes[k]; }))
                                          : 80 * Math.min(a.pricing.rates.pet, a.pricing.rates.person, a.pricing.rates.home);
    return Object.assign({ from: from }, a);
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
