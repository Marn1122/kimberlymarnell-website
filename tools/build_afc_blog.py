import json, sys, html, re
sys.path.insert(0, 'tools')
from afc_blog_posts import POSTS, DATE, DATE_TEXT, CTA
D = 'artistsforcommission/'
HEADER = open('/tmp/afc_header.html').read().replace(' aria-current="page"', '')
FOOTER = open('/tmp/afc_footer.html').read()
if 'blog.html' not in FOOTER:
    FOOTER = FOOTER.replace('<a href="for-artists.html#faq">Artist questions</a>', '<a href="for-artists.html#faq">Artist questions</a><a href="blog.html">Artist blog</a>')
open('/tmp/afc_footer_new.html','w').write(FOOTER)

def head(title, desc, url, extra=''):
    t = html.escape(title, quote=True); d = html.escape(desc, quote=True)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} · Artists for Commission</title>
<meta name="description" content="{d}">
<link rel="canonical" href="https://www.artistsforcommission.com/{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="https://www.artistsforcommission.com/{url}">
<meta property="og:image" content="https://www.artistsforcommission.com/img/golden-hour.jpg">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="site.css">
{extra}</head>
<body>
'''
TAIL = '\n<script src="artists.js"></script>\n<script src="site.js"></script>\n</body>\n</html>\n'

for p in POSTS:
    url = p['slug'].replace('.html','')
    ld = {"@context":"https://schema.org","@type":"BlogPosting","headline":p['title'],"description":p['desc'],
          "datePublished":DATE,"dateModified":DATE,"author":{"@type":"Person","name":"Kimberly Marnell"},
          "publisher":{"@type":"Organization","name":"Artists for Commission"},
          "mainEntityOfPage":f"https://www.artistsforcommission.com/{url}"}
    others = [o for o in POSTS if o is not p]
    more = ''.join(f'<li><a href="{o["slug"]}.html">{html.escape(o["title"])}</a></li>' for o in others)
    page = head(p['title'], p['desc'], url, f'<script type="application/ld+json">{json.dumps(ld)}</script>\n') + HEADER + f'''
<main>
<article class="post">
  <div class="wrap post-wrap">
    <p class="post-meta"><a href="blog.html">Artist blog</a> · {p['kicker']}</p>
    <h1 class="post-title">{html.escape(p['title'])}</h1>
    <p class="post-by">By Kimberly Marnell, founder · <time datetime="{DATE}">{DATE_TEXT}</time> · {p['read']}</p>
    <p class="post-intro">{p['intro']}</p>
    <div class="post-body">{p['body']}</div>
    {CTA}
    <nav class="post-more" aria-label="More articles"><h2>More for artists</h2><ul>{more}</ul></nav>
  </div>
</article>
</main>
''' + FOOTER + TAIL
    open(D + p['slug'] + '.html', 'w').write(page)

cards = ''.join(f'''<a class="post-card" href="{p['slug']}.html"><span class="eyebrow">{p['kicker']}</span><h2>{html.escape(p['title'])}</h2><p class="muted">{html.escape(p['desc'])}</p><span class="post-card-more">Read · {p['read']}</span></a>''' for p in POSTS)
idx = head('Artist blog: commissions, pricing and fees', 'Practical guides for painters and illustrators who take commissions: getting clients, pricing, terms and platform fees.', 'blog') + HEADER + f'''
<main>
<section class="hero" style="padding-bottom:clamp(40px,6vw,70px)">
  <div class="wrap center">
    <p class="eyebrow">Artist blog</p>
    <h1 class="headline">Get hired for the <span class="serif">art you love.</span></h1>
    <p class="lead" style="margin-top:16px">Practical guides for painters who take commissions: finding clients, pricing, terms and fees.</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap"><div class="post-grid">{cards}</div>
  {CTA}</div>
</section>
</main>
''' + FOOTER + TAIL
open(D + 'blog.html', 'w').write(idx)
print('built', len(POSTS)+1)
