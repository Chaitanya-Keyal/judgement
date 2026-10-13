// Precache the whole app so it works offline (e.g. at a card table with no signal).
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE = `judgement-${version}`;

// Manifest paths are relative to the app root ('' is the home page): make them absolute.
const absolute = (f: { path: string }) => new URL(`./${f.path}`, self.location.href).pathname;
const IMMUTABLE = new Set(immutable.map(absolute));
const PRECACHE = [...IMMUTABLE, ...assets.map(absolute), ...prerendered.map(absolute)];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const url = new URL(req.url);
      // Hashed build files never change: serve them straight from the cache.
      if (IMMUTABLE.has(url.pathname)) {
        const hit = await cache.match(url.pathname);
        if (hit) return hit;
      }
      // Pages and everything else: network first, so a deploy shows up on the next load,
      // falling back to the cache when offline.
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req)) ?? (await cache.match('/')) ?? Response.error();
      }
    })(),
  );
});
