const CACHE_NAME = 'quran-pwa-cache-v4'; // Versi dinaikkan agar HP otomatis update
const DYNAMIC_CACHE = 'quran-dynamic-data-v3';

// Aset statis kerangka aplikasi
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install Service Worker dan pre-cache aset statis
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Hapus cache lama saat ada versi baru
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategi Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. BYPASS AUDIO & API AL-QURAN (Karena sudah diurus IndexedDB)
  // Jangan simpan file MP3 dan jangan double-simpan data teks api.quran.com
  if (url.origin.includes('everyayah.com') || 
      url.pathname.endsWith('.mp3') || 
      event.request.destination === 'audio' ||
      url.pathname.includes('/api/v4/verses/by_page')) { 
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. TANGANI TAFSIR, FONT, DAN GAMBAR MUSHAF
  const isApiOrCdn = url.origin.includes('equran.id') || 
                     url.origin.includes('qurancdn.com') || 
                     url.origin.includes('jsdelivr.net') ||
                     url.origin.includes('fonts.googleapis.com') ||
                     url.origin.includes('fonts.gstatic.com') ||
                     url.origin.includes('android.quran.com');

  if (isApiOrCdn) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if(!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // 3. TANGANI FILE LOKAL (index.html dll)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response; 
          
          return fetch(event.request).then(fetchRes => {
            if(!event.request.url.startsWith('http')) return fetchRes;

            return caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, fetchRes.clone());
              return fetchRes;
            });
          });
        })
    );
  }
});
