/* page-loader.js — Loads partials + pages into their slot divs */
(function(){
  var PARTIALS = [
    { name:'topbar',      slot:'slot-topbar' },
    { name:'header',      slot:'slot-header' },
    { name:'cart-drawer', slot:'slot-cart-drawer' },
    { name:'footer',      slot:'slot-footer' },
    { name:'mobnav',      slot:'slot-mobnav' },
    { name:'chat-widget', slot:'slot-chat' },
    { name:'modals',      slot:'slot-modals' },
    { name:'toast',       slot:'slot-toast' }
  ];

  var PAGES = [
    'home','listing','product','checkout','order-success','myorders',
    'account','account-addresses','about-app','privacy-info','terms',
    'contact','custom-bazar','medical','admin-dash','zone-manager','driver'
  ];

  var pageContainer = document.getElementById('pageContainer');

  function loadPartial(p){
    return fetch('partials/' + p.name + '.html')
      .then(function(res){ return res.ok ? res.text() : ''; })
      .then(function(html){
        var slot = document.getElementById(p.slot);
        if(slot) slot.innerHTML = html;
      })
      .catch(function(e){ console.warn('Partial load failed:', p.name, e); });
  }

  function loadPage(name){
    return fetch('pages/' + name + '.html')
      .then(function(res){ return res.ok ? res.text() : ''; })
      .then(function(html){
        if(!pageContainer || !html) return;
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        while(wrapper.firstChild) pageContainer.appendChild(wrapper.firstChild);
      })
      .catch(function(e){ console.warn('Page load failed:', name, e); });
  }

  var partialPromises = PARTIALS.map(loadPartial);
  var pagePromises = PAGES.map(loadPage);

  Promise.all(partialPromises.concat(pagePromises)).then(function(){
    var loader = document.getElementById('pageLoader');
    if(loader) loader.style.display = 'none';
    document.dispatchEvent(new Event('pages-ready'));
  }).catch(function(e){
    console.error('Page-loader fatal error:', e);
    var loader = document.getElementById('pageLoader');
    if(loader) loader.style.display = 'none';
    document.dispatchEvent(new Event('pages-ready'));
  });
})();