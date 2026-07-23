/* driver.js — DriverPortal (Firebase Auth secured), BazarShop
   আপডেট: অনলাইন/অফলাইন টগল, রিয়েল-টাইম অর্ডার সিঙ্ক + নতুন অর্ডারে ভাইব্রেশন, নেভিগেশন বাটন, হিস্ট্রি ট্যাব */
const driverEscape = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
const driverSafePhone = value => String(value || '').replace(/[^+0-9]/g,'');

const DriverPortal = {
  currentDriver:null, currentUid:null, tab:'active', unsub:null, knownOrderIds:new Set(),

  async login(){
    const email=document.getElementById('driverEmail').value.trim();
    const pass=document.getElementById('driverPassword').value;
    const msgEl=document.getElementById('driverLoginMsg');
    if(!email||!pass){ msgEl.textContent='ইমেইল ও পাসওয়ার্ড দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    const loginBtn=document.getElementById('driverLoginBtn');
    if(loginBtn){ loginBtn.disabled=true; loginBtn.textContent='লগইন হচ্ছে…'; }
    try{
      const cred = await FB.signInWithEmailAndPassword(FB.auth, email, pass);
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',cred.user.uid));
      if(!staffSnap.exists() || staffSnap.data().role!=='driver'){
        await FB.signOut(FB.auth).catch(()=>{});
        msgEl.textContent='এই অ্যাকাউন্ট ড্রাইভার হিসেবে অনুমোদিত নয়'; msgEl.className='form-msg err'; return;
      }
      const data = staffSnap.data();
      this.currentUid = cred.user.uid;
      this.currentDriver = { id: data.driverId || cred.user.uid, name: data.name, branchZone: data.branchZone, phone: data.phone };
      document.getElementById('driverLoginBox').style.display='none';
      document.getElementById('driverDashBox').style.display='block';
      document.getElementById('driverNameLabel').textContent=data.name;
      await this.loadOnlineStatus();
      await this.render();
      this.startRealtimeSync();
    }catch(e){ msgEl.textContent='লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়'; msgEl.className='form-msg err'; }
    finally{ if(loginBtn){ loginBtn.disabled=false; loginBtn.textContent='লগইন করুন'; } }
  },

  async logout(){
    if(this.unsub){ this.unsub(); this.unsub=null; }
    if(FB) await FB.signOut(FB.auth).catch(()=>{});
    this.currentDriver=null; this.currentUid=null;
    document.getElementById('driverLoginBox').style.display='block';
    document.getElementById('driverDashBox').style.display='none';
  },

  async _restoreSession(){
    if(this.currentDriver || !FB || !FB.auth.currentUser) return;
    try{
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',FB.auth.currentUser.uid));
      if(staffSnap.exists() && staffSnap.data().role==='driver'){
        const data = staffSnap.data();
        this.currentUid = FB.auth.currentUser.uid;
        this.currentDriver = { id: data.driverId || FB.auth.currentUser.uid, name: data.name, branchZone: data.branchZone, phone: data.phone };
      }
    }catch(e){ devWarn('driver session restore failed', e.message); }
  },

  /* ---------- Online/Offline toggle ---------- */
  async loadOnlineStatus(){
    if(!FB || !this.currentDriver) return;
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'drivers',this.currentDriver.id));
      const isOnline = snap.exists() ? (snap.data().online !== false) : true;
      const toggle = document.getElementById('driverOnlineToggle');
      if(toggle) toggle.checked = isOnline;
      this.renderOnlineUI(isOnline);
    }catch(e){ devWarn('online status load failed', e.message); }
  },
  renderOnlineUI(isOnline){
    const label = document.getElementById('driverOnlineLabel');
    const slider = document.getElementById('driverToggleSlider');
    if(label) label.textContent = isOnline ? '🟢 অনলাইন — অর্ডার নেওয়ার জন্য প্রস্তুত' : '🔴 অফলাইন — নতুন অর্ডার আসবে না';
    if(slider) slider.style.background = isOnline ? '#22c55e' : '#64748b';
  },
  async toggleOnline(isOnline){
    this.renderOnlineUI(isOnline);
    if(!FB || !this.currentDriver) return;
    try{ await FB.updateDoc(FB.doc(FB.db,'drivers',this.currentDriver.id), {online:isOnline}); toast(isOnline?'✓ অনলাইন হয়েছেন':'অফলাইন করা হয়েছে', isOnline?'success':'info'); }
    catch(e){ devWarn('toggle online failed', e.message); }
  },

  /* ---------- Tabs ---------- */
  switchTab(t){
    this.tab = t;
    const a=document.getElementById('driverTabActive'), h=document.getElementById('driverTabHistory');
    if(a){ a.classList.toggle('is-active',t==='active'); a.setAttribute('aria-selected',String(t==='active')); }
    if(h){ h.classList.toggle('is-active',t==='history'); h.setAttribute('aria-selected',String(t==='history')); }
    this.render();
  },

  /* ---------- Realtime sync + vibration on new order ---------- */
  startRealtimeSync(){
    if(!FB || !this.currentDriver || this.unsub) return;
    this.unsub = FB.onSnapshot(FB.query(FB.collection(FB.db,'orders'), FB.where('driverId','==',this.currentDriver.id)), snap=>{
      let hasNew = false;
      snap.docChanges().forEach(ch=>{
        if(ch.type==='added' && !this.knownOrderIds.has(ch.doc.id) && ['assigned','packed','picked_up','in_transit'].includes(ch.doc.data().status)){
          hasNew = true;
        }
        this.knownOrderIds.add(ch.doc.id);
      });
      if(hasNew && navigator.vibrate) navigator.vibrate([200,100,200]);
      if(hasNew) toast('🔔 নতুন অর্ডার অ্যাসাইন হয়েছে!','success');
      this.render();
    });
  },

  async render(){
    await this._restoreSession();
    if(!this.currentDriver){ document.getElementById('driverLoginBox').style.display='block'; document.getElementById('driverDashBox').style.display='none'; return; }
    document.getElementById('driverLoginBox').style.display='none';
    document.getElementById('driverDashBox').style.display='block';
    document.getElementById('driverNameLabel').textContent=this.currentDriver.name || 'ড্রাইভার';
    const zoneLabel=document.getElementById('driverZoneLabel');
    if(zoneLabel) zoneLabel.textContent=this.currentDriver.branchZone ? `কর্মরত এলাকা: ${this.currentDriver.branchZone}` : 'অ্যাসাইন করা ডেলিভারি পরিচালনা করুন';
    const all = await OrdersService.loadAll();
    all.forEach(o=>this.knownOrderIds.add(o.id));
    const mineAll = all.filter(o=>o.driverId===this.currentDriver.id);
    const mine = mineAll.filter(o=>o.status!=='delivered' && o.status!=='cancelled');
    const history = mineAll.filter(o=>o.status==='delivered' || o.status==='cancelled')
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,30);
    const transit = mine.filter(o=>o.status==='in_transit'||o.status==='picked_up').length;
    const done = mineAll.filter(o=>o.status==='delivered' && new Date(o.createdAt?.seconds*1000||0).toDateString()===new Date().toDateString()).length;
    document.getElementById('dStatAssigned').textContent=bn(mine.length);
    document.getElementById('dStatTransit').textContent=bn(transit);
    document.getElementById('dStatDone').textContent=bn(done);

    const listEl=document.getElementById('driverOrdersList');
    const list = this.tab==='active' ? mine : history;

    if(!list.length){
      listEl.innerHTML = this.tab==='active'
        ? `<div class="empty-state"><div class="em">📦</div><h3>কোনো অর্ডার অ্যাসাইন করা নেই</h3></div>`
        : `<div class="empty-state"><div class="em">🗂️</div><h3>এখনো কোনো অর্ডার সম্পন্ন হয়নি</h3></div>`;
      return;
    }

    listEl.innerHTML = list.map(o=>{
      const s = ORDER_STATUS[o.status]||ORDER_STATUS.assigned;
      const isCustomBazar = o.orderType==='custom-bazar';
      const fullAddress = `${o.village?o.village+', ':''}${o.zone||''}${o.district?', '+o.district:''}${o.address?' — '+o.address:''}`;
      const safeId=driverEscape(o.id);
      const safeName=driverEscape(o.customerName||'কাস্টমার');
      const safePhone=driverSafePhone(o.customerPhone);
      const safeAddress=driverEscape(fullAddress||'ঠিকানা দেওয়া হয়নি');
      const safeOrder=driverEscape(o.orderNumber||o.id);
      const lat=Number(o.customerLat), lng=Number(o.customerLng);
      const navBtn = this.tab==='active'
        ? (Number.isFinite(lat) && Number.isFinite(lng)
            ? `<button class="btn btn-outline btn-block" onclick="openDriverNavigation(${lat},${lng},'${safeName}')">🧭 সঠিক পিনে নেভিগেট করুন</button>`
            : `<a class="btn btn-outline btn-block" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}">🧭 ঠিকানায় নেভিগেট করুন</a>`)
        : '';
      let nextBtn='';
      let bazarBox='';
      if(this.tab==='active'){
        if(o.status==='assigned' && !o.driverAccepted){
          nextBtn=`<button class="btn btn-gold" onclick="DriverPortal.acceptOrder('${safeId}')">অর্ডার গ্রহণ</button><button class="btn btn-outline" onclick="DriverPortal.rejectOrder('${safeId}')">অর্ডার ফিরিয়ে দিন</button>`;
        } else if(isCustomBazar && o.status==='assigned') bazarBox = bazarShopHTML(o);
        else if(o.status==='assigned') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.advance('${safeId}','packed')">প্যাকিং সম্পন্ন</button>`;
        else if(o.status==='packed') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.advance('${safeId}','picked_up')">পিকআপ সম্পন্ন</button>`;
        else if(o.status==='picked_up') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.startTransit('${safeId}')">রওনা দিন ও লাইভ লোকেশন চালু করুন</button>`;
        else if(o.status==='in_transit') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.advance('${safeId}','delivered')">ডেলিভারি সম্পন্ন</button>`;
      }
      const contactBtns = this.tab==='active' && safePhone ? `<a class="btn btn-outline" href="tel:${safePhone}">কল করুন</a><a class="btn btn-outline" href="sms:${safePhone}">SMS</a>` : '';
      const chatBtn = this.tab==='active' ? `<button class="btn btn-outline btn-block" onclick="OrderChat.open('${safeId}','driver')">কাস্টমারের সাথে চ্যাট</button>` : '';
      const gpsPanel = (this.tab==='active' && o.status==='in_transit') ? `<div id="driverGpsPanel" class="driver-gps-panel"></div>` : '';
      return `<article class="driver-order-card">
        <div class="driver-order-head"><strong class="driver-order-number">${safeOrder}</strong><span class="status-pill ${driverEscape(s.cls)}">${driverEscape(s.label)}</span></div>
        <div class="driver-order-meta">
          <div class="driver-meta-row"><span>👤</span><div><b>${safeName}</b>${safePhone?`<br><span>${driverEscape(o.customerPhone)}</span>`:''}</div></div>
          <div class="driver-meta-row"><span>📍</span><div>${safeAddress}</div></div>
          ${o.instructions?`<div class="driver-note">নির্দেশনা: ${driverEscape(o.instructions)}</div>`:''}
        </div>
        <div class="driver-total"><span>আদায়যোগ্য মোট</span><strong>${money(o.total ?? o.subtotal ?? o.billAmount ?? 0)}</strong></div>
        ${bazarBox}
        <div class="driver-actions">${navBtn}${nextBtn}${contactBtns}${chatBtn}</div>
        ${gpsPanel}
      </article>`;
    }).join('');
    const inTransitOrder = mine.find(o=>o.status==='in_transit');
    if(inTransitOrder && !LocationService.isWatching()){
      LocationService.watchDriver(inTransitOrder.id, ()=>this._refreshGpsPanel());
      if(this._battTimer) clearInterval(this._battTimer);
      this._battTimer = setInterval(()=>this._refreshGpsPanel(), 20000);
      this._refreshGpsPanel();
    }
  },

  liveWatchId:null,
  async advance(orderId,status){ const ok=await OrdersService.updateStatus(orderId,status); if(ok){ toast('✓ স্ট্যাটাস আপডেট হয়েছে','success'); this.render(); } },
  async acceptOrder(orderId){
    if(!FB) return;
    try{
      await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{driverAccepted:true, acceptedAt:FB.serverTimestamp()});
      toast('✓ অর্ডার গ্রহণ করা হয়েছে','success');
      this.render();
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },
  async rejectOrder(orderId){
    if(!FB) return;
    if(!confirm('এই অর্ডারটা Reject করলে এটা আবার admin-এর কাছে ফিরে যাবে। নিশ্চিত?')) return;
    try{
      await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{status:'confirmed', driverId:null, driverName:null, driverAccepted:false, rejectedAt:FB.serverTimestamp()});
      toast('অর্ডার প্রত্যাখ্যান করা হয়েছে, অ্যাডমিনকে জানানো হয়েছে','success');
      this.render();
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },
  startTransit(orderId){
    const ok = LocationService.watchDriver(orderId, ()=>{ this._refreshGpsPanel(); });
    if(!ok){ this.advance(orderId,'in_transit'); return; }
    this._refreshGpsPanel();
    if(this._battTimer) clearInterval(this._battTimer);
    this._battTimer = setInterval(()=>this._refreshGpsPanel(), 20000);
    this.advance(orderId,'in_transit');
  },
  async _refreshGpsPanel(){
    const el = document.getElementById('driverGpsPanel');
    if(!el) return;
    const batt = await LocationService.getBattery();
    const gps = await LocationService.getGpsStatus();
    const gpsLabel = {granted:'✅ সক্রিয়', denied:'❌ বন্ধ', prompt:'⚠️ অনুমতি বাকি', unknown:'', unsupported:'সাপোর্ট নেই'}[gps]||gps;
    const battLabel = batt.supported ? `${batt.level}%${batt.charging?' ⚡':''}` : 'অজানা';
    const lastLabel = LocationService.timeSince(LocationService.lastUpdate);
    el.innerHTML = `
      <div class="row-between" style="font-size:11.5px"><span>📍 GPS স্ট্যাটাস</span><strong>${gpsLabel}</strong></div>
      <div class="row-between" style="font-size:11.5px"><span>🔋 ব্যাটারি</span><strong>${battLabel}</strong></div>
      <div class="row-between" style="font-size:11.5px"><span>📡 সর্বশেষ আপডেট</span><strong>${lastLabel}</strong></div>`;
  }
};

