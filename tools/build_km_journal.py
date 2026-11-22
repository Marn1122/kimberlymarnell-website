import json, sys, html, re
sys.path.insert(0,'tools')
from km_journal_posts import POSTS, DATE, DATE_TEXT
D='dist/'
tpl=open(D+'choosing-figurative-art-for-your-home.html').read()
pre_nav=tpl[tpl.index('<body>'):tpl.index('<main>')]
foot=tpl[tpl.index('</main>'):]
foot=foot  # footer + closing
for p in POSTS:
    url=p['slug']
    ld={"@context":"https://schema.org","@type":"BlogPosting","headline":p['title'],"description":p['desc'],
        "image":[f"https://kimberlymarnell.com/img/{p['img']}"],"datePublished":DATE,"dateModified":DATE,
        "author":{"@type":"Person","name":"Kimberly Marnell","url":"https://kimberlymarnell.com/"},
        "publisher":{"@type":"Organization","name":"Kimberly Marnell Art","url":"https://kimberlymarnell.com/"},
        "mainEntityOfPage":f"https://kimberlymarnell.com/{url}"}
    t=html.escape(p['title']); d=html.escape(p['desc'],quote=True)
    head=(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      f'<title>{t} | Kimberly Marnell Art</title><meta name="description" content="{d}"><link rel="canonical" href="https://kimberlymarnell.com/{url}">'
      f'<meta property="og:type" content="article"><meta property="og:title" content="{t} | Kimberly Marnell Art"><meta property="og:description" content="{d}">'
      f'<meta property="og:url" content="https://kimberlymarnell.com/{url}"><meta property="og:image" content="https://kimberlymarnell.com/img/{p["img"]}">'
      f'<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="collect.css"><link rel="stylesheet" href="journal.css">'
      f'<script type="application/ld+json">{json.dumps(ld)}</script></head>')
    others=[o for o in POSTS if o is not p]
    more=''.join(f'<li><a href="{o["slug"]}.html">{html.escape(o["title"])}</a></li>' for o in others)
    b,lnk=p['panel_btn']
    main=(f'<main><p class="breadcrumbs"><a href="journal.html">Collector journal</a> / {p["crumb"]}</p><article class="journal-article"><header>'
      f'<p class="eyebrow">{p["crumb"]} · Kimberly Marnell Art</p><h1>{t}</h1><p class="note">{DATE_TEXT} · By Kimberly Marnell</p><p class="lede">{p["lede"]}</p></header>'
      f'<figure><img src="img/{p["img"]}" alt="{html.escape(p["alt"],quote=True)}"><figcaption>{p["cap"]}</figcaption></figure>'
      f'<div class="article-copy">{p["body"]}</div>'
      f'<aside class="panel"><h2>{p["panel_h"]}</h2><p>{p["panel_p"]}</p><a class="btn primary" href="{lnk}">{b}</a></aside></article>'
      f'<section class="reading-links"><h2>More collector notes.</h2><ul>{more}</ul></section>')
    open(D+url+'.html','w').write(head+pre_nav+main+foot)
# journal index: add cards at top of grid
j=open(D+'journal.html').read()
if 'free-rein-new-collection.html' not in j:
    cards=''
    for p in POSTS:
        cards+=(f'<article class="card"><a class="image" href="{p["slug"]}.html"><img src="img/{p["img"]}" alt="{html.escape(p["title"],quote=True)}" loading="lazy"></a>'
                f'<p class="eyebrow">{p["crumb"]}</p><h2><a href="{p["slug"]}.html">{html.escape(p["title"])}</a></h2><p>{html.escape(p["desc"])}</p>'
                f'<a class="btn" href="{p["slug"]}.html">Read</a></article>')
    m=re.search(r'<section class="grid journal-grid">',j); assert m
    j=j[:m.end()]+cards+j[m.end():]
    open(D+'journal.html','w').write(j)
# sitemap
s=open(D+'sitemap.xml').read()
for p in POSTS:
    loc=f'<url><loc>https://kimberlymarnell.com/{p["slug"]}</loc></url>'
    if loc not in s: s=s.replace('</urlset>',loc+'</urlset>')
open(D+'sitemap.xml','w').write(s)
# Free Rein page: link to the announcement
f=open(D+'collection-what-we-make-of-free-rein.html').read()
if 'free-rein-new-collection.html' not in f:
    old='Released so far: 0 of 10'
    assert old in f
    f=f.replace(old, old+' · <a href="free-rein-new-collection.html">Read Kimberly’s note on the collection</a>',1)
    open(D+'collection-what-we-make-of-free-rein.html','w').write(f)
print('ok')
