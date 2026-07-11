/* store.js — Wishlist + Referral */
const Wishlist = {
  items:[],
  load(){ try{ this.items = JSON.parse(localStorage.getItem('golapi_wishlist')||'[]'); }catch(e){ this.items=[]; } },
  save(){ localStorage.setItem('golapi_wishlist', JSON.stringify(this.items)); },
  has(id){ return this.items.includes(id); },
  toggle(id){
    if(this.has(id)){ this.items = this.items.filter(x=>x!==id); toast('উইশলিস্ট থেকে সরানো হয়েছে'); }
    else { this.items.push(id); toast('❤️ উইশলিস্টে যুক্ত হয়েছে','success'); }
    this.save();
    document.querySelectorAll('.wish').forEach(btn=>{
      const pid = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      if(pid && pid===id) btn.textContent = this.has(id)?'❤️':'🤍';
    });
  },
  count(){ return this.items.length; },
  render(){
    const el = document.getElementById('wishlistGrid');
    if(!el) return;
    if(!this.items.length){
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="em">🤍</div><h3>উইশলিস্ট খালি</h3><p>পছন্দের পণ্যে 🤍 চাপুন</p><button class="btn btn-gold" onclick="Router.go('listing',{cat:'all'})">শপিং শুরু করুন</button></div>`;
      return;
    }
    const products = this.items.map(id => ALL_PRODUCTS.find(p=>p.id===id)).filter(Boolean);
    el.innerHTML = products.map(pcardHTML).join('') || `<div class="empty-state" style="grid-column:1/-1"><p>পণ্য পাওয়া যায়নি</p></div>`;
  }
};
Wishlist.load();

const Referral = {
  getCode(){
    let code = localStorage.getItem('golapi_referral_code');
    if(!code){ code = 'GOLAPI' + Math.random().toString(36).substr(2,6).toUpperCase(); localStorage.setItem('golapi_referral_code', code); }
    return code;
  },
  render(){
    const el = document.getElementById('referralBox');
    if(!el) return;
    const code = this.getCode();
    el.innerHTML = `<div class="card-box" style="text-align:center">
      <div style="font-size:32px;margin-bottom:10px">🎁</div>
      <h3 class="tiro" style="font-size:18px;margin-bottom:6px">রেফার করে পুরস্কার পান</h3>
      <p style="font-size:12.5px;color:var(--ink-muted);margin-bottom:14px">আপনার রেফার কোড শেয়ার করুন। প্রতিটি সফল রেফারের জন্য আপনি পাবেন ৫০ টাকা ছাড়!</p>
      <div style="background:rgba(212,175,55,.08);border:1px solid var(--gold-line);border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="font-size:11px;color:var(--ink-muted);margin-bottom:4px">আপনার রেফার কোড</div>
        <div style="font-size:22px;font-weight:700;color:var(--gold);letter-spacing:2px;font-family:Poppins">${code}</div>
      </div>
      <button class="btn btn-gold btn-block" onclick="Referral.copyCode()">📋 কোড কপি করুন</button>
    </div>`;
  },
  copyCode(){
    const code = this.getCode();
    if(navigator.clipboard){ navigator.clipboard.writeText(code).then(()=>toast('✓ কোড কপি হয়েছে','success')); }
    else { const ta=document.createElement('textarea'); ta.value=code; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');toast('✓ কোড কপি হয়েছে','success');}catch(e){toast('কপি করা যায়নি','error');} ta.remove(); }
  }
};