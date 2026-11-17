/* ตรวจทุกหน้าในขนาดจอมือถือ × สถานะแถบเลือกรุ่น (ทีละเคส / เทียบ 2 เคส / Galaxy) ด้วย overlay.js
   ใช้: เปิดเว็บด้วยเซิร์ฟเวอร์ dev (launch.json "site" พอร์ต 8765) แล้วในเบราว์เซอร์ (javascript):
     eval(await (await fetch('/tools/site-qa/mobile-check.js',{cache:'no-store'})).text());
     await QA.run([320, 390], [0, 1])        // ความกว้าง × ลำดับใน QA.states (แบ่งรอบละไม่เกิน ~25 หน้า กัน timeout)
   คืนเฉพาะหน้าที่มีปัญหา หรือ 'ALL OK'
   ขั้นตอนบังคับก่อนส่งงานที่แตะ assets/tryon.js / site.css ส่วนลองทาบ: รันทุก width ใน QA.widths × ทุก state ให้ได้ ALL OK */
window.QA = {
  widths: [320, 360, 390, 430],
  states: [{ model: 'iphone-17-pro-max' }, { model: 'iphone-13', cmp: true }, { brand: 'galaxy', model: 'galaxy-s26-ultra', cmp: true }, { model: 'iphone-16', on: false }],
  urls: function () {
    var pid = window.DATA.products[0].id;
    return ['/index.html', '/pages/models.html', '/pages/model.html?m=iphone-16', '/pages/product.html?id=' + pid + '&m=iphone-16', '/pages/tryon.html', '/pages/deals.html', '/pages/ranking.html', '/pages/accessories.html', '/pages/about.html'];
  },
  /* งานใหญ่: QA.start(...) แล้วค่อยอ่าน QA.last (เครื่องมือ javascript หมดเวลาที่ ~45 วิ) */
  start: function (w, s, u) { QA.last = 'running'; QA.run(w, s, u).then(function (r) { QA.last = r; }, function (e) { QA.last = 'ERR ' + e; }); return 'started'; },
  run: async function (widths, stateIdx, urls) {
    var code = await (await fetch('/tools/site-qa/overlay.js', { cache: 'no-store' })).text(), res = [], KEY = 'chungrakha.sel';
    var keep = localStorage.getItem(KEY);
    urls = urls || QA.urls();
    for (var si of (stateIdx || QA.states.map(function (_, i) { return i; }))) for (var w of (widths || QA.widths)) for (var u of urls) {
      localStorage.setItem(KEY, JSON.stringify(QA.states[si]));
      var f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:800px;border:0;opacity:.01;pointer-events:none;z-index:-1';
      document.body.appendChild(f); f.src = u;
      await new Promise(function (r) { f.onload = r; }); await new Promise(function (r) { setTimeout(r, 1300); });
      var o; try { o = f.contentWindow.eval(code); } catch (e) { o = 'ERR ' + e; }
      if (o !== 'OK') res.push('## state' + si + ' w' + w + ' ' + u + '\n' + o);
      f.remove();
    }
    if (keep == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, keep);
    return res.length ? res.join('\n') : 'ALL OK';
  }
};
