/* data.js — product store, Firestore sync, product card render */

let ALL_PRODUCTS = [];

function zoneProducts() {
  /* ⚠️ আগে প্রতিটা প্রোডাক্টের জন্য আবার পুরো তালিকা filter করা হতো (O(n²)) —
     প্রোডাক্ট বাড়লে ধীর হয়ে যেতো। এখন এক পাসে group করে হিসাব হয় (O(n))। */
  const byGroup = new Map(), byKey = new Map(), order = [];
  for (const p of ALL_PRODUCTS) {
    if (p.groupId) {
      if (!byGroup.has(p.groupId)) { byGroup.set(p.groupId, { first: p, stock: 0 }); order.push({ t: 'g', k: p.groupId }); }
      byGroup.get(p.groupId).stock += (p.stock || 0);
    } else {
      const key = `${p.name.trim().toLowerCase()}|${p.category}|${p.salePrice}`;
      if (!byKey.has(key)) { byKey.set(key, { first: p, stock: 0, count: 0 }); order.push({ t: 'k', k: key }); }
      const e = byKey.get(key); e.stock += (p.stock || 0); e.count++;
    }
  }
  return order.map(o => {
    if (o.t === 'g') { const e = byGroup.get(o.k); return { ...e.first, stock: e.stock }; }
    const e = byKey.get(o.k);
    return e.count > 1 ? { ...e.first, stock: e.stock } : e.first;
  });
}

