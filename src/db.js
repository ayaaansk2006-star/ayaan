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
  await run(`CREATE TABLE IF NOT EXISTS products (
    slug TEXT PRIMARY KEY, bike TEXT, brand TEXT, title TEXT, compat TEXT, price INTEGER,
    mrp_breakdown TEXT, note TEXT, addons TEXT, images TEXT, active INTEGER DEFAULT 1, sort INTEGER)`);
  await run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, created_at TEXT, name TEXT, email TEXT, phone TEXT, address TEXT,
    city TEXT, state TEXT, pincode TEXT, items TEXT, total INTEGER, utr TEXT,
    status TEXT DEFAULT 'Payment Verification Pending', notes TEXT)`);
  const oc = await cols('orders');
  if (!oc.includes('method')) await run("ALTER TABLE orders ADD COLUMN method TEXT DEFAULT 'UPI QR'");
  if (!oc.includes('rzp_order_id')) await run('ALTER TABLE orders ADD COLUMN rzp_order_id TEXT');
  await run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, order_id TEXT, name TEXT, rating INTEGER,
    text TEXT, approved INTEGER DEFAULT 0, created_at TEXT, UNIQUE(order_id, slug))`);
  await run('CREATE TABLE IF NOT EXISTS reels (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, caption TEXT, created_at TEXT)');
  const pc = await cols('products');
  if (!pc.includes('video')) await run('ALTER TABLE products ADD COLUMN video TEXT');
  if (!pc.includes('seeded_price')) {
    await run('ALTER TABLE products ADD COLUMN seeded_price INTEGER');
    await run('UPDATE products SET seeded_price=price');
  }
  // A catalog price change overrides the live price once; admin edits persist until the catalog changes again.
  await client.batch(catalog.map((p, i) => ({
    sql: `INSERT INTO products (slug,bike,brand,title,compat,price,mrp_breakdown,note,addons,images,sort,seeded_price)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET images=excluded.images,
     price=CASE WHEN products.seeded_price IS NOT excluded.seeded_price THEN excluded.price ELSE products.price END,
     seeded_price=excluded.seeded_price`,
    args: [p.slug, p.bike, p.brand, p.title, p.compat, p.price, p.mrp_breakdown, p.note,
      JSON.stringify(p.addons), JSON.stringify(p.images), i, p.price].map(v => v ?? null)
  })), 'write');
}

// Runs once per server instance (serverless cold starts included); a failed attempt is retried on the next request.
let ready;
const init = () => (ready ||= setup().catch(e => { ready = null; throw e; }));

const parseProduct = p => p && { ...p, addons: JSON.parse(p.addons), images: JSON.parse(p.images), active: !!p.active };
const parseOrder = o => o && { ...o, items: JSON.parse(o.items) };

module.exports = { init, all, get, run, parseProduct, parseOrder };
