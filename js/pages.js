/* pages.js — Home, Medical, Listing, PDP, Cart, Search, Checkout, CustomBazar, MyOrders */
/* ---------- Home ---------- */
const Home = {
  render(){
    const catGrid=document.getElementById('catGrid');
    if(catGrid) catGrid.innerHTML = CATEGORIES.map(c=>
      `<div class="cat-item" onclick="Router.go('listing',{cat:'${c.id}'})"><div class="em">${c.icon}</div><span>${c.label}</span></div>`).join('');
    const zp = zoneProducts();
    const loading = !ProductStore.loaded;
    if(loading){
      const fr=document.getElementById('flashRow'); if(fr) fr.innerHTML = skeletonCards(4);
      const br=document.getElementById('bestRow'); if(br) br.innerHTML = skeletonCards(4);
      const ng=document.getElementById('newGrid'); if(ng) ng.innerHTML = skeletonCards(10);
    }else{
      const empty = `<div class="empty-state" style="padding:20px"><p>এখনো কোনো প্রোডাক্ট পাওয়া যায়নি</p></div>`;
      const fr=document.getElementById('flashRow'); if(fr) fr.innerHTML = zp.filter(p=>p.isFlash).map(pcardHTML).join('') || empty;
      const br=document.getElementById('bestRow'); if(br) br.innerHTML = [...zp].sort((a,b)=>b.sold-a.sold).slice(0,10).map(pcardHTML).join('') || empty;
      const ng=document.getElementById('newGrid'); if(ng) ng.innerHTML = zp.slice(0,10).map(pcardHTML).join('') || empty;
    }
  }
};

const Medical = {
  render(){
    const el = document.getElementById('medGrid');
    if(!el) return;
    el.innerHTML = MED_LIST.map(m=>`
      <div class="card" style="padding:18px">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><span style="font-size:28px">${m.icon}</span><div><div style="font-weight:600;color:#fff;font-size:13.5px">${m.name}</div><div style="font-size:12px;color:var(--emerald)">${m.spec}</div></div></div>
        <div style="font-size:12px;color:var(--ink-muted);margin-bottom:12px">🗓️ ${m.sched}<br>📞 ভিজিট ফি: <span style="color:var(--gold);font-weight:600">ফ্রী</span></div>
        <a href="tel:+8801612057371" class="btn btn-medical btn-block" style="font-size:12.5px;padding:9px">📅 এপয়েন্টমেন্ট নিন</a>
      </div>`).join('');
  }
};

function getAIAdvice(){
  const s = (document.getElementById('aiSymptom')?.value||'').trim().toLowerCase();
  if(!s){ toast('লক্ষণ লিখুন','error'); return; }
  const box = document.getElementById('aiResultBox');
  if(!box) return;
  box.style.display='block'; box.textContent='বিশ্লেষণ চলছে...';
  setTimeout(()=>{
    let advice = 'আপনার লক্ষণের ভিত্তিতে প্রাথমিক পরামর্শ:<br><br>';
    if(s.includes('জ্বর')) advice += '• প্রচুর তরল পান করুন<br>• প্যারাসিটামল ৫০০মিগ্রা ১ ক্যাপসুল পরপর খেতে পারেন<br>';
    if(s.includes('মাথা')) advice += '• বিশ্রাম নিন, কম আলোতে থাকুন<br>';
    if(s.includes('কাশি')||s.includes('সর্দি')) advice += '• গরম পানিতে মধু মিশিয়ে খান, ভাপ নিন<br>';
    if(s.includes('পেট')||s.includes('ডায়রিয়া')) advice += '• ওআরএস খান, হালকা খাবার খান<br>';
    if(!s.includes('জ্বর')&&!s.includes('মাথা')&&!s.includes('কাশি')&&!s.includes('সর্দি')&&!s.includes('পেট')) advice += '• পর্যাপ্ত বিশ্রাম নিন, প্রচুর পানি পান করুন<br>';
    advice += '<br>• ২-৩ দিনে উন্নতি না হলে অবশ্যই ডাক্তার দেখান।';
    box.innerHTML = advice;
  }, 900);
}

