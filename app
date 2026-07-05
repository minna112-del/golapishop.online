let FB = null;
window.addEventListener('firebase-ready', () => {
  FB = window.__fb;
  Auth.init();
  ProductStore.startLiveSync(); // এখন থেকে প্রোডাক্ট ডাটা সবসময় Firestore-এর সাথে লাইভ সিঙ্কড থাকবে
});

/* ---------- Floating AI Chat Widget (customer support assistant) ----------
   প্রতিটা মেসেজ Anthropic API-তে যায় (Claude), পুরো shop-context সহ একটা system
   prompt পাঠানো হয় যাতে AI সঠিকভাবে ডেলিভারি/পেমেন্ট/নীতি সংক্রান্ত প্রশ্নের উত্তর
   দিতে পারে। API key এখানে দরকার নেই — fetch সরাসরি endpoint-এ যায়। */
/* ---------- Push Notification System ----------
   Zone Manager-কে নতুন অর্ডারের push notification পাঠায়। কাস্টমার অর্ডার করলে
   placeOrder() থেকে NotificationSystem.send() কল হয়, এবং সংশ্লিষ্ট Zone Manager-এর
   ব্রাউজারে real-time notification আসে, এমনকি ট্যাব বন্ধ থাকলেও (background push)।
   এর জন্য firebase-messaging-sw.js ফাইলটা Netlify-তে root-এ আপলোড করা জরুরি। */