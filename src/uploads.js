const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const order = require('./order');

// Review photos/videos. Vercel: browser uploads straight to Vercel Blob (functions cap bodies at 4.5 MB).
// Railway/local: the file is posted here and stored under DATA_DIR/uploads (the persistent volume).
const r = express.Router();
// Vercel names the key BLOB_READ_WRITE_TOKEN, or <PREFIX>_READ_WRITE_TOKEN if a custom prefix was chosen when connecting.
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || Object.entries(process.env).find(([k]) => /_READ_WRITE_TOKEN$/.test(k))?.[1];
const BLOB = !!TOKEN;
const DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'uploads');
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
const MAX = { image: 5 * 1024 * 1024, video: 20 * 1024 * 1024 };
const fail = (res, e) => res.status(e.code || 400).json({ error: e.message });

r.get('/uploads/mode', (req, res) => res.json({ blob: BLOB, maxImage: MAX.image, maxVideo: MAX.video }));

r.post('/uploads/blob', express.json(), async (req, res) => {
  if (!BLOB) return res.status(404).end();
  const { handleUpload } = require('@vercel/blob/client');
  try {
    res.json(await handleUpload({
      request: req, body: req.body, token: TOKEN,
      onBeforeGenerateToken: async (pathname, payload) => {
        const { orderId, email } = JSON.parse(payload || '{}');
        await order.delivered(orderId, email);
        return { allowedContentTypes: Object.keys(TYPES), maximumSizeInBytes: MAX.video, addRandomSuffix: true };
      }
    }));
  } catch (e) { fail(res, e); }
});

r.post('/uploads', express.raw({ type: Object.keys(TYPES), limit: MAX.video }), async (req, res) => {
  if (BLOB) return res.status(404).end();
  if (process.env.VERCEL) return res.status(503).json({ error: 'Photo/video upload is not set up yet. You can post your review without photos for now.' });
  try {
    await order.delivered(req.query.orderId, req.query.email);
    const type = req.get('content-type'), ext = TYPES[type];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) throw new Error('Upload a JPG, PNG, WEBP photo or an MP4/MOV video');
    if (req.body.length > MAX[type.split('/')[0]]) throw new Error('File too big: photos up to 5 MB, videos up to 20 MB');
    fs.mkdirSync(DIR, { recursive: true });
    const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(DIR, name), req.body);
    res.json({ url: '/uploads/' + name });
  } catch (e) { fail(res, e); }
});

// Only media we stored ourselves may be attached to a review.
const okUrl = u => /^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp|mp4|mov|webm)$/.test(u) ||
  /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[\w\-./%]+$/i.test(u);
const kind = u => /\.(mp4|mov|webm)$/i.test(u) ? 'video' : 'image';

module.exports = Object.assign(r, { DIR, okUrl, kind });
