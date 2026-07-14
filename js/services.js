/* services.js — OrdersService, DriverManage, ReviewService, RefundService */
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
  async assignDriver(orderId, driverId, driverName) {
    if (!FB) return false;
    try {
      await FB.updateDoc(FB.doc(FB.db, 'orders', orderId), {
        driverId, driverName, status: 'assigned', assignedAt: FB.serverTimestamp()
      });
      /* SMS trigger */
      const order = this.cache.find(o => o.id === orderId) || { id: orderId };
      const driver = await FB.getDoc(FB.doc(FB.db, 'drivers', driverId)).catch(() => null);
      const dPhone = driver?.data()?.phone || '';
      SMSGateway.onDriverAssigned(order, driverName, dPhone);
      return true;
    } catch (e) { toast('ড্রাইভার অ্যাসাইন ব্যর্থ: ' + e.message, 'error'); return false; }
  },
  async updateStatus(orderId, status) {
    if (!FB) return false;
    try {
      await FB.updateDoc(FB.doc(FB.db, 'orders', orderId), { status });
      /* SMS trigger */
      const order = this.cache.find(o => o.id === orderId) || { id: orderId };
      if (status === 'delivered') SMSGateway.onDelivered(order);
      if (status === 'cancelled') SMSGateway.onCancelled(order);
      return true;
    } catch (e) { toast('স্ট্যাটাস আপডেট ব্যর্থ', 'error'); return false; }
  },
  async cancelOrder(orderId){
    if(!FB) return false;
    try{ await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{status:'cancelled',cancelledAt:FB.serverTimestamp()}); return true; }
    catch(e){ toast('অর্ডার বাতিল ব্যর্থ','error'); return false; }
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

const ReviewService = {
  async loadReviews(productId){
    if(!FB) return [];
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'reviews'), FB.where('productId','==',productId)));
      const reviews=[]; snap.forEach(d=>reviews.push({id:d.id,...d.data()}));
      reviews.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      return reviews;
    }catch(e){ devWarn(e.message); return []; }
  },
  async submitReview(productId, rating, text, userName){
    if(!FB){ toast('সংযোগ সমস্যা','error'); return false; }
    if(!rating || !text.trim()){ toast('রেটিং ও মন্তব্য দিন','error'); return false; }
    try{
      await FB.addDoc(FB.collection(FB.db,'reviews'),{productId, rating:Number(rating), text:text.trim(), userName:userName||'গ্রাহক', createdAt:FB.serverTimestamp()});
      toast('✓ রিভিউ সাবমিট হয়েছে','success');
      return true;
    }catch(e){ toast('রিভিউ সাবমিট ব্যর্থ: '+e.message,'error'); return false; }
  },
  async renderReviews(productId, containerId){
    const el = document.getElementById(containerId);
    if(!el) return;
    const reviews = await this.loadReviews(productId);
    if(!reviews.length){
      el.innerHTML = `<p style="color:var(--ink-muted);font-size:13px;text-align:center;padding:14px">এখনো কোনো রিভিউ নেই। আপনি প্রথম রিভিউ দিন!</p>`;
      return;
    }
    el.innerHTML = reviews.map(r=>{
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
      const date = r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString('bn-BD') : '';
      return `<div style="padding:12px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="font-size:13px;color:#fff">${r.userName||'গ্রাহক'}</strong>
          <span style="color:var(--gold);font-size:13px">${stars}</span>
        </div>
        <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6">${r.text}</p>
        <span style="font-size:10.5px;color:var(--ink-dim)">${date}</span>
      </div>`;
    }).join('');
  }
};

const RefundService = {
  async requestRefund(orderId, reason){
    if(!FB){ toast('সংযোগ সমস্যা','error'); return false; }
    if(!reason.trim()){ toast('রিফান্ডের কারণ লিখুন','error'); return false; }
    try{
      await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{refundRequested:true, refundReason:reason.trim(), refundStatus:'pending', refundRequestedAt:FB.serverTimestamp()});
      toast('✓ রিফান্ড রিকোয়েস্ট সাবমিট হয়েছে','success');
      return true;
    }catch(e){ toast('রিকোয়েস্ট ব্যর্থ: '+e.message,'error'); return false; }
  },
  async approveRefund(orderId, status){
    if(!FB) return false;
    try{ await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{refundStatus:status, refundProcessedAt:FB.serverTimestamp()}); toast(`✓ রিফান্ড ${status==='approved'?'অনুমোদিত':'বাতিল'} হয়েছে`,'success'); return true; }
    catch(e){ toast('আপডেট ব্যর্থ','error'); return false; }
  }
};