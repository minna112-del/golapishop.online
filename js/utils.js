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
  {id:'medicine',label:'ঔষধ',icon:'💊'},{id:'grocery',label:'মুদি বাজার',icon:'🛒'},
  {id:'confectionery',label:'কনফেকশনারি',icon:'🍬'},{id:'stationery',label:'স্টেশনারি',icon:'📒'},
  {id:'gas',label:'গ্যাস সিলিন্ডার',icon:'🔥'},{id:'mobile',label:'মোবাইল',icon:'📱'},
  {id:'watch',label:'ঘড়ি ও ব্যাটারি',icon:'⌚'},{id:'cosmetics',label:'কসমেটিকস',icon:'💄'},
  {id:'clothing',label:'জামা-কাপড়',icon:'👕'},{id:'furniture',label:'ফার্নিচার',icon:'🪑'}
];

const EMERGENCY_CATEGORIES = ['medicine','gas'];

const AREA_ZONES = {
  noakhali_sadar: ['চরমটুয়া','দাদপুর','নোয়ান্নই','কাদির হানিফ','বিনোদপুর','নোয়াখালী','ধর্মপুর','এওজবালিয়া','কালা দরাপ','অশ্বদিয়া','নেয়াজপুর','আন্ডারচর'],
  begumganj: ['আমান উল্যাপুর','গোপালপুর','জিরতলী','আলাইয়ারপুর','ছয়ানী','রাজগঞ্জ','একলাশপুর','বেগমগঞ্জ','মিরওয়ারিশপুর','নরোত্তমপুর','দূর্গাপুর','কুতুবপুর','রসুলপুর','হাজিপুর','শরীফপুর','কাদিরপুর']
};

const BRANCH_INFO = {
  noakhali_sadar:{label:'নোয়াখালী সদর',address:'মাইজদী বাজার, সদর, নোয়াখালী',managerName:'রিমন',managerPhone:'+880 1627-010060',bkashNumber:'01627010060',nagadNumber:'01627010060'},
  begumganj:{label:'বেগমগঞ্জ',address:'আমানতপুর, বেগমগঞ্জ, নোয়াখালী',managerName:'সৃজন',managerPhone:'+880 1310-006959',bkashNumber:'01310006959',nagadNumber:'01310006959'}
};

const AREA_LABELS = {noakhali_sadar:BRANCH_INFO.noakhali_sadar.label, begumganj:BRANCH_INFO.begumganj.label};

const ORDER_STATUS = {
  pending:{label:'পেন্ডিং',cls:'pending'}, confirmed:{label:'কনফার্মড',cls:'confirmed'},
  packed:{label:'প্যাকিং সম্পন্ন',cls:'confirmed'}, assigned:{label:'ড্রাইভার অ্যাসাইনড',cls:'confirmed'},
  picked_up:{label:'পিকআপ হয়েছে',cls:'confirmed'}, in_transit:{label:'ডেলিভারির পথে (লাইভ)',cls:'confirmed'},
  delivered:{label:'ডেলিভারি সম্পন্ন',cls:'delivered'}, cancelled:{label:'বাতিল',cls:'cancelled'}
};

const MED_LIST = [
  {icon:'👨‍⚕️',name:'ডাঃ রহিম উদ্দিন',spec:'মেডিসিন বিশেষজ্ঞ',sched:'প্রতিদিন সকাল ৯টা - দুপুর ২টা'},
  {icon:'👩‍⚕️',name:'ডাঃ করিনা আক্তার',spec:'গাইনি ও প্রসূতি',sched:'শনি ও সোম বিকাল ৪টা - রাত ৮টা'},
  {icon:'🧒',name:'ডাঃ আবুল কালাম',spec:'শিশু বিশেষজ্ঞ',sched:'রবি ও বুধ সকাল ১০টা - দুপুর ১টা'},
  {icon:'🦷',name:'ডাঃ সালমা সুলতানা',spec:'ডেন্টাল সার্জন',sched:'শুক্র বিকাল ৩টা - রাত ৭টা'},
  {icon:'❤️',name:'ডাঃ জাকির হোসেন',spec:'কার্ডিওলজি',sched:'মাসের ১ম ও ৩য় রবিবার'},
  {icon:'👁️',name:'ডাঃ নাফিসা আহমেদ',spec:'চক্ষু বিশেষজ্ঞ',sched:'প্রতি মঙ্গলবার সকাল ৯টা - ১২টা'}
];

