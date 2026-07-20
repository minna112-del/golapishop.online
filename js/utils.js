/* utils.js — helpers, constants, toast system */
const isDev = location.hostname==='localhost' || location.hostname==='127.0.0.1';
function devWarn(...a){ if(isDev) console.warn(...a); }

function toast(msg,type='info'){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='error'?'err':type==='success'?'ok':'');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}

const CATEGORIES = [
  {id:'medicine',label:'ঔষধ',icon:'💊'},
  {id:'grocery',label:'মুদি বাজার',icon:'🛒'},
  {id:'rice_pulses',label:'চাল-ডাল',icon:'🌾'},
  {id:'spices',label:'মসলা',icon:'🌶️'},
  {id:'edible_oil',label:'ভোজ্য তেল',icon:'🫙'},
  {id:'vegetables',label:'শাকসবজি ও ফল',icon:'🥦'},
  {id:'fish_meat',label:'মাছ-মাংস',icon:'🐟'},
  {id:'dairy_bakery',label:'দুধ ও বেকারি',icon:'🥛'},
  {id:'frozen_food',label:'ফজেন ফুড',icon:'🧊'},
  {id:'snacks',label:'নাস্তা ও চিপস',icon:'🍿'},
  {id:'beverages',label:'পানীয় ও জুস',icon:'🥤'},
  {id:'confectionery',label:'কনফেকশনারি',icon:'🍬'},
  {id:'stationery',label:'স্টেশনারি',icon:'📒'},
  {id:'gas',label:'গ্যাস সিলিন্ডার',icon:'🔥'},
  {id:'mobile',label:'মোবাইল এক্সেসরিজ',icon:'📱'},
  {id:'electronics',label:'ইলেকট্রনিক',icon:'🔌'},
  {id:'watch',label:'ঘড়ি ও ব্যাটারি',icon:'⌚'},
  {id:'cosmetics',label:'কসমেটিকস',icon:'💄'},
  {id:'personal_care',label:'পার্সোনাল কেয়ার',icon:'🧴'},
  {id:'clothing',label:'জামা-কাপড়',icon:'👕'},
  {id:'footwear',label:'জুতা',icon:'👞'},
  {id:'jewelry',label:'গহনা ও এক্সেসরিজ',icon:'💍'},
  {id:'furniture',label:'ফার্নিচার',icon:'🪑'},
  {id:'kitchen_tools',label:'রান্নাঘরের সরঞ্জাম',icon:'🍳'},
  {id:'toys',label:'খেলনা',icon:'🧸'},
  {id:'baby_care',label:'শিশু যত্ন',icon:'🍼'},
  {id:'home_care',label:'গৃহস্থালি ও পরিষ্র',icon:'🧹'},
  {id:'pet_care',label:'পোষা প্রাণীর যত্ন',icon:'🐾'},
  {id:'sports_fitness',label:'খেলাধুলা ও ফিটনেস',icon:'🏋️'},
  {id:'books_gifts',label:'বই ও উপহার',icon:'📚'},
  {id:'religious',label:'ধর্মীয় সামগ্রী',icon:'🕌'},
  {id:'automobile',label:'বইক/গাড়ি এক্সেসরিজ',icon:'🏍️'},
  {id:'garden',label:'বাগান ও কৃষি',icon:'🌱'},
  {id:'others',label:'অন্যান্য',icon:'🎁'}
];

const EMERGENCY_CATEGORIES = ['medicine','gas'];

const AREA_ZONES = {
  noakhali_sadar: ['চরমটুয়া','দাদপুর','নোয়ান্নই','কাদির হানিফ','বিনোদপুর','নোয়াখালী','ধর্মপুর','এওজবালিয়া','কালা দরাপ','অশ্বদিয়া','নেয়াজপুর','আন্ডারচর'],
  begumganj: ['আমান উল্যাপুর','গোপালপুর','জিরতলী','আলাইয়ারপুর','ছয়ানী','রাজগঞ্জ','একলাশপুর','বেগমগঞ্জ','মিরওয়ারিশপুর','নরোত্তমপুর','দূর্গাপুর','কুতুবপুর','রসুলপুর','হাজিপুর','শরীফপুর','কাদিরপুর']
};

