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