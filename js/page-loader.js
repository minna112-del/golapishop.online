/* page-loader.js — All page HTML is inline in index.html, so this simply dispatches ready */
(function(){
  document.dispatchEvent(new Event('pages-ready'));
})();
