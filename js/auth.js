/* auth.js — Firebase Auth + login/register modal + Account page + Order editing + Wishlist page + Refund */
const Auth = {
  currentUser:null,
  init(){
    FB.onAuthStateChanged(FB.auth, user=>{
      this.currentUser = user;
      const labelEl = document.getElementById('accLabel');
      if(labelEl) labelEl.textContent = user ? (user.displayName||'অ্যাকাউন্ট').split(' ')[0] : 'লগইন';
    });
  }
};
const AuthUI = {
  open(){
    document.getElementById('authModal').classList.add('show');
    /* URL-এ ?ref=CODE থাকলে রেফারেল ফিল্ড প্রি-ফিল করা */
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const refInput = document.getElementById('regReferralCode');
    if(ref && refInput) refInput.value = ref.toUpperCase();
  },
  close(){ document.getElementById('authModal').classList.remove('show'); this.clearMsg(); },
  switchTab(tab){
    ['phone','login','register'].forEach(t=>{
      const btn = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
      if(btn){ btn.style.color = t===tab?'var(--gold)':'var(--ink-muted)'; btn.style.borderColor = t===tab?'var(--gold)':'transparent'; }
    });
    document.getElementById('phoneForm').style.display = tab==='phone'?'block':'none';
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
    const referralCodeInput = (document.getElementById('regReferralCode')?.value||'').trim().toUpperCase();
    if(!name||!email||!phone||!pass){ this.showMsg('সব তথ্য পূরণ করুন','err'); return; }
    const phoneRe=/^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRe.test(phone.replace(/[\s-]/g,''))){ this.showMsg('সঠিক মোবাইল নম্বর দিন','err'); return; }
    if(!FB){ this.showMsg('সংযোগ সমস্যা','err'); return; }
    try{
      const cred = await FB.createUserWithEmailAndPassword(FB.auth,email,pass);
      await FB.updateProfile(cred.user,{displayName:name});
      const myReferralCode = cred.user.uid.slice(0,6).toUpperCase();

      let referredBy = null;
      if(referralCodeInput){
        try{
          const q = FB.query(FB.collection(FB.db,'users'), FB.where('referralCode','==',referralCodeInput), FB.limit(1));
          const snap = await FB.getDocs(q);
          if(!snap.empty){ referredBy = snap.docs[0].id; }
        }catch(e){ devWarn('referral lookup failed', e.message); }
      }

      await FB.setDoc(FB.doc(FB.db,'users',cred.user.uid),{
        name, email, phone, role:'customer', createdAt:FB.serverTimestamp(),
        referralCode: myReferralCode, referredBy, referralBonusGiven:false, walletBalance:0
      });
      this.showMsg('✓ রেজিস্ট্রেশন সফল','ok'); setTimeout(()=>this.close(),700);
    }catch(e){ this.showMsg('রেজিস্ট্রেশন ব্যর্থ: '+e.message,'err'); }
  }
};

/* ---------- Account / Profile page ---------- */
const AccountPage = {
  openOrLogin(){ Auth.currentUser ? Router.go('account') : AuthUI.open(); },
  render(){
    const u = Auth.currentUser;
    const nameEl=document.getElementById('accName'); if(nameEl) nameEl.textContent = u ? (u.displayName||'কাস্টমার') : 'অতিথি';
    const emailEl=document.getElementById('accEmail'); if(emailEl) emailEl.textContent = u ? (u.email||u.phoneNumber||'') : '';
    const avatarEl=document.getElementById('accAvatar'); if(avatarEl) avatarEl.textContent = u ? (u.displayName||'ক')[0] : '👤';
    this.renderLoyalty();
  },
  async renderLoyalty(){
    const box = document.getElementById('loyaltyBox');
    if(!box) return;
    if(!Auth.currentUser || !FB){ box.style.display='none'; return; }
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'users',Auth.currentUser.uid));
      if(!snap.exists()){ box.style.display='none'; return; }
      const u = snap.data();
      box.style.display='block';
      const codeEl = document.getElementById('loyaltyCode'); if(codeEl) codeEl.textContent = u.referralCode||'—';
      const balEl = document.getElementById('loyaltyBalance'); if(balEl) balEl.textContent = money(u.walletBalance||0);
    }catch(e){ box.style.display='none'; }
  },
  shareReferral(){
    const code = document.getElementById('loyaltyCode')?.textContent||'';
    if(!code || code==='—') return;
    const link = `https://www.golapishop.online/?ref=${code}`;
    if(navigator.share){
      navigator.share({ title:'Golapi Shop Online', text:`আমার রেফারেল কোড ব্যবহার করে রেজিস্ট্রেশন করলে আপনিও পাবেন ২০৳ বোনাস! কোড: ${code}`, url: link });
    } else {
      navigator.clipboard?.writeText(link);
      toast('✓ রেফারেল লিংক কপি হয়েছে','success');
    }
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

/* ---------- Cancel Order ---------- */
const CancelOrder = {
  orderId:null,
  open(orderId){
    this.orderId = orderId;
    document.getElementById('cancelReason').value='';
    document.getElementById('cancelOrderMsg').className='form-msg';
    document.getElementById('cancelOrderModal').classList.add('show');
  },
  close(){ document.getElementById('cancelOrderModal').classList.remove('show'); },
  async confirm(){
    const msgEl = document.getElementById('cancelOrderMsg');
    const reason = document.getElementById('cancelReason').value.trim();
    if(!reason){ msgEl.textContent='বাতিলের কারণ লিখুন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      await FB.updateDoc(FB.doc(FB.db,'orders',this.orderId),{
        status:'cancelled', cancelReason:reason, cancelledAt:FB.serverTimestamp()
      });
      toast('✓ অর্ডার বাতিল করা হয়েছে','success');
      this.close(); MyOrders.render();
    }catch(e){ msgEl.textContent='বাতিল ব্যর্থ: '+e.message; msgEl.className='form-msg err'; }
  }
};