/* ---------- Listing ---------- */
const Listing = {
  toggleMobile(){ document.getElementById('listingAside')?.classList.toggle('show'); },
  render(){
    const cat = Router.params.cat || 'all';
    const q = (Router.params.q||'').trim().toLowerCase();
    const sortEl=document.getElementById('sortSelect');
    const sort = sortEl?sortEl.value:'relevance';
    let items = zoneProducts();
    let title = 'সব প্রোডাক্ট';
    if(cat==='flash'){ items = items.filter(p=>p.isFlash); title='🔥 ফ্ল্যাশ সেল'; }
    else if(cat==='bestseller'){ items = [...items].sort((a,b)=>b.sold-a.sold); title='⭐ বেস্ট সেলার'; }
    else if(cat!=='all'){ items = items.filter(p=>p.category===cat); title = CATEGORIES.find(c=>c.id===cat)?.label || cat; }
    if(q){ items = items.filter(p=>p.name.toLowerCase().includes(q)); title = `"${q}" — অনুসন্ধান`; }
    const codEl=document.getElementById('filterCOD');
    if(codEl && codEl.checked) items = items.filter(p=>p.cod);
    if(sort==='price_asc') items.sort((a,b)=>a.salePrice-b.salePrice);
    if(sort==='price_desc') items.sort((a,b)=>b.salePrice-a.salePrice);
    if(sort==='rating') items.sort((a,b)=>parseFloat(b.rating)-parseFloat(a.rating));
    if(sort==='sold') items.sort((a,b)=>b.sold-a.sold);
    const titleEl=document.getElementById('listTitle'); if(titleEl) titleEl.textContent = title;
    const countEl=document.getElementById('listCount'); if(countEl) countEl.textContent = `${bn(items.length)} টি প্রোডাক্ট পাওয়া গেছে`;
    const grid=document.getElementById('listingGrid');
    if(grid) grid.innerHTML = items.map(pcardHTML).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="em">🔍</div><h3>কোনো প্রোডাক্ট পাওয়া যায়নি</h3></div>`;
  }
};

/* ---------- PDP ---------- */
const PDP = {
  product:null, qty:1,
  load(id){
    const zp = zoneProducts();
    this.product = zp.find(p=>p.id===id);
    if(!this.product){ toast('প্রোডাক্ট পাওয়া যায়নি','error'); Router.go('listing',{cat:'all'}); return; }
    this.qty = 1;
    const p = this.product;
    const crumb=document.getElementById('pdpCrumb');
    if(crumb) crumb.innerHTML = `<a href="#" onclick="Router.go('home')">হোম</a> &gt; <a href="#" onclick="Router.go('listing',{cat:'${p.category}'})">${CATEGORIES.find(c=>c.id===p.category)?.label||''}</a> &gt; ${p.name}`;
    const img=document.getElementById('pdpImg'); if(img) img.src = p.img;
    const name=document.getElementById('pdpName'); if(name) name.textContent = p.name;
    const meta=document.getElementById('pdpMeta');
    if(meta) meta.innerHTML = p.reviews>0
      ? `⭐ ${p.rating} (${bn(p.reviews)} রিভিউ) · ${bn(p.sold)} বিক্রি হয়েছে`
      : `<span style="color:#22c55e;font-weight:600">🆕 নতুন প্রোডাক্ট — প্রথম কেনার সুযোগ নিন!</span>`;
    const price=document.getElementById('pdpPrice'); if(price) price.textContent = money(p.salePrice);
    const disc = p.price>p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
    const old=document.getElementById('pdpOld'); if(old) old.textContent = disc? money(p.price):'';
    const discEl=document.getElementById('pdpDisc');
    if(discEl){ discEl.style.display = disc?'inline-block':'none'; discEl.textContent = disc?`-${bn(disc)}%`:''; }
    const unit=document.getElementById('pdpUnit'); if(unit) unit.textContent = '/ '+p.unit;
    const tags=document.getElementById('pdpTags');
    if(tags) tags.innerHTML = `${p.cod?'<span class="cod-tag">✓ COD</span>':''}${p.fastDelivery?'<span class="fast-tag">⚡ ৩০ মিনিট</span>':''}`;
    const stock=document.getElementById('pdpStock');
    if(stock) stock.textContent = p.stock>5?'✓ স্টক আছে':`⚠ মাত্র ${bn(p.stock)}টি বাকি`;
    const qtyEl=document.getElementById('pdpQty'); if(qtyEl) qtyEl.textContent = '১';
    const desc=document.getElementById('pdpDesc');
    if(desc) desc.textContent = p.description || `${p.name} — উচ্চমানের প্রোডাক্ট, নিজস্ব লোকাল ডেলিভারি সুবিধা সহ। ১০০% অরিজিনাল নিশ্চয়তা।`;
    const spec=document.getElementById('pdpSpec');
    if(spec) spec.innerHTML = `<tr><td>ব্র্যান্ড</td><td>Golapi Selection</td></tr><tr><td>ওয়ারেন্টি</td><td>৭ দিন রিপ্লেসমেন্ট</td></tr><tr><td>উৎপত্তি</td><td>বাংলাদেশ</td></tr>`;
    const rel=document.getElementById('relatedRow');
    if(rel) rel.innerHTML = zp.filter(x=>x.category===p.category && x.id!==p.id).slice(0,8).map(pcardHTML).join('');
    this.tab(null,'desc');
    /* load reviews */
    ReviewService.renderReviews(p.id, 'pdpReviews');
    /* render review form */
    const reviewForm=document.getElementById('pdpReviewForm');
    if(reviewForm){
      reviewForm.innerHTML = `
        <h3 class="tiro" style="font-size:16px;margin-bottom:10px">আপনার রিভিউ দিন</h3>
        <div style="display:flex;gap:4px;margin-bottom:10px;font-size:24px;cursor:pointer" id="starInput">
          <span onclick="PDP.setRating(1)" data-star="1">☆</span>
          <span onclick="PDP.setRating(2)" data-star="2">☆</span>
          <span onclick="PDP.setRating(3)" data-star="3">☆</span>
          <span onclick="PDP.setRating(4)" data-star="4">☆</span>
          <span onclick="PDP.setRating(5)" data-star="5">☆</span>
        </div>
        <div class="field"><textarea id="reviewText" rows="2" placeholder="আপনার অভিজ্ঞতা লিখুন..."></textarea></div>
        <button class="btn btn-gold" style="font-size:13px" onclick="PDP.submitReview()">রিভিউ সাবমিট করুন</button>`;
    }
    /* SEO: inject dynamic Product schema (JSON-LD) for this product */
    this.injectProductSchema(p, disc);
  },
  injectProductSchema(p, disc){
    const old = document.getElementById('productSchemaLD');
    if(old) old.remove();
    const schema = {
      "@context":"https://schema.org",
      "@type":"Product",
      "name": p.name,
      "image": p.img,
      "description": p.description || `${p.name} — Golapi Shop Online থেকে হোম ডেলিভারি, নোয়াখালী সদর ও বেগমগঞ্জ।`,
      "sku": p.id,
      "brand": { "@type":"Brand", "name":"Golapi Shop Online" },
      "offers": {
        "@type":"Offer",
        "url": `https://www.golapishop.online/#product?id=${p.id}`,
        "priceCurrency":"BDT",
        "price": p.salePrice,
        "availability": p.stock>0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition":"https://schema.org/NewCondition"
      }
    };
    if(p.reviews>0){
      schema.aggregateRating = {
        "@type":"AggregateRating",
        "ratingValue": p.rating,
        "reviewCount": p.reviews
      };
    }
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'productSchemaLD';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  },
  currentRating:0,
  setRating(n){
    this.currentRating=n;
    document.querySelectorAll('#starInput span').forEach(s=>{
      const star=parseInt(s.dataset.star);
      s.textContent = star<=n?'★':'☆';
      s.style.color = star<=n?'var(--gold)':'var(--ink-muted)';
    });
  },
  async submitReview(){
    const text=document.getElementById('reviewText')?.value.trim()||'';
    const userName = Auth.currentUser?.displayName || 'গ্রাহক';
    const ok = await ReviewService.submitReview(this.product.id, this.currentRating, text, userName);
    if(ok){
      this.currentRating=0;
      ReviewService.renderReviews(this.product.id, 'pdpReviews');
    }
  },
  openFullImg(){
    const overlay=document.getElementById('pdpImgOverlay');
    const fullImg=document.getElementById('pdpImgFull');
    if(overlay && fullImg){ fullImg.src=this.product?.img||''; overlay.style.display='flex'; }
  },
  tab(btn,name){
    document.querySelectorAll('.pdp-tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active'); else document.querySelector('.pdp-tabs button')?.classList.add('active');
    const pane=document.getElementById('tab-'+name); if(pane) pane.classList.add('active');
  },
  changeQty(d){
    const max = this.product?.stock ?? 99;
    this.qty = Math.max(1, Math.min(max, this.qty+d));
    const el=document.getElementById('pdpQty'); if(el) el.textContent = bn(this.qty);
  },
  addToCart(){ Cart.add(this.product.id, this.qty); },
  buyNow(){ Cart.add(this.product.id, this.qty); Router.go('checkout'); }
};

