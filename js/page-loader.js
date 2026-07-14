/* page-loader.js — Loads slot + page partials before app boot */
(function(){
  var container = document.getElementById('pageContainer');

  // slot id -> partial filename (loaded from /pages/*.html, injected into fixed slot divs)
  var slots = {
    'slot-topbar':      'topbar',
    'slot-header':      'header',
    'slot-cart-drawer': 'cart-drawer',
    'slot-footer':      'footer',
    'slot-mobnav':      'mobnav',
    'slot-chat':        'chat-widget',
    'slot-modals':      'modals',
    'slot-toast':       'toast'
  };

  // page name -> partial filename (all injected into #pageContainer in this order)
  var pages = [
    'home','listing','product','checkout','order-success','myorders',
    'account','account-addresses','about-app','privacy-info','terms',
    'contact','custom-bazar','medical','admin-dash','driver','zone-manager'
  ];

  var slotKeys = Object.keys(slots);
  var total = slotKeys.length + pages.length;
  var done = 0;

  function finish(){
    done++;
    if(done === total){
      var loader = document.getElementById('pageLoader');
      if(loader) loader.style.display = 'none';
      document.dispatchEvent(new Event('pages-ready'));
    }
  }

  function loadInto(url, targetEl, appendMode){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(){
      if(xhr.status === 200 && targetEl){
        if(appendMode){
          var wrapper = document.createElement('div');
          wrapper.innerHTML = xhr.responseText;
          while(wrapper.firstChild) targetEl.appendChild(wrapper.firstChild);
        } else {
          targetEl.innerHTML = xhr.responseText;
        }
      } else if(xhr.status !== 200){
        console.warn('[page-loader] সাইট থকে লোড ব্যর্থ:', url, xhr.status);
      }
      finish();
    };
    xhr.onerror = function(){ console.warn('[page-loader] নেটওয়ার্ক এরর:', url); finish(); };
    xhr.send();
  }

  // 1) Fill fixed UI slots (header, footer, topbar, nav, cart, chat, modals, toast)
  slotKeys.forEach(function(slotId){
    var el = document.getElementById(slotId);
    loadInto('pages/' + slots[slotId] + '.html', el, false);
  });

  // 2) Append all app pages into #pageContainer
  pages.forEach(function(name){
    loadInto('pages/' + name + '.html', container, true);
  });
})();