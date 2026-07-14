/* page-loader.js — Loads page partials into slot divs */
(function(){
  var slots = {
    'topbar':    'slot-topbar',
    'header':    'slot-header',
    'home':      'pageContainer',
    'listing':   'pageContainer',
    'product':   'pageContainer',
    'checkout':  'pageContainer',
    'orders':    'pageContainer',
    'account':   'pageContainer',
    'medical':   'pageContainer',
    'custom-bazar':'pageContainer',
    'admin':     'pageContainer',
    'driver':    'pageContainer',
    'zone-manager':'pageContainer',
    'modals':    'slot-modals',
    'cart':      'slot-cart-drawer',
    'footer':    'slot-footer',
    'mobnav':    'slot-mobnav',
    'chat':      'slot-chat'
  };

  var pages = ['home','listing','product','checkout','orders','account','medical','custom-bazar','admin','driver','zone-manager','modals'];
  var done = 0;
  var total = pages.length;
  var container = document.getElementById('pageContainer');

  pages.forEach(function(name){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'pages/' + name + '.html', true);
    xhr.onload = function(){
      if(xhr.status === 200 && container){
        var wrapper = document.createElement('div');
        wrapper.innerHTML = xhr.responseText;
        while(wrapper.firstChild) container.appendChild(wrapper.firstChild);
      }
      done++;
      if(done === total){
        // Hide loader
        var loader = document.getElementById('pageLoader');
        if(loader) loader.style.display = 'none';
        // Fire ready event
        document.dispatchEvent(new Event('pages-ready'));
      }
    };
    xhr.onerror = function(){
      done++;
      if(done === total){
        var loader = document.getElementById('pageLoader');
        if(loader) loader.style.display = 'none';
        document.dispatchEvent(new Event('pages-ready'));
      }
    };
    xhr.send();
  });
})();