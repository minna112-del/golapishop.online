const Router = {
  current: 'home',
  params: {},
  go(page, params = {}, opts = {}) {
    if (page === 'admin-dash' && !OwnerAuth.isUnlocked()) {
      OwnerAuth.requestAccess();
      return;
    }
    this.current = page;
    this.params = params;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'health') HealthService.init();
    if (page === 'listing') Listing.render();
    if (page === 'product') PDP.load(params.id);
    if (page === 'checkout') Checkout.init();
    if (page === 'myorders') MyOrders.render();
    if (page === 'admin-dash') AdminDash.render();
    if (page === 'driver') DriverPortal.render();
    if (page === 'zone-manager') ZoneManagerDash.render();
    if (page === 'home') Home.render();
    if (page === 'custom-bazar') CustomBazar.init();

    // Staff pages-এ chat/header hide
    const staffPages = ['admin-dash', 'zone-manager', 'driver'];
    const isStaff = staffPages.includes(page);
    ChatWidget.setVisible(!isStaff);
  },
  handleInitialHash() {
    const hash = (location.hash || '').replace('#', '').trim();
    if (hash === 'driver') this.go('driver', {}, { skipHash: true });
    else if (hash === 'owner') this.go('admin-dash', {}, { skipHash: true });
    else if (hash === 'zone-manager') this.go('zone-manager', {}, { skipHash: true });
    else this.go('home', {}, { skipHash: true });
  }
};