function bazarShopHTML(o){
  const lines = (o.bazarList||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const rows = lines.map((line,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)">
    <span class="bazar-line-text" style="font-size:12px;color:var(--ink-soft);flex:1">${driverEscape(line)}</span>
    <input type="number" placeholder="৳" data-bazar-line="${o.id}:${i}" oninput="BazarShop.recalc('${o.id}', ${lines.length})" style="width:70px;padding:6px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--line-l);color:#fff;font-size:12px;text-align:right">
  </div>`).join('');
  return `<div style="margin:8px 0;padding:10px;background:rgba(212,175,55,.05);border:1px solid var(--gold-line);border-radius:10px">
    <div style="font-size:11.5px;color:var(--gold);font-weight:600;margin-bottom:8px">🛒 আইটেম অনুযায়ী দাম লিখুন (Shop & Deliver)</div>
    <button class="btn btn-outline btn-block" style="margin-bottom:8px;font-size:11.5px" onclick="BazarMemo.openById('${esc(BazarMemo.register(o))}')">🧾 লিস্ট প্রিন্ট করুন (দোকানে নিয়ে যাওয়ার জন্য)</button>
    ${rows}
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:700;color:#fff;font-size:13px">মোট বিল <span id="bazarTotal-${o.id}">৳0</span></div>
    <div style="font-size:11px;color:var(--ink-muted);margin:8px 0 4px">দোকানের মেমো/রশিদের ছবি *</div>
    <input type="file" accept="image/*" multiple id="bazarPhotos-${o.id}" style="width:100%;font-size:11.5px;color:var(--ink-muted)">
    <button class="btn btn-gold btn-block" style="margin-top:8px;font-size:12.5px" onclick="BazarShop.submit('${o.id}', ${lines.length})">✅ বাজার সম্পন্ন, বিল আপলোড করুন</button>
  </div>`;
}
const BazarShop = {
  recalc(orderId, count){
    let total=0;
    for(let i=0;i<count;i++){ const el=document.querySelector(`[data-bazar-line="${orderId}:${i}"]`); total += Number(el?.value||0); }
    const totalEl = document.getElementById('bazarTotal-'+orderId); if(totalEl) totalEl.textContent = money(total);
  },
  async submit(orderId, count){
    const items=[]; let total=0;
    for(let i=0;i<count;i++){
      const el=document.querySelector(`[data-bazar-line="${orderId}:${i}"]`);
      const price=Number(el?.value||0);
      const text = el?.closest('div')?.querySelector('.bazar-line-text')?.textContent || '';
      items.push({text, price});
      total += price;
    }
    if(!total){ toast('প্রতিটা আইটেমের দাম লিখুন','error'); return; }
    const fileInput = document.getElementById('bazarPhotos-'+orderId);
    const files = fileInput?.files;
    if(!files || !files.length){ toast('অন্তত একটা মেমোর ছবি আপলোড করুন','error'); return; }
    if(!FB){ toast('সংযোগ সমস্যা','error'); return; }
    try{
      const urls=[];
      for(const file of files){
        const fileRef = FB.storageRef(FB.storage, `bills/${orderId}_${Date.now()}_${file.name}`);
        await FB.uploadBytes(fileRef, file);
        urls.push(await FB.getDownloadURL(fileRef));
      }
      await FB.updateDoc(FB.doc(FB.db,'orders',orderId), {
        bazarItems: items, billAmount: total, billPhotos: urls,
        subtotal: total, status: 'picked_up'
      });
      toast('✓ বাজার সম্পন্ন! বিল আপলোড হয়েছে','success');
      DriverPortal.render();
    }catch(e){ toast('আপলোড ব্যর্থ: '+e.message,'error'); }
  }
};