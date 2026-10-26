// Admin tab: customer cancel / return / replacement requests. Refunds are done by you in the Razorpay dashboard.
async function renderRequests() {
  const list = await api('/api/admin/requests');
  $('#view').innerHTML = `<p style="color:var(--muted);margin-bottom:12px">Approving a <b>cancel</b> marks the order Cancelled and emails the customer.
    If they had paid, refund them from the Razorpay dashboard (Payments → the payment → Refund). For returns/replacements, approve, then arrange pickup or a new part.</p>
    ${list.length ? `<table><tr><th>Order</th><th>Customer</th><th>Request</th><th>Status</th><th></th></tr>${list.map(r => `<tr>
      <td><b>${esc(r.order_id)}</b><br><small>${inr(r.total)} · ${esc(r.order_status)}<br>${esc(r.method || '')}</small></td>
      <td>${esc(r.name)}<br><a href="tel:${esc(r.phone)}">${esc(r.phone)}</a><br><small>${esc(r.email)}</small></td>
      <td><b class="lime">${esc(r.type.toUpperCase())}</b><br>${esc(r.reason)}${r.details ? `<br><small>${esc(r.details)}</small>` : ''}<br><small>${new Date(r.created_at).toLocaleString('en-IN')}</small></td>
      <td><b>${esc(r.status)}</b>${r.reply ? `<br><small>${esc(r.reply)}</small>` : ''}</td>
      <td>${r.status === 'Pending' ? `<input placeholder="Reply to customer (optional)" data-reply="${r.id}" style="margin-bottom:6px;width:100%;background:#0c0c0c;border:1px solid #333;color:#fff;padding:8px;border-radius:8px;font:inherit">
        <button class="btn" style="padding:8px 12px" data-rq="${r.id}" data-s="Approved">Approve</button>
        <button class="btn ghost" style="padding:8px 12px" data-rq="${r.id}" data-s="Rejected">Reject</button>` : ''}</td></tr>`).join('')}</table>`
      : '<p>No requests yet. Customers can ask to cancel (before shipping) or return/replace (after delivery) from their tracking page.</p>'}`;
  document.querySelectorAll('[data-rq]').forEach(b => b.onclick = async () => {
    if (!confirm(`${b.dataset.s === 'Approved' ? 'Approve' : 'Reject'} this request? The customer will be emailed.`)) return;
    try {
      await api('/api/admin/requests/' + b.dataset.rq, { method: 'PATCH', body: { status: b.dataset.s, reply: $(`[data-reply="${b.dataset.rq}"]`).value } });
      toast('Done'); renderRequests();
    } catch (e) { toast(e.message); }
  });
}
