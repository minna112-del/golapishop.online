/* page-loader.js */
(function(){
  var pages = [
    'home','medical','custom-bazar','listing','product',
    'checkout','orders','account','admin','zone-manager','driver','modals'
  ];
  var root = document.getElementById('appRoot');
  if(!root) return;

  pages.forEach(function(name){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'pages/' + name + '.html', false);
    try {
      xhr.send();
      if(xhr.status === 200){
        var div = document.createElement('div');
        div.innerHTML = xhr.responseText;
        while(div.firstChild) root.appendChild(div.firstChild);
      }
    } catch(e) {}
  });

  var loader = document.getElementById('pageLoadingIndicator');
  if(loader) loader.remove();
})();