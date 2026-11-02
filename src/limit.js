// Per-IP request cap for endpoints that create orders or call Razorpay.
// ponytail: in-memory per serverless instance, so it slows bots rather than hard-stopping them; move to a DB/Redis counter if abuse shows up.
module.exports = (max, minutes) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(), k = req.ip, h = (hits.get(k) || []).filter(t => now - t < minutes * 60e3);
    if (h.length >= max) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes or WhatsApp us.' });
    h.push(now); hits.set(k, h);
    if (hits.size > 5000) hits.clear();
    next();
  };
};