/* ---------- Refund Request ---------- */
const RefundRequest = {
  orderId:null,
  open(orderId){
    this.orderId = orderId;
    document.getElementById('refundReason').value='';
    document.getElementById('refundMsg').className='form-msg';
    document.getElementById('refundModal').classList.add('show');
  },
  close(){ document.getElementById('refundModal').classList.remove('show'); },
  async submit(){
    const msgEl = document.getElementById('refundMsg');
    const reason = document.getElementById('refundReason').value.trim();
    if(!reason){ msgEl.textContent='রিফান্ডের কারণ লিখুন'; msgEl.className='form-msg err'; return; }
    const ok = await RefundService.requestRefund(this.orderId, reason);
    if(ok){ this.close(); MyOrders.render(); }
  }
};
/* ---------- Phone OTP Authentication ---------- */
const PhoneAuth = {
  confirmationResult:null, recaptchaVerifier:null,

  ensureRecaptcha(){
    if(!FB || this.recaptchaVerifier) return;
    this.recaptchaVerifier = new FB.RecaptchaVerifier(FB.auth, 'recaptcha-container', {
      size:'invisible'
    });
  },

  async sendOtp(){
    const raw = document.getElementById('phoneNumber').value.trim();
    const msgEl = document.getElementById('authMsg');
    const phoneRe = /^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRe.test(raw.replace(/[\s-]/g,''))){ AuthUI.showMsg('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)','err'); return; }
    if(!FB){ AuthUI.showMsg('সংযোগ সমস্যা','err'); return; }
    let digits = raw.replace(/[\s-]/g,'');
    if(digits.startsWith('0')) digits = digits.slice(1);
    if(digits.startsWith('880')) digits = digits.slice(3);
    const e164 = '+880' + digits;

    const btn = document.getElementById('sendOtpBtn');
    const orig = btn.textContent; btn.textContent = 'পাঠানো হচ্ছে...'; btn.disabled = true;
    try{
      this.ensureRecaptcha();
      this.confirmationResult = await FB.signInWithPhoneNumber(FB.auth, e164, this.recaptchaVerifier);
      document.getElementById('otpSentTo').textContent = raw;
      document.getElementById('phoneStep1').style.display='none';
      document.getElementById('phoneStep2').style.display='block';
      AuthUI.showMsg('✓ OTP পাঠানো হয়েছে','ok');
    }catch(e){
      devWarn('OTP send failed', e.message);
      AuthUI.showMsg('OTP পাঠানো ব্যর্থ: '+ (e.code==='auth/too-many-requests' ? 'অনেকবার চেষ্টা হয়েছে, একটু পর আবার চেষ্টা করুন' : e.message), 'err');
      if(this.recaptchaVerifier){ this.recaptchaVerifier.clear(); this.recaptchaVerifier = null; }
    }finally{ btn.textContent = orig; btn.disabled = false; }
  },

  async verifyOtp(){
    const code = document.getElementById('otpCode').value.trim();
    if(!code || code.length!==6){ AuthUI.showMsg('৬ সংখ্যার সঠিক OTP দিন','err'); return; }
    if(!this.confirmationResult){ AuthUI.showMsg('আগে OTP পাঠান','err'); return; }
    try{
      const cred = await this.confirmationResult.confirm(code);
      const uid = cred.user.uid;
      const userRef = FB.doc(FB.db,'users',uid);
      const snap = await FB.getDoc(userRef);
      if(!snap.exists()){
        await FB.setDoc(userRef, {
          phone: cred.user.phoneNumber, name:'গ্রাহক', role:'customer',
          createdAt:FB.serverTimestamp(), referralCode: uid.slice(0,6).toUpperCase(),
          referredBy:null, referralBonusGiven:false, walletBalance:0
        });
      }
      AuthUI.showMsg('✓ লগইন সফল','ok');
      setTimeout(()=>AuthUI.close(),700);
    }catch(e){
      devWarn('OTP verify failed', e.message);
      AuthUI.showMsg(e.code==='auth/invalid-verification-code' ? '❌ ভুল OTP কোড' : 'ভেরিফিকেশন ব্যর্থ','err');
    }
  },
  
  resetPhoneStep(){
    document.getElementById('phoneStep1').style.display='block';
    document.getElementById('phoneStep2').style.display='none';
    document.getElementById('phoneNumber').value='';
    document.getElementById('otpCode').value='';
    this.confirmationResult=null;
    if(this.recaptchaVerifier){ this.recaptchaVerifier.clear(); this.recaptchaVerifier=null; }
  }
};
