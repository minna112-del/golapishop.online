/* page-loader.js — Loads slot partials + page views, all from /pages/ folder
   Hardened: SPA fallback (index.html) কখনো ভুলবশত inject না হওয়ার সুরক্ষা সহ
   পারফরম্যান্স: স্টাফ প্যানেল (admin/driver/zone-manager) প্রয়োজন হলে তখনই লোড হয় */
(function(){
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

  /* সব কাস্টমার প্রথম ভিজটেই এগুলো দেখতে পারে — সাথে সাথে লড হবে */
  const pages = ['home','listing','product','checkout','myorders','account','medical','custom-bazar','order-success','account-addresses','about-app','privacy-info','terms','contact'];

  /* স্টাফ-অনলি পেজ — শুধু প্রয়োজন হলে (Router.go কল হলে) লোড হবে */
  window.__lazyPages = ['admin-dash','driver','zone-manager'];
  window.__loadedLazyPages = {};

  let pending = partials.length + pages.length;
  const container = document.getElementById('pageContainer');

  function done(){
    pending--;
    if(pending > 0) return;
    const loader = document.getElementById('pageLoader');
    if(loader) loader.style.display = 'none';
    document.dispatchEvent(new Event('pages-ready'));
  }

  function isSafeFragment(text){
    return !/<!DOCTYPE html>/i.test(text) && !/<html[\s>]/i.test(text);
  }

  function fetchInto(url, targetEl){
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(){
      if(xhr.status === 200 && targetEl){
        if(isSafeFragment(xhr.responseText)){
          targetEl.innerHTML = xhr.responseText;
        } else {
          console.warn('[page-loader] ফাইল পাওয়া যায়নি (fallback পেজ ফেরত এসেছে), বাদ দেওয়া হলো:', url);
        }
      }
      done();
    };
    xhr.onerror = function(){ done(); };
    xhr.send();
  }

  partials.forEach(function(p){
    const slot = document.getElementById(p.slot);
    if(slot){ fetchInto(p.url, slot); }
    else { done(); }
  });

  pages.forEach(function(name){
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'pages/' + name + '.html', true);
    xhr.onload = function(){
      if(xhr.status === 200 && container && isSafeFragment(xhr.responseText)){
        const wrapper = document.createElement('div');
        wrapper.innerHTML = xhr.responseText;
        while(wrapper.firstChild) container.appendChild(wrapper.firstChild);
      } else if(xhr.status === 200){
        console.warn('[page-loader] পেজ পাওয়া যায়নি (fallback পেজ ফেরত এসেছে), বাদ দেওয়া হলো:', name);
      }
      done();
    };
    xhr.onerror = function(){ done(); };
    xhr.send();
  });

  /* স্টাফ পেজ চাহিদামতো লোড করার ফাংশন — router.js থেকে কল হবে */
  window.__ensureLazyPage = function(name, callback){
    if(window.__loadedLazyPages[name]){ callback(); return; }
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'pages/' + name + '.html', true);
    xhr.onload = function(){
      if(xhr.status === 200 && container && isSafeFragment(xhr.responseText)){
        const wrapper = document.createElement('div');
        wrapper.innerHTML = xhr.responseText;
        while(wrapper.firstChild) container.appendChild(wrapper.firstChild);
        window.__loadedLazyPages[name] = true;
      } else {
        console.warn('[page-loader] স্টাফ পেজ লোড ব্যর্থ:', name);
      }
      callback();
    };
    xhr.onerror = function(){ callback(); };
    xhr.send();
  };
})();