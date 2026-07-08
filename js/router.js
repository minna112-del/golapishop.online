const Router = {
    currentPage: 'home',
    params: {},

    routes: [
        { path: 'home', title: 'হোম', load: () => Home && Home.render && Home.render() },
        { path: 'listing', title: 'পণ্য', load: () => Listing && Listing.render && Listing.render() },
        { path: 'checkout', title: 'চেকআউট', load: () => Checkout && Checkout.init && Checkout.init() },
        { path: 'custom-bazar', title: 'কাস্টম বাজার', load: () => CustomBazar && CustomBazar.init && CustomBazar.init() },
        { path: 'myorders', title: 'আমার অর্ডার', load: () => MyOrders && MyOrders.render && MyOrders.render() },
        { path: 'health', title: 'গোলাপি স্বাস্থ্য সেবা', load: () => HealthService && HealthService.init && HealthService.init() },
        { path: 'admin-dash', title: 'অ্যাডমিন', load: () => AdminDash && AdminDash.render && AdminDash.render() },
        { path: 'driver', title: 'ড্রাইভার', load: () => DriverPortal && DriverPortal.render && DriverPortal.render() },
        { path: 'zone-manager', title: 'জোন ম্যানেজার', load: () => ZoneManagerDash && ZoneManagerDash.render && ZoneManagerDash.render() }
    ],

    go(page, params = {}) {
        this.currentPage = page;
        this.params = params;

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');

        window.scrollTo(0, 0);

        const route = this.routes.find(r => r.path === page);
        if (route && typeof route.load === 'function') {
            route.load();
        }

        window.location.hash = page;
    },

    init() {
        window.go = (p, pa) => this.go(p, pa);
        const hash = location.hash.replace('#', '') || 'home';
        this.go(hash);
    }
};

Router.init();
