(async function (skin, w, codeFile) {
  try { localStorage.setItem('skin', skin); } catch (e) {}
  var live = (window.DATA.extra && window.DATA.extra[0]) ? window.DATA.extra[0].id : '';
  var urls = ['index.html', 'models.html', 'models.html?mv=2', 'models.html?mv=3', 'models.html?mv=4', 'model.html?m=iphone-16', 'model.html?m=iphone-17-pro-max&tag=%E0%B9%83%E0%B8%AA', 'product.html?id=25958331698&m=iphone-16', live ? 'product.html?id=' + live + '&m=iphone-16' : '', 'tryon.html', 'deals.html', 'about.html'].filter(Boolean);
  var code = await (await fetch('/assets/' + (codeFile || '_audit.js'))).text();
  var res = [];
  for (var i = 0; i < urls.length; i++) {
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:900px;border:0;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(f); f.src = urls[i];
    await new Promise(function (r) { f.onload = r; });
    await new Promise(function (r) { setTimeout(r, 2200); });
    var out; try { out = f.contentWindow.eval(code); } catch (e) { out = 'ERR ' + e; }
    var h = 0; try { h = f.contentDocument.documentElement.scrollHeight; } catch (e) {}
    res.push('## ' + urls[i].slice(0, 50) + ' (h=' + h + ')\n' + (out === 'OK' ? 'OK' : out));
    f.remove();
  }
  return res.join('\n');
})
