// Product page (/product?s=<slug>): reuses the product popup layout, then adds why-us, comparison and related parts.
let products = [];
const STAR = on => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m12 2 3 7 7 .6-5.3 4.6 1.6 7.3L12 17.8 5.7 21.5l1.6-7.3L2 9.6 9 9z"/></svg>`;
window.stars = n => [1, 2, 3, 4, 5].map(i => STAR(i <= n)).join('');
$('#yr').textContent = new Date().getFullYear();
$('#burger').onclick = () => $('#nav').classList.toggle('open');
$('#toTop').onclick = () => scrollTo({ top: 0 });
addEventListener('scroll', () => {
  const h = document.documentElement;
  $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  $('#toTop').classList.toggle('show', h.scrollTop > 700);
}, { passive: true });

const ICON = p => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p}</svg>`;
// Only true, checkable points. Add material/finish rows once the owner confirms them.
const why = p => [
  [ICON('<path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z"/>'), 'Built & ride-tested by riders', 'Made and fitted by the riders at Altitude Moto.'],
  [ICON('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'), p.kind === 'windshield' ? 'Fits our RE 450 type mounts' : 'Made for your exact bike', p.kind === 'windshield' ? 'Matches our RE 450 Touring type GPS mounts.' : `Made for the ${p.bike}, not a universal clamp.`],
  [ICON('<path d="M14 7 7 14l3 3 7-7zM5 19l2-2"/>'), 'Complete hardware', 'All bushes, nuts and bolts included in the box.'],
  [ICON('<path d="M3 21h18M5 21V8l7-5 7 5v13"/>'), 'Fitting at our garage', 'Get it fitted at our garage in Dahisar East, Mumbai.'],
  [ICON('<path d="M21 12a9 9 0 1 1-4-7.5L21 3v5h-5"/>'), 'Check before you buy', 'WhatsApp a photo of your bike and we confirm the fit.'],
  [ICON('<path d="M3 12h18M3 6h18M3 18h12"/>'), 'Easy cancel & returns', 'Free cancellation before shipping. 7-day returns on unused parts.']
];
const compare = p => p.kind === 'windshield' ? '' : `<section class="pp-sec"><h2 class="section-title">What makes ours <span class="lime">different</span></h2>
  <div class="cmp"><div class="cmp-h"><span></span><b class="lime">Altitude Moto</b><b>Basic universal phone holder</b></div>
  ${[['Made for one bike', `Yes, for the ${p.bike}`, 'No, a universal clamp'],
     ['Holds a windshield', `Yes. ${p.compat}`, 'No, holds a phone only'],
     ['Hardware in the box', 'All bushes, nuts and bolts', 'Varies by seller'],
     ['Fitting help', 'At our Mumbai garage + WhatsApp', 'Do it yourself']]
    .map(([k, a, b]) => `<div class="cmp-r"><span>${k}</span><b><i class="ok">✓</i>${esc(a)}</b><small><i class="no">✕</i>${b}</small></div>`).join('')}</div></section>`;
const card = p => `<a class="card" href="/product?s=${encodeURIComponent(p.slug)}"><div class="ph"><img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.title)}"></div>
  <div class="body"><h3>${esc(p.title)}</h3><div class="price">${p.price ? inr(p.price) : 'Price on request'}</div></div></a>`;

api('/api/products').then(list => {
  products = list;
  const p = list.find(x => x.slug === new URLSearchParams(location.search).get('s'));
  if (!p) { $('#modal-box').innerHTML = '<p style="padding:40px">Product not found. <a class="lime" href="/#shop">See all parts →</a></p>'; return; }
  document.title = `${p.title} — ${p.price ? inr(p.price) : 'Price on request'} | Altitude Moto`;
  document.querySelector('meta[name=description]').content = p.desc;
  $('#crumbs').innerHTML = `<a href="/">Home</a><span>›</span><a href="/#shop">${esc(p.brand)}</a><span>›</span><b>${esc(p.bike)}</b>`;
  openProduct(p);
  Cart.render();
  const related = list.filter(x => x.slug !== p.slug && x.bike === p.bike)
    .concat(list.filter(x => x.slug !== p.slug && x.bike !== p.bike && x.brand === p.brand)).slice(0, 4);
  $('#extra').innerHTML = `<section class="pp-sec"><h2 class="section-title">Why <span class="lime">Altitude Moto</span></h2>
    <div class="why-g">${why(p).map(([i, t, d]) => `<div class="why-c reveal"><span class="why-i">${i}</span><b>${t}</b><small>${esc(d)}</small></div>`).join('')}</div></section>
    ${compare(p)}
    ${related.length ? `<section class="pp-sec"><h2 class="section-title">More for <span class="lime">${esc(p.brand)}</span></h2><div class="grid">${related.map(card).join('')}</div></section>` : ''}
    <section class="pp-sec pp-cta"><h3>Not sure it fits?</h3><p>Send a photo of your bike on WhatsApp and we'll confirm before you buy.</p>
      <a class="btn" target="_blank" rel="noopener" href="https://wa.me/919833731869?text=${encodeURIComponent('Hi, will the ' + p.title + ' fit my bike?')}">WhatsApp us</a></section>`;
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}).catch(() => { $('#modal-box').innerHTML = '<p style="padding:40px">Could not load. Please refresh.</p>'; });
