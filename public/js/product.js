// Product detail modal + photo lightbox.
const closeModal = () => $('#modal').classList.remove('open');

function openProduct(p) {
  let qty = 1, at = 0;
  $('#modal-box').innerHTML = `<button class="close" id="mclose" aria-label="Close">×</button>
  <div class="gallery"><div class="main" style="position:relative">
    ${p.images.length > 1 ? '<button class="nav-arrow" id="prev" style="left:10px">‹</button><button class="nav-arrow" id="next" style="right:10px">›</button>' : ''}
    <div class="blur" id="blurimg" style="background-image:url('${esc(p.images[0])}')"></div>
    <img id="mainimg" src="${esc(p.images[0])}" alt="${esc(p.title)}"><span class="count-pill" id="pcount">1 / ${p.images.length}</span></div>
    <div class="thumbs">${p.images.map((s, i) => `<img src="${esc(s)}" data-i="${i}" class="${i ? '' : 'on'}" alt="">`).join('')}</div>
    <div class="specs"><h4>Product details</h4><dl>
      ${p.kind === 'windshield' ? `<dt>Fits</dt><dd>${esc(p.compat)}</dd>` : `<dt>Fits</dt><dd>${esc(p.bike)}</dd>
      <dt>Windshield</dt><dd>${esc(p.compat)}</dd>`}
      <dt>What you get</dt><dd>${p.kind === 'windshield' ? 'Himalayan 450 Touring windshield' : p.title.includes('Kit') ? 'GPS mount + Hero Xpulse 210 windshield (sold together as a kit)' : 'GPS mount'}${p.addons.length ? '<br><small>Optional: ' + p.addons.map(a => esc(a.name) + ' (+' + inr(a.price) + ')').join(', ') + '</small>' : ''}</dd>
      <dt>Hardware</dt><dd>All bushes, nuts and bolts included</dd>
      <dt>Price</dt><dd>${esc(p.mrp_breakdown)}</dd>
      <dt>Fitting</dt><dd>Get it fitted at our garage, or WhatsApp us for help</dd>
      <dt>Help</dt><dd>WhatsApp <a class="lime" href="https://wa.me/919833731869" target="_blank" rel="noopener">+91 98337 31869</a> to confirm fitment before you buy</dd>
    </dl></div></div>
  <div class="detail"><span class="tag">${esc(p.bike)}</span><h2>${esc(p.title)}</h2>
    <div class="display lime" style="font-size:32px" id="mprice">${p.price ? inr(p.price) : 'Price on request'}</div>
    ${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}
    ${p.variants.length ? `<fieldset class="variant"><legend><b style="white-space:nowrap">Emission standard (BS) <span class="lime">*</span></b></legend><small>Tick one. Fitting is different for each, price is the same.</small>
      <div class="ticks">${p.variants.map(v => `<label class="tick"><input type="checkbox" name="bs" value="${esc(v)}"><span class="tbox"></span>${esc(v)}</label>`).join('')}</div></fieldset>` : ''}
    ${p.addons.map(a => `<label class="addon"><input type="checkbox" value="${esc(a.id)}" data-group="${esc(a.group || '')}"> Add ${esc(a.name)} <b class="lime" style="margin-left:auto">+${inr(a.price)}</b></label>`).join('')}
    ${p.price ? `<div class="qty"><button id="qm" aria-label="Less">−</button><b id="qv">1</b><button id="qp" aria-label="More">+</button></div>
    <button class="btn" id="addcart">Add to Cart</button>
    <button class="btn ghost" id="buynow">Buy Now</button>` : `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/919833731869?text=${encodeURIComponent('Hi, what is the price of the ' + p.title + '?')}">Ask price on WhatsApp</a>`}
    ${p.price ? `<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/919833731869?text=${encodeURIComponent('Hi, I am interested in ' + p.title)}">Ask on WhatsApp</a>` : ''}
    ${p.video ? '<h4 style="margin-top:6px">Watch it fitted</h4>' + videoEmbed(p.video) : ''}
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
    $('#mainimg').src = p.images[at]; $('#blurimg').style.backgroundImage = `url('${p.images[at]}')`;
    $('#pcount').textContent = `${at + 1} / ${p.images.length}`;
    document.querySelectorAll('.thumbs img').forEach((t, j) => t.classList.toggle('on', j === at));
  };
  let variant = '';
  // Tick boxes, but only one can be ticked (a bike has one emission standard).
  document.querySelectorAll('input[name=bs]').forEach(c => c.onchange = () => {
    document.querySelectorAll('input[name=bs]').forEach(x => { if (x !== c) x.checked = false; });
    variant = c.checked ? c.value : '';
  });
  const add = () => {
    if (p.variants.length && !variant) { toast(`Tick your bike's emission standard: ${p.variants.join(' / ')}`); return false; }
    Cart.add({ slug: p.slug, title: p.title + (variant ? ` (${variant})` : ''), variant, image: p.images[0], qty, unit: unit(), addons: chosen(),
      addonNames: p.addons.filter(a => chosen().includes(a.id)).map(a => '+ ' + a.name).join(', ') });
    return true;
  };
  // Add-ons in the same group (e.g. windshields) behave like a single choice that can be cleared.
  document.querySelectorAll('.addon input').forEach(i => i.onchange = () => {
    if (i.checked && i.dataset.group) document.querySelectorAll(`.addon input[data-group="${i.dataset.group}"]`).forEach(x => { if (x !== i) x.checked = false; });
    upd();
  });
  document.querySelectorAll('.thumbs img').forEach(t => t.onclick = () => show(+t.dataset.i));
  if ($('#prev')) { $('#prev').onclick = () => show(at - 1); $('#next').onclick = () => show(at + 1); }
  if (!p.price) {
    $('#mclose').onclick = closeModal; $('#modal').classList.add('open');
    $('#modal').onkey = e => { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); };
    return;
  }
  $('#qm').onclick = () => { qty = Math.max(1, qty - 1); upd(); };
  $('#qp').onclick = () => { qty = Math.min(10, qty + 1); upd(); };
  $('#addcart').onclick = () => { if (add()) closeModal(); };
  $('#buynow').onclick = () => { if (add()) location.href = '/checkout'; };
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
