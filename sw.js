const CACHE_NAME = 'ost-tracker-shell-v5-no-direct-button';
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];
const OPTIONAL_ASSETS = [
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

function logSwError(context, err) {
  console.error('[OST SW] ' + context + ':', (err && err.message) || err, err);
}

function offlineResponse(message) {
  return new Response(message, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(CORE_ASSETS);
    } catch (err) {
      // Instalasi harus gagal bila shell inti tidak dapat dicache, tetapi penyebabnya dicatat dulu.
      logSwError('Core asset gagal dicache', err);
      throw err;
    }
    const optional = await Promise.allSettled(OPTIONAL_ASSETS.map(url => cache.add(url)));
    optional.forEach((result, i) => {
      if (result.status === 'rejected') logSwError('Asset opsional dilewati: ' + OPTIONAL_ASSETS[i], result.reason);
    });
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(event.request);
      } catch (err) {
        logSwError('Navigasi gagal, memakai shell cache untuk ' + url.pathname, err);
        const cached = await caches.match('/');
        return cached || offlineResponse('OST Tracker sedang offline dan shell aplikasi belum tersimpan di cache.');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        // Kegagalan menyimpan cache tidak boleh membatalkan response yang sudah berhasil.
        cache.put(event.request, response.clone()).catch(err => logSwError('Gagal menyimpan cache ' + url.pathname, err));
      }
      return response;
    } catch (err) {
      logSwError('Request gagal untuk ' + url.pathname, err);
      return cached || offlineResponse('Resource ' + url.pathname + ' tidak tersedia saat offline.');
    }
  })());
});
