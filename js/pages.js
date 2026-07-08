/* pages.js — Home, Medical, Listing, PDP, Cart, Search, Checkout, CustomBazar, MyOrders */
/* ---------- Home ---------- */
const Home = {
  render(){
    document.getElementById('catGrid').innerHTML = CATEGORIES.map(c=>
      `<div class="cat-item" onclick="Router.go('listing',{cat:'${c.id}'})"><div class="em">${c.icon}</div><span>${c.label}</span></div>`).join('');
    const zp = zoneProducts();
    const loading = !ProductStore.loaded;
    if(loading){
      document.getElementById('flashRow').innerHTML = skeletonCards(4);
      document.getElementById('bestRow').innerHTML = skeletonCards(4);
      document.getElementById('newGrid').innerHTML = skeletonCards(10);
    }else{
      const empty = `<div class="empty-state" style="padding:20px"><p>এই মুহূর্তে কোনো প্রোডাক্ট পাওয়া যাচ্ছে না</p></div>`;
      document.getElementById('flashRow').innerHTML = zp.filter(p=>p.isFlash).map(pcardHTML).join('') || empty;
      document.getElementById('bestRow').innerHTML = [...zp].sort((a,b)=>b.sold-a.sold).slice(0,10).map(pcardHTML).join('') || empty;
      document.getElementById('newGrid').innerHTML = zp.slice(0,10).map(pcardHTML).join('') || empty;
    }
  }
};

const Medical = {
  render(){
    document.getElementById('medGrid').innerHTML = MED_LIST.map(m=>`
      <div class="card" style="padding:18px">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span style="font-size:28px">${m.icon}</span><div><div style="font-weight:600;color:#fff;font-size:13.5px">${m.name}</div><div style="font-size:12px;color:var(--emerald)">${m.spec}</div></div></div>
        <div style="font-size:12px;color:var(--ink-muted);margin-bottom:12px">📅 ${m.sched}<br>💰 ভিজিট ফি: <span style="color:var(--gold);font-weight:600">ফ্রী</span></div>
        <a href="tel:+8801612057371" class="btn btn-medical btn-block" style="font-size:12.5px;padding:9px">📅 এপয়েন্টমেন্ট নিন</a>
      </div>`).join('');
  }
};

function getAIAdvice(){
  const s = (document.getElementById('aiSymptom').value||'').trim().toLowerCase();
  if(!s){ toast('লক্ষণ লিখুন','error'); return; }
  const box = document.getElementById('aiResultBox');
  box.style.display='block'; box.textContent='বিশ্লেষণ চলছে...';
  setTimeout(()=>{
    let advice = 'আপনার লক্ষণের ভিত্তিতে প্রাথমিক পরামর্শ:<br><br>';
    if(s.includes('জ্বর')) advice += '• প্রচুর তরল পান করুন<br>• প্যারাসিটামল ৫০০মিগ্রা ৬ ঘন্টা পরপর খেতে পারেন<br>';
    if(s.includes('মাথা')) advice += '• বিশ্রাম নিন, কম আলোতে থাকুন<br>';
    if(s.includes('কাশি')||s.includes('সর্দি')) advice += '• গরম পানিতে মধু মিশিয়ে খান, ভাপ নিন<br>';
    if(s.includes('পেট')||s.includes('ডায়রিয়া')) advice += '• ওআরএস খান, হালকা খাবার খান<br>';
    if(!s.includes('জ্বর')&&!s.includes('মাথা')&&!s.includes('কাশি')&&!s.includes('পেট')) advice += '• পর্যাপ্ত বিশ্রাম নিন, প্রচুর পানি পান করুন<br>';
    advice += '<br>• ২-৩ দিনে উন্নতি না হলে অবশ্যই ডাক্তার দেখান।';
    box.innerHTML = advice;
  }, 900);
}

