const CACHE_NAME = 'quran-pwa-cache-v3'; // Versi dinaikkan
const DYNAMIC_CACHE = 'quran-dynamic-data-v2';

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

// Ambil dari cache jika offline, jika tidak ada ambil dari jaringan
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // === PENCEGAHAN CACHE AUDIO ===
  // Jika request adalah file audio (.mp3), dari everyayah.com, atau dikenali browser sebagai audio
  // Biarkan mengambil langsung dari internet dan jangan simpan di cache
  if (url.origin.includes('everyayah.com') || url.pathname.endsWith('.mp3') || event.request.destination === 'audio') {
    event.respondWith(fetch(event.request));
    return; // Hentikan eksekusi di sini agar tidak masuk ke logika cache di bawah
  }

  // 1. Tangani request ke API teks, CDN Font, Tafsir, dan Gambar Mushaf
  const isApiOrCdn = url.origin.includes('api.quran.com') || 
                     url.origin.includes('equran.id') || 
                     url.origin.includes('qurancdn.com') || 
                     url.origin.includes('jsdelivr.net') ||
                     url.origin.includes('fonts.googleapis.com') ||
                     url.origin.includes('fonts.gstatic.com') ||
                     url.origin.includes('android.quran.com');

  if (isApiOrCdn) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Jangan cache jika respons gagal atau tidak valid
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
          // Jika offline, cari di Dynamic Cache
          return caches.match(event.request);
        })
    );
  } else {
    // 2. Tangani file lokal (index.html, icon, manifest)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response; 
          
          return fetch(event.request).then(fetchRes => {
            // Pastikan URL valid (http/https) sebelum dicache (mencegah error dari ekstensi browser)
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
