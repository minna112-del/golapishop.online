let FB = null;
let firebaseStarted = false;

function startFirebaseFeatures() {
  window.__pushDebug?.('startFirebaseFeatures() কল, firebaseStarted=' + firebaseStarted + ', __fb=' + (!!window.__fb));
  if (firebaseStarted || !window.__fb) return;

  firebaseStarted = true;
  FB = window.__fb;
  window.__pushDebug?.('FB সেট হয়েছে');

  /*
   * Auth-এর কোনো সমস্যা হলেও product loading বন্ধ হবে না।
   */
  try {
    Auth.init();
  } catch (error) {
    console.error('Auth initialization failed:', error);
    window.__pushDebug?.('Auth.init CATCH: ' + error.message);
  }

  /*
   * Product sync আলাদাভাবে অবশ্যই শুরু হবে।
   */
  try {
    ProductStore.startLiveSync();
  } catch (error) {
    console.error('Product sync initialization failed:', error);
    window.__pushDebug?.('ProductStore.startLiveSync CATCH: ' + error.message);
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
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        // প্রতিবার page load-এ Service Worker-এর নতুন version পরীক্ষা করুন।
        await registration.update();

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