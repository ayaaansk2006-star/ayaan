const express = require('express');
const db = require('./db');

// Instagram reels shown on the homepage; only the post code is stored and embedded from instagram.com.
const pub = express.Router();
pub.get('/reels', (req, res) => res.json(db.all('SELECT code, caption FROM reels ORDER BY id DESC LIMIT 12')));

const admin = express.Router();
admin.get('/', (req, res) => res.json(db.all('SELECT * FROM reels ORDER BY id DESC')));
admin.post('/', (req, res) => {
  const m = String(req.body.url || '').match(/instagram\.com\/(?:reels?|p)\/([\w-]{5,40})/);
  if (!m) return res.status(400).json({ error: 'Paste an Instagram reel link, like https://www.instagram.com/reel/ABC123/' });
  if (db.get('SELECT id FROM reels WHERE code=?', [m[1]])) return res.status(409).json({ error: 'This reel is already added' });
  db.run('INSERT INTO reels (code, caption, created_at) VALUES (?,?,?)', [m[1], String(req.body.caption || '').trim().slice(0, 120), new Date().toISOString()]);
  res.json({ ok: true });
});
admin.delete('/:id', (req, res) => { db.run('DELETE FROM reels WHERE id=?', [+req.params.id]); res.json({ ok: true }); });

module.exports = { pub, admin };
