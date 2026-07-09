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
  document.getElementById('t-h').textContent = bn(String(h).padStart(2,'0'));
  document.getElementById('t-m').textContent = bn(String(m).padStart(2,'0'));
  document.getElementById('t-s').textContent = bn(String(s).padStart(2,'0'));
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

/* ---------- Init ---------- */
Router.go('home', {}, {skipHash:true});
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(e=>devWarn('SW failed', e.message)); });
}

/* ---------- TWA Role Routing ----------
   Driver APK    → https://www.golapishop.online/?role=driver
   Zone Manager  → https://www.golapishop.online/?role=zone-manager
*/
(function(){
  const role = new URLSearchParams(window.location.search).get('role');
  if(role === 'driver')            setTimeout(()=>Router.go('driver'), 300);
  else if(role === 'zone-manager') setTimeout(()=>Router.go('zone-manager'), 300);
})();