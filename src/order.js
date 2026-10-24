const crypto = require('crypto');
const db = require('./db');
const shipping = require('./shipping');

// Prices are always recomputed server-side from the DB; client totals are never trusted.
// Without a valid pincode the quote has no courier charge yet; orders always require one.
async function price(items, pincode) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw new Error('Cart is empty');
  const lines = await Promise.all(items.map(async it => {
    const p = db.parseProduct(await db.get('SELECT * FROM products WHERE slug=? AND active=1', [String(it.slug)]));
    if (!p) throw new Error('A product in your cart is no longer available');
    if (!(p.price > 0)) throw new Error(`${p.title} is available on request. Please WhatsApp us for the price.`);
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 1, 1), 10);
    const addons = p.addons.filter(a => (it.addons || []).includes(a.id));
    const groups = addons.map(a => a.group).filter(Boolean);
    if (new Set(groups).size !== groups.length) throw new Error(`Choose only one windshield for ${p.title}`);
    const unit = p.price + addons.reduce((s, a) => s + a.price, 0);
    const variant = p.variants.length ? String(it.variant || '') : '';
    if (p.variants.length && !p.variants.includes(variant)) throw new Error(`Choose the ${p.variants.join('/')} version for ${p.title}`);
    return { slug: p.slug, title: p.title + (variant ? ` (${variant})` : ''), variant, qty, unit, addons, lineTotal: unit * qty, image: p.images[0] };
  }));
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const ship = shipping.quote(pincode);
  return { lines, subtotal, shipping: ship && ship.fee, zone: ship && ship.zone, total: subtotal + (ship ? ship.fee : 0) };
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function customer(b) {
  const c = {
    name: clean(b.name, 80), email: clean(b.email, 120).toLowerCase(), phone: clean(b.phone, 15),
    address: clean(b.address, 300), city: clean(b.city, 60), state: clean(b.state, 60),
    pincode: clean(b.pincode, 6), notes: clean(b.bike, 80)
  };
  if (!c.name || !c.address || !c.city || !c.state) throw new Error('Please fill all address fields');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new Error('Invalid email');
  if (!/^[6-9]\d{9}$/.test(c.phone.replace(/^\+?91/, ''))) throw new Error('Invalid 10-digit mobile number');
  if (!shipping.quote(c.pincode)) throw new Error('Invalid pincode');
  return c;
}

const find = async id => db.parseOrder(await db.get('SELECT * FROM orders WHERE id=?', [id]));

async function create(c, { lines, total, shipping: fee }, { utr = '', status, method, userId = null }) {
  const id = 'AM' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
  await db.run(`INSERT INTO orders (id,created_at,name,email,phone,address,city,state,pincode,items,total,utr,notes,status,method,shipping,user_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [id, new Date().toISOString(), c.name, c.email, c.phone, c.address, c.city, c.state, c.pincode,
    JSON.stringify(lines), total, utr, c.notes, status, method, fee, userId]);
  await db.logStatus(id);
  return find(id);
}

// Review gate: the order must exist, belong to this email and be Delivered.
async function delivered(id, email) {
  const o = await find(String(id || ''));
  if (!o || o.email !== String(email || '').trim().toLowerCase()) throw Object.assign(new Error('Order not found'), { code: 404 });
  if (o.status !== 'Delivered') throw Object.assign(new Error('You can review once your order is delivered'), { code: 400 });
  return o;
}

module.exports = { price, customer, create, find, delivered };
