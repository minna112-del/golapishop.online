/* sw.js — Golapi Shop Offline Service Worker (network-first) */
const CACHE = 'golapi-v14';
const OFFLINE_URL = '/offline.html';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  OFFLINE_URL,
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
  '/pages/home.html',
  '/pages/listing.html',
  '/pages/product.html',
  '/pages/checkout.html',
  '/pages/order-success.html',
  '/pages/myorders.html',
  '/pages/account.html',
  '/pages/account-addresses.html',
  '/pages/wishlist.html',
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
  '/icons/head_logo-192.webp',
  '/icons/dr_logo.webp',
  '/icons/chat_logo.webp',
  '/icons/driver_logo.webp',
  '/icons/zone_manager_logo.webp'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      const results = await Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      );

      const failed = results
        .map((result, index) => ({ result, asset: ASSETS[index] }))
        .filter(entry => entry.result.status === 'rejected');

      if (failed.length) {
        console.warn(
          '[service-worker] কিছু asset pre-cache করা যায়নি:',
          failed.map(entry => entry.asset)
        );
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
      self.clients.claim()
    ]).then(() => self.clients.matchAll({ type: 'window' }))
      .then(clientsArr => clientsArr.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE })))
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok && request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match(OFFLINE_URL);
        return Response.error();
      })
  );
});

/* ═══════════════════════════════════════════════════════════
   Firebase Cloud Messaging — ব্যাকগ্রাউন্ড push notification
   (আগে firebase-messaging-sw.js-এ আলাদা register হতো, একই origin-এ
   দুটো আলাদা SW একসাথে থাকতে পারে না বলে এখানেই merge করে দেওয়া হলো —
   এখন শুধু এই একটা sw.js-ই register হবে, js/app.js থেকে)
   ═══════════════════════════════════════════════════════════ */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBdtIlcoPFFqzkI6X9KOIH-f4QAyEfH4o8",
  authDomain: "golapishoponline.firebaseapp.com",
  projectId: "golapishoponline",
  storageBucket: "golapishoponline.firebasestorage.app",
  messagingSenderId: "871653454194",
  appId: "1:871653454194:web:67e207a7df46503169edeb"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification?.title || 'নতুন অর্ডার!',
    {
      body: payload.notification?.body || 'নতুন অর্ডার এসেছে',
      icon: '/icons/head_logo.webp',
      badge: '/icons/head_logo.webp',
      tag: 'order-' + Date.now(),
      renotify: true,
      vibrate: [300, 100, 300],
      requireInteraction: true,
      data: payload.data || {}
    }
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.postMessage({ type: 'OPEN_ZM' });
          return c.focus();
        }
      }
      return clients.openWindow(self.location.origin + '#zone-manager');
    })
  );
});