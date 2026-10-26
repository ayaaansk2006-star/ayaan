const FLOW = [
  ['Order placed', 'We received your order'],
  ['Payment Confirmed', 'Payment received, we are packing your part'],
  ['Shipped', 'Handed to the courier'],
  ['Delivered', 'Enjoy the ride!']
];
const TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>';
// History times come from SQLite as UTC "YYYY-MM-DD HH:MM:SS".
const when = t => t ? new Date(t.includes('T') ? t : t.replace(' ', 'T') + 'Z') : null;
const fmt = d => d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

// Dispatch 2–3 working days after payment, delivery 5–7 days after dispatch (see Shipping Policy).
function eta(o, at) {
  if (o.status === 'Shipped' && at.Shipped) return [addDays(at.Shipped, 5), addDays(at.Shipped, 7)];
  if (o.status === 'Payment Confirmed' && at['Payment Confirmed']) return [addDays(at['Payment Confirmed'], 7), addDays(at['Payment Confirmed'], 10)];
  return null;
}

function render(o, email) {
  const at = { 'Order placed': when(o.created_at) };
  o.history.forEach(h => { at[h.status] = when(h.at); });
  const reached = { 'Order placed': true, 'Payment Confirmed': ['Payment Confirmed', 'Shipped', 'Delivered'].includes(o.status),
    Shipped: ['Shipped', 'Delivered'].includes(o.status), Delivered: o.status === 'Delivered' };
  const nowIdx = FLOW.map(f => f[0]).filter(s => reached[s]).length - 1;
  const e = eta(o, at);
  const pending = ['Awaiting Payment', 'Payment Verification Pending'].includes(o.status);
  $('#result').style.display = 'block';
  $('#result').innerHTML = `<div class="row"><h3>Order <span class="lime">${esc(o.id)}</span></h3><small>${fmt(new Date(o.created_at))}</small></div>
    ${o.status === 'Cancelled' ? '<p class="err" style="margin-top:12px">This order was cancelled. Contact us on WhatsApp if this is a mistake.</p>' : `
    ${pending ? `<p style="margin-top:10px">Status: <b class="lime">${esc(o.status)}</b></p>` : ''}
    <ol class="tl">${FLOW.map(([s, sub], i) => `<li class="${reached[s] ? 'done' : ''} ${i === nowIdx ? 'now' : ''}">
      <span class="dot">${reached[s] ? TICK : ''}</span><b>${s}</b>
      <small>${reached[s] && at[s] ? fmt(at[s]) + ' · ' : ''}${sub}</small></li>`).join('')}</ol>
    ${e ? `<div class="eta"><b class="lime display" style="font-size:22px">${day(e[0])} – ${day(e[1])}</b><span>Expected delivery</span></div>` : ''}
    ${o.awb ? `<div class="ship"><b>${esc(o.courier || 'Courier')}</b> · Tracking no. <b class="lime">${esc(o.awb)}</b><br>
      <a class="btn ghost" style="margin-top:10px" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(`${o.courier || ''} tracking ${o.awb}`)}">Track with courier →</a></div>` : ''}`}
    <div style="margin-top:18px">${o.items.map(l => `<div class="line"><img src="${esc(l.image)}" alt=""><div><b>${esc(l.title)}</b>
      ${l.addons.map(a => `<br><small class="lime">+ ${esc(a.name)}</small>`).join('')}<br><small>Qty ${l.qty}</small></div>
      <b>${inr(l.lineTotal)}</b></div>`).join('')}</div>
    ${o.shipping ? `<div class="row" style="margin-top:12px"><span>Courier</span><b>${inr(o.shipping)}</b></div>` : ''}
    <div class="row" style="margin-top:12px"><b>Total paid</b><b class="lime display">${inr(o.total)}</b></div>
    <a class="btn ghost" style="margin-top:16px;width:100%" target="_blank" rel="noopener"
      href="https://wa.me/919833731869?text=${encodeURIComponent(`Hi Altitude Moto, my order ${o.id} (${inr(o.total)}). Status: ${o.status}`)}">Message us on WhatsApp about this order</a>
    ${o.status === 'Delivered' ? `<a class="btn" style="margin-top:12px;width:100%" href="/review?id=${encodeURIComponent(o.id)}&email=${encodeURIComponent(email)}">Write a review with photos / videos</a>` : ''}
    <div id="after" class="after"></div>`;
  afterSales(o, email);
}

async function track(id, email) {
  $('#err').textContent = '';
  try { render(await api(`/api/orders/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`), email); }
  catch (e) { $('#err').textContent = e.message; $('#result').style.display = 'none'; }
}

const qs = new URLSearchParams(location.search);
if (qs.get('new')) $('#success').style.display = 'block';
if (qs.get('id')) { $('#form').oid.value = qs.get('id'); $('#form').email.value = qs.get('email'); track(qs.get('id'), qs.get('email')); }
$('#form').onsubmit = e => { e.preventDefault(); track(e.target.oid.value.trim(), e.target.email.value.trim()); };
