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

/* ---------- Init ---------- */
Router.go('home', {}, {skipHash:true});
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(e=>devWarn('SW failed', e.message)); });
}