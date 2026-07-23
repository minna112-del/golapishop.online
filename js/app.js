let FB = null;
let firebaseStarted = false;

/* ⚠️ এতদিন যত রিট্রাই/fallback লজিক বানানো হয়েছে (onSnapshot timeout → getDocs,
   getDocs ব্যর্থ হলে আবার চেষ্টা) — এগুলো সবই 'firebase-ready' ইভেন্ট ফায়ার হওয়ার
   পরের ধাপ। কিন্তু যদি Firebase SDK নিজেই (gstatic.com থেকে import) কোনো কারণে
   (নেটওয়ার্ক ব্লক, খুবই ধীর গতি, CDN সমস্যা) কখনো লোড না হয়, 'firebase-ready'
   কখনো fire-ই হয় না — আর নিচের কোনো retry logic-ই কখনো চালু হওয়ার সুযোগ পায় না,
   ব্যবহারকারী স্থায়ীভাবে skeleton দেখতে থাকে কোনো ব্যাখ্যা বা উপায় ছাড়াই।
   এই watchdog সেই সবচেয়ে-প্রথম ধাপটাই পাহারা দেয়। */
setTimeout(() => {
  if (!window.__fb && !firebaseStarted) {
    // ⚠️ আগে এখানে শুধু একটা floating banner দেখানো হতো — ProductStore.loaded
    // কখনো বদলাতো না, ফলে product grid অনির্দিষ্টকাল skeleton-এই থেকে যেতো,
    // যদিও banner-এ "সমস্যা হচ্ছে" লেখা ছিল। এখন ProductStore-কে সরাসরি জানানো
    // হচ্ছে, যাতে (cache থাকলে) cached data দেখায়, নাহলে grid-এর ভেতরেই
    // retry বাটনসহ error state দেখায় — endless skeleton না রেখে।
    if (typeof ProductStore !== 'undefined') {
      try { ProductStore.handleFirebaseUnavailable(); } catch (e) { console.error(e); }
    }

    const msg = document.createElement('div');
    msg.id = 'golapiConnErrBanner';
    msg.style.cssText = 'position:fixed;bottom:90px;left:16px;right:16px;background:#DC2626;color:#fff;padding:14px 16px;border-radius:12px;font-size:13px;z-index:9998;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)';
    msg.innerHTML = '⚠ সংযোগ স্থাপন করতে সমস্যা হচ্ছে।<br><button style="margin-top:8px;background:#fff;color:#DC2626;border:none;padding:8px 20px;border-radius:8px;font-weight:600" onclick="window.location.reload()">পুনরায় লোড করুন</button>';
    document.body.appendChild(msg);
  }
}, 15000);

// Firebase দেরিতে হলেও শেষ পর্যন্ত সফল হলে (retry script কাজ করেছে) — ততক্ষণে
// দেখানো error banner-টা আর প্রাসঙ্গিক না, স্বয়ংক্রিয়ভাবে সরিয়ে দেওয়া হয়।
window.addEventListener('firebase-ready', () => {
  const oldBanner = document.getElementById('golapiConnErrBanner');
  if (oldBanner) oldBanner.remove();
});

function startFirebaseFeatures() {
  if (firebaseStarted || !window.__fb) return;

  firebaseStarted = true;
  FB = window.__fb;

  /*
   * Auth-এর কোনো সমস্যা হলেও product loading বন্ধ হবে না।
   */
  try {
    Auth.init();
  } catch (error) {
    console.error('Auth initialization failed:', error);
  }

  /*
   * Product sync আলাদাভাবে অবশ্যই শুরু হবে।
   */
  try {
    ProductStore.startLiveSync();
  } catch (error) {
    console.error('Product sync initialization failed:', error);
  }
}

window.addEventListener(
  'firebase-ready',
  startFirebaseFeatures
);

/*
 * Firebase module আগে ready হয়ে গেলে সরাসরি শুরু করবে।
 */
if (window.__fb) {
  startFirebaseFeatures();
}
let currentLang=localStorage.getItem('golapi_lang')||'bn';
function applyLang(){document.querySelectorAll('[data-bn][data-en]').forEach(el=>{el.innerHTML=el.dataset[currentLang];});document.documentElement.lang=currentLang;const l=document.getElementById('langBtnLabel');if(l)l.textContent=currentLang==='bn'?'EN':'বাং';}
function toggleLang(){currentLang=currentLang==='bn'?'en':'bn';localStorage.setItem('golapi_lang',currentLang);applyLang();}
applyLang();

