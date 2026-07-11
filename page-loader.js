(function(){
  var pages=['home','medical','custom-bazar','listing','product','checkout','orders','account','admin','zone-manager','driver','modals'];
  var root=document.getElementById('appRoot');
  if(!root) return;
  var done=0;
  pages.forEach(function(n){
    var x=new XMLHttpRequest();
    x.open('GET','pages/'+n+'.html',true);
    x.onload=function(){
      if(x.status===200){var d=document.createElement('div');d.innerHTML=x.responseText;while(d.firstChild)root.appendChild(d.firstChild);}
      if(++done===pages.length) document.dispatchEvent(new Event('pages-ready'));
    };
    x.onerror=function(){if(++done===pages.length)document.dispatchEvent(new Event('pages-ready'));};
    x.send();
  });
})();