/* widgets.js — floating AI chat widget */
const ChatWidget = {
  isOpen:false, history:[],
  systemPrompt:`তুমি Golapi Shop Online এর কাস্টমার সাপোর্ট সহায়ক। বাংলায়, সংক্ষিপ্ত ও বন্ধুত্বপূর্ণভাবে উত্তর দাও।
দোকানের তথ্য: শুধু নোয়াখালী সদর ও বেগমগঞ্জ উপজেলায় ডেলিভারি, নিজস্ব লোকাল ড্রাইভার। ক্যাটাগরি: ঔষধ, মুদি বাজার, কনফেকশনারি, স্টেশনারি, গ্যাস সিলিন্ডার, মোবাইল এক্সেসরিস, ঘড়ি, কসমেটিকস, জামা-কাপড়, ফার্নিচার। কাস্টম বাজার সেবা আছে (১০০ টাকা বিকাশ অগ্রিম + বাকি COD)। ডেলিভারি: এক্সপ্রেস ৩০-৬০ মিনিট (+৳১২০) বা আজই ফ্রি। পেমেন্ট: COD, bKash, Nagad। ফ্রি ডেলিভারি ৳১০০০+ অর্ডারে। হটলাইন: +8801612057371।`,
  workerUrl: 'https://golapi-chat-proxy.studiomt46.workers.dev',
  toggle(){
    this.isOpen=!this.isOpen;
    const win=document.getElementById('chatWin');
    if(win) win.classList.toggle('show',this.isOpen);
    const icon=document.getElementById('chatIcon');
    if(icon) icon.textContent = this.isOpen?'✕':'💬';
  },
  quickAsk(q){ const input=document.getElementById('chatInput'); if(input){ input.value=q; this.send(); } },
  append(role,text){
    const body=document.getElementById('chatBody');
    if(!body) return;
    const div=document.createElement('div'); div.className='cw-msg '+(role==='user'?'cw-user':'cw-bot'); div.textContent=text;
    body.appendChild(div); body.scrollTop=body.scrollHeight;
  },
  async send(){
    const input=document.getElementById('chatInput'); if(!input) return;
    const msg=input.value.trim(); if(!msg) return;
    input.value=''; this.append('user',msg); this.history.push({role:'user',content:msg});
    if(this.workerUrl.includes('YOUR-SUBDOMAIN')){ this.append('bot','AI চ্যাট এখনো সেটআপ হয়নি — golapishoponline.bd@gmail.com-এ মেসেজ দিন।'); return; }
    try{
      const res = await fetch(this.workerUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:400,system:this.systemPrompt,messages:this.history})});
      const data = await res.json();
      const reply = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n') || 'দুঃখিত, উত্তর দিতে পারছি না।';
      this.append('bot',reply); this.history.push({role:'assistant',content:reply});
      if(this.history.length>20) this.history=this.history.slice(-20);
    }catch(e){ this.append('bot','সংযোগে সমস্যা হয়েছে। হটলাইন: ০১৬১২-০৫৭৩৭১'); }
  }
};

/* ---------- FAQ page renderer ---------- */
const FAQ = {
  render(){
    const el = document.getElementById('faqList');
    if(!el) return;
    el.innerHTML = FAQ_LIST.map((f,i)=>`
      <div class="card-box" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:4px 0" onclick="FAQ.toggle(${i})">
          <strong style="font-size:13.5px;color:#fff">${f.q}</strong>
          <span id="faqArrow${i}" style="color:var(--gold);font-size:18px;transition:.3s">+</span>
        </div>
        <div id="faqAns${i}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:13px;color:var(--ink-soft);line-height:1.7">${f.a}</div>
      </div>`).join('');
  },
  toggle(i){
    const ans=document.getElementById('faqAns'+i);
    const arrow=document.getElementById('faqArrow'+i);
    if(!ans) return;
    if(ans.style.display==='none'){ ans.style.display='block'; arrow.textContent='−'; arrow.style.transform='rotate(180deg)'; }
    else { ans.style.display='none'; arrow.textContent='+'; arrow.style.transform='rotate(0)'; }
  }
};

/* ---------- Reviews page renderer ---------- */
const Reviews = {
  async render(){
    const el = document.getElementById('reviewsGrid');
    if(!el) return;
    el.innerHTML = `<p style="color:var(--ink-muted);padding:16px">লোড হচ্ছে...</p>`;
    if(!FB){ el.innerHTML = `<p style="color:var(--ink-muted)">সংযোগ সমস্যা</p>`; return; }
    try{
      const snap = await FB.getDocs(FB.query(FB.collection(FB.db,'reviews'), FB.limit(50)));
      const reviews=[]; snap.forEach(d=>reviews.push({id:d.id,...d.data()}));
      reviews.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      if(!reviews.length){
        el.innerHTML = `<div class="empty-state"><div class="em">⭐</div><h3>এখনো কোনো রিভিউ নেই</h3><p>প্রথম রিভিউ দিন!</p></div>`;
        return;
      }
      el.innerHTML = reviews.map(r=>{
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5-r.rating);
        const date = r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString('bn-BD') : '';
        const p = ALL_PRODUCTS.find(x=>x.id===r.productId);
        return `<div class="card-box" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div><strong style="font-size:13px;color:#fff">${r.userName||'গ্রাহক'}</strong>${p?` <span style="font-size:11px;color:var(--ink-muted)">— ${p.name}</span>`:''}</div>
            <span style="color:var(--gold);font-size:14px">${stars}</span>
          </div>
          <p style="font-size:13px;color:var(--ink-soft);line-height:1.6">${r.text}</p>
          <span style="font-size:10.5px;color:var(--ink-dim)">${date}</span>
        </div>`;
      }).join('');
    }catch(e){ el.innerHTML = `<p style="color:var(--ink-muted)">লোড করা যায়নি</p>`; }
  }
};