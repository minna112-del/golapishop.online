const Router = {
  currentPage: 'home',

  go(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) {
      target.classList.add('active');
    }

    // Health page হলে init করুন
    if (page === 'health' && typeof HealthService !== 'undefined') {
      HealthService.init();
    }

    window.location.hash = page;
  },

  init() {
    window.go = (page) => this.go(page);
    const hash = (location.hash || '#home').replace('#', '');
    this.go(hash);
  }
};

Router.init();
