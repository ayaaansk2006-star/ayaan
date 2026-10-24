const nodemailer = require('nodemailer');

const enabled = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
const transport = enabled && nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const inr = n => '₹' + Number(n).toLocaleString('en-IN');

function orderHtml(o, heading) {
  const rows = o.items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #333">${esc(i.title)}${
    i.addons.length ? '<br><small>+ ' + i.addons.map(a => esc(a.name)).join(', ') + '</small>' : ''}</td>
    <td style="padding:8px;border-bottom:1px solid #333">× ${i.qty}</td>
    <td style="padding:8px;border-bottom:1px solid #333;text-align:right">${inr(i.lineTotal)}</td></tr>`).join('');
  return `<div style="background:#0b0b0b;color:#eee;font-family:Arial,sans-serif;padding:24px">
  <div style="max-width:600px;margin:auto;background:#151515;border:1px solid #FEF502;border-radius:12px;padding:24px">
  <h1 style="color:#FEF502;margin:0 0 4px;letter-spacing:2px">ALTITUDE MOTO</h1>
  <h2 style="margin:0 0 16px">${esc(heading)}</h2>
  <p>Hi ${esc(o.name)},</p>
  <p>Order <b style="color:#FEF502">${esc(o.id)}</b> — Status: <b>${esc(o.status)}</b></p>
  <table style="width:100%;border-collapse:collapse;color:#eee">${rows}
  ${o.shipping ? `<tr><td colspan="2" style="padding:8px">Courier</td><td style="padding:8px;text-align:right">${inr(o.shipping)}</td></tr>` : ''}
  <tr><td colspan="2" style="padding:8px"><b>Total</b></td><td style="padding:8px;text-align:right"><b>${inr(o.total)}</b></td></tr></table>
  ${o.awb ? `<p><b>Courier:</b> ${esc(o.courier)} — Tracking no. <b>${esc(o.awb)}</b></p>` : ''}
  ${o.notes ? `<p><b>Bike:</b> ${esc(o.notes)}</p>` : ''}
  <p><b>Payment:</b> ${esc(o.method)} — ${esc(o.utr)}</p>
  <p><b>Ship to:</b><br>${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} - ${esc(o.pincode)}<br>Phone: ${esc(o.phone)}</p>
  <p style="color:#aaa;font-size:13px">You will get an email whenever your order status changes. Questions? Call/WhatsApp +91 98337 31869 / +91 79777 19218 or reply to altitudemotoindia@gmail.com</p>
  </div></div>`;
}

async function send(to, subject, html) {
  if (!enabled) { console.log(`[mail disabled] would send "${subject}" to ${to}`); return; }
  try {
    await transport.sendMail({ from: `"Altitude Moto" <${process.env.SMTP_USER}>`, to, subject, html });
  } catch (e) { console.error('mail failed:', e.message); }
}

// Emails go out in the background so payment confirmation never waits on Gmail.
// On Vercel, waitUntil keeps the function alive until sending finishes.
const { waitUntil } = require('@vercel/functions');
const bg = p => { try { waitUntil(p); } catch { p.catch(() => {}); } };

module.exports = {
  orderPlaced: o => bg(Promise.all([
    send(o.email, `Order ${o.id} received — Altitude Moto`, orderHtml(o, 'Thanks for your order!')),
    process.env.ADMIN_EMAIL && send(process.env.ADMIN_EMAIL, `New order ${o.id} — ${inr(o.total)}`, orderHtml(o, 'New order placed'))
  ])),
  statusChanged: o => bg(send(o.email, `Order ${o.id}: ${o.status} — Altitude Moto`, orderHtml(o, `Your order is now: ${o.status}`)))
};
