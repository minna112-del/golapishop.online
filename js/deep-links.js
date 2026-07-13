/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Deep Link Routing â€” For Driver & Zone Manager Apps
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   
   This script enhances the website to handle deep links from
   the Android apps. When the TWA opens a specific URL, this
   script ensures the correct page/view is shown.
   
   How it works:
   1. Customer app opens â†’ https://www.golapishop.online/ â†’ home
   2. Driver app opens â†’ https://www.golapishop.online/driver â†’ driver portal
   3. Manager app opens â†’ https://www.golapishop.online/manager â†’ zone manager
   
   Add to index.html BEFORE </body>:
   <script src="./js/deep-links.js"></script>
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const DeepLinkHandler = {
  init() {
    this.handleCurrentUrl();
    
    // Listen for URL changes (TWA navigation, back/forward)
    window.addEventListener('popstate', () => this.handleCurrentUrl());
    
    // Listen for pushState/replaceState (SPA navigation)
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    
    history.pushState = function(...args) {
      origPush.apply(this, args);
      window.dispatchEvent(new Event('url-changed'));
    };
    history.replaceState = function(...args) {
      origReplace.apply(this, args);
      window.dispatchEvent(new Event('url-changed'));
    };
    
    window.addEventListener('url-changed', () => this.handleCurrentUrl());
  },

  handleCurrentUrl() {
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    
    // â”€â”€â”€ Route mapping â”€â”€â”€
    const routes = {
      '/': 'home',
      '/driver': 'driver',
      '/manager': 'zone-manager',
      '/zone-manager': 'zone-manager',
      '/custom-bazar': 'custom-bazar',
      '/medical': 'medical',
      '/myorders': 'myorders',
      '/account': 'account',
      '/about': 'about-app',
      '/contact': 'contact',
      '/faq': 'faq'
    };

    // Check role param (legacy support: ?role=driver)
    const role = search.get('role');
    if (role === 'driver') {
      this.navigate('driver');
      return;
    }
    if (role === 'zone-manager' || role === 'manager') {
      this.navigate('zone-manager');
      return;
    }

    // Check path-based routing
    const targetRoute = routes[path];
    if (targetRoute && targetRoute !== 'home') {
      this.navigate(targetRoute);
      return;
    }

    // Check hash-based routing
    const hash = window.location.hash.replace('#', '');
    if (hash && routes['/' + hash]) {
      this.navigate(routes['/' + hash]);
      return;
    }
  },

  navigate(page) {
    // Only navigate if Router is available and page is different
    if (typeof Router !== 'undefined' && Router.current !== page) {
      console.log(`DeepLink: Navigating to ${page}`);
      Router.go(page);
    }
  },

  // Helper: Build shareable deep link URLs
  buildUrl(page, params = {}) {
    const pathMap = {
      'home': '/',
      'driver': '/driver',
      'zone-manager': '/manager',
      'custom-bazar': '/custom-bazar',
      'medical': '/medical',
      'myorders': '/myorders'
    };
    
    const path = pathMap[page] || '/';
    const search = new URLSearchParams(params).toString();
    return `https://www.golapishop.online${path}${search ? '?' + search : ''}`;
  }
};

// Initialize after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DeepLinkHandler.init());
} else {
  DeepLinkHandler.init();
}