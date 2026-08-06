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

      if (typeof StaffChat !== 'undefined') {
        StaffChat.init(cred.user.uid, staffSnap.data().name || 'Owner', 'admin');
      }

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
        if (typeof StaffChat !== 'undefined') {
          StaffChat.init(this.currentUid, staffSnap.data().name || 'Owner', 'admin');
        }
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
  staffPaths: {
    'admin-dash': '/admin',
    driver: '/driver',
    'zone-manager': '/zone-manager',
    'inventory-dash': '/inventory',
    'finance-dash': '/finance',
    'support-dash': '/support',
    'procurement-dash': '/procurement',
    'warehouse-dash': '/warehouse',
    'analytics-dash': '/analytics',
    'company-settings': '/company-settings',
    'documents-dash': '/documents',
    'attendance-dash': '/attendance',
    'payroll-dash': '/payroll',
    'branch-dash': '/branches',
    'crm-dash': '/crm',
    'company-os': '/company-os',
    'ai-control': '/ai-control',
    'hr-erp': '/hr-erp',
    'finance-erp': '/finance-erp',
    'warehouse-erp': '/warehouse-erp',
    'marketing-erp': '/marketing-erp',
    'workflow-erp': '/workflow-erp',
    'bi-erp': '/bi-erp',
    'asset-erp': '/asset-erp',
    'crm-erp': '/crm-erp',
    'procurement-erp': '/procurement-erp',
    'facilities-erp': '/facilities-erp'
  },

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

    const path = meta
      ? (typeof meta.path === 'function' ? meta.path(params) : meta.path)
      : this.staffPaths[page];

    const title =
      typeof meta?.title === 'function'
        ? meta.title(params)
        : meta?.title;

    const desc =
      typeof meta?.desc === 'function'
        ? meta.desc(params)
        : meta?.desc;

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
    /* ⚠️ admin/driver/zone-manager/payment/sms/memo/livemap আগে সবার জন্যই
       প্রথম লোডে ডাউনলোড হতো। এখন শুধু সংশ্লিষ্ট পেজে গেলেই লোড হয়। */
    const scriptMap = {
      'admin-dash': ['./js/admin.js', './js/staff-chat.js', './js/employee-workspace.js', './js/employee-management.js'],
      'driver': ['./js/driver.js', './js/livemap.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'zone-manager': ['./js/zone-manager.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'inventory-dash': ['./js/inventory.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'finance-dash': ['./js/finance.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'support-dash': ['./js/support.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'procurement-dash': ['./js/procurement.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'warehouse-dash': ['./js/warehouse.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'analytics-dash': ['./js/analytics.js', './js/staff-chat.js', './js/employee-workspace.js'],
      'company-settings': ['./js/company-settings.js', './js/employee-workspace.js'],
      'documents-dash': ['./js/documents.js', './js/employee-workspace.js'],
      'attendance-dash': ['./js/attendance.js', './js/employee-workspace.js'],
      'payroll-dash': ['./js/payroll.js', './js/employee-workspace.js'],
      'branch-dash': ['./js/branch.js', './js/employee-workspace.js'],
      'crm-dash': ['./js/crm.js', './js/employee-workspace.js'],
      'company-os': ['./js/company-os.js'],
      'ai-control': ['./js/ai-control.js', './js/employee-workspace.js'],
      'hr-erp': ['./js/hr-erp.js', './js/employee-workspace.js'],
      'finance-erp': ['./js/finance-erp.js', './js/employee-workspace.js'],
      'warehouse-erp': ['./js/warehouse-erp.js', './js/employee-workspace.js'],
      'marketing-erp': ['./js/marketing-erp.js', './js/employee-workspace.js'],
      'workflow-erp': ['./js/workflow-erp.js', './js/employee-workspace.js'],
      'bi-erp': ['./js/bi-erp.js', './js/employee-workspace.js'],
      'asset-erp': ['./js/asset-erp.js', './js/employee-workspace.js'],
      'crm-erp': ['./js/crm-erp.js', './js/employee-workspace.js'],
      'procurement-erp': ['./js/procurement-erp.js', './js/employee-workspace.js'],
      'facilities-erp': ['./js/facilities-erp.js', './js/employee-workspace.js'],
      'checkout': ['./js/checkout.js', './js/payment.js', './js/sms.js'],
      'custom-bazar': ['./js/custom-bazar.js', './js/memo.js'],
      'myorders': ['./js/memo.js', './js/livemap.js']
    };
    if(scriptMap[page]){
      await Promise.all(scriptMap[page].map(src => window.loadScriptOnce(src).catch(()=>{})));
    }

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

    const routeTarget = document.getElementById('page-' + page);
    if (!routeTarget) {
      if (typeof toast === 'function') {
        toast('এই Workspace-এর প্রয়োজনীয় ফাইল পাওয়া যায়নি', 'error');
      }
      if (page !== 'home') {
        return this.go('home');
      }
      return;
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

    const targetPage = routeTarget;

    if (targetPage) {
      targetPage.classList.add('active');
    }

    // ⚠️ আগে applyLang() শুধু প্রথম পেজ লোডে একবারই চলতো — অন্য পেজে গেলে
    // (বিশেষত lazy-loaded পেজ, যেগুলো এইমাত্র DOM-এ যোগ হলো) নতুন data-bn/
    // data-en এলিমেন্টগুলো কখনো ভাষা-প্রয়োগ পেতোই না, তাই ইংরেজি মোডে থাকা
    // অবস্থায় নতুন পেজে গেলে সেটা বাংলাতেই থেকে যেত। এখন প্রতিটা navigation-এ
    // চলে, তাই সব পেজ সবসময় সঠিক ভাষায় দেখাবে।
    if (typeof applyLang === 'function') applyLang();

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

    if (page === 'wishlist') {
      Wishlist.render();
    }

    if (page === 'order-success') {
      OrderSuccess.render();
    }

    if (page === 'admin-dash') {
      AdminDash.render();
      if(typeof EmployeeWorkspace!=='undefined') EmployeeWorkspace.mountCurrent('adminEmployeeWorkspace');
    }

    if (page === 'driver') {
      DriverPortal.render();
    }

    if (page === 'zone-manager') {
      ZoneManagerDash.render();
    }

    if (page === 'inventory-dash') {
      InventoryDash.render();
    }

    if (page === 'finance-dash') {
      FinanceDash.render();
    }

    if (page === 'support-dash') {
      SupportDash.render();
    }

    if (page === 'procurement-dash') {
      ProcurementDash.render();
    }

    if (page === 'warehouse-dash') {
      WarehouseDash.render();
    }

    if (page === 'analytics-dash') {
      AnalyticsCenter.render();
    }

    if (page === 'company-settings') {
      CompanySettings.render();
    }

    if (page === 'documents-dash') {
      DocumentOffice.render();
    }

    if (page === 'payroll-dash') {
      if (typeof PayrollOffice !== 'undefined') PayrollOffice.render();
    }

    if (page === 'attendance-dash') {
      AttendanceOffice.render();
    }

    if (page === 'branch-dash') {
      if (typeof BranchOffice !== 'undefined') BranchOffice.render();
    }

    if (page === 'crm-dash') {
      if (typeof CRMOffice !== 'undefined') CRMOffice.render();
    }

    if (page === 'company-os') {
      if (typeof CompanyOS !== 'undefined') CompanyOS.render();
    }

    if (page === 'ai-control') {
      if (typeof AIControl !== 'undefined') AIControl.render();
    }

    if (page === 'hr-erp') {
      if (typeof HRERP !== 'undefined') HRERP.render();
    }

    if (page === 'finance-erp') {
      if (typeof FinanceERP !== 'undefined') FinanceERP.render();
    }

    if (page === 'warehouse-erp') {
      if (typeof WarehouseERP !== 'undefined') WarehouseERP.render();
    }

    if (page === 'marketing-erp') {
      if (typeof MarketingERP !== 'undefined') MarketingERP.render();
    }

    if (page === 'workflow-erp') {
      if (typeof WorkflowERP !== 'undefined') WorkflowERP.render();
    }

    if (page === 'bi-erp') {
      if (typeof BusinessIntelligence !== 'undefined') BusinessIntelligence.render();
    }

    if (page === 'asset-erp') {
      if (typeof AssetERP !== 'undefined') AssetERP.render();
    }

    if (page === 'crm-erp') {
      if (typeof CustomerCRM !== 'undefined') CustomerCRM.render();
    }

    if (page === 'procurement-erp') {
      if (typeof ProcurementERP !== 'undefined') ProcurementERP.render();
    }

    if (page === 'facilities-erp') {
      if (typeof FacilitiesERP !== 'undefined') FacilitiesERP.render();
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

    if (page === 'about-app') {
      SiteReview.render();
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
      'driver',
      'inventory-dash',
      'finance-dash',
      'support-dash',
      'procurement-dash',
      'warehouse-dash',
      'analytics-dash',
      'company-settings',
      'documents-dash',
      'attendance-dash',
      'payroll-dash',
      'branch-dash',
      'crm-dash',
      'company-os',
      'ai-control',
      'hr-erp',
      'finance-erp',
      'warehouse-erp',
      'marketing-erp',
      'workflow-erp',
      'bi-erp',
      'asset-erp',
      'crm-erp',
      'procurement-erp',
      'facilities-erp'
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


/* একটি registry থেকেই initial load, back/forward ও shareable staff URL resolve হয়। */
Router.resolvePath = function(path) {
  const normalizedPath = ('/' + String(path || '/').trim().replace(/^\/+|\/+$/g, '')).toLowerCase();
  const productMatch = normalizedPath.match(/^\/product\/([a-z0-9_-]+)$/i);
  if (productMatch) return { page: 'product', params: { id: productMatch[1] } };
  const categoryMatch = normalizedPath.match(/^\/category\/([a-z0-9_-]+)$/i);
  if (categoryMatch) return { page: 'listing', params: { cat: categoryMatch[1] } };

  const routes = {
    '/': 'home',
    '/admin': 'admin-dash',
    '/executive': 'admin-dash',
    '/driver': 'driver',
    '/manager': 'zone-manager',
    '/zone-manager': 'zone-manager',
    '/inventory': 'inventory-dash',
    '/finance': 'finance-dash',
    '/support': 'support-dash',
    '/procurement': 'procurement-dash',
    '/procurement-office': 'procurement-dash',
    '/vendors': 'procurement-dash',
    '/warehouse': 'warehouse-dash',
    '/analytics': 'analytics-dash',
    '/reports': 'analytics-dash',
    '/company-settings': 'company-settings',
    '/access-control': 'company-settings',
    '/documents': 'documents-dash',
    '/document-office': 'documents-dash',
    '/attendance': 'attendance-dash',
    '/time-office': 'attendance-dash',
    '/payroll': 'payroll-dash',
    '/payroll-office': 'payroll-dash',
    '/branches': 'branch-dash',
    '/branch-office': 'branch-dash',
    '/crm': 'crm-dash',
    '/customer-relationship': 'crm-dash',
    '/company-os': 'company-os',
    '/office': 'company-os',
    '/ai-control': 'ai-control',
    '/ai-center': 'ai-control',
    '/hr-erp': 'hr-erp',
    '/people-erp': 'hr-erp',
    '/finance-erp': 'finance-erp',
    '/accounting': 'finance-erp',
    '/warehouse-erp': 'warehouse-erp',
    '/wms': 'warehouse-erp',
    '/marketing-erp': 'marketing-erp',
    '/marketing-automation': 'marketing-erp',
    '/workflow-erp': 'workflow-erp',
    '/automation-engine': 'workflow-erp',
    '/bi-erp': 'bi-erp',
    '/business-intelligence': 'bi-erp',
    '/asset-erp': 'asset-erp',
    '/asset-management': 'asset-erp',
    '/crm-erp': 'crm-erp',
    '/customer-service-crm': 'crm-erp',
    '/procurement-erp': 'procurement-erp',
    '/vendor-erp': 'procurement-erp',
    '/facilities-erp': 'facilities-erp',
    '/branch-operations': 'facilities-erp',
    '/custom-bazar': 'custom-bazar',
    '/medical': 'medical',
    '/myorders': 'myorders',
    '/account': 'account',
    '/about': 'about-app',
    '/contact': 'contact',
    '/terms': 'terms',
    '/privacy': 'privacy-info'
  };
  return routes[normalizedPath] ? { page: routes[normalizedPath], params: {} } : null;
};

Router.navigate = function(path) {
  const target = this.resolvePath(path);
  if (!target) return false;
  this.go(target.page, target.params, { skipHistory: true });
  return true;
};
