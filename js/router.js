/* router.js — View-based SPA Router (fetch partials + pages)
 * Architecture: index.html is a thin skeleton. PartialLoader fetches
 * HTML partials (header, footer, modals) and page views (home, listing,
 * product...) at runtime. Each page lives in its own file under pages/.
 */

/* ============================================================
   OWNER AUTH — PIN gate for admin dashboard
   ============================================================ */
const OwnerAuth = {
  attempts: 0, lockedUntil: 0,
  isUnlocked() {
    return sessionStorage.getItem('golapi_owner_unlocked') === '1'
      || localStorage.getItem('golapi_owner_remember') === '1';
  },
  requestAccess() {
    const inp = document.getElementById('ownerPinInput');
    const msg = document.getElementById('ownerGateMsg');
    if (inp) inp.value = '';
    if (msg) msg.className = 'form-msg';
    document.getElementById('ownerGateModal').classList.add('show');
    setTimeout(() => inp && inp.focus(), 100);
  },
  cancel() {
    const m = document.getElementById('ownerGateModal');
    if (m) m.classList.remove('show');
  },
  async unlock() {
    const entered = document.getElementById('ownerPinInput').value.trim();
    const msgEl   = document.getElementById('ownerGateMsg');
    if (Date.now() < this.lockedUntil) {
      msgEl.textContent = `🔒 আর ${Math.ceil((this.lockedUntil - Date.now()) / 60000)} মিনিট অপেক্ষা করুন`;
      msgEl.className = 'form-msg err'; return;
    }
    if (!FB) { msgEl.textContent = 'সংযোগ সমস্যা'; msgEl.className = 'form-msg err'; return; }
    try {
      const snap = await FB.getDoc(FB.doc(FB.db, 'setting', 'owner_pin'));
      const storedPin = snap.exists() ? snap.data().pin : null;
      if (!storedPin) {
        msgEl.textContent = '⚠ পিন সেট করা হয়নি'; msgEl.className = 'form-msg err'; return;
      }
      if (entered !== storedPin) {
        this.attempts++;
        if (this.attempts >= 3) {
          this.lockedUntil = Date.now() + 5 * 60 * 1000;
          msgEl.textContent = '🔒 ৩ বার ভুল — ৫ মিনিট অপেক্ষা করুন'; this.attempts = 0;
        } else {
          msgEl.textContent = `❌ পিন সঠিক নয় (${3 - this.attempts} বার বাকি)`;
        }
        msgEl.className = 'form-msg err';
        document.getElementById('ownerPinInput').value = ''; return;
      }
      this.attempts = 0;
      sessionStorage.setItem('golapi_owner_unlocked', '1');
      localStorage.setItem('golapi_owner_remember', '1');
      document.getElementById('ownerGateModal').classList.remove('show');
      Router.go('admin-dash');
    } catch (e) { msgEl.textContent = 'যাচাই ব্যর্থ: ' + e.message; msgEl.className = 'form-msg err'; }
  },
  lock() {
    sessionStorage.removeItem('golapi_owner_unlocked');
    localStorage.removeItem('golapi_owner_remember');
    toast('🔒 লক করা হয়েছে'); Router.go('home');
  }
};

/* ============================================================
   PARTIAL LOADER — fetch HTML partials and inject into slots
   ============================================================ */
const PartialLoader = {
  cache: {},

  async load(url) {
    if (this.cache[url]) return this.cache[url];
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      this.cache[url] = html;
      return html;
    } catch (e) {
      devWarn('Partial load failed:', url, e.message);
      return '';
    }
  },

  async injectPartials() {
    const slots = [
      { slot: 'slot-topbar',      file: './partials/topbar.html' },
      { slot: 'slot-header',      file: './partials/header.html' },
      { slot: 'slot-cart-drawer', file: './partials/cart-drawer.html' },
      { slot: 'slot-footer',      file: './partials/footer.html' },
      { slot: 'slot-mobnav',      file: './partials/mobnav.html' },
      { slot: 'slot-chat',        file: './partials/chat-widget.html' },
      { slot: 'slot-modals',      file: './partials/modals.html' },
      { slot: 'slot-toast',       file: './partials/toast.html' },
    ];
    await Promise.all(slots.map(async ({ slot, file }) => {
      const el = document.getElementById(slot);
      if (el) {
        el.innerHTML = await this.load(file);
        devLog('Partial loaded:', file);
      }
    }));
  },

  /* page id → html file (one file per page) */
  viewMap: {
    'about-app':  './pages/about-app.html',
    'account':  './pages/account.html',
    'account-addresses':  './pages/account-addresses.html',
    'admin-dash':  './pages/admin-dash.html',
    'checkout':  './pages/checkout.html',
    'contact':  './pages/contact.html',
    'custom-bazar':  './pages/custom-bazar.html',
    'driver':  './pages/driver.html',
    'home':  './pages/home.html',
    'listing':  './pages/listing.html',
    'medical':  './pages/medical.html',
    'myorders':  './pages/myorders.html',
    'order-success':  './pages/order-success.html',
    'privacy-info':  './pages/privacy-info.html',
    'product':  './pages/product.html',
    'terms':  './pages/terms.html',
    'zone-manager':  './pages/zone-manager.html',
  },

  loadedViews: new Set(),

  async ensureView(page) {
    const file = this.viewMap[page];
    if (!file) return;
    if (this.loadedViews.has(page)) return; // already injected
    const html = await this.load(file);
    const container = document.getElementById('pageContainer');
    if (container) {
      container.insertAdjacentHTML('beforeend', html);
      this.loadedViews.add(page);
      devLog('View loaded:', page, '→', file);
    }
  }
};

