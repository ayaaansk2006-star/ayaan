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

async function boot() {
  try {
    const [u, orders] = await Promise.all([api('/api/account/me'), api('/api/account/orders')]);
    $('#guest').style.display = 'none'; $('#me').style.display = '';
    $('#hello').textContent = `Signed in as ${u.email}`;
    FIELDS.forEach(k => $('#addr')[k].value = u[k] || '');
    $('#orders').innerHTML = orders.length ? orders.map(o => `<div class="ord"><div>
        <b class="lime">${esc(o.id)}</b><br><small>${new Date(o.created_at).toLocaleDateString('en-IN')} · ${o.items.map(i => esc(i.title)).join(', ')}</small>
        <br><small>Status: <b>${esc(o.status)}</b></small></div>
      <div style="text-align:right"><b>${inr(o.total)}</b><br>
        <a class="lime" href="/track?id=${encodeURIComponent(o.id)}&email=${encodeURIComponent(u.email)}">Track</a>
        ${o.status === 'Delivered' ? ` · <a class="lime" href="/review?id=${encodeURIComponent(o.id)}&email=${encodeURIComponent(u.email)}">Review</a>` : ''}</div></div>`).join('')
      : '<p style="color:var(--muted)">No orders yet. <a class="lime" href="/#shop">Start shopping</a></p>';
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
