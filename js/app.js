/* app.js — bootstrap: firebase-ready hook, flash timer, init, service worker */
let FB = null;
window.addEventListener('firebase-ready', ()=>{
  FB = window.__fb;
  Auth.init();
  ProductStore.startLiveSync();
});

/* ---------- Flash timer ---------- */
function getFlashDeadlineSeconds(){
  const now=new Date(); const dl=new Date(); dl.setHours(20,0,0,0);
  if(now>=dl) dl.setDate(dl.getDate()+1);
  return Math.floor((dl-now)/1000);
}
let flashSec = getFlashDeadlineSeconds();
setInterval(()=>{
  flashSec = flashSec>0 ? flashSec-1 : getFlashDeadlineSeconds();
  const h=Math.floor(flashSec/3600), m=Math.floor((flashSec%3600)/60), s=flashSec%60;
  const hEl=document.getElementById('t-h');
  const mEl=document.getElementById('t-m');
  const sEl=document.getElementById('t-s');
  if(hEl) hEl.textContent = bn(String(h).padStart(2,'0'));
  if(mEl) mEl.textContent = bn(String(m).padStart(2,'0'));
  if(sEl) sEl.textContent = bn(String(s).padStart(2,'0'));
},1000);

/* ---------- Bangla / English toggle ---------- */
let currentLang = localStorage.getItem('golapi_lang') || 'bn';
function applyLang(){
  document.querySelectorAll('[data-bn][data-en]').forEach(el=>{ el.innerHTML = el.dataset[currentLang]; });
  document.documentElement.lang = currentLang;
  const label = document.getElementById('langBtnLabel');
  if(label) label.textContent = currentLang==='bn' ? 'EN' : 'বাং';
}
function toggleLang(){
  currentLang = currentLang==='bn' ? 'en' : 'bn';
  localStorage.setItem('golapi_lang', currentLang);
  applyLang();
}
applyLang();

/* ---------- Init — pages-ready এর পরে --------- */
function initApp(){
  Router.go('home', {}, {skipHash:true});
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{ navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(e=>devWarn('SW failed', e.message)); });
  }
}

// Dynamic page loading-এর সাথে compatible
if(document.getElementById('page-home')){
  // Pages already in DOM (direct index.html without loader)
  initApp();
} else {
  // Wait for page-loader.js to inject pages
  document.addEventListener('pages-ready', initApp);
}

/* ---------- TWA Role Routing ---------- */
(function(){
  const role = new URLSearchParams(window.location.search).get('role');
  function doRoute(){
    if(role === 'driver')            Router.go('driver');
    else if(role === 'zone-manager') Router.go('zone-manager');
  }
  if(document.getElementById('page-driver')) doRoute();
  else document.addEventListener('pages-ready', doRoute);
})();