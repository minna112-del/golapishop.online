/* page-loader.js — Loads slot partials + page views, all from /pages/ folder */
(function(){
  /* ---- UI চ্যাসিস (header, footer, modals, cart-drawer, mobnav, chat-widget, toast, topbar) ---- */
  const partials = [
    { url: 'pages/topbar.html',       slot: 'slot-topbar' },
    { url: 'pages/header.html',       slot: 'slot-header' },
    { url: 'pages/cart-drawer.html',  slot: 'slot-cart-drawer' },
    { url: 'pages/footer.html',       slot: 'slot-footer' },
    { url: 'pages/mobnav.html',       slot: 'slot-mobnav' },
    { url: 'pages/chat-widget.html',  slot: 'slot-chat' },
    { url: 'pages/modals.html',       slot: 'slot-modals' },
    { url: 'pages/toast.html',        slot: 'slot-toast' }
  ];

  /* ---- পেজ কনটেন্ট (#pageContainer এ যোগ হবে) — 'modals' এখানে নেই, ওটা উপরে slot হিসেবে আলাদাভাবে লোড হয় */
  const pages = ['home','listing','product','checkout','myorders','account','medical','custom-bazar','admin-dash','driver','zone-manager','order-success','account-addresses','about-app','privacy-info','terms','contact'];

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

  /* স্লট partials লোড */
  partials.forEach(function(p){
    const slot = document.getElementById(p.slot);
    if(slot){ fetchInto(p.url, slot); }
    else { done(); }
  });

  /* পেজ কনটেন্ট লোড */
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