/* ---------- Cart ---------- */
const Cart = {
  items:{},
  load(){ try{ this.items = JSON.parse(localStorage.getItem('golapi_cart')||'{}'); }catch(e){ this.items={}; } this.badge(); },
  save(){ localStorage.setItem('golapi_cart', JSON.stringify(this.items)); localStorage.setItem('golapi_cart_time', Date.now().toString()); this.badge(); },
  add(id,qty=1){ this.items[id]=(this.items[id]||0)+qty; this.save(); toast('✓ কার্টে যুক্ত হয়েছে','success'); this.renderDrawer(); },
  remove(id){ delete this.items[id]; this.save(); this.renderDrawer(); },
  setQty(id,qty){ if(qty<=0){ this.remove(id); return; } this.items[id]=qty; this.save(); this.renderDrawer(); },
  totalCount(){ return Object.values(this.items).reduce((a,b)=>a+b,0); },
  totalPrice(){ return Object.entries(this.items).reduce((s,[id,q])=>{ const p=ALL_PRODUCTS.find(x=>x.id===id); return s+(p?p.salePrice*q:0); },0); },
  badge(){ const c=this.totalCount(); const el=document.getElementById('cartBadge'); if(c>0){el.style.display='flex'; el.textContent=bn(c);} else el.style.display='none'; },
  renderDrawer(){
    const body=document.getElementById('cartBody'), foot=document.getElementById('cartFoot');
    if(!body) return;
    const entries = Object.entries(this.items);
    if(!entries.length){ body.innerHTML=`<div class="empty-state"><div class="em">🛍️</div><p>আপনার কার্ট খালি</p></div>`; if(foot) foot.style.display='none'; return; }
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
    if(foot){ foot.style.display='block'; }
    const sub=document.getElementById('cartSub'); if(sub) sub.textContent = money(total);
    const del = total>1000?0:60;
    const delEl=document.getElementById('cartDel'); if(delEl) delEl.textContent = del===0?'ফ্রি':money(del);
    const tot=document.getElementById('cartTot'); if(tot) tot.textContent = money(total+del);
  },
  open(){ document.getElementById('cartDrawer').classList.add('show'); document.getElementById('cartOverlay').classList.add('show'); this.renderDrawer(); },
  close(){ document.getElementById('cartDrawer').classList.remove('show'); document.getElementById('cartOverlay').classList.remove('show'); },
  goCheckout(){ if(!this.totalCount()){ toast('কার্ট খালি আছে'); return; } this.close(); Router.go('checkout'); }
};
Cart.load();

