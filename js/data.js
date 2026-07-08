/* data.js — product store, Firestore sync, product card render */
/* ---------- Demo fallback products (used until Firestore has data) ---------- */
function sampleProduct(i){
  const names=['গোলাপি সিল্ক শাড়ি','স্মার্ট ওয়াচ প্রো','ব্লুটুথ হেডফোন','চামড়ার হ্যান্ডব্যাগ','রোজ গোল্ড লিপস্টিক','কটন পাঞ্জাবি','LED ডেস্ক ল্যাম্প','অরগানিক হেয়ার অয়েল','দেশি চাল (মিনিকেট)','খোলা দুধ','সয়াবিন তেল','মসুর ডাল','প্যারাসিটামল ৫০০মিগ্রা','যমুনা গ্যাস ১২ কেজি','টাইপ-সি চার্জার','খাতা (রুলড)'];
  const units={medicine:['পাতা','বক্স'],grocery:['কেজি','লিটার','ডজন'],confectionery:['পিস','প্যাকেট'],stationery:['পিস','প্যাকেট'],gas:['পিস'],mobile:['পিস'],watch:['পিস'],cosmetics:['পিস','১০০ মিলি'],clothing:['পিস'],furniture:['পিস']};
  const cat = CATEGORIES[i%CATEGORIES.length].id;
  const u = units[cat]||['পিস'];
  const isGrocery = cat==='grocery';
  const base = isGrocery? 25+(i*17)%475 : 300+(i*137)%3500;
  const hasDisc = i%3===0;
  return {
    id:'demo'+i, name:names[i%names.length]+' #'+(i+1), category:cat, zone: i%2===0?'noakhali_sadar':'begumganj',
    unit:u[i%u.length], price: hasDisc?Math.round(base*1.25):base, salePrice: base,
    rating:(3.5+(i%15)/10).toFixed(1), reviews:10+(i*7)%300, sold:20+(i*13)%900, cod:i%4!==0,
    img:`https://picsum.photos/seed/golapi${i}/400/400`, isFlash:i%5===0, isFeatured:i%4===0, fastDelivery:i%3===0, stock:5+(i*3)%50
  };
}
let ALL_PRODUCTS = Array.from({length:36},(_,i)=>sampleProduct(i));

/* De-dupe products added to both zones under the same groupId so customers see one card with combined stock. */
function zoneProducts(){
  const seenG=new Set(), seenK=new Set(), merged=[];
  for(const p of ALL_PRODUCTS){
    if(p.groupId){
      if(seenG.has(p.groupId)) continue;
      seenG.add(p.groupId);
      const sibs = ALL_PRODUCTS.filter(x=>x.groupId===p.groupId);
      merged.push({...p, stock: sibs.reduce((s,x)=>s+(x.stock||0),0)});
    }else{
      const key = `${p.name.trim().toLowerCase()}|${p.category}|${p.salePrice}`;
      if(seenK.has(key)) continue;
      seenK.add(key);
      const sibs = ALL_PRODUCTS.filter(x=>!x.groupId && `${x.name.trim().toLowerCase()}|${x.category}|${x.salePrice}`===key);
      merged.push(sibs.length>1 ? {...p, stock: sibs.reduce((s,x)=>s+(x.stock||0),0)} : p);
    }
  }
  return merged;
}

const ProductStore = {
  loaded:false, unsubscribe:null,
  mapDoc(id,d){
    return {
      id, name:d.name||'নামহীন প্রোডাক্ট', category:d.category||'grocery', zone:d.zone||'noakhali_sadar',
      unit:d.unit||'পিস', price:Number(d.price)||0, salePrice:Number(d.salePrice ?? d.price)||0,
      rating:d.rating||'৫.০', reviews:d.reviews||0, sold:d.sold||0, cod:d.cod!==false,
      img:d.imageUrl||`https://picsum.photos/seed/${id}/400/400`, isFlash:!!d.isFlash, isFeatured:!!d.isFeatured,
      fastDelivery:d.fastDelivery!==false, stock:Number(d.stock)||0, description:d.description||'',
      status:d.status||'active', groupId:d.groupId||null, costPrice:d.costPrice||0, extraCost:d.extraCost||0,
      deliveryPercent:d.deliveryPercent||0, profitPercent:d.profitPercent||20
    };
  },
  startLiveSync(){
    if(!FB || this.unsubscribe) return;
    try{
      this.unsubscribe = FB.onSnapshot(FB.collection(FB.db,'products'), snap=>{
        if(snap.empty){ this.loaded = true; return; } // keep demo fallback if store is genuinely empty
        const real=[];
        snap.forEach(d=>real.push(this.mapDoc(d.id, d.data())));
        ALL_PRODUCTS = real.filter(p=>p.status==='active');
        this.loaded = true;
        if(Router.current==='home') Home.render();
        if(Router.current==='listing') Listing.render();
        if(Router.current==='product' && PDP.product) PDP.load(PDP.product.id);
      }, err=>devWarn('live sync error', err.message));
    }catch(e){ devWarn('sync start failed', e.message); }
  },
  async refreshAndRerender(){
    if(!FB) return false;
    try{
      const snap = await FB.getDocs(FB.collection(FB.db,'products'));
      if(!snap.empty){
        const real=[]; snap.forEach(d=>real.push(this.mapDoc(d.id, d.data())));
        ALL_PRODUCTS = real.filter(p=>p.status==='active');
      }
      this.loaded = true;
    }catch(e){ devWarn('refresh failed', e.message); }
    Home.render();
    if(Router.current==='listing') Listing.render();
    return true;
  }
};

function pcardHTML(p){
  const discount = p.price>p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
  return `<div class="pcard" onclick="Router.go('product',{id:'${p.id}'})">
    <div class="imgwrap"><img src="${p.img}" alt="${p.name}" loading="lazy">
      ${discount?`<span class="pbadge">-${bn(discount)}%</span>`:''}
      ${p.isFeatured?`<span class="pbadge gold" style="left:auto;right:8px;top:${discount?'40px':'8px'}">★</span>`:''}
      <button class="wish" onclick="event.stopPropagation();toast('❤️ উইশলিস্টে যুক্ত হয়েছে')">🤍</button>
    </div>
    <div class="pbody">
      ${p.fastDelivery?'<span class="fast-tag">⚡ ৬০ মিনিট</span>':''}${p.cod?'<span class="cod-tag">✓ COD</span>':''}
      <div class="pname">${p.name}</div>
      <div class="prating"><span class="st">★</span> ${p.rating} (${bn(p.reviews)}) · ${bn(p.sold)} বিক্রি</div>
      <div><span class="price-now">${money(p.salePrice)}</span>${discount?`<span class="price-old">${money(p.price)}</span>`:''}<span class="unit-tag"> / ${p.unit}</span></div>
      <button class="add-btn" onclick="event.stopPropagation();Cart.add('${p.id}')">কার্টে যুক্ত করুন</button>
    </div>
  </div>`;
}