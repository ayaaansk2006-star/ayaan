const express = require('express');
const crypto = require('crypto');
const db = require('./db');

// Customer accounts. Emails are not verified, so an account only ever sees orders placed while logged in to it.
const r = express.Router();
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TTL = 30 * 24 * 3600 * 1000;
const FIELDS = ['name', 'phone', 'address', 'city', 'state', 'pincode'];

const mac = data => crypto.createHmac('sha256', SECRET).update('user:' + data).digest('hex');
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
function checkPw(pw, stored) {
  const [salt] = stored.split(':');
  return crypto.timingSafeEqual(Buffer.from(hash(pw, salt)), Buffer.from(stored));
}

// Returns the logged-in user id, or null.
function userId(req) {
  const t = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith('am_user='))?.slice(8) || '';
  const [id, exp, m] = t.split('.');
  if (!id || !m || Number(exp) < Date.now()) return null;
  const good = mac(`${id}.${exp}`);
  return m.length === good.length && crypto.timingSafeEqual(Buffer.from(m), Buffer.from(good)) ? Number(id) : null;
}
function setCookie(req, res, id) {
  const exp = Date.now() + TTL, secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `am_user=${id}.${exp}.${mac(`${id}.${exp}`)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL / 1000}${secure}`);
}
const cleanEmail = e => String(e || '').trim().toLowerCase().slice(0, 120);

r.post('/signup', async (req, res) => {
  const email = cleanEmail(req.body.email), pw = String(req.body.password || ''), name = String(req.body.name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Enter your name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (pw.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (await db.get('SELECT id FROM users WHERE email=?', [email])) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  const out = await db.run('INSERT INTO users (email, pass, name, created_at) VALUES (?,?,?,?)', [email, hash(pw), name, new Date().toISOString()]);
  setCookie(req, res, Number(out.lastInsertRowid));
  res.json({ ok: true });
});

const attempts = new Map();
r.post('/login', async (req, res) => {
  const email = cleanEmail(req.body.email), a = attempts.get(email) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 10) return res.status(429).json({ error: 'Too many attempts, try again in 15 minutes' });
  const u = await db.get('SELECT id, pass FROM users WHERE email=?', [email]);
  if (!u || !checkPw(String(req.body.password || ''), u.pass)) {
    a.n++; attempts.set(email, a);
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  attempts.delete(email);
  setCookie(req, res, u.id);
  res.json({ ok: true });
});

r.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'am_user=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

r.use((req, res, next) => (req.uid = userId(req)) ? next() : res.status(401).json({ error: 'Please sign in' }));

r.get('/me', async (req, res) => {
  const u = await db.get(`SELECT email, ${FIELDS.join(',')} FROM users WHERE id=?`, [req.uid]);
  u ? res.json(u) : res.status(401).json({ error: 'Please sign in' });
});

r.patch('/me', async (req, res) => {
  const vals = FIELDS.map(f => String(req.body[f] ?? '').trim().slice(0, 300));
  await db.run(`UPDATE users SET ${FIELDS.map(f => f + '=?').join(',')} WHERE id=?`, [...vals, req.uid]);
  res.json({ ok: true });
});

r.get('/orders', async (req, res) => {
  const rows = await db.all('SELECT id, created_at, status, items, total, shipping FROM orders WHERE user_id=? ORDER BY created_at DESC', [req.uid]);
  res.json(rows.map(db.parseOrder));
});

module.exports = Object.assign(r, { userId });
