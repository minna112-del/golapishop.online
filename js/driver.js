/* driver.js — DriverPortal (Firebase Auth secured), BazarShop */
const DriverPortal = {
  currentDriver:null, currentUid:null,
  async login(){
    const email=document.getElementById('driverEmail').value.trim();
    const pass=document.getElementById('driverPassword').value;
    const msgEl=document.getElementById('driverLoginMsg');
    if(!email||!pass){ msgEl.textContent='ইমেইল ও পাসওয়ার্ড দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
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
      await this.render();
    }catch(e){ msgEl.textContent='লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়'; msgEl.className='form-msg err'; }
  },
  async logout(){
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
  async render(){
    await this._restoreSession();
    if(!this.currentDriver){ document.getElementById('driverLoginBox').style.display='block'; document.getElementById('driverDashBox').style.display='none'; return; }
    document.getElementById('driverLoginBox').style.display='none';
    document.getElementById('driverDashBox').style.display='block';
    document.getElementById('driverNameLabel').textContent=this.currentDriver.name;
    const all = await OrdersService.loadAll();
    const mine = all.filter(o=>o.driverId===this.currentDriver.id && o.status!=='delivered' && o.status!=='cancelled');
    const transit = mine.filter(o=>o.status==='in_transit'||o.status==='picked_up').length;
    const done = all.filter(o=>o.driverId===this.currentDriver.id && o.status==='delivered').length;
    document.getElementById('dStatAssigned').textContent=bn(mine.length);
    document.getElementById('dStatTransit').textContent=bn(transit);
    document.getElementById('dStatDone').textContent=bn(done);
    const listEl=document.getElementById('driverOrdersList');
    if(!mine.length){ listEl.innerHTML=`<div class="empty-state"><div class="em">📦</div><h3>কোনো অর্ডার অ্যাসাইন করা নেই</h3></div>`; return; }
    listEl.innerHTML = mine.map(o=>{
      const s = ORDER_STATUS[o.status]||ORDER_STATUS.assigned;
      const isCustomBazar = o.orderType==='custom-bazar';
      let nextBtn='';
      let bazarBox='';
      if(isCustomBazar && o.status==='assigned'){
        bazarBox = bazarShopHTML(o);
      } else if(o.status==='assigned') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.advance('${o.id}','packed')">📦 প্যাকিং সম্পন্ন</button>`;
      else if(o.status==='packed') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.advance('${o.id}','picked_up')">✓ পিকআপ সম্পন্ন</button>`;
      else if(o.status==='picked_up') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.startTransit('${o.id}')">🚴 রওনা দিন (লাইভ লোকেশন শুরু)</button>`;
      else if(o.status==='in_transit') nextBtn=`<button class="btn btn-gold btn-block" onclick="DriverPortal.advance('${o.id}','delivered')">✅ ডেলিভারি সম্পন্ন</button>`;
      const chatBtn = `<button class="btn btn-outline btn-block" style="margin-top:6px;font-size:12px" onclick="OrderChat.open('${o.id}','driver')">💬 কাস্টমারের সাথে চ্যাট</button>`;
      return `<div class="card-box"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>${o.orderNumber||o.id}</strong><span class="status-pill ${s.cls}">${s.label}</span></div>
        <div style="font-size:12.5px;margin-bottom:4px">👤 ${o.customerName} — <a href="tel:${o.customerPhone}">${o.customerPhone}</a></div>
        <div style="font-size:12.5px;color:var(--ink-muted);margin-bottom:8px">📍 ${o.village?o.village+', ':''}${o.zone||''}, ${o.district||''} — ${o.address||''}</div>
        ${o.instructions?`<div style="font-size:12px;background:rgba(255,255,255,.03);padding:8px;border-radius:8px;margin-bottom:8px;color:var(--ink-soft)">💬 ${o.instructions}</div>`:''}
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">মোট: ${money(o.subtotal||o.billAmount||0)}</div>${bazarBox}${nextBtn}${chatBtn}</div>`;
    }).join('');
  },
  liveWatchId:null,
  async advance(orderId,status){ const ok=await OrdersService.updateStatus(orderId,status); if(ok){ toast('✓ স্ট্যাটাস আপডেট হয়েছে','success'); this.render(); } },
  startTransit(orderId){
    if(!navigator.geolocation){ toast('এই ব্রাউজারে লোকেশন সাপোর্ট নেই','error'); this.advance(orderId,'in_transit'); return; }
    if(this.liveWatchId) navigator.geolocation.clearWatch(this.liveWatchId);
    this.liveWatchId = navigator.geolocation.watchPosition(pos=>{
      if(FB) FB.updateDoc(FB.doc(FB.db,'orders',orderId),{driverLat:pos.coords.latitude, driverLng:pos.coords.longitude}).catch(()=>{});
    }, ()=>{}, {enableHighAccuracy:true, maximumAge:15000});
    this.advance(orderId,'in_transit');
  }
};

function bazarShopHTML(o){
  const lines = (o.bazarList||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const rows = lines.map((line,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)">
    <span class="bazar-line-text" style="font-size:12px;color:var(--ink-soft);flex:1">${line}</span>
    <input type="number" placeholder="৳" data-bazar-line="${o.id}:${i}" oninput="BazarShop.recalc('${o.id}', ${lines.length})" style="width:70px;padding:6px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--line-l);color:#fff;font-size:12px;text-align:right">
  </div>`).join('');
  return `<div style="margin:8px 0;padding:10px;background:rgba(212,175,55,.05);border:1px solid var(--gold-line);border-radius:10px">
    <div style="font-size:11.5px;color:var(--gold);font-weight:600;margin-bottom:8px">🛒 আইটেম অনুযায়ী দাম লিখুন (Shop & Deliver)</div>
    <button class="btn btn-outline btn-block" style="margin-bottom:8px;font-size:11.5px" onclick='BazarMemo.open(${JSON.stringify(o).replace(/'/g,"&#39;")})'>🧾 লিস্ট প্রিন্ট করুন (দোকানে নিয়ে যাওয়ার জন্য)</button>
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