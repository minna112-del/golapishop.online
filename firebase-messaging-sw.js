/* Golapi Shop root service worker: Firebase messaging + always-fresh site updates */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBdtIlcoPFFqzkI6X9KOIH-f4QAyEfH4o8',
  authDomain: 'golapishoponline.firebaseapp.com',
  projectId: 'golapishoponline',
  storageBucket: 'golapishoponline.firebasestorage.app',
  messagingSenderId: '871653454194',
  appId: '1:871653454194:web:67e207a7df46503169edeb'
});

const messaging = firebase.messaging();
const CACHE_PREFIX = 'golapi-';
const CACHE_NAME = 'golapi-runtime-v5';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => undefined)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

/*
 * Online অবস্থায় সব same-origin HTML/CSS/JS/page request সরাসরি network থেকে আসে।
 * Request/HTTP cache bypass করা হয়, তাই নতুন deploy পুরনো browser cache-এ আটকে থাকে না।
 * Offline হলে কেবল offline page দেখানো হয়; পুরনো application shell পরিবেশন করা হয় না।
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      return await fetch(new Request(request, { cache: 'no-store' }));
    } catch (error) {
      if (request.mode === 'navigate') {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
      throw error;
    }
  })());
});

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification?.title || '🌹 নতুন অর্ডার!',
    {
      body: payload.notification?.body || 'নতুন অর্ডার এসেছে',
      icon: '/icons/head_logo.webp',
      badge: '/icons/head_logo.webp',
      tag: `order-${Date.now()}`,
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
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'OPEN_ZM' });
          return client.focus();
        }
      }
      return clients.openWindow(`${self.location.origin}#zone-manager`);
    })
  );
});