/* ---------- Cart abandonment reminder (client-side, no backend needed) ---------- */
function checkCartAbandonment(){
  try{
    const items = JSON.parse(localStorage.getItem('golapi_cart')||'{}');
    const count = Object.values(items).reduce((a,b)=>a+b,0);
    if(count<=0) return;
    const updatedAt = parseInt(localStorage.getItem('golapi_cart_time')||'0',10);
    if(!updatedAt) return;
    const ageMs = Date.now()-updatedAt;
    const oneHour = 60*60*1000;
    if(ageMs < oneHour) return;
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('golapi_cart_reminder_date');
    if(lastShown===today) return;
    localStorage.setItem('golapi_cart_reminder_date', today);
    setTimeout(()=>{
      toast(`🛍️ আপনার কার্টে ${count} টি পণ্য রয়ে গেছে — এখনই চেকআউট করে ফেলুন!`,'success');
    }, 1800);
  }catch(e){}
}

function initApp(){
  // ⚠️ আগে ProductStore.loadFromCache() শুধু startLiveSync()-এর ভেতরে চলতো, যেটা
  // Firebase ready হওয়ার আগে কখনো ডাকা হতো না। ফলে ব্রাউজারে valid cache থাকা
  // সত্ত্বেও Firebase load দেরি/ব্যর্থ হলে সেই cache দেখানো হতো না। এখন Firebase-এর
  // অপেক্ষা ছাড়াই, Router.go('home') কল হওয়ার আগেই cache load করা হচ্ছে —
  // Home.render() প্রথমবার চলার সময়ই cached পণ্য (থাকলে) দেখাবে।
  if (typeof ProductStore !== 'undefined' && !ProductStore.loaded) {
    ProductStore.loadFromCache();
  }

  const path=window.location.pathname.toLowerCase();
  const role=new URLSearchParams(window.location.search).get('role');
  const hash=window.location.hash.replace('#','');

  if(role==='driver'||path==='/driver'){
    setTimeout(()=>Router.go('driver'),200);
  } else if(role==='zone-manager'||path==='/manager'||path==='/zone-manager'){
    setTimeout(()=>Router.go('zone-manager'),200);
 } else if(hash && (document.getElementById('page-'+hash) || (window.__lazyPages||[]).includes(hash))){
    setTimeout(()=>Router.go(hash),200);
  } else {
    Router.go('home',{},{skipHash:true});
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // ═══════════════════════════════════════════════════════════
        // SELF-HEALING: এই ফিক্সের আগে যেসব ভিজিটরের ব্রাউজারে পুরনো/আটকে
        // থাকা service worker বা cache রয়ে গেছে, তাদের জন্য automatic
        // পরিষ্কার — Settings-এ গিয়ে ম্যানুয়ালি কিছু করতে হবে না। এটা
        // localStorage-এ একটা version marker রাখে, marker না মিললে
        // (মানে এই ব্রাউজার পুরনো কোনো ভার্সন থেকে আসছে) সব service worker
        // registration ও cache মুছে একবার reload করে, তারপর normal flow।
        const HEAL_VERSION = 'v2-selfheal';
        const storedVersion = localStorage.getItem('golapi_heal_version');
        if (storedVersion !== HEAL_VERSION && !sessionStorage.getItem('golapi_healing_done')) {
          sessionStorage.setItem('golapi_healing_done', '1');
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) { await reg.unregister(); }
          if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
          localStorage.setItem('golapi_heal_version', HEAL_VERSION);
          window.location.reload();
          return; // reload হয়ে যাচ্ছে, নিচের normal registration আর দরকার নেই এই পাসে
        }

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        // ⚠️ আগে প্রতিটা page load-এই registration.update() চলতো (বারবার
        // network request)। এখন সেশনে একবারই যথেষ্ট — sessionStorage দিয়ে
        // ট্র্যাক করা হয়, ট্যাব বন্ধ করে আবার খুললে (নতুন সেশন) আবার চেক হবে।
        if (!sessionStorage.getItem('golapi_sw_update_checked')) {
          sessionStorage.setItem('golapi_sw_update_checked', '1');
          await registration.update();
        }

        // নতুন worker control নিলে একবার reload করে latest files দেখান।
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (sessionStorage.getItem('golapi_sw_reloaded') === '1') return;
          sessionStorage.setItem('golapi_sw_reloaded', '1');
          window.location.reload();
        });
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    });
  }

  checkCartAbandonment();
}
document.addEventListener('pages-ready',initApp);

/* ⚠️ iOS/Android উভয় ব্রাউজারের back-forward cache (bfcache) — ব্যাক জেসচার/সোয়াইপ
   করলে ব্রাউজার মাঝে মাঝে আগের "freeze" করা পেজ অবস্থা (স্ক্রিপ্ট আবার না চালিয়েই)
   ফিরিয়ে আনে। যদি সেই freeze হওয়ার মুহূর্তে পেজ এখনো লোডিং/skeleton অবস্থায়
   ছিল, bfcache থেকে ফিরে এসেও সেই একই আটকে থাকা অবস্থাই দেখা যায় — যদিও
   আসল কোড ঠিকই আছে। এটা ধরে, দরকার হলে একবার fresh reload করানো হয়। */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    if (typeof ProductStore !== 'undefined' && !ProductStore.loaded) {
      window.location.reload();
    }
  }
});