/* ============================================================
   ROUTER — SPA navigation
   ============================================================ */
const Router = {
  current: 'home', params: {},

  async go(page, params = {}, opts = {}) {
    /* Admin gate */
    if (page === 'admin-dash' && !OwnerAuth.isUnlocked()) {
      OwnerAuth.requestAccess(); return;
    }

    /* Hide page loader after first navigation */
    const loader = document.getElementById('pageLoader');
    if (loader) loader.style.display = 'none';

    /* Lazy-load the view HTML if not yet injected */
    await PartialLoader.ensureView(page);

    this.current = page;
    this.params  = params;

    /* Deactivate all pages */
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    /* Activate target page */
    const el = document.getElementById('page-' + page);
    if (el) {
      el.classList.add('active');
    } else {
      devWarn('Page element not found: page-' + page);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    /* Mobile nav highlight */
    const navMap = { home: 0, listing: 1, 'custom-bazar': 2, myorders: 3, account: 4 };
    document.querySelectorAll('#custMobNav a').forEach((a, i) =>
      a.classList.toggle('active', i === (navMap[page] ?? -1))
    );

    /* Staff pages — hide header/footer/nav */
    const isStaff = ['admin-dash', 'zone-manager', 'driver'].includes(page);
    ['custTopbar', 'custHeader', 'custMobNav', 'custFooter'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.style.display = isStaff ? 'none' : '';
    });
    document.body.style.paddingBottom = isStaff ? '0' : '';

    /* Hide chat on staff pages */
    const chatBtn = document.getElementById('chatBtn');
    if (chatBtn) chatBtn.style.display = isStaff ? 'none' : 'flex';

    /* Page-specific render calls */
    if (page === 'home')              Home.render();
    if (page === 'listing')           Listing.render();
    if (page === 'product')           PDP.load(params.id);
    if (page === 'checkout')          Checkout.init();
    if (page === 'myorders')          MyOrders.render();
    if (page === 'admin-dash')        AdminDash.render();
    if (page === 'driver')            DriverPortal.render();
    if (page === 'zone-manager')      ZoneManagerDash.render();
    if (page === 'medical')           Medical.render();
    if (page === 'custom-bazar')      CustomBazar.init();
    if (page === 'account')           AccountPage.render();
    if (page === 'account-addresses') AccountPage.renderAddresses();
    if (page === 'faq')               FAQ.render();
    if (page === 'reviews')           Reviews.render();
    if (page === 'wishlist')          Wishlist.render();
  }
};

/* ============================================================
   APP BOOT — inject partials, then start routing
   ============================================================ */
async function bootApp() {
  devLog('BootApp: injecting partials...');
  await PartialLoader.injectPartials();
  devLog('BootApp: partials done, starting router...');

  /* Apply language after partials are in DOM */
  if (typeof applyLang === 'function') applyLang();

  /* Customize chat widget toggle (logo ↔ ✕) */
  if (typeof customizeChatToggle === 'function') customizeChatToggle();

  /* Start routing based on URL role param */
  const role = new URLSearchParams(window.location.search).get('role');
  if (role === 'driver')             { await Router.go('driver'); }
  else if (role === 'zone-manager')  { await Router.go('zone-manager'); }
  else                               { await Router.go('home'); }

  devLog('BootApp: routing complete, app ready!');
}