/* router.js — Owner Auth (Firebase Auth secured) + page router */

const OwnerAuth = {
  currentUid: null,
  _verifiedThisSession: false,

  isUnlocked() {
    return !!this.currentUid ||
      (
        typeof FB !== 'undefined' &&
        FB &&
        FB.auth &&
        FB.auth.currentUser &&
        this._verifiedThisSession
      );
  },

  requestAccess() {
    document.getElementById('ownerEmail').value = '';
    document.getElementById('ownerPassword').value = '';
    document.getElementById('ownerGateMsg').className = 'form-msg';
    document.getElementById('ownerGateModal').classList.add('show');
  },

  cancel() {
    document.getElementById('ownerGateModal').classList.remove('show');
  },

  async unlock() {
    const email = document
      .getElementById('ownerEmail')
      .value
      .trim();

    const pass = document
      .getElementById('ownerPassword')
      .value;

    const msgEl = document.getElementById('ownerGateMsg');

    if (!email || !pass) {
      msgEl.textContent = 'ইমেইল ও পাসওয়ার্ড দিন';
      msgEl.className = 'form-msg err';
      return;
    }

    if (typeof FB === 'undefined' || !FB) {
      msgEl.textContent = 'সংযোগ সমস্যা';
      msgEl.className = 'form-msg err';
      return;
    }

    try {
      const cred = await FB.signInWithEmailAndPassword(
        FB.auth,
        email,
        pass
      );

      const staffSnap = await FB.getDoc(
        FB.doc(
          FB.db,
          'staff',
          cred.user.uid
        )
      );

      if (
        !staffSnap.exists() ||
        staffSnap.data().role !== 'admin'
      ) {
        await FB.signOut(FB.auth).catch(() => {});

        msgEl.textContent =
          'এই অ্যাকাউন্ট অ্যাডমিন হিসেবে অনুমোদিত নয়';

        msgEl.className = 'form-msg err';
        return;
      }

      this.currentUid = cred.user.uid;
      this._verifiedThisSession = true;

      document
        .getElementById('ownerGateModal')
        .classList
        .remove('show');

      Router.go('admin-dash');
    } catch (e) {
      msgEl.textContent =
        'লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়';

      msgEl.className = 'form-msg err';
    }
  },

  async _restoreSession() {
    if (
      this.currentUid ||
      typeof FB === 'undefined' ||
      !FB ||
      !FB.auth.currentUser
    ) {
      return false;
    }

    try {
      const staffSnap = await FB.getDoc(
        FB.doc(
          FB.db,
          'staff',
          FB.auth.currentUser.uid
        )
      );

      if (
        staffSnap.exists() &&
        staffSnap.data().role === 'admin'
      ) {
        this.currentUid = FB.auth.currentUser.uid;
        this._verifiedThisSession = true;
        return true;
      }
    } catch (e) {
      if (typeof devWarn === 'function') {
        devWarn(
          'owner session restore failed',
          e.message
        );
      }
    }

    return false;
  },

  async lock() {
    if (
      typeof FB !== 'undefined' &&
      FB
    ) {
      await FB.signOut(FB.auth).catch(() => {});
    }

    this.currentUid = null;
    this._verifiedThisSession = false;

    toast('🔒 লক করা হয়েছে');
    Router.go('home');
  }
};

