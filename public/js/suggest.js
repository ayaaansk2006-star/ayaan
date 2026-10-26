// "Frequently bought together" in the cart: an RE 450-type mount without a windshield suggests the standalone windshields.
const _renderCart = Cart.render;
Cart.render = () => {
  _renderCart();
  const box = $('#cart-items'), c = Cart.get();
  if (!box || !c.length || !products.length) return;
  const inCart = new Set(c.map(i => i.slug));
  const bare = c.some(i => {
    const p = products.find(x => x.slug === i.slug);
    return p && p.addons.some(a => a.id === 'ws450') && !i.addons.some(id => p.addons.find(a => a.id === id && a.group === 'ws'));
  });
  const shields = products.filter(p => p.kind === 'windshield' && p.price);
  const picks = bare && !shields.some(p => inCart.has(p.slug)) ? shields : [];
  if (!picks.length) return;
  box.insertAdjacentHTML('beforeend', `<div class="fbt"><b>Frequently bought together</b>${picks.map(p => `<div class="fbt-row">
    <img src="${esc(p.images[0])}" alt=""><span>${esc(p.title)}<br><b class="lime">${inr(p.price)}</b></span>
    <button class="btn ghost" data-fbt="${esc(p.slug)}">+ Add</button></div>`).join('')}</div>`);
  box.querySelectorAll('[data-fbt]').forEach(b => b.onclick = () => {
    const p = products.find(x => x.slug === b.dataset.fbt);
    Cart.add({ slug: p.slug, title: p.title, variant: '', image: p.images[0], qty: 1, unit: p.price, addons: [], addonNames: '' });
  });
};
