// ==================== ROUTER.JS ====================
const Router = {
  currentPage: 'home',
  params: {},

  routes: [
    { path: 'home', title: 'Golapi Shop Online', load: () => Home.render() },
    { path: 'listing', title: 'সব পণ্য', load: () => Listing.render() },
    { path: 'product', title: 'পণ্য বিস্তারিত', load: () => PDP.load(Router.params.id) },
    { path: 'checkout', title: 'চেকআউট', load: () => Checkout.init() },
    { path: 'custom-bazar', title: 'কাস্টম বাজারের লিস্ট', load: () => CustomBazar.init() },
    { path: 'myorders', title: 'আমার অর্ডার', load: () => MyOrders.render() },
    { path: 'health', title: 'Golapi Free Health Service', load: () => HealthService.init() },
    { path: 'admin-dash', title: 'অ্যাডমিন ড্যাশবোর্ড', load: () => AdminDash.render() },
    { path: 'driver', title: 'ড্রাইভার পোর্টাল', load: () => DriverPortal.render() },
    { path: 'zone-manager', title: 'জোন ম্যানেজার ড্যাশবোর্ড', load: () => ZoneManagerDash.render() }
  ],

  go(page, params = {}, opts = {}) {
    this.currentPage = page;
    this.params = params || {};

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) {
      targetPage.classList.add('active');
    } else {
      console.warn(`Page not found: ${page}`);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load the page's logic
    const route = this.routes.find(r => r.path === page);
    if (route && typeof route.load === 'function') {
      try {
        route.load();
      } catch (e) {
        console.error(`Error loading page ${page}:`, e);
      }
    }

    // Update URL hash
    if (!opts.skipHash) {
      window.location.hash = page;
    }

    // Staff pages-এ চ্যাট হাইড করুন
    const staffPages = ['admin-dash', 'driver', 'zone-manager'];
    ChatWidget.setVisible(!staffPages.includes(page));
  },

  handleInitialHash() {
    let hash = (location.hash || '').replace('#', '').trim();
    if (!hash
