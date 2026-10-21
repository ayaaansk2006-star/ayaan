require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./src/db');

if (!process.env.UPI_ID) throw new Error('Set UPI_ID in .env (e.g. 9833731869@okaxis)');
if (!process.env.ADMIN_PASSWORD) throw new Error('Set ADMIN_PASSWORD in .env');

const app = express();
app.set('trust proxy', 1);
app.use('/api', require('./src/razorpay'));
app.use(express.json({ limit: '50kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use('/api', require('./src/shop'));
app.use('/api', require('./src/reviews').pub);
app.use('/api', require('./src/reels').pub);
app.use('/api/admin', require('./src/admin'));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

db.init().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Altitude Moto running on :${port}`));
});