/* ---------- Search ---------- */
function doSearch(v){ }
function submitSearch(){
  const q = document.getElementById('searchInput')?.value.trim();
  if(!q) return;
  Router.go('listing',{cat:'all', q});
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('searchInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') submitSearch(); });
});

function onUpazilaChange(prefix){
  const upazila = document.getElementById(prefix+'District')?.value;
  const zoneSel = document.getElementById(prefix+'Zone');
  if(!zoneSel) return;
  if(!upazila){ zoneSel.innerHTML = '<option value="">প্রথমে উপজেলা বেছে নিন</option>'; }
  else { zoneSel.innerHTML = '<option value="">ইউনিয়ন বেছে নিন</option>' + AREA_ZONES[upazila].map(z=>`<option value="${z}">${z}</option>`).join(''); }
  if(prefix==='cb'){
    const numEl = document.getElementById('cbBkashNum');
    if(numEl) numEl.textContent = upazila ? BRANCH_INFO[upazila].bkashNumber : 'উপজেলা বেছে নিলে দেখাবে';
  }
  if(prefix==='ck'){
    const payInfo = document.getElementById('ckPayInfo');
    if(payInfo && payInfo.dataset.method) Checkout.selectPayByMethod(payInfo.dataset.method);
  }
}

/* ---------- Delivery charge ---------- */
const DELIVERY_SETTINGS = { baseFee: 30, perKmFee: 8, perItemFee: 3, avgDistanceKm: 3, freeAboveSubtotal: 1000 };
function calcDeliveryCharge(itemCount, subtotal=0, distanceKm=null){
  if(subtotal >= DELIVERY_SETTINGS.freeAboveSubtotal) return 0;
  const km = distanceKm ?? DELIVERY_SETTINGS.avgDistanceKm;
  const fee = DELIVERY_SETTINGS.baseFee + km*DELIVERY_SETTINGS.perKmFee + itemCount*DELIVERY_SETTINGS.perItemFee;
  return Math.round(fee);
}

