/* ตรวจ "ของลอยทับ" — ปุ่ม/ป้ายที่จัดวางแบบ absolute ทับภาพเครื่อง ภาพสินค้า หรือปุ่มอื่น
   (audit.js ดูแค่ข้อความทับข้อความ จึงไม่เห็นกรณีปุ่มใส่/ไม่ใส่เคสทับภาพเครื่องที่เป็น SVG)
   ใช้: eval ข้อความไฟล์นี้ในหน้า (หรือผ่าน run.js ด้วย codeFile) → คืน 'OK' หรือรายการปัญหา
   กฎ:
   1) FLOAT-OVER  ชิ้นที่ position:absolute ทับเนื้อหาอื่นในกล่องเดียวกัน (ภาพ/svg/ปุ่ม/ลิงก์) เกิน 4px
      — ยกเว้นป้ายเล็กที่ตั้งใจวางบนรูปสินค้า (ALLOW) เช่น "ใส่ได้" บนรูปในกริด
   2) TRYON-GAP   ปุ่มใส่/ไม่ใส่เคส ต้องห่างจาก "เนื้อภาพ" ของเครื่อง/เคส (วัดจากชิ้นใน SVG ไม่ใช่กรอบ) ≥ 4px
   3) FIXED-COVER ตอนเลื่อนสุดหน้า แถบ fixed/sticky ต้องไม่บังปุ่มสุดท้ายของหน้า */
