// Homepage "Recently viewed" row from products opened on this device.
const seenWait = setInterval(() => {
  if (!products.length) return;
  clearInterval(seenWait);
  const seen = JSON.parse(localStorage.getItem('am_seen') || '[]').map(s => products.find(p => p.slug === s)).filter(Boolean);
  if (!seen.length) return;
  $('#recent').innerHTML = `<div class="row"><b>Recently viewed</b><button class="rv-clear">Clear</button></div><div class="rv-row">${seen.map(p =>
    `<a href="/product?s=${encodeURIComponent(p.slug)}"><img src="${esc(p.images[0])}" alt="" loading="lazy"><span>${esc(p.title)}</span><b class="lime">${p.price ? inr(p.price) : 'On request'}</b></a>`).join('')}</div>`;
  $('#recent .rv-clear').onclick = () => { localStorage.removeItem('am_seen'); $('#recent').innerHTML = ''; };
}, 100);
