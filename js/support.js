/* support.js — SupportDash (Firebase Auth secured, zone-manager.js প্যাটার্ন অনুসরণ করে) */
const SupportDash = {
  currentUid: null, currentName: null,
  _tickets: [], _selectedId: null, _orders: [],

  async login(){
    const email = document.getElementById('supEmail').value.trim();
    const pass = document.getElementById('supPassword').value;
    const msgEl = document.getElementById('supLoginMsg');
    if(!email || !pass){ msgEl.textContent='ইমেইল ও পাসওয়ার্ড দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const cred = await FB.signInWithEmailAndPassword(FB.auth, email, pass);
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',cred.user.uid));
      if(!staffSnap.exists() || staffSnap.data().role!=='support'){
        await FB.signOut(FB.auth).catch(()=>{});
        msgEl.textContent='এই অ্যাকাউন্ট সাপোর্ট এজেন্ট হিসেবে অনুমোদিত নয়'; msgEl.className='form-msg err'; return;
      }
      this.currentUid = cred.user.uid;
      this.currentName = staffSnap.data().name || 'সাপোর্ট এজেন্ট';
      if(typeof StaffChat !== 'undefined') StaffChat.init(this.currentUid, this.currentName, 'support');
      document.getElementById('supLoginBox').style.display='none';
      document.getElementById('supDashBox').style.display='block';
    if(typeof EmployeeWorkspace!=='undefined') await EmployeeWorkspace.mountCurrent('supEmployeeWorkspace');
      const ml=document.getElementById('supUserLabel'); if(ml) ml.textContent='পরিচালনায়: '+this.currentName;
      await this.render();
    }catch(e){ msgEl.textContent='লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়'; msgEl.className='form-msg err'; }
  },

  async logout(){
    if(FB) await FB.signOut(FB.auth).catch(()=>{});
    this.currentUid=null; this.currentName=null;
    document.getElementById('supLoginBox').style.display='block';
    document.getElementById('supDashBox').style.display='none';
  },

  async _restoreSession(){
    if(this.currentUid || !FB || !FB.auth.currentUser) return;
    try{
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',FB.auth.currentUser.uid));
      if(staffSnap.exists() && staffSnap.data().role==='support'){
        this.currentUid = FB.auth.currentUser.uid;
        this.currentName = staffSnap.data().name || 'সাপোর্ট এজেন্ট';
        if(typeof StaffChat !== 'undefined') StaffChat.init(this.currentUid, this.currentName, 'support');
      }
    }catch(e){ devWarn('support session restore failed', e.message); }
  },

  async render(){
    await this._restoreSession();
    if(!this.currentUid){
      document.getElementById('supLoginBox').style.display='block';
      document.getElementById('supDashBox').style.display='none';
      return;
    }
    document.getElementById('supLoginBox').style.display='none';
    document.getElementById('supDashBox').style.display='block';
    const ml=document.getElementById('supUserLabel'); if(ml) ml.textContent='পরিচালনায়: '+this.currentName;

    await this.loadTickets();
    this.renderStats();
    this.renderTicketList();
  },

  async refresh(){ await this.render(); toast('✓ আপডেট হয়েছে','success'); },

  tab(btn,name){
    ['tickets','newticket'].forEach(t=>{
      const el=document.getElementById('sup'+t.charAt(0).toUpperCase()+t.slice(1)+'Pane');
      if(el) el.style.display=t===name?'block':'none';
    });
    document.querySelectorAll('#page-support-dash .zm-tabs button').forEach(a=>a.classList.remove('active'));
    if(btn) btn.classList.add('active');
  },

  // ---------- Tickets ----------
  async loadTickets(){
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'support_tickets'), FB.orderBy('updatedAt','desc'), FB.limit(150)));
      this._tickets = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    }catch(e){ this._tickets = []; devWarn('tickets load failed', e.message); }
  },

  renderStats(){
    const open = this._tickets.filter(t=>t.status==='open').length;
    const pending = this._tickets.filter(t=>t.status==='open' || t.status==='in_progress').length;
    const escalated = this._tickets.filter(t=>t.status==='escalated').length;
    const todayStr = new Date().toDateString();
    const resolvedToday = this._tickets.filter(t=>t.status==='resolved' && t.resolvedAt?.seconds && new Date(t.resolvedAt.seconds*1000).toDateString()===todayStr).length;
    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('supStatOpen', bn(open));
    set('supStatPending', bn(pending));
    set('supStatResolvedToday', bn(resolvedToday));
    set('supStatEscalated', bn(escalated));
  },

  renderTicketList(){
    const q = (document.getElementById('supTicketSearch')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('supStatusFilter')?.value || '';
    let list = this._tickets.filter(t=>{
      if(statusFilter && t.status!==statusFilter) return false;
      if(q && !( (t.customerName||'').toLowerCase().includes(q) || (t.customerPhone||'').includes(q) || (t.orderId||'').toLowerCase().includes(q) )) return false;
      return true;
    });
    const tbody = document.getElementById('supTicketList');
    if(!tbody) return;
    const priorityColor = { urgent:'#f87171', high:'#d4930c', normal:'var(--ink-muted)' };
    const statusLabel = { open:'ওপেন', in_progress:'প্রসেসিং', resolved:'সমাধান হয়েছে', escalated:'এস্কেলেটেড' };
    const statusColor = { open:'#d4930c', in_progress:'#0ea5e9', resolved:'#22c55e', escalated:'#f87171' };
    tbody.innerHTML = list.map(t=>`
      <tr onclick="SupportDash.openTicket('${t.id}')" style="cursor:pointer;${this._selectedId===t.id?'background:rgba(240,53,107,.06)':''}">
        <td><div style="font-size:12.5px;font-weight:600">${esc(t.customerName||'—')}</div><div style="font-size:10.5px;color:var(--ink-muted)">${esc(t.customerPhone||'—')}</div></td>
        <td style="font-size:11.5px;max-width:150px">${esc(this.issueLabel(t.issueType))}</td>
        <td><span style="font-size:11px;font-weight:700;color:${priorityColor[t.priority]||priorityColor.normal}">${t.priority==='urgent'?'🔴 অতি জরুরি':t.priority==='high'?'🟠 জরুরি':'⚪ সাধারণ'}</span></td>
        <td><span style="font-size:11.5px;font-weight:600;color:${statusColor[t.status]||'inherit'}">${statusLabel[t.status]||t.status}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--ink-muted);padding:16px">কোনো টিকেট নেই</td></tr>';
  },

  filterTickets(){ this.renderTicketList(); },

  issueLabel(type){
    const map = { delivery_delay:'ডেলিভারি বিলম্ব', damaged:'পণ্য ক্ষতিগ্রস্ত', wrong_item:'ভুল পণ্য', refund:'রিফান্ড অনুরোধ', payment_issue:'পেমেন্ট সমস্যা', other:'অন্যান্য' };
    return map[type] || type || '—';
  },

  async openTicket(id){
    this._selectedId = id;
    this.renderTicketList();
    const t = this._tickets.find(x=>x.id===id); if(!t) return;
    const box = document.getElementById('supDetailBox'); if(box) box.style.display='block';

    const header = document.getElementById('supDetailHeader');
    if(header){
      header.innerHTML = `
        <h2 style="font-size:15px;margin:0 0 4px">${esc(t.customerName||'—')} <small style="color:var(--ink-muted);font-weight:400">${esc(t.customerPhone||'')}</small></h2>
        <div style="font-size:12px;color:var(--ink-muted)">${esc(this.issueLabel(t.issueType))} ${t.orderId?' · অর্ডার: '+esc(t.orderId):''}</div>`;
    }

    const su = document.getElementById('supStatusUpdate'); if(su) su.value = ['open','in_progress','resolved'].includes(t.status) ? t.status : 'open';

    // Order context lookup
    const ctxBox = document.getElementById('supOrderContext');
    if(ctxBox){
      if(t.orderId){
        try{
          const orderSnap = await FB.getDoc(FB.doc(FB.db,'orders',t.orderId));
          if(orderSnap.exists()){
            const o = orderSnap.data();
            const s = ORDER_STATUS[o.status]||ORDER_STATUS.pending;
            ctxBox.style.display='block';
            ctxBox.innerHTML = `<h2 style="font-size:13px;margin-bottom:6px">🧾 অর্ডার প্রসঙ্গ</h2>
              <div style="font-size:12.5px;line-height:1.7">
                মোট: <strong>${money(Number(o.total||o.subtotal||0))}</strong> · স্ট্যাটাস: <strong>${s.label}</strong><br>
                শাখা: ${BRANCH_INFO[o.branchZone]?.label||o.branchZone||'—'} · পেমেন্ট: ${o.paymentMethod==='cod'?'COD':(o.paymentMethod||'—')}
              </div>`;
          } else { ctxBox.style.display='none'; }
        }catch(e){ ctxBox.style.display='none'; }
      } else { ctxBox.style.display='none'; }
    }

    this.renderConversation(t);
    const refundForm = document.getElementById('supRefundForm'); if(refundForm) refundForm.style.display='none';
  },

  renderConversation(t){
    const box = document.getElementById('supConversation');
    if(!box) return;
    const messages = t.messages || [{ sender:'customer', text:t.message||'—', at:t.createdAt }];
    box.innerHTML = messages.map(m=>`
      <div style="align-self:${m.sender==='agent'?'flex-end':'flex-start'};max-width:80%;background:${m.sender==='agent'?'var(--rose)':'var(--bg2)'};color:${m.sender==='agent'?'#fff':'var(--ink)'};padding:8px 12px;border-radius:12px;font-size:12.5px">
        ${esc(m.text)}
        <div style="font-size:9.5px;opacity:.7;margin-top:3px">${formatTime(m.at)}</div>
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
  },

  async sendReply(){
    const t = this._tickets.find(x=>x.id===this._selectedId); if(!t || !FB) return;
    const textEl = document.getElementById('supReplyText');
    const text = textEl?.value.trim();
    if(!text) return;
    const newMsg = { sender:'agent', text, at: new Date() };
    try{
      const messages = [...(t.messages||[{sender:'customer',text:t.message||'—',at:t.createdAt}]), { sender:'agent', text, at: FB.serverTimestamp() }];
      await FB.updateDoc(FB.doc(FB.db,'support_tickets',t.id), { messages, updatedAt: FB.serverTimestamp(), status: t.status==='open' ? 'in_progress' : t.status });
      t.messages = [...(t.messages||[{sender:'customer',text:t.message||'—',at:t.createdAt}]), newMsg];
      if(t.status==='open') t.status='in_progress';
      textEl.value='';
      this.renderConversation(t);
      this.renderTicketList();
      this.renderStats();
      toast('✓ উত্তর পাঠানো হয়েছে','success');
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  async updateStatus(status){
    const t = this._tickets.find(x=>x.id===this._selectedId); if(!t || !FB) return;
    try{
      const update = { status, updatedAt:FB.serverTimestamp() };
      if(status==='resolved') update.resolvedAt = FB.serverTimestamp();
      await FB.updateDoc(FB.doc(FB.db,'support_tickets',t.id), update);
      t.status = status;
      toast('✓ স্ট্যাটাস আপডেট হয়েছে','success');
      this.renderTicketList();
      this.renderStats();
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  async escalate(){
    const t = this._tickets.find(x=>x.id===this._selectedId); if(!t || !FB) return;
    if(!confirm('এই টিকেটটি Owner/Zone Manager-এর কাছে এস্কেলেট করতে চান?')) return;
    try{
      await FB.addDoc(FB.collection(FB.db,'escalations'), {
        ticketId:t.id, orderId:t.orderId||null, orderNumber:t.orderId||'—',
        zone: t.branchZone || null,
        customerName:t.customerName||'—', customerPhone:t.customerPhone||'—',
        note:`সাপোর্ট টিকেট এস্কেলেশন: ${this.issueLabel(t.issueType)}`,
        status:'open', raisedBy:'support', raisedByUid:this.currentUid,
        createdAt: FB.serverTimestamp()
      });
      await FB.updateDoc(FB.doc(FB.db,'support_tickets',t.id), { status:'escalated', updatedAt:FB.serverTimestamp() });
      t.status='escalated';
      toast('✓ Owner/Zone Manager-কে জানানো হয়েছে','success');
      this.renderTicketList();
      this.renderStats();
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  openRefundForm(){
    const form = document.getElementById('supRefundForm');
    if(form) form.style.display = form.style.display==='none' ? 'block' : 'none';
  },

  async submitRefund(){
    const t = this._tickets.find(x=>x.id===this._selectedId); if(!t || !FB) return;
    const amount = Number(document.getElementById('supRefundAmount')?.value);
    const reason = document.getElementById('supRefundReason')?.value.trim();
    if(!amount || amount<=0){ toast('সঠিক পরিমাণ দিন','error'); return; }
    if(!reason){ toast('কারণ লিখুন','error'); return; }
    try{
      await FB.addDoc(FB.collection(FB.db,'refund_requests'), {
        orderId:t.orderId||null, orderNumber:t.orderId||'—',
        customerName:t.customerName||'—', customerPhone:t.customerPhone||'—',
        zone: t.branchZone || null,
        amount, reason, status:'pending',
        requestedBy:'support', requestedByUid:this.currentUid,
        ticketId:t.id, createdAt: FB.serverTimestamp()
      });
      toast('✓ রিফান্ড রিকোয়েস্ট Finance টিমের কাছে পাঠানো হয়েছে','success');
      document.getElementById('supRefundForm').style.display='none';
      document.getElementById('supRefundAmount').value='';
      document.getElementById('supRefundReason').value='';
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  // ---------- New Ticket ----------
  async createTicket(){
    const msgEl = document.getElementById('supNewMsg');
    const name = document.getElementById('ntName')?.value.trim();
    const phone = document.getElementById('ntPhone')?.value.trim();
    const orderId = document.getElementById('ntOrderId')?.value.trim();
    const issueType = document.getElementById('ntIssueType')?.value;
    const priority = document.getElementById('ntPriority')?.value;
    const message = document.getElementById('ntMessage')?.value.trim();
    if(!name || !phone || !message){ msgEl.textContent='* চিহ্নিত সব ঘর পূরণ করুন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      await FB.addDoc(FB.collection(FB.db,'support_tickets'), {
        customerName:name, customerPhone:phone, orderId:orderId||null,
        issueType, priority, message, status:'open',
        messages:[{ sender:'customer', text:message, at: FB.serverTimestamp() }],
        createdBy:this.currentName, createdByUid:this.currentUid,
        createdAt: FB.serverTimestamp(), updatedAt: FB.serverTimestamp()
      });
      msgEl.textContent='✓ টিকেট তৈরি হয়েছে'; msgEl.className='form-msg ok';
      ['ntName','ntPhone','ntOrderId','ntMessage'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
      await this.loadTickets();
      this.renderStats();
      this.renderTicketList();
      setTimeout(()=>{ this.tab(document.querySelector('#page-support-dash .zm-tabs button'), 'tickets'); }, 700);
    }catch(e){ msgEl.textContent='সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  }
};
