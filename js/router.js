const Router = {
  currentPage: 'home',
  params: {},
  routes: [
    { path: 'home', load: () => Home && Home.render && Home.render() },
    { path: 'listing', load: () => Listing && Listing.render && Listing.render() },
    { path: 'product', load: () => PDP && PDP.load && PDP.load(Router.params.id) },
    { path: 'checkout', load: () => Checkout && Checkout.init && Checkout.init() },
    { path: 'custom-bazar', load: () => CustomBazar && CustomBazar.init && CustomBazar.init() },
    { path: 'myorders', load: () => MyOrders && MyOrders.render && MyOrders.render() },
    { path: 'health', load: () => HealthService && HealthService.init && HealthService.init() },
    { path: 'admin-dash', load: () => AdminDash && AdminDash.render && AdminDash.render() },
    { path: 'driver', load: () => DriverPortal && DriverPortal.render && DriverPortal.render() },
    { path: 'zone-manager', load: () => ZoneManagerDash && ZoneManagerDash.render && ZoneManagerDash.render() }
  ],

  go(page, params = {}) {
    this.currentPage = page;
    this.params = params;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    window.scrollTo(0, 0);

    const route = this.routes.find(r => r.path === page);
    if (route && route.load) route.load();
    window.location.hash = page;
  },

  init() {
    window.go = (page, params) => this.go(page, params);
    const hash = (location.hash || '#home').replace('#', '');
    this.go(hash);
  }
};

Router.init();