const FAQ_LIST = [
  {q:'কাস্টম বাজার সেবা কীভাবে কাজ করে?',a:'আপনি আপনার বাজারের লিস্ট লিখে দিন, আমাদের ড্রাইভার সেই লিস্ট অনুযায়ী বাজার করে আপনার বাসায় পৌঁছে দেবে। অর্ডার কনফার্ম করার জন্য ১০০ টাকা বিকাশ পে বাধ্যতামূলক, বাকি টাকা ক্যাশ অন ডেলিভারি।'},
  {q:'ডেলিভারি চার্জ কত?',a:'ডেলিভারি চার্জ জোন, অর্ডার আইটেম সংখ্যা ও মাইলেজের উপর ভিত্তি করে নির্ধারিত হয়। ১০০০ টাকার বেশি অর্ডারে ডেলিভারি ফ্রি। সাধারণত ৩০-৬০ টাকা।'},
  {q:'কোন এলাকায় ডেলিভারি হয়?',a:'বর্তমানে নোয়াখালী সদর ও বেগমগঞ্জ উপজেলার নির্দিষ্ট এলাকায় ডেলিভারি হয়। ভবিষ্যতে আরো জোন যোগ হবে।'},
  {q:'রাতে ডেলিভারি হয়?',a:'রাত ১২টার পর শুধু ইমার্জেন্সি পণ্য (ঔষধ, গ্যাস সিলিন্ডার) ডেলিভারি হয়। প্রায় ২৪ ঘন্টা সার্ভিস।'},
  {q:'পেমেন্ট কীভাবে করব?',a:'ক্যাশ অন ডেলিভারি (COD), bKash, অথবা Nagad। জোন অনুযায়ী আলাদা bKash/Nagad নাম্বার চেকআউট পেজে দেখানো হয়।'},
  {q:'অর্ডার কীভাবে ট্র্যাক করব?',a:'"আমার অর্ডার" পেজে গিয়ে রিয়েল-টাইম অর্ডার স্ট্যাটাস ও ড্রাইভারের লাইভ লোকেশন দেখতে পারবেন।'},
  {q:'অর্ডার ক্যানসেল করা যায়?',a:'হ্যাঁ, ড্রাইভার পিকআপ শুরু করার আগে অর্ডার ক্যানসেল করা যায়। এরপর আর ক্যানসেল করা যাবে না।'},
  {q:'রিটার্ন/রিফান্ড কীভাবে?',a:'ডেলিভারির ২৪ ঘন্টার মধ্যে কোনো সমস্যা হলে রিটার্ন/রিফান্ড রিকোয়েস্ট করতে পারবেন। "আমার অর্ডার" পেজ থেকে রিফান্ড রিকোয়েস্ট করুন।'}
];

function money(n){ return '৳' + Number(n||0).toLocaleString('en-US'); }
function bn(n){ return String(n); }
function skeletonCards(n=4){
  return Array.from({length:n}).map(()=>`<div class="pcard" style="pointer-events:none"><div class="imgwrap" style="background:linear-gradient(90deg,#131c2e 25%,#1a2740 50%,#131c2e 75%);background-size:200% 100%;animation:shimmer 1.4s infinite"></div><div class="pbody"><div style="height:12px;background:var(--line);border-radius:4px;margin-bottom:8px;width:80%"></div><div style="height:16px;background:var(--line);border-radius:4px;width:50%"></div></div></div>`).join('');
}