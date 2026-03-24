const CACHE_NAME = 'quran-pwa-cache-v1';
const urlsToCache = [
'./',
'./index.html',
'./manifest.json',
'./icon-192.png',
'./icon-512.png'
];

// Install Service Worker dan simpan cache
self.addEventListener('install', event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
return cache.addAll(urlsToCache);
})
);
self.skipWaiting();
});

// Hapus cache lama saat ada versi baru
self.addEventListener('activate', event => {
event.waitUntil(
caches.keys().then(cacheNames => {
return Promise.all(
cacheNames.map(cacheName => {
if (cacheName !== CACHE_NAME) {
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
event.respondWith(
caches.match(event.request)
.then(response => {
// Return cache if found, else fetch from network
return response || fetch(event.request).catch(() => {
// Opsional: Return fallback offline page jika ada
});
})
);
});