/* admin.js — OrdersService, DriverManage, DriverPortal, ZoneManagerDash, AdminDash, ProductForm */
/* ---------- Order/Driver/ZoneManager/Admin services ---------- */
const OrdersService = {
  cache:[],
  async loadAll(){
    if(!FB) return [];
    try{
      const snap = await FB.getDocs(FB.collection(FB.db,'orders'));
      const orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
      orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      this.cache=orders; return orders;
    }catch(e){ devWarn(e.message); return []; }
  },
  async assignDriver(orderId,driverId,driverName){
    if(!FB) return false;
    try{ await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{driverId,driverName,status:'assigned',assignedAt:FB.serverTimestamp()}); return true; }
    catch(e){ toast('ড্রাইভার অ্যাসাইন ব্যর্থ: '+e.message,'error'); return false; }
  },
  async updateStatus(orderId,status){
    if(!FB) return false;
    try{ await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{status}); return true; }
    catch(e){ toast('স্ট্যাটাস আপডেট ব্যর্থ','error'); return false; }
  }
};

const DriverManage = {
  drivers:[], presetZone:null,
  async loadDrivers(){
    if(!FB) return [];
    try{ const snap=await FB.getDocs(FB.collection(FB.db,'drivers')); const list=[]; snap.forEach(d=>list.push({id:d.id,...d.data()})); this.drivers=list; return list; }
    catch(e){ devWarn(e.message); return []; }
  },
  async renderTable(zoneFilter=null){
    await this.loadDrivers();
    const tbody = document.getElementById(zoneFilter?'zmDriverManageTable':'driverManageTable');
    if(!tbody) return;
    const list = zoneFilter? this.drivers.filter(d=>d.branchZone===zoneFilter) : this.drivers;
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="4" style="text-align:center;color:var(--ink-muted);padding:20px">এখনো কোনো ড্রাইভার নেই</td></tr>`; return; }
    tbody.innerHTML = list.map(d=> zoneFilter
      ? `<tr><td>${d.name}</td><td>${d.phone}</td><td><span class="status-pill delivered">সক্রিয়</span></td></tr>`
      : `<tr><td>${d.name}</td><td>${AREA_LABELS[d.branchZone]||'—'}</td><td>${d.phone}</td><td><span class="status-pill delivered">সক্রিয়</span></td></tr>`
    ).join('');
  },
  openAdd(presetZone=null){
    this.presetZone=presetZone;
    document.getElementById('dfName').value=''; document.getElementById('dfPhone').value=''; document.getElementById('dfPin').value='';
    const sel=document.getElementById('dfZone');
    if(presetZone){ sel.value=presetZone; sel.disabled=true; } else sel.disabled=false;
    document.getElementById('dfMsg').className='form-msg';
    document.getElementById('driverModal').classList.add('show');
  },
  close(){ document.getElementById('driverModal').classList.remove('show'); },
  async submit(){
    const name=document.getElementById('dfName').value.trim();
    const branchZone=document.getElementById('dfZone').value;
    const phone=document.getElementById('dfPhone').value.trim();
    const pin=document.getElementById('dfPin').value.trim();
    const msgEl=document.getElementById('dfMsg');
    if(!name||!phone||pin.length!==4){ msgEl.textContent='সব তথ্য সঠিকভাবে দিন (পিন ৪ ডিজিট)'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      await FB.addDoc(FB.collection(FB.db,'drivers'),{name,phone,pin,branchZone,active:true,createdAt:FB.serverTimestamp()});
      msgEl.textContent='✓ ড্রাইভার যুক্ত হয়েছে'; msgEl.className='form-msg ok';
      await this.renderTable(this.presetZone);
      if(ZoneManagerDash.currentZone) await ZoneManagerDash.render(); else AdminDash.render();
      setTimeout(()=>this.close(),800);
    }catch(e){ msgEl.textContent='সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  }
};

const DriverPortal = {
  currentDriver:null,
  async login(){
    const phone=document.getElementById('driverPhone').value.trim();
    const pin=document.getElementById('driverPin').value.trim();
    const msgEl=document.getElementById('driverLoginMsg');
    if(!phone||!pin){ msgEl.textContent='মোবাইল ও পিন দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const snap = await FB.getDocs(FB.collection(FB.db,'drivers'));
      let found=null; snap.forEach(d=>{ const data=d.data(); if(data.phone===phone && String(data.pin)===pin) found={id:d.id,...data}; });
      if(!found){ msgEl.textContent='মোবাইল বা পিন সঠিক নয়'; msgEl.className='form-msg err'; return; }
      this.currentDriver=found;
      localStorage.setItem('golapi_driver_session', JSON.stringify({id:found.id,name:found.name,branchZone:found.branchZone}));
      document.getElementById('driverLoginBox').style.display='none';
      document.getElementById('driverDashBox').style.display='block';
      document.getElementById('driverNameLabel').textContent=found.name;
      await this.render();
    }catch(e){ msgEl.textContent='লগইন সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  },
  logout(){
    this.currentDriver=null; localStorage.removeItem('golapi_driver_session');
    document.getElementById('driverLoginBox').style.display='block';
    document.getElementById('driverDashBox').style.display='none';
  },
  async render(){
    const saved=localStorage.getItem('golapi_driver_session');
    if(saved && !this.currentDriver) this.currentDriver=JSON.parse(saved);
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
        // Custom bazar = "shop & deliver": driver prices each item live, uploads shop memo(s),
        // and that single action IS the pickup-complete step (matches the real workflow —
        // there's no single store to "pick up" from, the driver visits multiple shops).
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
  async advance(orderId,status){ const ok=await OrdersService.updateStatus(orderId,status); if(ok){ toast('✓ স্ট্যাটাস আপডেট হয়েছে','success'); this.render(); } }
    ,
  /* "রওনা দিন" চাপলে ব্রাউজারের GPS থেকে প্রতি ৩০ সেকেন্ডে ড্রাইভারের লোকেশন Firestore-এ
     আপডেট হয় (driverLat/driverLng) — কাস্টমার MyOrders পেজ থেকে সরাসরি Google Maps-এ
     এই লোকেশন দেখতে পারে (orderTrackHTML দেখুন)। */
  startTransit(orderId){
    if(!navigator.geolocation){ toast('এই ব্রাউজারে লোকেশন সাপোর্ট নেই','error'); this.advance(orderId,'in_transit'); return; }
    if(this.liveWatchId) navigator.geolocation.clearWatch(this.liveWatchId);
    this.liveWatchId = navigator.geolocation.watchPosition(pos=>{
      if(FB) FB.updateDoc(FB.doc(FB.db,'orders',orderId),{driverLat:pos.coords.latitude, driverLng:pos.coords.longitude}).catch(()=>{});
    }, ()=>{}, {enableHighAccuracy:true, maximumAge:15000});
    this.advance(orderId,'in_transit');
  }
};

/* ---------- Custom Bazar "Shop & Deliver" (Uber-Eats style itemized shopping) ----------
   কাস্টম বাজার অর্ডার একটা দোকান থেকে আসে না — ড্রাইভার একাধিক দোকান ঘুরে জিনিস কেনে।
   তাই এখানে "পিকআপ" মানে "বাজার সম্পন্ন করে মেমো আপলোড করা"। প্রতিটা আইটেমের পাশে
   দাম বসিয়ে মোট বিল অটো ক্যালকুলেট হয় — কাস্টমার এই itemized তালিকা দেখেই যাচাই
   করতে পারবে, প্রতারিত হওয়ার সুযোগ কমে যায়। */
function bazarShopHTML(o){
  const lines = (o.bazarList||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const rows = lines.map((line,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)">
    <span class="bazar-line-text" style="font-size:12px;color:var(--ink-soft);flex:1">${line}</span>
    <input type="number" placeholder="৳" data-bazar-line="${o.id}:${i}" oninput="BazarShop.recalc('${o.id}', ${lines.length})" style="width:70px;padding:6px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--line-l);color:#fff;font-size:12px;text-align:right">
  </div>`).join('');
  return `<div style="margin:8px 0;padding:10px;background:rgba(212,175,55,.05);border:1px solid var(--gold-line);border-radius:10px">
    <div style="font-size:11.5px;color:var(--gold);font-weight:600;margin-bottom:8px">🛒 আইটেম অনুযায়ী দাম লিখুন (Shop &amp; Deliver)</div>
    ${rows}
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:700;color:#fff;font-size:13px">মোট বিল <span id="bazarTotal-${o.id}">৳0</span></div>
    <div style="font-size:11px;color:var(--ink-muted);margin:8px 0 4px">দোকানের মেমো/রশিদের ছবি (একাধিক দোকান হলে একাধিক ছবি) *</div>
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

const ZoneManagerDash = {
  currentZone:null,
  applyHeader(zone){
    const info = BRANCH_INFO[zone];
    document.getElementById('zmZoneLabel').textContent = info.label;
    document.getElementById('zmManagerLabel').textContent = 'ম্যানেজার: '+info.managerName;
  },
  async login(){
    const zone=document.getElementById('zmZoneSelect').value;
    const pin=document.getElementById('zmPinInput').value.trim();
    const msgEl=document.getElementById('zmLoginMsg');
    if(!pin){ msgEl.textContent='পিন দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'setting','zone_manager_pins'));
      const pins = snap.exists()? snap.data() : {};
      if(!pins[zone] || pins[zone]!==pin){ msgEl.textContent='পিন সঠিক নয়'; msgEl.className='form-msg err'; return; }
      this.currentZone=zone; localStorage.setItem('golapi_zm_session',zone);
      document.getElementById('zmLoginBox').style.display='none';
      document.getElementById('zmDashBox').style.display='block';
      this.applyHeader(zone); await this.render();
    }catch(e){ msgEl.textContent='লগইন সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  },
  logout(){ this.currentZone=null; localStorage.removeItem('golapi_zm_session'); document.getElementById('zmLoginBox').style.display='block'; document.getElementById('zmDashBox').style.display='none'; },
  async render(){
    const saved=localStorage.getItem('golapi_zm_session');
    if(saved && !this.currentZone) this.currentZone=saved;
    if(!this.currentZone){ document.getElementById('zmLoginBox').style.display='block'; document.getElementById('zmDashBox').style.display='none'; return; }
    document.getElementById('zmLoginBox').style.display='none';
    document.getElementById('zmDashBox').style.display='block';
    this.applyHeader(this.currentZone);
    const orders = (await OrdersService.loadAll()).filter(o=>o.branchZone===this.currentZone);
    const products = ALL_PRODUCTS.filter(p=>p.zone===this.currentZone);
    await DriverManage.loadDrivers();
    const sales = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.subtotal||0),0);
    const pending = orders.filter(o=>o.status==='pending'||o.status==='confirmed').length;
    document.getElementById('zmStatSales').textContent=money(sales);
    document.getElementById('zmStatOrders').textContent=bn(orders.length);
    document.getElementById('zmStatPending').textContent=bn(pending);
    document.getElementById('zmStatProducts').textContent=bn(products.length);
    this.renderProducts(products); this.renderOrders(orders); DriverManage.renderTable(this.currentZone);
  },
  renderProducts(list){
    const tbody=document.getElementById('zmProductsTable');
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--ink-muted);padding:24px">এই শাখায় কোনো প্রোডাক্ট নেই</td></tr>`; return; }
    tbody.innerHTML = list.map(p=>`<tr><td>${p.name}</td><td>${CATEGORIES.find(c=>c.id===p.category)?.label||p.category}</td><td>${money(p.salePrice)}</td><td>${bn(p.stock)}</td><td><span class="status-pill ${p.stock>0?'delivered':'cancelled'}">${p.stock>0?'লাইভ':'স্টক আউট'}</span></td><td><a href="#" onclick="event.preventDefault();ProductForm.openEdit('${p.id}')">এডিট</a></td></tr>`).join('');
  },
  renderOrders(orders){
    const tbody=document.getElementById('zmOrdersTable');
    if(!orders.length){ tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--ink-muted);padding:24px">কোনো অর্ডার নেই</td></tr>`; return; }
    const zoneDrivers = DriverManage.drivers.filter(d=>d.branchZone===this.currentZone);
    tbody.innerHTML = orders.map(o=>{
      const s=ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      const opts = zoneDrivers.map(d=>`<option value="${d.id}" ${o.driverId===d.id?'selected':''}>${d.name}</option>`).join('');
      return `<tr><td>${o.orderNumber||o.id}</td><td>${o.customerName||''}</td><td>${o.customerPhone||''}</td><td>${money(o.subtotal||0)}</td>
      <td><select onchange="ZoneManagerDash.assignDriver('${o.id}',this.value)" style="padding:4px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);color:#fff"><option value="">বেছে নিন</option>${opts}</select></td>
      <td><span class="status-pill ${s.cls}">${s.label}</span></td></tr>`;
    }).join('');
  },
  async assignDriver(orderId,driverId){
    if(!driverId) return;
    const d = DriverManage.drivers.find(x=>x.id===driverId); if(!d) return;
    const ok = await OrdersService.assignDriver(orderId,driverId,d.name);
    if(ok){ toast(`✓ ${d.name}-কে অ্যাসাইন করা হয়েছে`,'success'); this.render(); }
  },
  tab(btn,name){
    ['overview','products','orders','drivers'].forEach(t=>{ document.getElementById('zm'+t.charAt(0).toUpperCase()+t.slice(1)+'Pane').style.display = t===name?'block':'none'; });
    document.querySelectorAll('#page-zone-manager .dash-side a').forEach(a=>a.classList.remove('active'));
    if(btn) btn.classList.add('active');
  },
  openAddProduct(){
    ProductForm.openAdd();
    const isSadar = this.currentZone==='noakhali_sadar';
    document.getElementById('pfZoneSadar').checked=isSadar; document.getElementById('pfZoneBegumganj').checked=!isSadar;
    document.getElementById('pfZoneSadar').disabled=true; document.getElementById('pfZoneBegumganj').disabled=true;
  }
};

