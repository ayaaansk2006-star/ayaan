let statuses = [], orders = [], products = [], tab = 'orders';

async function boot() {
  try {
    ({ statuses } = await api('/api/admin/me'));
    $('#login').style.display = 'none'; $('#app').style.display = $('#logout').style.display = '';
    await load();
  } catch { $('#login').style.display = 'grid'; }
}

async function load() {
  [orders, products] = await Promise.all([api('/api/admin/orders'), api('/api/admin/products')]);
  const paid = orders.filter(o => !['Awaiting Payment', 'Payment Verification Pending', 'Cancelled'].includes(o.status));
  $('#kpis').innerHTML = [
    ['Total orders', orders.length],
    ['Awaiting verification', orders.filter(o => o.status === 'Payment Verification Pending').length],
    ['To ship', orders.filter(o => o.status === 'Payment Confirmed').length],
    ['Confirmed revenue', inr(paid.reduce((s, o) => s + o.total, 0))]
  ].map(([k, v]) => `<div class="panel">${k}<b>${v}</b></div>`).join('');
  render();
}

function render() {
  const q = $('#q').value.toLowerCase();
  if (tab === 'orders') {
    const list = orders.filter(o => !q || [o.id, o.name, o.phone, o.email, o.utr].join(' ').toLowerCase().includes(q));
    $('#view').innerHTML = list.length ? `<table><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total / UTR</th><th>Status</th></tr>
    ${list.map(o => `<tr><td><b class="lime">${esc(o.id)}</b><br><small>${new Date(o.created_at).toLocaleString('en-IN')}</small></td>
      <td><b>${esc(o.name)}</b><br><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a><br><small>${esc(o.email)}</small>
        <br><small>${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} - ${esc(o.pincode)}</small>${o.notes ? `<br><small class="lime">${esc(o.notes)}</small>` : ''}</td>
      <td>${o.items.map(i => `${esc(i.title)} × ${i.qty}${i.addons.map(a => `<br><small>+ ${esc(a.name)}</small>`).join('')}`).join('<br>')}</td>
      <td><b>${inr(o.total)}</b><br><small>${esc(o.method || "UPI QR")}: ${esc(o.utr || "not paid")}</small></td>
      <td><select data-id="${esc(o.id)}" class="st-${o.status.split(' ')[0]}">${statuses.map(s =>
        `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table>`
      : '<p>No orders yet.</p>';
    document.querySelectorAll('select[data-id]').forEach(s => s.onchange = async () => {
      if (!confirm(`Set ${s.dataset.id} to "${s.value}"? The customer will be emailed.`)) return render();
      await api('/api/admin/orders/' + s.dataset.id, { method: 'PATCH', body: { status: s.value } });
      toast('Updated & customer emailed'); load();
    });
  } else {
    const list = products.filter(p => !q || (p.title + p.bike).toLowerCase().includes(q));
    $('#view').innerHTML = `<table><tr><th></th><th>Product</th><th>Price (₹)</th><th>Visible</th><th></th></tr>
    ${list.map(p => `<tr><td><img src="${esc(p.images[0])}" style="width:56px;height:56px;object-fit:cover;border-radius:8px"></td>
      <td><b>${esc(p.title)}</b><br><small>${esc(p.compat)}</small></td>
      <td><input class="pin" type="number" min="1" value="${p.price}" data-slug="${esc(p.slug)}"></td>
      <td><input type="checkbox" ${p.active ? 'checked' : ''} data-act="${esc(p.slug)}"></td>
      <td><button class="btn" style="padding:8px 14px" data-save="${esc(p.slug)}">Save</button></td></tr>`).join('')}</table>`;
    document.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
      const slug = b.dataset.save;
      try {
        await api('/api/admin/products/' + slug, { method: 'PATCH', body: {
          price: document.querySelector(`[data-slug="${slug}"]`).value,
          active: document.querySelector(`[data-act="${slug}"]`).checked } });
        toast('Saved'); load();
      } catch (e) { alert(e.message); }
    });
  }
}

document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); tab = b.dataset.tab; render();
});
$('#q').oninput = render;
$('#login').onsubmit = async e => {
  e.preventDefault();
  try { await api('/api/admin/login', { method: 'POST', body: { password: e.target.password.value } }); boot(); }
  catch (err) { $('#lerr').textContent = err.message; }
};
$('#logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); location.reload(); };
setInterval(() => $('#app').style.display !== 'none' && load(), 60000);
boot();