/* ---------- Checkout ---------- */
const Checkout = {
  pay:'cod', currentStep:1, walletAvailable:0,
  async init(){
    const d=document.getElementById('ckDistrict'); if(d) d.value='';
    const z=document.getElementById('ckZone'); if(z) z.innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    const v=document.getElementById('ckVillage'); if(v) v.value='';
    this.walletAvailable = 0;
    const useWalletEl=document.getElementById('ckUseWallet'); if(useWalletEl) useWalletEl.checked=false;
    if(Auth.currentUser && FB){
      try{
        const snap = await FB.getDoc(FB.doc(FB.db,'users',Auth.currentUser.uid));
        if(snap.exists()) this.walletAvailable = Number(snap.data().walletBalance||0);
      }catch(e){ devWarn('wallet fetch failed', e.message); }
    }
    this.goStep(1);
  },
  selectPay(el,method){
    el.parentElement.querySelectorAll('.radio-card').forEach(c=>{c.classList.remove('selected');c.querySelector('input').checked=false;});
    el.classList.add('selected'); el.querySelector('input').checked=true; this.pay=method;
    this.selectPayByMethod(method);
  },
  selectPayByMethod(method){
    const box = document.getElementById('ckPayInfo');
    if(!box) return;
    box.dataset.method = method;
    const zone = document.getElementById('ckDistrict')?.value;
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
      const step=document.getElementById('ckStep'+i);
      if(step) step.style.display = i===n?'block':'none';
      const el = document.querySelector(`.step-item[data-s="${i}"]`);
      if(el){ el.classList.remove('active','done'); if(i<n) el.classList.add('done'); if(i===n) el.classList.add('active'); }
    });
    if(n===3) this.renderSummary();
  },
  isStep1Valid(){
    const name = document.getElementById('ckName')?.value.trim()||'';
    const phone = document.getElementById('ckPhone')?.value.trim().replace(/[\s-]/g,'')||'';
    const addr = document.getElementById('ckAddress')?.value.trim()||'';
    const upazila = document.getElementById('ckDistrict')?.value||'';
    const zone = document.getElementById('ckZone')?.value||'';
    const village = document.getElementById('ckVillage')?.value.trim()||'';
    const instructions = document.getElementById('ckInstructions')?.value.trim()||'';
    const nid = document.getElementById('ckNid')?.value.trim().replace(/\s/g,'')||'';
    const phoneRe = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    const nidRe = /^\d{10}$|^\d{13}$/;
    return name.length>0 && phoneRe.test(phone) && nidRe.test(nid) && addr.length>=5 && upazila && zone && village.length>0 && instructions.length>0;
  },
  getWalletUsed(sub, ship){
    const useWallet = document.getElementById('ckUseWallet')?.checked;
    if(!useWallet || this.walletAvailable<=0) return 0;
    return Math.min(this.walletAvailable, sub+ship);
  },
  renderSummary(){
    const entries = Object.entries(Cart.items);
    let itemCount = 0;
    const sumEl=document.getElementById('ckSummary');
    if(sumEl) sumEl.innerHTML = entries.map(([id,q])=>{
      const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p) return '';
      itemCount += q;
      return `<div class="row-between"><span>${p.name} × ${bn(q)}</span><span>${money(p.salePrice*q)}</span></div>`;
    }).join('');
    const sub = Cart.totalPrice();
    const ship = calcDeliveryCharge(itemCount, sub);
    const walletBox=document.getElementById('ckWalletBox');
    if(walletBox) walletBox.style.display = this.walletAvailable>0 ? 'block' : 'none';
    const availEl=document.getElementById('ckWalletAvail'); if(availEl) availEl.textContent = money(this.walletAvailable);
    const walletUsed = this.getWalletUsed(sub, ship);
    const walletRow=document.getElementById('ckWalletRow');
    if(walletRow) walletRow.style.display = walletUsed>0 ? 'flex' : 'none';
    const walletDiscEl=document.getElementById('ckWalletDiscount'); if(walletDiscEl) walletDiscEl.textContent = '−'+money(walletUsed);
    const subEl=document.getElementById('ckSub'); if(subEl) subEl.textContent = money(sub);
    const shipEl=document.getElementById('ckShip'); if(shipEl) shipEl.textContent = ship===0?'ফ্রি':money(ship);
    const totEl=document.getElementById('ckTotal'); if(totEl) totEl.textContent = money(sub+ship-walletUsed);
  },
  async placeOrder(){
    const name=document.getElementById('ckName').value.trim();
    const phone=document.getElementById('ckPhone').value.trim();
    const addr=document.getElementById('ckAddress').value.trim();
    const upazila=document.getElementById('ckDistrict').value;
    const zone=document.getElementById('ckZone').value;
    const village=document.getElementById('ckVillage').value.trim();
    const instructions=document.getElementById('ckInstructions').value.trim();
    const nid = document.getElementById('ckNid').value.trim().replace(/\s/g,'');
    const phoneRe = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    const nidRe = /^\d{10}$|^\d{13}$/;
    if(!name||!phoneRe.test(phone.replace(/[\s-]/g,''))||!nidRe.test(nid)||addr.length<5||!upazila||!zone||!village||!instructions){ toast('⚠ সব তথ্য পূরণ করুন — NID নম্বর (১০ বা ১৩ সংখ্যা) বাধ্যতামূলক','error'); this.goStep(1); return; }
    if(!document.getElementById('ckTerms').checked){ toast('⚠ শর্তাবলীতে সম্মত হতে হবে','error'); return; }
    if(!FB){ toast('⚠ সংযোগ সমস্যা — আবার চেষ্টা করুন','error'); return; }
    const orderNo = 'GS-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900000)+100000);
    const sub = Cart.totalPrice();
    const itemCount = Object.values(Cart.items).reduce((a,b)=>a+b,0);
    const ship = calcDeliveryCharge(itemCount, sub);
    const walletUsed = this.getWalletUsed(sub, ship);
    try{
      const orderRef = await FB.addDoc(FB.collection(FB.db,'orders'),{
        orderNumber:orderNo, customerName:name, customerPhone:phone, customerNid:nid, address:addr, village,
        branchZone:upazila, district:AREA_LABELS[upazila]||'', zone,
        instructions, paymentMethod:this.pay, paymentStatus:this.pay==='cod'?'cod':'pending_submission', deliverySlot:'express',
        items:Object.entries(Cart.items).map(([id,qty])=>({productId:id,qty})),
        subtotal:sub+ship-walletUsed, shippingCost:ship, walletUsed,
        status:'pending', driverId:null, driverName:null,
        userId:Auth.currentUser?.uid||null, createdAt:FB.serverTimestamp()
      });
      if(walletUsed>0 && Auth.currentUser){
        await FB.updateDoc(FB.doc(FB.db,'users',Auth.currentUser.uid), { walletBalance: FB.increment(-walletUsed) }).catch(e=>devWarn('wallet deduct failed', e.message));
      }
      const sn=document.getElementById('successOrderNo'); if(sn) sn.textContent = orderNo;
      Cart.items={}; Cart.save();
      if(this.pay==='bkash' || this.pay==='nagad'){
        PaymentGateway.showPaymentModal(this.pay, sub+ship-walletUsed, orderRef.id, upazila);
      } else {
        Router.go('order-success');
      }
    }catch(e){ devWarn('order failed', e.message); toast('❌ অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন','error'); }
  }
};

