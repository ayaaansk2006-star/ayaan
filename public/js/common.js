const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const $ = s => document.querySelector(s);

const Cart = {
  get: () => JSON.parse(localStorage.getItem('am_cart') || '[]'),
  set(c) { localStorage.setItem('am_cart', JSON.stringify(c)); Cart.render(); },
  add(item) {
    const c = Cart.get();
    const key = item.slug + '|' + item.addons.sort().join(',');
    const ex = c.find(i => i.key === key);
    if (ex) { ex.qty = Math.min(ex.qty + item.qty, 10); ex.unit = item.unit; } else c.push({ ...item, key });
    Cart.set(c);
    toast('Added to cart');
  },
  remove(key) { Cart.set(Cart.get().filter(i => i.key !== key)); },
  clear() { localStorage.removeItem('am_cart'); Cart.render(); },
  render() {
    const c = Cart.get();
    const n = c.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(e => e.textContent = n);
    const box = $('#cart-items');
    if (!box) return;
    box.innerHTML = c.length ? c.map(i => `<div class="line"><img src="${esc(i.image)}" alt="">
      <div><b>${esc(i.title)}</b><br><small class="lime">${esc(i.addonNames || '')}</small>
      <br><small>Qty ${i.qty} · ${inr(i.unit)}</small> <button class="rm" data-key="${esc(i.key)}">remove</button></div>
      <b>${inr(i.unit * i.qty)}</b></div>`).join('') : '<p style="color:var(--muted);padding:20px 0">Your cart is empty.</p>';
    box.querySelectorAll('.rm').forEach(b => b.onclick = () => Cart.remove(b.dataset.key));
    $('#cart-total').textContent = inr(c.reduce((s, i) => s + i.unit * i.qty, 0));
    $('#checkout-btn').style.display = c.length ? '' : 'none';
  }
};

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts,
    body: opts.body && JSON.stringify(opts.body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  const d = $('#drawer');
  document.querySelectorAll('[data-open-cart]').forEach(b => b.onclick = () => d.classList.add('open'));
  document.querySelectorAll('[data-close-cart]').forEach(b => b.onclick = () => d.classList.remove('open'));
  Cart.render();
});
