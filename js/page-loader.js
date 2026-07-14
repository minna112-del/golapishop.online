/* page-loader.js — Loads page partials + view partials into slot divs */
(function(){
  /* ---- Partials (header, footer, modals, cart-drawer, mobnav, chat-widget, toast, topbar) ---- */
  const partials = [
    { url: 'partials/topbar.html',       slot: 'slot-topbar' },
    { url: 'partials/header.html',       slot: 'slot-header' },
    { url: 'partials/cart-drawer.html',  slot: 'slot-cart-drawer' },
    { url: 'partials/footer.html',       slot: 'slot-footer' },
    { url: 'partials/mobnav.html',       slot: 'slot-mobnav' },
    { url: 'partials/chat-widget.html',  slot: 'slot-chat' },
    { url: 'partials/modals.html',       slot: 'slot-modals' },
    { url: 'partials/toast.html',        slot: 'slot-toast' }
  ];

  /* ---- View pages (loaded into #pageContainer) ---- */
  const pages = ['home','listing','product','checkout','myorders','account','medical','custom-bazar','admin-dash','driver','zone-manager','order-success','account-addresses','about-app','privacy-info','terms','contact','modals'];

  let pending = partials.length + pages.length;
  const container = document.getElementById('pageContainer');

  function done(){
    pending--;
    if(pending > 0) return;
    const loader = document.getElementById('pageLoader');
    if(loader) loader.style.display = 'none';
    document.dispatchEvent(new Event('pages-ready'));
  }

  function fetchInto(url, targetEl){
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(){
      if(xhr.status === 200 && targetEl){
        targetEl.innerHTML = xhr.responseText;
      }
      done();
    };
    xhr.onerror = function(){ done(); };
    xhr.send();
  }

  /* Load partials into slot divs */
  partials.forEach(function(p){
    const slot = document.getElementById(p.slot);
    if(slot){ fetchInto(p.url, slot); }
    else { done(); }
  });

  /* Load view pages into pageContainer */
  pages.forEach(function(name){
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'pages/' + name + '.html', true);
    xhr.onload = function(){
      if(xhr.status === 200 && container){
        const wrapper = document.createElement('div');
        wrapper.innerHTML = xhr.responseText;
        while(wrapper.firstChild) container.appendChild(wrapper.firstChild);
      }
      done();
    };
    xhr.onerror = function(){ done(); };
    xhr.send();
  });
})();