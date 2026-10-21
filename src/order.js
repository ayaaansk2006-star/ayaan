const crypto = require('crypto');
const db = require('./db');

// Prices are always recomputed server-side from the DB; client totals are never trusted.
async function price(items) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw new Error('Cart is empty');
  const lines = await Promise.all(items.map(async it => {
    const p = db.parseProduct(await db.get('SELECT * FROM products WHERE slug=? AND active=1', [String(it.slug)]));
    if (!p) throw new Error('A product in your cart is no longer available');
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 1, 1), 10);
    const addons = p.addons.filter(a => (it.addons || []).includes(a.id));
    const unit = p.price + addons.reduce((s, a) => s + a.price, 0);
    return { slug: p.slug, title: p.title, qty, unit, addons, lineTotal: unit * qty, image: p.images[0] };
  }));
  return { lines, total: lines.reduce((s, l) => s + l.lineTotal, 0) };
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function customer(b) {
  const c = {
    name: clean(b.name, 80), email: clean(b.email, 120).toLowerCase(), phone: clean(b.phone, 15),
    address: clean(b.address, 300), city: clean(b.city, 60), state: clean(b.state, 60),
    pincode: clean(b.pincode, 6), notes: clean(b.notes, 300)
  };
  if (!c.name || !c.address || !c.city || !c.state) throw new Error('Please fill all address fields');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new Error('Invalid email');
  if (!/^[6-9]\d{9}$/.test(c.phone.replace(/^\+?91/, ''))) throw new Error('Invalid 10-digit mobile number');
  if (!/^\d{6}$/.test(c.pincode)) throw new Error('Invalid pincode');
  return c;
}

const find = async id => db.parseOrder(await db.get('SELECT * FROM orders WHERE id=?', [id]));

async function create(c, { lines, total }, { utr = '', status, method }) {
  const id = 'AM' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
  await db.run(`INSERT INTO orders (id,created_at,name,email,phone,address,city,state,pincode,items,total,utr,notes,status,method)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [id, new Date().toISOString(), c.name, c.email, c.phone, c.address, c.city, c.state, c.pincode,
    JSON.stringify(lines), total, utr, c.notes, status, method]);
  return find(id);
}

module.exports = { price, customer, create, find };
