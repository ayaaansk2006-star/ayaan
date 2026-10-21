const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const mail = require('./mail');
const order = require('./order');
const { userId } = require('./auth');

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const enabled = !!(KEY_ID && SECRET);
const r = express.Router();

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest('hex');
const same = (a, b) => typeof a === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Idempotent: browser callback and webhook may both arrive for one payment.
async function markPaid(rzpOrderId, paymentId) {
  const o = await db.get('SELECT id, status FROM orders WHERE rzp_order_id=?', [rzpOrderId]);
  if (!o) return null;
  if (o.status === 'Awaiting Payment') {
    await db.run("UPDATE orders SET status='Payment Confirmed', utr=? WHERE id=?", [paymentId, o.id]);
    await mail.orderPlaced(await order.find(o.id));
  }
  return o.id;
}

r.post('/razorpay/order', express.json({ limit: '50kb' }), async (req, res) => {
  if (!enabled) return res.status(503).json({ error: 'Online payment is not available right now. Please use UPI QR.' });
  try {
    const c = order.customer(req.body);
    const o = await order.create(c, await order.price(req.body.items, req.body.pincode), { status: 'Awaiting Payment', method: 'Razorpay', userId: userId(req) });
    const rp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${KEY_ID}:${SECRET}`).toString('base64') },
      body: JSON.stringify({ amount: o.total * 100, currency: 'INR', receipt: o.id, notes: { order_id: o.id } })
    });
    const data = await rp.json();
    if (!rp.ok) {
      console.error('razorpay order failed:', data.error?.description);
      await db.run("UPDATE orders SET status='Cancelled' WHERE id=?", [o.id]);
      return res.status(502).json({ error: 'Could not start payment, please try again or use UPI QR' });
    }
    await db.run('UPDATE orders SET rzp_order_id=? WHERE id=?', [data.id, o.id]);
    res.json({ id: o.id, key: KEY_ID, rzpOrderId: data.id, amount: data.amount, name: c.name, email: c.email, phone: c.phone });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.post('/razorpay/verify', express.json(), async (req, res) => {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body;
  if (!enabled || !oid || !pid || !same(sig, hmac(SECRET, `${oid}|${pid}`))) {
    return res.status(400).json({ error: 'Payment could not be verified. If money was deducted, contact us with your payment ID.' });
  }
  const id = await markPaid(String(oid), String(pid));
  if (!id) return res.status(404).json({ error: 'Order not found' });
  res.json({ id });
});

r.post('/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  if (!WEBHOOK_SECRET || !same(req.get('X-Razorpay-Signature'), hmac(WEBHOOK_SECRET, req.body))) return res.status(400).end();
  const evt = JSON.parse(req.body.toString());
  const pay = evt.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(evt.event) && pay?.order_id) await markPaid(pay.order_id, pay.id);
  res.json({ ok: true });
});

module.exports = Object.assign(r, { enabled });
