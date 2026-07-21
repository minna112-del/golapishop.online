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
      id, name:d.name||'নামহন প্রোডাক্ট', category:d.category||'grocery', zone:d.zone||'noakhali_sadar',
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
    // ⚠️ onSnapshot একটা persistent streaming connection ব্যবহার করে, যেটা কিছু
    // ad-blocker/privacy extension/নেটওয়ার্ক ফিল্টার ট্র্যাকার ভেবে ব্লক করে দেয় —
    // যদও একই ডেটা সাধারণ one-time request (getDocs) দিয়ে ঠিকই পড়া যায়। তাই ৫ সেকেন্ডর
    // মধ্যে streaming থেকে ডেটা না এলে, সরাসরি getDocs() fallback দিয়ে অন্তত প্রথমবার
    // ডেটা দেখানো নিশ্চিত করা হচ্ছে — লাইভ আপডেট না পেলেও পণ্য অন্তত দেখা যাবে।
    let delivered = false;
    const fallbackTimer = setTimeout(async ()=>{
      if(delivered) return;
      devWarn('onSnapshot timeout — falling back to getDocs()');
      const ok = await this.refreshAndRerender();
      if(ok && this.loaded){
        toast('✓ পণ্য লোড হয়েছে (লাইভ সংযোগে দরি হচ্ছিল, তাই এক-বারের জন্য সরাসরি লোড করা হল)','success');
      } else {
        toast('⚠ প্রোডাক্ট লোড হতে সমস্যা হচ্ছে — ইন্টারনেট সংযোগ চেক করুন বা পেজ রিফ্রেশ করুন','error');
      }
    }, 5000);
    try{
      this.unsubscribe = FB.onSnapshot(FB.collection(FB.db,'products'), snap=>{
        delivered = true;
        clearTimeout(fallbackTimer);
        const real=[];
        snap.forEach(d=>real.push(this.mapDoc(d.id, d.data())));
        ALL_PRODUCTS = real.filter(p=>p.status==='active');
        this.loaded = true;
        if(Router.current==='home') Home.render();
        if(Router.current==='listing') Listing.render();
        if(Router.current==='product' && PDP.product) PDP.load(PDP.product.id);
      }, err=>{
        clearTimeout(fallbackTimer);
        devWarn('live sync error', err.message);
        // ⚠️ এতদিন এই error শুধু devWarn-এ (production-এ invisible) লগ হতো, ইউজর
        // কখনো জানতোই না কেন পণ্য দেখাচ্ছে না। এখন সরাসরি toast-এ আসল কারণ দেখান হয়
        // (permission-denied মানে Firestore Security Rules ব্লক করছে, ইত্যাদি)।
        toast('⚠ প্রোডাক্ট লোড ব্যর্থ: ' + (err.code || err.message || 'অজানা কারণ'), 'error');
        // onSnapshot সরাসরি error দিলেও (যেমন blocked), getDocs() দিয়ে একবার চেষ্টা করা হয
        this.refreshAndRerender();
      });
    }catch(e){
      clearTimeout(fallbackTimer);
      devWarn('sync start failed', e.message);
      toast('⚠ প্রোডাক্ট সংযোগ শুরু করা যায়নি: ' + e.message, 'error');
    }
  },
async refreshAndRerender() {
  if (!FB) {
    devWarn('Firebase is not initialized');
    return false;
  }

  try {
    const snap = await FB.getDocs(
      FB.collection(FB.db, 'products')
    );

    const real = [];

    snap.forEach(docSnap => {
      real.push(
        this.mapDoc(
          docSnap.id,
          docSnap.data()
        )
      );
    });

    const activeProducts = real.filter(
      product => product.status === 'active'
    );

    /*
     * Firebase থেকে সফলভাবে ডেটা এলে তবেই
     * বর্তমান পণ্যের তালিকা পরিবর্তন করবে।
     */
    ALL_PRODUCTS = activeProducts;
    this.loaded = true;

    Home.render();

    if (Router.current === 'listing') {
      Listing.render();
    }

    return true;

  } catch (error) {
    /*
     * Error হলে আগের পণ্য মুছবে না।
     * loaded=true-ও করবে না।
     */
    devWarn(
      'refresh failed',
      error.code || error.message
    );

    console.error(
      'Product refresh failed:',
      error
    );

    return false;
  }
}

function pcardHTML(p){
  const discount = p.price>p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
  const inStock = Number(p.stock)>0;
  const wished = typeof Wishlist!=='undefined' && Wishlist.has(p.id);
  const ratingLine = p.reviews>0
    ? `<span class="st" aria-hidden="true">★</span> <span>${p.rating}</span> <span>(${bn(p.reviews)})</span><span class="rating-sep" aria-hidden="true">·</span><span>${bn(p.sold)} বিক্রি</span>`
    : `<span class="product-new-label">নতুন প্রোডাক্ট</span>`;
  const stockLabel = inStock
    ? `<span class="product-stock is-available">স্টকে আছে</span>`
    : `<span class="product-stock is-unavailable">স্টক শেষ</span>`;
  const deliveryTags = `${p.fastDelivery?'<span class="fast-tag">লোকাল ডেলিভারি</span>':''}${p.cod?'<span class="cod-tag">COD</span>':''}`;

  return `<article class="pcard${inStock?'':' is-out-of-stock'}" onclick="Router.go('product',{id:'${p.id}'})" tabindex="0" role="link" aria-label="${p.name} দেখুন" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Router.go('product',{id:'${p.id}'})}">
    <div class="imgwrap">
      <img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async">
      <div class="product-badges">
        ${discount?`<span class="pbadge">${bn(discount)}% ছাড়</span>`:''}
        ${p.isFeatured?`<span class="pbadge gold">নির্বাচিত</span>`:''}
      </div>
      <button class="wish${wished?' is-active':''}" type="button" data-product-id="${p.id}" aria-label="${wished?'উইশলিস্ট থেকে সরান':'উইশলিস্টে যোগ করুন'}" aria-pressed="${wished?'true':'false'}" onclick="event.stopPropagation();Wishlist.toggle('${p.id}')">${wished?'❤️':'🤍'}</button>
      ${!inStock?'<span class="stock-overlay">বর্তমানে নেই</span>':''}
      <span class="brand-seal"><img src="icons/head_logo.webp" alt="" aria-hidden="true"></span>
    </div>
    <div class="pbody">
      <div class="product-meta-row">${deliveryTags}${stockLabel}</div>
      <h3 class="pname">${p.name}</h3>
      <div class="prating" aria-label="পণ্যের রেটিং ও বিক্রির তথ্য">${ratingLine}</div>
      <div class="product-price-row">
        <div class="product-price-main"><span class="price-now">${money(p.salePrice)}</span><span class="unit-tag">/ ${p.unit}</span></div>
        ${discount?`<span class="price-old">${money(p.price)}</span>`:''}
      </div>
      <button class="add-btn" type="button" ${inStock?'':'disabled aria-disabled="true"'} onclick="event.stopPropagation();${inStock?`Cart.add('${p.id}')`:''}">
        <span aria-hidden="true">${inStock?'＋':'—'}</span>${inStock?'কার্টে যোগ করুন':'স্টক শেষ'}
      </button>
    </div>
  </article>`;
}