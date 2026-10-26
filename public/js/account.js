const FIELDS = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
let mode = 'login';

function setMode(m) {
  mode = m;
  $('#tIn').classList.toggle('on', m === 'login'); $('#tUp').classList.toggle('on', m === 'signup');
  $('#nameRow').style.display = m === 'signup' ? '' : 'none';
  $('#auth').name.required = m === 'signup';
  $('#auth').password.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
  $('#authBtn').textContent = m === 'signup' ? 'Create account' : 'Sign in';
  $('#aerr').textContent = '';
}
$('#tIn').onclick = () => setMode('login');
$('#tUp').onclick = () => setMode('signup');

$('#auth').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, body = { email: f.email.value, password: f.password.value, name: f.name.value };
  try { await api('/api/account/' + mode, { method: 'POST', body }); boot(); }
  catch (err) { $('#aerr').textContent = err.message; }
};

// Full details of the signed-in customer's own order (the server only returns their orders).
const date = d => new Date(d.replace(' ', 'T') + (d.includes('Z') ? '' : 'Z')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
// Amazon-style step bar: Ordered → Paid → Shipped → Delivered.
const STEPS = [['Ordered', []], ['Paid', ['Payment Confirmed', 'Shipped', 'Delivered']], ['Shipped', ['Shipped', 'Delivered']], ['Delivered', ['Delivered']]];
const bar = o => o.status === 'Cancelled' ? '<p class="pcancel">Cancelled</p>'
  : `<div class="pbar">${STEPS.map(([n, ok], i) => `<span class="${!i || ok.includes(o.status) ? 'on' : ''}">${n}</span>`).join('')}</div>`;
const PAID = ['Payment Confirmed', 'Shipped', 'Delivered'];
function buyAgain(o) {
  o.items.forEach(i => Cart.add({ slug: i.slug, title: i.title, variant: i.variant || '', image: i.image, qty: i.qty, unit: i.unit,
    addons: (i.addons || []).map(a => a.id), addonNames: (i.addons || []).map(a => '+ ' + a.name).join(', ') }));
  location.href = '/checkout';
}

function orderCard(o, email) {
  const q = `id=${encodeURIComponent(o.id)}&email=${encodeURIComponent(email)}`;
  const items = o.items.map(i => `<li>${esc(i.title)} × ${i.qty}${(i.addons || []).map(a => `<br><small>+ ${esc(a.name || a)}</small>`).join('')}</li>`).join('');
  return `<details class="ord"><summary><div><b class="lime">${esc(o.id)}</b><br><small>${date(o.created_at)} · Status: <b>${esc(o.status)}</b></small></div>
    <b>${inr(o.total)}</b>${bar(o)}<div class="ord-acts">
      ${PAID.includes(o.status) ? `<a class="btn ghost" target="_blank" href="/invoice?${q}">Invoice</a>` : ''}
      <button class="btn ghost" data-again="${esc(o.id)}">Buy it again</button>
      <a class="btn ghost" href="/track?${q}">Track · cancel · return</a></div><small class="more">Order details ▾</small></summary><div class="ord-body">
    <ul>${items}</ul>
    <p><small>Courier charge ${inr(o.shipping || 0)} · Paid by ${esc(o.method || '')}</small></p>
    <p><small>Ship to: ${esc(o.name)}, ${esc(o.phone)}<br>${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}</small></p>
    ${o.awb ? `<p><small>Courier: <b>${esc(o.courier || '')}</b> · AWB <b>${esc(o.awb)}</b></small></p>` : ''}
    <ol class="tl">${o.history.map(h => `<li><b>${esc(h.status)}</b> <small>${date(h.at)}</small></li>`).join('')}</ol>
    ${o.status === 'Delivered' ? `<a class="lime" href="/review?${q}">Write a review</a>` : ''}
  </div></details>`;
}

async function boot() {
  try {
    const [u, orders] = await Promise.all([api('/api/account/me'), api('/api/account/orders')]);
    $('#guest').style.display = 'none'; $('#me').style.display = '';
    $('#hello').textContent = `Signed in as ${u.email}`;
    FIELDS.forEach(k => $('#addr')[k].value = u[k] || '');
    $('#orders').innerHTML = orders.length ? orders.map(o => orderCard(o, u.email)).join('')
      : '<p style="color:var(--muted)">No orders yet. <a class="lime" href="/#shop">Start shopping</a></p>';
    document.querySelectorAll('[data-again]').forEach(b => b.onclick = () => buyAgain(orders.find(o => o.id === b.dataset.again)));
  } catch { $('#guest').style.display = ''; $('#me').style.display = 'none'; }
}

$('#addr').onsubmit = async e => {
  e.preventDefault();
  await api('/api/account/me', { method: 'PATCH', body: Object.fromEntries(FIELDS.map(k => [k, e.target[k].value])) });
  toast('Address saved');
};
$('#logout').onclick = async () => { await api('/api/account/logout', { method: 'POST' }); boot(); };

if (new URLSearchParams(location.search).get('signup')) setMode('signup');
boot();
