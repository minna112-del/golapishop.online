/* router.js — View-based SPA Router (fetch partials + pages) */
const OwnerAuth = {
  attempts: 0, lockedUntil: 0,
  isUnlocked() {
    return sessionStorage.getItem('golapi_owner_unlocked') === '1'
      || localStorage.getItem('golapi_owner_remember') === '1';
  },
  requestAccess() {
    document.getElementById('ownerPinInput').value = '';
    document.getElementById('ownerGateMsg').className = 'form-msg';
    document.getElementById('ownerGateModal').classList.add('show');
    setTimeout(() => document.getElementById('ownerPinInput').focus(), 100);
  },
  cancel() { document.getElementById('ownerGateModal').classList.remove('show'); },
  async unlock() {
    const entered = document.getElementById('ownerPinInput').value.trim();
    const msgEl = document.getElementById('ownerGateMsg');
    if (Date.now() < this.lockedUntil) {
      msgEl.textContent = `🔒 আর ${Math.ceil((this.lockedUntil - Date.now()) / 60000)} মিনিট অপেক্ষা করুন`;
      msgEl.className = 'form-msg err'; return;
    }
    if (!FB) { msgEl.textContent = 'সংযোগ সমস্যা'; msgEl.className = 'form-msg err'; return; }
    try {
      const snap = await FB.getDoc(FB.doc(FB.db, 'setting', 'owner_pin'));
      const storedPin = snap.exists() ? snap.data().pin : null;
      if (!storedPin) { msgEl.textContent = '⚠ পিন সেট করা হয়নি'; msgEl.className = 'form-msg err'; return; }
      if (entered !== storedPin) {
        this.attempts++;
        if (this.attempts >= 3) {
          this.lockedUntil = Date.now() + 5 * 60 * 1000;
          msgEl.textContent = '🔒 ৩ বার ভুল — ৫ মিনিট অপেক্ষা করুন'; this.attempts = 0;
        } else { msgEl.textContent = `❌ পিন সঠিক নয় (${3 - this.attempts} বার বাকি)`; }
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
    } catch (e) { devWarn('Partial load failed:', url, e.message); return ''; }
  },
  async injectPartials() {
    const slots = [
      { slot: 'slot-topbar', file: './partials/topbar.html' },
      { slot: 'slot-header', file: './partials/header.html' },
      { slot: 'slot-cart-drawer', file: './partials/cart-drawer.html' },
      { slot: 'slot-footer', file: './partials/footer.html' },
      { slot: 'slot-mobnav', file: './partials/mobnav.html' },
      { slot: 'slot-chat', file: './partials/chat-widget.html' },
      { slot: 'slot-modals', file: './partials/modals.html' },
      { slot: 'slot-toast', file: './partials/toast.html' },
    ];
    await Promise.all(slots.map(async ({ slot, file }) => {
      const el = document.getElementById(slot);
      if (el) el.innerHTML = await this.load(file);
    }));
  },
  viewMap: {
    'home': './pages/home.html',
    'listing': './pages/listing.html',
    'product': './pages/product.html',
    'checkout': './pages/checkout.html',
    'order-success': './pages/order_success.html',
    'myorders': './pages/myorders.html',
    'wishlist': './pages/myorders.html',
    'account': './pages/account.html',
    'account-addresses': './pages/account_addresses.html',
    'about-app': './pages/about_app.html',
    'privacy-info': './pages/privacy_info.html',
    'terms': './pages/terms.html',
    'contact': './pages/contact.html',
    'custom-bazar': './pages/custom_bazar.html',
    'medical': './pages/medical.html',
    'faq': './pages/contact.html',
    'reviews': './pages/contact.html',
    'admin-dash': './pages/admin_dash.html',
    'zone-manager': './pages/zone_manager.html',
    'driver': './pages/driver.html',
  },
  loadedViews: new Set(),
  async ensureView(page) {
    const file = this.viewMap[page];
    if (!file) return;
    if (this.loadedViews.has(file)) return;
    const html = await this.load(file);
    const container = document.getElementById('pageContainer');
    if (container) container.insertAdjacentHTML('beforeend', html);
    this.loadedViews.add(file);
  }
};
const Router = {
  current: 'home', params: {},
  async go(page, params = {}, opts = {}) {
    if (page === 'admin-dash' && !OwnerAuth.isUnlocked()) { OwnerAuth.requestAccess(); return; }
    const loader = document.getElementById('pageLoader');
    if (loader) loader.style.display = 'none';
    await PartialLoader.ensureView(page);
    this.current = page;
    this.params = params;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) { el.classList.add('active'); } else { devWarn('Page element not found: page-' + page); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const navMap = { home: 0, listing: 1, 'custom-bazar': 2, myorders: 3, account: 4 };
    document.querySelectorAll('#custMobNav a').forEach((a, i) =>
      a.classList.toggle('active', i === (navMap[page] ?? -1))
    );
    const isStaff = ['admin-dash', 'zone-manager', 'driver'].includes(page);
    ['custTopbar', 'custHeader', 'custMobNav', 'custFooter'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.style.display = isStaff ? 'none' : '';
    });
    document.body.style.paddingBottom = isStaff ? '0' : '';
    const chatBtn = document.getElementById('chatBtn');
    if (chatBtn) chatBtn.style.display = isStaff ? 'none' : 'flex';
    if (page === 'home') Home.render();
    if (page === 'listing') Listing.render();
    if (page === 'product') PDP.load(params.id);
    if (page === 'checkout') Checkout.init();
    if (page === 'myorders') MyOrders.render();
    if (page === 'admin-dash') AdminDash.render();
    if (page === 'driver') DriverPortal.render();
    if (page === 'zone-manager') ZoneManagerDash.render();
    if (page === 'medical') Medical.render();
    if (page === 'custom-bazar') CustomBazar.init();
    if (page === 'account') AccountPage.render();
    if (page === 'account-addresses') AccountPage.renderAddresses();
    if (page === 'faq') FAQ.render();
    if (page === 'reviews') Reviews.render();
    if (page === 'wishlist') Wishlist.render();
  }
};
async function bootApp() {
  await PartialLoader.injectPartials();
  if (typeof applyLang === 'function') applyLang();
  const role = new URLSearchParams(window.location.search).get('role');
  if (role === 'driver') { await Router.go('driver'); }
  else if (role === 'zone-manager') { await Router.go('zone-manager'); }
  else { await Router.go('home'); }
}