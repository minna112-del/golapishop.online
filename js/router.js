/* router.js — Owner Auth (Firebase Auth secured) + page router */
const OwnerAuth = {
  currentUid:null,
  isUnlocked(){ return !!this.currentUid || (FB && FB.auth && FB.auth.currentUser && this._verifiedThisSession); },
  _verifiedThisSession:false,
  requestAccess(){
    document.getElementById('ownerEmail').value='';
    document.getElementById('ownerPassword').value='';
    document.getElementById('ownerGateMsg').className='form-msg';
    document.getElementById('ownerGateModal').classList.add('show');
  },
  cancel(){ document.getElementById('ownerGateModal').classList.remove('show'); },
  async unlock(){
    const email = document.getElementById('ownerEmail').value.trim();
    const pass = document.getElementById('ownerPassword').value;
    const msgEl = document.getElementById('ownerGateMsg');
    if(!email||!pass){ msgEl.textContent='ইমেইল ও পাসওয়ার্ড দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const cred = await FB.signInWithEmailAndPassword(FB.auth, email, pass);
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',cred.user.uid));
      if(!staffSnap.exists() || staffSnap.data().role!=='admin'){
        await FB.signOut(FB.auth).catch(()=>{});
        msgEl.textContent='এই অ্যাকাউন্ট অ্যাডমিন হিসেবে অনুমোদিত নয়'; msgEl.className='form-msg err'; return;
      }
      this.currentUid = cred.user.uid;
      this._verifiedThisSession = true;
      document.getElementById('ownerGateModal').classList.remove('show');
      Router.go('admin-dash');
    }catch(e){ msgEl.textContent='লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়'; msgEl.className='form-msg err'; }
  },
  async _restoreSession(){
    if(this.currentUid || !FB || !FB.auth.currentUser) return false;
    try{
      const staffSnap = await FB.getDoc(FB.doc(FB.db,'staff',FB.auth.currentUser.uid));
      if(staffSnap.exists() && staffSnap.data().role==='admin'){
        this.currentUid = FB.auth.currentUser.uid;
        this._verifiedThisSession = true;
        return true;
      }
    }catch(e){ devWarn('owner session restore failed', e.message); }
    return false;
  },
  async lock(){
    if(FB) await FB.signOut(FB.auth).catch(()=>{});
    this.currentUid=null; this._verifiedThisSession=false;
    toast('🔒 লক করা হয়েছে'); Router.go('home');
  }
};

const Router = {
  current:'home', params:{},
  async go(page, params={}, opts={}){
    if(page==='admin-dash' && !OwnerAuth.isUnlocked()){
      const restored = await OwnerAuth._restoreSession();
      if(!restored){ OwnerAuth.requestAccess(); return; }
    }
    this.current = page; this.params = params;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const el=document.getElementById('page-'+page);
    if(el) el.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
    const navMap = {home:0, listing:1, checkout:2, myorders:3, product:1};
    document.querySelectorAll('#custMobNav a').forEach((a,i)=>a.classList.toggle('active', i===(navMap[page]??-1)));
    if(page==='listing') Listing.render();
    if(page==='product') PDP.load(params.id);
    if(page==='checkout') Checkout.init();
    if(page==='myorders') MyOrders.render();
    if(page==='admin-dash') AdminDash.render();
    if(page==='driver') DriverPortal.render();
    if(page==='zone-manager') ZoneManagerDash.render();
    if(page==='home') Home.render();
    if(page==='medical') Medical.render();
    if(page==='custom-bazar') CustomBazar.init();
    if(page==='account') AccountPage.render();
    if(page==='account-addresses') AccountPage.renderAddresses();

    const staff = ['admin-dash','zone-manager','driver'].includes(page);
    const chatBtn = document.getElementById('chatBtn');
    if(chatBtn) chatBtn.style.display = staff?'none':'flex';
    const chatWin = document.getElementById('chatWin');
    if(chatWin) chatWin.classList.remove('show');
    ['custTopbar','custHeader','custMobNav','custFooter'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.display = staff?'none':''; });
    document.body.style.paddingBottom = staff?'0':'';
  }
};

Router.navigate = function(path) {
  window.history.pushState({}, '', path);
  const p = path.toLowerCase();
  if (p === '/driver') Router.go('driver');
  else if (p === '/manager' || p === '/zone-manager') Router.go('zone-manager');
  else Router.go('home');
};