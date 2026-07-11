let FB=null;
window.addEventListener('firebase-ready',()=>{FB=window.__fb;Auth.init();ProductStore.startLiveSync();});
let flashSec=getFlashDeadline();
function getFlashDeadline(){const n=new Date(),d=new Date();d.setHours(20,0,0,0);if(n>=d)d.setDate(d.getDate()+1);return Math.floor((d-n)/1000);}
setInterval(()=>{
  flashSec=flashSec>0?flashSec-1:getFlashDeadline();
  const h=Math.floor(flashSec/3600),m=Math.floor((flashSec%3600)/60),s=flashSec%60;
  const hEl=document.getElementById('t-h'),mEl=document.getElementById('t-m'),sEl=document.getElementById('t-s');
  if(hEl)hEl.textContent=bn(String(h).padStart(2,'0'));
  if(mEl)mEl.textContent=bn(String(m).padStart(2,'0'));
  if(sEl)sEl.textContent=bn(String(s).padStart(2,'0'));
},1000);
let currentLang=localStorage.getItem('golapi_lang')||'bn';
function applyLang(){document.querySelectorAll('[data-bn][data-en]').forEach(el=>{el.innerHTML=el.dataset[currentLang];});document.documentElement.lang=currentLang;const l=document.getElementById('langBtnLabel');if(l)l.textContent=currentLang==='bn'?'EN':'বাং';}
function toggleLang(){currentLang=currentLang==='bn'?'en':'bn';localStorage.setItem('golapi_lang',currentLang);applyLang();}
applyLang();
function isEmergencyHours(){const h=new Date().getHours();return h>=0&&h<6;}
function updateEmergencyBanner(){const b=document.getElementById('emergencyBanner');if(!b)return;if(isEmergencyHours()){b.style.display='flex';}else{b.style.display='none';}}
function initApp(){
  Router.go('home',{},{skipHash:true});
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(e=>devWarn(e)));
  const role=new URLSearchParams(window.location.search).get('role');
  if(role==='driver')setTimeout(()=>Router.go('driver'),300);
  else if(role==='zone-manager')setTimeout(()=>Router.go('zone-manager'),300);
  updateEmergencyBanner();
  setInterval(updateEmergencyBanner,60000);
}
document.addEventListener('DOMContentLoaded',initApp);