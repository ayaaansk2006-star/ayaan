const express = require('express');
const db = require('./db');
const page = require('./product-page');

// Server-rendered product <head> so WhatsApp/Instagram previews and Google see the real name, photo and price.
const r = express.Router();
const SITE = 'https://altitudemoto.vercel.app';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const inr = n => '₹' + Number(n).toLocaleString('en-IN');

r.get('/product', async (req, res, next) => {
  try {
    await db.init();
    const p = db.parseProduct(await db.get('SELECT * FROM products WHERE slug=? AND active=1', [String(req.query.s || '')]));
    let head = '<title>Altitude Moto</title><meta name="description" content="GPS mounts and windshields by Altitude Moto">';
    if (p) {
      const url = `${SITE}/product?s=${encodeURIComponent(p.slug)}`, img = SITE + p.images[0];
      const title = `${p.title} — ${p.price ? inr(p.price) : 'Price on request'} | Altitude Moto`;
      const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.desc, image: p.images.map(i => SITE + i),
        brand: { '@type': 'Brand', name: 'Altitude Moto' }, sku: p.slug, url,
        ...(p.price ? { offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR', url } } : {}) };
      head = `<title>${esc(title)}</title><meta name="description" content="${esc(p.desc)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(p.desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${esc(url)}"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
    }
    res.set('Cache-Control', 'public, max-age=0, s-maxage=300').type('html').send(page.replace('<!--SEO-->', head));
  } catch (e) { next(e); }
});

r.get('/sitemap.xml', async (req, res, next) => {
  try {
    await db.init();
    const slugs = (await db.all('SELECT slug FROM products WHERE active=1 ORDER BY sort')).map(x => x.slug);
    const urls = ['/', '/review', '/contact', '/shipping-policy', '/refund-policy', ...slugs.map(s => `/product?s=${encodeURIComponent(s)}`)];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${esc(SITE + u)}</loc></url>`).join('')}</urlset>`);
  } catch (e) { next(e); }
});

module.exports = r;