/* ---------- Custom Bazar ---------- */
const CustomBazar = {
  init(){
    ['cbName','cbPhone','cbAddress','cbList','cbNotes','cbTrxId','cbVillage','cbInstructions'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const d=document.getElementById('cbDistrict'); if(d) d.value='';
    const z=document.getElementById('cbZone'); if(z) z.innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    const b=document.getElementById('cbBkashNum'); if(b) b.textContent='উপজেলা বেছে নিলে দেখাবে';
    const m=document.getElementById('cbMsg'); if(m) m.className='form-msg';
    this.renderPastOrders();
  },
  async renderPastOrders(){
    const box = document.getElementById('cbPastOrdersBox');
    if(!box) return;
    if(!Auth.currentUser || !FB){ box.style.display='none'; return; }
    try{
      const snap = await FB.getDocs(FB.query(
        FB.collection(FB.db,'orders'),
        FB.where('userId','==',Auth.currentUser.uid),
        FB.where('orderType','==','custom-bazar')
      ));
      const orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
      orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      if(!orders.length){ box.style.display='none'; return; }
      const recent = orders.slice(0,3);
      box.style.display='block';
      box.innerHTML = `<div class="card-box" style="border-color:var(--gold-line);background:rgba(212,175,55,.04)">
        <strong style="font-size:13px;color:var(--gold)">🔁 আগের বাজার লিস্ট থেকে দ্রুত অর্ডার করুন</strong>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
          ${recent.map(o=>{
            const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('bn-BD') : '';
            const preview = (o.bazarList||'').split('\n').filter(Boolean).slice(0,2).join(', ');
            return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px;background:rgba(255,255,255,.02);border-radius:8px">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:#fff">${o.bazarTypeLabel||'বাজার'} — ${date}</div>
                <div style="font-size:11px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${preview}...</div>
              </div>
              <button class="btn btn-outline" style="font-size:11.5px;padding:6px 10px;white-space:nowrap" onclick='CustomBazar.reuseOrder(${JSON.stringify(o).replace(/'/g,"&#39;")})'>এই লিস্ট ব্যবহার করুন</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }catch(e){ devWarn('past bazar orders load failed', e.message); box.style.display='none'; }
  },
  reuseOrder(o){
    document.getElementById('cbName').value = o.customerName||'';
    document.getElementById('cbPhone').value = o.customerPhone||'';
    document.getElementById('cbAddress').value = o.address||'';
    document.getElementById('cbVillage').value = o.village||'';
    document.getElementById('cbInstructions').value = o.instructions||'';
    document.getElementById('cbNotes').value = o.notes||'';
    document.getElementById('cbList').value = o.bazarList||'';
    document.getElementById('cbType').value = o.bazarType||'weekly';
    if(o.branchZone){
      document.getElementById('cbDistrict').value = o.branchZone;
      onUpazilaChange('cb');
      setTimeout(()=>{ const zEl=document.getElementById('cbZone'); if(zEl) zEl.value = o.zone||''; }, 100);
    }
    toast('✓ আগের লিস্ট বসানো হয়েছে — চেক করে ট্রানজেকশন ID দিয়ে জমা দিন','success');
    window.scrollTo({top:0, behavior:'smooth'});
  },
  async submit(){
    const msgEl=document.getElementById('cbMsg');
    const name=document.getElementById('cbName')?.value.trim()||'';
    const phone=document.getElementById('cbPhone')?.value.trim()||'';
    const address=document.getElementById('cbAddress')?.value.trim()||'';
    const district=document.getElementById('cbDistrict')?.value||'';
    const zone=document.getElementById('cbZone')?.value||'';
    const village=document.getElementById('cbVillage')?.value.trim()||'';
    const instructions=document.getElementById('cbInstructions')?.value.trim()||'';
    const type=document.getElementById('cbType')?.value||'weekly';
    const list=document.getElementById('cbList')?.value.trim()||'';
    const notes=document.getElementById('cbNotes')?.value.trim()||'';
    const trxId=document.getElementById('cbTrxId')?.value.trim()||'';
    if(!name||!phone||!address||!district||!zone||!village||!instructions||!list||!trxId){ msgEl.textContent='সব প্রয়োজনীয় তথ্য পূরণ করুন (ডেলিভারি ইনস্ট্রাকশন সহ)'; msgEl.className='form-msg err'; return; }
    const phoneRe=/^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRe.test(phone.replace(/[\s-]/g,''))){ msgEl.textContent='সঠিক মোবাইল নম্বর দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    const btn=document.getElementById('cbSubmitBtn'); const orig=btn.textContent; btn.textContent='জমা হচ্ছে...'; btn.disabled=true;
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
            const submittedOrder = {orderNumber:orderNo, orderType:'custom-bazar', bazarType:type, bazarTypeLabel:typeLabels[type]||type, customerName:name, customerPhone:phone, address, village, instructions, notes, bazarList:list, advanceAmount:100};
      msgEl.innerHTML = `✅ আপনার বাজার অর্ডার (${orderNo}) সফলভাবে জমা হয়েছে! ড্রাইভার বাজার করার পর বিলের ছবি এখানেই দেখতে পাবেন।<br><button class="btn btn-outline" style="margin-top:10px;font-size:12.5px;padding:8px 16px" onclick='BazarMemo.open(${JSON.stringify(submittedOrder).replace(/'/g,"&#39;")})'>🧾 মেমো দেখুন / প্রিন্ট করুন</button>`;
      msgEl.className='form-msg ok';
      btn.textContent=orig; btn.disabled=false;
    }catch(e){ msgEl.textContent='সমস্যা হয়েছে: '+e.message; msgEl.className='form-msg err'; btn.textContent=orig; btn.disabled=false; }
  }
};

