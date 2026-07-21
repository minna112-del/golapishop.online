/* router.js — Owner Auth (Firebase Auth secured) + page router */

const OwnerAuth = {
  currentUid: null,
  _verifiedThisSession: false,

  isUnlocked() {
    return Boolean(
      this.currentUid ||
      (
        typeof FB !== 'undefined' &&
        FB &&
        FB.auth &&
        FB.auth.currentUser &&
        this._verifiedThisSession
      )
    );
  },

  requestAccess() {
    const emailInput = document.getElementById('ownerEmail');
    const passwordInput = document.getElementById('ownerPassword');
    const messageElement = document.getElementById('ownerGateMsg');
    const modal = document.getElementById('ownerGateModal');

    if (emailInput) {
      emailInput.value = '';
    }

    if (passwordInput) {
      passwordInput.value = '';
    }

    if (messageElement) {
      messageElement.textContent = '';
      messageElement.className = 'form-msg';
    }

    if (modal) {
      modal.classList.add('show');
    }
  },

  cancel() {
    const modal = document.getElementById('ownerGateModal');

    if (modal) {
      modal.classList.remove('show');
    }
  },

  async unlock() {
    const emailInput = document.getElementById('ownerEmail');
    const passwordInput = document.getElementById('ownerPassword');
    const messageElement = document.getElementById('ownerGateMsg');

    const email = emailInput
      ? emailInput.value.trim()
      : '';

    const password = passwordInput
      ? passwordInput.value
      : '';

    if (!messageElement) {
      return;
    }

    if (!email || !password) {
      messageElement.textContent = 'ইমেইল ও পাসওয়ার্ড দিন';
      messageElement.className = 'form-msg err';
      return;
    }

    if (typeof FB === 'undefined' || !FB) {
      messageElement.textContent = 'সংযোগ সমস্যা';
      messageElement.className = 'form-msg err';
      return;
    }

    try {
      const credential = await FB.signInWithEmailAndPassword(
        FB.auth,
        email,
        password
      );

      const staffSnapshot = await FB.getDoc(
        FB.doc(
          FB.db,
          'staff',
          credential.user.uid
        )
      );

      const isAdmin =
        staffSnapshot.exists() &&
        staffSnapshot.data().role === 'admin';

      if (!isAdmin) {
        await FB.signOut(FB.auth).catch(() => {});

        messageElement.textContent =
          'এই অ্যাকাউন্ট অ্যাডমিন হিসেবে অনুমোদিত নয়';

        messageElement.className = 'form-msg err';
        return;
      }

      this.currentUid = credential.user.uid;
      this._verifiedThisSession = true;

      const modal = document.getElementById('ownerGateModal');

      if (modal) {
        modal.classList.remove('show');
      }

      Router.go('admin-dash');
    } catch (error) {
      messageElement.textContent =
        'লগইন ব্যর্থ: ইমেইল বা পাসওয়ার্ড সঠিক নয়';

      messageElement.className = 'form-msg err';
    }
  },

  async _restoreSession() {
    if (
      this.currentUid ||
      typeof FB === 'undefined' ||
      !FB ||
      !FB.auth ||
      !FB.auth.currentUser
    ) {
      return false;
    }

    try {
      const staffSnapshot = await FB.getDoc(
        FB.doc(
          FB.db,
          'staff',
          FB.auth.currentUser.uid
        )
      );

      const isAdmin =
        staffSnapshot.exists() &&
        staffSnapshot.data().role === 'admin';

      if (isAdmin) {
        this.currentUid = FB.auth.currentUser.uid;
        this._verifiedThisSession = true;
        return true;
      }
    } catch (error) {
      if (typeof devWarn === 'function') {
        devWarn(
          'owner session restore failed',
          error.message
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

    if (typeof toast === 'function') {
      toast('🔒 লক করা হয়েছে');
    }

    Router.go('home');
  }
};

const Router = {
  current: 'home',
  params: {},

  /*
   * SEO metadata
   *
   * Private বা checkout ধরনের page এখানে রাখা হয়নি।
   * যেমন:
   * checkout
   * account
   * myorders
   * order-success
   */

  seoMeta: {
    home: {
      path: '/',

      title:
        'Golapi Shop Online — নোয়াখালী সদর ও বেগমগঞ্জের অনলাইন শপ',

      desc:
        'নোয়াখালী সদর ও বেগমগঞ্জে মুদি, ঔষধ, গ্যাস ও দৈনন্দিন প্রয়োজনীয় পণ্য অর্ডার করুন অথবা নিজের বাজারের লিস্ট পাঠান। স্থানীয় ডেলিভারি ও সহজ পেমেন্ট।'
    },

    listing: {
      path: params => {
        return `/category/${params.cat || 'all'}`;
      },

      title: params => {
        const category = CATEGORIES.find(
          item => item.id === params.cat
        );

        const categoryName = category
          ? category.label
          : 'সব প্রোডাক্ট';

        return `${categoryName} — Golapi Shop Online`;
      },

      desc: params => {
        const category = CATEGORIES.find(
          item => item.id === params.cat
        );

        const categoryName = category
          ? category.label
          : 'সব প্রোডাক্ট';

        return `${categoryName} কিনুন Golapi Shop Online থেকে — নোয়াখালী সদর ও বেগমগঞ্জে হোম ডেলিভারি।`;
      }
    },

    product: {
      path: params => {
        return `/product/${params.id}`;
      },

      title: params => {
        const product = ALL_PRODUCTS.find(
          item => item.id === params.id
        );

        if (!product) {
          return 'প্রোডাক্ট — Golapi Shop Online';
        }

        return `${product.name} — ৳${product.salePrice} | Golapi Shop Online`;
      },

      desc: params => {
        const product = ALL_PRODUCTS.find(
          item => item.id === params.id
        );

        if (!product) {
          return '';
        }

        return (
          product.description ||
          `${product.name} — Golapi Shop Online থেকে হোম ডেলিভারিতে কিনুন।`
        );
      }
    },

    medical: {
      path: '/medical',

      title:
        'স্বাস্থ্য সেবা — Golapi Shop Online',

      desc:
        'বিশেষজ্ঞ চিকিৎসকদের তথ্য ও সিরিয়াল নেওয়ার সহায়তা দেখুন — নোয়াখালী সদর ও বেগমগঞ্জ।'
    },

    'custom-bazar': {
      path: '/custom-bazar',

      title:
        'কাস্টম বাজার — Golapi Shop Online',

      desc:
        'নিজের বাজারের লিস্ট পাঠান। আমাদের স্থানীয় টিম বাজার প্রস্তুত করে ডেলিভারির ব্যবস্থা করবে।'
    },

    contact: {
      path: '/contact',

      title:
        'যোগাযোগ — Golapi Shop Online',

      desc:
        'Golapi Shop Online-এর হটলাইন, শাখা ম্যানেজারের নম্বর ও ইমেইল দেখুন।'
    },

    'about-app': {
      path: '/about',

      title:
        'আমাদের গল্প — Golapi Shop Online',

      desc:
        'Golapi Shop Online কীভাবে শুরু হলো এবং আমাদের স্থানীয় টিমের সঙ্গে পরিচিত হন।'
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
        'Golapi Shop Online-এর গোপনীয়তা নীতি দেখুন।'
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

    const description =
      typeof meta.desc === 'function'
        ? meta.desc(params)
        : meta.desc;

    if (title) {
      document.title = title;
    }

    if (description) {
      let descriptionMeta = document.querySelector(
        'meta[name="description"]'
      );

      if (descriptionMeta) {
        descriptionMeta.setAttribute(
          'content',
          description
        );
      }
    }

    const canonical = document.querySelector(
      'link[rel="canonical"]'
    );

    if (canonical && path) {
      canonical.setAttribute(
        'href',
        `${window.location.origin}${path}`
      );
    }

    const openGraphTitle = document.querySelector(
      'meta[property="og:title"]'
    );

    if (openGraphTitle && title) {
      openGraphTitle.setAttribute(
        'content',
        title
      );
    }

    const openGraphDescription = document.querySelector(
      'meta[property="og:description"]'
    );

    if (openGraphDescription && description) {
      openGraphDescription.setAttribute(
        'content',
        description
      );
    }

    const openGraphUrl = document.querySelector(
      'meta[property="og:url"]'
    );

    if (openGraphUrl && path) {
      openGraphUrl.setAttribute(
        'content',
        `${window.location.origin}${path}`
      );
    }

    const twitterTitle = document.querySelector(
      'meta[name="twitter:title"]'
    );

    if (twitterTitle && title) {
      twitterTitle.setAttribute(
        'content',
        title
      );
    }

    const twitterDescription = document.querySelector(
      'meta[name="twitter:description"]'
    );

    if (twitterDescription && description) {
      twitterDescription.setAttribute(
        'content',
        description
      );
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

  async go(page, params = {}, options = {}) {
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

    const isLazyPage =
      window.__lazyPages &&
      window.__lazyPages.includes(page);

    const isLazyPageLoaded =
      window.__loadedLazyPages &&
      window.__loadedLazyPages[page];

    if (
      isLazyPage &&
      !isLazyPageLoaded &&
      typeof window.__ensureLazyPage === 'function'
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
      Boolean(options.skipHistory)
    );

    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({
        event: 'page_view',
        page_title: page,
        page_path: window.location.pathname
      });
    }

    document
      .querySelectorAll('.page')
      .forEach(pageElement => {
        pageElement.classList.remove('active');
      });

    const targetPage = document.getElementById(
      `page-${page}`
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

    if (
      page === 'listing' &&
      typeof Listing !== 'undefined'
    ) {
      Listing.render();
    }

    if (
      page === 'product' &&
      typeof PDP !== 'undefined'
    ) {
      PDP.load(params.id);
    }

    if (
      page === 'checkout' &&
      typeof Checkout !== 'undefined'
    ) {
      Checkout.init();
    }

    if (
      page === 'myorders' &&
      typeof MyOrders !== 'undefined'
    ) {
      MyOrders.render();
    }

    if (
      page === 'admin-dash' &&
      typeof AdminDash !== 'undefined'
    ) {
      AdminDash.render();
    }

    if (
      page === 'driver' &&
      typeof DriverPortal !== 'undefined'
    ) {
      DriverPortal.render();
    }

    if (
      page === 'zone-manager' &&
      typeof ZoneManagerDash !== 'undefined'
    ) {
      ZoneManagerDash.render();
    }

    if (
      page === 'home' &&
      typeof Home !== 'undefined'
    ) {
      Home.render();
    }

    if (
      page === 'medical' &&
      typeof Medical !== 'undefined'
    ) {
      Medical.render();
    }

    if (
      page === 'custom-bazar' &&
      typeof CustomBazar !== 'undefined'
    ) {
      CustomBazar.init();
    }

    if (
      page === 'account' &&
      typeof AccountPage !== 'undefined'
    ) {
      AccountPage.render();
    }

    if (
      page === 'account-addresses' &&
      typeof AccountPage !== 'undefined'
    ) {
      AccountPage.renderAddresses();
    }

    const isStaffPage = [
      'admin-dash',
      'zone-manager',
      'driver'
    ].includes(page);

    const chatButton =
      document.getElementById('chatBtn');

    if (chatButton) {
      chatButton.style.display =
        isStaffPage ? 'none' : 'flex';
    }

    const chatWindow =
      document.getElementById('chatWin');

    if (chatWindow) {
      chatWindow.classList.remove('show');
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
          isStaffPage ? 'none' : '';
      }
    });

    document.body.style.paddingBottom =
      isStaffPage ? '0' : '';
  }
};

Router.navigate = function(path) {
  window.history.pushState(
    {},
    '',
    path
  );

  const normalizedPath =
    path.toLowerCase();

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