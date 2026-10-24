const express = require('express');
const db = require('./db');

// Google reviews copied in by the owner from the Google Maps listing (no Google API needed).
const pub = express.Router();
pub.get('/google-reviews', async (req, res) => res.json(await db.all('SELECT name, rating, text, posted FROM google_reviews ORDER BY id DESC LIMIT 30')));

const admin = express.Router();
admin.get('/', async (req, res) => res.json(await db.all('SELECT * FROM google_reviews ORDER BY id DESC')));
admin.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60), text = String(req.body.text || '').trim().slice(0, 1000);
  const rating = parseInt(req.body.rating, 10), posted = String(req.body.posted || '').trim().slice(0, 30);
  if (!name || !text) return res.status(400).json({ error: 'Enter the reviewer name and review text' });
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Pick 1 to 5 stars' });
  await db.run('INSERT INTO google_reviews (name, rating, text, posted) VALUES (?,?,?,?)', [name, rating, text, posted]);
  res.json({ ok: true });
});
admin.delete('/:id', async (req, res) => { await db.run('DELETE FROM google_reviews WHERE id=?', [+req.params.id]); res.json({ ok: true }); });

module.exports = { pub, admin };
