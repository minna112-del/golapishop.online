const Home = {
  rendered:false,
  render(){
    document.getElementById('categoryGrid').innerHTML = CATEGORIES.map(c=>{
      const route = c.id === 'custom-bazar'
        ? `Router.go('custom-bazar')`
        : `Router.go('listing',{cat:'${c.id}'})`;
      return `<a href="#" class="cat-item" onclick="${route}">
        <div class="cat-circle">${c.icon}</div><span>${c.label}</span>
      </a>`;
    }).join('');

    const zp = zoneProducts();
    const emptyMsg = `<div class="empty-state" style="padding:40px 20px;"><p style="color:var(--ink-soft);">এই মুহূর্তে কোনো প্রোডাক্ট পাওয়া যাচ্ছে না</p></div>`;

    // প্রোডাক্ট এখনো Firestore থেকে লোড হয়নি — এই অবস্থায় খালি স্ক্রিনের বদলে
    // শিমার-স্কেলিটন দেখাই, যাতে "ভাঙা" না লাগে।
    const stillLoading = !ProductStore.loaded;

    if(stillLoading){
      document.getElementById('flashSaleRow').innerHTML = skeletonCards(4);
      document.getElementById('bestSellerRow').innerHTML = skeletonCards(4);
      document.getElementById('newArrivalGrid').innerHTML = skeletonCards(8);
      document.getElementById('recommendedRow').innerHTML = skeletonCards(4);
    }else{
      document.getElementById('flashSaleRow').innerHTML = zp.length ? (zp.filter(p=>p.isFlash).map(pcardHTML).join('') || '<p style="color:var(--ink-soft);padding:10px;">এই মুহূর্তে কোনো ফ্ল্যাশ সেল নেই</p>') : emptyMsg;
      document.getElementById('bestSellerRow').innerHTML = zp.length ? [...zp].sort((a,b)=>b.sold-a.sold).slice(0,10).map(pcardHTML).join('') : emptyMsg;
      document.getElementById('newArrivalGrid').innerHTML = zp.length ? zp.slice(0,12).map(pcardHTML).join('') : emptyMsg;
      document.getElementById('recommendedRow').innerHTML = zp.length ? [...zp].sort(()=>Math.random()-0.5).slice(0,10).map(pcardHTML).join('') : emptyMsg;
    }

    this.renderRepeatOrder();
  },
  renderRepeatOrder(){
    const section = document.getElementById('repeatOrderSection');

    const loadFromFirestore = async () => {
      if(!FB || !Auth.currentUser) return null;
      try{
        const snap = await FB.getDocs(
          FB.query(
            FB.collection(FB.db,'orders'),
            FB.where('userId','==',Auth.currentUser.uid),
            FB.orderBy('createdAt','desc'),
            FB.limit(1)
          )
        );
        if(snap.empty) return null;
        const lastOrder = snap.docs[0].data();
        return (lastOrder.items||[]).map(i=>i.productId);
      }catch(e){ devWarn('Repeat-order Firestore lookup failed:', e.message); return null; }
    };

    const render = (ids) => {
      if(!ids || !ids.length){ section.style.display='none'; return; }
      const zp = zoneProducts();
      const items = ids.map(id=>zp.find(p=>p.id===id)).filter(Boolean);
      if(!items.length){
        // আগের অর্ডার ছিল, কিন্তু সেই প্রোডাক্ট এই জোনে নেই (যেমন সদর থেকে বেগমগঞ্জে
        // সুইচ করা হয়েছে) — সেকশনটা সম্পূর্ণ হাইড না করে কারণ জানিয়ে দিই, নইলে
        // "রিপিট অর্ডার" ফিচারটা ভেঙে গেছে মনে হবে।
        section.style.display='block';
        document.getElementById('repeatOrderRow').innerHTML = `
          <div style="padding:20px;color:var(--ink-soft);font-size:13.5px;">
            আগের অর্ডারের প্রোডাক্ট এই শাখায় পাওয়া যাচ্ছে না।
          </div>`;
        return;
      }
      section.style.display='block';
      document.getElementById('repeatOrderRow').innerHTML = items.map(pcardHTML).join('') + `
        <div class="pcard" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;cursor:pointer;" onclick="Home.repeatAll()">
          <span style="font-size:28px;">🔁</span>
          <span style="font-size:13px;font-weight:600;color:var(--rose);text-align:center;padding:0 10px;">সবগুলো একসাথে কার্টে যুক্ত করুন</span>
        </div>`;
    };

    let lastOrderIds = JSON.parse(localStorage.getItem('golapi_last_order_items')||'[]');
    if(lastOrderIds.length){
      render(lastOrderIds);
    }else{
      // localStorage খালি (যেমন: ব্রাউজার ডাটা ক্লিয়ার হয়েছে) — Firestore থেকে শেষ অর্ডার খুঁজি
      loadFromFirestore().then(ids=>{
        if(ids) localStorage.setItem('golapi_last_order_items', JSON.stringify(ids));
        render(ids || []);
      });
    }
  },
  repeatAll(){
    const lastOrderIds = JSON.parse(localStorage.getItem('golapi_last_order_items')||'[]');
    lastOrderIds.forEach(id=>Cart.add(id,1));
    toast('✓ আগের অর্ডারের সব প্রোডাক্ট কার্টে যুক্ত হয়েছে');
  }
};

