let products = [], brand = '', model = '', query = '', sort = '';
$('#yr').textContent = new Date().getFullYear();

function list() {
  const q = query.toLowerCase();
  const out = products.filter(p => (!brand || p.brand === brand) && (!model || p.bike === model) &&
    (!q || (p.bike + ' ' + p.title + ' ' + p.compat).toLowerCase().includes(q)));
  if (sort) out.sort((a, b) => sort === 'lo' ? a.price - b.price : b.price - a.price);
  return out;
}

function quickAdd(p) {
  if (p.addons.length) return openProduct(p);
  Cart.add({ slug: p.slug, title: p.title, image: p.images[0], qty: 1, unit: p.price, addons: [], addonNames: '' });
}

function renderGrid() {
  const l = list();
  $('#count').textContent = `${l.length} part${l.length === 1 ? '' : 's'}${model ? ' for ' + model : ''}`;
  $('#grid').innerHTML = l.map(p => `<div class="card reveal" data-slug="${esc(p.slug)}">
    <div class="ph">${p.title.includes('Kit') ? '<span class="badge">KIT</span>' : ''}
      <img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.title)}">
      ${p.images[1] ? `<img class="alt" loading="lazy" src="${esc(p.images[1])}" alt="">` : ''}
      <button class="quick" data-q="${esc(p.slug)}" aria-label="Quick add ${esc(p.title)}">+</button></div>
    <div class="body"><span class="tag">${esc(p.bike)}</span><h3>${esc(p.title)}</h3>
    <small>${esc(p.compat)}</small>
    <div class="row" style="margin-top:auto"><div class="price">${inr(p.price)}</div><small>${p.images.length} photos</small></div></div></div>`).join('')
    || '<p style="color:var(--muted)">No parts found. WhatsApp us — we may still fit your bike!</p>';
  document.querySelectorAll('.card').forEach(c => c.onclick = e => {
    const p = products.find(x => x.slug === c.dataset.slug);
    e.target.dataset.q ? quickAdd(p) : openProduct(p);
  });
  observeReveal();
}

function renderModels() {
  const bikes = [...new Set(products.filter(p => !brand || p.brand === brand).map(p => p.bike))];
  $('#models').innerHTML = `<button class="${model ? '' : 'on'}" data-m="">All models</button>` +
    bikes.map(b => `<button class="${b === model ? 'on' : ''}" data-m="${esc(b)}">${esc(b)}</button>`).join('');
  document.querySelectorAll('#models button').forEach(b => b.onclick = () => { model = b.dataset.m; renderModels(); renderGrid(); });
}

function renderExtras() {
  const bikes = [...new Set(products.map(p => p.bike.toUpperCase()))].join('  //  ') + '  //  ';
  $('#marquee').textContent = bikes + bikes;
  const pics = products.flatMap(p => p.images.slice(1, 3));
  $('#masonry').innerHTML = pics.filter((_, i) => i % 2 === 0).slice(0, 10).map(s => `<img loading="lazy" src="${esc(s)}" alt="Altitude Moto install">`).join('');
  document.querySelectorAll('#masonry img').forEach(i => i.onclick = () => lightbox(i.src));
  const heroes = products.map(p => p.images[0]);
  let h = 0;
  const swap = () => {
    const bg = $('#heroBg');
    bg.classList.remove('on');
    setTimeout(() => { bg.style.backgroundImage = `url("${heroes[h++ % heroes.length]}")`; bg.classList.add('on'); }, 400);
  };
  swap(); setInterval(swap, 6000);
}

document.querySelectorAll('#filters button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#filters button').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); brand = b.dataset.brand; model = ''; renderModels(); renderGrid();
});
$('#search').oninput = e => { query = e.target.value; renderGrid(); };
$('#sort').onchange = e => { sort = e.target.value; renderGrid(); };

api("/api/products").then(p => { products = p; repriceCart(); renderModels(); renderGrid(); renderExtras(); });

// Re-price saved cart lines against live prices so the cart never shows stale totals.
function repriceCart() {
  Cart.set(Cart.get().filter(i => products.some(p => p.slug === i.slug)).map(i => {
    const p = products.find(x => x.slug === i.slug);
    return { ...i, unit: p.price + p.addons.filter(a => i.addons.includes(a.id)).reduce((s, a) => s + a.price, 0) };
  }));
}