/* ---------- Listing ---------- */
const Listing = {
  toggleMobile(){ document.getElementById('listingAside').classList.toggle('show'); },
  render(){
    const cat = Router.params.cat || 'all';
    const q = (Router.params.q||'').trim().toLowerCase();
    const sort = document.getElementById('sortSelect').value;
    let items = zoneProducts();
    let title = 'সব প্রোডাক্ট';
    if(cat==='flash'){ items = items.filter(p=>p.isFlash); title='🔥 ফ্ল্যাশ সেল'; }
    else if(cat==='bestseller'){ items = [...items].sort((a,b)=>b.sold-a.sold); title='⭐ বেস্ট সেলার'; }
    else if(cat!=='all'){ items = items.filter(p=>p.category===cat); title = CATEGORIES.find(c=>c.id===cat)?.label || cat; }
    if(q){ items = items.filter(p=>p.name.toLowerCase().includes(q)); title = `"${q}" — অনুসন্ধান`; }
    if(document.getElementById('filterCOD').checked) items = items.filter(p=>p.cod);
    if(sort==='price_asc') items.sort((a,b)=>a.salePrice-b.salePrice);
    if(sort==='price_desc') items.sort((a,b)=>b.salePrice-a.salePrice);
    if(sort==='rating') items.sort((a,b)=>parseFloat(b.rating)-parseFloat(a.rating));
    if(sort==='sold') items.sort((a,b)=>b.sold-a.sold);
    document.getElementById('listTitle').textContent = title;
    document.getElementById('listCount').textContent = `${bn(items.length)} টি প্রোডাক্ট পাওয়া গেছে`;
    document.getElementById('listingGrid').innerHTML = items.map(pcardHTML).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="em">🔍</div><h3>কোনো প্রোডাক্ট পাওয়া যায়নি</h3></div>`;
  }
};

/* ---------- PDP ---------- */
const PDP = {
  product:null, qty:1,
  load(id){
    const zp = zoneProducts();
    this.product = zp.find(p=>p.id===id);
    if(!this.product){ toast('প্রোডাক্ট পাওয়া যাচ্ছে না','error'); Router.go('listing',{cat:'all'}); return; }
    this.qty = 1;
    const p = this.product;
    document.getElementById('pdpCrumb').innerHTML = `<a href="#" onclick="Router.go('home')">হোম</a> &gt; <a href="#" onclick="Router.go('listing',{cat:'${p.category}'})">${CATEGORIES.find(c=>c.id===p.category)?.label||''}</a> &gt; ${p.name}`;
    document.getElementById('pdpImg').src = p.img;
    document.getElementById('pdpName').textContent = p.name;
    document.getElementById('pdpMeta').innerHTML = `⭐ ${p.rating} (${bn(p.reviews)} রিভিউ) · ${bn(p.sold)} বিক্রি হয়েছে`;
    document.getElementById('pdpPrice').textContent = money(p.salePrice);
    const disc = p.price>p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
    document.getElementById('pdpOld').textContent = disc? money(p.price):'';
    document.getElementById('pdpDisc').style.display = disc?'inline-block':'none';
    document.getElementById('pdpDisc').textContent = disc?`-${bn(disc)}%`:'';
    document.getElementById('pdpUnit').textContent = '/ '+p.unit;
    document.getElementById('pdpTags').innerHTML = `${p.cod?'<span class="cod-tag">✓ COD</span>':''}${p.fastDelivery?'<span class="fast-tag">⚡ ৬০ মিনিট</span>':''}`;
    document.getElementById('pdpStock').textContent = p.stock>5?'✓ স্টকে আছে':`⚠ মাত্র ${bn(p.stock)}টি বাকি`;
    document.getElementById('pdpQty').textContent = '১';
    document.getElementById('pdpDesc').textContent = p.description || `${p.name} — উচ্চমানের প্রোডাক্ট, নিজস্ব লোকাল ডেলিভারি সুবিধা সহ। ১০০% অরিজিনাল নিশ্চয়তা।`;
    document.getElementById('pdpSpec').innerHTML = `<tr><td>ব্র্যান্ড</td><td>Golapi Selection</td></tr><tr><td>ওয়ারেন্টি</td><td>৭ দিন রিপ্লেসমেন্ট</td></tr><tr><td>উৎপত্তি</td><td>বাংলাদেশ</td></tr>`;
    document.getElementById('relatedRow').innerHTML = zp.filter(x=>x.category===p.category && x.id!==p.id).slice(0,8).map(pcardHTML).join('');
    this.tab(null,'desc');
  },
  tab(btn,name){
    document.querySelectorAll('.pdp-tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active'); else document.querySelector('.pdp-tabs button')?.classList.add('active');
    document.getElementById('tab-'+name).classList.add('active');
  },
  changeQty(d){
    const max = this.product?.stock ?? 99;
    this.qty = Math.max(1, Math.min(max, this.qty+d));
    document.getElementById('pdpQty').textContent = bn(this.qty);
  },
  addToCart(){ Cart.add(this.product.id, this.qty); },
  buyNow(){ Cart.add(this.product.id, this.qty); Router.go('checkout'); }
};

/* ---------- Cart ---------- */
const Cart = {
  items:{},
  load(){ try{ this.items = JSON.parse(localStorage.getItem('golapi_cart')||'{}'); }catch(e){ this.items={}; } this.badge(); },
  save(){ localStorage.setItem('golapi_cart', JSON.stringify(this.items)); this.badge(); },
  add(id,qty=1){ this.items[id]=(this.items[id]||0)+qty; this.save(); toast('✓ কার্টে যুক্ত হয়েছে','success'); this.renderDrawer(); },
  remove(id){ delete this.items[id]; this.save(); this.renderDrawer(); },
  setQty(id,qty){ if(qty<=0){ this.remove(id); return; } this.items[id]=qty; this.save(); this.renderDrawer(); },
  totalCount(){ return Object.values(this.items).reduce((a,b)=>a+b,0); },
  totalPrice(){ return Object.entries(this.items).reduce((s,[id,q])=>{ const p=ALL_PRODUCTS.find(x=>x.id===id); return s+(p?p.salePrice*q:0); },0); },
  badge(){ const c=this.totalCount(); const el=document.getElementById('cartBadge'); if(c>0){el.style.display='flex'; el.textContent=bn(c);} else el.style.display='none'; },
  renderDrawer(){
    const body=document.getElementById('cartBody'), foot=document.getElementById('cartFoot');
    const entries = Object.entries(this.items);
    if(!entries.length){ body.innerHTML=`<div class="empty-state"><div class="em">🛍️</div><p>আপনার কার্ট খালি</p></div>`; foot.style.display='none'; return; }
    let total=0;
    body.innerHTML = entries.map(([id,q])=>{
      const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p) return '';
      total += p.salePrice*q;
      return `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)">
        <img src="${p.img}" style="width:56px;height:56px;border-radius:9px;object-fit:cover">
        <div style="flex:1"><div style="font-size:13px;color:#fff">${p.name}</div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:6px">${money(p.salePrice)} / ${p.unit}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="qty-ctrl"><button onclick="Cart.setQty('${id}',${q-1})">−</button><span>${bn(q)}</span><button onclick="Cart.setQty('${id}',${q+1})">+</button></div>
          <strong style="color:var(--gold)">${money(p.salePrice*q)}</strong>
        </div></div>
      </div>`;
    }).join('');
    foot.style.display='block';
    document.getElementById('cartSub').textContent = money(total);
    const del = total>1000?0:60;
    document.getElementById('cartDel').textContent = del===0?'ফ্রি':money(del);
    document.getElementById('cartTot').textContent = money(total+del);
  },
  open(){ document.getElementById('cartDrawer').classList.add('show'); document.getElementById('cartOverlay').classList.add('show'); this.renderDrawer(); },
  close(){ document.getElementById('cartDrawer').classList.remove('show'); document.getElementById('cartOverlay').classList.remove('show'); },
  goCheckout(){ if(!this.totalCount()){ toast('কার্ট খালি আছে'); return; } this.close(); Router.go('checkout'); }
};
Cart.load();

/* ---------- Search ---------- */
function doSearch(v){ /* live suggestions omitted for simplicity; Enter/submit triggers listing search */ }
function submitSearch(){
  const q = document.getElementById('searchInput').value.trim();
  if(!q) return;
  Router.go('listing',{cat:'all', q});
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('searchInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') submitSearch(); });
});

function onUpazilaChange(prefix){
  const upazila = document.getElementById(prefix+'District').value;
  const zoneSel = document.getElementById(prefix+'Zone');
  if(!upazila){ zoneSel.innerHTML = '<option value="">প্রথমে উপজেলা বেছে নিন</option>'; }
  else { zoneSel.innerHTML = '<option value="">ইউনিয়ন বেছে নিন</option>' + AREA_ZONES[upazila].map(z=>`<option value="${z}">${z}</option>`).join(''); }
  if(prefix==='cb'){
    const numEl = document.getElementById('cbBkashNum');
    numEl.textContent = upazila ? BRANCH_INFO[upazila].bkashNumber : 'উপজেলা বেছে নিলে দেখাবে';
  }
  if(prefix==='ck'){
    const payInfo = document.getElementById('ckPayInfo');
    if(payInfo && payInfo.dataset.method) Checkout.selectPayByMethod(payInfo.dataset.method);
  }
}

/* ---------- Delivery charge: mileage + item count based ----------
   সঠিক দূরত্ব মাপার জন্য ভবিষ্যতে Google Distance Matrix API যুক্ত করা ভালো — আপাতত
   প্রতিটা জোনের কেন্দ্র (ব্র্যাঞ্চ পয়েন্ট) থেকে গড় দূরত্ব ৩ কিমি ধরে হিসাব করা হচ্ছে,
   ড্রাইভার অ্যাসাইনের সময় ম্যানুয়ালি দূরত্ব আপডেট করা যাবে (admin.js দেখুন)। */
const DELIVERY_SETTINGS = { baseFee: 30, perKmFee: 8, perItemFee: 3, avgDistanceKm: 3, freeAboveSubtotal: 1000 };
function calcDeliveryCharge(itemCount, subtotal=0, distanceKm=null){
  if(subtotal >= DELIVERY_SETTINGS.freeAboveSubtotal) return 0;
  const km = distanceKm ?? DELIVERY_SETTINGS.avgDistanceKm;
  const fee = DELIVERY_SETTINGS.baseFee + km*DELIVERY_SETTINGS.perKmFee + itemCount*DELIVERY_SETTINGS.perItemFee;
  return Math.round(fee);
}

/* ---------- Checkout (single "দ্রুত ডেলিভারি" mode — no slot choice) ---------- */
const Checkout = {
  pay:'cod', currentStep:1,
  init(){
    document.getElementById('ckDistrict').value='';
    document.getElementById('ckZone').innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    const v=document.getElementById('ckVillage'); if(v) v.value='';
    this.goStep(1);
  },
  selectPay(el,method){
    el.parentElement.querySelectorAll('.radio-card').forEach(c=>{c.classList.remove('selected');c.querySelector('input').checked=false;});
    el.classList.add('selected'); el.querySelector('input').checked=true; this.pay=method;
    this.selectPayByMethod(method);
  },
  selectPayByMethod(method){
    const box = document.getElementById('ckPayInfo');
    box.dataset.method = method;
    const zone = document.getElementById('ckDistrict').value;
    const info = BRANCH_INFO[zone];
    if((method==='bkash'||method==='nagad') && info){
      const num = method==='bkash'?info.bkashNumber:info.nagadNumber;
      box.style.display='block';
      box.innerHTML = `<div style="background:rgba(212,175,55,.06);border:1px solid var(--gold-line);border-radius:11px;padding:14px;margin-top:10px">
        <strong style="color:var(--gold)">📲 ${method==='bkash'?'bKash':'Nagad'} নম্বর (${info.label}):</strong><br>
        <span style="font-size:19px;font-weight:700">${num}</span><br><span style="font-size:11.5px;color:var(--ink-muted)">Send Money করে ট্রানজেকশন ID পরবর্তী ধাপে দিন</span>
      </div>`;
    } else { box.style.display='none'; box.innerHTML=''; }
  },
  goStep(n){
    if(n>1 && this.currentStep===1 && !this.isStep1Valid()){ toast('⚠ ঠিকানা ও ডেলিভারি ইনস্ট্রাকশন সঠিকভাবে পূরণ করুন','error'); return; }
    this.currentStep = n;
    [1,2,3].forEach(i=>{
      document.getElementById('ckStep'+i).style.display = i===n?'block':'none';
      const el = document.querySelector(`.step-item[data-s="${i}"]`);
      el.classList.remove('active','done'); if(i<n) el.classList.add('done'); if(i===n) el.classList.add('active');
    });
    if(n===3) this.renderSummary();
  },
  isStep1Valid(){
    const name = document.getElementById('ckName').value.trim();
    const phone = document.getElementById('ckPhone').value.trim().replace(/[\s-]/g,'');
    const addr = document.getElementById('ckAddress').value.trim();
    const upazila = document.getElementById('ckDistrict').value;
    const zone = document.getElementById('ckZone').value;
    const village = document.getElementById('ckVillage').value.trim();
    const instructions = document.getElementById('ckInstructions').value.trim();
    const phoneRe = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    return name.length>0 && phoneRe.test(phone) && addr.length>=5 && upazila && zone && village.length>0 && instructions.length>0;
  },
  renderSummary(){
    const entries = Object.entries(Cart.items);
    let itemCount = 0;
    document.getElementById('ckSummary').innerHTML = entries.map(([id,q])=>{
      const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p) return '';
      itemCount += q;
      return `<div class="row-between"><span>${p.name} × ${bn(q)}</span><span>${money(p.salePrice*q)}</span></div>`;
    }).join('');
    const sub = Cart.totalPrice();
    const ship = calcDeliveryCharge(itemCount, sub);
    document.getElementById('ckSub').textContent = money(sub);
    document.getElementById('ckShip').textContent = ship===0?'ফ্রি':money(ship);
    document.getElementById('ckTotal').textContent = money(sub+ship);
  },
  async placeOrder(){
    const name=document.getElementById('ckName').value.trim();
    const phone=document.getElementById('ckPhone').value.trim();
    const addr=document.getElementById('ckAddress').value.trim();
    const upazila=document.getElementById('ckDistrict').value;
    const zone=document.getElementById('ckZone').value;
    const village=document.getElementById('ckVillage').value.trim();
    const instructions=document.getElementById('ckInstructions').value.trim();
    const phoneRe = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!name||!phoneRe.test(phone.replace(/[\s-]/g,''))||addr.length<5||!upazila||!zone||!village||!instructions){ toast('⚠ সব প্রয়োজনীয় তথ্য পূরণ করুন (ডেলিভারি ইনস্ট্রাকশন সহ)','error'); this.goStep(1); return; }
    if(!document.getElementById('ckTerms').checked){ toast('⚠ শর্তাবলীতে সম্মত হতে হবে','error'); return; }
    if(!FB){ toast('⚠ সংযোগ সমস্যা — আবার চেষ্টা করুন','error'); return; }
    const orderNo = 'GS-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900000)+100000);
    const sub = Cart.totalPrice();
    const itemCount = Object.values(Cart.items).reduce((a,b)=>a+b,0);
    const ship = calcDeliveryCharge(itemCount, sub);
    try{
      await FB.addDoc(FB.collection(FB.db,'orders'),{
        orderNumber:orderNo, customerName:name, customerPhone:phone, address:addr, village,
        branchZone:upazila, district:AREA_LABELS[upazila]||'', zone,
        instructions, paymentMethod:this.pay, deliverySlot:'express',
        items:Object.entries(Cart.items).map(([id,qty])=>({productId:id,qty})),
        subtotal:sub+ship, shippingCost:ship, status:'pending', driverId:null, driverName:null,
        userId:Auth.currentUser?.uid||null, createdAt:FB.serverTimestamp()
      });
      document.getElementById('successOrderNo').textContent = orderNo;
      Cart.items={}; Cart.save();
      Router.go('order-success');
    }catch(e){ devWarn('order failed', e.message); toast('❌ অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন','error'); }
  }
};

/* ---------- Custom Bazar ---------- */
const CustomBazar = {
  init(){
    ['cbName','cbPhone','cbAddress','cbList','cbNotes','cbTrxId','cbVillage','cbInstructions'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('cbDistrict').value='';
    document.getElementById('cbZone').innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    document.getElementById('cbBkashNum').textContent='উপজেলা বেছে নিলে দেখাবে';
    document.getElementById('cbMsg').className='form-msg';
  },
  async submit(){
    const msgEl=document.getElementById('cbMsg');
    const name=document.getElementById('cbName').value.trim();
    const phone=document.getElementById('cbPhone').value.trim();
    const address=document.getElementById('cbAddress').value.trim();
    const district=document.getElementById('cbDistrict').value;
    const zone=document.getElementById('cbZone').value;
    const village=document.getElementById('cbVillage').value.trim();
    const instructions=document.getElementById('cbInstructions').value.trim();
    const type=document.getElementById('cbType').value;
    const list=document.getElementById('cbList').value.trim();
    const notes=document.getElementById('cbNotes').value.trim();
    const trxId=document.getElementById('cbTrxId').value.trim();
    if(!name||!phone||!address||!district||!zone||!village||!instructions||!list||!trxId){ msgEl.textContent='সব প্রয়োজনীয় তথ্য পূরণ করুন (ডেলিভারি ইনস্ট্রাকশন সহ)'; msgEl.className='form-msg err'; return; }
    const phoneRe=/^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRe.test(phone.replace(/[\s-]/g,''))){ msgEl.textContent='সঠিক মোবাইল নম্বর দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    const btn=document.getElementById('cbSubmitBtn'); btn.textContent='জমা হচ্ছে...'; btn.disabled=true;
    const typeLabels={weekly:'সাপ্তাহিক',monthly:'মাসিক',wedding:'বিয়ের',ramadan:'রমজানের',qurbani:'কুরবানির',other:'অন্যান্য'};
    const orderNo = 'CB-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900000)+100000);
    try{
      await FB.addDoc(FB.collection(FB.db,'orders'),{
        orderNumber:orderNo, orderType:'custom-bazar', bazarType:type, bazarTypeLabel:typeLabels[type]||type,
        customerName:name, customerPhone:phone, address, village, instructions, branchZone:district, district:AREA_LABELS[district]||'',
        zone, bazarList:list, notes, bkashTrxId:trxId, advanceAmount:100, paymentMethod:'bkash+cod',
        billPhotoUrl:null, billAmount:null,
        status:'pending', userId:Auth.currentUser?.uid||null, createdAt:FB.serverTimestamp()
      });
      msgEl.innerHTML = `✅ আপনার বাজার অর্ডার (${orderNo}) সফলভাবে জমা হয়েছে! ড্রাইভার বাজার করার পর বিলের ছবি এখানেই দেখতে পাবেন।`; msgEl.className='form-msg ok';
      btn.textContent='📝 বাজার অর্ডার জমা দিন'; btn.disabled=false;
    }catch(e){ msgEl.textContent='সমস্যা হয়েছে: '+e.message; msgEl.className='form-msg err'; btn.textContent='📝 বাজার অর্ডার জমা দিন'; btn.disabled=false; }
  }
};

/* ---------- Order Chat (customer <-> driver, per order) ---------- */
const OrderChat = {
  orderId:null, unsub:null, role:'customer',
  open(orderId, role='customer'){
    this.orderId = orderId; this.role = role;
    document.getElementById('chatOrderModal').classList.add('show');
    document.getElementById('chatOrderBody').innerHTML = '<p style="color:var(--ink-muted);text-align:center;padding:16px">লোড হচ্ছে...</p>';
    if(!FB) return;
    if(this.unsub) this.unsub();
    this.unsub = FB.onSnapshot(FB.query(FB.collection(FB.db,'orders',orderId,'messages'), FB.orderBy('at','asc')), snap=>{
      const body = document.getElementById('chatOrderBody');
      const msgs=[]; snap.forEach(d=>msgs.push(d.data()));
      body.innerHTML = msgs.length ? msgs.map(m=>`<div class="cw-msg ${m.from===this.role?'cw-user':'cw-bot'}">${m.text}</div>`).join('')
        : '<p style="color:var(--ink-muted);text-align:center;padding:16px">এখনো কোনো মেসেজ নেই — এখান থেকে ড্রাইভারকে মেসেজ পাঠান</p>';
      body.scrollTop = body.scrollHeight;
    });
  },
  close(){ document.getElementById('chatOrderModal').classList.remove('show'); if(this.unsub){ this.unsub(); this.unsub=null; } },
  async send(){
    const input = document.getElementById('chatOrderInput');
    const text = input.value.trim(); if(!text || !this.orderId || !FB) return;
    input.value='';
    try{ await FB.addDoc(FB.collection(FB.db,'orders',this.orderId,'messages'), {from:this.role, text, at:FB.serverTimestamp()}); }
    catch(e){ toast('মেসেজ পাঠানো যায়নি','error'); }
  }
};

/* ---------- Order tracking pipeline (customer-facing) ---------- */
const TRACK_STAGES = [
  {key:'confirmed', label:'অর্ডার কনফার্মড'},
  {key:'packed', label:'প্যাকিং সম্পন্ন'},
  {key:'picked_up', label:'পিকআপ হয়েছে'},
  {key:'in_transit', label:'ড্রাইভার আপনার পথে (লাইভ)'},
  {key:'delivered', label:'ডেলিভারি সম্পন্ন'}
];
function orderTrackHTML(o){
  const order = ['pending','confirmed','packed','assigned','picked_up','in_transit','delivered'];
  const curIdx = order.indexOf(o.status);
  const rows = TRACK_STAGES.map(st=>{
    const stIdx = order.indexOf(st.key);
    const done = curIdx >= stIdx && curIdx>-1;
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">
      <span style="width:18px;height:18px;border-radius:50%;flex-shrink:0;background:${done?'#22c55e':'var(--line)'};display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">${done?'✓':''}</span>
      <span style="font-size:12.5px;color:${done?'var(--ink)':'var(--ink-dim)'}">${st.label}</span>
    </div>`;
  }).join('');
  const liveBtn = (o.status==='in_transit' && o.driverLat && o.driverLng)
    ? `<a href="https://www.google.com/maps?q=${o.driverLat},${o.driverLng}" target="_blank" rel="noopener" class="btn btn-outline btn-block" style="margin-top:8px;font-size:12.5px">📍 ড্রাইভারের লাইভ লোকেশন দেখুন</a>` : '';
  const billBox = (o.orderType==='custom-bazar' && o.billPhotoUrl)
    ? `<div style="margin-top:10px"><img src="${o.billPhotoUrl}" style="width:100%;border-radius:10px;border:1px solid var(--line)"><div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px">বিলের পরিমাণ: <strong style="color:var(--gold)">${money(o.billAmount||0)}</strong> — টাকা রেডি রাখুন</div></div>` : '';
  const chatBtn = `<button class="btn btn-outline btn-block" style="margin-top:8px;font-size:12.5px" onclick="OrderChat.open('${o.id}','customer')">💬 ড্রাইভারের সাথে চ্যাট করুন</button>`;
  return `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">${rows}${liveBtn}${billBox}${chatBtn}</div>`;
}

