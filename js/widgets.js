/* widgets.js — floating AI chat widget */
/* ---------- Chat Widget ---------- */
const ChatWidget = {
  isOpen:false, history:[],
  systemPrompt:`তুমি Golapi Shop Online এর কাস্টমার সাপোর্ট সহায়ক। বাংলায়, সংক্ষিপ্ত ও বন্ধুত্বপূর্ণভাবে উত্তর দাও।
দোকানের তথ্য: শুধু নোয়াখালী সদর ও বেগমগঞ্জ উপজেলায় ডেলিভারি, নিজস্ব লোকাল ড্রাইভার। ক্যাটাগরি: ঔষধ, মুদি বাজার, কনফেকশনারি, স্টেশনারি, গ্যাস সিলিন্ডার, মোবাইল এক্সেসরিস, ঘড়ি, কসমেটিকস, জামা-কাপড়, ফার্নিচার। কাস্টম বাজার সেবা আছে (১০০ টাকা বিকাশ অগ্রিম + বাকি COD)। ডেলিভারি: এক্সপ্রেস ৬০-৯০ মিনিট (+৳২০) বা আজই ফ্রি। পেমেন্ট: COD, bKash, Nagad। ফ্রি ডেলিভারি ৳১০০০+ অর্ডারে। হটলাইন: +8801612057371।`,
  workerUrl: 'https://golapi-chat-proxy.studiomt46.workers.dev',
  toggle(){
    this.isOpen=!this.isOpen;
    document.getElementById('chatWin').classList.toggle('show',this.isOpen);
    document.getElementById('chatIcon').textContent = this.isOpen?'✕':'💬';
  },
  quickAsk(q){ document.getElementById('chatInput').value=q; this.send(); },
  append(role,text){
    const body=document.getElementById('chatBody');
    const div=document.createElement('div'); div.className='cw-msg '+(role==='user'?'cw-user':'cw-bot'); div.textContent=text;
    body.appendChild(div); body.scrollTop=body.scrollHeight;
  },
  async send(){
    const input=document.getElementById('chatInput'); const msg=input.value.trim(); if(!msg) return;
    input.value=''; this.append('user',msg); this.history.push({role:'user',content:msg});
    if(this.workerUrl.includes('YOUR-SUBDOMAIN')){ this.append('bot','AI চ্যাট এখনো সেটআপ হয়নি — golapishoponline.bd@gmail.com-এ মেসেজ দিন।'); return; }
    try{
      const res = await fetch(this.workerUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:400,system:this.systemPrompt,messages:this.history})});
      const data = await res.json();
      const reply = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\\n') || 'দুঃখিত, উত্তর দিতে পারছি না।';
      this.append('bot',reply); this.history.push({role:'assistant',content:reply});
      if(this.history.length>20) this.history=this.history.slice(-20);
    }catch(e){ this.append('bot','সংযোগে সমস্যা হয়েছে। হটলাইন: ০১৬১২-০৫৭৩৭১'); }
  }
};