/* ---------- Order Chat ---------- */
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
    const text = input?.value.trim(); if(!text || !this.orderId || !FB) return;
    if(input) input.value='';
    try{ await FB.addDoc(FB.collection(FB.db,'orders',this.orderId,'messages'), {from:this.role, text, at:FB.serverTimestamp()}); }
    catch(e){ toast('মেসেজ পাঠানো যায়নি','error'); }
  }
};

/* ---------- Order tracking ---------- */
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
    const memoBtn = (o.orderType==='custom-bazar')
    ? `<button class="btn btn-outline btn-block" style="margin-top:8px;font-size:12.5px" onclick='BazarMemo.open(${JSON.stringify(o).replace(/'/g,"&#39;")})'>🧾 মেমো দেখুন / প্রিন্ট করুন</button>` : '';
  const billBox = (o.orderType==='custom-bazar' && (o.billPhotos?.length || o.bazarItems?.length))
    ? `<div style="margin-top:10px">
        ${o.bazarItems?.length ? `<div style="background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px">
          ${o.bazarItems.map(it=>`<div class="row-between" style="font-size:12px"><span>${it.text}</span><span>${money(it.price)}</span></div>`).join('')}
          <div class="row-between" style="font-weight:700;color:#fff;border-top:1px solid var(--line);margin-top:6px;padding-top:6px"><span>মোট বিল</span><span style="color:var(--gold)">${money(o.billAmount||0)}</span></div>
        </div>` : ''}
        ${(o.billPhotos||[]).map(url=>`<img src="${url}" style="width:100%;border-radius:10px;border:1px solid var(--line);margin-bottom:6px">`).join('')}
        <div style="font-size:11.5px;color:var(--ink-muted)">ড্রাইভার ডেলিভারির সময় আসল দোকানের মেমো/রশিদও সাথে নিয়ে আসবে — টাকা রেডি রাখুন।</div>
      </div>` : '';
  const chatBtn = `<button class="btn btn-outline btn-block" style="margin-top:8px;font-size:12.5px" onclick="OrderChat.open('${o.id}','customer')">💬 ড্রাইভারের সাথে চ্যাট করুন</button>`;
  const isCancellable = ['pending','confirmed','packed','assigned'].includes(o.status);
  const cancelBtn = isCancellable ? `<button class="btn btn-outline btn-block" style="margin-top:6px;font-size:12px;color:#f87171;border-color:rgba(239,68,68,.2)" onclick="CancelOrder.open('${o.id}')">❌ অর্ডার বাতিল করুন</button>` : '';
  const refundBtn = (o.status==='delivered' && !o.refundRequested) ? `<button class="btn btn-outline btn-block" style="margin-top:6px;font-size:12px;color:#fbbf24;border-color:rgba(251,191,36,.2)" onclick="RefundRequest.open('${o.id}')">↩️ রিটার্ন/রিফান্ড রিকোয়েস্ট</button>` : '';
  return `<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">${rows}${liveBtn}${billBox}${chatBtn}${cancelBtn}${refundBtn}</div>`;
}

