const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const $ = s => document.querySelector(s);

const Cart = {
  get: () => JSON.parse(localStorage.getItem('am_cart') || '[]'),
  set(c) { localStorage.setItem('am_cart', JSON.stringify(c)); Cart.render(); },
  add(item) {
    const c = Cart.get();
    const key = item.slug + '|' + (item.variant || '') + '|' + item.addons.sort().join(',');
    const ex = c.find(i => i.key === key);
    if (ex) { ex.qty = Math.min(ex.qty + item.qty, 10); ex.unit = item.unit; } else c.push({ ...item, key });
    Cart.set(c);
    toast('Added to cart');
  },
  remove(key) { Cart.set(Cart.get().filter(i => i.key !== key)); },
  setQty(key, n) { Cart.set(Cart.get().map(i => i.key === key ? { ...i, qty: Math.min(Math.max(n, 1), 10) } : i)); },
  clear() { localStorage.removeItem('am_cart'); Cart.render(); },
  render() {
    const c = Cart.get();
    const n = c.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(e => e.textContent = n);
    const box = $('#cart-items');
    if (!box) return;
    const BIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
    box.innerHTML = c.length ? c.map(i => `<div class="cline"><img src="${esc(i.image)}" alt="">
      <div class="cinfo"><b>${esc(i.title)}</b>${i.addonNames ? `<small class="lime">${esc(i.addonNames)}</small>` : ''}
        <small>${inr(i.unit)} each</small>
        <div class="cqty"><button data-dec="${esc(i.key)}" aria-label="Less">−</button><b>${i.qty}</b><button data-inc="${esc(i.key)}" aria-label="More">+</button></div></div>
      <div class="cright"><b>${inr(i.unit * i.qty)}</b><button class="cbin" data-key="${esc(i.key)}" aria-label="Remove ${esc(i.title)}">${BIN}</button></div></div>`).join('')
      : `<div class="cempty"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 3H2"/></svg>
        <b>Your cart is empty</b><small>Find the right mount for your bike.</small><a href="/#shop" class="btn" data-close-cart>Shop by bike →</a></div>`;
    box.querySelectorAll('.cbin').forEach(b => b.onclick = () => Cart.remove(b.dataset.key));
    box.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => Cart.setQty(b.dataset.dec, c.find(i => i.key === b.dataset.dec).qty - 1));
    box.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => Cart.setQty(b.dataset.inc, c.find(i => i.key === b.dataset.inc).qty + 1));
    $('#cart-total').textContent = inr(c.reduce((s, i) => s + i.unit * i.qty, 0));
    if ($('#cart-n')) $('#cart-n').textContent = n ? `(${n} item${n > 1 ? 's' : ''})` : '';
    if ($('#cart-foot')) $('#cart-foot').style.display = c.length ? '' : 'none';
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
  document.addEventListener('click', e => { if (d && e.target.closest('[data-close-cart]')) d.classList.remove('open'); });
  Cart.render();
});

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

// Video value is "ig:<code>" for Instagram reels, otherwise a YouTube id.
const videoUrl = v => v.startsWith('ig:') ? 'https://www.instagram.com/reel/' + v.slice(3) + '/' : 'https://youtu.be/' + v;
const videoEmbed = v => v.startsWith('ig:')
  ? `<div class="video reel"><iframe src="https://www.instagram.com/reel/${encodeURIComponent(v.slice(3))}/embed" title="Instagram reel" loading="lazy" allowfullscreen scrolling="no"></iframe></div>`
  : `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}" title="Install video" loading="lazy" allowfullscreen></iframe></div>`;
