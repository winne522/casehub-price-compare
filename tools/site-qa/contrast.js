(function(){
  var out=[],seen={};
  var parse=function(c){var m=c.match(/rgba?\(([^)]+)\)/);if(!m)return[0,0,0,0];var p=m[1].split(/[ ,\/]+/).map(parseFloat);return[p[0],p[1],p[2],p.length>3?p[3]:1];};
  var lin=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
  var lum=function(c){return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);};
  var bgOf=function(el){for(;el&&el!==document.documentElement;el=el.parentElement){var cs=getComputedStyle(el);if(cs.backgroundImage!=='none')return null;var c=parse(cs.backgroundColor);if(c[3]>=0.6)return c;}var b=parse(getComputedStyle(document.body).backgroundColor);return b[3]>0?b:[255,255,255,1];};
  var sel=function(e){var s=e.tagName.toLowerCase();if(e.className&&typeof e.className==='string')s+='.'+e.className.trim().split(/\s+/).slice(0,2).join('.');return s;};
  var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null),n;
  while((n=w.nextNode())){
    var t=n.nodeValue.trim();if(!t)continue;var p=n.parentElement;if(!p||/SCRIPT|STYLE/.test(p.tagName))continue;
    var r=p.getBoundingClientRect();if(!r.width||!r.height)continue;var cs=getComputedStyle(p);if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)<0.5)continue;
    if(p.closest('details:not([open])')&&!p.closest('summary'))continue;
    var fg=parse(cs.color);if(fg[3]<0.9)continue;var bg=bgOf(p);if(!bg)continue;
    var L1=lum(fg),L2=lum(bg),ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    var big=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.66&&parseInt(cs.fontWeight)>=700);
    var need=big?3:4.5;
    if(ratio<need){var k=sel(p)+'|'+cs.color+'|'+bg.slice(0,3).join(',');if(!seen[k]){seen[k]=1;out.push('LOW-CONTRAST '+ratio.toFixed(2)+' (<'+need+') '+sel(p)+' fg='+cs.color+' bg=rgb('+bg.slice(0,3).join(',')+') "'+t.slice(0,24)+'"');}}
  }
  return out.length?out.join('\n'):'OK';
})()
