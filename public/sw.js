// Cache GUGiK WMS tile responses by URL so revisits to already-rendered areas
// are instant. The full WMS URL (BBOX+WIDTH+LAYERS) is a unique tile key, so
// plain Cache API lookup is sufficient — no manual key derivation needed.
//
// Scope: only intercepts GUGiK cadastral hosts; everything else (Next.js
// assets, OSM tiles, ULDK calls) passes through untouched.

const CACHE_NAME = 'gugik-wms-v1';
const GUGIK_HOSTS = new Set([
  'integracja.gugik.gov.pl',
  'integracja01.gugik.gov.pl',
  'integracja02.gugik.gov.pl',
]);

self.addEventListener('install', (event) => {
  // Activate immediately on first install so the first map view benefits too.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any old cache versions.
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('gugik-wms-') && n !== CACHE_NAME).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (!GUGIK_HOSTS.has(url.hostname)) return;
  if (!url.pathname.includes('KrajowaIntegracjaEwidencjiGruntow')) return;
  // Only the GetMap requests are worth caching; let GetCapabilities pass through.
  if (!url.search.includes('REQUEST=GetMap')) return;

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  // Only cache successful image responses. Error responses must not poison the cache.
  if (response.ok) {
    const ct = response.headers.get('content-type') || '';
    if (ct.startsWith('image/')) {
      // clone() because the original body is consumed by the caller.
      cache.put(request, response.clone()).catch(() => {});
    }
  }
  return response;
}
