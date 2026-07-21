/* widgets.js — floating AI chat widget (এখন ভাসমান/draggable, যেকোনো জায়গায় নেওয়া যায়) */
const ChatWidget = {
  isOpen:false, history:[],
  systemPrompt:`তুমি Golapi Shop Online এর কস্টমার সাপোর্ট সহায়ক। বাংলায়, সংক্ষিপ ও বন্ধুত্বপূর্ণভাবে উত্তর দাও।
দকানের তথ্য: শুধু নোয়াখলী সদর ও বেগমগঞ্জ উপজেলায় ডেলিভারি, নিজস্ব লোকাল ড্রাইভার। ক্যাটাগর: ঔষধ, মুদি বাজার, কনফেকশনারি, স্টেশনারি, গ্যাস সিলিন্ডার, মোবাইল এক্সেসরিস, ঘড়ি, কসমেটিকস, জমা-কাপড়, ফার্নিচার। কাস্টম বাজার সবা আছে (১০০ টাকা বিকাশ অগ্রিম + বাকি COD)। ডেলিভারি: এক্সপ্রেস ৩০-৬০ মিনিট (+৳১২০) বা আজই ফ্রি। পমেন্ট: COD, bKash, Nagad। ফ্রি ডেলিভারি ৳১০০০+ অর্ডারে। হটলাইন: +8801612057371।`,
  workerUrl: 'https://golapi-chat-proxy.studiomt46.workers.dev',
  toggle(){
    this.isOpen=!this.isOpen;
    const win=document.getElementById('chatWin');
    if(win){
      win.classList.toggle('show',this.isOpen);
      this._positionWindowNearButton(win); // বাটন যেখানেই টেনে রাখা থাকুক, উইন্ডো তার কাছাকাছি খোলে
    }
    // ⚠️ আগে এখানে icon.textContent='✕'/'💬' বসানো হতো, যেটা ভুলবশত ভেতরের লোগো <img>-টাকেই মুছে ফেলতো
    // (textContent সব children রিপ্লেস করে দেয়)। এখন শুধু একটা CSS ক্লাস টগল করা হয়, img অক্ষত থাকে।
    const btn=document.getElementById('chatBtn');
    if(btn) btn.classList.toggle('is-open', this.isOpen);
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
    if(this.workerUrl.includes('YOUR-SUBDOMAIN')){ this.append('bot','AI চ্যাট এখনো সেটআপ হয়নি — golapishoponline.bd@gmail.com-এ মেসজ দিন।'); return; }
    try{
      const res = await fetch(this.workerUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:400,system:this.systemPrompt,messages:this.history})});
      const data = await res.json();
      const reply = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n') || 'দুঃখিত, উত্তর দিতে পারছি না।';
      this.append('bot',reply); this.history.push({role:'assistant',content:reply});
      if(this.history.length>20) this.history=this.history.slice(-20);
    }catch(e){ this.append('bot','সংযোগে সমস্যা হয়েছে। হটলাইন: ০১৬১২-০৫৭৩৭১'); }
  },

  /* ═══════════════════════════════════════════════════════════
     ভাসমান/Draggable বাটন — Facebook Messenger bubble-এর মতো
     যেকোনো দিকে টেনে নেওয়া যায়, অবস্থান localStorage-এ মনে থাকে
     ═══════════════════════════════════════════════════════════ */
  _dragState: null,
  _posKey: 'golapi_chatbtn_pos',

  initDraggable(){
    const btn = document.getElementById('chatBtn');
    if(!btn || btn.dataset.draggableInit) return;
    btn.dataset.draggableInit = '1';

    // আগের সেভ করা অবস্থান থাকলে সেখানেই বসানো, নইলে ডিফল্ট (নিচে-ডানে)
    this._restorePosition(btn);
    window.addEventListener('resize', ()=>this._clampToViewport(btn));

    const DRAG_THRESHOLD = 8; // এর কম নড়াচড়া হলে সেটা "ট্যাপ" ধরা হবে, ড্র্যাগ না

    const onStart = (clientX, clientY) => {
      const rect = btn.getBoundingClientRect();
      this._dragState = {
        startX: clientX, startY: clientY,
        offsetX: clientX - rect.left, offsetY: clientY - rect.top,
        moved: false, rectW: rect.width, rectH: rect.height
      };
      btn.style.transition = 'none';
    };
    const onMove = (clientX, clientY) => {
      const d = this._dragState;
      if(!d) return;
      const dx = clientX - d.startX, dy = clientY - d.startY;
      if(!d.moved && Math.hypot(dx,dy) > DRAG_THRESHOLD) d.moved = true;
      if(!d.moved) return;
      let left = clientX - d.offsetX;
      let top = clientY - d.offsetY;
      // ভিউপোর্টের বাইরে যেন না যায়
      left = Math.max(6, Math.min(left, window.innerWidth - d.rectW - 6));
      top = Math.max(6, Math.min(top, window.innerHeight - d.rectH - 6));
      btn.style.left = left + 'px';
      btn.style.top = top + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    };
    const onEnd = () => {
      const d = this._dragState;
      btn.style.transition = '';
      if(d && d.moved){
        this._savePosition(btn);
      } else {
        // নড়াচড়া হয়নি মানে এটা আসলে ট্যাপ ছিল — চ্যাট খোলা/বন্ধ করো
        this.toggle();
      }
      this._dragState = null;
    };

    // টাচ (মোবাইল — মূল ব্যবহার)
    btn.addEventListener('touchstart', e=>{ const t=e.touches[0]; onStart(t.clientX, t.clientY); }, {passive:true});
    btn.addEventListener('touchmove', e=>{ const t=e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, {passive:false});
    btn.addEventListener('touchend', onEnd);

    // মাউস (ডেস্কটপ/প্রিভিউ সাপোর্ট)
    btn.addEventListener('mousedown', e=>{ onStart(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', e=>{ if(this._dragState) onMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', ()=>{ if(this._dragState) onEnd(); });

    // পুরনো onclick="ChatWidget.toggle()" attribute-টা সরিয়ে দেওয়া হলো, কারণ
    // এখন toggle() শুধু "ট্যাপ" (নড়াচড়া ছাড়া ছাড়া) হলেই onEnd()-এর ভেতর থেকে কল হয় —
    // দুটো একসাথে থাকলে ড্র্যাগ শেষেও ভুলবশত চ্যাট খুলে যেত
    btn.removeAttribute('onclick');
  },

  _savePosition(btn){
    const rect = btn.getBoundingClientRect();
    try{
      localStorage.setItem(this._posKey, JSON.stringify({
        xPct: rect.left / window.innerWidth,
        yPct: rect.top / window.innerHeight
      }));
    }catch(e){}
  },
  _restorePosition(btn){
    try{
      const saved = JSON.parse(localStorage.getItem(this._posKey) || 'null');
      if(saved){
        const rect = btn.getBoundingClientRect();
        const left = saved.xPct * window.innerWidth;
        const top = saved.yPct * window.innerHeight;
        btn.style.left = Math.max(6, Math.min(left, window.innerWidth - rect.width - 6)) + 'px';
        btn.style.top = Math.max(6, Math.min(top, window.innerHeight - rect.height - 6)) + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
      }
    }catch(e){}
  },
  _clampToViewport(btn){
    if(btn.style.left === '' || btn.style.left === 'auto') return; // ডিফল্ট পজিশনে থাকলে কিছু করার দরকার নেই
    const rect = btn.getBoundingClientRect();
    const left = Math.max(6, Math.min(rect.left, window.innerWidth - rect.width - 6));
    const top = Math.max(6, Math.min(rect.top, window.innerHeight - rect.height - 6));
    btn.style.left = left + 'px';
    btn.style.top = top + 'px';
  },
  _positionWindowNearButton(win){
    const btn = document.getElementById('chatBtn');
    if(!btn) return;
    const bRect = btn.getBoundingClientRect();
    const winW = Math.min(360, window.innerWidth - 32);
    const winH = 420;
    let left = bRect.left + bRect.width/2 - winW/2;
    let top = bRect.top - winH - 10; // ডিফল্ট: বাটনের উপরে
    if(top < 10) top = bRect.bottom + 10; // উপরে জায়গা না থাকলে নিচে
    left = Math.max(10, Math.min(left, window.innerWidth - winW - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - winH - 10));
    win.style.left = left + 'px';
    win.style.top = top + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  }
};

// চ্যাট বাটন স্লট থেকে async লোড হয়, তাই কয়েকবার চেষ্টা করে draggable init করা হয়
(function tryInitChatDraggable(){
  let tries = 0;
  const attempt = ()=>{
    const btn = document.getElementById('chatBtn');
    if(btn){ ChatWidget.initDraggable(); return; }
    if(++tries < 30) setTimeout(attempt, 300);
  };
  attempt();
})();

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
    this.injectFAQSchema();
  },
  injectFAQSchema(){
    const old = document.getElementById('faqSchemaLD');
    if(old) old.remove();
    const schema = {
      "@context":"https://schema.org",
      "@type":"FAQPage",
      "mainEntity": FAQ_LIST.map(f=>({
        "@type":"Question",
        "name": f.q,
        "acceptedAnswer": { "@type":"Answer", "text": f.a }
      }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faqSchemaLD';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
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