/* finance.js — FinanceDash (Firebase Auth secured, zone-manager.js প্যাটার্ন অনুসরণ করে) */
const FinanceDash = {
  currentUid: null, currentName: null,
  _orders: [], _refunds: [],

  orderTotal(o){ return Number(o?.total ?? o?.grandTotal ?? o?.payableTotal ?? o?.subtotal ?? 0) || 0; },

  async login(){
    const email = document.getElementById('finEmail').value.trim();
    const pass = document.getElementById('finPassword').value;
    const msgEl = document.getElementById('finLoginMsg');
    if(!email || !pass){ msgEl.textContent='ইমেইল ও পাসওয়ার্ড দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const cred = await FB.signInWithEmailAndPassword(FB.auth, email, pass);
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',cred.user.uid));
      if(!staffSnap.exists() || staffSnap.data().role!=='finance'){
        await FB.signOut(FB.auth).catch(()=>{});
        msgEl.textContent='এই অ্যাকাউন্ট ফাইন্যান্স টিম হিসেবে অনুমোদিত নয়'; msgEl.className='form-msg err'; return;
      }
      this.currentUid = cred.user.uid;
      this.currentName = staffSnap.data().name || 'ফাইন্যান্স টিম';
      if(typeof StaffChat !== 'undefined') StaffChat.init(this.currentUid, this.currentName, 'finance');
      document.getElementById('finLoginBox').style.display='none';
      document.getElementById('finDashBox').style.display='block';
      const ml=document.getElementById('finUserLabel'); if(ml) ml.textContent='পরিচালনায়: '+this.currentName;
      await this.render();
    }catch(e){ msgEl.textContent='লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়'; msgEl.className='form-msg err'; }
  },

  async logout(){
    if(FB) await FB.signOut(FB.auth).catch(()=>{});
    this.currentUid=null; this.currentName=null;
    document.getElementById('finLoginBox').style.display='block';
    document.getElementById('finDashBox').style.display='none';
  },

  async _restoreSession(){
    if(this.currentUid || !FB || !FB.auth.currentUser) return;
    try{
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',FB.auth.currentUser.uid));
      if(staffSnap.exists() && staffSnap.data().role==='finance'){
        this.currentUid = FB.auth.currentUser.uid;
        this.currentName = staffSnap.data().name || 'ফাইন্যান্স টিম';
        if(typeof StaffChat !== 'undefined') StaffChat.init(this.currentUid, this.currentName, 'finance');
      }
    }catch(e){ devWarn('finance session restore failed', e.message); }
  },

  async render(){
    await this._restoreSession();
    if(!this.currentUid){
      document.getElementById('finLoginBox').style.display='block';
      document.getElementById('finDashBox').style.display='none';
      return;
    }
    document.getElementById('finLoginBox').style.display='none';
    document.getElementById('finDashBox').style.display='block';
    const ml=document.getElementById('finUserLabel'); if(ml) ml.textContent='পরিচালনায়: '+this.currentName;

    this._orders = await OrdersService.loadAll();
    await this.loadRefunds();

    this.renderOverview();
    this.renderRefunds();
    this.renderZoneBreakdown();
    this.renderCodByZone();
  },

  async refresh(){ await this.render(); toast('✓ আপডেট হয়েছে','success'); },

  tab(btn,name){
    ['overview','refunds','zones','cod'].forEach(t=>{
      const el=document.getElementById('fin'+t.charAt(0).toUpperCase()+t.slice(1)+'Pane');
      if(el) el.style.display=t===name?'block':'none';
    });
    document.querySelectorAll('#page-finance-dash .zm-tabs button').forEach(a=>a.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(name==='refunds') this.renderRefunds();
    if(name==='zones') this.renderZoneBreakdown();
    if(name==='cod') this.renderCodByZone();
  },

  // ---------- Overview ----------
  renderOverview(){
    const orders = this._orders;
    const active = orders.filter(o=>o.status!=='cancelled');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = active.filter(o=>new Date(o.createdAt?.seconds*1000||0)>=monthStart).reduce((s,o)=>s+this.orderTotal(o),0);

    const codOrders = active.filter(o=>o.paymentMethod==='cod' && o.status==='delivered');
    const codCollected = codOrders.reduce((s,o)=>s+this.orderTotal(o),0);
    const codDeposited = codOrders.filter(o=>o.codDeposited).reduce((s,o)=>s+this.orderTotal(o),0);
    const codPending = codCollected - codDeposited;
    const online = active.filter(o=>o.paymentMethod!=='cod').reduce((s,o)=>s+this.orderTotal(o),0);
    const refundPending = this._refunds.filter(r=>r.status==='pending').length;

    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('finMonthSales', money(monthSales));
    set('finCodPending', money(codPending));
    set('finOnlineTotal', money(online));
    set('finRefundPendingCount', bn(refundPending));

    this.renderRevenueChart(active);
    this.renderPayBreakdown(active);
  },

  renderRevenueChart(orders){
    const chartEl = document.getElementById('finRevenueChart');
    const labelsEl = document.getElementById('finChartLabels');
    if(!chartEl) return;
    const now = new Date();
    const days = [];
    for(let i=6;i>=0;i--){
      const d=new Date(now); d.setDate(d.getDate()-i);
      const ds=d.toDateString();
      const rev = orders.filter(o=>new Date(o.createdAt?.seconds*1000||0).toDateString()===ds).reduce((s,o)=>s+this.orderTotal(o),0);
      days.push({rev, label:['রবি','সোম','মঙ্গ','বুধ','বৃহ','শুক্র','শনি'][d.getDay()], isToday:i===0});
    }
    const max = Math.max(...days.map(d=>d.rev),1);
    chartEl.innerHTML = days.map(d=>{
      const pct = Math.max((d.rev/max)*100, d.rev>0?8:2);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="width:100%;height:${pct}%;border-radius:4px 4px 0 0;background:${d.isToday?'var(--rose)':'rgba(240,53,107,.25)'};min-height:3px"></div>
      </div>`;
    }).join('');
    if(labelsEl) labelsEl.innerHTML = days.map(d=>`<div style="flex:1;text-align:center;font-size:9.5px;color:${d.isToday?'var(--rose)':'var(--ink-muted)'}">${d.label}</div>`).join('');
  },

  renderPayBreakdown(orders){
    const el = document.getElementById('finPayBreakdown');
    if(!el) return;
    const total = orders.reduce((s,o)=>s+this.orderTotal(o),0);
    const methods = {};
    orders.forEach(o=>{ const pm=o.paymentMethod||'cod'; methods[pm]=(methods[pm]||0)+this.orderTotal(o); });
    const labels = { cod:'💰 COD', bkash:'📱 bKash', nagad:'📱 Nagad' };
    el.innerHTML = Object.entries(methods).map(([m,v])=>{
      const pct = total>0 ? Math.round(v/total*100) : 0;
      return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>${labels[m]||m}</span><span style="color:var(--rose);font-weight:600">${money(v)} (${pct}%)</span></div>
      <div style="height:6px;border-radius:3px;background:rgba(0,0,0,.06)"><div style="height:100%;width:${pct}%;border-radius:3px;background:var(--rose)"></div></div></div>`;
    }).join('') || '<p style="font-size:12px;color:var(--ink-muted)">কোনো ডেটা নেই</p>';
  },

  // ---------- Refunds ----------
  async loadRefunds(){
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'refund_requests'), FB.orderBy('createdAt','desc'), FB.limit(100)));
      this._refunds = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    }catch(e){ this._refunds = []; }
  },

  renderRefunds(){
    const pending = this._refunds.filter(r=>r.status==='pending');
    const tag = document.getElementById('finRefundPendingTag');
    if(tag) tag.textContent = pending.length ? `⏳ ${bn(pending.length)}টি পেন্ডিং` : 'কোনো পেন্ডিং নেই ✓';

    const tbody = document.getElementById('finRefundTable');
    if(!tbody) return;
    tbody.innerHTML = this._refunds.map(r=>`
      <tr>
        <td style="font-size:11.5px">${esc(r.orderNumber||r.orderId||'—')}</td>
        <td>${esc(r.customerName||'—')}</td>
        <td style="color:var(--rose);font-weight:600">${money(r.amount||0)}</td>
        <td style="font-size:11.5px;max-width:180px">${esc(r.reason||'—')}</td>
        <td style="font-size:11px;color:var(--ink-muted)">${formatTime(r.createdAt)}</td>
        <td><span style="font-size:12px;font-weight:600;color:${r.status==='pending'?'#d4930c':r.status==='approved'?'#22c55e':'#f87171'}">${r.status==='pending'?'⏳ পেন্ডিং':r.status==='approved'?'✅ অনুমোদিত':'❌ বাতিল'}</span></td>
        <td>${r.status==='pending' ? `
          <div style="display:flex;gap:6px">
            <button class="btn btn-gold" style="padding:5px 10px;font-size:11px" onclick="FinanceDash.resolveRefund('${r.id}','approved')">অনুমোদন</button>
            <button class="btn btn-outline" style="padding:5px 10px;font-size:11px" onclick="FinanceDash.resolveRefund('${r.id}','rejected')">বাতিল</button>
          </div>` : '—'}</td>
      </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:16px">কোনো রিফান্ড রিকোয়েস্ট নেই</td></tr>';
  },

  async resolveRefund(id, status){
    if(!FB) return;
    try{
      await FB.updateDoc(FB.doc(FB.db,'refund_requests',id), {
        status, resolvedBy:this.currentName, resolvedByUid:this.currentUid, resolvedAt:FB.serverTimestamp()
      });
      const r = this._refunds.find(x=>x.id===id); if(r) r.status=status;
      toast(status==='approved' ? '✓ রিফান্ড অনুমোদিত হয়েছে' : '✓ রিফান্ড বাতিল করা হয়েছে','success');
      this.renderRefunds();
      this.renderOverview();
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  // ---------- Zone Breakdown ----------
  renderZoneBreakdown(){
    const tbody = document.getElementById('finZoneTable');
    if(!tbody) return;
    const active = this._orders.filter(o=>o.status!=='cancelled');
    const zones = Object.keys(BRANCH_INFO);
    tbody.innerHTML = zones.map(z=>{
      const zo = active.filter(o=>o.branchZone===z);
      const revenue = zo.reduce((s,o)=>s+this.orderTotal(o),0);
      const cod = zo.filter(o=>o.paymentMethod==='cod').reduce((s,o)=>s+this.orderTotal(o),0);
      const online = revenue - cod;
      const refundPending = this._refunds.filter(r=>r.zone===z && r.status==='pending').length;
      return `<tr>
        <td>${esc(BRANCH_INFO[z].label)}</td>
        <td style="color:var(--rose);font-weight:600">${money(revenue)}</td>
        <td>${money(cod)}</td>
        <td>${money(online)}</td>
        <td style="color:${refundPending>0?'#f87171':'inherit'}">${bn(refundPending)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-muted);padding:16px">কোনো শাখা নেই</td></tr>';
  },

  // ---------- COD by Zone ----------
  renderCodByZone(){
    const tbody = document.getElementById('finCodTable');
    if(!tbody) return;
    const zones = Object.keys(BRANCH_INFO);
    tbody.innerHTML = zones.map(z=>{
      const zo = this._orders.filter(o=>o.branchZone===z && o.paymentMethod==='cod' && o.status==='delivered');
      const collected = zo.reduce((s,o)=>s+this.orderTotal(o),0);
      const deposited = zo.filter(o=>o.codDeposited).reduce((s,o)=>s+this.orderTotal(o),0);
      const pending = collected - deposited;
      const complete = pending<=0 && collected>0;
      return `<tr>
        <td>${esc(BRANCH_INFO[z].label)}</td>
        <td>${money(collected)}</td>
        <td style="color:#22c55e">${money(deposited)}</td>
        <td style="color:${pending>0?'#f87171':'inherit'}">${money(pending)}</td>
        <td>${complete ? '<span style="color:#22c55e;font-weight:600">✅ সম্পূর্ণ</span>' : '<span style="color:#d4930c;font-weight:600">⏳ বাকি আছে</span>'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-muted);padding:16px">কোনো শাখা নেই</td></tr>';
  }
};