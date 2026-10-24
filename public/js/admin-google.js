// Admin tab: copy real Google reviews from the Google Maps listing so they show on the homepage.
async function renderGoogle() {
  const list = await api('/api/admin/google-reviews');
  $('#view').innerHTML = `<form class="form" id="gForm" style="margin-bottom:18px"><b>Add a Google review</b>
    <small style="color:var(--muted)">Open your shop on Google Maps → Reviews, then copy one review here exactly as written.</small>
    <div class="two"><input name="name" required maxlength="60" placeholder="Reviewer name (as on Google)">
      <select name="rating" required><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></div>
    <textarea name="text" required maxlength="1000" rows="3" placeholder="Review text"></textarea>
    <input name="posted" maxlength="30" placeholder="When (optional), e.g. 2 months ago">
    <button class="btn">Add review</button><div class="err" id="gErr"></div></form>
    ${list.length ? `<table><tr><th>Name</th><th>Stars</th><th>Review</th><th></th></tr>${list.map(r => `<tr><td>${esc(r.name)}<br><small>${esc(r.posted || '')}</small></td>
      <td>${r.rating}/5</td><td>${esc(r.text)}</td><td><button class="btn ghost" style="padding:8px 12px" data-gdel="${r.id}">Remove</button></td></tr>`).join('')}</table>`
      : '<p>No Google reviews added yet. They appear on the homepage as soon as you add the first one.</p>'}`;
  $('#gForm').onsubmit = async e => {
    e.preventDefault();
    try { await api('/api/admin/google-reviews', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Added'); renderGoogle(); }
    catch (err) { $('#gErr').textContent = err.message; }
  };
  document.querySelectorAll('[data-gdel]').forEach(b => b.onclick = async () => {
    if (confirm('Remove this review from the website?')) { await api('/api/admin/google-reviews/' + b.dataset.gdel, { method: 'DELETE' }); renderGoogle(); }
  });
}
