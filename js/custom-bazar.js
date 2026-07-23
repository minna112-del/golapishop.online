/* custom-bazar.js — Custom Bazar page logic (lazy-loaded, শুধু custom-bazar পেজে গেলে লোড হয়) */
const CustomBazar = {
  init(){
    ['cbName','cbPhone','cbAddress','cbList','cbNotes','cbTrxId','cbVillage','cbInstructions'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const d=document.getElementById('cbDistrict'); if(d) d.value='';
    const z=document.getElementById('cbZone'); if(z) z.innerHTML='<option value="">প্রথমে উপজেলা বেছে নিন</option>';
    const b=document.getElementById('cbBkashNum'); if(b) b.textContent='উপজেলা বেছে নিলে দেখাবে';
    const m=document.getElementById('cbMsg'); if(m) m.className='form-msg';
    this.renderPastOrders();
  },
  async renderPastOrders(){
    const box = document.getElementById('cbPastOrdersBox');
    if(!box) return;
    if(!Auth.currentUser || !FB){ box.style.display='none'; return; }
    try{
      const snap = await FB.getDocs(FB.query(
        FB.collection(FB.db,'orders'),
        FB.where('userId','==',Auth.currentUser.uid),
        FB.where('orderType','==','custom-bazar')
      ));
      const orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
      orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      if(!orders.length){ box.style.display='none'; return; }
      const recent = orders.slice(0,3);
      box.style.display='block';
      box.innerHTML = `<div class="card-box" style="border-color:var(--gold-line);background:rgba(212,175,55,.04)">
        <strong style="font-size:13px;color:var(--gold)">🔁 আগের বাজার লিস্ট থেকে দ্রুত অর্ডার করুন</strong>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
          ${recent.map(o=>{
            const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('bn-BD') : '';
            const preview = (o.bazarList||'').split('\n').filter(Boolean).slice(0,2).join(', ');
            return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px;background:rgba(255,255,255,.02);border-radius:8px">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:#fff">${o.bazarTypeLabel||'বাজার'} — ${date}</div>
                <div style="font-size:11px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${preview}...</div>
              </div>
              <button class="btn btn-outline" style="font-size:11.5px;padding:6px 10px;white-space:nowrap" onclick='CustomBazar.reuseOrder(${JSON.stringify(o).replace(/'/g,"&#39;")})'>এই লিস্ট ব্যবহার করুন</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }catch(e){ devWarn('past bazar orders load failed', e.message); box.style.display='none'; }
  },
  reuseOrder(o){
    document.getElementById('cbName').value = o.customerName||'';
    document.getElementById('cbPhone').value = o.customerPhone||'';
    document.getElementById('cbAddress').value = o.address||'';
    document.getElementById('cbVillage').value = o.village||'';
    document.getElementById('cbInstructions').value = o.instructions||'';
    document.getElementById('cbNotes').value = o.notes||'';
    document.getElementById('cbList').value = o.bazarList||'';
    document.getElementById('cbType').value = o.bazarType||'weekly';
    if(o.branchZone){
      document.getElementById('cbDistrict').value = o.branchZone;
      onUpazilaChange('cb');
      setTimeout(()=>{ const zEl=document.getElementById('cbZone'); if(zEl) zEl.value = o.zone||''; }, 100);
    }
    toast('✓ আগের লিস্ট বসানো হয়েছে — চেক করে ট্রানজেকশন ID দিয়ে জমা দিন','success');
    window.scrollTo({top:0, behavior:'smooth'});
  },
  async submit(){
    const msgEl=document.getElementById('cbMsg');
    const name=document.getElementById('cbName')?.value.trim()||'';
    const phone=document.getElementById('cbPhone')?.value.trim()||'';
    const address=document.getElementById('cbAddress')?.value.trim()||'';
    const district=document.getElementById('cbDistrict')?.value||'';
    const zone=document.getElementById('cbZone')?.value||'';
    const village=document.getElementById('cbVillage')?.value.trim()||'';
    const instructions=document.getElementById('cbInstructions')?.value.trim()||'';
    const type=document.getElementById('cbType')?.value||'weekly';
    const list=document.getElementById('cbList')?.value.trim()||'';
    const notes=document.getElementById('cbNotes')?.value.trim()||'';
    const trxId=document.getElementById('cbTrxId')?.value.trim()||'';
    if(!name||!phone||!address||!district||!zone||!village||!instructions||!list||!trxId){ msgEl.textContent='সব প্রয়োজনীয় তথ্য পূরণ করুন (ডেলিভারি ইনস্ট্রাকশন সহ)'; msgEl.className='form-msg err'; return; }
    const phoneRe=/^(?:\+880|880|0)1[3-9]\d{8}$/;
    if(!phoneRe.test(phone.replace(/[\s-]/g,''))){ msgEl.textContent='সঠিক মোবাইল নম্বর দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    const btn=document.getElementById('cbSubmitBtn'); const orig=btn.textContent; btn.textContent='জমা হচ্ছে...'; btn.disabled=true;
    const typeLabels={weekly:'সাপ্তাহিক',monthly:'মাসিক',wedding:'বিয়ের',ramadan:'রমজানের',qurbani:'কুরবানির',other:'অন্যান্য'};
    const orderNo = 'CB-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900000)+100000);
    try{
      await FB.addDoc(FB.collection(FB.db,'orders'),{
        orderNumber:orderNo, orderType:'custom-bazar', bazarType:type, bazarTypeLabel:typeLabels[type]||type,
        customerName:name, customerPhone:phone, address, village, instructions, branchZone:district, district:AREA_LABELS[district]||'',
        zone, bazarList:list, notes, bkashTrxId:trxId, advanceAmount:100, paymentMethod:'bkash+cod',
        billPhotoUrl:null, billAmount:null,
        status:'pending', userId:Auth.currentUser?.uid||null, createdAt:FB.serverTimestamp()
      });
      const submittedOrder = {orderNumber:orderNo, orderType:'custom-bazar', bazarType:type, bazarTypeLabel:typeLabels[type]||type, customerName:name, customerPhone:phone, address, village, instructions, notes, bazarList:list, advanceAmount:100};
      const memoKey = BazarMemo.register(submittedOrder);
      msgEl.innerHTML = `✅ আপনার বাজার অর্ডার (${esc(orderNo)}) সফলভাবে জমা হয়েছে! ড্রাইভার বাজার করার পর বিলের ছবি এখানেই দেখতে পাবেন।<br><button class="btn btn-outline" style="margin-top:10px;font-size:12.5px;padding:8px 16px" onclick="BazarMemo.openById('${esc(memoKey)}')">🧾 মেমো দেখুন / প্রিন্ট করুন</button>`;
      msgEl.className='form-msg ok';
      btn.textContent=orig; btn.disabled=false;
    }catch(e){ msgEl.textContent='সমস্যা হয়েছে: '+e.message; msgEl.className='form-msg err'; btn.textContent=orig; btn.disabled=false; }
  }
};
