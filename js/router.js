/* router.js — Owner PIN gate + page router */
const OwnerAuth = {
  pendingPage:null, attempts:0, lockedUntil:0,
  isUnlocked(){ return sessionStorage.getItem('golapi_owner_unlocked')==='1' || localStorage.getItem('golapi_owner_remember')==='1'; },
  requestAccess(){
    document.getElementById('ownerPinInput').value='';
    document.getElementById('ownerGateMsg').className='form-msg';
    document.getElementById('ownerGateModal').classList.add('show');
    setTimeout(()=>document.getElementById('ownerPinInput').focus(),100);
  },
  cancel(){ document.getElementById('ownerGateModal').classList.remove('show'); },
  async unlock(){
    const entered = document.getElementById('ownerPinInput').value.trim();
    const msgEl = document.getElementById('ownerGateMsg');
    if(Date.now() < this.lockedUntil){ msgEl.textContent = `🔒 আর ${Math.ceil((this.lockedUntil-Date.now())/60000)} মিনিট অপেক্ষা করুন`; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'setting','owner_pin'));
      const storedPin = snap.exists()? snap.data().pin : null;
      if(!storedPin){ msgEl.textContent='⚠ পিন সেট করা হয়নি — Firestore setting/owner_pin ডকুমেন্টে pin ফিল্ড বসান'; msgEl.className='form-msg err'; return; }
      if(entered !== storedPin){
        this.attempts++;
        if(this.attempts>=3){ this.lockedUntil = Date.now()+5*60*1000; msgEl.textContent='🔒 ৩ বার ভুল — ৫ মিনিট অপেক্ষা করুন'; this.attempts=0; }
        else msgEl.textContent = `❌ পিন সঠিক নয় (${3-this.attempts} বার বাকি)`;
        msgEl.className='form-msg err'; document.getElementById('ownerPinInput').value=''; return;
      }
      this.attempts=0;
      sessionStorage.setItem('golapi_owner_unlocked','1'); localStorage.setItem('golapi_owner_remember','1');
      document.getElementById('ownerGateModal').classList.remove('show');
      Router.go('admin-dash');
    }catch(e){ msgEl.textContent='যাচাই ব্যর্থ: '+e.message; msgEl.className='form-msg err'; }
  },
  lock(){ sessionStorage.removeItem('golapi_owner_unlocked'); localStorage.removeItem('golapi_owner_remember'); toast('🔒 লক করা হয়েছে'); Router.go('home'); }
};

const Router = {
  current:'home', params:{},
  go(page, params={}, opts={}){
    if(page==='admin-dash' && !OwnerAuth.isUnlocked()){ OwnerAuth.requestAccess(); return; }
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
    if(page==='faq') FAQ.render();
    if(page==='reviews') Reviews.render();
    const staff = ['admin-dash','zone-manager','driver'].includes(page);
    const chatBtn = document.getElementById('chatBtn');
    if(chatBtn) chatBtn.style.display = staff?'none':'flex';
    const chatWin = document.getElementById('chatWin');
    if(chatWin) chatWin.classList.remove('show');
    ['custTopbar','custHeader','custMobNav','custFooter'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.display = staff?'none':''; });
    document.body.style.paddingBottom = staff?'0':'';
  }
};