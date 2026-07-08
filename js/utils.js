/* utils.js — helpers, constants, toast system */
const isDev = location.hostname==='localhost' || location.hostname==='127.0.0.1';
function devWarn(...a){ if(isDev) console.warn(...a); }

function toast(msg,type='info'){
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='error'?'err':type==='success'?'ok':'');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}

/* ---------- Static data ---------- */
const CATEGORIES = [
  {id:'medicine',label:'ঔষধ',icon:'💊'},{id:'grocery',label:'মুদি বাজার',icon:'🛒'},
  {id:'confectionery',label:'কনফেকশনারি',icon:'🍬'},{id:'stationery',label:'স্টেশনারি',icon:'📒'},
  {id:'gas',label:'গ্যাস সিলিন্ডার',icon:'🔥'},{id:'mobile',label:'মোবাইল',icon:'📱'},
  {id:'watch',label:'ঘড়ি ও ব্যাটারি',icon:'⌚'},{id:'cosmetics',label:'কসমেটিকস',icon:'💄'},
  {id:'clothing',label:'জামা-কাপড়',icon:'👕'},{id:'furniture',label:'ফার্নিচার',icon:'🪑'}
];
const AREA_ZONES = {
  noakhali_sadar: ['মাইজদী কোর্ট','সোনাপুর','লক্ষ্মীনারায়ণপুর','বিনোদপুর','চরমটুয়া','নোয়াখালী শহর','ধর্মপুর'],
  begumganj: ['বেগমগঞ্জ সদর','রাজগঞ্জ','সোনাইমুড়ী রোড','একলাশপুর','দুর্গাপুর','শরীফপুর','চাটখিল রোড','নাটেশ্বর']
};
const BRANCH_INFO = {
  noakhali_sadar:{label:'নোয়াখালী সদর',address:'মাইজদী বাজার, সদর, নোয়াখালী',managerName:'রিমন',managerPhone:'+880 1627-010060',bkashNumber:'01627010060',nagadNumber:'01627010060'},
  begumganj:{label:'বেগমগঞ্জ',address:'আমানতপুর, বেগমগঞ্জ, নোয়াখালী',managerName:'সৃজন',managerPhone:'+880 1310-006959',bkashNumber:'01310006959',nagadNumber:'01310006959'}
};
const AREA_LABELS = {noakhali_sadar:BRANCH_INFO.noakhali_sadar.label, begumganj:BRANCH_INFO.begumganj.label};
const ORDER_STATUS = {
  pending:{label:'পেন্ডিং',cls:'pending'}, confirmed:{label:'কনফার্মড',cls:'confirmed'},
  assigned:{label:'ড্রাইভার অ্যাসাইনড',cls:'confirmed'}, picked_up:{label:'পিকআপ হয়েছে',cls:'confirmed'},
  in_transit:{label:'ডেলিভারির পথে',cls:'confirmed'}, delivered:{label:'ডেলিভারি সম্পন্ন',cls:'delivered'},
  cancelled:{label:'বাতিল',cls:'cancelled'}
};
const MED_LIST = [
  {icon:'👨‍⚕️',name:'ডাঃ রহিম উদ্দিন',spec:'মেডিসিন বিশেষজ্ঞ',sched:'প্রতিদিন সকাল ৯টা - দুপুর ২টা'},
  {icon:'👩‍⚕️',name:'ডাঃ করিনা আক্তার',spec:'গাইনি ও প্রসূতি',sched:'শনি ও সোম বিকাল ৪টা - রাত ৮টা'},
  {icon:'🧒',name:'ডাঃ আবুল কালাম',spec:'শিশু বিশেষজ্ঞ',sched:'রবি ও বুধ সকাল ১০টা - দুপুর ১টা'},
  {icon:'🦷',name:'ডাঃ সালমা সুলতানা',spec:'ডেন্টাল সার্জন',sched:'শুক্র বিকাল ৩টা - রাত ৭টা'},
  {icon:'❤️',name:'ডাঃ জাকির হোসেন',spec:'কার্ডিওলজি',sched:'মাসের ১ম ও ৩য় রবিবার'},
  {icon:'👁️',name:'ডাঃ নাফিসা আহমেদ',spec:'চক্ষু বিশেষজ্ঞ',sched:'প্রতি মঙ্গলবার সকাল ৯টা - ১২টা'}
];

function money(n){
  const num = Number(n||0).toLocaleString('en-IN');
  const map = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
  return '৳' + num.replace(/[0-9]/g, d=>map[d]);
}
function bn(n){ const map={'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'}; return String(n).replace(/[0-9]/g,d=>map[d]); }
function skeletonCards(n=4){
  return Array.from({length:n}).map(()=>`<div class="pcard" style="pointer-events:none"><div class="imgwrap" style="background:linear-gradient(90deg,#131c2e 25%,#1a2740 50%,#131c2e 75%);background-size:200% 100%;animation:shimmer 1.4s infinite"></div><div class="pbody"><div style="height:12px;background:var(--line);border-radius:4px;margin-bottom:8px;width:80%"></div><div style="height:16px;background:var(--line);border-radius:4px;width:50%"></div></div></div>`).join('');
}