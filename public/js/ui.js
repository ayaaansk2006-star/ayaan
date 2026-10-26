// Page chrome: scroll reveal, progress bar, menu, counters, mobile cart bar.
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
function observeReveal() { document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el)); }
observeReveal();

addEventListener('scroll', () => {
  const h = document.documentElement;
  $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  $('#toTop').classList.toggle('show', h.scrollTop > 700);
}, { passive: true });
$('#toTop').onclick = () => scrollTo({ top: 0 });

$('#burger').onclick = () => $('#nav').classList.toggle('open');
document.querySelectorAll('#nav a').forEach(a => a.onclick = () => $('#nav').classList.remove('open'));

document.querySelectorAll('[data-count]').forEach(el => {
  const end = +el.dataset.count, t0 = performance.now();
  const tick = t => { const k = Math.min((t - t0) / 1200, 1); el.textContent = Math.round(end * k); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

function syncBar() {
  const c = Cart.get();
  $('#mbar').classList.toggle('show', c.length > 0);
  $('#mword').textContent = c.reduce((s, i) => s + i.qty, 0) === 1 ? 'item' : 'items';
  $('#mtotal').textContent = inr(c.reduce((s, i) => s + i.unit * i.qty, 0));
}
const _render = Cart.render;
Cart.render = () => {
  _render();
  syncBar();
  document.querySelectorAll('.cart-count').forEach(e => { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); });
};
syncBar();
