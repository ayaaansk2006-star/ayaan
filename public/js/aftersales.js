// Track page: invoice download + cancel / return / replacement requests (rules enforced by the server).
const LABEL = { cancel: 'Cancel order', return: 'Return item', replace: 'Damaged / wrong item — get a replacement' };
const NOTE = {
  cancel: 'Free cancellation before shipping. If you already paid, the full amount is refunded to your original payment method in 5–7 working days.',
  return: 'Returns within 7 days of delivery if the part is unused, not fitted and in its original packing. You pay the return courier charge.',
  replace: 'Within 48 hours of delivery. Please WhatsApp us your unboxing video after sending this request.'
};

async function afterSales(o, email) {
  const box = $('#after'), q = `?email=${encodeURIComponent(email)}`;
  const a = await api(`/api/orders/${encodeURIComponent(o.id)}/aftersales${q}`).catch(() => null);
  if (!a || !box) return;
  const r = a.request;
  box.innerHTML = `${a.invoice ? `<a class="btn ghost" style="width:100%" target="_blank" href="/invoice?id=${encodeURIComponent(o.id)}&email=${encodeURIComponent(email)}">Download invoice</a>` : ''}
    ${r ? `<div class="req ${r.status.toLowerCase()}"><b>${esc(LABEL[r.type])}: ${esc(r.status)}</b><small>${esc(r.reason)}${r.reply ? ' · Our reply: ' + esc(r.reply) : ''}</small></div>` : ''}
    ${a.allowed.map(t => `<button class="btn ghost asb" data-t="${t}">${LABEL[t]}</button>`).join('')}
    <form class="form req-form" id="reqForm" style="display:none"><p class="rnote" id="rnote"></p>
      <label>Reason<select name="reason" required></select></label>
      <label>Anything else? (optional)<textarea name="details" rows="2" maxlength="500"></textarea></label>
      <button class="btn">Send request</button><div class="err" id="rerr"></div></form>`;
  let type = '';
  box.querySelectorAll('.asb').forEach(b => b.onclick = () => {
    type = b.dataset.t; const f = $('#reqForm');
    f.style.display = ''; $('#rnote').textContent = NOTE[type];
    f.reason.innerHTML = '<option value="">Choose a reason</option>' + a.reasons[type].map(x => `<option>${esc(x)}</option>`).join('');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#reqForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target; f.querySelector('button').disabled = true;
    try {
      await api(`/api/orders/${encodeURIComponent(o.id)}/request`, { method: 'POST', body: { email, type, reason: f.reason.value, details: f.details.value } });
      toast('Request sent. We will reply by email.'); afterSales(o, email);
    } catch (err) { $('#rerr').textContent = err.message; f.querySelector('button').disabled = false; }
  };
}
