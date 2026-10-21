const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const mail = require('./mail');

const r = express.Router();
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const STATUSES = ['Awaiting Payment', 'Payment Verification Pending', 'Payment Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const TTL = 12 * 3600 * 1000;

const sign = exp => `${exp}.${crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex')}`;
function valid(token = '') {
  const [exp, mac] = token.split('.');
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  const good = sign(exp).split('.')[1];
  return mac.length === good.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good));
}
const cookie = req => (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith('am_admin='))?.slice(9);

const attempts = new Map();
r.post('/login', (req, res) => {
  const ip = req.ip, a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 10) return res.status(429).json({ error: 'Too many attempts, try again in 15 minutes' });
  const pw = Buffer.from(String(req.body.password || ''));
  const real = Buffer.from(process.env.ADMIN_PASSWORD || '');
  if (!real.length || pw.length !== real.length || !crypto.timingSafeEqual(pw, real)) {
    a.n++; attempts.set(ip, a);
    return res.status(401).json({ error: 'Wrong password' });
  }
  attempts.delete(ip);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `am_admin=${sign(Date.now() + TTL)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL / 1000}${secure}`);
  res.json({ ok: true });
});

r.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'am_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

r.use((req, res, next) => valid(cookie(req)) ? next() : res.status(401).json({ error: 'Login required' }));

r.get('/me', (req, res) => res.json({ ok: true, statuses: STATUSES }));

r.get('/orders', (req, res) => {
  res.json(db.all('SELECT * FROM orders ORDER BY created_at DESC').map(db.parseOrder));
});

r.patch('/orders/:id', (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
  const before = db.get('SELECT status FROM orders WHERE id=?', [req.params.id]);
  if (!before) return res.status(404).json({ error: 'Not found' });
  db.run('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
  const o = db.parseOrder(db.get('SELECT * FROM orders WHERE id=?', [req.params.id]));
  if (before.status !== status) mail.statusChanged(o);
  res.json(o);
});

r.get('/products', (req, res) => {
  res.json(db.all('SELECT * FROM products ORDER BY sort').map(db.parseProduct));
});

r.patch('/products/:slug', (req, res) => {
  const p = db.get('SELECT * FROM products WHERE slug=?', [req.params.slug]);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const price = req.body.price === undefined ? p.price : parseInt(req.body.price, 10);
  if (!(price > 0 && price < 1e6)) return res.status(400).json({ error: 'Bad price' });
  const active = req.body.active === undefined ? p.active : (req.body.active ? 1 : 0);
  let video = p.video;
  if (req.body.video !== undefined) {
    const v = String(req.body.video).trim();
    const ig = v.match(/instagram\.com\/(?:reels?|p)\/([\w-]{5,40})/);
    const yt = v.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
    if (v && !ig && !yt) return res.status(400).json({ error: 'Paste an Instagram reel link or a YouTube link' });
    video = ig ? 'ig:' + ig[1] : yt ? yt[1] : null;
  }
  db.run('UPDATE products SET price=?, active=?, video=? WHERE slug=?', [price, active, video, p.slug]);
  res.json(db.parseProduct(db.get('SELECT * FROM products WHERE slug=?', [p.slug])));
});

r.use('/reviews', require('./reviews').admin);
r.use('/reels', require('./reels').admin);

module.exports = r;