const AdminDash = {
  async render(){
    const orders = await OrdersService.loadAll();
    await DriverManage.loadDrivers();
    const sales = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.subtotal||0),0);
    const pending = orders.filter(o=>o.status==='pending'||o.status==='confirmed').length;
    document.getElementById('aStatGmv').textContent=money(sales);
    document.getElementById('aStatOrders').textContent=bn(orders.length);
    document.getElementById('aStatPending').textContent=bn(pending);
    document.getElementById('aStatProducts').textContent=bn(ALL_PRODUCTS.length);
    document.getElementById('aRecentOrders').innerHTML = orders.length ? orders.slice(0,5).map(o=>{
      const s=ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      return `<tr><td>${o.orderNumber||o.id}</td><td>${(o.items||[]).length} আইটেম</td><td>${money(o.subtotal||0)}</td><td><span class="status-pill ${s.cls}">${s.label}</span></td></tr>`;
    }).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--ink-muted);padding:24px">কোনো অর্ডার নেই</td></tr>`;
    this.renderProducts(); this.renderOrders(orders); DriverManage.renderTable();
    const cod = orders.filter(o=>o.paymentMethod==='cod'&&o.status!=='delivered'&&o.status!=='cancelled').reduce((s,o)=>s+(o.subtotal||0),0);
    const online = orders.filter(o=>o.paymentMethod!=='cod').reduce((s,o)=>s+(o.subtotal||0),0);
    document.getElementById('fMonth').textContent=money(sales);
    document.getElementById('fCod').textContent=money(cod);
    document.getElementById('fOnline').textContent=money(online);
  },
  renderProducts(){
    if(!ALL_PRODUCTS.length){ document.getElementById('aProductsTable').innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:24px">কোনো প্রোডাক্ট নেই</td></tr>`; return; }
    document.getElementById('aProductsTable').innerHTML = ALL_PRODUCTS.map(p=>`<tr><td>${p.name}</td><td>${AREA_LABELS[p.zone]||'—'}</td><td>${CATEGORIES.find(c=>c.id===p.category)?.label||p.category}</td><td>${money(p.salePrice)}</td><td>${bn(p.stock)}</td><td><span class="status-pill ${p.stock>0?'delivered':'cancelled'}">${p.stock>0?'লাইভ':'স্টক আউট'}</span></td><td><a href="#" onclick="event.preventDefault();ProductForm.openEdit('${p.id}')">এডিট</a></td></tr>`).join('');
  },
  renderOrders(orders){
    if(!orders.length){ document.getElementById('aOrdersTable').innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:24px">কোনো অর্ডার নেই</td></tr>`; return; }
    document.getElementById('aOrdersTable').innerHTML = orders.map(o=>{
      const s = ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      const zoneDrivers = DriverManage.drivers.filter(d=>d.branchZone===o.branchZone);
      const opts = zoneDrivers.map(d=>`<option value="${d.id}" ${o.driverId===d.id?'selected':''}>${d.name}</option>`).join('');
      return `<tr><td>${o.orderNumber||o.id}</td><td>${AREA_LABELS[o.branchZone]||'—'}</td><td>${o.customerName||''}</td><td>${o.customerPhone||''}</td><td>${money(o.subtotal||0)}</td>
      <td><select onchange="AdminDash.assignDriver('${o.id}',this.value)" style="padding:4px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);color:#fff"><option value="">বেছে নিন</option>${opts}</select></td>
      <td><span class="status-pill ${s.cls}">${s.label}</span></td></tr>`;
    }).join('');
  },
  async assignDriver(orderId,driverId){
    if(!driverId) return;
    const d = DriverManage.drivers.find(x=>x.id===driverId); if(!d) return;
    const ok = await OrdersService.assignDriver(orderId,driverId,d.name);
    if(ok){ toast(`✓ ${d.name}-কে অ্যাসাইন করা হয়েছে`,'success'); this.render(); }
  },
  tab(btn,name){
    ['overview','products','orders','finance','settings'].forEach(t=>{ document.getElementById('admin'+t.charAt(0).toUpperCase()+t.slice(1)+'Pane').style.display = t===name?'block':'none'; });
    document.querySelectorAll('#page-admin-dash .dash-side a').forEach(a=>a.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(name==='products') this.renderProducts();
    if(name==='settings') this.loadZmPins();
  },
  async loadZmPins(){
    if(!FB) return;
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'setting','zone_manager_pins'));
      const pins = snap.exists()? snap.data() : {};
      document.getElementById('zmPinSadar').value = pins.noakhali_sadar||'';
      document.getElementById('zmPinBegumganj').value = pins.begumganj||'';
    }catch(e){ devWarn(e.message); }
  },
  async saveZmPins(){
    if(!FB){ toast('সংযোগ সমস্যা','error'); return; }
    try{
      await FB.setDoc(FB.doc(FB.db,'setting','zone_manager_pins'),{
        noakhali_sadar: document.getElementById('zmPinSadar').value.trim(),
        begumganj: document.getElementById('zmPinBegumganj').value.trim()
      });
      toast('✓ পিন সংরক্ষণ করা হয়েছে','success');
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  }
};