const BRANCH_INFO = {
  noakhali_sadar:{label:'নোয়াখালী সদর',address:'মাইজদী বাজার, সদর, নোয়াখালী',managerName:'রিমন',managerPhone:'+880 1627-010060',bkashNumber:'01627010060',nagadNumber:'01627010060',lat:22.8710,lng:91.0996},
  begumganj:{label:'বেগমগঞ্জ',address:'চৌরাস্তা, বেগমগঞ্জ, নোয়াখালী',managerName:'সৃজন',managerPhone:'+880 1310-006959',bkashNumber:'01612057371',nagadNumber:'01310006959',lat:22.9412,lng:91.1119}
};

const AREA_LABELS = {noakhali_sadar:BRANCH_INFO.noakhali_sadar.label, begumganj:BRANCH_INFO.begumganj.label};

/* ============================================================
   DELIVERY ZONES — প্রতিটা শাখার নিচে Zone A/B/C (বৃত্তাকার — কেন্দ্র + radius)
   Admin Panel থেকে edit হয় ('setting'/'delivery_zones' ডকুমেন্টে সেভ থাকে),
   এখানে যেগুলো আছে সেগুলো ডিফল্ট (কখনো Firestore-এ কিছু না থাকলে এটাই ব্যবহার হবে)।
   ============================================================ */
const DELIVERY_ZONES = {
  noakhali_sadar: [
    { id:'sadar_a', label:'Zone A — কাছাকাছি এলাকা', radiusKm:3, fee:30 },
    { id:'sadar_b', label:'Zone B — মাঝারি দূরত্ব',   radiusKm:7, fee:50 },
    { id:'sadar_c', label:'Zone C — দূরবর্তী এলাকা',  radiusKm:12, fee:80 }
  ],
  begumganj: [
    { id:'begum_a', label:'Zone A — কাছাকাছি এলাকা', radiusKm:3, fee:30 },
    { id:'begum_b', label:'Zone B — মাঝারি দূরত্ব',   radiusKm:7, fee:50 },
    { id:'begum_c', label:'Zone C — দূরবর্তী এলাকা',  radiusKm:12, fee:80 }
  ]
};
async function loadLiveDeliveryZones(){
  if(!FB) return;
  try{
    const snap = await FB.getDoc(FB.doc(FB.db,'setting','delivery_zones'));
    if(snap.exists() && snap.data().zones){
      Object.assign(DELIVERY_ZONES, snap.data().zones);
    }
  }catch(e){ devWarn('delivery zones load failed', e.message); }
}
loadLiveDeliveryZones();

/* একটা GPS পয়েন্ট কোন zone-এ পড়ে সেটা বের করে — সবচেয়ে ছোট radius-এর zone প্রাধান্য পায়
   (যেমন Zone A ও Zone B দুটোর মধ্যেই পড়লে, বেশি নির্দিষ্ট/কাছের Zone A ধরা হয়) */
function findDeliveryZone(branchId, lat, lng){
  const branch = BRANCH_INFO[branchId];
  const zones = DELIVERY_ZONES[branchId];
  if(!branch || !zones) return null;
  const distKm = haversineKm(lat, lng, branch.lat, branch.lng);
  const matched = zones
    .filter(z => distKm <= z.radiusKm)
    .sort((a,b) => a.radiusKm - b.radiusKm)[0];
  return matched ? { ...matched, distanceKm: distKm, branchId } : null;
}

const ORDER_STATUS = {
  pending:{label:'পেন্ডিং',cls:'pending'}, confirmed:{label:'কনফার্মড',cls:'confirmed'},
  packed:{label:'প্যাকিং সম্পন্ন',cls:'confirmed'}, assigned:{label:'ড্রাইভার অ্যাসাইনড',cls:'confirmed'},
  picked_up:{label:'পিকআপ হয়েছে',cls:'confirmed'}, in_transit:{label:'ডেলিভারির পথে (লাইভ)',cls:'confirmed'},
  delivered:{label:'ডেলিভারি সম্পন্ন',cls:'delivered'}, cancelled:{label:'বাতিল',cls:'cancelled'}
};

