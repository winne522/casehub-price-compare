(function(){
  var out=[], W=innerWidth; var fx=function(el){for(;el&&el!==document.documentElement;el=el.parentElement){var p=getComputedStyle(el).position;if(p==='fixed'||p==='sticky')return true;}return false;};
  var sel=function(e){var s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;if(e.className&&typeof e.className==='string')s+='.'+e.className.trim().split(/\s+/).slice(0,2).join('.');return s;};
  var vis=function(e){var r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&cs.opacity!=='0';};
  if(document.documentElement.scrollWidth>W+1) out.push('H-SCROLL page scrollWidth='+document.documentElement.scrollWidth+' vw='+W);
  // off-screen / clipped on right
  var seen={};
  document.querySelectorAll('body *').forEach(function(e){
    if(!vis(e))return; var cs=getComputedStyle(e); if(cs.position==='fixed')return;
    var r=e.getBoundingClientRect();
    if(r.right>W+2&&!e.closest('.menu,.cs-grid,.tree,.lay-bar,.tb-chips,.rail,.hB-art,.m1-row,.mv-bar,[data-scroll]')){var k=sel(e);if(!seen[k]){seen[k]=1;out.push('OFFSCREEN '+k+' right='+Math.round(r.right));}}
  });
  // text clipped without clamp/ellipsis
  document.querySelectorAll('body *').forEach(function(e){
    if(!vis(e)||e.closest('details:not([open])'))return; var cs=getComputedStyle(e);
    if((cs.overflow!=='visible'||cs.overflowX!=='visible')&&e.scrollWidth>e.clientWidth+2&&cs.overflowX!=='auto'&&cs.overflowX!=='scroll'&&cs.webkitLineClamp==='none'&&cs.textOverflow!=='ellipsis'&&e.textContent.trim()){
      out.push('CLIP-X '+sel(e)+' sw='+e.scrollWidth+' cw='+e.clientWidth+' "'+e.textContent.trim().slice(0,30)+'"');
    }
  });
  // text overlap via Range rects
  var items=[];
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
  var n; while((n=walker.nextNode())){
    var t=n.nodeValue.trim(); if(!t)continue; var p=n.parentElement; if(!p||/SCRIPT|STYLE|NOSCRIPT/.test(p.tagName))continue; if(!vis(p))continue; var dd=p.closest('details'); if(dd&&!dd.open&&!p.closest('summary'))continue;
    var rg=document.createRange(); rg.selectNodeContents(n); var rs=rg.getClientRects();
    var pcs=getComputedStyle(p),lh=parseFloat(pcs.lineHeight)/parseFloat(pcs.fontSize); if(lh&&lh<=1.1)continue; for(var i=0;i<rs.length;i++){var r=rs[i]; if(r.width<3||r.height<3)continue; if(r.bottom<0||r.top>document.documentElement.scrollHeight)continue; var cl={left:r.left,right:r.right,top:r.top,bottom:r.bottom},ok=true; for(var a=p;a&&a!==document.body;a=a.parentElement){var ac=getComputedStyle(a); if(ac.overflow!=='visible'||ac.overflowX!=='visible'||ac.overflowY!=='visible'){var ar=a.getBoundingClientRect(); cl={left:Math.max(cl.left,ar.left),right:Math.min(cl.right,ar.right),top:Math.max(cl.top,ar.top),bottom:Math.min(cl.bottom,ar.bottom)}; if(cl.right-cl.left<3||cl.bottom-cl.top<3){ok=false;break;}}} if(!ok)continue; items.push({r:{left:cl.left,right:cl.right,top:cl.top,bottom:cl.bottom,width:cl.right-cl.left,height:cl.bottom-cl.top},t:t,p:p,i:i});}
  }
  var pairs=0;
  for(var a=0;a<items.length&&pairs<25;a++){
    for(var b=a+1;b<items.length&&pairs<25;b++){
      var A=items[a],B=items[b]; if(A.p===B.p)continue;
      var ix=Math.min(A.r.right,B.r.right)-Math.max(A.r.left,B.r.left), iy=Math.min(A.r.bottom,B.r.bottom)-Math.max(A.r.top,B.r.top);
      if(ix>2&&iy>2){var ar=Math.min(A.r.width*A.r.height,B.r.width*B.r.height); if(ix*iy>0.25*ar){ if(fx(A.p)!==fx(B.p))continue; out.push('OVERLAP "'+A.t.slice(0,22)+'" <> "'+B.t.slice(0,22)+'" @y='+Math.round(A.r.top+scrollY));pairs++;}}
    }
  }
  // tiny text, small tap targets
  var small={};
  document.querySelectorAll('body *').forEach(function(e){
    if(!vis(e))return; var cs=getComputedStyle(e);
    var own=[].some.call(e.childNodes,function(c){return c.nodeType===3&&c.nodeValue.trim();});
    if(own&&parseFloat(cs.fontSize)<11){var k='fs'+sel(e);if(!small[k]){small[k]=1;out.push('TINY-TEXT '+parseFloat(cs.fontSize)+'px '+sel(e)+' "'+e.textContent.trim().slice(0,20)+'"');}}
  });
  if(W<700){var tap={};document.querySelectorAll('a,button,select,input,summary').forEach(function(e){if(!vis(e))return;var r=e.getBoundingClientRect();if((r.height<30||r.width<30)&&e.type!=='radio'&&e.type!=='checkbox'){var k=sel(e);if(!tap[k]){tap[k]=1;out.push('SMALL-TAP '+Math.round(r.width)+'x'+Math.round(r.height)+' '+k+' "'+(e.textContent||'').trim().slice(0,16)+'"');}}});}
  // broken images
  document.querySelectorAll('img').forEach(function(im){if(im.complete&&im.naturalWidth===0&&im.src)out.push('BROKEN-IMG '+im.src.slice(-40));});
  return out.length?out.join('\n'):'OK';
})()