const Router = {
  current: 'home',
  params: {},

  /*
   * প্রতিটি public page-এর জন্য shareable URL,
   * title এবং meta description।
   *
   * Checkout, account, myorders ও order-success-এর মতো
   * private page ইচ্ছাকৃতভাবে বাদ রাখা হয়েছে।
   */
  seoMeta: {
    home: {
      path: '/',

      title:
        'Golapi Shop Online — নোয়াখালী সদর ও বেগমগঞ্জের অনলাইন শপ',

      desc:
        'নোয়াখালী সদর ও বেগমগঞ্জে মুদি, ঔষধ, গ্যাস ও দৈনন্দিন প্রয়োজনীয় পণ্য অর্ডার করুন অথবা নিজের বাজারের লিস্ট পাঠান। স্থানীয় ডেলিভারি ও সহজ পেমেন্ট।'
    },

    listing: {
      path: p => `/category/${p.cat || 'all'}`,

      title: p => {
        const category = CATEGORIES.find(
          c => c.id === p.cat
        );

        return `${
          category?.label || 'সব প্রোডাক্ট'
        } — Golapi Shop Online`;
      },

      desc: p => {
        const category = CATEGORIES.find(
          c => c.id === p.cat
        );

        return `${
          category?.label || 'সব প্রোডাক্ট'
        } কিনুন Golapi Shop Online থেকে — নোয়াখালী সদর ও বেগমগঞ্জে হোম ডেলিভারি।`;
      }
    },

    product: {
      path: p => `/product/${p.id}`,

      title: p => {
        const product = ALL_PRODUCTS.find(
          item => item.id === p.id
        );

        return product
          ? `${product.name} — ৳${product.salePrice} | Golapi Shop Online`
          : 'প্রোডাক্ট — Golapi Shop Online';
      },

      desc: p => {
        const product = ALL_PRODUCTS.find(
          item => item.id === p.id
        );

        return product
          ? (
              product.description ||
              `${product.name} — Golapi Shop Online থেকে হোম ডেলিভারিতে কিনুন।`
            )
          : '';
      }
    },

    medical: {
      path: '/medical',

      title:
        'স্বাস্থ্য সেবা — Golapi Shop Online',

      desc:
        'বিশেষজ্ঞ চিকিৎসকদের তথ্য, সময়সূচি এবং সিরিয়াল নেওয়ার সহায়তা দেখুন—নোয়াখালী সদর ও বেগমগঞ্জ।'
    },

    'custom-bazar': {
      path: '/custom-bazar',

      title:
        'কাস্টম বাজার — Golapi Shop Online',

      desc:
        'নিজের বাজারের লিস্ট পাঠান। আমাদের স্থানীয় টিম বাজার প্রস্তুত করে আপনার ঠিকানায় ডেলিভারির ব্যবস্থা করবে।'
    },

    contact: {
      path: '/contact',

      title:
        'যোগাযোগ — Golapi Shop Online',

      desc:
        'Golapi Shop Online-এর হটলাইন, শাখা ম্যানেজারের ফোন নম্বর এবং ইমেইল দেখুন।'
    },

    'about-app': {
      path: '/about',

      title:
        'আমাদের গল্প — Golapi Shop Online',

      desc:
        'Golapi Shop Online কীভাবে শুরু হলো এবং আমাদের স্থানীয় টিমের সঙ্গে পরিচিত হন।'
    },

    terms: {
      path: '/terms',

      title:
        'শর্তাবলী — Golapi Shop Online',

      desc:
        'Golapi Shop Online ব্যবহারের শর্তাবলী দেখুন।'
    },

    'privacy-info': {
      path: '/privacy',

      title:
        'প্রাইভেসি পলিসি — Golapi Shop Online',

      desc:
        'Golapi Shop Online-এর গোপনীয়তা নীতি দেখুন।'
    }
  },

  updateSeoTags(page, params, skipHistory) {
    const meta = this.seoMeta[page];

    if (!meta) {
      return;
    }

    const path =
      typeof meta.path === 'function'
        ? meta.path(params)
        : meta.path;

    const title =
      typeof meta.title === 'function'
        ? meta.title(params)
        : meta.title;

    const desc =
      typeof meta.desc === 'function'
        ? meta.desc(params)
        : meta.desc;

    if (title) {
      document.title = title;
    }

    if (desc) {
      const descriptionMeta = document.querySelector(
        'meta[name="description"]'
      );

      if (descriptionMeta) {
        descriptionMeta.setAttribute(
          'content',
          desc
        );
      }

      const ogDescription = document.querySelector(
        'meta[property="og:description"]'
      );

      if (ogDescription) {
        ogDescription.setAttribute(
          'content',
          desc
        );
      }

      const twitterDescription = document.querySelector(
        'meta[name="twitter:description"]'
      );

      if (twitterDescription) {
        twitterDescription.setAttribute(
          'content',
          desc
        );
      }
    }

    if (title) {
      const ogTitle = document.querySelector(
        'meta[property="og:title"]'
      );

      if (ogTitle) {
        ogTitle.setAttribute(
          'content',
          title
        );
      }

      const twitterTitle = document.querySelector(
        'meta[name="twitter:title"]'
      );

      if (twitterTitle) {
        twitterTitle.setAttribute(
          'content',
          title
        );
      }
    }

    if (path) {
      const absoluteUrl =
        `${window.location.origin}${path}`;

      const canonical = document.querySelector(
        'link[rel="canonical"]'
      );

      if (canonical) {
        canonical.setAttribute(
          'href',
          absoluteUrl
        );
      }

      const ogUrl = document.querySelector(
        'meta[property="og:url"]'
      );

      if (ogUrl) {
        ogUrl.setAttribute(
          'content',
          absoluteUrl
        );
      }
    }

    if (
      !skipHistory &&
      path &&
      window.location.pathname !== path
    ) {
      history.pushState(
        {
          page,
          params
        },
        '',
        path
      );
    }
  },

  async go(page, params = {}, opts = {}) {
    if (
      page === 'admin-dash' &&
      !OwnerAuth.isUnlocked()
    ) {
      const restored =
        await OwnerAuth._restoreSession();

      if (!restored) {
        OwnerAuth.requestAccess();
        return;
      }
    }

    /*
     * Staff page হলে প্রয়োজনীয় HTML fragment
     * আগে lazy load করা হয়।
     */
    if (
      window.__lazyPages &&
      window.__lazyPages.includes(page) &&
      !window.__loadedLazyPages[page]
    ) {
      await new Promise(resolve => {
        window.__ensureLazyPage(
          page,
          resolve
        );
      });
    }

    this.current = page;
    this.params = params;

    this.updateSeoTags(
      page,
      params,
      !!opts.skipHistory
    );

    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({
        event: 'page_view',
        page_title: page,
        page_path: '/#' + page
      });
    }

    document
      .querySelectorAll('.page')
      .forEach(pageElement => {
        pageElement.classList.remove('active');
      });

    const targetPage = document.getElementById(
      'page-' + page
    );

    if (targetPage) {
      targetPage.classList.add('active');
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    const navMap = {
      home: 0,
      listing: 1,
      checkout: 2,
      myorders: 3,
      product: 1
    };

    document
      .querySelectorAll('#custMobNav a')
      .forEach((navItem, index) => {
        navItem.classList.toggle(
          'active',
          index === (navMap[page] ?? -1)
        );
      });

    if (page === 'listing') {
      Listing.render();
    }

    if (page === 'product') {
      PDP.load(params.id);
    }

    if (page === 'checkout') {
      Checkout.init();
    }

    if (page === 'myorders') {
      MyOrders.render();
    }

    if (page === 'admin-dash') {
      AdminDash.render();
    }

    if (page === 'driver') {
      DriverPortal.render();
    }

    if (page === 'zone-manager') {
      ZoneManagerDash.render();
    }

    if (page === 'home') {
      Home.render();
    }

    if (page === 'medical') {
      Medical.render();
    }

    if (page === 'custom-bazar') {
      CustomBazar.init();
    }

    if (page === 'account') {
      AccountPage.render();
    }

    if (page === 'account-addresses') {
      AccountPage.renderAddresses();
    }

    const staffPage = [
      'admin-dash',
      'zone-manager',
      'driver'
    ].includes(page);

    const chatBtn =
      document.getElementById('chatBtn');

    if (chatBtn) {
      chatBtn.style.display =
        staffPage ? 'none' : 'flex';
    }

    const chatWin =
      document.getElementById('chatWin');

    if (chatWin) {
      chatWin.classList.remove('show');
    }

    [
      'custTopbar',
      'custHeader',
      'custMobNav',
      'custFooter'
    ].forEach(id => {
      const element =
        document.getElementById(id);

      if (element) {
        element.style.display =
          staffPage ? 'none' : '';
      }
    });

    document.body.style.paddingBottom =
      staffPage ? '0' : '';
  }
};

Router.navigate = function(path) {
  const normalizedPath =
    String(path || '/').toLowerCase();

  if (normalizedPath === '/driver') {
    Router.go(
      'driver',
      {},
      {
        skipHistory: true
      }
    );

    return;
  }

  if (
    normalizedPath === '/manager' ||
    normalizedPath === '/zone-manager'
  ) {
    Router.go(
      'zone-manager',
      {},
      {
        skipHistory: true
      }
    );

    return;
  }

  Router.go(
    'home',
    {},
    {
      skipHistory: true
    }
  );
};