const MED_LIST = [
  {icon:'🩺',name:'সহকারী অধ্যাপক ডাঃ আনোয়ার আহমেদ',spec:'মেডিসিন, গ্যাস্ট্রোলিভার, টিবি, এলার্জি, ডায়াবেটিস ও বক্ষব্যাধি বিশেষজ্ঞ',sched:'প্রতি শুক্রবার সকাল ৯টা - বিকাল ৪টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🩺',name:'ডাঃ আশিক আল মাহমুদ',spec:'মেডিসিন, ডায়াবেটিস, হরমোন, মাথাব্যথা ও আর্থাইটিস বিশেষজ্ঞ',sched:'প্রতি বৃহস্পতিবার সকাল ৯টা - সন্ধ্যা ৬টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🩺',name:'ডাঃ মোঃ মমিন উল্যাহ্',spec:'মেডিসিন, বাত-ব্যথা, উচ্চ রক্তচাপ, স্নায়ুরোগ, বক্ষব্যাধি ও ডায়াবেটিস বিশেষজ্ঞ',sched:'প্রতি শুক্রবার সকাল ৯টা - বিকাল ৪টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'❤️',name:'ডাঃ মোঃ মীর হোসেন ভূঞাঁ (মিশন)',spec:'মেডিসিন, হৃদরোগ ও বাতজ্বর বিশেষজ্ঞ',sched:'প্রতি শুক্রবার সকাল ৯টা - বিকাল ৪টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'👂',name:'সহযোগী অধ্যাপক ডাঃ কিশোর কুমার হালদার',spec:'নাক, কান, গলা রোগ বিশেষজ্ঞ ও হেড-নেক সার্জন',sched:'প্রতি শনিবার সকাল ১১টা - দুপুর ১টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🩺',name:'ডাঃ মুহাম্মদ আবদুল ওয়াজেদ',spec:'মেডিসিন, বক্ষব্যাধি, হৃদরোগ, বাত-ব্যথা, কোমর ব্যথা ও ডায়াবেটিস বিশেষজ্ঞ',sched:'প্রতিদিন দুপুর ২টা - রাত ৮টা (শুক্রবার বন্ধ)',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🧒',name:'ডাঃ মোঃ মিজানুর রহমান',spec:'নবজাতক ও শিশু স্বাস্থ্য বিশেষজ্ঞ',sched:'প্রতিদিন সকাল ৮টা - দুপুর ১২টা ও বিকাল ৪টা - রাত ৮টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'👩‍⚕️',name:'ডাঃ খাদিজা ফালগুনি',spec:'প্রসূতি, গাইনী, বন্ধ্যাত্ব ও স্ত্রী রোগ বিশেষজ্ঞ, সার্জন',sched:'প্রতিদিন সকাল ১০টা - রাত ৮টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🩺',name:'ডাঃ দেব জ্যোতি ঘোষ',spec:'মেডিসিন, নিউরো মেডিসিন, হৃদরোগ, বক্ষব্যাধি, বাত-ব্যথা, গ্যাস্ট্রোলিভার ও ডায়াবেটিস বিশেষজ্ঞ',sched:'প্রতিদিন সকাল ১০টা - রাত ৮টা (রবিবার বন্ধ)',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🔪',name:'ডাঃ মোঃ কামরুজ্জামান আজাদ',spec:'জেনারেল সার্জারী ও ল্যাপারোস্কপিক সার্জারী বিশেষজ্ঞ',sched:'প্রতি শনিবার থেকে বুধবার',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🧴',name:'ডাঃ ওমর ফারুক শাহজালাল',spec:'চর্ম, যৌন ও এলার্জি রোগ চিকিৎসক',sched:'বৃহস্পতি-মঙ্গলবার সকাল ১০টা-দুপুর ২টা, বিকাল ৪টা-রাত ৮টা',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🔪',name:'ডাঃ মোঃ নাজমুল ইসলাম',spec:'সার্জারী বিশেষজ্ঞ, জেনারেল এন্ড ল্যাপারোস্কপিক সার্জন',sched:'প্রতিদিন',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🩺',name:'ডাঃ এম. এস. আরেফিন',spec:'মেডিসিন, নিউরোমেডিসিন, হৃদরোগ, বক্ষব্যাধি, বাত ব্যথা, কোমর ব্যথা, প্যারালাইসিস, গ্যাস্ট্রোলিভার ও ডায়াবেটিস বিশেষজ্ঞ',sched:'প্রতিদিন সকাল ১০টা - রাত ৯টা (শুক্রবার বন্ধ)',addr:'নিউ জেনারেল ডায়াগনস্টিক এন্ড ডক্টরস চেম্বার, হাসপাতাল রোড, মাইজদী কোর্ট',serial:'01893-727666, 01897-692000'},
  {icon:'🩺',name:'ডাঃ মোঃ গোলাম হায়দার',spec:'মেডিসিন, মা ও শিশু স্বাস্থ্য বিশেষজ্ঞ',sched:'সিরিয়াল অনুযায়ী',addr:'মিয়া ফার্মেসি, হাসপাতাল রোড',serial:'01711-196139'},
  {icon:'👩‍⚕️',name:'ডাঃ নীলিমা ইয়াসমিন',spec:'গাইনী, প্রসূতি, বন্ধ্যাত্ব ও স্ত্রীরোগ বিশেষজ্ঞ, সার্জন',sched:'প্রতিদিন দুপুর ৩টা - রাত ৯টা, শুক্রবার সকাল ৯টা - সন্ধ্যা ৭টা',addr:'রয়্যাল হসপিটাল ইউনিট-২, হাসপাতাল রোড, মাইজদী',serial:'01845-820226'}
];

