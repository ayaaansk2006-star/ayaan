const items = Cart.get().map(i => ({ slug: i.slug, qty: i.qty, addons: i.addons }));
if (!items.length) location.href = '/';
const form = $('#form');
let shipped = false, signedIn = false;

// The server prices everything; the courier charge (and the QR amount) changes with the pincode.
async function quote() {
  const pin = form.pincode.value.trim();
  try {
    const q = await api('/api/quote', { method: 'POST', body: { items, pincode: pin } });
    $('#summary').innerHTML = q.lines.map(l => `<div class="line"><img src="${esc(l.image)}" alt="">
      <div><b>${esc(l.title)}</b>${l.addons.map(a => `<br><small class="lime">+ ${esc(a.name)}</small>`).join('')}
      <br><small>Qty ${l.qty} × ${inr(l.unit)}</small></div><b>${inr(l.lineTotal)}</b></div>`).join('');
    shipped = q.shipping != null;
    $('#ship').textContent = shipped ? inr(q.shipping) : 'Enter pincode';
    $('#shipinfo').value = shipped ? `${inr(q.shipping)} · ${q.zone}` : (pin.length === 6 ? 'Invalid pincode' : '');
    $('#total').textContent = $('#amt').textContent = inr(q.total);
    $('#qr').src = q.qr; $('#upiid').textContent = q.upiId; $('#upilink').href = q.upiLink;
    if (!q.razorpay) { $('#opt-rzp').style.display = 'none'; $('[name=pm][value=qr]').checked = true; showPm(); }
  } catch (e) { $('#err').textContent = e.message; }
}
form.pincode.oninput = () => { const n = form.pincode.value.trim().length; if (n === 6 || shipped) quote(); };
quote();

// Signed-in customers get their saved details filled in.
api('/api/account/me').then(u => {
  signedIn = true;
  $('#acct').innerHTML = `Signed in as <b>${esc(u.email)}</b>. This order will appear in <a class="lime" href="/account">My Account</a>.`;
  form.email.value = u.email;
  ['name', 'phone', 'address', 'city', 'state', 'pincode'].forEach(k => { if (u[k] && !form[k].value) form[k].value = u[k]; });
  if (u.pincode) quote();
}).catch(() => {});

const pm = () => $('[name=pm]:checked').value;
function showPm() {
  $('#qr-box').style.display = pm() === 'qr' ? '' : 'none';
  $('[name=utr]').required = pm() === 'qr';
}
document.querySelectorAll('[name=pm]').forEach(r => r.onchange = showPm);

const done = async (id, email) => {
  if (signedIn) {
    const b = Object.fromEntries(['name', 'phone', 'address', 'city', 'state', 'pincode'].map(k => [k, form[k].value]));
    await api('/api/account/me', { method: 'PATCH', body: b }).catch(() => {});
  }
  Cart.clear();
  location.href = `/track?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}&new=1`;
};
const fail = msg => { $('#err').textContent = msg; $('#place').disabled = false; };

function loadRzp() {
  return window.Razorpay ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = ok; s.onerror = () => no(new Error('Could not load payment window'));
    document.head.appendChild(s);
  });
}

async function payOnline(body) {
  const o = await api('/api/razorpay/order', { method: 'POST', body });
  await loadRzp();
  const rz = new Razorpay({
    key: o.key, order_id: o.rzpOrderId, amount: o.amount, currency: 'INR',
    name: 'Altitude Moto', description: 'Order ' + o.id, image: location.origin + '/logo.png',
    prefill: { name: o.name, email: o.email, contact: o.phone }, theme: { color: '#FEF502' },
    handler: async resp => {
      try { await api('/api/razorpay/verify', { method: 'POST', body: resp }); done(o.id, o.email); }
      catch (err) { fail(err.message); }
    },
    modal: { ondismiss: () => fail('Payment cancelled. You can try again.') }
  });
  rz.on('payment.failed', r => fail('Payment failed: ' + (r.error?.description || 'please try again')));
  rz.open();
}

form.onsubmit = async e => {
  e.preventDefault();
  $('#err').textContent = ''; $('#place').disabled = true;
  if (!shipped) return fail('Enter a valid 6-digit pincode to see the courier charge');
  const body = { ...Object.fromEntries(new FormData(form)), items };
  try {
    if (pm() === 'rzp') return await payOnline(body);
    const { id } = await api('/api/orders', { method: 'POST', body });
    done(id, body.email);
  } catch (err) { fail(err.message); }
};
