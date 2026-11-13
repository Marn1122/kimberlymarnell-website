document.querySelectorAll('.thumbs').forEach(function(g){
  var fig=g.parentNode.querySelector('.image'), img=fig.querySelector('img.main'), link=fig.querySelector('.main-link'), cap=fig.querySelector('.main-cap');
  g.addEventListener('click',function(ev){var b=ev.target.closest('.thumb'); if(!b) return;
    img.src=b.dataset.src; img.alt=b.dataset.alt; link.href=b.dataset.src; cap.textContent=b.dataset.cap;
    g.querySelectorAll('.thumb').forEach(function(t){t.classList.toggle('on',t===b)});});
});