const FAQ_LIST = [
  {q:'কাস্টম বাজার সেবা কীভাবে কাজ করে?',a:'আপনি আপনার বাজারের লিস্ট লিখে দিন, আমাদের ড্রাইভার সেই লিস্ট অনুযায়ী বাজার করে আপনার বাসায় পৌঁছে দেবে। অর্ডার কনফার্ম করার জন্য ১০০ টাকা বিকাশ পে বাধ্যতামূলক, বাকি টাকা ক্যাশ অন ডেলিভারি।'},
  {q:'ডেলিভারি চার্জ ও সময় কীভাবে ঠিক হয়?',a:'ডেলিভারি চার্জ ও সময় দুটোই নির্ভর করে আপনার অর্ডারের পরিমাণ (কতগুলো আইটেম) এবং আপনার ঠিকানার দূরত্বের (মাইলেজ) উপর। চেকআউটের সময় সঠিক চার্জ ও আনুমানিক সময় দেখানো হয় — আগে থেকে কোনো নির্দিষ্ট সময় প্রতিশ্রুতি দেওয়া হয় না, কারণ প্রতিটা অর্ডার আলাদা।'},
  {q:'কোন এলাকায় ডেলিভারি হয়?',a:'বর্তমানে নোয়াখালী সদর ও বেগমগঞ্জ উপজেলার নির্দিষ্ট এলাকায় ডেলিভারি হয়। ভবিষ্যতে আরো জোন যোগ হবে।'},
  {q:'কোন সময় অর্ডার করা যায়?',a:'যেকোনো সময় অর্ডার করতে পারেন। ডেলিভারি কখন পৌঁছাবে তা নির্ভর করে সেই মুহূর্তে অর্ডারের পরিমাণ ও দূরত্বের উপর — অর্ডার করার পর নির্দিষ্ট সময় জানিয়ে দেওয়া হবে।'},
  {q:'পেমেন্ট কীভাবে করব?',a:'ক্যাশ অন ডেলিভারি (COD), bKash, অথবা Nagad। জোন অনুযায়ী আলাদা bKash/Nagad নাম্বার চেকআউট পেজে দেখানো হয়।'},
  {q:'অর্ডার কীভাবে ট্র্যাক করব?',a:'"আমার অর্ডার" পেজে গিয়ে রিয়েল-টাইম অর্ডার স্ট্যাটাস ও ড্রাইভারের লাইভ লোকেশন দেখতে পারবেন।'},
  {q:'অর্ডার ক্যানসেল করা যায়?',a:'হ্যাঁ, ড্রাইভার পিকআপ শুরু করার আগে অর্ডার ক্যানসেল করা যায়। এরপর আর ক্যানসেল করা যাবে না।'},
  {q:'রিটার্ন/রিফান্ড কীভাবে?',a:'ডেলিভারির ২৪ ঘন্টার মধ্যে কোনো সমস্যা হলে রিটার্ন/রিফান্ড রিকোয়েস্ট করতে পারবেন। "আমার অর্ডার" পেজ থেকে রিফান্ড রিকোয়েস্ট করুন।'}
];

