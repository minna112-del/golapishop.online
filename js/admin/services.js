/* services.js — OrdersService, DriverManage (shared across admin & zone manager) */
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