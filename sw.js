/* sw.js — Golapi Shop Offline Service Worker (network-first, so live fixes always reach users) */
const CACHE = 'golapi-v4';
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
  '/js/features.js',
  '/js/payment.js',
  '/js/sms.js',
  '/js/page-loader.js',
  '/js/app.js',
  '/js/update-check.js',
  '/js/deep-links.js',
  '/js/firebase-init.js',
  '/js/memo.js',
  '/js/livemap.js',
  '/js/location.js',
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
  '/pages/topbar.html',
  '/pages/header.html',
  '/pages/cart-drawer.html',
  '/pages/footer.html',
  '/pages/mobnav.html',
  '/pages/chat-widget.html',
  '/pages/modals.html',
  '/pages/toast.html',
  '/icons/head_logo.webp',
  '/icons/dr_logo.webp',
  '/icons/chat_logo.webp',
  '/icons/driver_logo.webp',
  '/icons/zone_manager_logo.webp',
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

/* NETWORK-FIRST: সবসময় আগে নেটওয়ার্ক থেকে নতুন ভার্সন আনার চেষ্টা করে,
   ব্যর্থ হলে (অফলাইন) তখনই ক্যাশ থেকে দেখায়। এতে নতুন ডিপ্লয়মেন্ট সাথে সাথে সব ইউজার পাবে। */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.startsWith('https://fonts'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('/offline.html');
          if (e.request.destination === 'image') return caches.match('/icons/head_logo.webp');
        });
      })
  );
});