const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const catalog = require('./catalog');

// Turso (hosted SQLite) when TURSO_DATABASE_URL is set, e.g. on Vercel; otherwise a local file (Railway volume / dev).
let client;
function connect() {
  let url = process.env.TURSO_DATABASE_URL;
  if (!url && process.env.VERCEL) throw new Error('Database not connected: add Turso in Vercel > Storage, then redeploy');
  if (!url) {
    const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
    fs.mkdirSync(dir, { recursive: true });
    url = 'file:' + path.join(dir, 'store.db');
  }
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

async function all(sql, params = []) {
  const r = await client.execute({ sql, args: params.map(v => v ?? null) });
  return r.rows.map(row => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}
const get = async (sql, params) => (await all(sql, params))[0];
const run = (sql, params = []) => client.execute({ sql, args: params.map(v => v ?? null) });
const cols = async t => (await all(`PRAGMA table_info(${t})`)).map(c => c.name);

async function setup() {
  connect();
  // One round trip for all tables, then column checks in parallel: keeps serverless cold starts short.
  await client.batch([
    `CREATE TABLE IF NOT EXISTS products (
    slug TEXT PRIMARY KEY, bike TEXT, brand TEXT, title TEXT, compat TEXT, price INTEGER,
    mrp_breakdown TEXT, note TEXT, addons TEXT, images TEXT, active INTEGER DEFAULT 1, sort INTEGER)`,
    `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, created_at TEXT, name TEXT, email TEXT, phone TEXT, address TEXT,
    city TEXT, state TEXT, pincode TEXT, items TEXT, total INTEGER, utr TEXT,
    status TEXT DEFAULT 'Payment Verification Pending', notes TEXT)`,
    `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, order_id TEXT, name TEXT, rating INTEGER,
    text TEXT, approved INTEGER DEFAULT 0, created_at TEXT, UNIQUE(order_id, slug))`,
    `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, pass TEXT, name TEXT, phone TEXT,
    address TEXT, city TEXT, state TEXT, pincode TEXT, created_at TEXT)`,
    'CREATE TABLE IF NOT EXISTS reels (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, caption TEXT, created_at TEXT)',
    'CREATE TABLE IF NOT EXISTS google_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, rating INTEGER, text TEXT, posted TEXT)'
  ], 'write');
  const [oc, rc, pc] = await Promise.all([cols('orders'), cols('reviews'), cols('products')]);
  const alters = [
    !oc.includes('method') && "ALTER TABLE orders ADD COLUMN method TEXT DEFAULT 'UPI QR'",
    !oc.includes('rzp_order_id') && 'ALTER TABLE orders ADD COLUMN rzp_order_id TEXT',
    !oc.includes('user_id') && 'ALTER TABLE orders ADD COLUMN user_id INTEGER',
    !oc.includes('awb') && 'ALTER TABLE orders ADD COLUMN courier TEXT',
    !oc.includes('awb') && 'ALTER TABLE orders ADD COLUMN awb TEXT',
    !oc.includes('history') && "ALTER TABLE orders ADD COLUMN history TEXT DEFAULT '[]'",
    !oc.includes('shipping') && 'ALTER TABLE orders ADD COLUMN shipping INTEGER DEFAULT 0',
    !rc.includes('media') && "ALTER TABLE reviews ADD COLUMN media TEXT DEFAULT '[]'",
    !pc.includes('video') && 'ALTER TABLE products ADD COLUMN video TEXT',
    !pc.includes('seeded_price') && 'ALTER TABLE products ADD COLUMN seeded_price INTEGER',
    !pc.includes('seeded_price') && 'UPDATE products SET seeded_price=price'
  ].filter(Boolean);
  if (alters.length) await client.batch(alters, 'write');
  // Text/photos always follow the catalog. A catalog price change overrides the live price once; admin price edits persist until then.
  await client.batch(catalog.map((p, i) => ({
    sql: `INSERT INTO products (slug,bike,brand,title,compat,price,mrp_breakdown,note,addons,images,sort,seeded_price)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET images=excluded.images, bike=excluded.bike, brand=excluded.brand, title=excluded.title,
     compat=excluded.compat, mrp_breakdown=excluded.mrp_breakdown, note=excluded.note, addons=excluded.addons, sort=excluded.sort,
     price=CASE WHEN products.seeded_price IS NOT excluded.seeded_price THEN excluded.price ELSE products.price END,
     seeded_price=excluded.seeded_price`,
    args: [p.slug, p.bike, p.brand, p.title, p.compat, p.price, p.mrp_breakdown, p.note,
      JSON.stringify(p.addons), JSON.stringify(p.images), i, p.price].map(v => v ?? null)
  })), 'write');
}

// Runs once per server instance (serverless cold starts included); a failed attempt is retried on the next request.
let ready;
const init = () => (ready ||= setup().catch(e => { ready = null; throw e; }));

// Variants (e.g. BS3/BS4/BS6) come straight from the catalog; they change fitting, not price.
const meta = slug => catalog.find(c => c.slug === slug) || {};
const parseProduct = p => p && { ...p, addons: JSON.parse(p.addons), images: JSON.parse(p.images), active: !!p.active,
  variants: meta(p.slug).variants || [], kind: meta(p.slug).kind || 'mount', desc: meta(p.slug).desc || '' };
const parseOrder = o => o && { ...o, items: JSON.parse(o.items), history: JSON.parse(o.history || '[]') };
// Append to the status timeline; runs after a status UPDATE so it records the new status.
const logStatus = id => run(`UPDATE orders SET history=json_insert(COALESCE(history,'[]'),'$[#]',json_object('status',status,'at',datetime('now'))) WHERE id=?`, [id]);

module.exports = { init, all, get, run, parseProduct, parseOrder, logStatus };
