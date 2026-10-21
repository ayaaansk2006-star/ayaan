let statuses = [], orders = [], products = [], reviews = [], reels = [], tab = 'orders';

async function boot() {
  try {
    ({ statuses } = await api('/api/admin/me'));
    $('#login').style.display = 'none'; $('#app').style.display = $('#logout').style.display = '';
    await load();
  } catch { $('#login').style.display = 'grid'; }
}

async function load() {
  [orders, products, reviews, reels] = await Promise.all(['orders', 'products', 'reviews', 'reels'].map(x => api('/api/admin/' + x)));
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
      <td><b>${inr(o.total)}</b>${o.shipping ? `<br><small>incl. courier ${inr(o.shipping)}</small>` : ''}<br><a class="lime" target="_blank" rel="noopener" href="https://wa.me/91${esc(o.phone.replace(/\D/g,'').slice(-10))}?text=${encodeURIComponent(`Hi ${o.name}, your Altitude Moto order ${o.id} is now: ${o.status}. Track: ${location.origin}/track?id=${o.id}&email=${o.email}`)}">WhatsApp customer</a><br><small>${esc(o.method || "UPI QR")}: ${esc(o.utr || "not paid")}</small></td>
      <td><select data-id="${esc(o.id)}" class="st-${o.status.split(' ')[0]}">${statuses.map(s =>
        `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table>`
      : '<p>No orders yet.</p>';
    document.querySelectorAll('select[data-id]').forEach(s => s.onchange = async () => {
      if (!confirm(`Set ${s.dataset.id} to "${s.value}"? The customer will be emailed.`)) return render();
      await api('/api/admin/orders/' + s.dataset.id, { method: 'PATCH', body: { status: s.value } });
      toast('Updated & customer emailed'); load();
    });
  } else if (tab === 'videos') {
    $('#view').innerHTML = `<form class="form" id="reelForm" style="margin-bottom:18px"><b>Add an Instagram reel to the homepage</b>
      <div class="two"><input name="url" required placeholder="https://www.instagram.com/reel/..."><input name="caption" maxlength="120" placeholder="Caption (optional), e.g. Speed 400 GPS mount fitted"></div>
      <button class="btn">Add reel</button><div class="err" id="rerr"></div></form>
      ${reels.length ? `<table><tr><th>Reel</th><th>Caption</th><th></th></tr>${reels.map(r => `<tr><td><a class="lime" target="_blank" rel="noopener" href="https://www.instagram.com/reel/${esc(r.code)}/">instagram.com/reel/${esc(r.code)}</a></td>
        <td>${esc(r.caption || '')}</td><td><button class="btn ghost" style="padding:8px 12px" data-rdel="${r.id}">Remove</button></td></tr>`).join('')}</table>` : '<p>No reels yet. Open a reel on Instagram, tap Share, then Copy link, and paste it above.</p>'}`;
    $('#reelForm').onsubmit = async e => { e.preventDefault();
      try { await api('/api/admin/reels', { method: 'POST', body: { url: e.target.url.value, caption: e.target.caption.value } }); toast('Reel added'); load(); }
      catch (err) { $('#rerr').textContent = err.message; } };
    document.querySelectorAll('[data-rdel]').forEach(b => b.onclick = async () => { if (confirm('Remove this reel from the website?')) { await api('/api/admin/reels/' + b.dataset.rdel, { method: 'DELETE' }); load(); } });
  } else if (tab === 'reviews') {
    $('#view').innerHTML = reviews.length ? `<table><tr><th>Product</th><th>Review</th><th>Status</th><th></th></tr>${reviews.map(r => `<tr>
      <td>${esc((products.find(p => p.slug === r.slug) || {}).title || r.slug)}<br><small>${esc(r.order_id)}</small></td>
      <td><span class="lime">${'★'.repeat(r.rating)}</span><br>${esc(r.text)}<br><small>— ${esc(r.name)}</small>${(r.media || []).length ? '<br>' + r.media.map(m => `<a href="${esc(m.url)}" target="_blank" rel="noopener" class="lime">${m.type === 'video' ? 'Video' : `<img src="${esc(m.url)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;vertical-align:middle">`}</a>`).join(' ') : ''}</td>
      <td>${r.approved ? '<b class="lime">Live</b>' : 'Waiting'}</td>
      <td><button class="btn" style="padding:8px 12px" data-rv="${r.id}" data-ap="${r.approved ? 0 : 1}">${r.approved ? 'Hide' : 'Approve'}</button>
        <button class="btn ghost" style="padding:8px 12px" data-del="${r.id}">Delete</button></td></tr>`).join('')}</table>` : '<p>No reviews yet. Customers can review from the Track Order page once you mark their order Delivered.</p>';
    document.querySelectorAll('[data-rv]').forEach(b => b.onclick = async () => { await api('/api/admin/reviews/' + b.dataset.rv, { method: 'PATCH', body: { approved: b.dataset.ap === '1' } }); load(); });
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Delete this review?')) { await api('/api/admin/reviews/' + b.dataset.del, { method: 'DELETE' }); load(); } });
  } else {
    const list = products.filter(p => !q || (p.title + p.bike).toLowerCase().includes(q));
    $('#view').innerHTML = `<table><tr><th></th><th>Product</th><th>Price (₹)</th><th>Video (Instagram reel or YouTube link)</th><th>Visible</th><th></th></tr>
    ${list.map(p => `<tr><td><img src="${esc(p.images[0])}" style="width:56px;height:56px;object-fit:cover;border-radius:8px"></td>
      <td><b>${esc(p.title)}</b><br><small>${esc(p.compat)}</small></td>
      <td><input class="pin" type="number" min="1" value="${p.price}" data-slug="${esc(p.slug)}"></td>
      <td><input class="pin" style="width:220px" placeholder="https://www.instagram.com/reel/..." value="${p.video ? esc(videoUrl(p.video)) : ''}" data-vid="${esc(p.slug)}"></td>
      <td><input type="checkbox" ${p.active ? 'checked' : ''} data-act="${esc(p.slug)}"></td>
      <td><button class="btn" style="padding:8px 14px" data-save="${esc(p.slug)}">Save</button></td></tr>`).join('')}</table>`;
    document.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
      const slug = b.dataset.save;
      try {
        await api('/api/admin/products/' + slug, { method: 'PATCH', body: {
          price: document.querySelector(`[data-slug="${slug}"]`).value,
          active: document.querySelector(`[data-act="${slug}"]`).checked,
          video: document.querySelector(`[data-vid="${slug}"]`).value } });
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
