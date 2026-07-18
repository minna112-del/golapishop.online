/* data.js — product store, Firestore sync, product card render */
let ALL_PRODUCTS = [];

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
      const real=[]; snap.forEach(d=>real.push(this.mapDoc(d.id, d.data())));
      ALL_PRODUCTS = real.filter(p=>p.status==='active');
      this.loaded = true;
    }catch(e){ devWarn('refresh failed', e.message); }
    Home.render();
    if(Router.current==='listing') Listing.render();
    return true;
  }
};

function pcardHTML(p){
  const discount = p.price>p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
  const ratingLine = p.reviews>0
    ? `<span class="st">★</span> ${p.rating} (${bn(p.reviews)}) · ${bn(p.sold)} বিক্রি`
    : `<span style="color:#22c55e;font-weight:600">🆕 নতুন প্রোডাক্ট</span>`;
  return `<div class="pcard" onclick="Router.go('product',{id:'${p.id}'})">
    <div class="imgwrap"><img src="${p.img}" alt="${p.name}" loading="lazy">
      ${discount?`<span class="pbadge">-${bn(discount)}%</span>`:''}
      ${p.isFeatured?`<span class="pbadge gold" style="left:auto;right:8px;top:${discount?'40px':'8px'}">★</span>`:''}
      <button class="wish" onclick="event.stopPropagation();Wishlist.toggle('${p.id}')">🤍</button>
    </div>
    <div class="pbody">
      ${p.fastDelivery?'<span class="fast-tag">🚴 লোকাল ডেলিভারি</span>':''}${p.cod?'<span class="cod-tag">✓ COD</span>':''}
      <div class="pname">${p.name}</div>
      <div class="prating">${ratingLine}</div>
      <div><span class="price-now">${money(p.salePrice)}</span>${discount?`<span class="price-old">${money(p.price)}</span>`:''}<span class="unit-tag"> / ${p.unit}</span></div>
      <button class="add-btn" onclick="event.stopPropagation();Cart.add('${p.id}')">কার্টে যুক্ত করুন</button>
    </div>
  </div>`;
}