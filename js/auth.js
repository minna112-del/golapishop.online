/* auth.js — Firebase Auth + login/register modal */
/* ---------- Auth ---------- */
const Auth = {
  currentUser:null,
  init(){
    FB.onAuthStateChanged(FB.auth, user=>{
      this.currentUser = user;
      document.getElementById('accLabel').textContent = user ? (user.displayName||'অ্যাকাউন্ট').split(' ')[0] : 'লগইন';
    });
  }
};
const AuthUI = {
  open(){ document.getElementById('authModal').classList.add('show'); },
  close(){ document.getElementById('authModal').classList.remove('show'); this.clearMsg(); },
  switchTab(tab){
    document.getElementById('tabLogin').style.color = tab==='login'?'var(--gold)':'var(--ink-muted)';
    document.getElementById('tabLogin').style.borderColor = tab==='login'?'var(--gold)':'transparent';
    document.getElementById('tabRegister').style.color = tab==='register'?'var(--gold)':'var(--ink-muted)';
    document.getElementById('tabRegister').style.borderColor = tab==='register'?'var(--gold)':'transparent';
    document.getElementById('loginForm').style.display = tab==='login'?'block':'none';
    document.getElementById('registerForm').style.display = tab==='register'?'block':'none';
    this.clearMsg();
  },
  showMsg(msg,type){ const el=document.getElementById('authMsg'); el.textContent=msg; el.className='form-msg '+type; },
  clearMsg(){ document.getElementById('authMsg').className='form-msg'; },
  async login(){
    const email=document.getElementById('loginEmail').value.trim();
    const pass=document.getElementById('loginPass').value;
    if(!email||!pass){ this.showMsg('ইমেইল ও পাসওয়ার্ড দিন','err'); return; }
    if(!FB){ this.showMsg('সংযোগ সমস্যা','err'); return; }
    try{ await FB.signInWithEmailAndPassword(FB.auth,email,pass); this.showMsg('✓ লগইন সফল','ok'); setTimeout(()=>this.close(),700); }
    catch(e){ this.showMsg('লগইন ব্যর্থ: '+e.message,'err'); }
  },
  async register(){
    const name=document.getElementById('regName').value.trim();
    const email=document.getElementById('regEmail').value.trim();
    const phone=document.getElementById('regPhone').value.trim();
    const pass=document.getElementById('regPass').value;
    if(!name||!email||!phone||!pass){ this.showMsg('সব তথ্য পূরণ করুন','err'); return; }
    const phoneRe=/^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRe.test(phone.replace(/[\s-]/g,''))){ this.showMsg('সঠিক মোবাইল নম্বর দিন','err'); return; }
    if(!FB){ this.showMsg('সংযোগ সমস্যা','err'); return; }
    try{
      const cred = await FB.createUserWithEmailAndPassword(FB.auth,email,pass);
      await FB.updateProfile(cred.user,{displayName:name});
      await FB.setDoc(FB.doc(FB.db,'users',cred.user.uid),{name,email,phone,role:'customer',createdAt:FB.serverTimestamp()});
      this.showMsg('✓ রেজিস্ট্রেশন সফল','ok'); setTimeout(()=>this.close(),700);
    }catch(e){ this.showMsg('রেজিস্ট্রেশন ব্যর্থ: '+e.message,'err'); }
  }
};