/* ---------- My Orders ---------- */
const MyOrders = {
  async render(){
    const list = document.getElementById('myOrdersList');
    list.innerHTML = `<p style="color:var(--ink-muted);padding:16px">লোড হচ্ছে...</p>`;
    const user = Auth.currentUser;
    if(!user){ list.innerHTML = `<div class="empty-state"><div class="em">🔒</div><h3>লগইন করুন</h3><p>আপনার অর্ডার দেখতে লগইন করুন</p><button class="btn btn-gold" onclick="AuthUI.open()">লগইন করুন</button></div>`; return; }
    if(!FB){ list.innerHTML=`<p style="color:var(--ink-muted);padding:16px">সংযোগ সমস্যা</p>`; return; }
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'orders'), FB.where('userId','==',user.uid)));
      const orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
      orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      if(!orders.length){ list.innerHTML = `<div class="empty-state"><div class="em">📦</div><h3>এখনো কোনো অর্ডার নেই</h3><button class="btn btn-gold" onclick="Router.go('listing',{cat:'all'})">শপিং শুরু করুন</button></div>`; return; }
      list.innerHTML = orders.map(o=>{
        const s = ORDER_STATUS[o.status]||ORDER_STATUS.pending;
        return `<div class="card-box"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>${o.orderNumber||o.id}</strong><span class="status-pill ${s.cls}">${s.label}</span></div>
        <div style="font-size:13px;color:var(--ink-muted)">মোট: ${money(o.subtotal||0)}</div>
        ${orderTrackHTML(o)}
        </div>`;
      }).join('');
    }catch(e){ list.innerHTML = `<p style="color:var(--ink-muted);padding:16px">লোড করা যায়নি</p>`; devWarn(e.message); }
  }
};