const ProductStore = {
  loaded: false,
  unsubscribe: null,

  mapDoc(id, d) {
    return {
      id,
      name: d.name || 'নামহীন প্রোডাক্ট',
      category: d.category || 'grocery',
      zone: d.zone || 'noakhali_sadar',
      unit: d.unit || 'পিস',

      price: Number(d.price) || 0,
      salePrice: Number(d.salePrice ?? d.price) || 0,

      rating: d.rating || '৫.০',
      reviews: d.reviews || 0,
      sold: d.sold || 0,

      cod: d.cod !== false,

      img:
        d.imageUrl ||
        GOLAPI_IMG_PLACEHOLDER,
      imgSmall: d.imageUrlSmall || null,
      imgBlur: d.imageBlurDataUrl || null,

      isFlash: !!d.isFlash,
      isFeatured: !!d.isFeatured,
      fastDelivery: d.fastDelivery !== false,

      stock: Number(d.stock) || 0,
      description: d.description || '',
      status: d.status || 'active',

      groupId: d.groupId || null,
      costPrice: d.costPrice || 0,
      extraCost: d.extraCost || 0,
      deliveryPercent: d.deliveryPercent || 0,
      profitPercent: d.profitPercent || 20
    };
  },

  CACHE_KEY: 'golapi_products_cache_v1',

  /* আগের সফল লোডের প্রোডাক্ট localStorage-এ সেভ করা হয় — পরের ভিজিটে
     Firestore সংযোগের অপেক্ষা না করেই এগুলো সাথে সাথে দেখানো হয় (skeleton
     প্রায় দেখাই যায় না), তারপর live ডেটা এলে নীরবে সেটা দিয়ে replace হয়।
     ধীর নেটওয়ার্কের কাস্টমারদের জন্য এটাই সবচেয়ে বড় গতির উন্নতি। */
  saveCache(){
    try{ localStorage.setItem(this.CACHE_KEY, JSON.stringify(ALL_PRODUCTS)); }catch(e){}
  },
  loadFromCache(){
    try{
      const raw = localStorage.getItem(this.CACHE_KEY);
      if(!raw) return false;
      const cached = JSON.parse(raw);
      if(!Array.isArray(cached) || cached.length === 0) return false;
      ALL_PRODUCTS = cached;
      this.loaded = true;
      if (Router.current === 'home') Home.render();
      if (Router.current === 'listing') Listing.render();
      return true;
    }catch(e){ return false; }
  },

  startLiveSync() {
    if (!FB || this.unsubscribe) { return; }

    // ক্যাশ থেকে সাথে সাথে দেখানো (থাকলে) — নেটওয়ার্কের অপেক্ষা নেই
    const hadCache = this.loadFromCache();

    let delivered = false;

    // ⚠️ বাংলাদেশে অনেক কাস্টমারের নেটওয়ার্ক স্পিড খুবই কম (যেমন 2-3 KB/s,
    // যদিও 4G দেখায়) — এমন নেটওয়ার্কে Firestore সংযোগ স্থাপন করতেই ৫-১০ সেকেন্ড
    // লেগে যেতে পারে, যেটা কোনো bug না, স্বাভাবিক ধীরগতি। তাই প্রথমে দীর্ঘ সময়
    // (১২ সেকেন্ড) অপেক্ষা করা হয়, আর fallback ব্যর্থ হলেও ৩ বার পর্যন্ত আবার
    // চেষ্টা করা হয় (প্রতিবার একটু বেশি সময় দিয়ে) — একবার ব্যর্থ হলেই "সমস্যা
    // হচ্ছে" বলে থেমে যাওয়া হয় না।
    const fallbackTimer = setTimeout(async () => {
      if (delivered) return;
      devWarn('onSnapshot timeout — falling back to getDocs() with retry');
      await this.refreshWithRetry();
    }, hadCache ? 15000 : 6000); // ক্যাশ দেখানো থাকলে তাড়া নেই; না থাকলে দ্রুত fallback

    try {
      this.unsubscribe = FB.onSnapshot(
        FB.query(FB.collection(FB.db, 'products'), FB.limit(300)),

        snap => {
          delivered = true;
          clearTimeout(fallbackTimer);

          const real = [];

          snap.forEach(docSnap => {
            real.push(
              this.mapDoc(
                docSnap.id,
                docSnap.data()
              )
            );
          });

          ALL_PRODUCTS = real.filter(
            product => product.status === 'active'
          );

          this.loaded = true;
          this.saveCache();

          if (Router.current === 'home') {
            Home.render();
          }

          if (Router.current === 'listing') {
            Listing.render();
          }

          if (
            Router.current === 'product' &&
            PDP.product
          ) {
            PDP.load(PDP.product.id);
          }
        },

        error => {
          clearTimeout(fallbackTimer);

          devWarn(
            'live sync error',
            error.message
          );

          toast(
            '⚠ প্রোডাক্ট লোড ব্যর্থ: ' +
              (
                error.code ||
                error.message ||
                'অজানা কারণ'
              ),
            'error'
          );

          this.refreshWithRetry();
        }
      );
    } catch (error) {
      clearTimeout(fallbackTimer);

      devWarn(
        'sync start failed',
        error.message
      );

      toast(
        '⚠ প্রোডাক্ট সংযোগ শুরু করা যায়নি: ' +
          error.message,
        'error'
      );
    }
  },

  async refreshWithRetry() {
    // ধীর নেটওয়ার্কে একবার getDocs() ব্যর্থ হলেই থেমে না গিয়ে,
    // ক্রমবর্ধমান বিরতিতে (৩, ৬, ১২ সেকেন্ড) সর্বোচ্চ ৩ বার আবার চেষ্টা করা হয়।
    const delays = [0, 3000, 6000, 12000];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (attempt > 0) {
        toast(`⏳ ইন্টারনেট সংযোগ ধীর মনে হচ্ছে, আবার চেষ্টা করা হচ্ছে (${attempt}/${delays.length - 1})...`, 'info');
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
      const ok = await this.refreshAndRerender();
      if (ok && this.loaded && ALL_PRODUCTS.length > 0) {
        if (attempt > 0) toast('✓ পণ্য লোড হয়েছে', 'success');
        return;
      }
    }
    // সব চেষ্টার পরও ব্যর্থ হলে — স্পষ্টভাবে জানানো, কিন্তু আশ্বস্ত করে
    toast('⚠ ইন্টারনেট সংযোগ খুবই ধীর — একটু পর আবার পেজ খুলুন, অথবা ওয়াইফাই/ভালো নেটওয়ার্কে চেষ্টা করুন', 'error');
  },

  async refreshAndRerender() {
    if (!FB) return false;

    try {
      const snap = await FB.getDocs(
        FB.query(FB.collection(FB.db, 'products'), FB.limit(300))
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

      ALL_PRODUCTS = real.filter(
        product => product.status === 'active'
      );

      this.loaded = true;
          this.saveCache();

      Home.render();

      if (Router.current === 'listing') {
        Listing.render();
      }

      return true;
    } catch (error) {
      devWarn(
        'refresh failed',
        error.message
      );

      return false;
    }
  }
};

function pcardHTML(p, idx) {
  // ⚠️ আগে সব প্রোডাক্ট ছবিই lazy ছিল, প্রথম row-এর (above-the-fold, সাথে সাথে
  // দৃশ্যমান) ছবিও — তাই সেগুলোও অকারণে দেরিতে লোড হতো। এখন প্রথম ৪টা কার্ড
  // (যেকোনো grid-এর শুরুর, index 0-3) eager+fetchpriority="high" পায়।
  const isPriority = typeof idx === 'number' && idx < 4;
  const discount =
    p.price > p.salePrice
      ? Math.round(
          (1 - p.salePrice / p.price) * 100
        )
      : 0;

  const inStock = Number(p.stock) > 0;

  const wished =
    typeof Wishlist !== 'undefined' &&
    Wishlist.has(p.id);

  const ratingLine =
    p.reviews > 0
      ? `
        <span class="st" aria-hidden="true">★</span>
        <span>${p.rating}</span>
        <span>(${bn(p.reviews)})</span>
        <span class="rating-sep" aria-hidden="true">·</span>
        <span>${bn(p.sold)} বিক্রি</span>
      `
      : `
        <span class="product-new-label">
          নতুন প্রোডাক্ট
        </span>
      `;

  const stockLabel = inStock
    ? `
      <span class="product-stock is-available">
        স্টকে আছে
      </span>
    `
    : `
      <span class="product-stock is-unavailable">
        স্টক শেষ
      </span>
    `;

  const deliveryTags = `
    ${
      p.fastDelivery
        ? '<span class="fast-tag">লোকাল ডেলিভারি</span>'
        : ''
    }
    ${
      p.cod
        ? '<span class="cod-tag">COD</span>'
        : ''
    }
  `;

  return `
    <article
      class="pcard${inStock ? '' : ' is-out-of-stock'}"
      onclick="Router.go('product',{id:'${p.id}'})"
      tabindex="0"
      role="link"
      aria-label="${esc(p.name)} দেখুন"
      onkeydown="
        if(
          event.key === 'Enter' ||
          event.key === ' '
        ){
          event.preventDefault();
          Router.go('product',{id:'${p.id}'});
        }
      "
    >
      <div class="imgwrap"${p.imgBlur ? ` style="background-image:url('${esc(p.imgBlur)}');background-size:cover"` : ''}>
        <img
          src="${safeImgSrc(p.img)}"
          ${p.imgSmall ? `srcset="${safeImgSrc(p.imgSmall)} 400w, ${safeImgSrc(p.img)} 800w" sizes="(max-width: 480px) 45vw, 220px"` : ''}
          alt="${esc(p.name)}"
          loading="${isPriority ? 'eager' : 'lazy'}"
          ${isPriority ? 'fetchpriority="high"' : ''}
          decoding="async"
          width="400"
          height="400"
        >

        <div class="product-badges">
          ${
            discount
              ? `
                <span class="pbadge">
                  ${bn(discount)}% ছাড়
                </span>
              `
              : ''
          }

          ${
            p.isFeatured
              ? `
                <span class="pbadge gold">
                  নির্বাচিত
                </span>
              `
              : ''
          }
        </div>

        <button
          class="wish${wished ? ' is-active' : ''}"
          type="button"
          data-product-id="${p.id}"
          aria-label="${
            wished
              ? 'উইশলিস্ট থেকে সরান'
              : 'উইশলিস্টে যোগ করুন'
          }"
          aria-pressed="${wished ? 'true' : 'false'}"
          onclick="
            event.stopPropagation();
            Wishlist.toggle('${p.id}')
          "
        >
          ${wished ? '❤️' : '🤍'}
        </button>

        ${
          !inStock
            ? `
              <span class="stock-overlay">
                বর্তমানে নেই
              </span>
            `
            : ''
        }

        <span class="brand-seal" aria-hidden="true"></span>
      </div>

      <div class="pbody">
        <div class="product-meta-row">
          ${deliveryTags}
          ${stockLabel}
        </div>

        <h3 class="pname">
          ${esc(p.name)}
        </h3>

        <div
          class="prating"
          aria-label="পণ্যের রেটিং ও বিক্রির তথ্য"
        >
          ${ratingLine}
        </div>

        <div class="product-price-row">
          <div class="product-price-main">
            <span class="price-now">
              ${money(p.salePrice)}
            </span>

            <span class="unit-tag">
              / ${p.unit}
            </span>
          </div>

          ${
            discount
              ? `
                <span class="price-old">
                  ${money(p.price)}
                </span>
              `
              : ''
          }
        </div>

        <button
          class="add-btn"
          type="button"
          ${
            inStock
              ? ''
              : 'disabled aria-disabled="true"'
          }
          onclick="
            event.stopPropagation();
            ${
              inStock
                ? `Cart.add('${p.id}')`
                : ''
            }
          "
        >
          <span aria-hidden="true">
            ${inStock ? '＋' : '—'}
          </span>

          ${
            inStock
              ? 'কার্টে যোগ করুন'
              : 'স্টক শেষ'
          }
        </button>
      </div>
    </article>
  `;
}