/* sw.js — Golapi Shop Offline Service Worker */
const CACHE = 'golapi-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/style.css',
  '/css/components.css',
  '/js/utils.js',
  '/js/data.js',
  '/js/store.js',
  '/js/services.js',
  '/js/router.js',
  '/js/auth.js',
  '/js/widgets.js',
  '/js/pages.js',
  '/js/driver.js',
  '/js/zone-manager.js',
  '/js/admin.js',
  '/js/app.js',
  '/js/firebase-init.js',
  '/pages/home.html',
  '/pages/listing.html',
  '/pages/product.html',
  '/pages/checkout.html',
  '/pages/order-success.html',
  '/pages/myorders.html',
  '/pages/account.html',
  '/pages/account-addresses.html',
  '/pages/about-app.html',
  '/pages/privacy-info.html',
  '/pages/terms.html',
  '/pages/contact.html',
  '/pages/custom-bazar.html',
  '/pages/medical.html',
  '/pages/admin-dash.html',
  '/pages/zone-manager.html',
  '/pages/driver.html',
  '/partials/topbar.html',
  '/partials/header.html',
  '/partials/cart-drawer.html',
  '/partials/footer.html',
  '/partials/mobnav.html',
  '/partials/chat-widget.html',
  '/partials/modals.html',
  '/partials/toast.html',
  '/icons/head_logo.jpeg',
  '/icons/dr_logo.jpeg',
  '/icons/chat_logo.jpeg',
  'https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.startsWith('https://fonts'))) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          if (e.request.mode === 'navigate') return caches.match('/offline.html');
          if (e.request.destination === 'image') return caches.match('/icons/head_logo.jpeg');
        });
    })
  );
});