const STAR = on => `<svg width="22" height="22" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m12 2 3 7 7 .6-5.3 4.6 1.6 7.3L12 17.8 5.7 21.5l1.6-7.3L2 9.6 9 9z"/></svg>`;
const stars = n => `<span class="lime">${[1, 2, 3, 4, 5].map(i => STAR(i <= n)).join('')}</span>`;
const media = m => m.type === 'video'
  ? `<video src="${esc(m.url)}" controls preload="metadata" playsinline></video>`
  : `<a href="${esc(m.url)}" target="_blank" rel="noopener"><img src="${esc(m.url)}" alt="Customer photo" loading="lazy"></a>`;
let mode = { blob: false, maxImage: 5e6, maxVideo: 20e6 }, titles = {};

async function loadList() {
  const [list, products] = await Promise.all([api('/api/reviews?all=1'), api('/api/products')]);
  products.forEach(p => titles[p.slug] = p.title);
  $('#list').innerHTML = list.length ? list.map(r => `<div class="rv">${stars(r.rating)}
      ${r.media.length ? `<div class="media">${r.media.map(media).join('')}</div>` : ''}
      <p>${esc(r.text)}</p><small>${esc(r.name)} · verified buyer · ${esc(titles[r.slug] || '')}</small></div>`).join('')
    : '<div class="rv" style="grid-column:1/-1;text-align:center">No reviews yet. Be the first after your order is delivered.</div>';
}

// Photos are shrunk in the browser (max 1600px JPEG) so uploads stay small and fast.
function shrink(file) {
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? ok(b) : no(new Error('Could not read photo')), 'image/jpeg', 0.85);
    };
    img.onerror = () => no(new Error('Could not read this photo. Please use JPG or PNG.'));
    img.src = URL.createObjectURL(file);
  });
}

async function upload(file, oid, email) {
  const video = file.type.startsWith('video/');
  if (video && file.size > mode.maxVideo) throw new Error('Video too big. Please keep videos under 20 MB (about 30 seconds).');
  const body = video ? file : await shrink(file);
  if (!video && body.size > mode.maxImage) throw new Error('Photo too big, max 5 MB');
  const type = video ? file.type : 'image/jpeg';
  if (mode.blob) {
    // ponytail: Blob client loaded from esm.sh; vendor it if that CDN is ever unreliable.
    const { upload: put } = await import('https://esm.sh/@vercel/blob@2.8.2/client');
    const ext = video ? file.name.split('.').pop().toLowerCase() : 'jpg';
    const b = await put(`reviews/${oid}.${ext}`, new File([body], 'f.' + ext, { type }),
      { access: 'public', handleUploadUrl: '/api/uploads/blob', clientPayload: JSON.stringify({ orderId: oid, email }) });
    return b.url;
  }
  const res = await fetch(`/api/uploads?orderId=${encodeURIComponent(oid)}&email=${encodeURIComponent(email)}`,
    { method: 'POST', headers: { 'Content-Type': type }, body });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Upload failed');
  return d.url;
}

function formFor(item, oid, email) {
  const f = document.createElement('form');
  f.className = 'form'; f.style.marginTop = '22px';
  f.innerHTML = `<b>${esc(item.title)}</b><div class="pick">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} stars">${STAR(true)}</button>`).join('')}</div>
    <textarea name="text" rows="3" maxlength="600" required placeholder="How is the fit and finish? Which bike?"></textarea>
    <label>Photos / videos (up to 4)<input type="file" name="files" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple></label>
    <div class="prev"></div><button class="btn">Submit review</button><div class="err"></div>`;
  let rating = 0;
  const btns = f.querySelectorAll('.pick button');
  btns.forEach(b => b.onclick = () => { rating = +b.dataset.n; btns.forEach(x => x.classList.toggle('on', +x.dataset.n <= rating)); });
  f.files.onchange = () => {
    f.querySelector('.prev').innerHTML = [...f.files.files].slice(0, 4).map(x => x.type.startsWith('video/')
      ? `<video src="${URL.createObjectURL(x)}" muted></video>` : `<img src="${URL.createObjectURL(x)}" alt="">`).join('');
  };
  f.onsubmit = async e => {
    e.preventDefault();
    const err = f.querySelector('.err'), btn = f.querySelector('.btn');
    err.textContent = '';
    if (!rating) return err.textContent = 'Tap the stars to give a rating';
    const files = [...f.files.files];
    if (files.length > 4) return err.textContent = 'Please choose up to 4 photos or videos';
    btn.disabled = true;
    try {
      const urls = [];
      for (const [i, file] of files.entries()) { btn.textContent = `Uploading ${i + 1} of ${files.length}…`; urls.push(await upload(file, oid, email)); }
      btn.textContent = 'Submitting…';
      await api('/api/reviews', { method: 'POST', body: { orderId: oid, email, slug: item.slug, rating, text: f.text.value, media: urls } });
      f.innerHTML = '<p class="lime">Thanks! Your review will appear here after a quick check.</p>';
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Submit review'; }
  };
  return f;
}

async function find(oid, email) {
  $('#ferr').textContent = ''; $('#forms').innerHTML = '';
  try {
    const o = await api(`/api/orders/${encodeURIComponent(oid)}?email=${encodeURIComponent(email)}`);
    if (o.status !== 'Delivered') throw new Error(`Your order is "${o.status}". You can review once it is delivered.`);
    o.items.forEach(i => $('#forms').appendChild(formFor(i, oid, email.trim().toLowerCase())));
  } catch (e) { $('#ferr').textContent = e.message; }
}
$('#find').onsubmit = e => { e.preventDefault(); find(e.target.oid.value.trim(), e.target.email.value.trim()); };

api('/api/uploads/mode').then(m => mode = m).catch(() => {});
loadList().catch(() => {});
const qs = new URLSearchParams(location.search);
if (qs.get('id')) { $('#find').oid.value = qs.get('id'); $('#find').email.value = qs.get('email') || ''; find(qs.get('id'), qs.get('email') || ''); $('#write').scrollIntoView(); }
