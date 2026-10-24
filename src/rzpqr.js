const express = require('express');
const order = require('./order');
const db = require('./db');
const { userId } = require('./auth');
const rzp = require('./razorpay');

// One single-use Razorpay UPI QR per order, fixed to the order total. The page polls /status;
// the qr_code.credited webhook confirms it too if the customer closes the page.
const r = express.Router();
const auth = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
const call = async (path, body) => {
  const res = await fetch('https://api.razorpay.com/v1' + path, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: body && JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.description || 'Razorpay error');
  return data;
};

// Razorpay only returns an image; read the UPI link out of it so phone users can tap instead of scan.
async function upiLink(url) {
  try {
    const { PNG } = require('pngjs'), jsQR = require('jsqr');
    const p = PNG.sync.read(Buffer.from(await (await fetch(url)).arrayBuffer()));
    const text = jsQR(new Uint8ClampedArray(p.data), p.width, p.height)?.data || '';
    return text.startsWith('upi://') ? text : null;
  } catch { return null; }
}

r.post('/razorpay/qr', async (req, res) => {
  if (!rzp.enabled) return res.status(503).json({ error: 'QR payment is not available right now' });
  try {
    const c = order.customer(req.body);
    const o = await order.create(c, await order.price(req.body.items, req.body.pincode), { status: 'Awaiting Payment', method: 'Razorpay QR', userId: userId(req) });
    let qr;
    try {
      qr = await call('/payments/qr_codes', {
        type: 'upi_qr', name: 'Altitude Moto', usage: 'single_use', fixed_amount: true, payment_amount: o.total * 100,
        description: 'Order ' + o.id, close_by: Math.floor(Date.now() / 1000) + 30 * 60, notes: { order_id: o.id }
      });
    } catch (e) {
      console.error('razorpay qr failed:', e.message);
      await db.run("UPDATE orders SET status='Cancelled' WHERE id=?", [o.id]);
      return res.status(502).json({ error: 'Could not create the QR code, please try again' });
    }
    await db.run('UPDATE orders SET rzp_order_id=? WHERE id=?', [qr.id, o.id]);
    res.json({ id: o.id, email: c.email, image: qr.image_url, amount: o.total });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Tap-to-pay link for phone users, fetched after the QR is already on screen (decoding takes ~2s).
r.get('/razorpay/qr/:id/link', async (req, res) => {
  const o = await order.find(req.params.id);
  if (!o || o.email !== String(req.query.email || '').toLowerCase() || !o.rzp_order_id?.startsWith('qr_')) return res.status(404).json({ error: 'Order not found' });
  const qr = await call(`/payments/qr_codes/${o.rzp_order_id}`).catch(() => null);
  res.json({ upiLink: qr ? await upiLink(qr.image_url) : null });
});

// Asks Razorpay whether this order's QR has been paid the full amount.
r.get('/razorpay/qr/:id/status', async (req, res) => {
  const o = await order.find(req.params.id);
  if (!o || o.email !== String(req.query.email || '').toLowerCase()) return res.status(404).json({ error: 'Order not found' });
  if (o.status === 'Awaiting Payment' && o.rzp_order_id?.startsWith('qr_')) {
    const { items } = await call(`/payments/qr_codes/${o.rzp_order_id}/payments`).catch(() => ({ items: [] }));
    const paid = items.find(p => p.status === 'captured' && p.amount >= o.total * 100);
    if (paid) await rzp.markPaid(o.rzp_order_id, paid.id, 'Razorpay QR');
    // A payment Razorpay has seen but not yet captured: the bank is still confirming it.
    else if (items.some(p => ['created', 'authorized'].includes(p.status))) return res.json({ status: o.status, processing: true });
  }
  res.json({ status: (await order.find(o.id)).status });
});

module.exports = r;
