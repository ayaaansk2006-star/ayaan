// Fit finder, homepage reviews, install-as-app button.
window.STAR = on => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m12 2 3 7 7 .6-5.3 4.6 1.6 7.3L12 17.8 5.7 21.5l1.6-7.3L2 9.6 9 9z"/></svg>`;
window.stars = n => [1, 2, 3, 4, 5].map(i => STAR(i <= n)).join('');

function initFinder() {
  const brands = [...new Set(products.map(p => p.brand))];
  $('#fBrand').innerHTML = '<option value="">Select brand</option>' + brands.map(b => `<option>${esc(b)}</option>`).join('');
  $('#fBrand').onchange = () => {
    const b = $('#fBrand').value;
    const bikes = [...new Set(products.filter(p => p.brand === b).map(p => p.bike))];
    $('#fModel').innerHTML = '<option value="">Select model</option>' + bikes.map(m => `<option>${esc(m)}</option>`).join('');
    $('#fModel').disabled = !b; $('#fGo').disabled = true; $('#fResult').textContent = '';
  };
  $('#fModel').onchange = () => {
    const n = products.filter(p => p.bike === $('#fModel').value).length;
    $('#fGo').disabled = !n;
    $('#fResult').innerHTML = n ? `<span class="lime">●</span> ${n} part${n > 1 ? 's' : ''} made for the ${esc($('#fModel').value)}` : '';
  };
  $('#fGo').onclick = () => {
    brand = $('#fBrand').value; model = $('#fModel').value; query = ''; $('#search').value = '';
    document.querySelectorAll('#filters button').forEach(x => x.classList.toggle('on', x.dataset.brand === brand));
    renderModels(); renderGrid();
    $('#shop').scrollIntoView({ behavior: 'smooth' });
  };
}

async function initReviews() {
  const list = await api('/api/reviews').catch(() => []);
  if (!list.length) return;
  $('#reviews').hidden = false;
  $('#revGrid').innerHTML = list.map(r => {
    const p = products.find(x => x.slug === r.slug);
    return `<div class="rev reveal"><div class="lime">${stars(r.rating)}</div><p>“${esc(r.text)}”</p>
      <small><b>${esc(r.name)}</b> · ${esc(p ? p.bike : '')} · Verified buyer</small></div>`;
  }).join('');
  observeReveal();
}

let installEvt;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#installApp').hidden = false; });
$('#installApp').onclick = async e => {
  e.preventDefault();
  if (!installEvt) return;
  installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#installApp').hidden = true;
};

const waitProducts = setInterval(() => {
  if (!products.length) return;
  clearInterval(waitProducts); initFinder(); initReviews();
}, 100);
