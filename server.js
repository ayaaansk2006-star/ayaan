require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./src/db');

const app = express();
// SESSION_SECRET is required on Vercel: each serverless instance would otherwise invent its own and log admins out.
const missing = ['UPI_ID', 'ADMIN_PASSWORD', ...(process.env.VERCEL ? ['SESSION_SECRET'] : [])].filter(k => !process.env[k]);
if (missing.length && !process.env.VERCEL) throw new Error('Set in .env: ' + missing.join(', '));
// On Vercel a missing setting shows a clear message instead of crashing the whole site.
app.use((req, res, next) => missing.length && process.env.VERCEL
  ? res.status(500).send('Setup incomplete. Add these in Vercel > Settings > Environment Variables, then redeploy: ' + missing.join(', '))
  : next());
app.set('trust proxy', 1);
app.use('/api', (req, res, next) => db.init().then(() => next(), next));
app.use('/api', require('./src/razorpay'));
app.use('/api', express.json({ limit: '50kb' }), require('./src/rzpqr'));
app.use(express.json({ limit: '50kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use('/api/account', require('./src/auth'));
app.use('/api', require('./src/uploads'));
app.use('/api', require('./src/shop'));
app.use('/api', require('./src/reviews').pub);
app.use('/api', require('./src/reels').pub);
app.use('/api', require('./src/greviews').pub);
app.use('/api/admin', require('./src/admin'));
app.use('/uploads', express.static(require('./src/uploads').DIR, { maxAge: '30d' }));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Vercel imports the app; Railway/local run this file directly.
if (require.main === module) {
  db.init().then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Altitude Moto running on :${port}`));
  });
}
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message.startsWith('Database not connected') ? err.message : 'Server error' }); });
module.exports = app;
