// Pages: network first (fresh prices), cache fallback offline. Static assets: cache first. API: never cached.
const C = 'am-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['/', '/logo.png?v=2', '/css/style.css?v=4', '/css/home.css?v=3']))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api')) return;
  const isStatic = /^\/(img|css|js)\/|\.(png|jpe?g|svg)$/.test(u.pathname);
  e.respondWith(isStatic
    ? caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); return res; }))
    : fetch(e.request).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); return res; }).catch(() => caches.match(e.request).then(r => r || caches.match('/'))));
});