/* ---------- Account / Profile page (Temu-style settings) ---------- */
const AccountPage = {
  openOrLogin(){ Auth.currentUser ? Router.go('account') : AuthUI.open(); },
  render(){
    const u = Auth.currentUser;
    document.getElementById('accName').textContent = u ? (u.displayName||'কাস্টমার') : 'অতিথি';
    document.getElementById('accEmail').textContent = u ? (u.email||'') : '';
    document.getElementById('accAvatar').textContent = u ? (u.displayName||'ক')[0] : '👤';
  },
  requestNotifications(){
    if(!('Notification' in window)){ toast('এই ব্রাউজারে নোটিফিকেশন সাপোর্ট নেই','error'); return; }
    Notification.requestPermission().then(p=>{ toast(p==='granted' ? '✓ নোটিফিকেশন চালু হয়েছে' : 'অনুমতি দেওয়া হয়নি', p==='granted'?'success':'error'); });
  },
  async signOut(){
    if(!FB) return;
    try{ await FB.signOut(FB.auth); toast('✓ লগআউট হয়েছে','success'); Router.go('home'); }
    catch(e){ toast('লগআউট ব্যর্থ','error'); }
  },
  /* ---- Saved addresses (stored at users/{uid}.addresses = [{label,district,zone,village,address}]) ---- */
  async renderAddresses(){
    const list = document.getElementById('addressList');
    if(!Auth.currentUser){ list.innerHTML = `<div class="empty-state"><div class="em">🔒</div><h3>লগইন করুন</h3><button class="btn btn-gold" onclick="AuthUI.open()">লগইন করুন</button></div>`; return; }
    if(!FB){ list.innerHTML = `<p style="color:var(--ink-muted)">সংযোগ সমস্যা</p>`; return; }
    list.innerHTML = `<p style="color:var(--ink-muted);padding:10px 0">লোড হচ্ছে...</p>`;
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'users',Auth.currentUser.uid));
      const addrs = snap.exists() ? (snap.data().addresses||[]) : [];
      if(!addrs.length){ list.innerHTML = `<div class="empty-state"><div class="em">📍</div><h3>কোনো ঠিকানা সংরক্ষিত নেই</h3></div>`; return; }
      list.innerHTML = addrs.map((a,i)=>`<div class="card-box">
        <div style="display:flex;justify-content:space-between"><strong style="color:#fff">${a.label||'ঠিকানা'}</strong><button onclick="AccountPage.deleteAddress(${i})" style="color:#f87171;font-size:12px">মুছুন</button></div>
        <div style="font-size:12.5px;color:var(--ink-muted);margin-top:4px">${a.village?a.village+', ':''}${AREA_LABELS[a.district]||''} — ${a.address||''}</div>
      </div>`).join('');
    }catch(e){ list.innerHTML = `<p style="color:var(--ink-muted)">লোড করা যায়নি</p>`; }
  },
  openAddAddress(){
    ['addrLabel','addrVillage','addrFull'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('addrDistrict').value=''; document.getElementById('addrZone').innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    document.getElementById('addressMsg').className='form-msg';
    document.getElementById('addressModal').classList.add('show');
  },
  closeAddAddress(){ document.getElementById('addressModal').classList.remove('show'); },
  async saveAddress(){
    const msgEl = document.getElementById('addressMsg');
    if(!Auth.currentUser){ msgEl.textContent='লগইন করুন'; msgEl.className='form-msg err'; return; }
    const addr = {
      label: document.getElementById('addrLabel').value.trim()||'ঠিকানা',
      district: document.getElementById('addrDistrict').value,
      zone: document.getElementById('addrZone').value,
      village: document.getElementById('addrVillage').value.trim(),
      address: document.getElementById('addrFull').value.trim()
    };
    if(!addr.district || !addr.address){ msgEl.textContent='উপজেলা ও ঠিকানা দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const ref = FB.doc(FB.db,'users',Auth.currentUser.uid);
      const snap = await FB.getDoc(ref);
      const addrs = snap.exists() ? (snap.data().addresses||[]) : [];
      addrs.push(addr);
      await FB.setDoc(ref, {addresses:addrs}, {merge:true});
      toast('✓ ঠিকানা সংরক্ষণ করা হয়েছে','success');
      this.closeAddAddress(); this.renderAddresses();
    }catch(e){ msgEl.textContent='সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  },
  async deleteAddress(idx){
    if(!FB || !Auth.currentUser) return;
    try{
      const ref = FB.doc(FB.db,'users',Auth.currentUser.uid);
      const snap = await FB.getDoc(ref);
      const addrs = snap.exists() ? (snap.data().addresses||[]) : [];
      addrs.splice(idx,1);
      await FB.setDoc(ref, {addresses:addrs}, {merge:true});
      this.renderAddresses();
    }catch(e){ toast('মুছা যায়নি','error'); }
  }
};

/* ---------- Order editing — allowed only before driver pickup ---------- */
const OrderEdit = {
  orderId:null,
  isEditable(status){ return ['pending','confirmed','packed','assigned'].includes(status); },
  open(orderId, o){
    this.orderId = orderId;
    document.getElementById('eoVillage').value = o.village||'';
    document.getElementById('eoAddress').value = o.address||'';
    document.getElementById('eoInstructions').value = o.instructions||'';
    document.getElementById('editOrderMsg').className='form-msg';
    document.getElementById('editOrderModal').classList.add('show');
  },
  close(){ document.getElementById('editOrderModal').classList.remove('show'); },
  async save(){
    const msgEl = document.getElementById('editOrderMsg');
    const village = document.getElementById('eoVillage').value.trim();
    const address = document.getElementById('eoAddress').value.trim();
    const instructions = document.getElementById('eoInstructions').value.trim();
    if(!address || !instructions){ msgEl.textContent='ঠিকানা ও ইনস্ট্রাকশন দুটোই দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      await FB.updateDoc(FB.doc(FB.db,'orders',this.orderId), {village, address, instructions});
      toast('✓ অর্ডার তথ্য আপডেট হয়েছে','success');
      this.close(); MyOrders.render();
    }catch(e){ msgEl.textContent='সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  }
};