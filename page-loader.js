/* page-loader.js — সব page HTML dynamically load করে DOM-এ inject করে */
(function(){
  const pages = [
    'pages/home.html',
    'pages/medical.html',
    'pages/custom-bazar.html',
    'pages/listing.html',
    'pages/product.html',
    'pages/checkout.html',
    'pages/orders.html',
    'pages/account.html',
    'pages/admin.html',
    'pages/zone-manager.html',
    'pages/driver.html',
    'pages/modals.html',
  ];

  const root = document.getElementById('appRoot');
  const loader = document.getElementById('pageLoadingIndicator');

  Promise.all(pages.map(url =>
    fetch(url).then(r => {
      if(!r.ok) throw new Error(`Failed: ${url}`);
      return r.text();
    })
  )).then(htmls => {
    // Remove loading indicator
    if(loader) loader.remove();
    // Inject all pages
    htmls.forEach(html => {
      const div = document.createElement('div');
      div.innerHTML = html;
      while(div.firstChild) root.appendChild(div.firstChild);
    });
    // Fire ready event — app.js এটা listen করে init করবে
    document.dispatchEvent(new Event('pages-ready'));
  }).catch(err => {
    console.error('Page load error:', err);
    if(loader) loader.innerHTML = '⚠️ লোড সমস্যা। পেজ রিফ্রেশ করুন।';
  });
})();