cat > /mnt/user-data/outputs/page-loader.js << 'EOF'
/* page-loader.js — Synchronous page loading
   অন্য সব script-এর আগে load হয়
   XHR synchronous দিয়ে pages inject করে
   তারপর router.js, app.js চলে — তখন সব DOM ready */
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
  if(!root){ console.error('appRoot not found'); return; }

  pages.forEach(function(url){
    try{
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false); // false = synchronous — blocks until done
      xhr.send(null);
      if(xhr.status === 200){
        var tmp = document.createElement('div');
        tmp.innerHTML = xhr.responseText;
        while(tmp.firstChild) root.appendChild(tmp.firstChild);
      } else {
        console.warn('Page not loaded:', url, xhr.status);
      }
    }catch(e){
      console.error('Error loading page:', url, e);
    }
  });
})();
EOF

echo "✅ page-loader.js (synchronous): $(wc -l < /mnt/user-data/outputs/page-loader.js) lines"