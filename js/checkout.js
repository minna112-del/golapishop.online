/* checkout.js — Checkout page logic (lazy-loaded, শুধু checkout পেজে গেলে লোড হয়) */
const Checkout = {
  pay:'cod', currentStep:1, walletAvailable:0, couponCode:null, couponData:null, isPlacingOrder:false,
  locationData:null, // LocationPicker থেকে আসা {lat,lng,address,branchZone,distanceKm,etaMin,deliveryFee}
  async init(){
    const d=document.getElementById('ckDistrict'); if(d) d.value='';
    const z=document.getElementById('ckZone'); if(z) z.innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    const v=document.getElementById('ckVillage'); if(v) v.value='';
    this.locationData = null;
    const ls=document.getElementById('ckLocationSummary'); if(ls){ ls.hidden=true; ls.innerHTML=''; }
    this.walletAvailable = 0;
    this.pay = 'cod'; this.isPlacingOrder = false;
    document.querySelectorAll('#ckStep2 .radio-card').forEach((el,i)=>{ el.classList.toggle('selected',i===0); el.setAttribute('aria-checked',i===0?'true':'false'); const radio=el.querySelector('input'); if(radio) radio.checked=i===0; });
    const payInfo=document.getElementById('ckPayInfo'); if(payInfo){ payInfo.hidden=true; payInfo.innerHTML=''; delete payInfo.dataset.method; }
    this.setPlaceOrderLoading(false);
    this.couponCode = null; this.couponData = null;
    const cc=document.getElementById('ckCouponCode'); if(cc) cc.value='';
    const cm=document.getElementById('ckCouponMsg'); if(cm) cm.textContent='';
    const useWalletEl=document.getElementById('ckUseWallet'); if(useWalletEl) useWalletEl.checked=false;
    // কার্টে ঔষধ ক্যাটাগরির প্রোডাক্ট থাকলে প্রেসক্রিপশন-আপলোড বক্স দেখানো হয়
    const hasMedicine = Object.keys(Cart.items).some(id=>ALL_PRODUCTS.find(p=>p.id===id)?.category==='medicine');
    const presBox = document.getElementById('ckPrescriptionBox');
    if(presBox) presBox.hidden = !hasMedicine;
    const presFile = document.getElementById('ckPrescriptionFile'); if(presFile) presFile.value='';
    if(Auth.currentUser && FB){
      try{
        const snap = await FB.getDoc(FB.doc(FB.db,'users',Auth.currentUser.uid));
        if(snap.exists()) this.walletAvailable = Number(snap.data().walletBalance||0);
      }catch(e){ devWarn('wallet fetch failed', e.message); }
    }
    this.goStep(1);
  },
  openLocationPicker(){
    LocationPicker.open((data)=>{
      this.locationData = data;
      // ম্যাপ থেকে পাওয়া নিকটতম শাখা অনুযায়ী উপজেলা ড্রপডাউন auto-select করে দেয়
      const d = document.getElementById('ckDistrict');
      if(d && data.branchZone){ d.value = data.branchZone; onUpazilaChange('ck'); }
      const summary = document.getElementById('ckLocationSummary');
      if(summary){
        summary.hidden=false;
        summary.innerHTML = `<strong style="color:var(--ink)">📍 ${esc(data.address)}</strong><br>
          ${data.zone?data.zone.label+' · ':''}দূরত্ব: ${data.distanceKm.toFixed(1)} কিমি · ETA: ~${data.etaMin} মিনিট · ডেলিভারি চার্জ: ${data.deliveryFee===0?'ফ্রি':'৳'+data.deliveryFee}`;
      }
      this.renderSummary();
      toast('✓ লোকেশন সেভ হয়েছে','success');
    });
  },
  selectPay(el,method){
    el.parentElement.querySelectorAll('.radio-card').forEach(c=>{c.classList.remove('selected');c.querySelector('input').checked=false;});
    el.classList.add('selected'); el.querySelector('input').checked=true; el.parentElement.querySelectorAll('.radio-card').forEach(c=>c.setAttribute('aria-checked', c===el?'true':'false')); this.pay=method;
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
      box.hidden=false;
      box.innerHTML = `<div><strong>${method==='bkash'?'bKash':'Nagad'} পেমেন্ট নম্বর — ${info.label}</strong><br><b>${num}</b><br>অর্ডার কনফার্ম করার পর Send Money নির্দেশনা ও ট্রানজেকশন ID জমা দেওয়ার অপশন দেখানো হবে।</div>`;
    } else { box.hidden=true; box.innerHTML=''; }
  },
  goStep(n){
    if(n>1 && this.currentStep===1 && !this.isStep1Valid()){ toast('⚠ ঠিকানা ও ডেলিভারি ইনস্ট্রাকশন সঠিকভাবে পূরণ করুন','error'); return; }
    if(n===2 && typeof dataLayer!=='undefined'){
      dataLayer.push({event:'begin_checkout', currency:'BDT', value: Cart.totalPrice()});
    }
    this.currentStep = n;
    [1,2,3].forEach(i=>{
      const step=document.getElementById('ckStep'+i);
      if(step) step.hidden = i!==n;
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
    const nidOk = nid.length===0 || nidRe.test(nid);
    if(!this.locationData){ toast('⚠ প্রথমে "ম্যাপে সঠিক লোকেশন পিন করুন" বাটনে ট্যাপ করে আপনার লোকেশন নির্বাচন করুন — এটা ছাড়া অর্ডার করা যাবে না','error'); return false; }
    if(!this.locationData.zone){
      toast('⚠ দুঃখিত, আপনার লোকেশন আমাদের ডেলিভারি জোনের বাইরে — এই মুহূর্তে সেখানে ডেলিভারি করা হয় না', 'error');
      return false;
    }
    return name.length>0 && phoneRe.test(phone) && nidOk && addr.length>=5 && upazila && zone && village.length>0 && instructions.length>0;
  },
  getWalletUsed(sub, ship){
    const useWallet = document.getElementById('ckUseWallet')?.checked;
    if(!useWallet || this.walletAvailable<=0) return 0;
    // ⚠️ আগে এখানে কুপন ছাড় বাদ দেওয়ার আগেই (sub+ship) থেকে wallet কেটে নেওয়া
    // হিসাব হতো — ফলে coupon+wallet একসাথে ব্যবহার করলে wallet থেকে কুপনের
    // ছাড়ের সমান অতিরিক্ত টাকা কেটে যেতো (customer-এর real financial loss)।
    // এখন আগে কুপন ছাড় বাদ দিয়ে, তারপর যেটুকু আসলে payable সেটুকুর জন্যই
    // wallet ব্যবহার হয়।
    const couponDiscount = this.getCouponDiscount(sub);
    const payable = Math.max(0, sub + ship - couponDiscount);
    return Math.min(this.walletAvailable, payable);
  },
  async applyCoupon(){
    const codeEl = document.getElementById('ckCouponCode');
    const msgEl = document.getElementById('ckCouponMsg');
    const code = (codeEl?.value||'').trim().toUpperCase();
    if(!code){ msgEl.textContent=''; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.style.color='#f87171'; return; }
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'coupons'), FB.where('code','==',code)));
      if(snap.empty){ msgEl.textContent='❌ এই কুপন কোডটি সঠিক নয়'; msgEl.style.color='#f87171'; this.couponCode=null; this.couponData=null; this.renderSummary(); return; }
      const c = { id:snap.docs[0].id, ...snap.docs[0].data() };
      const today = new Date();
      if(c.active===false){ msgEl.textContent='❌ এই কুপনটি বন্ধ আছে'; msgEl.style.color='#f87171'; return; }
      if(c.expiresAt && new Date(c.expiresAt) < today){ msgEl.textContent='❌ কুপনের মেয়াদ শেষ হয়ে গেছে'; msgEl.style.color='#f87171'; return; }
      if(c.usageLimit && (c.usedCount||0) >= c.usageLimit){ msgEl.textContent='❌ কুপনের ব্যবহারসীমা শেষ'; msgEl.style.color='#f87171'; return; }
      const sub = Cart.totalPrice();
      if(c.minOrder && sub < c.minOrder){ msgEl.textContent=`❌ ন্যূনতম ${money(c.minOrder)} অর্ডারে এই কুপন প্রযোজ্য`; msgEl.style.color='#f87171'; return; }
      this.couponCode = code; this.couponData = c;
      msgEl.textContent = `✓ কুপন প্রয়োগ হয়েছে!`; msgEl.style.color='#22c55e';
      this.renderSummary();
    }catch(e){ msgEl.textContent='সমস্যা হয়েছে'; msgEl.style.color='#f87171'; }
  },
  getCouponDiscount(sub){
    if(!this.couponData) return 0;
    const c = this.couponData;
    let disc = c.type==='percent' ? Math.round(sub * c.value/100) : c.value;
    if(c.maxDiscount) disc = Math.min(disc, c.maxDiscount);
    return Math.min(disc, sub);
  },
  renderSummary(){
    const entries = Object.entries(Cart.items);
    let itemCount = 0;
    const sumEl=document.getElementById('ckSummary');
    if(sumEl) sumEl.innerHTML = entries.map(([id,q])=>{
      const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p) return '';
      itemCount += q;
      return `<div class="row-between"><span>${esc(p.name)} × ${bn(q)}</span><span>${money(p.salePrice*q)}</span></div>`;
    }).join('');
    const sub = Cart.totalPrice();
    const ship = (this.locationData?.deliveryFee != null) ? this.locationData.deliveryFee : calcDeliveryCharge(itemCount, sub, this.locationData?.distanceKm ?? null);
    const couponDiscount = this.getCouponDiscount(sub);
    const couponRow=document.getElementById('ckCouponRow');
    if(couponRow) couponRow.hidden = couponDiscount<=0;
    const couponLabelEl=document.getElementById('ckCouponLabel'); if(couponLabelEl) couponLabelEl.textContent = `কুপন (${this.couponCode||''}) ছাড়`;
    const couponDiscEl=document.getElementById('ckCouponDiscount'); if(couponDiscEl) couponDiscEl.textContent = '−'+money(couponDiscount);
    const walletBox=document.getElementById('ckWalletBox');
    if(walletBox) walletBox.hidden = this.walletAvailable<=0;
    const availEl=document.getElementById('ckWalletAvail'); if(availEl) availEl.textContent = money(this.walletAvailable);
    const walletUsed = this.getWalletUsed(sub, ship);
    const walletRow=document.getElementById('ckWalletRow');
    if(walletRow) walletRow.hidden = walletUsed<=0;
    const walletDiscEl=document.getElementById('ckWalletDiscount'); if(walletDiscEl) walletDiscEl.textContent = '−'+money(walletUsed);
    const subEl=document.getElementById('ckSub'); if(subEl) subEl.textContent = money(sub);
    const shipEl=document.getElementById('ckShip'); if(shipEl) shipEl.textContent = ship===0?'ফ্রি':money(ship);
    const totEl=document.getElementById('ckTotal'); if(totEl) totEl.textContent = money(Math.max(0, sub+ship-walletUsed-couponDiscount));
  },
  setPlaceOrderLoading(loading){
    this.isPlacingOrder = loading;
    const btn=document.getElementById('ckPlaceOrderBtn');
    if(!btn) return;
    btn.disabled=loading;
    btn.setAttribute('aria-busy', loading?'true':'false');
    const label=btn.querySelector('.ck-btn-label'); if(label) label.hidden=loading;
    const loader=btn.querySelector('.ck-btn-loader'); if(loader) loader.hidden=!loading;
  },
  validateCartForOrder(){
    const entries=Object.entries(Cart.items);
    if(!entries.length){ toast('কার্টে কোনো পণ্য নেই','error'); Router.go('home'); return false; }
    for(const [id,qty] of entries){
      const p=ALL_PRODUCTS.find(x=>x.id===id);
      if(!p){ toast('কার্টের একটি পণ্য আর উপলভ্য নেই। কার্ট আপডেট করুন।','error'); return false; }
      const stock=Number(p.stock||0);
      if(stock<=0 || Number(qty)>stock){ toast(`${p.name} পণ্যের পর্যাপ্ত স্টক নেই। কার্ট আপডেট করুন।`,'error'); return false; }
    }
    return true;
  },
  async placeOrder(){
    if(this.isPlacingOrder) return;
    if(!this.validateCartForOrder()) return;
    if(!this.locationData){ toast('⚠ লোকেশন নির্বাচন করা হয়নি — "ম্যাপে সঠিক লোকেশন পিন করুন" বাটনে ট্যাপ করুন','error'); this.goStep(1); return; }
    if(!this.locationData.zone){ toast('⚠ এই লোকেশন ডেলিভারি জোনের বাইরে','error'); this.goStep(1); return; }
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
    const nidOk = nid.length===0 || nidRe.test(nid);
    if(!name||!phoneRe.test(phone.replace(/[\s-]/g,''))||!nidOk||addr.length<5||!upazila||!zone||!village||!instructions){ toast('⚠ সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন','error'); this.goStep(1); return; }
    if(!document.getElementById('ckTerms').checked){ toast('⚠ শর্তাবলীতে সম্মত হতে হবে','error'); return; }
    if(!FB){ toast('⚠ সংযোগ সমস্যা — আবার চেষ্টা করুন','error'); return; }
    this.setPlaceOrderLoading(true);
    const orderNo = 'GS-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900000)+100000);
    const sub = Cart.totalPrice();
    const itemCount = Object.values(Cart.items).reduce((a,b)=>a+b,0);
    const ship = (this.locationData?.deliveryFee != null) ? this.locationData.deliveryFee : calcDeliveryCharge(itemCount, sub, this.locationData?.distanceKm ?? null);
    const walletUsed = this.getWalletUsed(sub, ship);
    const couponDiscount = this.getCouponDiscount(sub);
    // প্রেসক্রিপশন ছবি (থাকলে) আগে আপলোড করে নেওয়া হয়, যাতে অর্ডার ডকুমেন্টে সাথে সাথে URL যুক্ত করা যায়
    let prescriptionUrl = null;
    const presFile = document.getElementById('ckPrescriptionFile')?.files[0];
    if(presFile){
      try{
        const fileRef = FB.storageRef(FB.storage, `prescriptions/${Date.now()}_${presFile.name}`);
        await FB.uploadBytes(fileRef, presFile);
        prescriptionUrl = await FB.getDownloadURL(fileRef);
      }catch(e){ devWarn('prescription upload failed', e.message); }
    }
    const cartEntries = Object.entries(Cart.items);
    let orderId;
    try{
      // ⚠️ আগে এখানে সরাসরি FB.addDoc() দিয়ে order তৈরি হতো, স্টক শুধু ব্রাউজারে
      // cache করা (সম্ভবত পুরনো) ডেটা দেখে চেক হতো — কখনো Firestore-এর latest
      // stock আবার read করে দেখা হতো না, আর order তৈরির সাথে stock কমানোও হতো
      // না। ফলে শেষ ১টা পণ্য থাকা অবস্থায় দুইজন কাস্টমার প্রায় একসাথে অর্ডার
      // করলে দুজনেরই order সফল হয়ে যেতো, যদিও বাস্তবে পণ্য ছিল ১টা।
      // এখন পুরো (stock verify + stock decrement + order তৈরি) একটা Firestore
      // transaction-এর ভেতরে atomic ভাবে হচ্ছে — transaction নিজেই latest
      // stock আবার পড়ে, তাই দুইজন একসাথে চেষ্টা করলে Firestore নিজে থেকেই
      // একজনকে retry/fail করাবে, দুজনকেই সফল হতে দেবে না।
      orderId = await FB.runTransaction(FB.db, async (transaction) => {
        const productRefs = cartEntries.map(([id]) => FB.doc(FB.db,'products',id));
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        const itemsForOrder = [];
        for(let i=0; i<cartEntries.length; i++){
          const [id, qty] = cartEntries[i];
          const snap = productSnaps[i];
          if(!snap.exists()) throw new Error('একটি পণ্য আর পাওয়া যাচ্ছে না, কার্ট আপডেট করুন।');
          const data = snap.data();
          const latestStock = Number(data.stock||0);
          if(latestStock < Number(qty)){
            throw new Error(`${data.name||'পণ্য'}-এর পর্যাপ্ত স্টক নেই (এই মুহূর্তে মাত্র ${latestStock}টি আছে)। কার্ট আপডেট করুন।`);
          }
          itemsForOrder.push({productId:id, name:data.name||'', qty:Number(qty), unitPrice:Number(data.salePrice||0)});
        }

        productRefs.forEach((ref, i) => {
          transaction.update(ref, { stock: FB.increment(-Number(cartEntries[i][1])), sold: FB.increment(Number(cartEntries[i][1])) });
        });

        const newOrderRef = FB.doc(FB.collection(FB.db,'orders'));
        transaction.set(newOrderRef, {
          orderNumber:orderNo, customerName:name, customerPhone:phone, customerNid:nid, address:addr, village,
          branchZone:upazila, district:AREA_LABELS[upazila]||'', zone,
          customerLat: this.locationData?.lat ?? null, customerLng: this.locationData?.lng ?? null,
          deliveryZoneId: this.locationData?.zone?.id ?? null, deliveryZoneLabel: this.locationData?.zone?.label ?? null,
          distanceKm: this.locationData?.distanceKm ?? null, etaMinutes: this.locationData?.etaMin ?? null,
          prescriptionUrl,
          instructions, paymentMethod:this.pay, paymentStatus:this.pay==='cod'?'cod':'pending_submission', deliverySlot:'express',
          items: itemsForOrder,
          subtotal:sub, shippingCost:ship, walletUsed, couponCode:this.couponCode||null, couponDiscount, total:Math.max(0, sub+ship-walletUsed-couponDiscount),
          status:'pending', driverId:null, driverName:null,
          userId:Auth.currentUser?.uid||null, createdAt:FB.serverTimestamp()
        });
        return newOrderRef.id;
      });
    }catch(e){
      devWarn('order transaction failed', e.message);
      this.setPlaceOrderLoading(false);
      toast('❌ ' + (e.message || 'অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন'), 'error');
      return;
    }
    try{
      if(walletUsed>0 && Auth.currentUser){
        await FB.updateDoc(FB.doc(FB.db,'users',Auth.currentUser.uid), { walletBalance: FB.increment(-walletUsed) }).catch(e=>devWarn('wallet deduct failed', e.message));
      }
      const appliedCouponCode = this.couponCode;
      if(this.couponData){
        await FB.updateDoc(FB.doc(FB.db,'coupons',this.couponData.id), { usedCount: FB.increment(1) }).catch(()=>{});
        this.couponCode=null; this.couponData=null;
      }
      if(typeof dataLayer!=='undefined'){
        dataLayer.push({event:'purchase',
          transaction_id: orderNo, currency:'BDT',
          value: Math.max(0, sub+ship-walletUsed-couponDiscount), shipping: ship,
          coupon: appliedCouponCode||undefined,
          items: Object.entries(Cart.items).map(([id,qty])=>{ const p=ALL_PRODUCTS.find(x=>x.id===id); return {item_id:id, item_name:p?.name||'', quantity:qty, price:p?.salePrice||0}; })
        });
      }
      OrderSuccess.save({
        orderNumber:orderNo,
        total:Math.max(0, sub+ship-walletUsed-couponDiscount),
        itemCount,
        paymentMethod:this.pay,
        deliveryArea:this.locationData?.zone?.label || AREA_LABELS[upazila] || upazila
      });
      Cart.items={}; Cart.save();
      if(this.pay==='bkash' || this.pay==='nagad'){
        // ⚠️ bug #1 fix: online payment modal-এর ঠিক আগে order-টা localStorage-এ
        // "pending payment" হিসেবে রেকর্ড করা হচ্ছে। কাস্টমার মাঝপথে ব্রাউজার
        // বন্ধ করে দিলে বা modal বাতিল করে অন্য পেজে চলে গেলেও, পরের বার সাইটে
        // ফিরলে PaymentGateway.checkPendingPayment() এই তথ্য দেখে recovery
        // banner দেখাবে — order হারিয়ে গেছে ভাবার সুযোগ থাকবে না।
        try{
          localStorage.setItem('golapi_pending_payment', JSON.stringify({
            orderId, method:this.pay, amount: sub+ship-walletUsed-couponDiscount, zone, orderNo, at: Date.now()
          }));
        }catch(e){}
        PaymentGateway.showPaymentModal(this.pay, sub+ship-walletUsed-couponDiscount, orderId, upazila);
      } else {
        Router.go('order-success');
      }
    }catch(e){ devWarn('order failed', e.message); this.setPlaceOrderLoading(false); toast('❌ অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন','error'); }
  }
};