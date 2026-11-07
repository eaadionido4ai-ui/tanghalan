// TANGHALAN's service worker: it keeps a copy of the museum's own files on the device, so the app opens and plays
// with no internet. The build (pwa/plugin.js) fills in VERSION and FILES and saves this as dist/sw.js.
// It stores nothing about the visitor and sends nothing anywhere: it only answers the app's own file requests.

const VERSION = /*VERSION*/'dev';
const FILES = /*FILES*/[];
const PREFIX = 'tanghalan-';
const CACHE = PREFIX + VERSION;
const SHELL = new URL('index.html', self.registration.scope).href;

// Save every file of this version. Files under assets/ have their contents in their names, so a copy the browser
// already has is fine; the rest (index.html, the manifest, the icons) are fetched fresh so they match this version.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(FILES.map((f) => new Request(f, { cache: f.startsWith('assets/') ? 'default' : 'reload' })))));
});

// A new version waits until the visitor taps Update on the home page (or closes the app), so a visit is never
// switched halfway. The app sends this message when they tap it.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Clear out older TANGHALAN versions only (other apps on the same site keep their files), then look after the
// open page right away.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Saved copy first, the internet only for something that was not saved.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const page = req.mode === 'navigate' && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  event.respondWith((async () => {
    const hit = await caches.match(page ? SHELL : req, { cacheName: CACHE, ignoreSearch: page });
    return hit || fetch(req);
  })());
});
