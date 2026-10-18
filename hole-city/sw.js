// Offline support. Network-first so a new build shows up as soon as you're online;
// falls back to the cached copy when offline. Bump VERSION when shipping.
const VERSION = 'hole-city-v3.2.0';
const FILES = ['./',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './css/style.css',
  './fonts/fredoka-latin-500-normal.woff2',
  './fonts/fredoka-latin-600-normal.woff2',
  './fonts/fredoka-latin-700-normal.woff2',
  './index.html',
  './js/audio.js',
  './js/bots.js',
  './js/catalog.js',
  './js/config.js',
  './js/fx.js',
  './js/game.js',
  './js/gentools.js',
  './js/geo.js',
  './js/holes.js',
  './js/hud.js',
  './js/input.js',
  './js/levels/01-city.js',
  './js/levels/02-suburbia.js',
  './js/levels/03-beach.js',
  './js/levels/04-farm.js',
  './js/levels/05-funland.js',
  './js/levels/06-frost.js',
  './js/levels/07-neon.js',
  './js/levels/08-gulch.js',
  './js/levels/09-dino.js',
  './js/levels/10-moon.js',
  './js/levels/registry.js',
  './js/main.js',
  './js/math.js',
  './js/menus.js',
  './js/movers.js',
  './js/physics.js',
  './js/progress.js',
  './js/render.js',
  './js/util.js',
  './js/world.js',
  './manifest.webmanifest',
  './vendor/cannon.min.js',
  './vendor/three.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))));
});