/* ---------- My Orders ---------- */
const MyOrders = {
  cache: [], tab: 'active',
  switchTab(tab){
    this.tab = tab;
    const actEl=document.getElementById('ordersTabActive');
    const pastEl=document.getElementById('ordersTabPast');
    if(actEl){ actEl.style.color = tab==='active' ? 'var(--gold)' : 'var(--ink-muted)'; actEl.style.borderColor = tab==='active' ? 'var(--gold)' : 'transparent'; }
    if(pastEl){ pastEl.style.color = tab==='past' ? 'var(--gold)' : 'var(--ink-muted)'; pastEl.style.borderColor = tab==='past' ? 'var(--gold)' : 'transparent'; }
    this.renderList();
  },
  async render(){
    const list = document.getElementById('myOrdersList');
    if(!list) return;
    list.innerHTML = `<p style="color:var(--ink-muted);padding:16px">লোড হচ্ছে...</p>`;
    const user = Auth.currentUser;
    if(!user){ list.innerHTML = `<div class="empty-state"><div class="em">🔒</div><h3>লগইন করুন</h3><p>আপনার অর্ডার দেখতে লগইন করুন</p><button class="btn btn-gold" onclick="AuthUI.open()">লগইন করুন</button></div>`; return; }
    if(!FB){ list.innerHTML=`<p style="color:var(--ink-muted);padding:16px">সংযোগ সমস্যা</p>`; return; }
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'orders'), FB.where('userId','==',user.uid)));
      const orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
      orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      this.cache = orders;
      this.renderList();
    }catch(e){ list.innerHTML = `<p style="color:var(--ink-muted);padding:16px">লোড করা যায়নি</p>`; devWarn(e.message); }
  },
  renderList(){
    const list = document.getElementById('myOrdersList');
    if(!list) return;
    const isPast = o => o.status==='delivered' || o.status==='cancelled';
    const orders = this.cache.filter(o => this.tab==='active' ? !isPast(o) : isPast(o));
    if(!orders.length){
      list.innerHTML = this.tab==='active'
        ? `<div class="empty-state"><div class="em">📦</div><h3>এখনো কোনো চলমান অর্ডার নেই</h3><button class="btn btn-gold" onclick="Router.go('listing',{cat:'all'})">শপিং শুরু করুন</button></div>`
        : `<div class="empty-state"><div class="em">🗂️</div><h3>আগের কোনো অর্ডার নেই</h3></div>`;
      return;
    }
    list.innerHTML = orders.map(o=>{
      const s = ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      const editBtn = (this.tab==='active' && OrderEdit.isEditable(o.status))
        ? `<button class="btn btn-outline" style="font-size:11.5px;padding:6px 12px;margin-top:8px" onclick='OrderEdit.open("${o.id}", ${JSON.stringify({village:o.village||'',address:o.address||'',instructions:o.instructions||''})})'>✏️ ঠিকানা/ইনস্ট্রাকশন এডিট করুন</button>`
        : '';
      return `<div class="card-box"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>${o.orderNumber||o.id}</strong><span class="status-pill ${s.cls}">${s.label}</span></div>
      <div style="font-size:13px;color:var(--ink-muted)">মোট: ${money(o.subtotal||0)}</div>
      ${editBtn}
      ${this.tab==='active' ? orderTrackHTML(o) : ''}
      </div>`;
    }).join('');
  }
};