/* ---------- Product Form (Add/Edit) ---------- */
const ProductForm = {
  mode:'add', editId:null,
  imgBase64: null,
  onImageSelect(input){
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.imgBase64 = e.target.result;
      document.getElementById('pfImgThumb').src = e.target.result;
      document.getElementById('pfImgPreview').style.display = 'block';
      document.getElementById('pfDescAiBtn').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  },
  async generateDesc(){
    const name = document.getElementById('pfName').value.trim();
    const cat = document.getElementById('pfCategory').value;
    const loadEl = document.getElementById('pfDescLoading');
    const descEl = document.getElementById('pfDescription');
    loadEl.style.display = 'block';
    document.getElementById('pfDescAiBtn').style.display = 'none';
    try{
      const messages = [{role:'user', content:[
        {type:'text', text:`তুমি একটি বাংলাদেশি ই-কমার্স দোকানের জন্য পণ্যের বিবরণ লিখবে। পণ্যের নাম: "${name || 'পণ্য'}", ক্যাটাগরি: "${cat}". ছবি দেখে সংক্ষিপ্ত, আকর্ষণীয় বাংলা বিবরণ লিখো (৩-৫ লাইন)। শুধু বিবরণ দাও, অন্য কিছু না।`},
        ...(this.imgBase64 ? [{type:'image', source:{type:'base64', media_type:'image/jpeg', data: this.imgBase64.split(',')[1]}}] : [])
      ]}];
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-6', max_tokens:300, messages})
      });
      const data = await res.json();
      const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
      if(text) descEl.value = text;
      else toast('বিবরণ তৈরি হয়নি','error');
    }catch(e){ toast('AI সংযোগ সমস্যা','error'); }
    finally{ loadEl.style.display='none'; document.getElementById('pfDescAiBtn').style.display='inline-block'; }
  },
  openAdd(){
    this.mode='add'; this.editId=null; this.imgBase64=null;
    document.getElementById('pfTitle').textContent='নতুন প্রোডাক্ট যুক্ত করুন';
    document.getElementById('pfSubmitBtn').textContent='প্রোডাক্ট সংরক্ষণ করুন';
    ['pfName','pfPrice','pfSalePrice','pfStock','pfDescription','pfCostPrice'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('pfImgFile').value='';
    document.getElementById('pfImgPreview').style.display='none';
    document.getElementById('pfDescAiBtn').style.display='none';
    document.getElementById('pfExtraCost').value='0'; document.getElementById('pfDeliveryPercent').value='0'; document.getElementById('pfProfitPercent').value='20';
    document.getElementById('pfBreakdown').textContent='৳০';
    document.getElementById('pfZoneSadar').disabled=false; document.getElementById('pfZoneBegumganj').disabled=false;
    document.getElementById('pfZoneSadar').checked=true; document.getElementById('pfZoneBegumganj').checked=false;
    document.getElementById('pfCategory').value='grocery'; document.getElementById('pfUnit').value='পিস';
    document.getElementById('pfCod').checked=true; document.getElementById('pfFlash').checked=false; document.getElementById('pfFeatured').checked=false;
    document.getElementById('pfMsg').className='form-msg';
    document.getElementById('productModal').classList.add('show');
  },
  recalc(){
    const cost=Number(document.getElementById('pfCostPrice').value)||0;
    const extra=Number(document.getElementById('pfExtraCost').value)||0;
    const delp=Number(document.getElementById('pfDeliveryPercent').value)||0;
    const profp=Number(document.getElementById('pfProfitPercent').value)||0;
    const base=cost+extra;
    const afterDel = base + base*delp/100;
    const final = Math.round(afterDel + afterDel*profp/100);
    document.getElementById('pfBreakdown').textContent = `৳${cost}+৳${extra} → +${delp}% → +${profp}% = ৳${final}`;
    if(cost>0){
      document.getElementById('pfSalePrice').value = final;
      const priceField = document.getElementById('pfPrice');
      if(!priceField.value) priceField.value = Math.round(final*1.1);
    }
  },
  openEdit(id){
    const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p){ toast('প্রোডাক্ট পাওয়া যায়নি','error'); return; }
    this.mode='edit'; this.editId=id;
    document.getElementById('pfTitle').textContent='প্রোডাক্ট সম্পাদনা করুন';
    document.getElementById('pfSubmitBtn').textContent='পরিবর্তন সংরক্ষণ করুন';
    document.getElementById('pfName').value=p.name;
    document.getElementById('pfZoneSadar').checked = p.zone==='noakhali_sadar';
    document.getElementById('pfZoneBegumganj').checked = p.zone==='begumganj';
    document.getElementById('pfZoneSadar').disabled=true; document.getElementById('pfZoneBegumganj').disabled=true;
    document.getElementById('pfCategory').value=p.category; document.getElementById('pfUnit').value=p.unit;
    document.getElementById('pfPrice').value=p.price; document.getElementById('pfSalePrice').value=p.salePrice; document.getElementById('pfStock').value=p.stock;
    document.getElementById('pfCostPrice').value=p.costPrice||''; document.getElementById('pfExtraCost').value=p.extraCost||0;
    document.getElementById('pfDeliveryPercent').value=p.deliveryPercent||0; document.getElementById('pfProfitPercent').value=p.profitPercent||20;
    document.getElementById('pfBreakdown').textContent = p.costPrice ? `৳${p.costPrice}+৳${p.extraCost||0} → +${p.deliveryPercent||0}% → +${p.profitPercent||20}% = ৳${p.salePrice}` : '৳০';
    document.getElementById('pfDescription').value=p.description||'';
    document.getElementById('pfCod').checked=!!p.cod; document.getElementById('pfFlash').checked=!!p.isFlash; document.getElementById('pfFeatured').checked=!!p.isFeatured;
    document.getElementById('pfMsg').className='form-msg';
    document.getElementById('productModal').classList.add('show');
  },
  close(){ document.getElementById('productModal').classList.remove('show'); },
  async submit(){
    const msgEl=document.getElementById('pfMsg');
    const name=document.getElementById('pfName').value.trim();
    const selZones=[]; if(document.getElementById('pfZoneSadar').checked) selZones.push('noakhali_sadar'); if(document.getElementById('pfZoneBegumganj').checked) selZones.push('begumganj');
    const category=document.getElementById('pfCategory').value, unit=document.getElementById('pfUnit').value;
    const price=Number(document.getElementById('pfPrice').value), salePrice=Number(document.getElementById('pfSalePrice').value), stock=Number(document.getElementById('pfStock').value);
    const description=document.getElementById('pfDescription').value.trim();
    const cod=document.getElementById('pfCod').checked, isFlash=document.getElementById('pfFlash').checked, isFeatured=document.getElementById('pfFeatured').checked;
    const costPrice=Number(document.getElementById('pfCostPrice').value)||0, extraCost=Number(document.getElementById('pfExtraCost').value)||0;
    const deliveryPercent=Number(document.getElementById('pfDeliveryPercent').value)||0, profitPercent=Number(document.getElementById('pfProfitPercent').value)||0;
    if(!name||!salePrice||stock===''){ msgEl.textContent='সব প্রয়োজনীয় তথ্য পূরণ করুন'; msgEl.className='form-msg err'; return; }
    if(!selZones.length){ msgEl.textContent='অন্তত একটা শাখা বেছে নিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা — Firebase কনফিগার নেই'; msgEl.className='form-msg err'; return; }
    const btn=document.getElementById('pfSubmitBtn'); const orig=btn.textContent; btn.textContent='সংরক্ষণ হচ্ছে...'; btn.disabled=true;
    try{
      let imageUrl = null;
      const imgFile = document.getElementById('pfImgFile').files[0];
      if(imgFile){
        const fileRef = FB.storageRef(FB.storage, `products/${Date.now()}_${imgFile.name}`);
        await FB.uploadBytes(fileRef, imgFile);
        imageUrl = await FB.getDownloadURL(fileRef);
      }
      const base = {name,category,unit,price:price||salePrice,salePrice,stock,description,costPrice,extraCost,deliveryPercent,profitPercent,cod,isFlash,isFeatured,status:'active',updatedAt:FB.serverTimestamp()};
      if(imageUrl) base.imageUrl = imageUrl;
      if(this.mode==='add'){
        const groupId = selZones.length>1 ? `${Date.now()}` : null;
        for(const zone of selZones){
          const data = {...base, zone, createdAt:FB.serverTimestamp(), rating:'৫.০', reviews:0, sold:0, fastDelivery:true};
          if(groupId) data.groupId = groupId;
          await FB.addDoc(FB.collection(FB.db,'products'), data);
        }
        msgEl.textContent = selZones.length>1 ? '✓ দুই শাখাতেই যুক্ত হয়েছে' : '✓ প্রোডাক্ট যুক্ত হয়েছে'; msgEl.className='form-msg ok';
      }else{
        await FB.updateDoc(FB.doc(FB.db,'products',this.editId), {...base, zone:selZones[0]});
        msgEl.textContent='✓ প্রোডাক্ট আপডেট হয়েছে'; msgEl.className='form-msg ok';
      }
      await ProductStore.refreshAndRerender();
      if(ZoneManagerDash.currentZone) ZoneManagerDash.render(); else { AdminDash.renderProducts(); document.getElementById('aStatProducts').textContent=bn(ALL_PRODUCTS.length); }
      setTimeout(()=>this.close(),900);
    }catch(e){ msgEl.textContent='সমস্যা হয়েছে: '+e.message; msgEl.className='form-msg err'; }
    finally{ btn.textContent=orig; btn.disabled=false; }
  }
};