/* ---------- Listing page ---------- */
const Listing = {
  // মোবাইলে ফিল্টার সাইডবার ডিফল্টভাবে বন্ধ থাকে (প্রোডাক্ট দেখার আগে স্ক্রল করে
  // ফিল্টার পার হতে হতো না) — এই বাটনে ট্যাপ করলেই খোলে/বন্ধ হয়।
  toggleMobileFilters(){
    const aside = document.getElementById('listingFiltersAside');
    const btn = document.getElementById('mobileFilterToggle');
    const isShowing = aside.classList.toggle('show');
    btn.innerHTML = isShowing
      ? '⚙️ ফিল্টার ও সর্ট <span style="float:right;">▴</span>'
      : '⚙️ ফিল্টার ও সর্ট <span style="float:right;">▾</span>';
  },
  render(){
    const cat = Router.params.cat || 'all';
    const q = (Router.params.q || '').trim().toLowerCase();
    const sort = document.getElementById('sortSelect').value;
    let items = zoneProducts();
    let title = 'সব প্রোডাক্ট';
    if(!items.length){
      document.getElementById('listingBreadTitle').textContent = title;
      document.getElementById('listingCount').textContent = 'কোনো প্রোডাক্ট পাওয়া যায়নি';
      document.getElementById('listingGrid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="icon">📦</div><h3>এখনো কোনো প্রোডাক্ট যুক্ত করা হয়নি</h3><p>শীঘ্রই প্রোডাক্ট যুক্ত হবে, পরে আবার চেক করুন</p>
        </div>`;
      return;
    }
    if(cat==='flash'){ items = items.filter(p=>p.isFlash); title='🔥 ফ্ল্যাশ সেল'; }
    else if(cat==='bestseller'){ items.sort((a,b)=>b.sold-a.sold); title='⭐ বেস্ট সেলার'; }
    else if(cat==='new'){ title='🆕 নতুন এসেছে'; }
    else if(cat!=='all'){ items = items.filter(p=>p.category===cat); const c=CATEGORIES.find(x=>x.id===cat); title = c?c.label:cat; }

    // Search filter — matches name, description, or category label
    if(q){
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description||'').toLowerCase().includes(q) ||
        (CATEGORIES.find(c=>c.id===p.category)?.label||'').includes(q)
      );
      title = `"${q}" — অনুসন্ধান ফলাফল`;
    }

    if(document.getElementById('filterCOD').checked) items = items.filter(p=>p.cod);

    // Numeric sort — explicit Number()/parseFloat() so string comparisons can't sneak in
    if(sort==='price_asc') items.sort((a,b)=>Number(a.salePrice)-Number(b.salePrice));
    if(sort==='price_desc') items.sort((a,b)=>Number(b.salePrice)-Number(a.salePrice));
    if(sort==='rating') items.sort((a,b)=>parseFloat(b.rating)-parseFloat(a.rating));

    document.getElementById('listingBreadTitle').innerHTML = q
      ? `${title} <button onclick="Listing.clearSearch()" style="margin-left:8px;font-size:12px;color:var(--rose);background:var(--blush);border:none;border-radius:12px;padding:3px 10px;cursor:pointer;">✕ সার্চ মুছুন</button>`
      : title;
    document.getElementById('listingCount').textContent = q
      ? `"${q}" এর জন্য ${items.length}টি ফলাফল পাওয়া গেছে`
      : `${items.length} টি প্রোডাক্ট পাওয়া গেছে`;
    document.getElementById('listingGrid').innerHTML = items.map(pcardHTML).join('') || `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="icon">🔍</div><h3>কোনো প্রোডাক্ট পাওয়া যায়নি</h3><p>ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</p>
      </div>`;
  },
  clearSearch(){
    document.getElementById('searchInput').value = '';
    Router.go('listing', {cat: Router.params.cat || 'all'});
  }
};
document.getElementById('filterCOD').addEventListener('change', Listing.render);
document.getElementById('priceRange').addEventListener('input', e=>{
  document.getElementById('priceMaxLabel').textContent = money(e.target.value);
});

function doSearch(){
  const q = document.getElementById('searchInput').value.trim();
  if(!q) return;
  Router.go('listing',{cat:'all', q});
  toast(`"${q}" খোঁজা হচ্ছে...`);
}
document.getElementById('searchInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
document.getElementById('ownerPinInput').addEventListener('keydown', e=>{ if(e.key==='Enter') OwnerAuth.unlock(); });
document.getElementById('driverPin').addEventListener('keydown', e=>{ if(e.key==='Enter') DriverPortal.login(); });

/* ---------- Product Details Page ---------- */

const PDP = {
  product:null, qty:1,
  load(id){
    const zp = zoneProducts();
    this.product = zp.find(p=>p.id===id);

    if(!this.product){
      // লোকাল cache-এ নেই — হতে পারে এখনো Firestore থেকে প্রোডাক্ট লোড হয়নি (direct/deep link),
      // তাই সরাসরি Firestore-এ চেক করি একবার, তারপরই হার মানি।
      if(FB){
        FB.getDoc(FB.doc(FB.db,'products',id)).then(snap=>{
          if(snap.exists()){
            // প্রোডাক্ট আছে, শুধু cache stale ছিল — রিফ্রেশ করে আবার লোড করি
            toast('প্রোডাক্ট লোড হচ্ছে...');
            ProductStore.refreshAndRerender().then(()=>this.load(id));
          }else{
            toast('প্রোডাক্ট পাওয়া যাচ্ছে না');
            Router.go('listing',{cat:'all'});
          }
        }).catch(()=>Router.go('listing',{cat:'all'}));
      }else{
        toast('প্রোডাক্ট পাওয়া যাচ্ছে না');
        Router.go('listing',{cat:'all'});
      }
      return;
    }
    this.qty = 1;
    const p = this.product;
    document.getElementById('pdpBreadcrumb').innerHTML = `<a href="#" onclick="Router.go('home')">হোম</a> &gt; <a href="#" onclick="Router.go('listing',{cat:'${p.category}'})">${CATEGORIES.find(c=>c.id===p.category)?.label||''}</a> &gt; ${p.name}`;
    const pdpImg = document.getElementById('pdpMainImg');
    pdpImg.src = p.img;
    pdpImg.loading = 'lazy';
    pdpImg.alt = p.name;
    document.getElementById('pdpThumbs').innerHTML = Array.from({length:4},(_,i)=>
      `<div role="button" aria-label="${p.name} ছবি ${i+1}" tabindex="0"></div>`
    ).join('');
    document.getElementById('pdpTitle').textContent = p.name;
    document.getElementById('pdpRating').innerHTML = `⭐ ${p.rating} (${p.reviews} রিভিউ) | ${p.sold} বিক্রি হয়েছে`;
    document.getElementById('pdpPriceNow').textContent = money(p.salePrice);
    const discount = p.price>p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
    document.getElementById('pdpPriceOld').textContent = discount? money(p.price) : '';
    document.getElementById('pdpDiscount').style.display = discount?'inline-block':'none';
    document.getElementById('pdpDiscount').textContent = discount?`-${discount}%`:'';
    document.getElementById('pdpUnit').textContent = '/ ' + p.unit;
    document.getElementById('pdpFastTag').style.display = p.fastDelivery?'inline-block':'none';
    document.getElementById('pdpCodTag').style.display = p.cod?'inline-block':'none';
    document.getElementById('pdpStock').textContent = p.stock>5?'✓ স্টকে আছে':`⚠ মাত্র ${p.stock}টি বাকি`;
    document.getElementById('pdpQty').textContent = '১';
    document.getElementById('pdpDesc').textContent = `${p.name} — উচ্চমানের প্রোডাক্ট, নিজস্ব লোকাল ডেলিভারি সুবিধা সহ। ১০০% অরিজিনাল পণ্যের নিশ্চয়তা।`;
    document.getElementById('pdpSpecTable').innerHTML = `
      <tr><td>ব্র্যান্ড</td><td>Golapi Selection</td></tr>
      <tr><td>ওজন</td><td>০.৫ কেজি</td></tr>
      <tr><td>ওয়ারেন্টি</td><td>৭ দিন রিপ্লেসমেন্ট</td></tr>
      <tr><td>উৎপত্তি</td><td>বাংলাদেশ</td></tr>`;
    document.getElementById('relatedProductsRow').innerHTML = zp.filter(x=>x.category===p.category && x.id!==p.id).slice(0,8).map(pcardHTML).join('');
    this.tab(null, 'desc');
  },
  tab(btn, name){
    document.querySelectorAll('.pdp-tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    else document.querySelector('.pdp-tabs button')?.classList.add('active'); // default to first tab when called programmatically
    document.getElementById('tab-'+name).classList.add('active');
  },
  changeQty(d){
    const maxQty = this.product?.stock ?? 99;
    const newQty = Math.max(1, Math.min(maxQty, this.qty + d));
    if(newQty === this.qty && d > 0 && this.qty >= maxQty){
      toast(`⚠ স্টকে মাত্র ${maxQty}টি আছে`);
    }
    this.qty = newQty;
    document.getElementById('pdpQty').textContent = this.qty.toLocaleString('bn-BD');
  },
  addToCart(){ Cart.add(this.product.id, this.qty); },
  buyNow(){ Cart.add(this.product.id, this.qty); Router.go('checkout'); }
};

/* ---------- Cart ---------- */

const Checkout = {
  paymentMethod:'cod',
  deliverySlot:'express',
  discount:0,
  currentStep:1,
  init(){
    // আগে এখানে এরিয়া-গেট চেক করে browsing ব্লক করা হতো — এখন আর হয় না। শাখা/উপজেলা
    // এখন এই ফর্মেই (ঠিকানার সাথে) বেছে নেওয়া হয়, তাই ফর্মটা খালি অবস্থায় শুরু হয়।
    document.getElementById('ckDistrict').value = '';
    document.getElementById('ckZone').innerHTML = '<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    // আগের চেকআউটের লোকেশন পিন এখানে রিসেট করি — নতুন অর্ডারে পুরোনো GPS ডাটা যেন
    // ভুলবশত যুক্ত না হয়ে যায়
    this.customerLat = null;
    this.customerLng = null;
    document.getElementById('ckLocationStatus').style.display = 'none';
    document.getElementById('ckMapPreview').style.display = 'none';
    document.getElementById('ckMapPreview').innerHTML = '';
    this.goStep(1);
    this.renderSummary();
  },
  onUpazilaChange(){
    const upazila = document.getElementById('ckDistrict').value;
    const zoneSelect = document.getElementById('ckZone');
    if(!upazila){ zoneSelect.innerHTML = '<option value="">প্রথমে উপজেলা বেছে নিন</option>'; return; }
    zoneSelect.innerHTML = '<option value="">এলাকা বেছে নিন</option>' + AREA_ZONES[upazila].map(z=>`<option value="${z}">${z}</option>`).join('');
  },
  selectSlot(el, slot){
    el.parentElement.querySelectorAll('.radio-card').forEach(c=>{c.classList.remove('selected'); c.querySelector('input').checked=false;});
    el.classList.add('selected'); el.querySelector('input').checked=true;
    this.deliverySlot = slot;
    this.renderSummary(); // এক্সপ্রেস ডেলিভারি বেছে নিলে অতিরিক্ত ৳২০ এখনই দেখানো হয়, স্টেপ ৩ পর্যন্ত অপেক্ষা করতে হয় না
  },
  goStep(n){
    // স্টেপ ১ থেকে পরের স্টেপে যাওয়ার আগে ঠিকানার তথ্য সঠিক কিনা যাচাই করি —
    // আগে শুধু সবশেষে "অর্ডার কনফার্ম করুন"-এ ক্লিক করলে ভ্যালিডেশন হতো, যার মানে
    // কাস্টমার ৩ স্টেপ পার করে এসে জানতে পারত ফোন নম্বর ভুল ছিল।
    if(n > 1 && this.currentStep === 1 && !this.isStep1Valid()){
      toast('⚠ প্রথমে ঠিকানার তথ্য সঠিকভাবে পূরণ করুন');
      return;
    }
    this.currentStep = n;
    [1,2,3].forEach(i=>{
      document.getElementById('checkout-step-'+i).style.display = i===n?'block':'none';
      const stepEl = document.querySelector(`.step-item[data-step="${i}"]`);
      stepEl.classList.remove('active','done');
      if(i<n) stepEl.classList.add('done');
      if(i===n) stepEl.classList.add('active');
    });
    if(n===3) this.renderSummary();
  },
  isStep1Valid(){
    const name = document.getElementById('ckName').value.trim();
    const phone = document.getElementById('ckPhone').value.trim().replace(/[\s-]/g,'');
    const address = document.getElementById('ckAddress').value.trim();
    const upazila = document.getElementById('ckDistrict').value;
    const zone = document.getElementById('ckZone').value;
    const phoneRegex = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    return name.length>0 && phoneRegex.test(phone) && address.length>=10 && upazila.length>0 && zone.length>0;
  },
  validateNameLive(input){
    input.style.borderColor = input.value.trim().length>0 ? 'var(--green)' : '';
  },
  validatePhoneLive(input){
    const phoneRegex = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    const errEl = document.getElementById('ckPhoneError');
    const val = input.value.trim().replace(/[\s-]/g,'');
    if(val.length === 0){ errEl.style.display='none'; input.style.borderColor=''; return; }
    if(!phoneRegex.test(val)){
      errEl.textContent = 'সঠিক বাংলাদেশি নম্বর দিন (যেমন: 01712345678)';
      errEl.style.display='block';
      input.style.borderColor = '#C0392B';
    }else{
      errEl.style.display='none';
      input.style.borderColor = 'var(--green)';
    }
  },
  validateAddressLive(input){
    const errEl = document.getElementById('ckAddressError');
    const val = input.value.trim();
    if(val.length === 0){ errEl.style.display='none'; input.style.borderColor=''; return; }
    if(val.length < 10){
      errEl.textContent = 'সম্পূর্ণ ঠিকানা লিখুন (কমপক্ষে ১০ ক্যারেক্টার)';
      errEl.style.display='block';
      input.style.borderColor = '#C0392B';
    }else{
      errEl.style.display='none';
      input.style.borderColor = 'var(--green)';
    }
  },
  customerLat: null,
  customerLng: null,
  // কাস্টমারের বর্তমান GPS লোকেশন নিয়ে নেয় (ব্রাউজার পারমিশন চাইবে), lat/lng সেভ করে
  // রাখে এবং একটা ছোট ম্যাপ প্রিভিউ দেখায়। এই lat/lng অর্ডারের সাথে Firestore-এ সেভ হয়,
  // যাতে Owner Dashboard/Zone Manager/Driver সরাসরি Google Maps-এ ঠিকানা দেখতে পারে।
  pinLocation(){
    const statusEl = document.getElementById('ckLocationStatus');
    const btn = document.getElementById('ckPinBtn');
    if(!navigator.geolocation){
      statusEl.style.display='block';
      statusEl.style.color='#C0392B';
      statusEl.textContent = 'এই ব্রাউজারে লোকেশন সুবিধা সাপোর্ট করে না';
      return;
    }
    const originalText = btn.textContent;
    btn.textContent = '📍 লোকেশন খোঁজা হচ্ছে...'; btn.disabled = true;
    statusEl.style.display='block'; statusEl.style.color='var(--ink-soft)';
    statusEl.textContent = 'GPS লোকেশন অনুমতি দিন...';

    navigator.geolocation.getCurrentPosition(
      (position)=>{
        this.customerLat = position.coords.latitude;
        this.customerLng = position.coords.longitude;
        btn.textContent = originalText; btn.disabled = false;
        statusEl.style.color='var(--green)';
        statusEl.textContent = `✓ লোকেশন পিন করা হয়েছে (নির্ভুলতা: প্রায় ${Math.round(position.coords.accuracy)} মিটার)`;

        // ছোট embedded ম্যাপ দেখাই — Google Maps-এর সাধারণ embed URL ব্যবহার করে,
        // যেটার জন্য আলাদা API key লাগে না (শুধু একটা সিম্পল iframe)।
        const mapPreview = document.getElementById('ckMapPreview');
        mapPreview.style.display = 'block';
        mapPreview.innerHTML = `<iframe width="100%" height="180" frameborder="0" style="border:0;"
          src="https://maps.google.com/maps?q=${this.customerLat},${this.customerLng}&z=16&output=embed"
          allowfullscreen></iframe>`;
      },
      (error)=>{
        btn.textContent = originalText; btn.disabled = false;
        statusEl.style.color='#C0392B';
        if(error.code === error.PERMISSION_DENIED){
          statusEl.innerHTML = `⚠ লোকেশন অনুমতি দেওয়া হয়নি।<br>
            <span style="color:var(--ink-soft);font-size:12px;line-height:1.7;">
              iPhone হলে: ঠিকানা বারের <strong>aA</strong> বা 🔒 আইকন → Website Settings → Location → Allow<br>
              বা: Settings → Safari → Location → Allow
            </span>`;
        }else{
          statusEl.textContent = '⚠ লোকেশন পাওয়া যায়নি — আবার চেষ্টা করুন বা ঠিকানা ম্যানুয়ালি লিখুন';
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  },
  selectPayment(el, method){
    el.parentElement.querySelectorAll('.radio-card').forEach(c=>{c.classList.remove('selected'); c.querySelector('input').checked=false;});
    el.classList.add('selected'); el.querySelector('input').checked=true;
    this.paymentMethod = method;

    // কাস্টমার bKash/Nagad সিলেক্ট করলে সংশ্লিষ্ট জোনের পেমেন্ট নম্বর দেখাই
    const payInfoEl = document.getElementById('ckPaymentZoneInfo');
    if(!payInfoEl) return;
    const zone = document.getElementById('ckDistrict').value;
    const branch = BRANCH_INFO[zone];
    if((method==='bkash' || method==='nagad') && branch){
      const num = method==='bkash' ? branch.bkashNumber : branch.nagadNumber;
      const label = method==='bkash' ? 'bKash' : 'Nagad';
      payInfoEl.style.display='block';
      payInfoEl.innerHTML = `<div style="background:var(--blush);border:1.5px solid var(--pink);border-radius:10px;padding:14px;margin-top:12px;">
        <strong style="color:var(--rose);">📲 ${label} পেমেন্ট নম্বর (${branch.label}):</strong><br>
        <span style="font-size:20px;font-weight:700;letter-spacing:1px;">${num}</span><br>
        <span class="subtext">এই নম্বরে Send Money করে ট্রানজেকশন ID অর্ডারের সাথে দিন</span>
      </div>`;
    }else{
      payInfoEl.style.display='none';
      payInfoEl.innerHTML='';
    }
  },
  async applyCoupon(){
    const code = document.getElementById('ckCoupon').value.trim().toUpperCase();
    if(!code){ toast('কুপন কোড লিখুন'); return; }
    if(!FB){ toast('কুপন যাচাই করা যাচ্ছে না'); return; }

    const btn = document.getElementById('ckApplyCouponBtn');
    const originalText = btn.textContent;
    btn.textContent = '...'; btn.disabled = true;

    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'coupons',code));
      if(!snap.exists()){
        this.discount = 0;
        toast('❌ কুপন কোড সঠিক নয়');
        this.renderSummary();
        return;
      }
      const coupon = snap.data();
      const now = new Date();

      if(coupon.active===false){
        this.discount = 0;
        toast('❌ এই কুপন আর সক্রিয় নেই');
        this.renderSummary();
        return;
      }
      if(coupon.expiresAt && coupon.expiresAt.toDate && coupon.expiresAt.toDate() < now){
        this.discount = 0;
        toast('❌ কুপনের মেয়াদ শেষ হয়েছে');
        this.renderSummary();
        return;
      }
      if(coupon.minOrder && Cart.totalPrice() < coupon.minOrder){
        this.discount = 0;
        toast(`⚠ ন্যূনতম ৳${coupon.minOrder} অর্ডারে এই কুপন ব্যবহার করা যাবে`);
        this.renderSummary();
        return;
      }

      if(coupon.type === 'percent'){
        this.discount = Math.min(Cart.totalPrice() * (coupon.value/100), coupon.maxDiscount || Infinity);
      }else{
        this.discount = coupon.value;
      }

      toast(`✓ ${coupon.description || (coupon.value+'% ছাড়')} প্রয়োগ হয়েছে`);
      this.renderSummary();
    }catch(e){
      devWarn('Coupon check failed:', e.message);
      toast('কুপন যাচাই করতে সমস্যা হয়েছে');
    }finally{
      btn.textContent = originalText; btn.disabled = false;
    }
  },
  renderSummary(){
    const items = Object.entries(Cart.items);
    document.getElementById('checkoutSummaryItems').innerHTML = items.map(([id,qty])=>{
      const p = ALL_PRODUCTS.find(x=>x.id===id);
      if(!p) return '';
      return `<div class="row-between"><span>${p.name} × ${qty} (${p.unit})</span><span>${money(p.salePrice*qty)}</span></div>`;
    }).join('');
    const subtotal = Cart.totalPrice();
    let shipping = subtotal>1000?0:60;
    if(this.deliverySlot==='express') shipping += 20;
    const total = subtotal + shipping - this.discount;
    document.getElementById('ckSubtotal').textContent = money(subtotal);
    document.getElementById('ckShipping').textContent = shipping===0?'ফ্রি':money(shipping);
    document.getElementById('ckDiscount').textContent = '−'+money(this.discount);
    document.getElementById('ckTotal').textContent = money(total);
  },
  async placeOrder(){
    const name = document.getElementById('ckName').value.trim();
    const phone = document.getElementById('ckPhone').value.trim();
    const address = document.getElementById('ckAddress').value.trim();
    const upazila = document.getElementById('ckDistrict').value;
    const zone = document.getElementById('ckZone').value;

    if(!name || !phone || !address){ toast('⚠ সব প্রয়োজনীয় তথ্য পূরণ করুন'); this.goStep(1); return; }

    const phoneRegex = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRegex.test(phone.replace(/[\s-]/g,''))){
      toast('⚠ সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)');
      this.goStep(1);
      document.getElementById('ckPhone').focus();
      return;
    }
    if(address.length < 10){
      toast('⚠ সম্পূর্ণ ঠিকানা লিখুন');
      this.goStep(1);
      return;
    }
    if(!upazila || !zone){
      toast('⚠ উপজেলা ও এলাকা বেছে নিন');
      this.goStep(1);
      return;
    }
    if(!document.getElementById('ckTerms').checked){ toast('⚠ শর্তাবলীতে সম্মত হতে হবে'); return; }

    const btn = document.querySelector('#checkout-step-3 .btn-primary');
    const originalBtnText = btn ? btn.textContent : '';
    if(btn){ btn.textContent = 'অর্ডার প্রক্রিয়া হচ্ছে...'; btn.disabled = true; }

    const orderNo = 'GS-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*900000)+100000);
    const shippingCost = (Cart.totalPrice()>1000?0:60) + (this.deliverySlot==='express'?20:0);
    const branchZoneCode = document.getElementById('ckDistrict').value; // 'noakhali_sadar' or 'begumganj'

    if(!FB){
      toast('⚠ সংযোগ সমস্যা — অর্ডার সম্পন্ন হয়নি। আবার চেষ্টা করুন।');
      if(btn){ btn.textContent = originalBtnText; btn.disabled = false; }
      return;
    }

    try{
      const orderData = {
        orderNumber: orderNo,
        customerName: name,
        customerPhone: phone,
        address,
        // কাস্টমার GPS পিন করলে এখানে lat/lng সেভ থাকে — না করলে null (ম্যানুয়াল ঠিকানার
        // উপরই ভরসা করতে হবে, যা আগে থেকেই required)
        customerLat: this.customerLat,
        customerLng: this.customerLng,
        branchZone: branchZoneCode || null, // 'noakhali_sadar' or 'begumganj' — used by Zone Manager Portal to filter orders
        district: AREA_CITY_LABELS[branchZoneCode] || '', // human-readable upazila name shown to drivers
        zone: document.getElementById('ckZone').value, // human-readable union/area name shown to drivers
        instructions: document.getElementById('ckInstructions').value.trim(),
        paymentMethod: this.paymentMethod,
        deliverySlot: this.deliverySlot,
        items: Object.entries(Cart.items).map(([id,qty])=>({productId:id,qty})),
        subtotal: Cart.totalPrice() + shippingCost - this.discount,
        shippingCost, discount: this.discount,
        status:'pending',
        driverId:null, driverName:null,
        userId: Auth.currentUser?.uid || null,
        createdAt: FB.serverTimestamp()
      };
      await FB.addDoc(FB.collection(FB.db,'orders'), orderData);

      // অর্ডার সফলভাবে সেভ হওয়ার পর সংশ্লিষ্ট Zone Manager-কে push notification পাঠাই
      NotificationSystem.send(orderData);

      // শুধু এখানে এলেই (Firestore write সফল হলে) success page দেখানো হবে
      document.getElementById('successOrderNo').textContent = orderNo;
      localStorage.setItem('golapi_last_order_items', JSON.stringify(Object.keys(Cart.items)));
      Cart.items = {}; Cart.save();
      Router.go('order-success');
    }catch(e){
      devWarn('Order save failed:', e.message);
      toast('❌ অর্ডার সম্পন্ন হয়নি। ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।');
      if(btn){ btn.textContent = originalBtnText; btn.disabled = false; }
    }
  }
};

/* ---------- My Orders (Customer) ---------- */
/* ---------- কাস্টম বাজার অর্ডার ----------
   কাস্টমার নিজের বাজারের লিস্ট টেক্সটে লিখে সাবমিট করে, ড্রাইভার সেই তালিকা অনুযায়ী
   বাজার করে কাস্টমারের বাসায় পৌঁছে দেয়। অর্ডার কনফার্মের জন্য ১০০ টাকা বিকাশ পে
   বাধ্যতামূলক, বাকিটা COD। */
const CustomBazar = {
  init(){
    ['cbName','cbPhone','cbAddress','cbList','cbNotes','cbTrxId'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.value='';
    });
    document.getElementById('cbDistrict').value='';
    document.getElementById('cbZone').innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    document.getElementById('cbBkashNumber').textContent='উপজেলা বেছে নিলে দেখাবে';
    document.getElementById('cbMsg').className='form-msg';
  },
  onUpazilaChange(){
    const upazila = document.getElementById('cbDistrict').value;
    const zoneSelect = document.getElementById('cbZone');
    if(!upazila){ zoneSelect.innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>'; return; }
    zoneSelect.innerHTML = '<option value="">এলাকা বেছে নিন</option>' + AREA_ZONES[upazila].map(z=>`<option value="${z}">${z}</option>`).join('');
    // জোন-ভিত্তিক bKash নম্বর দেখাই
    const branch = BRANCH_INFO[upazila];
    if(branch){
      document.getElementById('cbBkashNumber').innerHTML = `<span style="font-size:17px;font-weight:700;">${branch.bkashNumber}</span>`;
    }
  },
  async submit(){
    const msgEl = document.getElementById('cbMsg');
    const name = document.getElementById('cbName').value.trim();
    const phone = document.getElementById('cbPhone').value.trim();
    const address = document.getElementById('cbAddress').value.trim();
    const district = document.getElementById('cbDistrict').value;
    const zone = document.getElementById('cbZone').value;
    const type = document.getElementById('cbType').value;
    const list = document.getElementById('cbList').value.trim();
    const notes = document.getElementById('cbNotes').value.trim();
    const trxId = document.getElementById('cbTrxId').value.trim();

    if(!name||!phone||!address||!district||!zone||!list||!trxId){
      msgEl.textContent='সব প্রয়োজনীয় তথ্য পূরণ করুন'; msgEl.className='form-msg err'; return;
    }
    const phoneRegex = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRegex.test(phone.replace(/[\s-]/g,''))){
      msgEl.textContent='সঠিক মোবাইল নম্বর দিন'; msgEl.className='form-msg err'; return;
    }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }

    const btn = document.getElementById('cbSubmitBtn');
    btn.textContent='জমা হচ্ছে...'; btn.disabled=true;

    const typeLabels = {weekly:'সাপ্তাহিক',monthly:'মাসিক',wedding:'বিয়ের',ramadan:'রমজানের',qurbani:'কুরবানির',other:'অন্যান্য'};
    const orderNo = 'CB-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*900000)+100000);

    try{
      await FB.addDoc(FB.collection(FB.db,'orders'), {
        orderNumber: orderNo,
        orderType: 'custom-bazar',
        bazarType: type,
        bazarTypeLabel: typeLabels[type]||type,
        customerName: name,
        customerPhone: phone,
        address,
        branchZone: district,
        district: AREA_CITY_LABELS[district]||'',
        zone,
        bazarList: list,
        notes,
        bkashTrxId: trxId,
        advanceAmount: 100,
        paymentMethod: 'bkash+cod',
        status: 'pending',
        userId: Auth.currentUser?.uid || null,
        createdAt: FB.serverTimestamp()
      });

      msgEl.innerHTML = `✅ আপনার বাজার অর্ডার (${orderNo}) সফলভাবে জমা হয়েছে!<br><span class="subtext">আমাদের টিম শীঘ্রই যোগাযোগ করবে।</span>`;
      msgEl.className='form-msg ok';
      btn.textContent='📝 বাজার অর্ডার জমা দিন'; btn.disabled=false;
    }catch(e){
      msgEl.textContent='সমস্যা হয়েছে: '+e.message; msgEl.className='form-msg err';
      btn.textContent='📝 বাজার অর্ডার জমা দিন'; btn.disabled=false;
    }
  }
};


const MyOrders = {
  async render(){
    const list = document.getElementById('myOrdersList');
    list.innerHTML = `<p style="color:var(--ink-soft);padding:20px;">লোড হচ্ছে...</p>`;

    // firebase-ready এখনো না এসে থাকলে বা onAuthStateChanged এখনো রেজাল্ট না দিলে
    // একটু অপেক্ষা করি — নইলে আসলে লগইন থাকা সত্ত্বেও ভুলভাবে "লগইন করুন" দেখাবে।
    const waitForAuth = () => new Promise(resolve => {
      if(!FB){ resolve(null); return; }
      FB.onAuthStateChanged(FB.auth, user => resolve(user), { once: true });
    });

    const user = Auth.currentUser || await waitForAuth();

    if(!user){
      list.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><h3>লগইন করুন</h3><p>আপনার অর্ডার দেখতে লগইন করুন</p><button class="btn btn-primary" onclick="AuthUI.open()">লগইন করুন</button></div>`;
      return;
    }

    const allOrders = await OrdersService.loadAll();
    const myOrders = allOrders.filter(o=>o.userId===user.uid);
    if(!myOrders.length){
      list.innerHTML = `<div class="empty-state"><div class="icon">📦</div><h3>এখনো কোনো অর্ডার নেই</h3><p>আপনার প্রথম অর্ডার করুন এবং এখানে ট্র্যাক করুন</p><button class="btn btn-primary" onclick="Router.go('listing',{cat:'all'})">শপিং শুরু করুন</button></div>`;
      return;
    }
    list.innerHTML = myOrders.map(o=>{
      const s = ORDER_STATUS_LABELS[o.status]||ORDER_STATUS_LABELS.pending;
      const itemsText = (o.items||[]).map(it=>{
        const p = ALL_PRODUCTS.find(x=>x.id===it.productId);
        return p ? `${p.name} × ${it.qty}` : `প্রোডাক্ট × ${it.qty}`;
      }).join(', ');
      const mapLink = (o.customerLat && o.customerLng)
        ? `<a href="https://www.google.com/maps?q=${o.customerLat},${o.customerLng}" target="_blank" rel="noopener" style="font-size:12.5px;color:var(--rose);">📍 আমার পিন করা লোকেশন দেখুন</a>`
        : '';
      return `
      <div class="card-box" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <strong>${o.orderNumber||o.id}</strong>
          <span class="status-pill ${s.cls}">${s.label}</span>
        </div>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:6px;">📦 ${itemsText}</div>
        <div style="font-size:13.5px;font-weight:600;">মোট: ${money(o.subtotal||0)}</div>
        ${o.driverName?`<div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">🚴 ড্রাইভার: ${o.driverName}</div>`:''}
        ${mapLink?`<div style="margin-top:6px;">${mapLink}</div>`:''}
      </div>`;
    }).join('');
  }
};

/* =========================================================================
   ORDER STATUS PIPELINE & DRIVER SYSTEM
   Status flow: pending -> confirmed -> assigned -> picked_up -> in_transit -> delivered
   Drivers are stored in Firestore 'drivers' collection: {name, phone, pin, active}
   Orders get a driverId + driverName + status field, updated by driver portal.
   ========================================================================= */
