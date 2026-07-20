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

  /* ── SEO: প্রতিটা পাবলিক পেজের জন্য রিয়েল, শেয়ারযোগ্য URL + টাইটেল ──
     private/checkout-ধরনের পেজ (checkout, account, myorders, order-success)
     ইচ্ছাকৃতভাবে বাদ — সেগুলোর URL বদলানোর দরকার নেই, index-ও হওয়া উচিত না */
  seoMeta: {
    home: { path: '/', title: 'Golapi Shop Online — নোয়াখালী সদর ও বেগমগঞ্জের অনলাইন শপ', desc: 'মুদি, ঔষধ, গ্যাস, কসমেটিকস — bKash, Nagad, COD পেমেন্টে ঘরে বসে অর্ডার করুন। নিজস্ব লোকাল ড্রাইভার, ফ্রী স্বাস্থ্য সেবা।' },
    listing: { path: p => `/category/${p.cat||'all'}`, title: p => `${CATEGORIES.find(c=>c.id===p.cat)?.label || 'সব প্রোডাক্ট'} — Golapi Shop Online`, desc: p => `${CATEGORIES.find(c=>c.id===p.cat)?.label || 'সব প্রোডাক্ট'} কিনুন Golapi Shop Online থেকে — নোয়াখালী সদর ও বেগমগঞ্জে হোম ডেলিভারি।` },
    product: { path: p => `/product/${p.id}`, title: p => { const pr=ALL_PRODUCTS.find(x=>x.id===p.id); return pr ? `${pr.name} — ৳${pr.salePrice} | Golapi Shop Online` : 'প্রোডাক্ট — Golapi Shop Online'; }, desc: p => { const pr=ALL_PRODUCTS.find(x=>x.id===p.id); return pr ? (pr.description || `${pr.name} — Golapi Shop Online থেকে হোম ডেলিভারিতে কিনুন।`) : ''; } },
    medical: { path: '/medical', title: 'ফ্রী স্বাস্থ্য সেবা — Golapi Shop Online', desc: '১৫ জন বিশেষজ্ঞ চিকিৎসকের ফ্রী ভিজিট শিডিউলিং — নোয়াখালী সদর ও বেগমগঞ্জ।' },
    'custom-bazar': { path: '/custom-bazar', title: 'কাস্টম বাজার — Golapi Shop Online', desc: 'নিজের বাজারের লিস্ট পাঠান, আমাদের ড্রাইভার বাজার করে বাসায় পৌঁছে দেবে।' },
    contact: { path: '/contact', title: 'যোগাযোগ — Golapi Shop Online', desc: 'হটলাইন, শাখা ম্যানেজারের নম্বর ও ইমেইল — Golapi Shop Online.' },
    'about-app': { path: '/about', title: 'আমাদের গল্প — Golapi Shop Online', desc: 'Golapi Shop Online কীভাবে শুরু হলো, আমাদের টিমের সাথে পরিচিত হন।' },
    terms: { path: '/terms', title: 'শর্তাবলী — Golapi Shop Online', desc: 'Golapi Shop Online ব্যবহারের শর্তাবলী।' },
    'privacy-info': { path: '/privacy', title: 'প্রাইভেসি পলিসি — Golapi Shop Online', desc: 'Golapi Shop Online-এর গোপনীয়তা নীতি।' }
  },
  updateSeoTags(page, params, skipHistory){
    const meta = this.seoMeta[page];
    if(!meta) return; // private পেজ — URL/title অপরিবর্তিত থাকবে
    const path = typeof meta.path==='function' ? meta.path(params) : meta.path;
    const title = typeof meta.title==='function' ? meta.title(params) : meta.title;
    const desc = typeof meta.desc==='function' ? meta.desc(params) : meta.desc;
    if(title) document.title = title; // টাইটেল/মেটা সবসময় আপডেট হয় — direct URL হিট বা ক্লিক-নেভিগেশন দুই ক্ষেত্রেই
    if(desc){
      let m = document.querySelector('meta[name="description"]');
      if(m) m.setAttribute('content', desc);
    }
    if(!skipHistory && path && window.location.pathname !== path){
      history.pushState({ page, params }, '', path); // শুধু ক্লিক-নেভিগেশনে নতুন URL পুশ হয়; direct URL হিটে URL ইতিমধ্যেই সঠিক
    }
  },

  async go(page, params={}, opts={}){
    if(page==='admin-dash' && !OwnerAuth.isUnlocked()){
      const restored = await OwnerAuth._restoreSession();
      if(!restored){ OwnerAuth.requestAccess(); return; }
    }
    /* স্টাফ পেজ (admin-dash/driver/zone-manager) হলে আগে ফ্র্যাগমেন্ট লোড করে নিতে হবে */
    if(window.__lazyPages && window.__lazyPages.includes(page) && !window.__loadedLazyPages[page]){
      await new Promise(resolve => window.__ensureLazyPage(page, resolve));
    }
    this.current = page; this.params = params;
    this.updateSeoTags(page, params, !!opts.skipHistory);
    if(typeof dataLayer!=='undefined') dataLayer.push({event:'page_view', page_title: page, page_path: '/#'+page});
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