// Cart feel: slides open on add with the new line highlighted, undo on remove, courier estimate by pincode, Esc to close.
const cartDrawer = $('#drawer');
const openCart = () => cartDrawer.classList.add('open');
// The page behind stays still while the cart is open, however it was opened or closed.
new MutationObserver(() => document.body.classList.toggle('cart-open', cartDrawer.classList.contains('open'))).observe(cartDrawer, { attributes: true });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cartDrawer.classList.remove('open'); });

const _cartAdd = Cart.add;
Cart.add = item => {
  const keep = toast; toast = () => {};
  _cartAdd(item); toast = keep;
  openCart();
  const key = item.slug + '|' + (item.variant || '') + '|' + [...item.addons].sort().join(',');
  const line = $(`.cbin[data-key="${CSS.escape(key)}"]`)?.closest('.cline');
  line?.classList.add('new'); line?.scrollIntoView({ block: 'nearest' });
  document.querySelectorAll('.cart-btn').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
};

Cart.remove = key => {
  const c = Cart.get(), i = c.findIndex(x => x.key === key), gone = c[i];
  Cart.set(c.filter(x => x.key !== key));
  document.querySelector('.undo')?.remove();
  const u = document.createElement('div');
  u.className = 'toast undo'; u.innerHTML = `Item removed <button>Undo</button>`;
  u.querySelector('button').onclick = () => { const n = Cart.get(); n.splice(i, 0, gone); Cart.set(n); u.remove(); };
  document.body.appendChild(u); setTimeout(() => u.remove(), 5000);
};

// Courier estimate: same server pricing as checkout; the pincode is remembered for checkout.
let cartEst = null;
async function estimate() {
  const pin = $('#cpin').value.trim(), items = Cart.get().map(i => ({ slug: i.slug, qty: i.qty, addons: i.addons, variant: i.variant }));
  cartEst = null;
  if (/^\d{6}$/.test(pin) && items.length) {
    localStorage.setItem('am_pin', pin);
    const q = await api('/api/quote', { method: 'POST', body: { items, pincode: pin } }).catch(() => null);
    if (q?.zone) cartEst = q;
  }
  $('#cship').innerHTML = cartEst ? `${inr(cartEst.shipping)} <small>· ${esc(cartEst.zone)}</small>` : pin.length === 6 ? '<small class="err">Check pincode</small>' : '<small>Enter pincode</small>';
  $('#cgrand').textContent = cartEst ? inr(cartEst.total) : '—';
}
$('#cpin').value = localStorage.getItem('am_pin') || '';
$('#cpin').oninput = () => { if ($('#cpin').value.length === 6 || cartEst) estimate(); };
const _cartRender = Cart.render;
Cart.render = () => { _cartRender(); if ($('#cpin')) estimate(); };
