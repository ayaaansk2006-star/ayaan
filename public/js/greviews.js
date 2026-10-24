// Google reviews entered by the owner in admin; hidden when there are none.
(async () => {
  const list = await api('/api/google-reviews').catch(() => []);
  if (!list.length) return $('#google-reviews').remove();
  const star = n => [1, 2, 3, 4, 5].map(i => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${i <= n ? '#FBBC04' : '#444'}"><path d="m12 2 3 7 7 .6-5.3 4.6 1.6 7.3L12 17.8 5.7 21.5l1.6-7.3L2 9.6 9 9z"/></svg>`).join('');
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  $('#gSummary').innerHTML = `<b style="font-size:22px">${avg.toFixed(1)}</b> ${star(Math.round(avg))} <small style="color:var(--muted)">· average of the ${list.length} review${list.length > 1 ? 's' : ''} shown here</small>`;
  // Slow right-to-left strip; the list is doubled so the loop is seamless (the copy is hidden from screen readers).
  const card = (r, dup) => `<div class="rev"${dup ? ' aria-hidden="true"' : ''}><div>${star(r.rating)}</div><p>${esc(r.text)}</p>
    <small>— ${esc(r.name)}${r.posted ? ' · ' + esc(r.posted) : ''} · on Google</small></div>`;
  const row = list.map(r => card(r)).join('');
  $('#gGrid').className = list.length > 2 ? 'g-track' : 'rev-grid';
  $('#gGrid').innerHTML = list.length > 2 ? `<div class="g-move" style="--n:${list.length}">${row}${list.map(r => card(r, 1)).join('')}</div>` : row;
})();
