// Product detail modal + photo lightbox.
const closeModal = () => $('#modal').classList.remove('open');

function openProduct(p) {
  let qty = 1, at = 0;
  $('#modal-box').innerHTML = `<button class="close" id="mclose" aria-label="Close">×</button>
  <div class="gallery"><div class="main" style="position:relative">
    ${p.images.length > 1 ? '<button class="nav-arrow" id="prev" style="left:10px">‹</button><button class="nav-arrow" id="next" style="right:10px">›</button>' : ''}
    <img id="mainimg" src="${esc(p.images[0])}" alt="${esc(p.title)}"></div>
    <div class="thumbs">${p.images.map((s, i) => `<img src="${esc(s)}" data-i="${i}" class="${i ? '' : 'on'}" alt="">`).join('')}</div></div>
  <div class="detail"><span class="tag">${esc(p.bike)}</span><h2>${esc(p.title)}</h2>
    <p style="color:var(--muted)">${esc(p.compat)}</p>
    <div class="display lime" style="font-size:32px" id="mprice">${inr(p.price)}</div>
    ${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}
    ${p.addons.map(a => `<label class="addon"><input type="checkbox" value="${esc(a.id)}"> Add ${esc(a.name)} <b class="lime" style="margin-left:auto">+${inr(a.price)}</b></label>`).join('')}
    <div class="qty"><button id="qm" aria-label="Less">−</button><b id="qv">1</b><button id="qp" aria-label="More">+</button></div>
    <button class="btn" id="addcart">Add to Cart</button>
    <button class="btn ghost" id="buynow">Buy Now</button>
    <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/919833731869?text=${encodeURIComponent('Hi, I am interested in ' + p.title)}">Ask on WhatsApp</a>
    ${p.video ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(p.video)}" title="Install video" allowfullscreen loading="lazy"></iframe></div>` : ''}
    <div id="pReviews"></div>
  </div>`;
  api('/api/reviews?slug=' + encodeURIComponent(p.slug)).then(list => {
    if (!$('#pReviews')) return;
    if (!list.length) { $('#pReviews').innerHTML = '<h4 style="margin-top:6px">Reviews</h4><p style="color:var(--muted);font-size:14px">No reviews yet for this part. Verified buyers can review after delivery.</p>'; return; }
    const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
    $('#pReviews').innerHTML = `<h4 style="margin-top:6px"><span class="lime">${stars(Math.round(avg))}</span> ${avg.toFixed(1)} · ${list.length} verified review${list.length > 1 ? 's' : ''}</h4>` +
      list.slice(0, 5).map(r => `<div class="rev"><div class="lime">${stars(r.rating)}</div><p>${esc(r.text)}</p><small>— ${esc(r.name)}</small></div>`).join('');
  }).catch(() => {});
  const chosen = () => [...document.querySelectorAll('.addon input:checked')].map(i => i.value);
  const unit = () => p.price + p.addons.filter(a => chosen().includes(a.id)).reduce((s, a) => s + a.price, 0);
  const upd = () => { $('#qv').textContent = qty; $('#mprice').textContent = inr(unit() * qty); };
  const show = i => {
    at = (i + p.images.length) % p.images.length;
    $('#mainimg').src = p.images[at];
    document.querySelectorAll('.thumbs img').forEach((t, j) => t.classList.toggle('on', j === at));
  };
  const add = () => Cart.add({ slug: p.slug, title: p.title, image: p.images[0], qty, unit: unit(), addons: chosen(),
    addonNames: p.addons.filter(a => chosen().includes(a.id)).map(a => '+ ' + a.name).join(', ') });
  document.querySelectorAll('.addon input').forEach(i => i.onchange = upd);
  document.querySelectorAll('.thumbs img').forEach(t => t.onclick = () => show(+t.dataset.i));
  if ($('#prev')) { $('#prev').onclick = () => show(at - 1); $('#next').onclick = () => show(at + 1); }
  $('#qm').onclick = () => { qty = Math.max(1, qty - 1); upd(); };
  $('#qp').onclick = () => { qty = Math.min(10, qty + 1); upd(); };
  $('#addcart').onclick = () => { add(); closeModal(); };
  $('#buynow').onclick = () => { add(); location.href = '/checkout'; };
  $('#mclose').onclick = closeModal;
  $('#modal').classList.add('open');
  $('#modal').onkey = e => { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); };
}

function lightbox(src) {
  $('#modal-box').innerHTML = `<button class="close" id="mclose" aria-label="Close">×</button><img src="${esc(src)}" alt="">`;
  $('#modal-box').classList.add('lightbox');
  $('#mclose').onclick = closeModal;
  $('#modal').onkey = null;
  $('#modal').classList.add('open');
}

$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', e => {
  if (!$('#modal').classList.contains('open')) return;
  if (e.key === 'Escape') closeModal();
  else $('#modal').onkey?.(e);
});
new MutationObserver(() => { if (!$('#modal').classList.contains('open')) $('#modal-box').classList.remove('lightbox'); })
  .observe($('#modal'), { attributes: true });