(function () {
  var out = [];
  var ALLOW = '.cs-fit,.cs-cur,.cs-pick,.cs-im *,.rg-n,.rg-s,.badge,.tag,.pill,.hB-art *,.dv-b,.sr-only,[data-overlay-ok]';
  var vis = function (e) { var r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  var sel = function (e) { var s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; if (typeof e.className === 'string' && e.className.trim()) s += '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  var inter = function (a, b) { var x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return x > 0 && y > 0 ? [x, y] : null; };
  var posOf = function (e) { for (; e && e !== document.body; e = e.parentElement) { var p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return p; } return ''; };
  /* กรอบเนื้อภาพจริงของ svg (รวมชิ้นที่ล้นกรอบ svg ด้วย เพราะ overflow:visible) */
  var ink = function (svg) {
    var t = 1e9, l = 1e9, b = -1e9, r = -1e9, n = 0;
    svg.querySelectorAll('path,rect,circle,ellipse,polygon,image,use,line').forEach(function (s) {
      var cs = getComputedStyle(s); if (cs.display === 'none' || +cs.opacity === 0) return;
      var k = s.getBoundingClientRect(); if (k.width < 0.5 && k.height < 0.5) return;
      t = Math.min(t, k.top); l = Math.min(l, k.left); b = Math.max(b, k.bottom); r = Math.max(r, k.right); n++;
    });
    return n ? { top: t, left: l, bottom: b, right: r } : svg.getBoundingClientRect();
  };

  /* 1) FLOAT-OVER */
  var targets = [].filter.call(document.querySelectorAll('img,svg,button,a,select,input,.ty-phone'), function (e) { return vis(e) && !(e.closest('svg') && e.tagName.toLowerCase() !== 'svg' ? 1 : 0); });
  var seen = {};
  document.querySelectorAll('body *').forEach(function (f) {
    if (!vis(f) || getComputedStyle(f).position !== 'absolute' || f.closest('svg') || f.matches(ALLOW)) return;
    if (!f.textContent.trim() && !f.querySelector('button,a,img,svg')) return;   // ของตกแต่งไม่มีเนื้อหา ไม่นับ
    var fr = f.getBoundingClientRect(), fp = posOf(f);
    targets.forEach(function (t) {
      if (f.contains(t) || t.contains(f) || posOf(t) !== fp || t.matches(ALLOW)) return;
      var tr = t.tagName.toLowerCase() === 'svg' ? ink(t) : t.getBoundingClientRect(), ov = inter(fr, tr);
      if (ov && ov[0] > 4 && ov[1] > 4) { var k = sel(f) + '|' + sel(t); if (!seen[k]) { seen[k] = 1; out.push('FLOAT-OVER ' + sel(f) + ' ทับ ' + sel(t) + ' ' + Math.round(ov[0]) + 'x' + Math.round(ov[1]) + 'px @y=' + Math.round(fr.top + scrollY)); } }
    });
  });

  /* 2) TRYON-GAP */
  document.querySelectorAll('.ty-stage').forEach(function (st) {
    var tg = st.querySelector('.ty-tog'); if (!tg || !vis(tg)) return;
    var a = tg.getBoundingClientRect();
    st.querySelectorAll('.ty-phone svg').forEach(function (svg) {
      var b = ink(svg), g = 4;
      if (inter({ top: a.top - g, bottom: a.bottom + g, left: a.left - g, right: a.right + g }, b)) out.push('TRYON-GAP ปุ่มใส่/ไม่ใส่เคสชิดหรือทับภาพเครื่อง (ปุ่ม y ' + Math.round(a.top) + '–' + Math.round(a.bottom) + ', ภาพเริ่ม y ' + Math.round(b.top) + ')');
    });
    /* CASE-ALIGN: เคสต้องอยู่กลางเครื่อง (วัดตอนตัด transition = ตำแหน่งสุดท้าย) และต้องไม่ค้างเยื้องตอนตรวจ */
    if (!st.classList.contains('off')) st.querySelectorAll('.ty-phone svg').forEach(function (svg) {
      var c = svg.querySelector('.ty-case'), p = svg.children[0]; if (!c || !p || c === p) return;
      var now = getComputedStyle(c).transform;
      c.style.transition = 'none'; c.getBoundingClientRect();
      var A = p.getBoundingClientRect(), B = c.getBoundingClientRect(); c.style.transition = '';
      var dx = (B.left + B.width / 2) - (A.left + A.width / 2), dy = (B.top + B.height / 2) - (A.top + A.height / 2);
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) out.push('CASE-ALIGN เคสไม่ตรงกลางเครื่อง dx=' + dx.toFixed(1) + ' dy=' + dy.toFixed(1));
      if (B.width < A.width || B.height < A.height) out.push('CASE-ALIGN เคสเล็กกว่าเครื่อง');
      if (now !== 'none' && !c.getAnimations().length) out.push('CASE-STUCK เคสค้างที่ ' + now);
    });
    var bd = st.querySelector('.ty-badge');
    if (bd && vis(bd)) st.querySelectorAll('.ty-phone svg').forEach(function (svg) { if (inter(bd.getBoundingClientRect(), ink(svg))) out.push('TRYON-GAP ป้ายเตือนทับภาพเครื่อง'); });
  });

  /* 3) FIXED-COVER (เลื่อนสุดหน้าแล้วดูปุ่มท้ายหน้า) */
  var y0 = scrollY; scrollTo(0, document.documentElement.scrollHeight);
  var bars = [].filter.call(document.querySelectorAll('body *'), function (e) { var p = getComputedStyle(e).position; return (p === 'fixed') && vis(e) && e.getBoundingClientRect().top > innerHeight / 2; });
  if (bars.length) {
    var ctrls = [].filter.call(document.querySelectorAll('a,button,select,input'), function (c) { var r = c.getBoundingClientRect(); return vis(c) && r.bottom > 0 && r.top < innerHeight && !bars.some(function (b) { return b.contains(c); }); });
    bars.forEach(function (b) { var br = b.getBoundingClientRect(); ctrls.forEach(function (c) { var ov = inter(br, c.getBoundingClientRect()); if (ov && ov[1] > 6) out.push('FIXED-COVER ' + sel(b) + ' บัง ' + sel(c) + ' ตอนเลื่อนสุดหน้า'); }); });
  }
  scrollTo(0, y0);
  return out.length ? out.slice(0, 40).join('\n') : 'OK';
})()
