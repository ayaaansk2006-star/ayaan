const express = require('express');
const db = require('./db');
const mail = require('./mail');
const order = require('./order');
const { userId } = require('./auth');

// Invoice + cancel/return/replace requests, following the Refund & Cancellation Policy.
// Access needs the order's email, or being signed in to the account that placed it.
const pub = express.Router();
const DAY = 864e5;
const PAID = ['Payment Confirmed', 'Shipped', 'Delivered'];
const CANCELLABLE = ['Awaiting Payment', 'Payment Verification Pending', 'Payment Confirmed'];
const REASONS = {
  cancel: ['Ordered by mistake', 'Ordered the wrong part', 'Found a better option', 'Delivery is too late', 'Other'],
  return: ['Does not fit my bike', 'No longer needed', 'Other'],
  replace: ['Item arrived damaged', 'Wrong item received']
};

async function owned(req) {
  const o = await order.find(req.params.id);
  const email = String(req.query.email || req.body?.email || '').trim().toLowerCase();
  if (o && ((email && o.email === email) || (o.user_id && Number(o.user_id) === userId(req)))) return o;
  const e = new Error('Order not found'); e.code = 404; throw e;
}
const deliveredAt = o => {
  const h = [...o.history].reverse().find(x => x.status === 'Delivered');
  return h ? new Date(h.at.replace(' ', 'T') + 'Z').getTime() : null;
};
// What the customer may request right now (policy windows: cancel before shipping, return 7 days, damage/wrong 48h).
function allowed(o) {
  if (CANCELLABLE.includes(o.status)) return ['cancel'];
  const d = o.status === 'Delivered' && deliveredAt(o);
  if (!d) return [];
  return [Date.now() - d <= 7 * DAY && 'return', Date.now() - d <= 2 * DAY && 'replace'].filter(Boolean);
}
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(e.code || 400).json({ error: e.message }));

pub.get('/orders/:id/aftersales', wrap(async (req, res) => {
  const o = await owned(req);
  const r = await db.get('SELECT type, reason, status, created_at, reply FROM order_requests WHERE order_id=? ORDER BY id DESC', [o.id]);
  res.json({ invoice: PAID.includes(o.status), allowed: r?.status === 'Pending' ? [] : allowed(o), reasons: REASONS, request: r || null });
}));

pub.get('/orders/:id/invoice', wrap(async (req, res) => {
  const o = await owned(req);
  if (!PAID.includes(o.status)) throw Object.assign(new Error('The invoice is available once payment is confirmed'), { code: 400 });
  const paidAt = o.history.find(h => h.status === 'Payment Confirmed')?.at || o.created_at;
  res.json({ id: o.id, created_at: o.created_at, paid_at: paidAt, method: o.method, utr: o.utr, items: o.items, shipping: o.shipping, total: o.total,
    name: o.name, phone: o.phone, address: o.address, city: o.city, state: o.state, pincode: o.pincode });
}));

pub.post('/orders/:id/request', wrap(async (req, res) => {
  const o = await owned(req), type = String(req.body.type || ''), reason = String(req.body.reason || '');
  if (!allowed(o).includes(type)) throw new Error('This request is not available for this order any more. Please WhatsApp us.');
  if (!REASONS[type].includes(reason)) throw new Error('Pick a reason');
  if (await db.get("SELECT id FROM order_requests WHERE order_id=? AND status='Pending'", [o.id])) throw new Error('You already have a request open for this order');
  const details = String(req.body.details || '').trim().slice(0, 500);
  await db.run('INSERT INTO order_requests (order_id, type, reason, details, status, created_at) VALUES (?,?,?,?,?,?)',
    [o.id, type, reason, details, 'Pending', new Date().toISOString()]);
  mail.requestOpened(o, { type, reason, details });
  res.json({ ok: true });
}));

// Admin: approve/reject. Approving a cancel cancels the order (refund itself is done in Razorpay).
const admin = express.Router();
admin.get('/', async (req, res) => res.json(await db.all(`SELECT r.*, o.name, o.email, o.phone, o.total, o.status AS order_status, o.method
  FROM order_requests r JOIN orders o ON o.id = r.order_id ORDER BY r.status = 'Pending' DESC, r.id DESC LIMIT 200`)));
admin.patch('/:id', wrap(async (req, res) => {
  const status = req.body.status, reply = String(req.body.reply || '').trim().slice(0, 300);
  if (!['Approved', 'Rejected'].includes(status)) throw new Error('Bad status');
  const r = await db.get("SELECT * FROM order_requests WHERE id=? AND status='Pending'", [+req.params.id]);
  if (!r) throw Object.assign(new Error('Request not found or already decided'), { code: 404 });
  await db.run('UPDATE order_requests SET status=?, reply=? WHERE id=?', [status, reply, r.id]);
  if (r.type === 'cancel' && status === 'Approved') {
    await db.run("UPDATE orders SET status='Cancelled' WHERE id=?", [r.order_id]);
    await db.logStatus(r.order_id);
  }
  mail.requestDecided(await order.find(r.order_id), { ...r, status, reply });
  res.json({ ok: true });
}));

module.exports = { pub, admin };
