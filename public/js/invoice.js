// Printable invoice for a paid order ("Download PDF" uses the browser's Save as PDF).
const qs = new URLSearchParams(location.search);
const d = t => new Date(t.includes('T') ? t : t.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
api(`/api/orders/${encodeURIComponent(qs.get('id') || '')}/invoice?email=${encodeURIComponent(qs.get('email') || '')}`).then(o => {
  const sub = o.items.reduce((s, i) => s + i.lineTotal, 0);
  $('#inv').style.display = '';
  $('#inv').innerHTML = `<div class="top"><div style="display:flex;gap:12px;align-items:center"><img src="/logo.png?v=2" alt=""><div><h1>ALTITUDE MOTO</h1>
      <div class="muted">RM Bhoir Wadi, Gate 2, Western Express Highway Service Road, near Gokul Anand Hotel, Dahisar East, Mumbai, Maharashtra 400068<br>
      +91 98337 31869 · altitudemotoindia@gmail.com</div></div></div>
      <div class="r"><h1 style="font-size:22px">INVOICE</h1><div class="muted">No. <b>${esc(o.id)}</b><br>Order date: ${d(o.created_at)}<br>Paid on: ${d(o.paid_at)}</div></div></div>
    <div class="two"><div><b>Billed / shipped to</b><div class="muted">${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}<br>Phone: ${esc(o.phone)}</div></div>
      <div><b>Payment</b><div class="muted">${esc(o.method || '')}<br>${o.utr ? 'Ref: ' + esc(o.utr) : ''}<br>Status: Paid</div></div></div>
    <table><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
      ${o.items.map(i => `<tr><td>${esc(i.title)}${i.addons.map(a => `<br><small>+ ${esc(a.name)} (${inr(a.price)})</small>`).join('')}</td>
        <td class="r">${i.qty}</td><td class="r">${inr(i.unit)}</td><td class="r">${inr(i.lineTotal)}</td></tr>`).join('')}
      <tr><td colspan="3" class="r">Subtotal</td><td class="r">${inr(sub)}</td></tr>
      <tr><td colspan="3" class="r">Courier charge</td><td class="r">${inr(o.shipping || 0)}</td></tr>
      <tr class="tot"><td colspan="3" class="r">Total paid</td><td class="r">${inr(o.total)}</td></tr></table>
    <p class="muted" style="margin-top:24px">All bushes, nuts and bolts included. Seller not registered under GST.<br>
      Returns and cancellations as per our Refund &amp; Cancellation Policy at altitudemoto.vercel.app/refund-policy. Thank you for riding with us!</p>`;
}).catch(e => { $('#err').textContent = e.message; });
