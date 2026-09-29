// Caches the page, logo and background so the signage loads instantly and survives wifi drops.
// Weather data is NOT handled here; index.html keeps its own cache for that.
const CACHE = 'hprime-signage-v2';
const LOCAL = ['./', './index.html', './bg.jpg', './logo.png'];
const REMOTE = [
  'https://raw.githubusercontent.com/evildee09-glitch/HprimeWeather/main/East%20Wing.jpg',
  'https://raw.githubusercontent.com/evildee09-glitch/HprimeWeather/main/HENANN%20PRIME%20Beach%20Resort%20Logo_white.png'
];

// Download everything once, up front, so it is stored even if the first visit is slow.
// Each file is independent: a missing one (e.g. no local bg.jpg yet) never blocks the rest.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled([
    ...LOCAL.map(u => c.add(u)),
    ...REMOTE.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)))
  ])));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.open-meteo.com') return;

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  e.respondWith(caches.match(req).then(hit => {
    // Images: cache only, no re-download on every load (saves bandwidth on slow links).
    // To ship a new photo, bump CACHE above.
    if (hit && !isPage) return hit;

    // Page: show the cached copy instantly and refresh it quietly in the background.
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