function money(n){ return '৳' + Number(n||0).toLocaleString('en-US'); }
function bn(n){ return String(n); }
function maskNid(nid){
  if(!nid || nid.length<4) return nid||'—';
  return nid.slice(0,2) + '•'.repeat(Math.max(nid.length-4,3)) + nid.slice(-2);
}
function skeletonCards(n=4){
  return Array.from({length:n}).map(()=>`<div class="pcard" style="pointer-events:none"><div class="imgwrap" style="background:linear-gradient(90deg,#131c2e 25%,#1a2740 50%,#131c2e 75%);background-size:200% 100%;animation:shimmer 1.4s infinite"></div><div class="pbody"><div style="height:12px;background:var(--line);border-radius:4px;margin-bottom:8px;width:80%"></div><div style="height:16px;background:var(--line);border-radius:4px;width:50%"></div></div></div>`).join('');
}

/* ---------- Lazy image fade-in fix ---------- */
/* load ইভেন্ট bubble করে না, তাই capture:true দিয়ে document-এ delegate করা হলো
   যাতে dynamically inject হওয়া (pcardHTML, admin table ইত্যাদি) সব img-ও কভার হয় */
document.addEventListener('load', function(e){
  const img = e.target;
  if(img && img.tagName === 'IMG' && img.hasAttribute('loading')){
    img.classList.add('loaded');
  }
}, true);

/* কিছু ইমেজ এই লিসেনার অ্যাটাচ হওয়ার আগেই cache থেকে সাথে সাথে লোড হয়ে যায়,
   ফলে তাদের load ইভেন্ট মিস হয়ে যেতে পারে। সেফটির জন্য প্রতি ৪০০ms পর
   .complete চেক করে বাকি থাকা ইমেজগুলোকেও visible করে দেওয়া হয়। */
setInterval(function(){
  document.querySelectorAll('img[loading="lazy"]:not(.loaded)').forEach(img=>{
    if(img.complete && img.naturalWidth > 0) img.classList.add('loaded');
  });
}, 400);
/* ---------- Dark Mode Toggle (auto = system অনুযায়ী, ম্যানুয়াল হলে override) ---------- */
const ThemeToggle = {
  KEY: 'golapi_theme', // মান: 'light' | 'dark' | 'auto' (ডিফল্ট auto)
  mq: window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null,
  init(){
    const saved = localStorage.getItem(this.KEY) || 'auto';
    this.apply(saved);
    if(this.mq){
      const listener = () => { if((localStorage.getItem(this.KEY)||'auto')==='auto') this.apply('auto'); };
      if(this.mq.addEventListener) this.mq.addEventListener('change', listener);
      else if(this.mq.addListener) this.mq.addListener(listener); // পুরনো Safari ফলব্যাক
    }
  },
  apply(mode){
    let resolved = mode;
    if(mode==='auto') resolved = (this.mq && this.mq.matches) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', mode); // 'auto'/'light'/'dark' — বাটনের আইকনের জন্য
  },
  toggle(){
    // চক্র: auto → light → dark → auto...
    const current = localStorage.getItem(this.KEY) || 'auto';
    const next = current==='auto' ? 'light' : current==='light' ? 'dark' : 'auto';
    localStorage.setItem(this.KEY, next);
    this.apply(next);
  }
};
ThemeToggle.init();