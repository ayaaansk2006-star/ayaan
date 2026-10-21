const express = require('express');
const QRCode = require('qrcode');
const db = require('./db');
const mail = require('./mail');
const order = require('./order');
const rzp = require('./razorpay');
const { userId } = require('./auth');

const r = express.Router();
const UPI_ID = process.env.UPI_ID;
const UPI_NAME = process.env.UPI_NAME || 'Altitude Moto';

r.get('/products', async (req, res) => {
  res.json((await db.all('SELECT * FROM products WHERE active=1 ORDER BY sort')).map(db.parseProduct));
});

r.post('/quote', async (req, res) => {
  try {
    const q = await order.price(req.body.items, req.body.pincode);
    const base = process.env.UPI_QR_PAYLOAD || `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}`;
    const upiLink = `${base}&am=${q.total}.00&cu=INR`;
    const qr = await QRCode.toDataURL(upiLink, { width: 480, margin: 2, errorCorrectionLevel: 'M' });
    res.json({ ...q, upiId: UPI_ID, upiLink, qr, razorpay: rzp.enabled });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.post('/orders', async (req, res) => {
  try {
    const c = order.customer(req.body);
    const utr = String(req.body.utr ?? '').trim();
    if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) throw new Error('Enter the UPI transaction / UTR ID shown after payment');
    if (await db.get('SELECT id FROM orders WHERE utr=?', [utr])) throw new Error('This transaction ID was already used for an order');
    const o = await order.create(c, await order.price(req.body.items, req.body.pincode),
      { utr, status: 'Payment Verification Pending', method: 'UPI QR', userId: userId(req) });
    await mail.orderPlaced(o);
    res.json({ id: o.id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.get('/orders/:id', async (req, res) => {
  const o = await order.find(req.params.id);
  if (!o || o.email !== String(req.query.email || '').toLowerCase()) return res.status(404).json({ error: 'Order not found' });
  res.json({ id: o.id, created_at: o.created_at, status: o.status, items: o.items, total: o.total, shipping: o.shipping, name: o.name, method: o.method });
});

module.exports = r;
