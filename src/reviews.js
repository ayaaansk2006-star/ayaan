const express = require('express');
const db = require('./db');
const order = require('./order');
const uploads = require('./uploads');
const withMedia = r => ({ ...r, media: JSON.parse(r.media || '[]') });

// Only customers with a Delivered order containing the product can review it, so every review is verified.
const pub = express.Router();

pub.get('/reviews', async (req, res) => {
  const slug = req.query.slug ? String(req.query.slug) : null;
  const rows = await (slug
    ? db.all('SELECT slug,name,rating,text,media,created_at FROM reviews WHERE approved=1 AND slug=? ORDER BY id DESC LIMIT 50', [slug])
    : db.all(`SELECT slug,name,rating,text,media,created_at FROM reviews WHERE approved=1 ORDER BY id DESC LIMIT ${req.query.all ? 100 : 12}`));
  res.json(rows.map(withMedia));
});

pub.post('/reviews', async (req, res) => {
  const { orderId, email, slug } = req.body;
  let o;
  try { o = await order.delivered(orderId, email); } catch (e) { return res.status(e.code).json({ error: e.message }); }
  if (!o.items.some(i => i.slug === slug)) return res.status(400).json({ error: 'This product is not in your order' });
  const rating = parseInt(req.body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Pick a rating from 1 to 5 stars' });
  const text = String(req.body.text || '').trim().slice(0, 600);
  if (text.length < 5) return res.status(400).json({ error: 'Please write a few words' });
  const media = Array.isArray(req.body.media) ? req.body.media.map(String) : [];
  if (media.length > 4 || !media.every(uploads.okUrl)) return res.status(400).json({ error: media.length > 4 ? 'Up to 4 photos or videos per review' : 'Invalid photo or video, please upload again' });
  if (await db.get('SELECT id FROM reviews WHERE order_id=? AND slug=?', [o.id, slug])) return res.status(409).json({ error: 'You already reviewed this product' });
  await db.run('INSERT INTO reviews (slug,order_id,name,rating,text,media,created_at) VALUES (?,?,?,?,?,?,?)',
    [slug, o.id, o.name.split(' ')[0], rating, text, JSON.stringify(media.map(url => ({ url, type: uploads.kind(url) }))), new Date().toISOString()]);
  res.json({ ok: true });
});

const admin = express.Router();
admin.get('/', async (req, res) => res.json((await db.all('SELECT * FROM reviews ORDER BY id DESC')).map(withMedia)));
admin.patch('/:id', async (req, res) => { await db.run('UPDATE reviews SET approved=? WHERE id=?', [req.body.approved ? 1 : 0, +req.params.id]); res.json({ ok: true }); });
admin.delete('/:id', async (req, res) => { await db.run('DELETE FROM reviews WHERE id=?', [+req.params.id]); res.json({ ok: true }); });

module.exports = { pub, admin };
