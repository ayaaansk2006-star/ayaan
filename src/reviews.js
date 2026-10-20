const express = require('express');
const db = require('./db');
const order = require('./order');

// Only customers with a Delivered order containing the product can review it, so every review is verified.
const pub = express.Router();

pub.get('/reviews', (req, res) => {
  const slug = req.query.slug ? String(req.query.slug) : null;
  const rows = slug
    ? db.all('SELECT slug,name,rating,text,created_at FROM reviews WHERE approved=1 AND slug=? ORDER BY id DESC LIMIT 50', [slug])
    : db.all('SELECT slug,name,rating,text,created_at FROM reviews WHERE approved=1 ORDER BY id DESC LIMIT 12');
  res.json(rows);
});

pub.post('/reviews', (req, res) => {
  const { orderId, email, slug } = req.body;
  const o = order.find(String(orderId || ''));
  if (!o || o.email !== String(email || '').toLowerCase()) return res.status(404).json({ error: 'Order not found' });
  if (o.status !== 'Delivered') return res.status(400).json({ error: 'You can review once your order is delivered' });
  if (!o.items.some(i => i.slug === slug)) return res.status(400).json({ error: 'This product is not in your order' });
  const rating = parseInt(req.body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Pick a rating from 1 to 5 stars' });
  const text = String(req.body.text || '').trim().slice(0, 600);
  if (text.length < 5) return res.status(400).json({ error: 'Please write a few words' });
  if (db.get('SELECT id FROM reviews WHERE order_id=? AND slug=?', [o.id, slug])) return res.status(409).json({ error: 'You already reviewed this product' });
  db.run('INSERT INTO reviews (slug,order_id,name,rating,text,created_at) VALUES (?,?,?,?,?,?)',
    [slug, o.id, o.name.split(' ')[0], rating, text, new Date().toISOString()]);
  res.json({ ok: true });
});

const admin = express.Router();
admin.get('/', (req, res) => res.json(db.all('SELECT * FROM reviews ORDER BY id DESC')));
admin.patch('/:id', (req, res) => { db.run('UPDATE reviews SET approved=? WHERE id=?', [req.body.approved ? 1 : 0, +req.params.id]); res.json({ ok: true }); });
admin.delete('/:id', (req, res) => { db.run('DELETE FROM reviews WHERE id=?', [+req.params.id]); res.json({ ok: true }); });

module.exports = { pub, admin };
