const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const catalog = require('./catalog');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'store.db');
let db;

// ponytail: sql.js keeps the DB in memory and rewrites the file on every write; fine for a shop's order volume, move to Postgres if traffic grows.
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, FILE);
}

function all(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}
const get = (sql, params) => all(sql, params)[0];
function run(sql, params = []) { db.run(sql, params); save(); }

async function init() {
  const SQL = await initSqlJs();
  db = fs.existsSync(FILE) ? new SQL.Database(fs.readFileSync(FILE)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS products (
    slug TEXT PRIMARY KEY, bike TEXT, brand TEXT, title TEXT, compat TEXT, price INTEGER,
    mrp_breakdown TEXT, note TEXT, addons TEXT, images TEXT, active INTEGER DEFAULT 1, sort INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, created_at TEXT, name TEXT, email TEXT, phone TEXT, address TEXT,
    city TEXT, state TEXT, pincode TEXT, items TEXT, total INTEGER, utr TEXT,
    status TEXT DEFAULT 'Payment Verification Pending', notes TEXT)`);
  const cols = all('PRAGMA table_info(orders)').map(c => c.name);
  if (!cols.includes('method')) db.run("ALTER TABLE orders ADD COLUMN method TEXT DEFAULT 'UPI QR'");
  if (!cols.includes('rzp_order_id')) db.run('ALTER TABLE orders ADD COLUMN rzp_order_id TEXT');
  if (!all('PRAGMA table_info(products)').some(c => c.name === 'seeded_price')) {
    db.run('ALTER TABLE products ADD COLUMN seeded_price INTEGER');
    db.run('UPDATE products SET seeded_price=price');
  }
  // A catalog price change overrides the live price once; admin edits persist until the catalog changes again.
  catalog.forEach((p, i) => db.run(
    `INSERT INTO products (slug,bike,brand,title,compat,price,mrp_breakdown,note,addons,images,sort,seeded_price)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET images=excluded.images,
     price=CASE WHEN products.seeded_price IS NOT excluded.seeded_price THEN excluded.price ELSE products.price END,
     seeded_price=excluded.seeded_price`,
    [p.slug, p.bike, p.brand, p.title, p.compat, p.price, p.mrp_breakdown, p.note,
      JSON.stringify(p.addons), JSON.stringify(p.images), i, p.price]));
  save();
}

const parseProduct = p => p && { ...p, addons: JSON.parse(p.addons), images: JSON.parse(p.images), active: !!p.active };
const parseOrder = o => o && { ...o, items: JSON.parse(o.items) };

module.exports = { init, all, get, run, parseProduct, parseOrder };
