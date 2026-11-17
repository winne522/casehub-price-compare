/* รวมเคส (CaseHub) — แถบเลือกโทรศัพท์/รุ่น + ตัวลองทาบเคสบนภาพเครื่อง
   - TryOn.mountBar(el)  แถบเลือก "โทรศัพท์ → รุ่น" (ติดบนสุดทุกหน้า จำค่าไว้ใน localStorage)
   - TryOn.stage(el, {fixedId})  ภาพเครื่องรุ่นที่เลือก + ปุ่มใส่/ไม่ใส่เคส + เทียบ 2 เคส + รายการเคสให้ลอง
   ภาพเครื่องวาดเป็นมิลลิเมตรจริงตามสเปกใน assets/phones.js (ขนาด สี ตำแหน่งกล้อง ปุ่ม)
   ส่วนเคสเป็นการจำลองรูปทรง ไม่ใช่สีจริงของสินค้า — สีจริงดูจากภาพร้าน */
(function () {
  var D = window.DATA, PH = window.PHONES, IMG = 'https://down-bs-th.img.susercontent.com/';
  var KEY = 'chungrakha.sel';
  var DEF = { brand: 'iphone', model: 'iphone-17-pro-max', caseId: null, pc: 0, cc: 0 };
  var S = (function () { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEF); } })();
  /* hold = ค่าที่ผู้ใช้เลือกเองซึ่งถูกบังไว้ชั่วคราว (หน้าสินค้าโชว์รุ่นที่เคสใส่ได้ แต่ห้ามเซฟทับรุ่นของผู้ใช้) — เลือกรุ่นเองเมื่อไรก็ล้าง */
  var hold = null;
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(hold ? Object.assign({}, S, hold) : S)); } catch (e) {} };
  /* รุ่นทั้งหมดที่ลองทาบได้: iPhone (D.models) + Samsung Galaxy (D.galaxy) — brand ของรุ่นอยู่ที่ m.brand (ไม่มี = iphone) */
  var ALL = function () { return D.models.concat(D.galaxy || []); };
  var brandOfM = function (m) { return (m && m.brand) || 'iphone'; };
  /* temp = true → เปลี่ยนแค่บนหน้านี้ ไม่เซฟทับรุ่น/เคสที่ผู้ใช้เลือกไว้ */
  function set(p, temp) {
    if (temp) { if (!hold) hold = { brand: S.brand, model: S.model, caseId: S.caseId, caseB: S.caseB, cc: S.cc, ccB: S.ccB, pc: S.pc }; }
    else if (p.model) hold = null;
    if (p.model && p.model !== S.model && p.pc == null) p.pc = 0;
    if (p.model) {   // เลือกรุ่นข้ามยี่ห้อ → ตามยี่ห้อของรุ่นนั้น และล้างเคสที่เลือกไว้ (เคส iPhone ใส่ Galaxy ไม่ได้)
      var nb = brandOfM(ALL().filter(function (x) { return x.slug === p.model; })[0]);
      if (nb !== S.brand) { p.brand = nb; p.caseId = null; p.caseB = null; p.cc = 0; p.ccB = 0; }
    }
    Object.assign(S, p); save(); document.dispatchEvent(new CustomEvent('selchange', { detail: S }));
  }
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var baht = function (n) { return '฿' + Math.round(n).toLocaleString('en-US'); };
  var bySlug = function (s) { return ALL().filter(function (m) { return m.slug === s; })[0] || D.models[0]; };
  S.brand = brandOfM(bySlug(S.model));   // กันค่าที่จำไว้ไม่ตรงกัน (brand กับ model)
  /* เคสนี้ใส่ยี่ห้อไหนได้ — ดูจากรุ่นใน confirmed/maybe · เคสที่ไม่ระบุรุ่นเลยนับเป็นของ iPhone (พฤติกรรมเดิม) */
  var caseBrands = function (p) {
    if (LOOK[p.id] && LOOK[p.id].br) return [LOOK[p.id].br];   /* br = ยี่ห้อจริงตามภาพร้าน (ชื่อสินค้ามีคำว่าไอโฟนปน บอทจับรุ่น iPhone ผิด) */
    var f = p.confirmed.concat(p.maybe), b = [];
    f.forEach(function (s) { var k = /^galaxy-/.test(s) ? 'galaxy' : 'iphone'; if (b.indexOf(k) < 0) b.push(k); });
    return b.length ? b : ['iphone'];
  };
  var brandOk = function (p, brand) { return caseBrands(p).indexOf(brand) >= 0; };
  /* เคสที่ลองทาบได้ = เคสคัดมือ + เคสจากรายการ affiliate ที่ออกแบบไว้ใน LOOK (site.js ใส่ไว้ที่ D.extra) */
  var pool = function () { return D.products.concat((D.extra || []).filter(function (p) { return LOOK[p.id]; })); };
  var prod = function (id) { return pool().filter(function (p) { return String(p.id) === String(id); })[0]; };
  var fit = function (p, slug) { return p.confirmed.indexOf(slug) >= 0 ? 'yes' : p.maybe.indexOf(slug) >= 0 ? 'maybe' : 'no'; };
  /* สินค้าเดียวกันหลายร้าน/หลายลิงก์ (ใช้ดีไซน์ LOOK เดียวกัน หรือชื่อ t เดียวกันไม่นับวงเล็บท้าย) → ลองทาบโชว์ชิ้นเดียว:
     ชิ้นที่ใส่รุ่นที่เลือกได้แน่นอนกว่า → ถูกกว่า → ขายดีกว่า (หน้าสินค้า/ลิงก์ตรงยังเปิดทุกชิ้นได้ผ่าน prod)
     LOOK.g = ชื่อกลุ่มเอง เมื่อเป็นสินค้าเดียวกันแต่วาดแยกแบบตามรุ่น (เช่น Vesn ใส่บัตร: ลิงก์ S26/S25 กับลิงก์ S24/S23) */
  var FR = { yes: 0, maybe: 1, no: 2 };
  var gkey = function (p) { var l = LOOK[p.id]; return l ? 'L:' + (l.g || (l.t ? l.t.replace(/\s*\([^)]*\)\s*$/, '') : p.id)) : 'P:' + p.id; };
  var uniq = function (list, slug) {
    var best = {};
    list.forEach(function (p) {
      var k = gkey(p), b = best[k];
      if (!b || (FR[fit(p, slug)] - FR[fit(b, slug)] || p.price - b.price || (b.soldN || 0) - (p.soldN || 0)) < 0) best[k] = p;
    });
    return list.filter(function (p) { return best[gkey(p)] === p; });
  };
  var cnt = function (slug) { return uniq(pool(), slug).filter(function (p) { return fit(p, slug) !== 'no'; }).length; };
  var nm = function (p) { return (LOOK[p.id] && LOOK[p.id].t) || p.title; };
  var src = function (p) { return /^https?:/.test(p.img) ? p.img : IMG + p.img; };
  var short = function (m) { var n = m.name.replace(/^(iPhone|Galaxy)\s*/, ''); if (m.series.length > 1 || m.brand !== 'galaxy') n = n.replace(m.series, '').trim(); return n === '+' ? 'Plus' : n || 'รุ่นธรรมดา'; };   // ซีรีส์ 'A' ของ Galaxy: ใช้ชื่อเต็ม (A56, A55 …)
  var tabName = function (g) { return g === 'A' ? 'A series' : g; };

  var BRANDS = [{ k: 'iphone', n: 'iPhone', sub: 'Apple', on: true }, { k: 'galaxy', n: 'Samsung Galaxy', sub: 'S23 – S26 · A series', on: true }, { k: 'oppo', n: 'OPPO / vivo', sub: 'เร็ว ๆ นี้' }, { k: 'airpods', n: 'AirPods', sub: 'เร็ว ๆ นี้' }];

  /* ---------- สี ---------- */
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(a) { return '#' + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function lum(h) { if (!h || h[0] !== '#') return 200; var c = rgb(h); return c[0] * .3 + c[1] * .59 + c[2] * .11; }
  /* ทำให้สว่างขึ้นโดยคงสีสัน (ปรับ L ใน HSL) — เงาสะท้อนบนอะลูมิเนียมอโนไดซ์ยังเป็นสีเดิม ไม่ซีดเป็นเทาเหมือนผสมสีขาว */
  function lit(h, t) {
    var c = rgb(h).map(function (v) { return v / 255; }), mx = Math.max.apply(0, c), mn = Math.min.apply(0, c), l = (mx + mn) / 2, d = mx - mn;
    var s = d ? d / (1 - Math.abs(2 * l - 1)) : 0, H = !d ? 0 : mx === c[0] ? ((c[1] - c[2]) / d + 6) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
    var L = l + (1 - l) * t, C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs(H % 2 - 1)), m = L - C / 2;
    var o = H < 1 ? [C, X, 0] : H < 2 ? [X, C, 0] : H < 3 ? [0, C, X] : H < 4 ? [0, X, C] : H < 5 ? [X, 0, C] : [C, 0, X];
    return hex(o.map(function (v) { return (v + m) * 255; }));
  }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function frameCol(P, back) {
    var l = lum(back);
    if (P.fr === 'steel') return mix(back, l > 150 ? '#cfcfcb' : '#bdbdbb', .5);
    if (P.fr === 'ti') return mix(back, '#b9b7b1', .5);
    if (P.fr === 'uni') return mix(back, l > 150 ? '#a9a9ab' : '#8d8d90', .35);
    return mix(back, l > 150 ? '#a8a8a8' : '#c4c4c4', .4);
  }

  /* ---------- รูปทรงกล้อง (มม. จากมุมซ้ายบนของภาพหลังเครื่อง) ----------
     วัดจากภาพสินค้าของ Apple ทีละตระกูล (พ.ย. 2026): 13/14 · 15 · 16/17 · 14 Pro–16 Pro · 18 Pro Max
     L = [x, y, รัศมีขอบนอกของวงเลนส์, 'tele'?] · flash = [x, y, r] · aux = [x, y, r, 'lidar'?] */
  function plate(P) {
    var w = P.w;
    if (P.g) {   // Galaxy: S26 / S26 Ultra มีแคปซูลยกสูง · รุ่นอื่นเลนส์ลอยเดี่ยว (คืนกรอบรวมของเลนส์ไว้ให้ส่วนที่ต้องใช้ขนาดกลุ่มกล้อง)
      if (P.g.isl) return { x: P.g.isl[0], y: P.g.isl[1], w: P.g.isl[2], h: P.g.isl[3], r: P.g.isl[4], pill: 1, gx: 1 };
      var x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
      P.g.L.forEach(function (c) { x0 = Math.min(x0, c[0] - c[2]); y0 = Math.min(y0, c[1] - c[2]); x1 = Math.max(x1, c[0] + c[2]); y1 = Math.max(y1, c[1] + c[2]); });
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: 4, gx: 1 };
    }
    if (P.cam === 'diag') return P.bk === 'matte' ? { x: 3.8, y: 3.8, w: 30, h: 30, r: 7.6 } : { x: 2.9, y: 3, w: 30.8, h: 30.8, r: 8.6 };
    if (P.cam === 'pill') return { x: 2.8, y: 4.1, w: 22.4, h: 37.5, r: 11.2, pill: 1 };
    if (P.cam === 'tri') return { x: 2.6, y: 2.6, w: 39.4, h: 39.4, r: 10 };
    /* 17 Pro / 18 Pro — แถบสูง 43.7 มม. ผิวบนของแถบเริ่ม 5.1/4.75 มม. จากขอบ */
    if (P.cam === 'triwide') return { x: 0, y: 0, w: w, h: 43.7, r: 7, wide: 1, face: { x: 5.1, y: 4.75, w: w - 9.9, h: 38.15, r: 7.5, rb: 5.5 } };
    return { x: 2.2, y: 2.6, w: w - 4.4, h: 22, r: 10.8, wide: 1 };
  }
  function lenses(P, pl) {
    var o = pl.x, t = pl.y, w = P.w;
    if (P.g) return { L: P.g.L, rw: P.g.rw, flash: P.g.flash, aux: [], sh: .32, cream: '#eadfc2', black: 1 };
    /* rw = ความหนาวงโลหะรอบเลนส์ (ขอบนอก → กระจก) */
    if (P.cam === 'diag') return P.bk === 'matte' ? { L: [[12.7, 13, 7], [25.8, 25.3, 7]], rw: 1.35, flash: [27.4, 10.1, 2.8], aux: [[11.4, 26.3, .75]] } :
      { L: [[11.8, 11.9, 6.6], [24.7, 24.7, 6.6]], rw: 1.3, flash: [26.6, 9.4, 2.6], aux: [[10.6, 25.5, .75]] };
    if (P.cam === 'pill') return { L: [[13.6, 14, 7.3], [13.6, 31.4, 7.3]], rw: .95, flash: [29.7, 22.2, 3.1], aux: [[20.5, 22.7, .35]] };   // แฟลชอยู่นอกแคปซูล
    if (P.cam === 'tri') return { L: [[14.1, 13.8, 7.6], [14.1, 33, 7.6], [31.8, 23.8, 7.6, 'tele']], rw: 1.55, flash: [32.2, 9.8, 2.9], aux: [[32.1, 37, 3.1, 'lidar'], [32.2, 30.6, .35]] };
    if (P.cam === 'triwide') return { L: [[14.35, 14.3, 8.25], [14.35, 33.7, 8.25], [32.45, 23.9, 8.25, 'tele']], rw: 1.4, flash: [w - 13.8, 13.9, 3.2], aux: [[w - 13.8, 34.2, 3.45, 'lidar'], [w - 13.7, 23.8, .3]] };
    return { L: [[o + 12, t + pl.h / 2, 8.4]], rw: 1.3, flash: [o + pl.w - 12, t + pl.h / 2 - 3.4, 2.1], aux: [[o + pl.w - 12, t + pl.h / 2 + 3.6, .5]] };
  }
  /* ตำแหน่งปุ่มข้างเครื่อง (ภาพหลัง: ซ้าย = ด้านขวาของเครื่อง) — 17/18 Pro วัดจากภาพ Apple
     cc = ปุ่ม Camera Control (เรียบเสมอขอบ ไม่นูน): วัดจากภาพด้านข้าง _AV1 ของ 16 / 16 Plus / 16 Pro / 17 Pro / Air
     ทุกขนาดอยู่ที่ h−60.5 ถึง h−42.5 มม. และปุ่มเปิดเครื่องของรุ่นเหล่านี้อยู่ที่ 46.3–64.3 มม. */
  function btnPos(P) {
    if (P.g) return { L: P.g.btn, R: [], cc: null };   // Galaxy: ปุ่มเพาเวอร์/ปรับเสียงอยู่ด้านขวาของเครื่อง (ภาพหลัง = ซ้ายมือ) · ด้านซ้ายไม่มีปุ่ม
    var cc = P.btn === 'actcc' ? [P.h - 60.5, P.h - 42.5] : null;
    if (P.fr === 'uni') return { L: [[46.7, 64.5]], R: [[30.9, 37.7], [42.8, 54.1], [57, 68.3]], cc: cc };
    var vy = P.btn === 'sw' ? 28 : 30;
    return { L: [cc ? [46.3, 64.3] : [38, 54]], R: [[vy, vy + 10.5], [vy + 14, vy + 24.5], P.btn === 'sw' ? [17, 20.6] : [vy - 11, vy - 4.6]], cc: cc };
  }
  var APPLE = 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';
  var uid = 0;

  /* ---------- ตัวช่วยวาดให้เหมือนภาพถ่าย ---------- */
  function Lof(c) { var v = rgb(c); return (Math.max.apply(0, v) + Math.min.apply(0, v)) / 510; }
  /* สว่างขึ้นแบบค่า L เพิ่มคงที่ (วัดจากภาพ: ไฮไลต์เพิ่มราว ๆ เท่ากันทุกสี) */
  function up(c, d) { return lit(c, Math.min(.9, d / Math.max(.001, 1 - Lof(c)))); }
  function dn(c, t) { return mix(c, '#000000', t); }
  /* เพิ่มความอิ่มสี + ลดความสว่าง (แคปซูลกล้อง 16/17 เป็นกระจกสีเข้มกว่าตัวเครื่อง) */
  function deep(h, f, dl, dh) {
    var c = rgb(h).map(function (v) { return v / 255; }), mx = Math.max.apply(0, c), mn = Math.min.apply(0, c), l = (mx + mn) / 2, d = mx - mn;
    var s = d ? d / (1 - Math.abs(2 * l - 1)) : 0, H = !d ? 0 : mx === c[0] ? ((c[1] - c[2]) / d + 6) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
    H = (H + (dh || 0) / 60 + 6) % 6;
    var L = Math.max(0, Math.min(1, l + dl)), S = Math.min(1, s * f), C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs(H % 2 - 1)), m = L - C / 2;
    var o = H < 1 ? [C, X, 0] : H < 2 ? [X, C, 0] : H < 3 ? [0, C, X] : H < 4 ? [0, X, C] : H < 5 ? [X, 0, C] : [C, 0, X];
    return hex(o.map(function (v) { return (v + m) * 255; }));
  }
  function rrp(x, y, w, h, rt, rb) {
    return 'M' + (x + rt) + ' ' + y + 'H' + (x + w - rt) + 'A' + rt + ' ' + rt + ' 0 0 1 ' + (x + w) + ' ' + (y + rt) + 'V' + (y + h - rb) + 'A' + rb + ' ' + rb + ' 0 0 1 ' + (x + w - rb) + ' ' + (y + h) +
      'H' + (x + rb) + 'A' + rb + ' ' + rb + ' 0 0 1 ' + x + ' ' + (y + h - rb) + 'V' + (y + rt) + 'A' + rt + ' ' + rt + ' 0 0 1 ' + (x + rt) + ' ' + y + 'Z';
  }
  /* รูปหลายเหลี่ยมมุมมน: pts = จุดยอดวนตามเข็ม · rs = รัศมีมุมของแต่ละจุด (โค้งกำลังสองผ่านจุดยอด) — ใช้ทำช่องกล้องรูปตัว L ของเคส */
  function rpoly(pts, rs) {
    var n = pts.length, o = '';
    pts.forEach(function (c, i) {
      var p = pts[(i + n - 1) % n], q = pts[(i + 1) % n], d1 = Math.hypot(p[0] - c[0], p[1] - c[1]), d2 = Math.hypot(q[0] - c[0], q[1] - c[1]), r = Math.min(rs[i], d1 / 2, d2 / 2);
      var a = [c[0] + (p[0] - c[0]) / d1 * r, c[1] + (p[1] - c[1]) / d1 * r], b = [c[0] + (q[0] - c[0]) / d2 * r, c[1] + (q[1] - c[1]) / d2 * r];
      o += (i ? 'L' : 'M') + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + 'Q' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ' ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
    });
    return o + 'Z';
  }
  /* ชุดสร้าง <defs> ที่ id ไม่ชนกันระหว่างภาพหลายภาพในหน้าเดียว */
  function kit(u) {
    var st = function (s) { return s.map(function (a) { return '<stop offset="' + a[0] + '" stop-color="' + a[1] + '"' + (a[2] != null ? ' stop-opacity="' + a[2] + '"' : '') + '/>'; }).join(''); };
    return {
      U: function (n) { return 'url(#' + n + u + ')'; },
      lin: function (n, x2, y2, s) { return '<linearGradient id="' + n + u + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">' + st(s) + '</linearGradient>'; },
      rad: function (n, cx, cy, r, s) { return '<radialGradient id="' + n + u + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + st(s) + '</radialGradient>'; },
      blur: function (n, d) { return '<filter id="' + n + u + '" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + d + '"/></filter>'; },
      /* เม็ดผิวพ่นทราย — ค่ากลางของ noise = ความสว่างของสีพื้น จึงไม่ทำให้สีเพี้ยน */
      grain: function (n, base, a) { var g = (lum(base) / 255 - .5).toFixed(3); return '<filter id="' + n + u + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="2" seed="7"/><feColorMatrix values="1 0 0 0 ' + g + ' 1 0 0 0 ' + g + ' 1 0 0 0 ' + g + ' 0 0 0 0 ' + a + '"/><feComposite in2="SourceAlpha" operator="in"/></filter>'; }
    };
  }
  /* defs ของเลนส์/แฟลช/LiDAR — rg = สีวงรอบเลนส์ */
  function camDefs(K, rg) {
    var dk = lum(rg) < 90;
    return K.blur('b1', .5) + K.blur('b2', .25) + K.blur('b3', .9) + K.blur('b4', .15) +
      K.lin('lo', 1, 1, [[0, up(rg, dk ? .34 : .2)], [.35, up(rg, dk ? .14 : .04)], [.7, up(rg, dk ? .06 : 0)], [1, up(rg, dk ? .17 : .08)]]) +   // วงรอบเลนส์ (ขอบนอกสว่าง)
      K.lin('lt', 1, 1, [[0, up(rg, .08)], [.5, up(rg, .04)], [1, rg]]) +
      K.lin('li', 1, 1, [[0, dn(rg, .4)], [1, up(rg, .2)]]) +                                                                                  // ขอบในเว้า (สว่างล่างขวา)
      K.rad('lg', .45, .4, .65, [[0, '#202325'], [.6, '#121415'], [1, '#08090a']]) +                                                        // กระจกแซฟไฟร์
      K.rad('le', .4, .35, .7, [[0, '#33384a'], [.5, '#15171d'], [1, '#09090c']]) +                                                         // ชิ้นเลนส์ด้านใน
      K.rad('fo', .5, .5, .5, [[0, '#fdfdfd'], [.72, '#e2e2e2'], [1, '#a6a6a6']]) + K.rad('fi', .45, .4, .6, [[0, '#ffffff'], [.6, '#ededed'], [1, '#cdcdcd']]) +   // แฟลช
      K.rad('ld', .45, .4, .6, [[0, '#262626'], [1, '#101010']]) + K.lin('lr', 1, 1, [[0, '#fff', 0], [.6, '#fff', 0], [1, '#fff', .28]]) +   // LiDAR
      K.lin('rs', 1, 1, [[0, '#fff', .8], [.3, '#fff', .05], [.7, '#fff', 0], [1, '#fff', .45]]) +                                          // ขอบโลหะสะท้อนแสงคม ๆ
      K.rad('mi', .4, .35, .6, [[0, '#8a8a8e'], [1, '#3c3c40']]);                                                                             // รูไมค์ (เทา)
  }
  function camArt(ln, rg, K) {
    var U = K.U, s = '';
    ln.L.forEach(function (c) {
      var x = c[0], y = c[1], r = c[2], q = c[4] || ln.rw || 1.4, e = r - q, tele = c[3] === 'tele', er = e * (tele ? .51 : .34);
      var C = function (rr, f, ex) { return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="' + f + '"' + (ex || '') + '/>'; };
      /* เลนส์ยื่นออกมา: เงาตกขวาล่าง + เงาแนบรอบวง */
      var sh = ln.sh || 1;   // ความแรงเงา (Galaxy เลนส์ลอยเดี่ยว เงาบางกว่าแผ่นกล้อง iPhone)
      s += C(r + .3, '#000', ' opacity="' + .55 * sh + '" transform="translate(' + .5 * sh + ' ' + .85 * sh + ')" filter="' + U('b1') + '"') + C(r + .1, 'none', ' stroke="#000" stroke-opacity="' + .28 * sh + '" stroke-width=".6" filter="' + U('b2') + '"');
      s += C(r, U('lo')) + C(r - q * .32, U('lt')) + C(r - q * .71, dn(rg, .6)) + C(r - q * .82, U('li')) + C(e, U('lg')) + (ln.black ? C(e, '#050506', ' opacity=".78"') : '');   // black: กระจกเลนส์ Galaxy ดำสนิท
      s += C(r - .13, 'none', ' stroke="' + U('rs') + '" stroke-width=".26"') + C(e + .08, 'none', ' stroke="' + U('rs') + '" stroke-width=".16" stroke-opacity=".6" transform="rotate(180 ' + x + ' ' + y + ')"');
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + (e * .82) + '" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".5"/><circle cx="' + x + '" cy="' + y + '" r="' + (e * .62) + '" fill="none" stroke="#9fb0c0" stroke-opacity=".04" stroke-width=".25"/>';
      s += C(er, U('le'));
      /* Galaxy: กระจกเลนส์เคลือบสะท้อนน้ำเงิน-ม่วง (ภาพเรนเดอร์ทางการทุกรุ่น เห็นวงน้ำเงินรอบชิ้นเลนส์ + จุดแสงน้ำเงิน) */
      if (ln.black) s += C(er * 1.55, 'none', ' stroke="#3d55c9" stroke-opacity=".13" stroke-width="' + er * .3 + '" filter="' + U('b2') + '"') + C(er * .7, '#2d43b0', ' opacity=".22"') +
        '<path d="M' + (x - er * 1.25) + ' ' + (y + er * .35) + 'A' + er * 1.3 + ' ' + er * 1.3 + ' 0 0 1 ' + (x + er * .2) + ' ' + (y - er * 1.28) + '" fill="none" stroke="#5a78ff" stroke-opacity=".28" stroke-width="' + er * .22 + '" stroke-linecap="round" filter="' + U('b2') + '"/>';   // แสงสะท้อนน้ำเงินเป็นเสี้ยวด้านซ้ายบน
      s += '<ellipse cx="' + (x - er * .3) + '" cy="' + (y - er * .32) + '" rx="' + er * .18 + '" ry="' + er * .12 + '" fill="#cfd8ff" opacity=".55" transform="rotate(-30 ' + (x - er * .3) + ' ' + (y - er * .32) + ')"/>';
      if (tele) s += '<path d="M' + (x + er * .55) + ' ' + (y + er * .1) + 'A' + er * .7 + ' ' + er * .7 + ' 0 0 1 ' + (x - er * .1) + ' ' + (y + er * .62) + '" stroke="#c9b8ff" stroke-opacity=".18" stroke-width=".5" fill="none" stroke-linecap="round"/>';
      s += '<path d="M' + (x - e * .82) + ' ' + (y - e * .2) + 'A' + e * .85 + ' ' + e * .85 + ' 0 0 1 ' + (x - e * .15) + ' ' + (y - e * .83) + '" stroke="#fff" stroke-opacity=".1" stroke-width=".7" fill="none" stroke-linecap="round"/>';
    });
    var f = ln.flash, Cf = function (rr, fl, ex) { return '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="' + rr + '" fill="' + fl + '"' + (ex || '') + '/>'; };
    if (ln.cream) s += Cf(f[2] + .35, '#000', ' opacity=".28" transform="translate(.25 .4)" filter="' + U('b2') + '"') + Cf(f[2], ln.cream, ' stroke="#000" stroke-opacity=".3" stroke-width=".18"') + Cf(f[2] * .62, '#fff', ' opacity=".35" filter="' + U('b2') + '"');   // Galaxy: แฟลชเป็นจุดครีมเรียบ
    else s += Cf(f[2], U('fo'), ' stroke="#000" stroke-opacity=".28" stroke-width=".2"') + Cf(f[2] * .76, U('fi'), ' stroke="#000" stroke-opacity=".12" stroke-width=".15"') +
      Cf(f[2] * .52, 'none', ' stroke="#000" stroke-opacity=".07" stroke-width=".2"') + Cf(f[2] * .3, '#f6f6f6', ' stroke="#000" stroke-opacity=".12" stroke-width=".14"');
    ln.aux.forEach(function (a) {
      if (a[3] === 'lidar') s += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '" fill="' + U('ld') + '"/><circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + (a[2] - .15) + '" fill="none" stroke="' + U('lr') + '" stroke-width=".3"/>';
      else s += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '" fill="' + (a[2] >= .5 ? U('mi') : '#0e0e0e') + '"/>';
    });
    return s;
  }
  function btnArt(x, y0, y1, c) { return '<rect x="' + x + '" y="' + y0 + '" width="1.3" height="' + (y1 - y0) + '" rx=".55" fill="' + dn(c, .12) + '"/><rect x="' + (x + .25) + '" y="' + (y0 + .4) + '" width=".35" height="' + (y1 - y0 - .8) + '" rx=".17" fill="' + lit(c, .35) + '" opacity=".6"/>'; }
  function btnsArt(P, c) {
    var b = btnPos(P), s = '';
    b.L.forEach(function (y) { s += btnArt(-.45, y[0], y[1], c); }); b.R.forEach(function (y) { s += btnArt(P.w - .85, y[0], y[1], c); });
    /* Camera Control: กระจกแซฟไฟร์เรียบเสมอขอบ มีขอบโลหะรอบ — จากด้านหลังเห็นเป็นเส้นเข้มบาง ๆ */
    if (b.cc) s += '<rect x="-.35" y="' + b.cc[0] + '" width=".8" height="' + (b.cc[1] - b.cc[0]) + '" rx=".4" fill="' + dn(c, .45) + '"/><rect x="-.2" y="' + (b.cc[0] + .5) + '" width=".3" height="' + (b.cc[1] - b.cc[0] - 1) + '" rx=".15" fill="' + lit(c, .25) + '" opacity=".45"/>';
    return s;
  }
  /* ขอบเครื่อง: เส้นขอบบาง → ไฮไลต์ขอบโค้งที่ ~1 มม. → จางเข้าสีเครื่องที่ ~3 มม. (ต้องมี defs 'ed') */
  function frameArt(w, h, R, fc, K) {
    var U = K.U;
    return '<rect width="' + w + '" height="' + h + '" rx="' + R + '" fill="' + dn(fc, lum(fc) < 90 ? .12 : .1) + '"/>' +
      '<rect x=".6" y=".6" width="' + (w - 1.2) + '" height="' + (h - 1.2) + '" rx="' + (R - .6) + '" fill="' + U('ed') + '" filter="' + U('b2') + '"/>' +
      '<rect x="1.7" y="1.7" width="' + (w - 3.4) + '" height="' + (h - 3.4) + '" rx="' + (R - 1.7) + '" fill="' + fc + '" filter="' + U('b3') + '"/>' +
      '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="' + (R - 3) + '" fill="' + fc + '"/>';
  }
  /* โลโก้ Apple (bbox ของ path = 2.2–21.8 × 0–24) */
  function logoArt(w, cy, hh, fill, edge) { var k = hh / 24; return '<path d="' + APPLE + '" transform="translate(' + (w / 2 - 12 * k) + ' ' + (cy - 12 * k) + ') scale(' + k + ')" fill="' + fill + '" stroke="' + edge + '" stroke-width=".18" stroke-opacity=".35"/>'; }
  var logoY = function (P) { return P.h * (P.fr === 'uni' ? .597 : .5); };   // 17/18 Pro โลโก้อยู่ 59.7% · รุ่นอื่นกลางเครื่อง
  /* กึ่งกลางวงแม่เหล็กของเคส: iPhone = ตำแหน่งโลโก้ (MagSafe) · Galaxy ไม่มีแม่เหล็กในตัว เคส Qi2 ใช้วงกลางหลังเครื่อง (ต่ำกว่ากลุ่มกล้อง) */
  var magY = function (P) { return P.g ? P.h * .47 : logoY(P); };

  /* ---------- 17 Pro / 18 Pro (ยูนิบอดีอะลูมิเนียม) ----------
     วัดจากภาพหลังเครื่อง 18 Pro Max ของ Apple (6.2 พิกเซล/มม.) · ce = [ชื่อ, สวอตช์, ที่มา, สีอะลูมิเนียม, สีกระจก] */
  function uniSVG(P, ce, u) {
    var w = P.w, h = P.h, R = 10, al = ce[3] || ce[1], gl = ce[4] || al, dk = lum(al) < 90, K = kit(u), U = K.U;
    var pl = plate(P), ln = lenses(P, pl), F = pl.face, pb = pl.h, hi = up(al, .4), sh = dn(al, dk ? .45 : .2), s = '';
    s += '<defs>' + camDefs(K, al) + K.grain('gr', al, .09) +
      K.lin('ed', 1, 1, [[0, up(al, .46)], [.5, up(al, .4)], [1, up(al, .34)]]) +                              // ไฮไลต์ขอบกรอบ
      K.lin('pf', 0, 1, [[0, up(al, .12)], [.2, up(al, .08)], [.5, al], [1, dn(al, .03)]]) +                    // ผิวบนแถบกล้อง (บนสว่าง)
      K.lin('pr', 1, 0, [[0, hi], [.7, hi], [1, up(al, .25)]]) +                                                // ขอบโค้งของแถบกล้อง (ห่างขอบ ~3.5 มม.)
      K.lin('gs', 0, 1, [[0, gl], [.25, dn(gl, .03)], [.6, dn(gl, dk ? .1 : .07)], [1, dn(gl, dk ? .34 : .24)]]) + // กระจกหลัง (สว่างบน มืดล่าง ตามที่วัดจากภาพ)
      K.lin('gx', 1, 0, [[0, '#fff', .03], [.5, '#fff', 0], [1, '#000', .03]]) +
      K.lin('lgo', 1, 1, [[0, up(gl, .05)], [1, up(dn(gl, .1), .03)]]) + '</defs>';
    s += btnsArt(P, al) + frameArt(w, h, R, al, K);
    /* เสาอากาศ (แถบคั่นบนกรอบ) */
    s += '<g fill="' + sh + '" opacity=".75"><rect x="0" y="15.6" width="4.4" height="1.1"/><rect x="' + (w - 4.4) + '" y="15.6" width="4.4" height="1.1"/><rect x="0" y="' + (h - 16.6) + '" width="1.9" height="1"/><rect x="' + (w - 1.9) + '" y="' + (h - 16.6) + '" width="1.9" height="1"/></g>';
    /* แถบกล้อง: เงาใต้ขั้น → ไฮไลต์บาง ๆ ใต้ขั้น → ไหล่โค้ง → ผิวบน */
    s += '<path d="' + rrp(2.2, pb - 12, w - 4.4, 12.2, 6, 6) + '" fill="#000" opacity=".4" filter="' + U('b2') + '"/>';
    s += '<rect x="6" y="' + (pb + .3) + '" width="' + (w - 12) + '" height=".7" rx=".35" fill="' + up(al, .17) + '" filter="' + U('b4') + '"/>';
    s += '<path d="' + rrp(3, 3, w - 6, pb - 3, R - 3, 6) + '" fill="' + al + '" filter="' + U('b2') + '"/>';
    s += '<path d="' + rrp(3.5, 3.5, w - 7, pb - 4.2, F.r + 1.5, F.rb + 1) + '" fill="none" stroke="' + U('pr') + '" stroke-width="1" filter="' + U('b4') + '"/>';
    s += '<rect x="' + (w - 4.6) + '" y="7" width="2.2" height="' + (pb - 14) + '" fill="' + sh + '" opacity=".35" filter="' + U('b3') + '"/>';
    s += '<path d="' + rrp(F.x, F.y, F.w, F.h, F.r, F.rb) + '" fill="' + U('pf') + '" stroke="' + dn(al, .2) + '" stroke-width=".2" stroke-opacity=".7"/>';
    /* กระจกหลัง (Ceramic Shield) ฝังใต้แถบกล้อง: ร่องมืดที่ ~4 มม. จากขอบ แล้วเป็นกระจก */
    var gx0 = 4.25, gy = pb + 5.4, gb = h - 4.5, gp = rrp(gx0, gy, w - 2 * gx0, gb - gy, 5.5, 8);
    s += '<path d="' + rrp(gx0 - .35, gy - .35, w - 2 * gx0 + .7, gb - gy + .7, 5.85, 8.35) + '" fill="' + dn(al, .25) + '"/>';
    s += '<path d="' + gp + '" fill="' + U('gs') + '"/><path d="' + gp + '" fill="' + U('gx') + '"/>';
    s += '<path d="M' + (gx0 + 5.5) + ' ' + (gy + .2) + 'H' + (w - gx0 - 5.5) + '" stroke="' + lit(gl, .3) + '" stroke-width=".3" opacity=".55" filter="' + U('b2') + '"/>';
    s += logoArt(w, logoY(P), 20, U('lgo'), dn(gl, .25));
    s += '<rect x=".3" y=".3" width="' + (w - .6) + '" height="' + (h - .6) + '" rx="' + (R - .3) + '" fill="#000" filter="' + U('gr') + '"/>';   // เม็ดผิวทั้งเครื่อง (ใต้เลนส์)
    return s + camArt(ln, al, K);
  }

  /* ---------- iPhone 13–16, 17, Air ----------
     กระจกหลังทั้งแผ่น + แผ่นกล้องยกสูง: 13/14 กระจกเงา · 15/16/17 กระจกสีเนื้อด้าน · Pro กระจกฝ้า + แผ่นกล้องกระจกเงา
     16/17 แคปซูลกล้องเป็นกระจกสีเข้มกว่าตัวเครื่อง แฟลชอยู่นอกแคปซูล */
  function classicSVG(P, ce, u) {
    var w = P.w, h = P.h, R = P.cam === 'air' ? 10.2 : 9.4, col = ce[1], gl = ce[4] || col, fc = ce[3] || frameCol(P, gl);
    /* วงเลนส์: Pro = โลหะสีเดียวกับเครื่อง · 13–15 = อะลูมิเนียมสีกรอบ · 16/17 = สีแคปซูล */
    var pro = P.fr === 'steel' || P.fr === 'ti', glossy = P.bk === 'glossy', dk = lum(gl) < 90, K = kit(u), U = K.U;
    var pl = plate(P), ln = lenses(P, pl), pc = pl.pill ? deep(gl, .75, -.28, 10) : pro ? dn(gl, .05) : P.bk === 'matte' ? deep(gl, 1.2, -.04) : up(gl, .03), rg = pro ? (dk ? dn(gl, .12) : gl) : pl.pill ? dn(pc, .05) : fc, s = '';
    var fe = P.fr === 'steel' ? [.55, .3, .46] : [.42, .3, .36];   // สเตนเลสเงาวาวกว่าอะลูมิเนียม/ไทเทเนียม
    s += '<defs>' + camDefs(K, rg) + K.grain('gr', gl, glossy ? .025 : .08) +
      K.lin('ed', 1, 1, [[0, up(fc, fe[0])], [.5, up(fc, fe[1])], [1, up(fc, fe[2])]]) +
      K.lin('gs', 0, 1, [[0, up(gl, .05)], [.5, gl], [1, dn(gl, dk ? .22 : .12)]]) +
      K.lin('gsh', 1, 1, [[0, '#fff', 0], [.27, '#fff', 0], [.36, '#fff', glossy ? .16 : .05], [.47, '#fff', glossy ? .04 : 0], [.6, '#fff', 0]]) +   // แสงสะท้อนพาดทแยง
      (pl.pill ? K.lin('pg', .3, 1, [[0, up(pc, .06)], [.45, pc], [1, dn(pc, .4)]])   // แคปซูล 16/17 (วัดจากภาพ: ล่างมืดกว่าบนมาก)
        : K.lin('pg', 1, 1, [[0, up(pc, pro || glossy ? .12 : .05)], [.45, up(pc, .02)], [1, dn(pc, .08)]])) +
      K.lin('ps', 1, 1, [[0, '#fff', P.bk === 'matte' && !pl.pill ? .04 : .2], [.4, '#fff', .03], [.6, '#fff', 0]]) +
      K.lin('pe', 1, 1, [[0, '#fff', .9], [.35, '#fff', .12], [.6, '#000', 0], [1, '#000', .5]]) +
      K.lin('lgo', 1, 1, [[0, up(gl, pro ? .14 : .09)], [1, up(gl, .03)]]) + '</defs>';
    s += btnsArt(P, fc) + frameArt(w, h, R, fc, K);
    var gp = rrp(1.25, 1.25, w - 2.5, h - 2.5, R - 1.25, R - 1.25);
    s += '<path d="' + gp + '" fill="' + U('gs') + '" stroke="' + dn(fc, .35) + '" stroke-width=".25"/><path d="' + gp + '" fill="' + U('gsh') + '"/>';
    s += '<path d="' + gp + '" fill="#000" filter="' + U('gr') + '"/>';
    s += logoArt(w, logoY(P), P.cam === 'air' ? 17 : 15.5, U('lgo'), dn(gl, .25));
    /* แผ่นกล้องยกสูง */
    var pp = rrp(pl.x, pl.y, pl.w, pl.h, pl.r, pl.r);
    /* แผ่นยกสูง: เงาฟุ้ง + เงาแนบ → ผิวแผ่น → ขอบเอียง (สว่างซ้ายบน มืดขวาล่าง) → เส้นแสงพาดขอบซ้าย */
    var so = P.bk === 'matte' && !pl.pill ? .35 : 1;   // 15: กระจกขึ้นรูปเนียนไปกับตัวเครื่อง เงาน้อย
    s += '<path d="' + pp + '" fill="#000" opacity="' + .42 * so + '" transform="translate(.55 .95)" filter="' + U('b3') + '"/><path d="' + pp + '" fill="#000" opacity="' + .3 * so + '" transform="translate(.2 .35)" filter="' + U('b1') + '"/>';
    s += '<path d="' + pp + '" fill="' + U('pg') + '" stroke="' + dn(pc, .3) + '" stroke-opacity=".55" stroke-width=".2"/><path d="' + pp + '" fill="' + U('ps') + '"/>';
    s += '<path d="' + rrp(pl.x + .4, pl.y + .4, pl.w - .8, pl.h - .8, pl.r - .4, pl.r - .4) + '" fill="none" stroke="' + U('pe') + '" stroke-width=".75" filter="' + U('b4') + '"/>';
    var sr = pl.r - 1.1, sx = pl.x + 1.1, sy = pl.y + 1.1;
    s += '<path d="M' + sx + ' ' + (pl.y + pl.h - pl.r) + 'V' + (sy + sr) + 'A' + sr + ' ' + sr + ' 0 0 1 ' + (sx + sr) + ' ' + sy + '" fill="none" stroke="#fff" stroke-opacity="' + (pl.pill ? .55 : P.bk === 'matte' ? .2 : .35) + '" stroke-width=".8" stroke-linecap="round" filter="' + U('b2') + '"/>';
    return s + camArt(ln, rg, K);
  }

  /* ---------- Samsung Galaxy S24 / S25 / S26 ----------
     หลังกระจกด้านทั้งแผ่น + กรอบเรียบ · S24/S25: เลนส์ลอยเดี่ยวไม่มีแผ่นรอง · S26: แคปซูลยกสูงครอบกลุ่มเลนส์ · แฟลชเป็นจุดครีมเล็ก ๆ ข้างเลนส์
     ตำแหน่งทั้งหมดมาจาก phones.js (g) — ชิ้นส่วนร่วมกับ iPhone: kit / camDefs / camArt / frameArt / btnsArt (ห้ามเขียนเลนส์ซ้ำ) */
  function galaxySVG(P, ce, u) {
    var w = P.w, h = P.h, R = P.R, g = P.g, gl = ce[4] || ce[1], fc = ce[3] || frameCol(P, gl), dk = lum(gl) < 110, K = kit(u), U = K.U, s = '';
    var rg = g.rg === 'dk' ? mix('#1b1c1f', gl, .1) : g.rg === 'lt' ? up(fc, .17) : g.rg && g.rg[0] === '#' ? g.rg : mix(fc, '#000000', .5);   // วงรอบเลนส์: ดำ (S25/S26) · โลหะสีกรอบ (S24) · ระบุสีเอง (A56/A26 วงเทาบนแคปซูลดำ)
    var ic = g.isc;   // สีแคปซูลที่ไม่ใช่สีกระจกหลัง (A56/A26 = แคปซูลดำเงา)
    var pl = plate(P), ln = lenses(P, pl), I = g.isl;
    s += '<defs>' + camDefs(K, rg) + K.grain('gr', gl, .06) +
      K.lin('ed', 1, 1, [[0, up(fc, .2)], [.5, up(fc, .14)], [1, up(fc, .1)]]) +
      K.lin('gs', .25, 1, [[0, up(gl, .09)], [.5, gl], [1, dn(gl, dk ? .4 : lum(gl) > 190 ? .13 : .3)]]) +   // ตัวเครื่องสีอ่อน (ขาว/เงิน) ไล่เงาน้อยกว่าสีเข้ม (ภาพทางการ)
                              // กระจกหลัง: สว่างบน มืดล่าง (ภาพเรนเดอร์ทางการ)
      K.lin('gsh', 1, 1, [[0, '#fff', 0], [.3, '#fff', 0], [.4, '#fff', .025], [.5, '#fff', 0]]) +
      K.lin('pg', 1, 1, ic ? [[0, up(ic, .09)], [.5, ic], [1, dn(ic, .35)]] : [[0, up(gl, .1)], [.5, up(gl, .02)], [1, dn(gl, .1)]]) +
      K.lin('pe', 1, 1, [[0, '#fff', .9], [.35, '#fff', .15], [.6, '#000', 0], [1, '#000', .45]]) + '</defs>';
    s += btnsArt(P, fc) + frameArt(w, h, R, fc, K);
    var gp = rrp(.8, .8, w - 1.6, h - 1.6, R - .8, R - .8);   // ภาพทางการ: ขอบกรอบที่เห็นจากด้านหลังบางมาก (~0.8 มม.)
    s += '<path d="' + gp + '" fill="' + U('gs') + '" stroke="' + dn(fc, .3) + '" stroke-width=".25"/><path d="' + gp + '" fill="' + U('gsh') + '"/>';
    s += '<path d="' + gp + '" fill="#000" filter="' + U('gr') + '"/>';
    /* ตัวอักษร SAMSUNG กลางหลัง (วัดจากภาพทางการ: ยาว ~23.5 มม. สูง ~2.8 มม. ที่ ~79% ของความสูง) */
    s += '<text x="' + w / 2 + '" y="' + (h * .795 + 1.4) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="3.9" textLength="23.5" lengthAdjust="spacing" fill="' + (lum(gl) < 45 ? up(gl, .1) : dn(gl, .34)) + '" opacity=".9">SAMSUNG</text>';   // ภาพทางการ: ตัวอักษรเข้มกว่ากระจกเสมอ (ยกเว้นรุ่นดำสนิท)
    if (I) {   // แคปซูลยกสูง (S26 / S26 Ultra): เงาฟุ้ง + เงาแนบ → ผิว → ขอบเอียง → เส้นแสงขอบซ้ายบน
      var pp = rrp(I[0], I[1], I[2], I[3], I[4], I[4]);
      s += '<path d="' + pp + '" fill="#000" opacity=".4" transform="translate(.45 .85)" filter="' + U('b3') + '"/><path d="' + pp + '" fill="#000" opacity=".28" transform="translate(.15 .3)" filter="' + U('b1') + '"/>';
      s += '<path d="' + pp + '" fill="' + U('pg') + '" stroke="' + mix(fc, '#000000', .25) + '" stroke-opacity=".6" stroke-width=".2"/>';
      s += '<path d="' + rrp(I[0] + .4, I[1] + .4, I[2] - .8, I[3] - .8, I[4] - .4, I[4] - .4) + '" fill="none" stroke="' + U('pe') + '" stroke-width=".7" filter="' + U('b4') + '"/>';
      if (!ic) s += '<path d="' + rrp(I[0] + 1, I[1] + 1, I[2] - 2, I[3] - 2, I[4] - 1, I[4] - 1) + '" fill="none" stroke="' + up(fc, .25) + '" stroke-opacity=".35" stroke-width=".35"/>';
    }
    return s + camArt(ln, rg, K);
  }

  /* ---------- เคส (ซ้อนบนเครื่อง) — ดีไซน์ดูจากภาพสินค้าในร้าน ----------
     back: clear=ใส · frost=ฝ้าขุ่น · smoke=ฝ้าควันดำ · solid=ซิลิโคน/TPU สีทึบ
     cols: [ชื่อ, สีหลัง ('' = ใส), สีขอบ, สีกรอบกล้อง/แผ่นครอบ/ห่วงเลนส์, back เฉพาะสีนี้, สีวง MagSafe เฉพาะสีนี้]
     lr: ห่วงโลหะรอบเลนส์แต่ละตัว (สี · 'case' = สีเคสเงาโลหะ · 'edge' = สีขอบ) · stand: มีขาตั้ง (ใช้กับตัวกรอง)
     pocket: ช่องใส่บัตรด้านหลัง · photo: ช่องใส่รูปด้านหลัง · tex: ผิวลายนูน (เม็ดหยาบ) · gloss: หลังเงา (มีเส้นแสงสะท้อน)
     cover: 'clear' = แผ่นครอบกล้องเป็นกระจกใส (เห็นสีเครื่อง) · lw: ความหนากรอบกล้อง · magC: วงแม่เหล็กรูปตัว C · mw: ความกว้างวงแม่เหล็ก
     ** ภาพร้านส่วนใหญ่ใส่เครื่องสีเดียวกับเคส — แผ่นกล้องที่เห็นมักเป็นตัวเครื่อง ไม่ใช่เคส ใช้ island เฉพาะเมื่อเห็นรูเลนส์บนตัวเคสเปล่า **
     mag: สีวง MagSafe ('faint' = นูนสีเดียวกับเคส · 'edge' = สีเดียวกับขอบ) · tab: แถบบอกทิศใต้วง
     cam: frame=ขอบกล้องยกสูง · stand=กรอบกล้องพับเป็นขาตั้ง · metal=ห่วงเลนส์โลหะแยกตัว (สี = cols[3])
          island=แผ่นครอบกล้องเว้นรูรายเลนส์ (สี = cols[3] · ไม่ใส่ = สีเดียวกับเคส · เคสใส/ขุ่น = แผ่นใส)
     ring: ห่วงขาตั้งหมุนรอบ MagSafe (ใส่สีได้) · bump: มุมกันกระแทกหนา · edge: สวอตช์แสดงสีขอบ · chrome: ขอบชุบเงา
     t: ชื่อสั้นที่โชว์ในรายการลองทาบ (สินค้าจากรายการ affiliate ชื่อยาวมาก)
     สัดส่วน (มม. วัดจากภาพร้าน): bw ขอบเคสพับเข้าหลัง · tw/tl/tg แถบบอกทิศ กว้าง/ยาว/ห่างวง · magF วงพิมพ์เรียบ · bumpB มุมโป่งออก */
  /* ภาพตัวเลือกสี (ภาพประจำแต่ละสีในหน้าสินค้า Shopee — 1 เคสต่อภาพ ไม่ถูกบัง) · id = ชื่อไฟล์บน CDN ของ Shopee
     ภาพเรนเดอร์พื้นขาว: กรอบเคสหาอัตโนมัติ (PK.bbox ใน tools/pick.js) → R4 · ภาพถ่ายเอียง: 4 มุมจาก PK.multi/PK.corners → Q4 */
  var SI = function (s) { return 'https://down-th.img.susercontent.com/file/' + s; };
  function R4(s, b, x) { return Object.assign({ s: SI(s), q: [b[0], b[1], b[2], b[1], b[2], b[3], b[0], b[3]] }, x || {}); }
  function Q4(s, q, x) { return Object.assign({ s: SI(s), q: q }, x || {}); }
  /* เคสมะเขือเทศสีครีมทั้งเคสจากภาพร้าน (เห็นชัดสุด) — ปูซ้ำแบบสะท้อนทำให้ลายมือวาดเป็นลายกระจกสมมาตร ไม่เหมือนของจริง จึงใช้ทั้งเคส
     ขอบซ้ายล่างโดนป้ายกระดาษบัง → ml สะท้อนจากด้านขวาของเส้น · ขวาสุดโดนเคสฟ้าทับ → mx */
  /* แก้ (พ.ย. 2026): ใช้ภาพประจำสีครีมแทน (เคสเปล่าถือในมือ เอียง ~14° เห็นทั้งเคส) — ผู้ใช้ทัก "มีรอยแปลก ๆ" = รอยต่อแนวตั้งจาก mx
     ที่ลายมะเขือเทศถูกตัดครึ่งแล้วสะท้อนกลับ → อย่าใช้ mx กับลายตัวการ์ตูนใหญ่ถ้ามีภาพที่เห็นทั้งเคส · กรอบกล้องนูน (นิ้วโป้ง + การ์ดหลังรู) ถึง 0.37 กว้าง 0.55 */
  function tom(x) { return Object.assign({ s: SI('sg-11134201-8262a-mk3npep3711j30'), q: [.246, .131, .662, .027, .869, .844, .467, 1], cut: .36, cx: .6, fill: 'syn' }, x || {}); }   // syn: ช่องกล้องเป็นพื้น+จุดสังเคราะห์ + ลบมะเขือเทศที่กรอบในภาพบังครึ่งลูก (สีเรียบ = บล็อก · สะท้อน = ลายไม่ต่อกัน · ยก patch = ลูกแหว่ง — ผู้ใช้ทัก พ.ย. 2026) · cut/cx วัดจากภาพดิบ (cut:0)
  var LOOK = {
    /* ภาพร้าน (ดูซ้ำ): แผ่นกล้องสีเทาในภาพคือตัวเครื่องเอง เคสเป็นแค่ขอบยกสูงรอบกล้อง + ฟิล์มกันเลนส์วงโลหะ */
    25958331698: { back: 'frost', cols: [['ดำ', '#2a2a2d', '#19191b'], ['ไทเทเนียม', '#8e8780', '#56524d']], cam: 'frame', lw: 1.5, lr: '#6a6b70', ring: '#4a4b4f' },
    44029184858: { back: 'clear', cols: [['ใส', '', '#cfd4da']], mag: '#1c1c1e', tab: 1, cam: 'stand', lr: '#c9cbcf', bump: '#1c1c1e' },   // ภาพร้าน: มุมกันกระแทกปลายดำ 4 มุม
    57755757847: { back: 'smoke', cols: [['ควันดำ', '#2c2d30', '#141416'], ['ใส', '', '#cfd4da', '', 'clear']], mag: '#1c1c1e', tab: 1, cam: 'stand', lr: '#c9cbcf' },
    42617344494: { back: 'clear', cols: [['ใส', '', '#dde1e6']], mag: '#f3f3f3', tab: 1, cam: 'frame' },
    /* Air Colors: หลังใสขุ่น สีอยู่ที่ขอบเคสเท่านั้น (ภาพร้าน: ขอบดำ + ขอบเทาใส) */
    /* ภาพร้าน: รุ่นดำ = หลังควันดำ + วง MagSafe ดำ · รุ่นเทา = หลังใสขุ่น ขอบเทา วงขาว · กรอบกล้องยกสูงสีขอบ
       สีขอบพาสเทลไม่มีในภาพ (สีตัวอย่าง) */
    25965960141: { back: 'frost', cols: [['ดำ', '#2a2a2d', '#1f1f21', '', 'smoke', '#1c1c1e'], ['เทาใส', '', '#5f6268'], ['ขอบมิ้นต์', '', '#8fc4b2'], ['ขอบชมพู', '', '#e19aab'], ['ขอบฟ้า', '', '#7fa9d6'], ['ขอบม่วง', '', '#a996d6']], mag: '#f3f3f3', tab: 1, cam: 'frame', edge: 1, sample: 1 },
    /* Moov CS07: หลังใส ขอบสี และวง MagSafe สีเดียวกับขอบ (ภาพร้าน) */
    25834835302: { back: 'clear', cols: [['ขอบดำ', '', '#1c1c1e'], ['ขอบน้ำเงิน', '', '#2c4a8a'], ['ขอบชมพู', '', '#e9a3b8'], ['ขอบขาว', '', '#f2f2f0']], mag: 'edge', tab: 1, cam: 'frame', edge: 1 },
    /* ภาพร้าน: ใส่ iPhone 17 Pro Max / Air สีเดียวกับเคส — แผ่นกล้องสีส้ม/ขาวที่เห็นคือตัวเครื่อง เคสเปิดรูกล้องโล่ง (ไม่ครอบ) */
    45403056396: { back: 'solid', cols: [['ขาว', '#ecebe8', '#ecebe8'], ['ฟ้า', '#7c9ccd', '#7c9ccd'], ['ส้ม', '#e8742f', '#e8742f'], ['ดำ', '#2a2a2c', '#2a2a2c']], mag: 'faint', cam: 'frame', lw: 1.3, sample: 1 },

    /* ---- เคส Samsung Galaxy (พ.ย. 2026) — ดูจากภาพร้าน · เฉพาะเคสใส/ด้านสีล้วนที่วาดได้ตรงของจริง (เคสลายพิมพ์ต้องใช้ภาพร้านจริง — ยังไม่ได้ทำ)
       เลนส์ Galaxy ไม่มีแผ่นรอง เคสเจาะรูกลมรายเลนส์ + ขอบยกสูงรอบเลนส์ (cam: 'frame') ---- */
    '253492572_16884648580': { t: 'rock space เคสใสไม่เหลือง', back: 'clear', cols: [['ใส', '', '#dfe3e8']], cam: 'frame', grp: 1, lw: 2.4, bw: 1.5, bump: 1, bumpB: 1.6 },
    '11655524_22963168053': { t: 'HI-SHIELD เคสใส แม่เหล็ก ขาตั้ง', back: 'clear', cols: [['ใส', '', '#d6dadf'], ['เทาควัน', '#9b9a97', '#8a8987', '', 'smoke'], ['ครีม', '#e9e2d3', '#d5ccb8', '', 'frost'], ['ควันดำ', '#2c2d30', '#141416', '', 'smoke', '#3a3b3e']], mag: '#f3f3f3', magF: 1, mw: 4.2, mr: 23.3, my: .53, tw: 5.5, tl: 18, tg: 3.5, tab: 1, cam: 'frame', grp: 1, lw: 2.2, bump: 1 },
    '1207011833_28269091747': { t: 'OSGEER เคสใส แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#d9dee3']], mag: '#f6f6f6', magF: 1, mw: 5, bolt: '#8ab6ea', cam: 'frame', grp: 1, lw: 2.2, bw: 1.4, bump: 1, bumpB: 1.8 },
    '112496280_2638857417': { t: 'เคสใส กันกระแทก มุมถุงลม', back: 'clear', cols: [['ใส', '', '#dde1e6']], cam: 'frame', grp: 1, lw: 2.4, bw: 2, bump: 1, bumpB: 2.4 },
    '851019545_25132081839': { t: 'เคสใส TPU บาง', back: 'clear', cols: [['ใส', '', '#e2e5e9']], cam: 'frame', grp: 1, gp: 1.8, lw: 2.4, bw: 2, bump: 1, bumpB: 2 },
    '987656328_29963776036': { t: 'เคสใสมีช่องใส่บัตร', g: 'vesn-card', back: 'clear', cols: [['ใส', '', '#dfe3e8']], cam: 'frame', grp: 1, lw: 2.6, bw: 2, pocket: 1, bump: 1, bumpB: 1.8 },
    '133448475_28123675062': { t: 'Wsken เคสด้าน ดำ แม่เหล็ก', back: 'frost', cols: [['ดำด้าน', '#1e1f22', '#121214', '#8e939a']], mag: '#18191c', magF: 1, mw: 4.8, mr: 21.6, my: .56, fa: .72, cam: 'frame', grp: 1, lw: 1.5, bw: 2.6, txt: [['SKIN FRIENDLY', .5, .935, 2.1, '#d8d8d8']] },
    /* ---- เคส Samsung ชุด 2 (พ.ย. 2026) — ดูภาพร้านทีละเคส · ไม่รวมเคสการ์ตูน/ลายพิมพ์/ฝาพับ ---- */
    /* ร้านเดียวกัน ดีไซน์เดียวกันกับเคสที่ทำแล้ว (HI-SHIELD ใส · Wsken ดำด้าน) — ร้าน HI-SHIELD ไม่มีภาพในรายการ */
    '119358493_23133941056': { t: 'HI-SHIELD เคสใส แม่เหล็ก ขาตั้ง (S26 Ultra)', back: 'clear', cols: [['ใส', '', '#d6dadf'], ['เทาควัน', '#9b9a97', '#8a8987', '', 'smoke'], ['ครีม', '#e9e2d3', '#d5ccb8', '', 'frost'], ['ควันดำ', '#2c2d30', '#141416', '', 'smoke', '#3a3b3e']], mag: '#f3f3f3', magF: 1, mw: 4.2, mr: 23.3, my: .53, tw: 5.5, tl: 18, tg: 3.5, tab: 1, cam: 'frame', grp: 1, lw: 2.2, bump: 1 },
    '133448475_29703405286': { t: 'Wsken เคสด้าน ดำ แม่เหล็ก (Ultra)', back: 'frost', cols: [['ดำด้าน', '#1e1f22', '#121214', '#8e939a']], mag: '#18191c', magF: 1, mw: 4.8, mr: 21.6, my: .56, fa: .72, cam: 'frame', grp: 1, lw: 1.5, bw: 2.6, txt: [['SKIN FRIENDLY', .5, .935, 2.1, '#d8d8d8']] },
    /* ภาพร้าน: เคสสีเนื้อซาติน 7 สี ครอบกล้องเป็นห่วงรายเลนส์สีเดียวกับเคส (เงา) + วงแม่เหล็กปั๊มนูนสีเดียวกัน */
    '1030928582_25296855838': { t: 'เคสสีซาติน แม่เหล็ก ครอบเลนส์', back: 'solid', cols: [['ดำ', '#17181a', '#17181a'], ['ขาว', '#ecebe9', '#e2e1df'], ['ชมพู', '#dcc4cc', '#d3b9c2'], ['เขียวหัวเป็ด', '#2f5557', '#294b4d'], ['ม่วง', '#7b6c90', '#6f6185'], ['แดงเลือดหมู', '#5a2124', '#4e1c1f'], ['ฟ้า', '#a1bdc2', '#94b1b6']], mag: 'faint', magF: 1, mo: 1, tab: 1, mw: 4.4, mr: 21, tw: 3.6, tl: 11, tg: 3, cam: 'island', lr: 'case', lc: '#5d6266', gloss: 1, bw: .6, sample: 1 },
    /* ภาพร้าน HI-SHIELD Magsafe Shockproof: หลังฝ้า/ใส ขอบ+มุมกันกระแทกหนาสีเดียวกับกรอบกล้องตัว L · วงแม่เหล็กขาว + แถบ */
    '93872596_24358931897': { t: 'HI-SHIELD Magsafe กันกระแทก', back: 'frost', cols: [['ฟ้าใส ขอบดำ', '#a9b6cc', '#1c1c1e', '#1c1c1e'], ['ไทเทเนียม', '#bdb8b0', '#a9a49c', '#bcb8b0'], ['ควันดำ', '#3a3b3e', '#1c1c1e', '#e4e4e4', 'smoke'], ['ใส ขอบดำ', '', '#1c1c1e', '#1c1c1e', 'clear']], mag: '#f3f3f3', magF: 1, mw: 4.2, mr: 23.3, my: .53, tw: 5.5, tl: 18, tg: 3.5, tab: 1, cam: 'frame', grp: 1, lw: 2.4, bw: 2, bump: 1, bumpB: 2, edge: 1 },
    /* ภาพร้าน (ถือในมือ 4 สี): เคสผิวด้านนุ่มสีทึบ ขอบกล้องตัว L ยกสูงสีเดียวกับเคส · วงแม่เหล็กเส้นบางสีอ่อน + ขีดใต้วง */
    '851045698_40901774144': { t: 'เคสผิวด้าน ขอบกล้องยก วงแม่เหล็กเส้นบาง', back: 'solid', cols: [['ขาวครีม', '#e4e1da', '#dcd8d0', '', '', '#c9c4ba'], ['ดำ', '#2a2b2e', '#232427', '', '', '#56585c'], ['ชมพู', '#e3bcc6', '#dbb2bd', '', '', '#f1d9df'], ['ม่วงพลัม', '#5b2b40', '#532539', '', '', '#c7a3bd']], mag: '#c9c4ba', magF: 1, mw: 1.1, tw: 1.1, tl: 15, tg: 5, tab: 1, cam: 'frame', grp: 1, lw: 3.2, bw: .4, sample: 1 },
    /* ภาพร้าน JLK: PC บางพิเศษ ฝ้าใสเห็นเครื่อง · วงแม่เหล็กกรมท่ากว้าง + แถบสั้น */
    '171629888_24009729543': { t: 'JLK เคสบางพิเศษ ฝ้า แม่เหล็ก', back: 'frost', cols: [['ฝ้าใส', '', '#c9cdd1']], mag: '#2c2f48', magF: 1, mw: 4.6, tw: 6.5, tl: 11, tg: 2.5, tab: 1, cam: 'island', grp: 1, nh: 1, lw: 1.1, bw: .3 },
    /* ภาพร้าน: หลังอะคริลิกใส ขอบสีทึบ · ครอบกล้องสีขอบเว้นรูรายเลนส์ (ห่วงเลนส์เงา) · วงแม่เหล็กสีขอบ */
    '59622945_44360964494': { t: 'เคสอะคริลิกขอบสี ครอบเลนส์', back: 'clear', cols: [['ขอบดำ', '', '#1c1c1e', '#1c1c1e'], ['ขอบเทา', '', '#a7aaae', '#a7aaae']], mag: 'edge', magF: 1, mw: 3.6, tab: 1, cam: 'island', grp: 1, lr: 'edge', edge: 1, bw: 2.6 },
    /* ภาพร้าน: กรอบบัมเปอร์ TPU ดำ + หลังใส ช่องกล้องตัว L ขอบดำ */
    '101592243_23404570571': { t: 'เคสใส ขอบบัมเปอร์ดำ', back: 'clear', cols: [['ขอบดำ', '', '#1c1c1e']], cam: 'frame', grp: 1, lw: 2, bw: 2.4, bump: 1, bumpB: 1.4, edge: 1 },
    /* ภาพร้าน Wsken (สีน้ำตาล): หลังฝ้าเทาโปร่งเห็นเครื่อง ขอบน้ำตาล กรอบกล้องชุบทองแดง วงแม่เหล็กน้ำตาลพิมพ์เรียบ */
    '1026026864_24840525573': { t: 'Wsken เคสด้าน ขอบน้ำตาล แม่เหล็ก', back: 'frost', cols: [['น้ำตาล', '#6d7075', '#5f4330', '#b78f66']], mag: '#6b4b35', magF: 1, mw: 4.6, mr: 21.6, my: .56, fa: .55, cam: 'frame', grp: 1, lw: 1.5, bw: 2.6, edge: 1 },
    /* ภาพร้าน: หลังอะคริลิกฝ้าขาว ขอบซิลิโคนสี · ขอบกล้องตัว L และวงแม่เหล็กสีเดียวกับขอบ */
    '1302276444_42363244592': { t: 'เคสอะคริลิกฝ้า ขอบสี แม่เหล็ก', br: 'galaxy', back: 'frost', cols: [['ขอบฟ้า', '', '#6b97d6', '#6b97d6'], ['ขอบชมพู', '', '#e8cdc5', '#e8cdc5']], mag: 'edge', magF: 1, mw: 4.8, tw: 5, tl: 12, tg: 3, tab: 1, cam: 'island', grp: 1, ho: -.3, lw: 2.4, bw: 2.4, edge: 1 },
    /* ภาพร้าน: ซิลิโคนสีทึบ ขอบมน · เลนส์แต่ละตัวมีขอบยกสีเดียวกับเคส */
    '1389995741_49750821924': { t: 'เคสซิลิโคนสีพื้น ขอบกันเลนส์', back: 'solid', cols: [['เขียวเข้ม', '#2f5a48', '#2f5a48'], ['มิ้นต์', '#93d1c0', '#93d1c0'], ['น้ำเงิน', '#2f4f86', '#2f4f86']], cam: 'island', grp: 1, gr: 12, ho: -.7, bw: .3, sample: 1 },
    /* ภาพร้าน: TPU ใสมุมกันกระแทก + ช่องใส่บัตรด้านหลัง · ครอบกล้องใสเว้นรูรายเลนส์ · มีสีดำใส */
    '1035709160_27563808831': { t: 'เคสใสใส่บัตร มุมกันกระแทก', g: 'vesn-card', back: 'clear', cols: [['ใส', '', '#dfe3e8'], ['ดำใส', '#3a3b3e', '#2a2b2d', '#2c2d30', 'smoke']], cam: 'island', grp: 1, cover: 'clear', pocket: 1, bw: 1.6, bump: 1, bumpB: 2 },
    /* ภาพร้าน: เคสใสขอบชุบเงิน มุมกันกระแทก · ครอบกล้องใส ห่วงเลนส์ชุบ · วงแม่เหล็กชุบเงินกว้าง */
    '479034841_26860886094': { t: 'เคสใสขอบชุบเงิน ครอบเลนส์ แม่เหล็ก', back: 'clear', cols: [['ดำชุบ', '', '#2e2e33', '#2e2e33'], ['เงิน', '', '#c9ccd1', '#c9ccd1']], mag: '#151517', magF: 1, mch: 3.4, mt: ['Colnel', 'New phone case'], mw: 5.6, mr: 18.6, my: .55, cam: 'frame', grp: 1, lw: 1.6, lr: 'edge', chrome: 1, bump: 1, bumpB: 1.6, edge: 1 },   // my: วัดตามแกนยาวของเครื่องในภาพร้าน (ภาพเอียง) — ขอบบนวงห่างใต้กรอบกล้อง ~7 มม. → กลางวง ~.55 (เดิม .4 อ่านภาพผิดว่าวงอยู่ข้างกล้อง ผู้ใช้ทัก)
    /* ภาพร้าน PBZZ: ซิลิโคนสีพื้น + ขาตั้งพับได้กลางหลัง (ห่วงกลม + ก้าน) · เลนส์มีขอบยกรายตัว
       วัดจากภาพร้านครอปขยาย (ผู้ใช้ส่งภาพทักอีกรอบ พ.ย. 2026 หลังลด R เหลือ .12 จนห่วงหายไปหลังก้าน): ห่วงกลมใหญ่ R .235W ขอบห่วง ~3.8 มม. กลางห่วง .61
       ก้านฐาน .27W ลงถึง .915 · แผ่นขาตั้ง .165W จาก .52 ถึง ~.88 — ห่วงต้องกว้างกว่าก้านชัด ๆ ไม่งั้นมองไม่เห็น */
    '797351071_28311617040': { t: 'PBZZ ซิลิโคน มีขาตั้งพับ', back: 'solid', cols: [['เขียวมิ้นต์', '#b9d3c4', '#b9d3c4'], ['ดำ', '#2a2a2c', '#2a2a2c'], ['ม่วง', '#c4b5d8', '#c4b5d8'], ['ชมพู', '#efc4cb', '#efc4cb']], cam: 'island', ho: -.7, kick: { cy: .61, R: .235, sw: .27, by: .915, pt: .52, pw: .165, rw: 3.8 }, bw: .3, sample: 1 },

    /* ---- เคสจากรายการ affiliate (live.js) — ขายดี ออกแบบจากภาพร้านทีละชิ้น (พ.ย. 2026) — key = shopid_itemid ---- */
    '230773795_21514302886': { t: 'เคสใสอะคริลิก ครอบกล้อง', back: 'clear', cols: [['ใส', '', '#dfe3e8']], cam: 'island', bump: 1 },
    /* ภาพร้าน (ดูซ้ำ): เคสใส (ที่ดูขาวคือเครื่องสีเงิน) ขอบใสยกสูงรอบกล้อง วงแม่เหล็กขาวรูปตัว C + แถบสั้น */
    '230773795_22879653280': { t: 'เคสใส แม่เหล็กวงตัว C', back: 'clear', cols: [['ใส', '', '#e2e5e8']], mag: '#f4f4f4', magC: 1, tab: 1, cam: 'frame', lw: 1.9 },
    /* ภาพร้าน (ซูมดู พ.ย. 2026): หลังฝ้าเทาเรียบ ขอบยางดำพับเข้าหลัง ~2.4 มม. · กรอบกล้องดำหนา ~2.2 · วงแม่เหล็กพิมพ์เรียบสีเทาเข้มกว้าง ~4.4 + แคปซูลอ้วนยาว */
    '110810771_18581841728': { t: 'เคสผิวด้าน เทา ขอบดำ แม่เหล็ก', back: 'frost', cols: [['เทาด้าน', '#5f6a6e', '#18181a']], mag: '#4a5256', magF: 1, mw: 4.4, tw: 5.8, tl: 14, tg: 3, tab: 1, cam: 'frame', grp: 1, lw: 2.6, bw: 2.6 },
    '282631992_17672545728': { t: 'Manis Lemon เคสใส ขอบชุบเงา แม่เหล็ก', back: 'clear', cols: [['เงิน', '', '#c9ccd1', '#c9ccd1'], ['ฟ้า', '', '#8fb3d9', '#8fb3d9'], ['ทอง', '', '#d8bf8f', '#d8bf8f'], ['ม่วง', '', '#b7a3d6', '#b7a3d6']], mag: 'edge', mw: 4.2, cam: 'island', cover: 'clear', lr: 'edge', chrome: 1, edge: 1, bw: 1.5, lw: 1.8, sample: 1 },   // รอบ QC: ขอบชุบของจริงเป็นแถบหนา (พับเข้าหลัง ~1.5) + กรอบกล้องชุบหนา   // ภาพร้าน: แผ่นกระจกใสกันเลนส์ + กรอบชุบรอบกล้อง (เห็นสีเครื่อง) · วงแม่เหล็กชุบกว้าง
    '1748532941_55407122651': { t: 'เคสกระจก ขาตั้งเลนส์ แม่เหล็ก', back: 'smoke', cols: [['ดำ', '#2e3034', '#3c3e42', '#5a5c60']], mag: '#2a2b2e', tab: 1, cam: 'frame', lw: 2, lr: '#a9abaf', stand: 1 },   // ภาพร้าน: กรอบกล้องเทาหนา (พับเป็นขาตั้ง) ข้างในเห็นตัวเครื่อง + ห่วงเลนส์เงิน
    '1156198005_25785141242': { t: 'Manis Lemon Crystal ใส ห่วงขาตั้ง', back: 'clear', cols: [['ใส', '', '#d6dade']], ring: '#f1f1f1', cam: 'frame' },
    '271723622_29030930705': { t: 'เคสกำมะหยี่ ขอบกล้องนูน แม่เหล็ก', back: 'solid', cols: [['ส้ม', '#e9763a', '#e9763a'], ['ครีม', '#ebe3d3', '#ebe3d3'], ['กรมท่า', '#2c3a5c', '#2c3a5c'], ['แดงเลือดหมู', '#7a2433', '#7a2433'], ['ลาเวนเดอร์', '#cbb9e3', '#cbb9e3'], ['ฟ้า', '#8fbde6', '#8fbde6'], ['ชมพู', '#f2b8c4', '#f2b8c4'], ['ดำ', '#2b2b2d', '#2b2b2d']], mag: 'faint', cam: 'frame', lw: 2.2, sample: 1 },   // ภาพร้าน (ซูมดู): ใส่เครื่องสีเดียวกับเคส แผ่นกล้องคือตัวเครื่อง เคสเป็นขอบนูนหนารอบรูกล้อง
    '1200929454_27131705554': { t: 'เคสซิลิโคนสีมาการอง', back: 'solid', cols: [['ดำ', '#2a2a2c', '#2a2a2c'], ['ชมพูบานเย็น', '#e0457b', '#e0457b'], ['ส้ม', '#f07a35', '#f07a35'], ['มิ้นต์', '#9fe0d4', '#9fe0d4'], ['ครีม', '#f3ecdc', '#f3ecdc'], ['ชมพูอ่อน', '#f0c9c9', '#f0c9c9']], cam: 'frame', sample: 1 },
    /* ภาพร้าน: ถ่ายตัวเคสเปล่า — หลังกระจกสีทึบ ครอบกล้องชุบสีเดียวกับเคสเว้นรูรายเลนส์ (ครอบจริง) */
    '304717378_25615891583': { t: 'CASETI เคสกระจกสี ครอบกล้องชุบ', back: 'solid', cols: [['เขียว', '#2f6b4a', '#2f6b4a', '#2f6b4a'], ['ขาว', '#ece8e4', '#d9dadc', '#d9dadc'], ['ฟ้า', '#a9bfd8', '#a9bfd8', '#a9bfd8'], ['กรมท่า', '#2f2f5c', '#2f2f5c', '#2f2f5c'], ['เทาเข้ม', '#4a4a4e', '#2a2a2e', '#2a2a2e']], cam: 'island', chrome: 1, gloss: 1, sample: 1 },   // หลังกระจกเงา (ภาพร้านเห็นแสงสะท้อน)
    '133448475_29755497746': { t: 'Wsken แม่เหล็ก ห่วงขาตั้ง', back: 'smoke', cols: [['ดำ', '#26272a', '#151517']], ring: '#2a2a2d', mw: 5.2, cam: 'frame', lw: 1.6, bump: 1 },   // ภาพร้าน: ห่วงขาตั้งแบนกว้าง
    '1530045418_27985876095': { t: 'LiTE CHIC ซิลิโคนสีพื้น', back: 'solid', cols: [['ดำ', '#1f1f21', '#1f1f21', '#c0c2c6'], ['ชมพู', '#e9b9a8', '#e9b9a8', '#d9a58f'], ['ครีม', '#e8d9c0', '#e8d9c0', '#d8c29a']], cam: 'frame' },   // ภาพร้าน: กรอบกล้องโลหะ เงิน/โรสโกลด์/ทอง
    '230773795_25385864538': { t: 'เคสใสขุ่นสีลูกกวาด ห่วงเลนส์สี', back: 'frost', cols: [['ขาว', '#f4f4f6', '#e4e4e6', '#e8e8ea'], ['เขียว', '#d8edd5', '#c4e2bf', '#bfe0b8'], ['เหลือง', '#f5ecc8', '#ecdfae', '#ecd99a'], ['ชมพู', '#f5d3dc', '#ecbcc9', '#e9a9bb']], cam: 'metal', sample: 1 },

    /* ---- ชุดที่ 2 (พ.ย. 2026) — ดูภาพร้านทีละชิ้น: ภาพที่ถ่ายเคสเปล่าเท่านั้นถึงจะนับว่าครอบกล้องจริง ---- */
    /* JT-shop: เคสเปล่าเห็นรูเลนส์บนแผ่นใส = ครอบกล้องจริง · ช่องใส่บัตรครึ่งล่าง · มุมกันกระแทก · ใส / ดำใส */
    '120958585_21325370178': { t: 'เคสใส ช่องใส่บัตร ครอบกล้อง', back: 'clear', cols: [['ใส', '', '#e2e5e8'], ['ดำใส', '#55575c', '#3a3b3f', '', 'smoke']], cam: 'island', cover: 'clear', pocket: 1, bump: 1, bumpB: 2.6, bw: 1.6 },   // ภาพร้าน: ดำใส = เทาควันโปร่ง (ไม่ใช่ดำทึบ)
    /* pooh_mobile: เคสเปล่า มุมกันกระแทกหนา แผ่นใสครอบกล้องเว้นรูเลนส์ */
    '130586349_6596819475': { t: 'เคสใสกันกระแทก มุมหนา ครอบกล้อง', back: 'clear', cols: [['ใส', '', '#e6e9ec']], cam: 'island', cover: 'clear', bump: 1, bumpB: 3, bw: 1.8 },
    /* doulike: ใส่ iPhone สีเงิน — เคสใส วงแม่เหล็กขาว + แถบ ขอบใสยกสูงรอบกล้อง */
    '72994507_22884238143': { t: 'เคสใส แม่เหล็ก วงขาว', back: 'clear', cols: [['ใส', '', '#e2e5e8']], mag: '#f4f4f4', tab: 1, cam: 'frame', lw: 1.6 },
    /* เคส 2 in 1: เยลลี่สีใสขุ่น ช่องใส่รูปกลางหลัง ขอบกล้องนูนหนาเปิดโล่ง */
    '1049076226_40007796396': { t: 'เคสเยลลี่ 2 in 1 ช่องใส่รูป', back: 'frost', cols: [['ฟ้า', '#a9c3e8', '#93b1dc'], ['เขียว', '#cfe0a3', '#b9cf86'], ['ชมพู', '#f39ab8', '#ec7fa4'], ['เหลือง', '#e9ef9a', '#dbe27c'], ['ขาวขุ่น', '#eef0ec', '#dfe2dc'], ['เทา', '#b9bbbe', '#a2a5a9']], cam: 'frame', lw: 2.2, photo: 1, sample: 1 },
    /* 888_shop: ดำด้านทึบ ขอบกล้องนูนหนาเปิดโล่ง (เห็นตัวเครื่อง) วงแม่เหล็กเทาเข้มนูน */
    '333807292_25657488221': { t: 'เคสดำด้าน แม่เหล็ก ขอบกล้องหนา', back: 'smoke', cols: [['ดำ', '#34353a', '#1c1c1e', '#1c1c1e', '', '#28292c']], mag: '#28292c', magF: 1, mw: 5, cam: 'frame', grp: 1, lw: 3.4, bw: 1.8 },   /* แก้ พ.ย. 2026 (เทียบภาพร้านเดียวกับ 1607347209): หลังฝ้าควันเห็นเครื่องจาง ๆ · วงเข้มกว่าหลัง (เดิมวงสว่างกว่า) · กรอบกล้องหนา */
    /* good_999: กันกระแทกมุมหนา ใส / ดำใส — ขอบใสรอบกล้อง เห็นตัวเครื่อง */
    /* ภาพร้าน (ซูมดู): เคสเปล่า — แผ่นใสครอบกล้องเว้นรูเลนส์ (ขอบรูหนา) = ครอบกล้องจริง · มุมโป่งมาก */
    '230773795_28212702050': { t: 'เคสกันกระแทกมุมหนา ใส/ดำใส', back: 'clear', cols: [['ใส', '', '#e2e5e8'], ['ดำใส', '#3c3d41', '#2c2d30', '', 'smoke']], cam: 'island', cover: 'clear', bump: 1, bumpB: 3, bw: 1.8 },
    /* SweetCandy: ผิวลายลิ้นจี่ สีทึบ 6 สี (ตามภาพร้าน) ขอบกล้องเปิดโล่ง */
    '1172566593_26281443048': { t: 'เคสผิวลายลิ้นจี่ สีพื้น', back: 'solid', tex: 1, cols: [['เทาฟ้า', '#c9d0d2', '#c9d0d2'], ['เทาเขียว', '#c6cbbf', '#c6cbbf'], ['ชมพู', '#ebcaca', '#ebcaca'], ['บานเย็น', '#9b3a6e', '#9b3a6e'], ['มิ้นต์', '#7fd3c4', '#7fd3c4'], ['ดำ', '#1d1d1f', '#1d1d1f']], cam: 'frame', lw: 1.4 },
    /* CaseiPhone: หลังใส ขอบเทา วงแม่เหล็กเทากว้าง + แถบ ขอบกล้องเทา */
    /* ภาพร้าน (ซูมดู): ขอบเทาอุ่นทึบพับเข้าหลัง ~2.6 มม. · กรอบกล้องเทาหนา ~2.4 · วงแม่เหล็กเทาอ่อนกว่าขอบ กว้าง ~5 + แคปซูลยาว */
    '110810771_29658389782': { t: 'เคสใส ขอบเทา แม่เหล็ก', back: 'clear', cols: [['ขอบเทา', '', '#a7a39d']], mag: '#c3c1bd', mw: 5, tw: 4.6, tl: 12, tab: 1, cam: 'frame', lw: 2.4, bw: 2.6, edge: 1 },

    /* ---- ชุดที่ 3: เคสลายการ์ตูน/ลายพิมพ์ (พ.ย. 2026) — ใช้ "ภาพตัวเลือกสี" ของร้านจริงทุกสี (shot) ----
       ผู้ใช้ทัก: ลายวาดเอง (printArt) ไม่เหมือนต้นฉบับเลย — ลายถี่กว่า ตัวการ์ตูนไม่เหมือน สีไม่ครบ มีวงแม่เหล็กที่ของจริงไม่มี
       ภาพรวมของร้านมักวางเคสซ้อนกัน/มีป้ายบัง → ใช้ภาพประจำแต่ละสีในหน้าสินค้าแทน (ต้องล็อกอิน Shopee ใน Browser pane ถึงเปิดหน้าได้)
       cut = ส่วนกล้องของเครื่องในภาพ (สัดส่วนความสูงเคส) · cx = ความกว้างที่ปะ · fill: mirror/auto/สี · ml = ขอบซ้ายที่ถูกนิ้ว/ป้ายบัง */
    /* ผิวคลื่นนูนเงา ลายจุด — ภาพถ่ายวางบนผ้า เอียงเล็กน้อย */
    '1049076226_44262560633': { t: 'เคสลายจุด ผิวคลื่นเงา', back: 'solid', cols: [
      ['ชมพู', '#f5c3d2', '#f5c3d2', '', '', '', { shot: Q4('sg-11134201-7rdw1-mdcytk5cgke487', [.385, .235, .64, .215, .625, .785, .385, .795], { cut: .34, cx: .66, fill: 'mirror' }) }],
      ['ขาวจุดดำ', '#f7f7f4', '#ededea', '', '', '', { shot: Q4('sg-11134201-7rdym-mdcytkca50e4a1', [.338, .218, .64, .2, .655, .775, .395, .79], { cut: .34, cx: .66, fill: 'mirror' }) }],
      ['ฟ้า', '#c3dbf2', '#c3dbf2', '', '', '', { shot: Q4('sg-11134201-7rdyf-mdcytjy4tvsw45', [.333, .2, .63, .205, .62, .795, .36, .79], { cut: .34, cx: .66, fill: 'mirror' }) }],
      ['เหลือง', '#f7e5a8', '#f7e5a8', '', '', '', { shot: Q4('sg-11134201-7rdw8-mdcytkjry7qvde', [.385, .232, .63, .222, .62, .8, .385, .8], { cut: .34, cx: .66, fill: 'mirror' }) }]], cam: 'frame', lw: 2.2 },
    /* มะเขือเทศ — ภาพสีฟ้า/ชมพูเข้มเป็นเคสเปล่าถือในมือ (นิ้วบังขอบซ้าย → ml) · สีครีมใช้ภาพรวม (เคสครีมเห็นชัดสุด) · ชมพูอ่อน: ภาพประจำสีมีป้ายพลาสติกบังส่วนบน → ใช้ลายเคสครีมเปลี่ยนพื้นเป็นสีที่วัดจากภาพรวม */
    '1049076226_50705623257': { t: 'เคสลายมะเขือเทศ น่ารัก', back: 'solid', cols: [
      ['ชมพูอ่อน', '#e9c7cf', '#e9c7cf', '#f5f0e6', '', '', { shot: tom({ recol: ['#d4bb99', '#d9a89c', 60] }) }],
      ['ครีม', '#e4dcc0', '#e4dcc0', '#f5f0e6', '', '', { shot: tom() }],
      ['ฟ้า', '#b1c8be', '#b1c8be', '#f5f0e6', '', '', { shot: Q4('sg-11134201-8260c-mk3npf4yb1u0f3', [.374, .003, .795, .016, .79, .964, .382, .964], { cut: .39, cx: .58, fill: 'syn' }) }],
      ['ชมพูเข้ม', '#ec6c8e', '#ec6c8e', '#f45a90', '', '', { shot: Q4('sg-11134201-825zk-mk3npfnbihhkca', [.388, .022, .814, .022, .814, .964, .388, .964], { cut: .38, cx: .59, fill: 'syn' }) }]], cam: 'frame', lw: 2.6 },   // cut/cx วัดจากภาพดิบ (cut:0): กรอบกล้องในภาพ + เงา
    /* หนังลายจุดเล็ก — ภาพเคสเปล่าในกล่อง เอียง ~25° (มุมจาก PK.corners) */
    '1150840187_43676056941': { t: 'เคสหนังลายจุดเล็ก', back: 'solid', cols: [
      ['ดำ', '#1d1d1f', '#1d1d1f', '#3a3a3d', '', '', { shot: Q4('sg-11134201-821e2-mgj66uf9d6o96d', [.515, .14, .815, .285, .445, .89, .165, .69], { cut: .37, fill: 'mirror' }) }],
      ['ครีม', '#efe8da', '#efe8da', '#3a3a3d', '', '', { shot: Q4('sg-11134201-821df-mgj66uvszc3zf8', [.49, .145, .795, .275, .43, .86, .185, .68], { cut: .35, fill: 'mirror' }) }],
      ['ชมพู', '#efb6c0', '#efb6c0', '#3a3a3d', '', '', { shot: Q4('sg-11134201-821ga-mgj66vbz96h424', [.53, .15, .85, .28, .45, .86, .18, .67], { cut: .35, fill: 'mirror' }) }]], cam: 'frame', lw: 2.2 },
    /* DECON Dotty — ภาพเรนเดอร์พื้นขาวแยกสี (กรอบอัตโนมัติ) · จุด Ø ~4.9 มม. ห่าง 18.8 มม. · ไม่มีวงแม่เหล็กโผล่ */
    '83112658_54715194685': { t: 'DECON Dotty ลายจุด แม่เหล็ก', back: 'solid', cols: [
      ['ดำ', '#232325', '#1e1e20', '', '', '', { shot: R4('sg-11134201-8259q-mrbj7uj714hu4a', [.3135, .1602, .6836, .9141], { cut: .331, fill: 'mirror' }) }],
      ['ขาว', '#eeeeec', '#e4e4e2', '', '', '', { shot: R4('sg-11134201-8257y-mrbj7tfvtypw69', [.3145, .1592, .6855, .915], { cut: .369, fill: 'mirror' }) }],
      ['แดงไวน์', '#8e2238', '#8e2238', '', '', '', { shot: R4('sg-11134201-8258z-mrbj7rn3jmkn81', [.3135, .1592, .6846, .915], { cut: .324, fill: 'mirror' }) }],
      ['ฟ้า', '#b7c8e8', '#b7c8e8', '', '', '', { shot: R4('sg-11134201-825b8-mrbj7shyed531b', [.3135, .1543, .6836, .915], { cut: .357, fill: 'mirror' }) }],
      ['เงิน', '#d9d9db', '#d4d4d6', '', '', '', { shot: R4('sg-11134201-825ba-mrbj7vu3lczp00', [.3125, .1563, .6836, .9141], { cut: .317, fill: 'mirror' }) }]], cam: 'frame', lw: 1.8 },
    /* LITE CHIC 4 ลาย — มีแผ่นครอบกล้องสีเป็นส่วนของเคส → ปะส่วนบนด้วยสีแผ่น (วัดจากภาพ) + cam island สีเดียวกันเจาะรูตามเลนส์เครื่องผู้ใช้ */
    '1518344201_52713420017': { t: 'LITE CHIC ลายน่ารัก ฝาครอบกล้อง', back: 'solid', cols: [
      ['จุดสี ฝาชมพู', '#f3ece0', '#e9e2cf', '#d3b0b0', '', '', { shot: Q4('sg-11134201-825ak-mq9y6zgeshz49d', [.352, .152, .709, .152, .709, .861, .352, .861], { cut: .31, fill: '#d3b0b0', tp: [[0, .31, 1, .385, 0, .22], [.88, .31, 1, 1, -.3, 0]], deco: { src: [.55, .03, .95, .27] } }) }],
      ['หัวใจดำ ฝากรมท่า', '#f2ebda', '#e9e2cf', '#1d2338', '', '', { shot: Q4('sg-11134201-82598-mq9y6zfkpi4gd3', [.357, .152, .717, .152, .717, .825, .357, .825], { cut: .31, fill: '#1d2338', deco: { src: [.57, .06, .88, .27] }, tp: [[0, .31, 1, .385, 0, .09], [.84, .31, 1, 1, -.3, 0], [.68, .84, .9, .98, 0, -.13]] }) }],
      ['เชอร์รี่ ฝาชมพู', '#f6ece4', '#e9e2cf', '#f6b3b9', '', '', { shot: Q4('th-11134207-81zti-mrbaq93ow8oyfc', [.489, .049, .896, .17, .793, 1.063, .185, .882], { cut: .31, fill: '#f6b3b9', deco: { src: [.55, .03, .9, .29] }, tp: [[0, .31, .55, .535, 0, .13], [.55, .31, 1, .535, -.45, .13], [.58, .5, 1, 1, -.4, 0]] }) }],   // ภาพถือในมือเอียง ~16° (มุมจากเส้นขอบ 4 ด้าน) · นิ้วบังขวาล่าง → เลื่อนลายจากซีกซ้ายมาปะ (tp ไม่กลับด้าน)
      ['แดงไวน์ ฝาครีม', '#7a1e2e', '#d9d2c4', '#f3e5ca', '', '', { shot: Q4('th-11134207-81ztm-mrbavshwvmkm1c', [.454, .042, .856, .18, .776, .9, .136, .859], { cut: .43, fill: '#7a1e2e', mx: [.86, .6], mf: '#7a1e2e', mb: .84, deco: { src: [.58, .06, .93, .34], dst: [.58, .05, .93, .28] } }) }]], cam: 'island', chrome: 1, cov: .31, lr: '#dcdde0' },   // แดงไวน์: มือจับขวา + ล่าง → เติมสีพื้นด้านขวา สะท้อนลายโบว์ลงล่าง
    /* หนังลายจุด ป้ายชื่อ — ภาพเคสเปล่าในกล่อง เอียงแบบเดียวกับเคสหนังลายจุดเล็ก */
    '1150100559_41718385986': { t: 'เคสหนังลายจุด ป้ายชื่อ', back: 'solid', cols: [
      ['ดำ', '#1d1d1f', '#1d1d1f', '', '', '', { shot: Q4('sg-11134201-824j1-meh183rfh0jq1c', [.53, .14, .83, .285, .45, .885, .16, .69], { cut: .36, cx: .72, fill: 'mirror' }) }],
      ['ครีม', '#f1ecdf', '#ebe5d6', '', '', '', { shot: Q4('sg-11134201-824ga-meh18494vls7f8', [.53, .14, .83, .285, .45, .885, .16, .69], { cut: .36, cx: .72, fill: 'mirror' }) }],
      ['ชมพู', '#efc2c8', '#efc2c8', '', '', '', { shot: Q4('sg-11134201-824gn-meh184nuwk5f45', [.53, .14, .83, .285, .45, .885, .16, .69], { cut: .36, cx: .72, fill: 'mirror' }) }]], cam: 'frame', lw: 2 },
    /* แมวดำ 4 ลาย — ภาพประจำสีถ่ายทีละเคส (ไม่ซ้อนกันแล้ว) */
    '230773795_44351000013': { t: 'เคสลายแมวดำ น่ารัก', back: 'solid', cols: [
      ['แมวดำกลางคืน', '#3e63b5', '#dde1e6', '', '', '', { shot: Q4('sg-11134201-7rfgo-m9sjycylqf1e0c', [.269, .125, .628, .09, .781, .812, .366, .922], { cut: .39, cx: .7, fill: 'mirror' }) }],
      ['แมวดำผีเสื้อ', '#d9dbe2', '#dde1e6', '', '', '', { shot: Q4('sg-11134201-7rfg3-m9sjyd818c4c6f', [.288, .064, .712, .064, .712, .95, .288, .95], { cut: .39, cx: .7, fill: 'mirror' }) }],
      ['บ้านแมว', '#f6efe6', '#dde1e6', '', '', '', { shot: Q4('sg-11134201-7rfhm-m9sjydm6qhy106', [.283, .055, .712, .055, .712, .95, .283, .95], { cut: .39, cx: .7, fill: 'mirror' }) }],
      ['แมวขาวขนฟู', '#c9cde0', '#dde1e6', '', '', '', { shot: Q4('sg-11134201-7rfib-m9sjydusdun028', [.285, .055, .712, .055, .712, .95, .285, .95], { cut: .39, cx: .7, fill: 'mirror' }) }]], cam: 'frame', lw: 1.8 },
    /* OxygenDog สองสี — เรนเดอร์พื้นขาวแยกสี · หมาดำ: ภาพประจำสีเป็นภาพถือในมือ (นิ้วบังหน้า) → ใช้ภาพรวมที่เห็นเต็มตัว · ช่องกล้องปะด้วยสีแถบบน */
    '296279108_24178574357': { t: 'Oxygendog ลายการ์ตูนสองสี', back: 'solid', cols: [
      ['หมีน้ำตาล', '#f6b84a', '#4c8fe3', '#141416', '', '', { shot: R4('sg-11134201-7rdye-mc99tjitunuff3', [.2988, .0967, .7002, .9043], { cut: .3, cx: .57, fill: 'auto' }) }],
      ['หมาดำ', '#a8d4f2', '#d3e44a', '#141416', '', '', { shot: { q: [.269, .399, .476, .399, .476, .816, .269, .816], cut: .325, fill: 'auto' } }],
      ['เป็ดขาว', '#5b8fe0', '#f39a2e', '#141416', '', '', { shot: R4('sg-11134201-7rdxm-mc99tk1exu7r44', [.3076, .1133, .6904, .8867], { cut: .3, cx: .57, fill: 'auto' }) }],
      ['กระต่ายชมพู', '#eef06a', '#ec4c9b', '#141416', '', '', { shot: R4('sg-11134201-7rdww-mc99tkbyierb70', [.3135, .1221, .6865, .8789], { cut: .3, cx: .57, fill: 'auto' }) }]], cam: 'frame', lw: 2.4 },
    /* OxygenDog ใส — เรนเดอร์พื้นขาวแยกสี เห็นเต็มเคส · เป็นเคสใสสีพาสเทล → ลบพื้น (key) เหลือสีจาง kf · กรอบกล้องสีในภาพคลุมถึง 0.28 ของความสูง (ทั้งแถบ) → ช่องนั้นใส ใช้กรอบกล้องสีขอบเคสของเราแทน */
    '296279108_48705162820': { t: 'Oxygendog ใส ลายพาสเทล', back: 'clear', cols: [
      ['หมีกรอบหัวใจ', '#f6edc0', '#f0dc8a', '#f5dc72', '', '', { shot: R4('th-11134207-81zte-mu7gfxrcn020ae', [.3076, .1221, .6826, .874], { cut: .29, fill: 'clear', key: [.9, .9], kf: .7 }) }],
      ['ดาวม่วง', '#d9d6f4', '#c4c0ee', '#c6c0f0', '', '', { shot: R4('th-11134207-81ztm-mu7gg0h6wtmu02', [.3066, .1123, .6797, .873], { cut: .29, fill: 'clear', key: [.9, .9], kf: .7 }) }],
      ['หัวใจพิกเซล', '#f3dbea', '#efbddb', '#f2bfdc', '', '', { shot: R4('th-11134207-81ztf-mu7gfv1qbqbm8f', [.3018, .126, .6777, .875], { cut: .29, fill: 'clear', key: [.9, .9], kf: .7 }) }],
      ['หัวใจโบว์', '#eef0f4', '#e2e4ea', '#f1f2f5', '', '', { shot: R4('th-11134207-81zth-mu7gfqav9hje38', [.3066, .127, .6826, .874], { cut: .29, fill: 'clear', key: [.9, .9], kf: .12 }) }]], cam: 'frame', win: .275, lw: 3.4 },   // รอบ QC: ช่องกล้องเปิดเต็มแถบบน ขอบสีหนา ~3.4 มม. (ภาพประจำสี)
    /* เคสใสลายหมี — ภาพใส่ iPhone 16 สีขาว (ถือในมือ ภาพเอียง: บนกว้างกว่าล่าง — มุมจาก PK.corners)
       ผู้ใช้ทัก: เคสใสกลายเป็นเคสทึบ → ลบสีเครื่องในภาพ (key) + ลบขอบวงแม่เหล็กสีเทาในภาพ (ks) แล้ววาดวงขาวเองตามขนาดจริงของเคสนี้ (ใหญ่กว่าปกติ mr 25.5) */
    '1564593220_55356901890': { t: 'เคสใสลายหมีน้อย แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#e2e5e8', '', '', '', { shot: Q4('sg-11134201-82618-mliyl4w29iio1d', [.268, .064, .708, .064, .672, .892, .29, .893], { cut: .31, cx: .48, fill: 'clear', key: 'auto', ks: 30 }) }]], mag: '#f4f4f4', mr: 25.5, mw: 4.2, tab: 1, cam: 'frame', lw: 1.6 },
    /* สติกเกอร์นูน 4 ลาย — ฝาสไลด์ครีมครอบกล้องเป็นส่วนของเคส (ปะสีฝา + island) · ภาพถือในมือ ขอบล่างของบางภาพเลยขอบภาพ (ยืดเล็กน้อย) */
    '1049076226_26402382969': { t: 'เคสใส สติกเกอร์นูน ฝาสไลด์กล้อง', back: 'clear', cols: [
      ['Spring กระต่าย', '', '#e6e3dc', '#e6d0bc', '', '', { shot: Q4('th-11134207-7r98t-lyos1fq3po5d20', [.44, .08, .95, .08, .95, 1, .44, 1], { key: 'auto', cut: .3, fill: '#e6d0bc', deco: { src: [.52, .02, .95, .27] }, mb: .9, er: [[0, .5, .09, .7], [0, .82, .08, 1]] }) }],
      ['Happy Rich Luck', '', '#e6e3dc', '#dacbc1', '', '', { shot: Q4('th-11134207-7r98p-lyos1ofcz99l8f', [.177, .033, .648, .033, .648, .87, .177, .87], { key: 'auto', cut: .29, fill: '#dacbc1', deco: { src: [.52, .02, .9, .27] }, ml: .13, er: [[0, .3, .1, 1], [.18, .8, .46, .95]] }) }],   // ตัดขอบล่างเหนือนิ้ว (ยืด ~10%) — สะท้อนแล้วตัวหนังสือ Luck กลับหัว
      ['Smile หมี', '', '#e6e3dc', '#e6d0bc', '', '', { shot: Q4('th-11134207-7r98p-lyos1swuexz53d', [.454, .075, .945, .075, .945, 1, .454, 1], { key: 'auto', cut: .29, fill: '#e6d0bc', deco: { src: [.52, .02, .97, .28] } }) }],
      ['Tulip ดอกไม้', '', '#e6e3dc', '#dacbc0', '', '', { shot: Q4('th-11134207-7r98v-lyos1y1cwxih45', [.468, .05, .985, .05, .985, 1, .468, 1], { key: 'auto', cut: .29, fill: '#dacbc0', deco: { src: [.5, .02, .9, .27] }, ml: .12, mb: .88, er: [[.72, .74, 1, .96]] }) }]], cam: 'island', cov: .29, bump: 1 },
    /* ---- ชุด 3 Samsung (พ.ย. 2026): เคสสีพื้น/ใส/ด้านที่ขายดี — ภาพร้านทีละเคส ---- */
    '59622945_29668096052': { t: 'เคสซิลิโคนเหลว แม่เหล็ก สายคล้อง', back: 'solid', cols: [['ขาว', '#ecebe6', '#e3e2dd']], mag: 'faint', magF: 1, mo: 1, tab: 1, mw: 4, mr: 21, tw: 3.6, tl: 11, tg: 3, cam: 'island', lr: 'case', ho: -.5, bw: .4 },   // ภาพร้าน: ห่วงยางรายเลนส์สีเคส · วงแม่เหล็กเป็นเส้นขอบบางสีเดียวกับเคส
    '1282236525_42559217757': { t: 'เคสฝ้าบางพิเศษ แม่เหล็ก', back: 'frost', cols: [['ฝ้าขาว', '', '#d8dadc'], ['ฝ้าดำ', '#3b3c3f', '#2b2c2f', '', 'smoke', '#2a2b2e']], mag: '#f2f2f2', magF: 1, mw: 4.2, mr: 21, tw: 4.2, tl: 11, tg: 3, tab: 1, cam: 'frame', grp: 1, lw: 1.2, bw: .4 },
    '479034841_24985301009': { t: 'เคสผิวด้าน ขอบกล้องสี ปุ่มโลหะ', back: 'solid', cols: [['ขาวมุก', '#e7e8ec', '#dcdde2', '#2a2a2d'], ['ม่วง', '#8d7eaa', '#7f709d', '#9c80d4'], ['น้ำเงิน', '#7088c4', '#617ab8', '#3f6fd6'], ['ชมพู', '#eaa9a2', '#e29c95', '#ef8c84']], cam: 'frame', grp: 1, lw: 2.4, bw: .8 },   // ภาพร้าน: กรอบกล้องยกสูงสีเข้มกว่าเคส (ขาวมุก = กรอบดำ)
    '849432496_18591770434': { t: 'ProMeta เคสใส ขอบชุบ แม่เหล็ก กันเลนส์', back: 'clear', cols: [['ชมพู', '', '#d9a9b8', '#d9a9b8']], mag: 'edge', mw: 4.2, tab: 1, cam: 'island', cover: 'clear', lr: 'edge', chrome: 1, edge: 1, bw: 1.2, lw: 1.8 },   // แบบเดียวกับ Manis Lemon: กรอบชุบรายเลนส์ + วงชุบ
    '1080739551_25885545585': { t: 'เคสฝ้าโลหะ ขอบกล้องชุบ แม่เหล็ก', back: 'frost', cols: [['เงิน', '#c9cacd', '#b7b8bb', '#d9dadd'], ['ทอง', '#bcae94', '#a99b82', '#cdb991', '', '#1c1c1e']], mag: '#f4f4f4', magF: 1, mw: 5, mr: 21, tw: 5, tl: 11, tg: 3, tab: 1, cam: 'frame', grp: 1, lw: 2, bw: 1 },
    '34168692_29225426958': { t: 'Kingkong เคสใส มุมถุงลม', back: 'clear', cols: [['ใส', '', '#dde1e6']], cam: 'frame', grp: 1, lw: 2.4, bw: 2, bump: 1, bumpB: 2.4 },
    '865743494_25785837844': { t: 'เคสฝ้า ขอบสี แม่เหล็กสีขอบ', back: 'frost', cols: [['ขอบฟ้า', '', '#7096cf', '#7096cf'], ['ขอบดำ', '', '#1c1c1e', '#1c1c1e']], mag: 'edge', magF: 1, mw: 5.4, mr: 21, tw: 5.4, tl: 12, tg: 3, tab: 1, cam: 'frame', grp: 1, lw: 2.6, bw: 2.6, edge: 1 },
    '114972051_23282103122': { t: 'เคสใส TPU มุมกันกระแทก', back: 'clear', cols: [['ใส', '', '#e2e5e9']], cam: 'frame', grp: 1, lw: 2, bw: 1.6, bump: 1, bumpB: 2.2 },
    /* ---- ชุดแนวใหม่ (พ.ย. 2026 ผู้ใช้: "หาเคสที่มีแนวไม่เหมือนอันอื่น"): กากเพชร · ไล่สี · เกราะ+ขาตั้งพับ · ฝาสไลด์ปิดกล้อง ---- */
    '1578013652_41859907039': { t: 'MobiSkin เคสใส ดาววิบวับ', back: 'clear', cols: [['ดาวขาว', '', '#dfe3e8', '', '', '', { glit: { c: '#ffffff' } }], ['ดาวชมพู', '', '#e6d8dd', '', '', '', { glit: { c: '#f3a2c1', c2: '#ffffff' } }]], glit: { n: 6, st: 26, ss: 3.4 }, cam: 'frame', grp: 1, lw: 2, bw: 1.4 },
    '166461551_24136169667': { t: 'เคสใสกากเพชร สีพาสเทล', back: 'frost', cols: [['ม่วง', '#cdbcef', '#c3b0e9', '#c3b0e9'], ['ชมพู', '#f2a2cf', '#ec8fc3', '#ec8fc3']], glit: { n: 34, c2: '#fdf3ff' }, fa: .74, cam: 'island', grp: 1, lr: 'case', ho: -.2, bw: 1.2 },   // ภาพร้าน: ห่วงยกรายเลนส์สีเดียวกับเคส
    '1228259575_44373849099': { t: 'เคสผิวด้าน ไล่สี มุมกันกระแทก', back: 'solid', cols: [['ชมพู–ดำ', '#d8a8a6', '#c99896', '#1c1c1e', '', '', '', '#1d1d1f']], gs: [.24, .54], wg: 1, cam: 'island', bump: 1, bumpB: 1.6, bw: .6 },   // ภาพร้าน: แผ่นครอบกล้องดำทั้งแผ่น เจาะรูเลนส์ · มุมบนแหลมยื่น
    '1017184019_25992166972': { t: 'HOHO เคสเกราะ ขาตั้งพับ แม่เหล็ก', back: 'solid', tex: 1, cols: [['ดำ', '#2b2e35', '#24272d'], ['เทา', '#a9abae', '#9d9fa3'], ['ชมพู', '#e2b6b1', '#d8aaa5'], ['น้ำเงิน', '#3e5f92', '#365485'], ['เขียว', '#6f8a5d', '#647e53'], ['ทราย', '#cdb08b', '#c2a47e']], mag: 'faint', magF: 1, mo: 1, mw: 3, rug: 1, fold: [.6, .9, .34], cam: 'frame', lw: 2.6, bw: 2, bump: 1, bumpB: 1.8 },
    '1704185425_47154762218': { t: 'NILLKIN CamShield ฝาสไลด์ปิดกล้อง', back: 'solid', cols: [['ดำ', '#1d1e21', '#141517']], rib: 1.7, cam: 'frame', slide: 1, lw: 2.6, bw: 1 },
    '839577675_25522989094': { t: 'Goodis กากเพชรไล่สี ขอบชุบ แม่เหล็ก', back: 'frost', cols: [['ชมพู', '#e4e4e7', '#7a3d4b', '', '', '', '', '#ec9cb9'], ['ทอง', '#efe3c2', '#b8955a', '', '', '', '', '#d8bd82'], ['เงิน', '#ececee', '#9c9ea3', '', '', '', '', '#c4c6ca']], gs: [.35, .85], glit: { n: 30 }, fa: .8, mag: 'edge', mw: 3.6, tab: 1, cam: 'island', cover: 'clear', lr: 'edge', chrome: 1, edge: 1, bw: 1, lw: 1.6 },
    /* ---- ชุด iPhone อันดับสูง (พ.ย. 2026 ผู้ใช้: "เอาแค่ของ iphone ทำที่อยู่ในอันดับสูง ๆ ก่อน 15 อัน") — เรียงตามคะแนนหน้าอันดับ (sat) ---- */
    '1162604086_42902447812': { t: 'iStar Slim Magnetic เคสใสบาง', back: 'clear', cols: [['ใส วงดำ', '', '#dfe3e8', '', '', '#1c1c1e'], ['ใส วงขาว', '', '#dfe3e8', '', '', '#f4f4f4']], mag: '#1c1c1e', magF: 1, mw: 4, tab: 1, cam: 'frame', lw: 1.6, bw: 1.2 },
    '992330921_42667348050': { t: 'iFilm เคสใส แม่เหล็ก กันกระแทก', back: 'clear', cols: [['ใส', '', '#dde1e6']], mag: '#f3f3f3', magF: 1, mw: 4.4, tab: 1, tl: 12, cam: 'frame', lw: 2.2, bw: 1.6, bump: 1, bumpB: 1.4 },
    '77236935_49400153212': { t: 'UNIQ Glacion Classic ใส มุมหนา', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#eef0f2'], ['ดำควัน', '#3a3b3e', '#2a2b2e', '', 'smoke', '#1c1c1e'], ['ส้มใส', '#ec8a3c', '#e57e2d', '', 'smoke', '#c9661f']], mag: '#eef0f2', magF: 1, mw: 4.4, tab: 1, cam: 'frame', lw: 2.4, bw: 2, bump: 1, bumpB: 2 },
    '1632504285_45404232993': { t: 'aoketu เคสใสกากเพชร แม่เหล็กวง C', back: 'clear', cols: [['ใสกากเพชร', '', '#dfe3e8'], ['ส้มกากเพชร', '#f0a066', '#e8955a', '', 'frost']], glit: { n: 30 }, fa: .72, mag: '#f4f4f4', magC: 1, magF: 1, mw: 3.6, cam: 'frame', lw: 2, bw: 1.6 },
    '1162604086_51301542240': { t: 'iStar Original Magnetic ฝ้าสี', back: 'frost', cols: [['ขาว', '#eceef0', '#e2e4e6', '', '', '#f6f6f6'], ['กรมท่า', '#2c3a55', '#24304a', '', '', '#1c2438'], ['ส้ม', '#ee7a2e', '#e46f22', '', '', '#c95f18'], ['ฟ้า', '#4a8fe0', '#3f82d4', '', '', '#2f6cba'], ['แดงเลือดหมู', '#6a2433', '#5e1f2c', '', '', '#4a1722']], fa: .84, mag: '#f6f6f6', magF: 1, mw: 4, tab: 1, cam: 'frame', lw: 2.2, bw: 1.4 },
    '1162604086_29781052718': { t: 'iStar ซิลิโคน แม่เหล็ก ลบรอยปากกาได้', back: 'solid', cols: [['ครีม', '#e7e4d8', '#dfdcd0']], mag: '#bdbcb7', magF: 1, mw: 3.4, tab: 1, cam: 'frame', lw: 1.8, bw: .4 },
    '1418771_41064797680': { t: 'เคสซิลิโคนพาสเทล ครอบปุ่มกล้อง', back: 'solid', cols: [['เหลือง', '#f1e3a6', '#ebdc9b'], ['ม่วง', '#cfc3e6', '#c6b9df'], ['ชมพู', '#eac4cf', '#e3b9c5'], ['ฟ้า', '#b9d0ea', '#aec7e3'], ['ดำ', '#232325', '#1d1d1f'], ['กากี', '#c9b49b', '#c0aa90'], ['มิ้นต์', '#b5ddd0', '#a9d5c7']], cam: 'frame', lw: 1.8, bw: .4 },
    '308005937_42968395084': { t: 'MOFT Snap Case MOVAS', back: 'solid', tex: 1, cols: [['ขาว', '#ecebe7', '#e4e3df', '#e8742f'], ['ดำ', '#2a2a2c', '#232325', '#3a3a3c'], ['เทา', '#9e9a95', '#94908b', '#b5b1ac'], ['ชมพู', '#efb8c8', '#e9aabd', '#f3c9d5']], cam: 'frame', lw: 2.2, bw: .6, txt: [['MOFT', .86, .93, 2.2, '#9a9a9a', 'Arial,Helvetica,sans-serif']] },   // ภาพร้าน: แม่เหล็กซ่อนในเนื้อ ไม่เห็นวง · กรอบกล้องสีตัด
    '1352005902_29518494500': { t: 'เคสใส แม่เหล็ก ชาร์จไร้สาย ทุกรุ่น', back: 'clear', cols: [['ใส', '', '#e2e5e8']], mag: '#f4f4f4', magF: 1, mw: 4.2, tab: 1, cam: 'frame', lw: 2, bw: 1.4 },
    '130586349_24329934116': { t: 'เคสใส แม่เหล็ก วงขาวหนา', back: 'clear', cols: [['ใส', '', '#e2e5e8']], mag: '#f6f6f6', magF: 1, mw: 4.8, tab: 1, tw: 4.8, tl: 12, cam: 'frame', lw: 2.2, bw: 1.6 },
    '716817225_26523451647': { t: 'SLIMCASE เคสใสบาง แม่เหล็กวง C', back: 'clear', cols: [['ใส', '', '#e3e6ea']], mag: '#f6f6f6', magC: 1, magF: 1, mw: 4.6, cam: 'frame', lw: 1.6, bw: 1 },
    '153078644_41011712413': { t: 'UGREEN Crystal Clear Magnetic', back: 'clear', cols: [['ใส', '', '#dde1e6']], mag: '#f2f2f2', magF: 1, mw: 4, tab: 1, tl: 12, cam: 'frame', lw: 2.2, bw: 1.6 },
    '1162604086_25487764201': { t: 'iStar ฝ้า ขอบสี กล้องอลูมิเนียม', back: 'frost', cols: [['ดำ', '#3a3d44', '#1d1e21', '#2a2b2e', '', '#1d1e21'], ['เทา', '#aeb1b5', '#8e9196', '#a7aaae', '', '#7d8085'], ['น้ำเงิน', '#4677c9', '#2f62b0', '#3a6fc0', '', '#244f94'], ['น้ำตาล', '#b9937a', '#8a5a3c', '#9c6a48', '', '#7a4d32']], mag: 'edge', magF: 1, mw: 4.4, tab: 1, cam: 'frame', lw: 2.4, bw: 2.4, edge: 1 },
    '1725858149_44278072104': { t: 'MOCOME เคสใส ขอบดำ แม่เหล็ก', back: 'clear', cols: [['ขอบดำ', '', '#1c1c1e', '#1c1c1e']], mag: '#151517', magF: 1, mw: 5.4, mr: 21, tw: 5, tl: 12, tg: 3, tab: 1, cam: 'frame', grp: 1, lw: 2.2, bw: 2.4, edge: 1 },
    /* ---- ชุด iPhone อันดับสูง 2 (พ.ย. 2026) — อันดับ 17–40 ตามคะแนน sat ที่ยังไม่มี LOOK · ข้าม CASENEAL ลายจุด / ลายการ์ตูน (ต้องใช้ภาพตัวเลือกสี) / ซิลิโคนลายคลื่น ---- */
    '1244968038_54000581623': { t: 'เคสใส แม่เหล็กวงขาวหนา มุมหนา', back: 'clear', cols: [['ใส', '', '#dde1e7']], mag: '#f4f4f4', magF: 1, mr: 20.75, mw: 5.5, my: .43, tab: 1, tw: 9, tl: 19, tg: 1.5, dec: [[.045, .022, .955, .978, 7, '#e9edf2', 0, .45]], cam: 'frame', grp: 1, lw: 2.6, bw: 2, bump: 1, bumpB: 1.6 },   /* ภาพตัวเลือกสี (พ.ย. 2026): วงปิดเต็มวง (ไม่ใช่ตัว C) แถบหนา ~.115 ของ Ø · แคปซูลใต้วงอ้วน ~9×19 มม. ห่าง ~1.5 · เส้นขอบแผ่น PC ด้านในเว้นจากขอบ ~3 มม. (dec เส้น) */
    '271723622_42973510413': { t: 'เคสใส แม่เหล็กวง C ขาวหนา มุมหนา', back: 'clear', cols: [['ใส', '', '#dde1e7']], mag: '#f4f4f4', magC: 1, mca: 28, magF: 1, mr: 21.5, mw: 4, my: .43, tab: 1, tw: 4.2, tl: 7, cam: 'frame', grp: 1, lw: 2.6, bw: 2, bump: 1, bumpB: 1.6 },   /* (เดิมใช้ร่วมกับ 1244968038) GSNAP: วง Ø .57W กลาง .43h · ช่องวง C ค่อนซ้ายล่าง */
    '484423257_26640430083': { t: 'เคสกำมะหยี่ ช่องกล้องใหญ่ วงแม่เหล็กเส้นบาง', back: 'solid', cols: [['ฟ้า', '#8fb6e0', '#8fb6e0'], ['ฟ้าอ่อน', '#a9d3e6', '#a9d3e6'], ['เทาเข้ม', '#4a4c4e', '#4a4c4e'], ['เทา', '#7d7f7c', '#7d7f7c'], ['ดำ', '#232426', '#232426'], ['กรมท่า', '#2c3d5c', '#2c3d5c'], ['แดงเลือดหมู', '#6b1e2a', '#6b1e2a'], ['ม่วงอ่อน', '#c8b8e0', '#c8b8e0'], ['กากี', '#a08a72', '#a08a72'], ['ชมพู', '#e8bfc6', '#e8bfc6'], ['ครีม', '#e7e1d2', '#e7e1d2'], ['น้ำตาล', '#6c4c3c', '#6c4c3c']], mag: 'faint', mfd: .16, magF: 1, mr: 23.4, mw: 1, tab: 1, tw: 1, tl: 18, tg: 4, cam: 'frame', grp: 1, lw: 2.6, bw: .4 },
    '1572961704_26841410451': { t: 'เคส TPU สีลูกกวาด ผิวด้าน', back: 'solid', tex: 1, cols: [['ขาว', '#e4e3df', '#dcdbd7'], ['เทาครีม', '#cfcbc0', '#c7c3b8'], ['ชมพู', '#efc9c5', '#e8c0bc'], ['บานเย็น', '#a23c7e', '#983674'], ['ดำ', '#222224', '#1c1c1e'], ['มิ้นต์', '#8fd2c4', '#85c9bb']], cam: 'frame', lw: 2, bw: .4 },
    '93872596_20852266964': { t: 'HI-SHIELD Magnetic Shield ขอบสี', back: 'frost', cols: [['ใส', '#eef0f2', '#dfe2e6', '', '', '#f4f4f4'], ['ขอบดำ', '#9a9b9e', '#1c1c1e', '#1c1c1e', '', '#1c1c1e'], ['ควันดำ', '#5a5b5e', '#1c1c1e', '#1c1c1e', 'smoke', '#3a3b3e']], mag: '#f4f4f4', magF: 1, mr: 23, mw: 5, my: .48, tab: 1, tw: 4.4, tl: 18, tg: 3, cam: 'frame', grp: 1, lw: 2.4, bw: 2, bump: 1, bumpB: 1.6, edge: 1 },   /* GSNAP: วง Ø .62W กลาง .48h · แถบยาว .62–.75h */
    '135096481_29926687573': { t: 'BKWHALE Cooling เคสระบายความร้อน รูรังผึ้ง', back: 'solid', cols: [['ส้ม', '#e8602a', '#e35a24'], ['ดำ', '#232427', '#1d1e21']], perf: { p: 4.2, r: 1.5, nb: [.88, .97, .32] }, mag: 'faint', mfd: .1, mw: .6, magF: 1, cam: 'frame', lw: 3, bw: .6, txt: [['BKWHALE', .5, .938, 4.4, '#8d8d8d', 'Arial,Helvetica,sans-serif']] },
    '1049076226_28766971711': { t: 'เคสใสนิ่ม TPU ราคาประหยัด', back: 'clear', cols: [['ใส', '', '#e2e5e9']], cam: 'frame', grp: 1, lw: 2.4, bw: 1.6 },
    '491079622_26862879036': { t: 'เคสฝ้าดำ แม่เหล็ก ขาตั้งเลนส์กล้อง', back: 'smoke', cols: [['ดำ', '#38393c', '#1c1c1e', '', '', '#2a2b2e'], ['ไทเทเนียม', '#8e8f91', '#6c6d70', '', '', '#5a5b5e']], mag: '#1c1c1e', magF: 1, mw: 4.4, tab: 1, tw: 4.4, tl: 9, cam: 'stand', bw: 1.6 },
    '981458850_18090264151': { t: 'เคสใสหนา ขอบกล้องยกสูง', back: 'clear', cols: [['ใส', '', '#dde1e6']], cam: 'frame', grp: 1, lw: 3, bw: 2.2, bump: 1, bumpB: 1.4 },
    '1200929454_44358444466': { t: 'เคสฝ้าสีพาสเทล ขอบกล้องสี', back: 'frost', cols: [['ดำ', '#3a3b3e', '#2c2d30', '#1f2022', 'smoke'], ['เหลือง', '#f2eaa0', '#ebe08a', '#efe28a'], ['ขาว', '#f1f2f3', '#e6e8ea', '#f6f6f6'], ['ชมพู', '#f3cfe0', '#ecc2d6', '#efc3d8'], ['ฟ้า', '#bcd6f0', '#aac9ea', '#a8c8ec'], ['มิ้นต์', '#c4ece4', '#b2e2d8', '#b4e6dc']], cam: 'frame', grp: 1, lw: 2.8, bw: 1 },
    '93872596_20604605118': { t: 'HI-SHIELD Crystal Shield เคสใส', back: 'clear', cols: [['ใส', '', '#dfe2e6']], cam: 'frame', grp: 1, lw: 2, bw: 1.8, bump: 1, bumpB: 1.2 },
    '351426635_40517706674': { t: 'เคสซิลิโคนกำมะหยี่ สีพื้น ช่องกล้องใหญ่', back: 'solid', cols: [['เขียวเข้ม', '#2f5a3e', '#2f5a3e'], ['เขียวขี้ม้า', '#6b7a3a', '#6b7a3a'], ['ม่วงอ่อน', '#b48fd0', '#b48fd0'], ['ม่วง', '#7a4fb0', '#7a4fb0'], ['เหลือง', '#f2d43a', '#f2d43a'], ['ส้มแดง', '#f04a1e', '#f04a1e'], ['เขียวอ่อน', '#9fd27a', '#9fd27a'], ['เขียวสด', '#5ae03a', '#5ae03a'], ['ชมพูบานเย็น', '#f0287a', '#f0287a'], ['แดง', '#c8202e', '#c8202e'], ['แดงเลือดหมู', '#8a2a2a', '#8a2a2a'], ['ชมพูทราย', '#e2b8a8', '#e2b8a8']], cam: 'frame', grp: 1, lw: 2.4, bw: .4 },
    '166461551_28812869479': { t: 'เคสใสอะคริลิก หลังแข็ง', back: 'clear', cols: [['ใส', '', '#e0e4e8']], cam: 'frame', lw: 1.8, bw: 1.4 },
    '907598609_22851373075': { t: 'hoco เคสใส TPU', back: 'clear', cols: [['ใส', '', '#e2e5e9']], cam: 'frame', lw: 1.6, bw: 1.2, bump: 1, bumpB: 1 },
    '1224730044_44219944250': { t: 'Cosmic เคสใส มุมส้ม แม่เหล็กวง C', back: 'clear', cols: [['ส้ม', '', '#dfe3e8', '#e08a1e', '', '#f2a52a']], mag: '#f2a52a', magC: 1, mca: 30, magF: 1, mw: 5.5, my: .4, tab: 1, tw: 3.6, tl: 6, tx: -.05, cam: 'frame', grp: 1, lw: 2.4, lr: '#d98a20', bump: '#f08a2a', bd: .6, bsw: 3.6, bumpB: 2.2, bw: 1.6 },   /* GSNAP: วง C กลาง .4h ช่องค่อนซ้าย แถบเยื้องซ้าย · มุมส้มก้อนใหญ่ */
    '1177039236_47105785694': { t: 'OSGEER เคสฝ้าดำ ขาตั้งกล้อง แม่เหล็ก', back: 'smoke', cols: [['ดำ', '#4a4b4e', '#1c1c1e', '', '', '#1c1c1e']], mag: '#1c1c1e', magF: 1, mw: 5, tab: 1, tw: 3.6, tl: 20, tg: 3.5, cam: 'stand', bw: 2 },   /* GSNAP: แถบยาว .64–.79h */
    '1204638477_41954047702': { t: 'FNKvision Ice Crystal เคสใสบาง ครอบเลนส์', back: 'clear', cols: [['ใส', '', '#e2e5e9']], cam: 'island', cover: 'clear', lr: '#dfe4ea', bw: 1, lw: 1.4 },
    '70543617_28482007482': { t: 'เคสใส แม่เหล็กวงขาว ชาร์จได้', back: 'clear', cols: [['ใส', '', '#e2e5e8']], mag: '#f2f2f2', magF: 1, mr: 22.8, mw: 4.4, my: .43, tab: 1, tl: 16, cam: 'frame', lw: 2, bw: 1.4 },   /* GSNAP: วง Ø .6W กลาง .43h แถบยาว */
    '1556934210_55456078469': { t: 'เคสฝ้าขาว ขอบขาว แม่เหล็ก', back: 'frost', cols: [['ขาว', '#eeeeec', '#e8e7e2', '#ecebe6', '', '#e6e3da'], ['ใส ขอบดำ', '', '#1c1c1e', '#1c1c1e', 'clear', '#1c1c1e']], mag: '#e6e3da', magF: 1, mw: 5, tab: 1, tw: 4.6, tl: 12, cam: 'frame', grp: 1, lw: 2.8, bw: 2 },
    '125096356_6739877442': { t: 'เคสใส ขอบนิ่มหลังแข็ง TPU+PC', back: 'clear', cols: [['ใส', '', '#dfe3e7']], cam: 'frame', lw: 2, bw: 1.6, bump: 1, bumpB: 1 },
    /* ---- ชุด Samsung 4 (พ.ย. 2026 ผู้ใช้: "ทำของ samsung ให้เยอะหน่อย") — เรียง sat ของเคส Galaxy ที่ยังไม่มี LOOK
       ข้าม: กระเป๋าสตางค์/ฝาพับ/สร้อยข้อมือ/เพชรติดเต็ม/ลายการ์ตูนลิขสิทธิ์/ลายพิมพ์ · ห่วงแหวนนิ้วเล็ก (Candy Ring) · หนังชุบทองลายบั้ง ---- */
    '479034841_29668051302': { t: 'เคสเกราะ ฝาสไลด์กล้อง ห่วงขาตั้ง', back: 'solid', cols: [['ดำ', '#282828', '#18191b', '#1c1c1e', '', '', { shot: Q4('sg-11134201-7rene-m2rueuoj7gmz1f', [0.159, 0.051, 0.55, 0.086, 0.55, 0.937, 0.159, 0.981], { cut: .35, fill: '#2e2e2f', deco: { src: [.56, .02, .945, .34] } }) }], ['ขาว', '#cbcac8', '#18191b', '#1c1c1e', '', '', { shot: Q4('sg-11134201-7reqb-m2rueuu2zc3d95', [0.159, 0.046, 0.552, 0.081, 0.552, 0.938, 0.159, 0.982], { cut: .35, fill: '#2e2e2f', deco: { src: [.56, .02, .945, .34] } }) }], ['เทา', '#7b838d', '#18191b', '#1c1c1e', '', '', { shot: Q4('sg-11134201-7reni-m2ruev1unz0maf', [0.159, 0.049, 0.55, 0.084, 0.55, 0.939, 0.159, 0.983], { cut: .35, fill: '#2e2e2f', deco: { src: [.56, .02, .945, .34] } }) }], ['ชมพู', '#b98088', '#18191b', '#1c1c1e', '', '', { shot: Q4('sg-11134201-7reoy-m2ruev9cbll28d', [0.159, 0.047, 0.552, 0.082, 0.552, 0.938, 0.159, 0.982], { cut: .35, fill: '#2e2e2f', deco: { src: [.56, .02, .945, .34] } }) }]], cam: 'island', lw: 1.2, bw: 2 },   /* ภาพตัวเลือกสีจริง (9 พ.ย. 2026 รอบ 5 — วาดด้วย dec ผู้ใช้ทัก 4 รอบว่าลายเกราะ/ดิสก์โลหะไม่เหมือน): ภาพเรนเดอร์ S23 Ultra หันเอียงเล็กน้อย มุมจากพิกเซล (ขอบขวา .55 ตรง · ขอบบน/ล่างเฉียง) · ส่วนกล้องเป็นแผ่นดำของเคส #303030 ถึง .35h → เติมสีแผ่น + island ดำเจาะรูตามเลนส์รุ่นผู้ใช้ · ฝาสไลด์ (.56–.945W × .02–.34h) แปะกลับด้วย deco */
    '479034841_26677887427': { t: 'zeamar เคสฝ้า ขอบครีม ห่วงเลนส์โลหะ แม่เหล็ก', back: 'frost', cols: [['เขียวเทา', '#a3b2aa', '#e6e4dc', '#c9cacd', '', '#e6e4dc']], fa: .85, mag: '#e6e4dc', magF: 1, mr: 20.5, mw: 3.4, tab: 1, tl: 12, cam: 'frame', grp: 1, lr: '#bfc0c3', lw: 2.6, bw: 2.2 },   /* GSNAP: กรอบกล้องยกทั้งก้อนสีเงิน + ห่วงโลหะรายเลนส์ · วง Ø ~.5W */
    '310850681_26363747363': { t: 'เคสใส หลังแข็งขอบนิ่ม แม่เหล็กวงขาว', back: 'clear', cols: [['ใส', '', '#dfe3e8']], mag: '#f2f2f2', magF: 1, mw: 3.6, tab: 1, tl: 10, cam: 'frame', grp: 1, lw: 2.2, bw: 1.6 },
    '34168692_22289358199': { t: 'MOCOME เคสฝ้าฟ้า ห่วงขาตั้ง แม่เหล็ก', back: 'frost', cols: [['ฟ้า', '#a6b8d6', '#7f99c4', '#86acdb', '', '', { ring: '#86acdb' }], ['ดำ', '#4a4b4e', '#1c1c1e', '#141416', '', '', { ring: '#2a2a2c' }], ['เทา', '#cfd0d2', '#8f9092', '#8f9092', '', '', { ring: '#8a8b8d' }], ['ม่วง', '#c9bccf', '#4b2e6b', '#5a3f7a', '', '', { ring: '#5a3f7a' }], ['เขียว', '#7d877b', '#2f4434', '#3e5a45', '', '', { ring: '#3e5a45' }], ['ใส', '', '#d6d9de', '#e4e4e4', 'clear', '', { ring: '#dcdcdc' }]], fa: .8, ring: '#86acdb', rgr: 22.6, mw: 4.8, my: .56, dec: [[.47, .718, .53, .732, .5, '#3a3c40'], [.457, .732, .543, .8, 3.5, 'ring']], cam: 'frame', grp: 'box', gp: 3, lw: 3.4, bw: 2 },   /* GSNAP ภาพตัวเลือกสี (พ.ย. 2026): หน้าต่างกล้องสี่เหลี่ยมใหญ่ใบเดียวคลุมทุกเลนส์ ขอบยกหนา ~3.4 มม. สีห่วง · ห่วง Ø นอก ~50 มม. หนา 4.8 ห่างใต้หน้าต่าง ~3.5 มม. · บานพับ + แคปซูลใต้ห่วง 7×12 มม. · ตัวเลือก "ใส" ใช้ col[4] = 'clear' */
    '797351071_28879060095': { t: 'PBZZ เคสใส ขอบดำ ห่วงขาตั้งแม่เหล็ก', back: 'clear', cols: [['ขอบดำ', '', '#1c1c1e', '#1c1c1e']], ring: '#1c1c1e', rgr: 18, mw: 6, cam: 'island', cover: 'clear', lr: '#1c1c1e', bump: '#1c1c1e', bumpB: 2.2, bw: 1.4, edge: 1 },
    '279950438_28501185060': { t: 'เคสสีพื้น ช่องใส่บัตรด้านหลัง สายคล้อง', back: 'solid', cols: [['ครีม', '#ece4d4', '#e6ddcc'], ['ชมพู', '#eec5bb', '#e8bcb1']], pocket: 1, pk: [.42, .96, .07], cam: 'island', bump: 1, bumpB: 2.6, bw: 1 },
    '524631856_41512561756': { t: 'UAG เคสควันใส ขอบเกราะ ห่วงขาตั้ง', back: 'smoke', cols: [['ชา', '#3a3b3e', '#1c1c1e', '#1c1c1e'], ['ใส', '', '#1c1c1e', '#1c1c1e', 'clear']], fa: .6, ring: '#1c1c1e', rgr: 23.2, mw: 1.6, my: .51, dec: [[.182, .345, .818, .685, -14, '#1c1c1e', 0, 5], [.39, .335, .61, .36, 1.5, '#e8642c'], [.45, .68, .55, .70, .5, '#b8b9bb'], [.44, .70, .56, .87, 2, '#1c1c1e'], [0, .05, .08, .95, 2, '#1c1c1e', 1], [.92, .05, 1, .95, 2, '#1c1c1e', 1], [.08, .905, .92, .955, 2, '#1c1c1e']], cam: 'frame', grp: 1, lw: 3, bw: 2.4, bump: 1, bumpB: 2 },   /* GSNAP ภาพตัวเลือกสี "ตั้งได้" (พ.ย. 2026): ฐานห่วงแปดเหลี่ยมดำ .70W × .33–.70h กลาง .51h มีรูใส Ø ~.57W (ห่วงพับได้ทั้งแผ่น) · ปุ่มส้มบนแปดเหลี่ยม · บานพับเงิน + ก้านขาตั้งถึง .87h · คานดำสองข้างเต็มความยาว + คานล่าง · ยังไม่ได้วาด: คานเฉียงมุม (ลายตัว X) และลายรังผึ้งบนแผ่นใส */
    '1282236525_55201940557': { t: 'เคสใส มุมหนา แม่เหล็กวงขาว รุ่น A/S', back: 'clear', cols: [['ใส', '', '#e2e0e6']], mag: '#f4f4f4', magF: 1, mw: 4.4, my: .52, tab: 1, tl: 16, tg: 4, cam: 'frame', grp: 1, lw: 2.4, bw: 1.8, bump: 1, bumpB: 1.6 },
    '1282236525_24846190586': { t: 'เคสผิวด้าน ไล่สีน้ำเงิน–แดงไวน์ แม่เหล็ก', back: 'solid', cols: [['น้ำเงิน–แดงไวน์', '#2f5a86', '#2f5a86', '', '', '', '', '#6b1f33']], gs: [.35, .75], wg: 1, mag: 'rgba(0,0,0,.16)', magF: 1, mw: 3.6, my: .55, tab: 1, tl: 14, cam: 'island', bw: .4 },   /* GSNAP: วงปั๊มนูนจาง กลาง .55h (ไม่ใช่วงสีฟ้าชัด) */
    '364773678_25704606247': { t: 'เคสใสกันกระแทก มุมถุงลม ครอบกล้องใส', back: 'clear', cols: [['ใส', '', '#dfe3e8']], cam: 'island', grp: 1, cover: 'clear', bw: 1.4, bump: 1, bumpB: 2 },
    '479029900_43074904679': { t: 'เคสฝ้าขุ่น ขอบสี ครอบกล้องสี กันรอยนิ้ว', back: 'frost', cols: [['เขียวขี้ม้า', '', '#6e7a3c', '#6e7a3c'], ['เขียวเข้ม', '', '#1f4a3a', '#1f4a3a']], cam: 'island', grp: 1, bw: 2, edge: 1 },
    '438383492_57403248234': { t: 'เคสกลิตเตอร์ไล่สี ขอบชมพู ครอบกล้องชุบ', back: 'frost', cols: [['ชมพู', '#eef0f2', '#efb2b6', '#f2bcc0', '', '', '', '#f3bfcb']], gs: [.4, .95], glit: { n: 30, c: '#ffe9ef' }, fa: .5, cam: 'island', grp: 1, lr: 'edge', chrome: 1, edge: 1, bw: 1.8, lw: 1.6 },
    '1101426461_29573579901': { t: 'เคสใส ขอบชุบทอง ครอบกล้องชุบ', back: 'clear', cols: [['ทอง', '', '#e0b07a', '#e0b07a']], chrome: 1, cam: 'island', grp: 1, lr: 'edge', bump: 1, bumpB: 2, bw: 1.2, edge: 1 },
    '114972051_29374921001': { t: 'XUNDD เคสใส ขอบเกราะ มุมถุงลม', back: 'clear', cols: [['ขอบดำ', '', '#26272a', '#26272a'], ['ขอบเทา', '', '#4a4d52', '#4a4d52']], cam: 'island', grp: 1, bump: 1, bumpB: 2.4, bw: 2.2, edge: 1 },
    '1731724825_48205613014': { t: 'เคสเกราะ 2 ชั้น ห่วงขาตั้ง', back: 'solid', tex: 1, cols: [['เทาม่วง', '#8e93a8', '#80859a'], ['เขียว', '#2f6a52', '#285c47'], ['น้ำเงิน', '#2f5c9a', '#28508a'], ['ดำ', '#232427', '#1c1d20'], ['แดง', '#c42a32', '#b0242b']], ring: '#1f2022', rgr: 16.5, mw: 4.6, my: .68, dec: [[.44, .65, .56, .71, 5, '#1c1c1e'], [.45, .36, .55, .47, 4, '#1c1c1e'], [.08, .4, .2, .54, 1.5, '#1c1c1e'], [.8, .4, .92, .54, 1.5, '#1c1c1e'], [.28, .86, .44, .9, 1, '#1c1c1e'], [.56, .86, .72, .9, 1, '#1c1c1e']], cam: 'island', grp: 1, bw: 2, bump: 1, bumpB: 1.6 },   /* GSNAP: ห่วงดำ Ø ~.42W กลาง .66h · ช่องดำเหนือห่วง · แผ่นดำข้าง .4–.54h · แถบดำล่าง */
    '1704185425_50954742201': { t: 'NILLKIN เคสใส ขอบชุบม่วง แม่เหล็ก', back: 'clear', cols: [['ม่วง', '', '#4a3a6e', '#3e3160', '', '#4b3b74']], mag: '#4b3b74', magF: 1, mr: 20.8, mw: 3.8, my: .47, tab: 1, tw: 3.4, tl: 18, tg: 3, cam: 'island', grp: 1, chrome: 1, bw: 1.4, edge: 1 },
    /* ---- ชุด iPhone อันดับสูง 3 (พ.ย. 2026 ผู้ใช้: สร้างเคสอื่น ๆ เพิ่มมาอีก) — อันดับ 41–84 · วัดด้วย GSNAP ตั้งแต่แรก
       ข้าม: Dimi (ฝาครอบกล้องพิมพ์ลายการ์ตูน) · ขอบเพชรติด (1096988705) · ลายพราง/ลายการ์ตูน ---- */
    '1207011833_47807295521': { t: 'OSGEER เคสใส ขาตั้งกล้อง วงสี มุมสี', back: 'clear', cols: [['ดำ', '', '#dfe3e8', '#1c1c1e', '', '#1c1c1e', { bump: '#1c1c1e' }], ['ชมพู', '', '#e6dde2', '#f2a7c8', '', '#f2a7c8', { bump: '#f2a7c8' }], ['แดงเลือดหมู', '', '#e2dadc', '#7a1f35', '', '#7a1f35', { bump: '#7a1f35' }], ['ฟ้า', '', '#dde3ea', '#8fbbe8', '', '#8fbbe8', { bump: '#8fbbe8' }], ['ส้ม', '', '#e6e0da', '#f08a2a', '', '#f08a2a', { bump: '#f08a2a' }]], mag: '#1c1c1e', magF: 1, mr: 24, mw: 6, my: .39, tab: 1, tw: 4.6, tl: 14, stand: 1, cam: 'frame', grp: 1, lw: 2.8, bw: 1.6, bump: 1, bd: .5, bsw: 3, bumpB: 1.8 },
    '1610053095_43184202045': { t: 'MAGEASY Lyte M เคสฝ้าบาง 0.7 มม.', back: 'frost', cols: [['Translucent', '', '#e3e5e8', '#e8eaec', '', '#f2f2f2'], ['Mist', '#9aa3ad', '#8e97a1', '#8a939d', '', '#727b85'], ['Nebula', '#5a2f45', '#4f283c', '#4c2639', '', '#3a1d2c'], ['Slate', '#6b675f', '#5f5b54', '#5c5850', '', '#46433d']], mag: '#f2f2f2', magF: 1, mr: 22, mw: 4.2, my: .43, tab: 1, tw: 4, tl: 10, cam: 'frame', grp: 1, lw: 2.2, bw: 1.2 },
    '1530045418_26086416653': { t: 'LITECHIC เคสใส TPU+PC', back: 'clear', cols: [['ใส', '', '#e0e4e8']], cam: 'frame', lw: 2, bw: 1.4 },
    '524298072_25155736900': { t: 'Sanptoch Ultra Slim Magnetic ใส', back: 'clear', cols: [['ใส', '', '#e3e6ea']], mag: '#f4f4f4', magF: 1, mr: 23, mw: 5.5, my: .41, tab: 1, tw: 6, tl: 9, tg: 3, cam: 'frame', lw: 2, bw: 1 },
    '1017184019_22054713290': { t: 'HOHO K เคสใสกันกระแทก ขอบกล้องหนา', back: 'clear', cols: [['ใส', '', '#dde1e6']], cam: 'frame', grp: 1, lw: 3, bw: 1.8, bump: 1, bumpB: 1.4 },
    '273956597_27130514746': { t: 'เคส 360 เกาหลี อะคริลิกผิวด้าน แม่เหล็ก', back: 'frost', cols: [['ใสด้าน', '', '#e2e5e9', '', '', '#f4f4f4']], fa: .3, mag: '#f4f4f4', magF: 1, mw: 4.4, my: .46, tab: 1, tl: 12, cam: 'frame', lw: 2.2, bw: 1.4 },
    '230773795_43702539849': { t: 'GOOD LUCK เคสใส แม่เหล็ก ขอบกล้องอลูมิเนียม', back: 'clear', cols: [['ใส', '', '#e2e5e9', '#c9cacd']], mag: '#f4f4f4', magF: 1, mr: 25, mw: 4.4, my: .44, tab: 1, tl: 18, cam: 'frame', lw: 2, lr: '#c9cacd', bw: 1.4 },
    '282631992_52954821582': { t: 'Manis Lemon ขาตั้งหมุน 360 แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#e0e3e7', '', '', '', { ring: '#c3c5c9' }], ['ดำใส', '#3a3b3e', '#2c2d30', '', 'smoke', '', { ring: '#55575c' }]], ring: '#c3c5c9', rgr: 22, mw: 4.5, my: .52, stand: 1, cam: 'frame', grp: 1, lw: 2.4, bw: 1.6 },
    '494149730_11221213243': { t: 'SET01 เคสซิลิโคนกำมะหยี่ สีพื้น', back: 'solid', cols: [['ขาว', '#ecebe6', '#ecebe6'], ['ดำ', '#232325', '#232325'], ['กรมท่า', '#2a3550', '#2a3550'], ['เทาเข้ม', '#5d6066', '#5d6066']], cam: 'frame', grp: 1, lw: 2.6, bw: .4 },
    '378605183_27538990021': { t: 'เคสซิลิโคนดำด้าน บุกำมะหยี่ ขอบกล้องนูน', back: 'solid', cols: [['ดำ', '#1f1f21', '#1f1f21']], cam: 'frame', lw: 3, bw: .4 },
    '1243348327_47203520169': { t: 'เคสหนัง ช่องกล้องใหญ่ ขอบนูน', back: 'solid', tex: 1, cols: [['น้ำตาล', '#4a3a30', '#45362d']], cam: 'frame', grp: 1, lw: 2.8, bw: .6 },
    '30950658_22707191183': { t: 'Moov CS02 เคสใส แม่เหล็ก มุมกันกระแทก', back: 'clear', cols: [['ใส', '', '#dde1e6']], mag: '#f4f4f4', magF: 1, mr: 23.5, mw: 4.4, my: .44, tab: 1, tl: 12, cam: 'frame', grp: 1, lw: 2.4, bw: 1.6, bump: 1, bumpB: 2 },
    '1262177304_27612326220': { t: 'Art Shell เคสฝ้าดำ ครอบเลนส์ แม่เหล็ก', back: 'smoke', cols: [['ดำ', '#2c2d30', '#1c1c1e', '#1c1c1e']], fa: .82, mag: '#232427', magF: 1, mw: 4, tab: 1, tl: 8, cam: 'island', lr: '#2a2b2e', bw: 1.2 },
    '494921424_43811515976': { t: 'เคสกระจกฝ้า ขอบชุบ ฝาครอบกล้อง', back: 'frost', cols: [['ชมพู', '#efc3cf', '#e3a1b4', '#efc3cf']], fa: .85, chrome: 1, cov: .27, cam: 'island', lr: 'edge', bw: 1, edge: 1 },
    '1017184019_43269006099': { t: 'HOHO C เคสซิลิโคน สีพื้น ขอบกล้องนูน', back: 'solid', cols: [['ม่วง', '#4f4a78', '#4f4a78'], ['เขียว', '#8fa07a', '#8fa07a'], ['กรมท่า', '#2a3550', '#2a3550'], ['เทาเข้ม', '#3a3f45', '#3a3f45'], ['ส้ม', '#ef7a2a', '#ef7a2a']], cam: 'frame', grp: 1, lw: 2.6, bw: .4 },
    /* ---- ชุด iPhone อันดับสูง 4 (พ.ย. 2026 ผู้ใช้: ทำตามแผน 15 แบบ) — คัดจากอันดับ sat ที่ยังไม่มี LOOK · ข้าม Tagi/CASENEAL ลายจุด/กล่องสุ่ม/ลายการ์ตูน/ลายพราง/ฝาพับหนัง/ซิลิโคนลายคลื่น · วัดด้วย GSNAP ---- */
    '1207011833_29719083587': { t: 'OSGEER HD เคสใส ฝาครอบกล้องนูน แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#e0e4e8']], mag: '#f4f4f4', magC: 1, mga: 35, magF: 1, mr: 20.7, mw: 3.8, my: .49, tab: 1, tw: 5, tl: 18, tg: 9, cam: 'frame', grp: 1, lw: 2.6, bw: 1.6 },
    '1068293033_40077333756': { t: 'OSGEER เคสใส ขอบกล้องหนา แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#e0e4e8', '#d6d9dd'], ['ขอบกล้องดำ', '', '#dde1e6', '#1c1c1e']], mag: '#f4f4f4', magC: 1, mga: 35, magF: 1, mr: 22.3, mw: 3.6, my: .5, tab: 1, tw: 4.8, tl: 19, tg: 11.5, cam: 'frame', grp: 1, lw: 4, bw: 1.6 },
    '1068293033_24216733138': { t: 'OSGEER เคสใส ขอบกล้องโลหะ แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#e0e4e8', '#c9cacd']], mag: '#f4f4f4', magC: 1, magF: 1, mr: 21.2, mw: 4.3, my: .5, tab: 1, tw: 5.5, tl: 16, tg: 16.5, cam: 'frame', grp: 1, lw: 3, lr: '#c9cacd', bw: 1.6 },
    '1177039231_28553487941': { t: 'OSGEER HD เคสใสบาง วงแม่เหล็ก', back: 'clear', cols: [['ใส', '', '#e3e6ea']], mag: '#f4f4f4', magF: 1, mr: 24.2, mw: 4.6, my: .49, tab: 1, tw: 4, tl: 12, cam: 'frame', lw: 2, bw: 1.2 },
    '1207011837_42127652179': { t: 'it เคสใส แม่เหล็ก ขอบกล้องชมพู', back: 'clear', cols: [['ใส ขอบกล้องชมพู', '', '#e0e4e8', '#f2a7c8']], mag: '#f4f4f4', magF: 1, mr: 24, mw: 5, my: .5, tab: 1, tw: 4.6, tl: 12, tg: 9, cam: 'frame', grp: 1, lw: 3.8, bw: 1.4 },
    '1207011837_25088507194': { t: 'it เคสใส 360 ขอบหนา แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#dde1e6']], mag: '#f4f4f4', magF: 1, mr: 22.5, mw: 4.5, my: .5, tab: 1, tw: 4.4, tl: 9, tg: 3, cam: 'frame', grp: 1, lw: 3.4, bw: 2.4, bump: 1, bumpB: 2 },
    '1017184019_28530136776': { t: 'HOHO JZ เคสฝ้า ขาตั้งกล้อง แม่เหล็ก', back: 'frost', fa: .5, cols: [['ดำ', '', '#2b2b2d', '#1f1f21']], mag: '#1c1c1e', magF: 1, mr: 20.2, mw: 6.5, my: .485, tab: 1, tw: 7, tl: 13.5, tg: 1, stand: 1, cam: 'frame', grp: 1, lw: 3, bw: 2.2 },
    '1017184019_20380927243': { t: 'HOHO เคสใสคริสตัล แม่เหล็ก มุมกันกระแทก', back: 'clear', cols: [['ใส', '', '#dde1e6']], mag: '#f4f4f4', magC: 1, mga: 33, magF: 1, mr: 19, mw: 5, my: .455, tab: 1, tw: 7, tl: 19, tg: 3, cam: 'frame', grp: 1, lw: 2.4, bw: 1.6, bump: 1, bumpB: 1.6 },
    '1017184019_22171075530': { t: 'TM เคสใสกันกระแทก มุมหนา', back: 'clear', cols: [['ใส', '', '#dde1e6']], cam: 'frame', grp: 1, lw: 2.4, bw: 1.8, bump: 1, bumpB: 2 },
    '120958585_13260952993': { t: 'JT เคสใส TPU+PC กรอบกล้องนูน', back: 'clear', cols: [['ใส', '', '#dfe3e8']], cam: 'frame', grp: 1, lw: 3, bw: 1.4 },
    '153050984_2648338796': { t: 'hoco เคสใสนิ่ม บาง', back: 'clear', cols: [['ใส', '', '#e3e6ea']], cam: 'frame', lw: 1.6, bw: 1 },
    '1112640471_47700982079': { t: 'เคสใส แม่เหล็ก กันกระแทก TPU+PC', back: 'clear', cols: [['ใส', '', '#e3e6ea']], mag: '#f4f4f4', magF: 1, mr: 26.5, mw: 5, my: .55, tab: 1, tw: 7, tl: 13, tg: 4, cam: 'frame', lw: 2.6, bw: 1.2 },
    '230773795_47700308934': { t: 'GOOD Magnetic เคสใส ขอบดำ วงดำ', back: 'clear', cols: [['ดำ', '', '#1f1f21', '#1f1f21']], mag: '#1c1c1e', magF: 1, mr: 22, mw: 6.8, my: .51, tab: 1, tw: 6.8, tl: 23, tg: 2, cam: 'frame', grp: 1, lw: 3.4, bw: 3.4 },
    '1547489559_40105796543': { t: 'LITECHIC เคสใส แม่เหล็ก กรอบกล้องหนา', back: 'clear', cols: [['ใส', '', '#e2e5e9']], mag: '#f4f4f4', magF: 1, mr: 23.5, mw: 4.7, my: .51, tab: 1, tw: 6.6, tl: 15, tg: 3, cam: 'frame', grp: 1, lw: 3, bw: 1.4 },
    '183692340_29578313514': { t: 'P-One เคสใส PC Crystal Clear ขอบยกสูง', back: 'clear', cols: [['ใส', '', '#e3e6ea']], cam: 'frame', grp: 1, lw: 2.8, bw: 1.6 },
    /* ---- ชุด iPhone 5 (พ.ย. 2026 ผู้ใช้: ทำเคสอื่นมาต่อ) ---- */
    '183692340_25616489131': { t: 'P-One เคสแม่เหล็ก ใสกันกระแทก', back: 'clear', cols: [['ใส', '', '#e3e6ea']], mag: '#f4f4f4', magF: 1, mr: 23.6, mw: 4.8, my: .51, tab: 1, tw: 7.6, tl: 18.6, tg: 4, cam: 'frame', grp: 1, lw: 2.6, bw: 1.4 },
    '110810771_24657401601': { t: 'BEST S เคสใส แม่เหล็ก วงขาว', back: 'clear', cols: [['ใส', '', '#e3e6ea']], mag: '#f4f4f4', magF: 1, mr: 21.7, mw: 5.5, my: .52, tab: 1, tw: 7, tl: 17.6, tg: 1, cam: 'frame', grp: 1, lw: 2.8, bw: 1.2 },   /* ภาพแกลเลอรี (เคสวางบนกระดาษ ไม่เอียง): กลางวง .52h (เดิม .47 จากภาพมือถือเอียง) · วงขาวขอบเทา + แคปซูลขอบเทา */
    '273956597_27730514324': { t: '360 เกาหลี เคสใสอะคริลิก (PC+TPU)', back: 'clear', cols: [['ใส', '', '#e3e6ea']], cam: 'frame', grp: 1, lw: 2.4, bw: 1.4 },
    /* ---- ชุด 5+5 (9 พ.ย. 2026 ผู้ใช้: เพิ่มเคส iPhone 5 + Samsung 5 อันดับสูง) — ภาพตัวเลือกสีจากหน้าสินค้า ---- */
    '1074912136_27869120178': { t: 'THECASEBKK Mellow ซิลิโคน แม่เหล็ก', back: 'solid', cols: [['ขาว', '#ddd6c8', '#d6cfc0', '#c9c2b4', '', '#f2efe9'], ['ฟ้า', '#9fd3d6', '#94c9cc', '#86bcbf', '', '#7ad6dc'], ['เหลือง', '#f1e3a6', '#e9da9a', '#ddce8e', '', '#f6efcf'], ['ม่วง', '#c9bde0', '#bfb2d6', '#b3a6ca', '', '#e2daf0'], ['ชมพู', '#f0c3c7', '#e8b8bc', '#dcacb0', '', '#f8e2e4'], ['น้ำตาล', '#8a6f5a', '#7f6552', '#735a48', '', '#a88f7b']], mag: '#f2efe9', magF: 1, mw: 3.6, my: .44, tab: 1, cam: 'frame', lw: 2.4, bw: .6 },
    '1074912136_41612274805': { t: 'THECASEBKK Frost เคสใสฝ้า แม่เหล็ก', back: 'frost', cols: [['ฝ้าใส', '', '#e6e8eb', '', '', '#f4f4f4'], ['ดำ', '#3a3b3e', '#26272a', '#26272a', 'smoke', '#1c1c1e', { magC: 1 }]], mag: '#f4f4f4', magF: 1, mga: 40, mr: 23.5, mw: 4.4, tab: 1, tw: 4.4, tl: 15, cam: 'frame', lw: 2, bw: 1.2 },
    '1162604086_28680700375': { t: 'iStar เคสใสขอบดำ ขาตั้งเลนส์กล้อง', back: 'clear', cols: [['ขอบดำ', '', '#dfe3e8', '#1c1c1e', '', '#1c1c1e', { bump: '#1c1c1e' }], ['ขอบน้ำเงิน', '', '#dfe3e8', '#3f63b0', '', '#1f2f55', { bump: '#3f63b0' }]], mag: '#1c1c1e', magF: 1, mw: 4.6, tab: 1, cam: 'stand', bump: '#1c1c1e', bumpB: 1.4, bd: .55, bsw: 3.2, bw: 1.4, edge: 1 },
    '1599814134_48901789387': { t: 'TORRAS Ostand Q3Mono ซิลิโคน ห่วงขาตั้ง', back: 'solid', cols: [['ม่วง', '#b9a6cf', '#ae9ac6', '#ae9ac6', '', '', { ring: '#a893c2' }], ['ฟ้าสดใส', '#7fb3e6', '#74a8dc', '#74a8dc', '', '', { ring: '#6d9fd2' }], ['ขาวคลาวด์', '#ebe6dc', '#e2ddd2', '#e2ddd2', '', '', { ring: '#c8ad94' }], ['เหลือง', '#f1df8a', '#e8d57e', '#e8d57e', '', '', { ring: '#d9c46c' }], ['ส้มคอสมิก', '#e9874a', '#e07d40', '#e07d40', '', '', { ring: '#d27238' }], ['ฟ้าอ่อน', '#bcd3e6', '#b0c8dc', '#b0c8dc', '', '', { ring: '#a3bbd0' }], ['ชมพูออโรร่า', '#efc3cf', '#e6b7c4', '#e6b7c4', '', '', { ring: '#d9a7b5' }], ['ลาเวนเดอร์', '#cfc6e6', '#c4badc', '#c4badc', '', '', { ring: '#b6acd0' }], ['ดำอมน้ำเงิน', '#2b3140', '#242a38', '#242a38', '', '', { ring: '#3a4152' }], ['แดง', '#c43a3a', '#b83333', '#b83333', '', '', { ring: '#a82e2e' }]], ring: '#c8ad94', rgr: 21, mw: 5, stand: 1, cam: 'frame', grp: 1, lw: 3, bw: .6 },
    '1475631686_41217549726': { t: 'SHS CASE เคสใสขอบสี แม่เหล็ก', back: 'clear', cols: [['ดำ', '', '#2a2b2e', '#2a2b2e', '', '#8c8f94'], ['ขาว', '', '#eef0f2', '#eef0f2', '', '#d9dbde'], ['เขียว', '', '#c7d98a', '#c7d98a', '', '#cfdc96'], ['ชมพู', '', '#f1b9c8', '#f1b9c8', '', '#f3c3d0']], mag: '#8c8f94', magF: 1, mr: 21, mw: 2.4, my: .47, tab: 1, tw: 2.4, tl: 14, cam: 'frame', lw: 2.4, bw: 2.4, bump: 1, edge: 1 },
    '44675290_24138656862': { t: 'rock space เคสใส แม่เหล็ก (S26 Ultra)', back: 'clear', cols: [['ใส แม่เหล็ก', '', '#dfe3e8', '', '', '#f4f4f4'], ['ใส', '', '#dfe3e8', '', '', 'none']], mag: '#f4f4f4', magF: 1, mr: 23, mw: 4.4, tab: 1, tl: 13, cam: 'frame', grp: 1, lw: 2.4, bw: 1.5, bump: 1, bumpB: 1.6 },
    '88485390_26623467990': { t: 'Nillkin Frosted Shield Pro แม่เหล็ก', back: 'solid', cols: [['ดำ', '#3a3b3d', '#2a2b2e', '', '', '#1e1f21'], ['ดำใส', '#6b6d70', '#2a2b2e', '', 'frost', '#2e2f32']], mag: '#1e1f21', magF: 1, mr: 25, mw: 5.5, my: .55, cam: 'frame', grp: 1, lw: 2, bw: 1.2 },
    '1468236883_41164267939': { t: 'Lereach เคสฝ้า แม่เหล็ก ขาตั้งพับ', back: 'smoke', fa: .7, cols: [['ดำ', '#3a3b3e', '#1c1c1e', '', '', '#2a2b2e'], ['เทา', '#9a9ca0', '#6a6c70', '', 'frost', '#a7a9ad'], ['น้ำเงิน', '#4a6a9a', '#34507e', '', 'frost', '#34507e']], mag: '#2a2b2e', magF: 1, mr: 23.6, mw: 5.5, my: .52, tab: 1, tw: 5, tl: 12, tg: 4.5, inset: { p: [[.08, .897], [.27, .897], [.27, .876], [.88, .876], [.88, .897], [.92, .897], [.92, .972], [.08, .972]], hg: [.165, .975, .215, .89] },   /* รอบ 5 (ผู้ใช้ทัก: วงต้องหนา · ขาตั้งต้องเป็นแผ่นฝังที่ง้างเปิดได้): วงหนา 5.5 Ø นอก .66W · แถบใต้วง 5×12 · ขาตั้งปิด = แผ่นเรียบเสมอหลังเคส มีร่องรอบ (ขอบบนยกเป็นขั้น .27–.88W) + บานพับโลหะเฉียงซ้าย — วัดจากภาพหลังตรงครอปชิด [.529,.251,.838,.905] */   /* GSNAP ภาพร้านหลังตรง (L2) 9 พ.ย.: วงกลาง .52h Ø .66W หนา ~3 · แถบใต้วง .73–.83h (ครอปชิดเคสรอบ 2) · แผ่นขาตั้งพับ .11–.89W × .87–.98h บานพับโลหะซ้าย */ cam: 'frame', grp: 1, lw: 2.2, bw: 2, bump: 1 },
    '1162604086_28825705420': { t: 'iStar เคสใส แม่เหล็ก (Samsung)', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#f4f4f4'], ['ขอบดำ', '', '#1c1c1e', '#1c1c1e', '', '#1c1c1e']], mag: '#f4f4f4', magF: 1, mr: 24, mw: 6, tab: 1, tw: 5.5, tl: 16, cam: 'frame', grp: 1, lw: 2.2, bw: 1.5, bump: 1 },
    '1578777741_29639139166': { t: 'เคสตาข่ายระบายความร้อน แม่เหล็ก ขาตั้ง', back: 'solid', cols: [['ดำ', '#2a2b2e', '#1f2023'], ['ฟ้า', '#8fb5dc', '#83a9d0'], ['ไทเทเนียมเทา', '#8e8f91', '#828385'], ['ใส', '', '#e0e3e7', '', 'clear', '#f4f4f4'], ['ซากุระ', '#f0c6cf', '#e6bac4'], ['ม่วง', '#b9a8d6', '#ae9ccc']], perf: { p: 2.4, r: .8 }, mag: 'faint', mfd: .16, mw: 1.4, magF: 1, fold: [.84, .955, .2, 0, '#8e9196'], cam: 'frame', grp: 1, lw: 2.4, bw: 1 },
    /* ---- ชุด 10 รอบ 2 (9 พ.ย. 2026 ผู้ใช้: ทำเคสเพิ่มอีก 10) — ภาพตัวเลือกสีจากหน้าสินค้า ---- */
    '1162604086_28061435282': { t: 'iStar DUO เคสใส แม่เหล็ก ขอบกล้องอลูมิเนียม', back: 'clear', cols: [['ขอบใส', '', '#dfe3e8', '#c9ccd1', '', '#f4f4f4'], ['ขอบดำ', '', '#1c1c1e', '#1c1c1e', '', '#1c1c1e']], mag: '#f4f4f4', magF: 1, mw: 4.4, tab: 1, cam: 'frame', lw: 2.2, bw: 1.4, bump: 1, edge: 1 },
    '1162604086_45653598449': { t: 'iStar เคสใส กันกระแทก 1.5 เมตร', back: 'clear', cols: [['ใส แม่เหล็ก', '', '#dfe3e8', '', '', '#f4f4f4'], ['ใส ไม่มีแม่เหล็ก', '', '#dfe3e8', '', '', 'none']], mag: '#f4f4f4', magF: 1, mw: 4, tab: 1, cam: 'frame', lw: 2, bw: 1.4, bump: 1, bumpB: 1.6 },
    '1682099834_46302370443': { t: 'เคสใสมินิมอล แม่เหล็กวงฟ้า ครอบกล้องใส', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#c9dbea']], mag: '#c9dbea', magF: 1, mw: 5, cam: 'island', cover: 'clear', bw: 1.6, bump: 1, bumpB: 1.6 },
    '1224730044_42118153668': { t: 'เคสใส ขาตั้งกล้องโลหะ แม่เหล็ก มุมสี', back: 'clear', cols: [['ดำ', '', '#dfe3e8', '#1c1c1e', '', '#1c1c1e', { bump: '#1c1c1e' }], ['ฟ้า', '', '#dfe3e8', '#7fa8d8', '', '#7fa8d8', { bump: '#7fa8d8' }], ['เทา', '', '#dfe3e8', '#8e9196', '', '#8e9196', { bump: '#8e9196' }], ['ม่วง', '', '#dfe3e8', '#b07fb8', '', '#b07fb8', { bump: '#b07fb8' }], ['ไทเทเนียมทะเลทราย', '', '#dfe3e8', '#c8b29a', '', '#c8b29a', { bump: '#c8b29a' }]], mag: '#1c1c1e', magF: 1, mw: 4.6, tab: 1, cam: 'stand', bump: '#1c1c1e', bumpB: 1.4, bd: .45, bsw: 2.6, bw: 1.4 },
    '545639692_45355877110': { t: 'NEUGA เคสใสกริ๊ง แม่เหล็ก', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#f4f4f4']], mag: '#f4f4f4', magF: 1, mw: 4.4, tab: 1, cam: 'island', cover: 'clear', bw: 1.8, bump: 1 },
    '135096481_29455806757': { t: 'BKWHALE เคสฝ้าเทา แม่เหล็ก (Samsung)', back: 'frost', fa: .7, cols: [['ดำ', '#4a4c50', '#2a2b2e', '', '', '#5c5e62']], mag: '#5c5e62', magF: 1, mw: 3.6, tab: 1, cam: 'frame', grp: 1, lw: 2, bw: 1.6 },
    '1364681040_28233783079': { t: 'เคสเกราะ ขาตั้งพับ แม่เหล็ก ขอบยาง', back: 'solid', tex: 1, cols: [['ดำ', '#2a2b2e', '#1c1c1e'], ['น้ำเงิน', '#2f6fae', '#1c1c1e'], ['เทา', '#8a8d92', '#1c1c1e']], mag: 'faint', mfd: .16, magF: 1, mw: 3, rug: 1, fold: [.6, .9, .34, 0, '#1c1c1e'], cam: 'frame', grp: 1, lw: 2.6, bw: 2.4, bump: 1, bumpB: 1.8, edge: 1 },
    '29498242_29124217450': { t: 'Focus เคสใส Crystal Clear / Crystal Pro แม่เหล็ก', back: 'clear', cols: [['Crystal Clear', '', '#dfe3e8', '', '', 'none'], ['Crystal Pro แม่เหล็ก', '', '#dfe3e8', '', '', '#f4f4f4']], mag: '#f4f4f4', magF: 1, mw: 4, tab: 1, cam: 'frame', grp: 1, lw: 2.2, bw: 1.4, bump: 1 },
    '222984146_50354135584': { t: 'เคส TPU พาสเทล แม่เหล็ก (Samsung A)', back: 'solid', cols: [['เทาเข้ม', '#5d5f63', '#55575b', '#4a4c50', '', '#7b7d81'], ['ชมพูนู้ด', '#e3c9bf', '#dcc0b5', '#d2b5aa', '', '#efe0da'], ['ฟ้าเทา', '#8fa3bf', '#869ab6', '#7a8eaa', '', '#aebcd0'], ['ขาว', '#eceae6', '#e4e2de', '#d8d6d2', '', '#f8f7f5']], mag: '#7b7d81', magF: 1, mw: 3, tab: 1, cam: 'frame', grp: 1, lw: 2.4, bw: .6 },
    /* ---- CaseClub เคสกระจกลายศิลปิน ฿470–1,421 (13 พ.ย. 2026 ผู้ใช้: "ทำเคสลาย ๆ มากขึ้น เน้นเคสแพง") — ภาพหลักร้านเป็นเรนเดอร์หลังตรงพื้นขาว 2 เคสเรียงกัน
       กรอบจากพิกเซล (SEG: คอลัมน์ที่ไม่ใช่พื้นขาว · สูง/กว้าง 2.0–2.1) · ช่องกล้องของเคสเปิดเต็มแถบบน → cut ที่ขอบล่างกรอบช่อง (17 Pro Max ~.31 · Air ~.23) ---- */
    '1382380664_43965509891': { t: 'CaseClub Rally Movement ลายตัวอักษร', back: 'solid', cols: [
      ['ดำ อักษรครีม', '#1d1b1a', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zto-msnwa44jjcaq8d', [.0703, .1719, .3906, .8252], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }],
      ['ครีม อักษรดำ', '#f3efe2', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zto-msnwa44jjcaq8d', [.4219, .1738, .7393, .8271], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_26138334979': { t: 'CaseClub Rally อักษรโค้ง กระจกเงา', back: 'solid', cols: [
      ['ครีม ดำ ขอบดำ', '#efe9dc', '#232325', '', '', '', { shot: R4('th-11134207-81ztm-mgau29l2a5fv66', [.1006, .167, .4287, .8271], { cut: .32, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }],
      ['ครีม เงินกระจก', '#e8e6e0', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztm-mgau29l2a5fv66', [.4551, .1641, .7822, .8262], { cut: .23, fill: 'mirror', tp2: [[.74, .08, 1, .232, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_29943058518': { t: 'CaseClub Rally Blush Bloom ดอกไม้ลายจุด', back: 'solid', cols: [
      ['ชมพู ดอกเงิน ขอบใส', '#f2d6d6', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztl-mg4x1pvdo4y52b', [.0615, .1797, .3955, .8604], { cut: .31, fill: 'auto' }) }],
      ['ชมพู ดอกดำ ขอบดำ', '#f2d6d6', '#232325', '', '', '', { shot: R4('th-11134207-81ztl-mg4x1pvdo4y52b', [.4424, .1807, .7764, .8604], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_42524648454': { t: 'CaseClub Rally RM Dot ลายจุด', back: 'solid', cols: [
      ['เงิน จุดดำ', '#d9d9db', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztp-mq61qu25lclpbd', [.0612, .18, .3962, .8612], { cut: .3, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42], [.42, .15, .72, .318, 0, .42]] }) }],
      ['ดำ จุดขาว', '#141414', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztp-mq61qu25lclpbd', [.435, .1737, .7762, .8612], { cut: .3, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42], [.42, .15, .72, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_42774649150': { t: 'CaseClub Rally Cocoa Movement', back: 'solid', cols: [
      ['น้ำตาล อักษรครีม', '#3b2416', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztn-mg4x03p18phl09', [.0615, .1797, .3955, .8604], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }],
      ['น้ำตาล อักษรเงิน ขอบดำ', '#3b2416', '#232325', '', '', '', { shot: R4('th-11134207-81ztn-mg4x03p18phl09', [.4424, .1807, .7764, .8604], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_24946871447': { t: 'CaseClub maison KEEPS The Imbalance', back: 'solid', cols: [
      ['ดำ', '#0f0f10', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztq-mewp9h9466tid9', [.457, .1611, .7793, .8359], { cut: .23, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_41474653467': { t: 'CaseClub Rally Strawberry Check ลายตาราง', back: 'solid', cols: [
      ['ขาวแดง ขอบใส', '#f4e9e9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztq-mg4x2eaidy4r3d', [.0615, .1797, .3955, .8604], { cut: 0, tpHard: 1, tp: [[0, 0, .33, .33, .6683, .3244], [.33, 0, .71, .33, .2228, .6488], [.71, 0, 1, .33, 0, .3244]] }) }],
      ['แดงดำ ขอบดำ', '#7a1a26', '#232325', '', '', '', { shot: R4('th-11134207-81ztq-mg4x2eaidy4r3d', [.4424, .1807, .7764, .8604], { cut: 0, tpHard: 1, tp: [[0, 0, .33, .33, .6683, .3244], [.33, 0, .71, .33, .2228, .6488], [.71, 0, 1, .33, 0, .3244]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_41667523362': { t: 'CaseClub Purple & Green Wavy ลายคลื่น', back: 'solid', cols: [
      ['เขียวม่วง', '#0f4a2c', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztn-mertmsrlee4i39', [.1113, .1631, .4404, .8369], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_26239176602': { t: 'CaseClub Rally Silver lining กระจกเงา (Samsung)', back: 'solid', cols: [
      ['ครีม เงินกระจก', '#e9e5da', '#232325', '', '', '', { shot: R4('th-11134207-7ra0m-mclxix51gb9c6d', [.5, .1807, .8457, .8711], { cut: .32, cx: .42, fill: 'mirror' }) }]], cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },
    /* ภาพโปรโมชัน (เคสเล็กซ้าย + ป้ายขวา) → SEG เฉพาะ x < .6 */
    '1382380664_52107239644': { t: 'CaseClub HOMEBOY SIDEKICK CREW สติกเกอร์', toon: 1, back: 'solid', cols: [
      ['เทากระจก ขอบดำ', '#5a5c60', '#232325', '', '', '', { shot: R4('th-11134207-81zti-mv5znlv2b11gf1', [.0314, .3214, .28, .8243], { cut: .31, fill: 'auto' }) }],
      ['เงินกระจก ขอบใส', '#d4d6d9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zti-mv5znlv2b11gf1', [.3014, .3214, .5486, .8229], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_46761730439': { t: 'CaseClub maison KEEPS Adore Patch หัวใจ', back: 'solid', cols: [
      ['เงินกระจก ขอบใส', '#d4d6d9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zte-mv6wi3ggmh3d33', [.0229, .2929, .2757, .81], { cut: .31, fill: 'auto' }) }],
      ['ดำไล่เงิน ขอบดำ', '#1a1a1b', '#232325', '', '', '', { shot: R4('th-11134207-81zte-mv6wi3ggmh3d33', [.2914, .2914, .5486, .8114], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_26738291457': { t: 'CaseClub maison KEEPS กระจกเงา', back: 'solid', cols: [
      ['เงินกระจก ขอบใส', '#d4d6d9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztm-mv5pxweabz0jb7', [.0343, .31, .2771, .8043], { cut: .31, fill: 'auto' }) }],
      ['ดำกระจก ขอบดำ', '#1c1c1e', '#232325', '', '', '', { shot: R4('th-11134207-81ztm-mv5pxweabz0jb7', [.2914, .3071, .5386, .8114], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    /* ---- CaseClub ชุด 2 (13 พ.ย. 2026 ผู้ใช้: "ทำต่ออีกชุด") — "เคสใส" ของร้าน = ขอบ TPU ใส + หลังพิมพ์ทึบ (ข้ามลายที่พิมพ์บนใสจนเห็นเครื่อง: Ghost / Jelly Bear / Dino ใส)
       เติมช่องกล้อง: พื้นเรียบ → สีที่วัดจากแผ่น (median 12×12 ใต้ cut) · ลายทั่วแผ่น → mirror + tp2 กันโลโก้ · ลายทาง/ตาราง → tp + tpHard เลื่อนจำนวนเต็มคาบ (ปรับเฟสด้วย correlation) ---- */
    '1382380664_42730403763': { t: 'CaseClub AKKARA ป้ายระวังวัตถุวีนไว', back: 'solid', cols: [
      ['ดำ ป้ายเหลือง', '#090909', '#232325', '', '', '', { shot: R4('sg-11134275-820ly-mnfjdipjng20d8', [.305, .1074, .6939, .8926], { cut: .31, fill: '#090909' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_29094977187': { t: 'CaseClub maison KEEPS Adore Stripe ลายทางหัวใจ', back: 'solid', cols: [   /* ลายทางคาบ 5 มม. หัวใจ .50–.75h → ปะแถบบนจากแถว .78–.97 สองช่วง */
      ['แดงขาว หัวใจดำ ขอบดำ', '#f3e3e3', '#232325', '', '', '', { shot: R4('th-11134207-81ztf-mv5zvhdsfsw48c', [.0214, .2943, .2786, .81], { cut: 0, tpHard: 1, tp: [[0, 0, 1, .165, 0, .7998], [0, .165, 1, .33, 0, .6173]] }) }],
      ['แดงขาว หัวใจเงิน ขอบใส', '#f3e3e3', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztf-mv5zvhdsfsw48c', [.2929, .2929, .55, .8086], { cut: 0, tpHard: 1, tp: [[0, 0, 1, .165, 0, .8021], [0, .165, 1, .33, 0, .6189]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_24897141488': { t: 'CaseClub ARI Bold Mode', back: 'solid', cols: [
      ['ดำ อักษรขาว', '#0e0e0f', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztp-mv6xsygoomiv71', [.0171, .3014, .2786, .8357], { cut: .31, fill: '#060709' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_57051113867': { t: 'CaseClub Chonni Beach', toon: 1, back: 'solid', cols: [
      ['เหลือง ทะเล', '#f4dc6a', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztm-mgwg5nz0kykv11', [.1123, .1641, .4385, .8301], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_56250846487': { t: 'CaseClub Fluffy Bunny Universe', toon: 1, back: 'solid', cols: [
      ['ฟ้ากลางคืน', '#40475a', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztm-mgolwz2td3ih0b', [.1123, .1563, .4482, .8428], { cut: .31, fill: '#40475a' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_42317965058': { t: 'CaseClub Blue & Brown Stripes ลายตาราง', back: 'solid', cols: [   /* ตารางคาบ ~19.5 มม. */
      ['น้ำตาล เส้นฟ้า', '#7b6658', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztp-metnf1ghd150e9', [.1328, .1621, .4639, .8369], { cut: 0, tpHard: 1, tp: [[0, 0, 1, .33, 0, .4747]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_40765190011': { t: 'CaseClub Rally Varsity MOVEMENT', back: 'solid', cols: [
      ['ดำ', '#111112', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztd-mv6x30i98idh30', [.0314, .31, .2729, .8057], { cut: .31, fill: '#000000' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_44218113520': { t: 'CaseClub maison KEEPS The Chemistry', back: 'solid', cols: [
      ['ชมพู', '#d9b3c2', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zte-mv6xo4mkgyrr7c', [.0271, .3086, .2786, .8229], { cut: .31, fill: '#d9b3c2' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_44467361182': { t: 'CaseClub maison KEEPS The Pacific', back: 'solid', cols: [
      ['ครีม แถบดำ', '#fffef9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztn-mv6xahs354avf7', [.3014, .3171, .5386, .7986], { cut: .24, fill: '#fffef9' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_43865516273': { t: 'CaseClub The RM R&M', toon: 1, back: 'solid', cols: [
      ['ครีมดำ', '#eae3c9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztq-memf8ehpvmdg50', [.1084, .1621, .4385, .8359], { cut: .31, fill: '#eae3c9' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_42715560798': { t: 'CaseClub Multi Dino', toon: 1, back: 'solid', cols: [
      ['ส้ม', '#ec8b58', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztp-mewlxpjrgy691c', [.1338, .1621, .4629, .8359], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_27641264262': { t: 'CaseClub Join The Club Westie', toon: 1, back: 'solid', cols: [
      ['น้ำตาลอ่อน', '#d1af72', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zti-mee9o7y27rba01', [.1484, .1504, .4863, .8467], { cut: .23, fill: '#d1af72' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    /* ---- เคสประจำสัปดาห์ 9–15 พ.ย. (13 พ.ย. 2026 ผู้ใช้: "เลือกจากเคสประจำสัปดาห์นี้มาทำ") — หน้า ranking.html?sort=daily 36 แบบ ทำได้ 7 + alias 2
       ข้าม: ลายพิมพ์บนเคสใส (Toothpaste, Multiple cats, PaoPao) · ลิขสิทธิ์ (Dragons/เขี้ยวกุด, มอนจิจิ) · Wishwindy ทุกชิ้น + CaseClub บางลิงก์ไม่มีรุ่นใน maybe (ไม่ขึ้นหน้าลองทาบ) · ภาพฉากถ่ายจริง HOMEBOY ORIGINAL ---- */
    '358092746_54850573627': { t: 'WUJU เคสกระจกด้าน ฝาครอบกล้องแบบ 17 Pro แม่เหล็ก', back: 'smoke', fa: .85, cols: [
      ['ดำ', '#1c1c1e', '#2a2a2c', '#2b2c2f', '', '#6b6d72'],
      ['ส้ม', '#f07a2a', '#f08a3a', '#f58a3c', 'frost', '#f6b07a']], mag: '#6b6d72', magF: 1, mw: 1.4, my: .54, br: 'iphone', cov: .25, cam: 'island', lr: 'edge', bw: 1.2 },   /* ภาพหลักร้าน (เรนเดอร์เอียง): หลังกระจกฝ้า วงแม่เหล็กเส้นบาง · ฝาครอบกล้องเต็มแถบบนแบบ 17 Pro ("กลายเป็น 17 series") */
    '1382380664_40072085194': { t: 'CaseClub maison KEEPS The Imbalance ขอบสี แม่เหล็ก', back: 'solid', cols: [
      ['ดำ ขอบชมพู', '#0f0f10', '#f0b8c4', '', '', '', { shot: R4('th-11134207-81ztj-mv6xj8m4a2o277', [.0357, .3171, .2743, .8], { cut: .31, fill: '#0f0f10' }) }],
      ['ดำ ขอบดำ', '#0f0f10', '#232325', '', '', '', { shot: R4('th-11134207-81ztj-mv6xj8m4a2o277', [.3014, .3157, .5386, .8], { cut: .31, fill: '#0f0f10' }) }]], cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_29292062126': { t: 'CaseClub ARI Bold Mode ขอบสี แม่เหล็ก', back: 'solid', cols: [
      ['ดำ ขอบชมพู', '#0e0e0f', '#f0b8c4', '', '', '', { shot: R4('th-11134207-81ztm-mv6xrot5gxs1a6', [.0229, .3086, .2743, .8271], { cut: .31, fill: '#060709' }) }],
      ['ดำ ขอบใส', '#0e0e0f', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztm-mv6xrot5gxs1a6', [.2943, .31, .5471, .8243], { cut: .31, fill: '#060709' }) }]], cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_56551053478': { t: 'CaseClub Ghost Club Perfect Pair', toon: 1, back: 'solid', cols: [
      ['ม่วง', '#9a83c4', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztl-mgusm6blmakv13', [.1123, .1641, .4385, .8301], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_40058987647': { t: 'CaseClub Flower Duck Pattern ลายเป็ด', toon: 1, back: 'solid', cols: [
      ['เขียว', '#2fae7c', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztf-mevmg2vkrchwf4', [.1006, .1641, .4326, .8408], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_58150729445': { t: 'CaseClub Skiing Pig หมูน้อยตะลุยหิมะ', toon: 1, back: 'solid', cols: [
      ['ดำ', '#0d0d0e', '#232325', '', '', '', { shot: R4('th-11134207-81zti-mglw67q7l4ax52', [.1074, .1611, .4434, .8379], { cut: .31, fill: 'auto' }) }],
      ['เงินกระจก', '#d4d6d9', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zti-mglw67q7l4ax52', [.4531, .1611, .7861, .8369], { cut: .23, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_24047313901': { t: 'CaseClub LANDMEE Club หัวใจ', back: 'solid', cols: [   /* ลายตัวอักษรทั่วแผ่น: shift (ไม่กลับหัว) + tp2 กันโลโก้ที่ถูกยกขึ้นมุมขวาบน */
      ['ดำไล่เงิน', '#2a2a2c', '#232325', '', '', '', { shot: R4('th-11134207-81ztg-mg8zh29nsowa9f', [.1113, .165, .4434, .835], { cut: .31, fill: 'shift', tp2: [[.74, 0, 1, .12, 0, .5]] }) }],
      ['เงินกระจก ม่วง', '#dcdde2', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztg-mg8zh29nsowa9f', [.4541, .165, .7832, .834], { cut: .23, fill: 'shift', tp2: [[.74, 0, 1, .12, 0, .5]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_26691154832': { t: 'CaseClub Swimming Golden Retriever', toon: 1, back: 'solid', cols: [
      ['ฟ้าน้ำ', '#7cc6e6', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztp-mh511szcz5sa11', [.1055, .1621, .4355, .8359], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    /* ---- เคสประจำสัปดาห์ รอบ 2 (13 พ.ย. 2026 ผู้ใช้: "สร้างเคสประจำสัปดาห์เพิ่ม") — ภาพหลักเรนเดอร์พื้นขาว กรอบจาก SEG
       ข้าม: ลายพิมพ์บนเคสใสที่เห็นสีเครื่อง (Mr.Punky, Orange&Black Cat, Brown Dachshund, Space Corgi, Mood of Ghost, Metallic Butterfly, Salmon Cat, Chonni Living Room, HOMEBOY Samsung ใส) ---- */
    '1382380664_57750856987': { t: 'CaseClub Fluffy Bunny Reading Club', toon: 1, back: 'solid', cols: [
      ['ฟ้า ขอบใส', '#45b9d0', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztq-mgoxkdj190jw73', [.1045, .1602, .4385, .8369], { cut: .31, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42]] }) }],
      ['ฟ้า ขอบดำ', '#45b9d0', '#232325', '', '', '', { shot: R4('th-11134207-81ztq-mgoxkdj190jw73', [.4492, .165, .7842, .8418], { cut: .23, fill: 'mirror', tp2: [[.74, .08, 1, .232, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_44074630103': { t: 'CaseClub Rally Blush Bloom ดอกน้ำตาล แม่เหล็ก', back: 'solid', cols: [
      ['ชมพู ดอกน้ำตาล ขอบใส', '#f2d6d6', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zte-mfxfj1uj5n9m42', [.1006, .1787, .4121, .8203], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_42824285149': { t: 'CaseClub Rally RM Dot ครีม จุดดำ', back: 'solid', cols: [
      ['ครีม จุดดำ', '#f3efe2', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztn-mfuuqtms9t6x0d', [.0781, .1787, .3916, .8203], { cut: .3, fill: 'mirror', tp2: [[.74, .15, 1, .318, 0, .42], [.42, .15, .72, .318, 0, .42]] }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_27436853930': { t: 'CaseClub The RM พลังหญิง', toon: 1, back: 'solid', cols: [
      ['ครีม ดำ', '#efe6d2', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztn-mv5pjnabdbt433', [.0229, .3071, .2743, .8243], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1382380664_27839150921': { t: 'CaseClub Alien Dogs กระจกเงา (Samsung)', toon: 1, back: 'solid', cols: [
      ['เงินกระจก ขอบดำ', '#cfd2d6', '#232325', '', '', '', { shot: R4('th-11134207-7ra0s-mclmluhx5yli7c', [.5, .1807, .8457, .8711], { cut: .32, cx: .42, fill: 'auto' }) }]], cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },
    '1382380664_44172608699': { t: 'CaseClub ARI Energy กระจกเงา (Samsung)', back: 'solid', cols: [
      ['เงินกระจก ขอบดำ', '#d4d6d9', '#232325', '', '', '', { shot: R4('sg-11134275-824hi-mfc4y060hs0e4f', [.2818, .0727, .7091, .9255], { cut: .32, cx: .42, fill: 'mirror' }) }]], cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },
    '1382380664_56456299605': { t: 'CaseClub Electric Zigzag (Samsung)', back: 'solid', cols: [
      ['เขียว ขอบดำ', '#8fa07a', '#232325', '', '', '', { shot: R4('th-11134207-81ztq-mkyy18b0ledca8', [.1484, .1592, .4902, .8408], { cut: .33, cx: .42, fill: 'mirror' }) }]], cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },
    '1382380664_54256556676': { t: 'CaseClub Join The Club Dachshund (Samsung)', toon: 1, back: 'solid', cols: [
      ['ฟ้า ขอบใส', '#7fa3bf', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81zte-ml8ma0rnyqytf3', [.167, .1611, .4932, .8379], { cut: .33, cx: .42, fill: 'auto' }) }]], cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },
    '1382380664_55859548995': { t: 'CaseClub AKKARA ป้ายระวังวัตถุวีนไว เงินกระจก (Samsung)', back: 'solid', cols: [
      ['เงินกระจก ป้ายเหลือง', '#d4d6d9', '#232325', '', '', '', { shot: R4('sg-11134275-820mw-mnfni6gxh0xx5d', [.305, .1074, .6917, .8894], { cut: .32, cx: .42, fill: 'auto' }) }]], cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },
    /* CaseClub ลายพิมพ์บนเคสใส (ผู้ใช้: "ทำ caseclub ด้วยสิ") — ลบพื้นเครื่องในภาพด้วย key แล้วเห็นเครื่องผู้ใช้ผ่านเคส · iPhone ใช้เคสบนเครื่องส้ม (ลายไม่มีส้ม) หรือบน Air ฟ้า (ลายส้ม/น้ำตาล)
       Samsung ใช้เคสบนเครื่องม่วง/เข้มด้านซ้าย · ไม่ใช้ ks (ลบลายขาว/ดำทิ้ง) · วงแม่เหล็กใช้ของในภาพ (kr) */
    '1382380664_43551925681': { t: 'CaseClub Mr.Punky Tote ใส แม่เหล็ก', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81zth-meofy5x2dsld8b', [.1104, .1621, .4385, .8359], { cut: .31, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_28488426678': { t: 'CaseClub Orange & Black Cat ใส แม่เหล็ก', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81ztm-meog8xjg2e4ja8', [.4629, .1621, .7832, .8369], { cut: .23, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_41507453656': { t: 'CaseClub Brown Dachshund ใส แม่เหล็ก', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81ztc-meoffy0ulh4x1b', [.4619, .1621, .7822, .8369], { cut: .23, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_57601053304': { t: 'CaseClub Mood of Ghost Club ใส แม่เหล็ก', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81ztc-mgus93hsxssu04', [.1133, .1641, .4385, .8301], { cut: .31, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_27938305422': { t: 'CaseClub Space Corgi ใส แม่เหล็ก', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81ztd-mv6x8yibyb5z3d', [.0357, .3386, .2614, .8014], { cut: .31, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_58156534751': { t: 'CaseClub Metallic Butterfly ใส แม่เหล็ก (Samsung)', back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81ztd-ml7wvn6gcidg9c', [.1602, .1611, .4824, .8369], { cut: .32, cx: .42, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', grp: 1, lw: 2.4, bw: 1.4 },
    '1382380664_56306650554': { t: 'CaseClub Salmon Cat Mantra ใส แม่เหล็ก (Samsung)', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81zto-mlbzlo8i2kun87', [.1611, .1611, .4834, .8369], { cut: .32, cx: .42, fill: 'clear', key: [.1, .7], kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', grp: 1, lw: 2.4, bw: 1.4 },
    '1382380664_57856646415': { t: 'CaseClub Chonni Living Room ใส แม่เหล็ก (Samsung)', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81ztd-mlbv74trvite0b', [.1504, .1611, .4746, .8369], { cut: .32, cx: .42, fill: 'clear', key: [.08, .45], kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', grp: 1, lw: 2.4, bw: 1.4 },
    '1382380664_54707250530': { t: 'CaseClub HOMEBOY SIDEKICK CREW ใส แม่เหล็ก (Samsung)', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '#f4f4f4', { shot: R4('th-11134207-81zte-mlusx8l4vcb3d2', [.168, .1621, .4971, .8369], { cut: .32, cx: .42, fill: 'clear', key: 'auto', kr: 1 }) }]], mag: '#f4f4f4', magF: 1, mw: 4.4, cam: 'frame', grp: 1, lw: 2.4, bw: 1.4 },
    /* ลายลิขสิทธิ์/รุ่นจาก fetch_options (ผู้ใช้: "ข้ามเรื่องลิขสิทธิ์ ทำได้เลย") — ข้ามมอนจิจิ (ภาพร้านถ่ายเอียงซ้อน 4 เคส) · Dragons/Join The Club 18 Pro (ภาพรวมหลายลายเล็ก ๆ) */
    '1382380664_42650185307': { t: 'CaseClub Kakao Quote Apeach ใส', toon: 1, back: 'clear', cols: [
      ['ใส', '', '#dfe3e8', '', '', '', { shot: R4('th-11134207-7ras8-m9yc0awx4g6m3d', [.334, .1943, .665, .8691], { cut: .31, fill: 'clear', key: 'auto', kd: 16 }) }]], cam: 'frame', lw: 2.2, bw: 1.4 },
    '1382380664_56456310500': { t: 'CaseClub Not So Innocent กุหลาบแดง', back: 'solid', cols: [
      ['ขาว', '#f2f2f2', '#dfe3e8', '', '', '', { shot: R4('th-11134207-81ztn-mkytnbvyipkya2', [.1094, .1592, .4414, .8359], { cut: .31, fill: 'auto' }) }],
      ['ดำ', '#0d0d0e', '#232325', '', '', '', { shot: R4('th-11134207-81ztn-mkytnbvyipkya2', [.457, .1611, .7939, .8379], { cut: .23, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1078150579_29941361397': { t: 'เคสซิลิโคนลายคลื่น ชมพู', back: 'solid', cols: [
      ['ชมพู', '#e9b9c8', '#e3aec0', '', '', '', { shot: R4('cn-11134207-820l4-mmb6cxnv11c06c', [.2787, .0537, .7275, .9625], { cut: .3, fill: 'auto' }) }]], cam: 'frame', lw: 2.6, bw: 1.6, bump: 1 },
    /* Wishwindy (รุ่นจาก fetch_options 13 พ.ย. — เดิม maybe ว่าง) · ภาพหลักเรนเดอร์หลังตรง ช่องกล้องเปิดเต็มแถบบน · กรอบจากขอบเคสในแถวพิกเซล (ลายสีอ่อนทำให้ SEG พื้นขาวเพี้ยน)
       ข้าม Playful Paradise (ร้านไม่มีตัวเลือกรุ่น) */
    '1188867011_55612602711': { t: 'Wishwindy iLV Crush หัวใจ', toon: 1, back: 'solid', cols: [
      ['Pink Crush ขอบเงิน', '#fbeef2', '#d4d6d9', '', '', '', { shot: R4('th-11134207-81zti-mprtnmfycirkdc', [.0391, .252, .3096, .802], { cut: .31, fill: 'mirror' }) }],
      ['Candy Hearts ขอบเงิน', '#fbf3f3', '#d4d6d9', '', '', '', { shot: R4('th-11134207-81zti-mprtnmfycirkdc', [.335, .252, .6055, .802], { cut: .31, fill: 'mirror' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1188867011_28625578890': { t: 'Wishwindy Bow Beau โบว์ชมพู', back: 'solid', cols: [
      ['ชมพู ขอบดำ', '#f6dfe2', '#1c1c1e', '', '', '', { shot: R4('th-11134207-81ztl-mp7wsq04faq35d', [.165, .1543, .4905, .8195], { cut: .31, fill: 'mirror' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1188867011_51669026303': { t: 'Wishwindy Sweetie Meow แมวขาว', toon: 1, back: 'solid', cols: [
      ['ขอบเงิน', '#f7f5f3', '#d4d6d9', '', '', '', { shot: R4('th-11134207-81ztk-mu4senkvm4n777', [.0449, .2627, .3105, .807], { cut: .3, fill: 'auto' }) }],
      ['ขอบดำ', '#f7f5f3', '#1c1c1e', '', '', '', { shot: R4('th-11134207-81ztk-mu4senkvm4n777', [.335, .2627, .6006, .807], { cut: .3, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1188867011_28966396897': { t: 'Wishwindy Bunny Pink A good day', toon: 1, back: 'solid', cols: [
      ['ขาวชมพู ขอบดำ', '#fbf4f5', '#1c1c1e', '', '', '', { shot: R4('th-11134207-81ztl-mp7xcefxw0lrff', [.165, .1543, .4905, .8195], { cut: .31, fill: 'auto' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    '1188867011_45900986834': { t: 'Wishwindy Teddy Christmas Wish', toon: 1, back: 'solid', cols: [
      ['ครีม ขอบดำ', '#f6f1e6', '#1c1c1e', '', '', '', { shot: R4('th-11134207-81ztg-mp7xli878lxc5d', [.165, .1543, .4905, .8195], { cut: .31, fill: 'mirror' }) }]], cam: 'frame', lw: 2.2, bw: 1.2 },
    /* ---- ชุด 13 พ.ย. 2026 (ผู้ใช้: "ทำเคสทาบเพิ่ม") — ขายดีที่ยังไม่มี LOOK · วัดจากภาพหลักของร้าน (ไม่มีภาพตัวเลือกสี) ---- */
    '799297352_40511869497': { t: 'เคสดำด้าน แม่เหล็ก ขอบเลนส์นูน (Samsung)', back: 'solid', cols: [['ดำ', '#2c2d30', '#1f2023', '#1f2023', '', '#19191b']], mag: '#19191b', magF: 1, mw: 5, tab: 1, tl: 12, cam: 'frame', lw: 2.4, bw: 1.2 },   /* ภาพร้านถือแนวนอน (กล้องอยู่ขวา) — แถบสั้นใต้วง · เลนส์นูนรายตัว */
    '333807292_29962101246': { t: 'เคสใส แม่เหล็กวงขาว ขอบกล้องใส', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#f4f4f4']], mag: '#f4f4f4', magF: 1, my: .44, mw: 5.5, tab: 1, tw: 5.5, tl: 16, cam: 'frame', lw: 2.2, bw: 1.6 },   /* GSNAP: วงขาวหนา กลาง ~.42h (ภาพเอียงหน้าบน) แถบยาว */
    '1177039231_24134323413': { t: 'OSGEER เคสใส แม่เหล็กวงขาวหนา (Samsung)', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#f4f4f4']], mag: '#f4f4f4', magF: 1, mr: 24, mw: 5.5, my: .52, tab: 1, tw: 5.5, tl: 18, cam: 'frame', grp: 1, lw: 2.4, bw: 1.6, bump: 1 },   /* GSNAP: วง Ø .68W กลาง .52h แถบยาว ~.14h */
    '988537516_27611799327': { t: 'Monee เคสควันดำ ขาตั้งเลนส์ แม่เหล็ก', back: 'smoke', cols: [['ดำ', '#3a3b3e', '#1c1c1e', '#1c1c1e', '', '#1c1c1e']], mag: '#1c1c1e', magF: 1, mw: 4.4, cam: 'stand', lw: 2.4, bw: 1.6 },
    '1030906845_42762234649': { t: 'เคสฝ้าควันเข้ม ขอบดำ แม่เหล็ก (Samsung)', back: 'smoke', fa: .75, cols: [['ดำ', '#3a4250', '#1c1c1e', '', '', '#1c1c1e']], mag: '#1c1c1e', magF: 1, mr: 24.5, mw: 5, my: .52, tab: 1, tw: 5, tl: 18, cam: 'frame', grp: 1, lw: 2.2, bw: 1.4 },   /* GSNAP: วง Ø ~.72W กลาง .53h */
    '1302248036_46457289467': { t: 'เคสฝ้าขาว แม่เหล็กวงเทาหนา', back: 'frost', cols: [['ฝ้าขาว', '', '#d9dbde', '#bfc1c4', '', '#9a9b9d']], mag: '#9a9b9d', magF: 1, mr: 22.5, mw: 6, tab: 1, tw: 6, tl: 18, cam: 'frame', lw: 3, bw: 1.8 },   /* GSNAP: เลนส์ขนาดเท่ากัน → วง Ø ~.7W ตรง · แถบเทาหนายาว */
    '1302248036_26613978262': { t: 'เคสใสขอบสี แม่เหล็ก (Samsung)', back: 'clear', cols: [['ขอบดำ', '', '#1c1c1e', '#1c1c1e', '', '#1c1c1e'], ['ขอบขาว', '', '#eef0f2', '#eef0f2', '', '#f4f4f4']], mag: '#1c1c1e', magF: 1, mw: 5.5, tab: 1, tw: 5, tl: 12, cam: 'frame', grp: 1, lw: 2.6, bw: 2 },
    '50103026_26879734400': { t: 'T-Plus เคสใส แม่เหล็ก (Samsung)', back: 'clear', cols: [['ใส', '', '#dfe3e8', '', '', '#f4f4f4']], mag: '#f4f4f4', magF: 1, mr: 23.5, mw: 5, cam: 'frame', grp: 1, lw: 2.2, bw: 1.6, bump: 1 },   /* GSNAP: วงขาวหนาไม่มีแถบ Ø ~.66W (วัดแนวตั้ง ภาพเรนเดอร์เอียง) */
    '130586349_26463616527': { t: 'เคสดำด้าน แม่เหล็ก (Samsung S)', back: 'solid', cols: [['ดำ', '#2e2f32', '#1f2023', '#1f2023', '', '#18181a']], mag: '#18181a', magF: 1, mr: 21, mw: 3.6, my: .5, tab: 1, tl: 16, cam: 'frame', grp: 1, lw: 2.4, bw: 1.2 },   /* GSNAP (S24 ซ้ายในภาพ): วงบาง Ø .6W กลาง .49h */
    '850999661_40527777072': { t: 'Star เคสฝ้า ดาวกากเพชร (Samsung A)', back: 'frost', cols: [['ฝ้าขาว ดาว', '', '#e6e8eb']], glit: { c: '#ffffff', n: 5, st: 18, ss: 2.6 }, cam: 'frame', grp: 1, lw: 2, bw: 1.4 }
  };
  /* LeReach ร้านอื่น ดีไซน์เดียวกับ Lereach ขาตั้ง (ภาพตัวเลือกสีเหมือนกัน) — 778583632 มีสีมากกว่า */
  LOOK['22133889_42677365056'] = LOOK['1468236883_41164267939'];
  LOOK['778583632_47001897930'] = Object.assign({}, LOOK['1468236883_41164267939'], { cols: [['ดำ', '#3a3b3e', '#1c1c1e', '', '', '#1c1c1e'], ['เทา', '#9a9ca0', '#6a6c70', '', 'frost', '#a7a9ad'], ['ชมพู', '#e9b8bf', '#e3a9b2', '', 'frost', '#d99aa4'], ['ม่วง', '#b5a6d0', '#9d8cc0', '', 'frost', '#8c7bb2'], ['น้ำเงิน', '#4a6a9a', '#34507e', '', 'frost', '#34507e'], ['แดง', '#b83a3e', '#a32f33', '', 'frost', '#8f2a2d']] });
  /* ร้านอื่นขายสินค้าเดียวกัน (ชื่อ/ภาพตรงกัน) → ใช้ดีไซน์เดิม */
  LOOK['1389995741_41926126080'] = LOOK['1389995741_49750821924'];   // t-case ซิลิโคน (Ultra)
  ['59622945_41160963927', '1630804521_40070343404', '1732112265_57755535204', '1630792325_43370300776', '1732112265_54705403030'].forEach(function (k) { LOOK[k] = LOOK['59622945_44360964494']; });   // อะคริลิกขอบสี
  ['1630804521_43870303632', '1732112265_51905402983'].forEach(function (k) { LOOK[k] = LOOK['59622945_29668096052']; });   // ซิลิโคนเหลว
  LOOK['93872596_25100928352'] = LOOK['93872596_24358931897'];   // HI-SHIELD Magsafe กันกระแทก (ลิงก์ iPhone ของร้านเดียวกัน)
  LOOK['271723622_41514887830'] = LOOK['271723622_29030930705'];   // เคสกำมะหยี่ ร้านเดียวกัน (ลิงก์ 18 Pro Max)
  ['478817918_24904629164', '114972051_24255503446'].forEach(function (k) { LOOK[k] = LOOK['364773678_25704606247']; });   /* Samsung เคสใสมุมถุงลม ครอบกล้องใส — ชื่อ trigram .76–.90 ภาพร้าน 478817918 เหมือน 364773678 ทุกพิกเซล */
  LOOK['1641140873_41822361281'] = LOOK['114972051_29374921001'];   /* XUNDD ขอบเกราะ (อีกร้าน ภาพสีขอบเทา) */
  LOOK['1597424659_40720320806'] = LOOK['1731724825_48205613014'];   /* เคสเกราะ 2 ชั้น S23 Ultra — ชื่อและภาพตรงกัน 100% */
  LOOK['1607347209_55267281527'] = LOOK['333807292_25657488221'];
  LOOK['491079622_25158326733'] = LOOK['491079622_26862879036'];   /* ฝ้าดำ ขาตั้งเลนส์ ร้านเดียวกัน ภาพชุดเดียวกัน */
  LOOK['166461551_41514895329'] = LOOK['484423257_26640430083'];   /* กำมะหยี่ช่องกล้องใหญ่ — ภาพ/สีชุดเดียวกัน */
  LOOK['1200929454_26631698390'] = LOOK['1200929454_27131705554'];   /* ซิลิโคนสีมาการอง ร้านเดียวกัน */
  /* ชุด iPhone 4 — alias (ภาพร้านตรงกับเคสที่มีดีไซน์แล้ว / ร้านเดียวกันลงหลายลิงก์) */
  LOOK['751764046_18416235513'] = LOOK['1017184019_20380927243'];   /* HOHO. ภาพชุดเดียวกับ HOHO คริสตัลแม่เหล็ก */
  LOOK['1177039231_25233992402'] = LOOK['1177039231_28553487941'];   /* OSGEER Thailan ร้านเดียวกัน ภาพชุดเดียวกัน */
  LOOK['459354868_27583535090'] = LOOK['230773795_28212702050'];   /* Mario Case มุมหนา ใส/ดำใส */
  LOOK['850999661_23829678610'] = LOOK['130586349_6596819475'];   /* Fintorp ใสมุมหนา ครอบกล้อง */
  LOOK['716817225_58167635214'] = LOOK['716817225_26523451647'];   /* SLIMCASE Unique ร้านเดียวกัน */
  LOOK['82638222_5778705321'] = LOOK['1112640471_47700982079'];   /* Fox แม่เหล็ก ภาพกล่อง+มือชุดเดียวกัน */
  LOOK['30950658_28029523957'] = LOOK['30950658_22707191183'];   /* Moov CS02 ลิงก์ที่สอง ชื่อเดียวกัน */
  LOOK['65302368_40911674950'] = LOOK['153078644_41011712413'];   /* UGREEN Crystal Clear Magnetic (ร้าน official) */   // เคสดำด้าน แม่เหล็ก — ภาพร้านเป็นภาพเดียวกันทุกพิกเซล (อีกร้านขาย ฿50)
  /* ชุด 13 พ.ย. 2026 — alias (วางภาพร้านคู่กันแล้วตรงกัน) + rock space ลิงก์ iPhone */
  LOOK['271723622_20725640698'] = LOOK['230773795_21514302886'];   /* เคสใสอะคริลิก ครอบกล้อง ร้านอื่น */
  LOOK['44675290_29354953334'] = LOOK['44675290_24138656862'];   /* rock space Samsung ลิงก์ที่สอง ภาพเดียวกัน */
  LOOK['333807292_29213616274'] = LOOK['333807292_25657488221'];   /* เคสดำด้านแม่เหล็ก ร้านเดียวกัน ลิงก์ S25/S26 Ultra */
  LOOK['333807292_14893854544'] = LOOK['333807292_25657488221'];   /* ภาพร้านเดียวกันทุกพิกเซล */
  LOOK['494921424_22689704512'] = LOOK['494921424_43811515976'];   /* กระจกฝ้าขอบชุบ ร้านเดียวกัน */
  LOOK['378605183_42569994888'] = LOOK['378605183_27538990021'];   /* ซิลิโคนบุกำมะหยี่ ร้านเดียวกัน (17 series) */
  LOOK['44675290_7067951746'] = Object.assign({}, LOOK['44675290_24138656862'], { t: 'rock space เคสใส แม่เหล็ก (iPhone)', grp: 0 });
  /* CaseClub ลิงก์อื่นของลายเดียวกัน — ลิงก์ Samsung ใช้ช่องกล้องรวม (grp) ชื่อ t เดียวกัน → รวมกลุ่มไม่โชว์ซ้ำ */
  LOOK['1382380664_41551920513'] = LOOK['1382380664_43965509891'];   /* Rally Movement ภาพชุดเดียวกัน (iPhone + S25 Ultra) */
  LOOK['1382380664_27139172202'] = Object.assign({}, LOOK['1382380664_43965509891'], { grp: 1 });   /* Rally Movement ลิงก์ Samsung */
  LOOK['1382380664_26843618949'] = Object.assign({}, LOOK['1382380664_29943058518'], { grp: 1 });   /* Blush Bloom ลิงก์ Samsung */
  LOOK['1382380664_41725833058'] = LOOK['1382380664_26738291457'];   /* maison KEEPS The Fundamental = ภาพเงินกระจกชุดเดียวกัน */
  LOOK['1382380664_51967648743'] = LOOK['1382380664_43965509891'];   /* Rally Movement รุ่น TPU ใส (18 Pro) ลายเดียวกัน */
  LOOK['1382380664_49151739824'] = Object.assign({}, LOOK['1382380664_42524648454'], { grp: 1 });   /* RM Dot ลิงก์ Samsung */
  LOOK['1382380664_56011693193'] = Object.assign({}, LOOK['1382380664_46761730439'], { grp: 1 });   /* Adore Patch ลิงก์ Samsung (ภาพลายเดียวกัน) */
  LOOK['1382380664_42505640276'] = LOOK['1382380664_40072085194'];   /* The Imbalance ขอบสี ลิงก์ที่สอง */
  LOOK['1382380664_44481450165'] = LOOK['1382380664_29094977187'];   /* Adore Stripe ลิงก์พร้อมส่ง ภาพลายเดียวกัน */
  ['1017184019_56304776040', '751764046_23980736200'].forEach(function (k) { LOOK[k] = LOOK['1017184019_20380927243']; });   /* เคสประจำสัปดาห์: KC/K ใสแม่เหล็ก ภาพ HOHO ชุดเดียวกับ HOHO คริสตัลแม่เหล็ก */
  /* เคสลายการ์ตูน/ลายพิมพ์ (ตัวกรอง "ลายการ์ตูน") */
  ['1049076226_44262560633', '1049076226_50705623257', '1150840187_43676056941', '83112658_54715194685', '1518344201_52713420017', '1150100559_41718385986',
    '230773795_44351000013', '296279108_24178574357', '296279108_48705162820', '1564593220_55356901890', '1049076226_26402382969'].forEach(function (k) { LOOK[k].toon = 1; });
  /* กลุ่มให้ผู้ซื้อกรอง: เนื้อเคส + ฟีเจอร์ */
  var KINDS = [['all', 'ทั้งหมด'], ['art', 'ลายการ์ตูน'], ['clear', 'ใส'], ['frost', 'ขุ่น/ด้าน'], ['solid', 'สีทึบ'], ['mag', 'แม่เหล็ก'], ['stand', 'ขาตั้ง']];
  function kindHas(look, k) {
    if (k === 'all') return true;
    if (k === 'art') return !!(look.art || look.toon);
    if (k === 'clear' || k === 'solid') return look.back === k;
    if (k === 'frost') return look.back === 'frost' || look.back === 'smoke';
    if (k === 'mag') return !!(look.mag || look.ring);
    return look.cam === 'stand' || !!look.ring || !!look.stand || !!look.kick || !!look.fold || !!look.inset;
  }
  var lookOf = function (p) { var l = LOOK[p.id]; if (l && (!l.img || l._ai)) { l.img = src(p); l._ai = 1; } /* _ai = รูปที่ใส่อัตโนมัติ: LOOK ที่หลายร้านใช้ร่วมกันต้องได้รูปของชิ้นที่กำลังดู */ return l || { back: 'clear', cols: [['ใส', '', '#cfd4da']], cam: 'frame' }; };

  /* ---------- ภาพจริงจากร้านเป็นหลังเคส (look.shot ทั้งเคส · cols[i][6].shot เฉพาะสี) ----------
     ผู้ใช้ (พ.ย. 2026): ลายที่วาดเองไม่เหมือนต้นฉบับเลย (ลายถี่กว่า ตัวการ์ตูนไม่เหมือน สีไม่ครบ) → ดึงภาพสินค้าของร้านมา
     ดัดมุมมอง (homography) ให้แบนตรง แล้วแปะเป็นหลังเคส — ภาพร้านอ่านพิกเซลได้ (crossOrigin anonymous)
     q    = มุมหลังเคส 4 มุมในภาพร้าน [TLx,TLy, TRx,TRy, BRx,BRy, BLx,BLy] สัดส่วน 0–1 ของภาพ (TL = มุมเดียวกับกล้อง)
     mode 'full' = q คือขอบนอกทั้งเคส · 'tile' = q คือแผ่นลายที่ไม่มีอะไรบัง ขนาดจริง tw×th มม. ปูแบบสะท้อนกลับ (ไม่เห็นรอยต่อ)
     cut  = ส่วนบน (สัดส่วนความสูงเคส) ที่เป็นกล้องของเครื่องในภาพร้าน → fill: สี | 'mirror' สะท้อนลายใต้เส้นขึ้นไป | 'clear' โปร่ง
     key  = สีเครื่องในภาพที่เห็นผ่านเคสใส → ทำให้โปร่ง (color-to-alpha) ให้เห็นเครื่องของผู้ใช้แทน · s = ภาพอื่น (ไม่ใส่ = ภาพสินค้า) */
  var TX = {}, IMC = {}, TXS = 8;   // แคชภาพที่ดัดแล้วตาม (สเปก + ขนาดเครื่อง) · 8 พิกเซล/มม.
  function loadPx(u) {
    return IMC[u] || (IMC[u] = new Promise(function (ok, no) {
      var i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = function () { var c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; var x = c.getContext('2d'); x.drawImage(i, 0, 0); ok({ d: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }); };
      i.onerror = no; i.src = u;
    }));
  }
  /* สี่เหลี่ยมจัตุรัสหน่วย → สี่เหลี่ยมใด ๆ (Heckbert) : (u,v) ∈ [0,1]² → พิกัดในภาพ */
  function sq2q(q) {
    var x0 = q[0], y0 = q[1], x1 = q[2], y1 = q[3], x2 = q[4], y2 = q[5], x3 = q[6], y3 = q[7];
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3, g = 0, h = 0;
    if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { var dt = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / dt; h = (dx1 * dy3 - dx3 * dy1) / dt; }
    var a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
    return function (u, v) { var z = g * u + h * v + 1; return [(a * u + b * v + x0) / z, (d * u + e * v + y0) / z]; };
  }
  /* ดัดภาพเป็นแผ่น cw×ch พิกเซล (bilinear) */
  /* mx = ส่วนขวาของเคสที่ถูกเคสอื่นบังในภาพร้าน → สะท้อนจากด้านซ้ายของเส้น mx มาเติม · [บน, ล่าง] = เส้นเอียง (เคสที่บังวางเฉียง) */
  function warp(I, q, cw, ch, mx, mlf, mb) {
    var f = sq2q(q.map(function (v, i) { return v * (i % 2 ? I.h : I.w); })), o = new Uint8ClampedArray(cw * ch * 4), D = I.d, W = I.w, H = I.h;
    for (var j = 0; j < ch; j++) for (var i = 0; i < cw; i++) {
      var vv = (j + .5) / ch; if (mb && vv > mb) vv = Math.max(0, 2 * mb - vv);   // ขอบล่างที่ถูกนิ้วบัง → สะท้อนจากด้านบนของเส้น mb
      var uu = (i + .5) / cw, ml = mx && (mx.length ? mx[0] + (mx[1] - mx[0]) * j / ch : mx); if (ml && uu > ml) uu = Math.max(0, 2 * ml - uu);
      if (mlf && uu < mlf) uu = Math.min(1, 2 * mlf - uu);   // ส่วนซ้ายที่ถูกบัง
      var p = f(uu, vv), x = Math.max(0, Math.min(W - 1.001, p[0] - .5)), y = Math.max(0, Math.min(H - 1.001, p[1] - .5));
      var xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = (yi * W + xi) * 4, k2 = k + W * 4, n = (j * cw + i) * 4;
      for (var c = 0; c < 3; c++) o[n + c] = (D[k + c] * (1 - fx) + D[k + 4 + c] * fx) * (1 - fy) + (D[k2 + c] * (1 - fx) + D[k2 + 4 + c] * fx) * fy;
      o[n + 3] = 255;
    }
    return o;
  }
  /* ลบแสงไล่ระดับในแผ่นลาย (ไม่งั้นปูซ้ำแล้วเห็นเป็นตารางสี่เหลี่ยม): ฟิตระนาบ a+bx+cy ต่อช่องสี จากพิกเซลพื้น (ไม่ใช่ลาย) แล้วหักออกให้เหลือค่าเฉลี่ย */
  function flatten(T, tw, th) {
    var n = tw * th, Ls = [], i, k;
    for (i = 0; i < n; i += 7) Ls.push(T[i * 4] * .3 + T[i * 4 + 1] * .59 + T[i * 4 + 2] * .11);
    Ls.sort(function (a, b) { return a - b; });
    var med = Ls[Ls.length >> 1];
    for (var c = 0; c < 3; c++) {
      var S = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], m = 0;   // ผลรวมสำหรับสมการปกติ
      for (var y = 0; y < th; y += 2) for (var x = 0; x < tw; x += 2) {
        k = (y * tw + x) * 4; if (Math.abs(T[k] * .3 + T[k + 1] * .59 + T[k + 2] * .11 - med) > 22) continue;
        var u = x / tw - .5, v = y / th - .5, z = T[k + c];
        S[0]++; S[1] += u; S[2] += v; S[3] += u * u; S[4] += u * v; S[5] += v * v; S[6] += z; S[7] += z * u; S[8] += z * v;
      }
      if (S[0] < 50) continue;
      /* แก้ 3×3: [n Σu Σv; Σu Σuu Σuv; Σv Σuv Σvv] [a b c] = [Σz Σzu Σzv] (Cramer) */
      var A = [[S[0], S[1], S[2]], [S[1], S[3], S[4]], [S[2], S[4], S[5]]], B = [S[6], S[7], S[8]];
      var det = function (M) { return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]); };
      var D0 = det(A); if (!D0) continue;
      var sol = [0, 1, 2].map(function (j) { var M = A.map(function (r, ri) { return r.map(function (val, ci) { return ci === j ? B[ri] : val; }); }); return det(M) / D0; });
      for (y = 0; y < th; y++) for (x = 0; x < tw; x++) { k = (y * tw + x) * 4 + c; T[k] = T[k] - sol[1] * (x / tw - .5) - sol[2] * (y / th - .5); }
      m++;
    }
    return T;
  }
  /* เคสใส: ลบ "เครื่องในภาพร้าน" ที่เห็นผ่านเคส ให้เหลือแต่ลายพิมพ์ แล้วเห็นเครื่องของผู้ใช้แทน (ผู้ใช้ทัก: เคสใสกลายเป็นเคสทึบ)
     ภาพถ่ายมีแสงไล่ระดับ สีพื้นจึงไม่เท่ากันทั้งแผ่น → หาสีพื้นทีละช่อง 6 มม. (พิกเซลที่ใกล้สีพื้นตั้งต้น) แล้วไล่ต่อเนื่อง (bilinear)
     key = สีพื้นตั้งต้น '#hex' หรือ [u, v] จุดเก็บสีในแผ่น (สัดส่วน) · kd = ระยะสีที่นับเป็นพื้น · ka = [โปร่งหมด, ทึบหมด] ระยะสีจากพื้นในช่องนั้น
     ลายพิมพ์ UV ทึบจริง → ใช้ทางลาดสั้น (สีพาสเทลอ่อนก็ยังทึบ ไม่ใช่ color-to-alpha ที่ทำพาสเทลกลายเป็นใส) */
  function keyBg(o, cw, ch, S) {
    var k0 = S.key === 'auto' ? (function () {   // สีที่พบมากสุด (ช่องสี 16 ระดับ) ใต้ส่วนกล้อง = สีเครื่องที่เห็นผ่านเคส
      var hb = {}, best = null, y0 = Math.round((S.cut || .3) * ch);
      for (var y = y0; y < ch; y += 3) for (var x = 0; x < cw; x += 3) { var k = (y * cw + x) * 4, id = (o[k] >> 4) + ',' + (o[k + 1] >> 4) + ',' + (o[k + 2] >> 4), b = hb[id] || (hb[id] = [0, 0, 0, 0]); b[0] += o[k]; b[1] += o[k + 1]; b[2] += o[k + 2]; b[3]++; if (!best || b[3] > best[3]) best = b; }
      return [best[0] / best[3], best[1] / best[3], best[2] / best[3]];
    })() : typeof S.key === 'string' ? rgb(S.key) : (function () { var x = Math.round(S.key[0] * cw), y = Math.round(S.key[1] * ch), s = [0, 0, 0], n = 0; for (var j = -6; j <= 6; j++) for (var i = -6; i <= 6; i++) { var k = (Math.min(ch - 1, Math.max(0, y + j)) * cw + Math.min(cw - 1, Math.max(0, x + i))) * 4; s[0] += o[k]; s[1] += o[k + 1]; s[2] += o[k + 2]; n++; } return s.map(function (v) { return v / n; }); })();
    var kd = S.kd || 40, ka = S.ka || [14, 46], g = Math.round(6 * TXS), gx = Math.ceil(cw / g), gy = Math.ceil(ch / g), G = [], i, j, x, y, k;
    var dist = function (a, k) { var dr = o[k] - a[0], dg = o[k + 1] - a[1], db = o[k + 2] - a[2]; return Math.sqrt(dr * dr + dg * dg + db * db); };
    for (j = 0; j < gy; j++) for (i = 0; i < gx; i++) {
      var s = [0, 0, 0], n = 0, t = 0;
      for (y = j * g; y < Math.min(ch, (j + 1) * g); y += 2) for (x = i * g; x < Math.min(cw, (i + 1) * g); x += 2) { k = (y * cw + x) * 4; t++; if (o[k + 3] && dist(k0, k) < kd) { s[0] += o[k]; s[1] += o[k + 1]; s[2] += o[k + 2]; n++; } }
      G.push(n > t * .12 ? s.map(function (v) { return v / n; }) : null);
    }
    for (var it = 0; it < 40 && G.some(function (c) { return !c; }); it++) G = G.map(function (c, q) {   // ช่องที่ลายเต็ม (ไม่มีพื้นให้เห็น) → เฉลี่ยจากช่องข้าง ๆ
      if (c) return c; var ci = q % gx, cj = (q / gx) | 0, s = [0, 0, 0], n = 0;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) { var a = ci + d[0], b = cj + d[1]; if (a >= 0 && a < gx && b >= 0 && b < gy && G[b * gx + a]) { var v = G[b * gx + a]; s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; n++; } });
      return n ? s.map(function (v) { return v / n; }) : null;
    });
    G = G.map(function (c) { return c || k0; });
    for (y = 0; y < ch; y++) {
      var fy = Math.max(0, Math.min(gy - 1.001, (y + .5) / g - .5)), j0 = fy | 0, ty = fy - j0, j1 = Math.min(gy - 1, j0 + 1);
      for (x = 0; x < cw; x++) {
        k = (y * cw + x) * 4; if (!o[k + 3]) continue;
        var fx = Math.max(0, Math.min(gx - 1.001, (x + .5) / g - .5)), i0 = fx | 0, tx = fx - i0, i1 = Math.min(gx - 1, i0 + 1), a = G[j0 * gx + i0], b = G[j0 * gx + i1], c = G[j1 * gx + i0], d = G[j1 * gx + i1];
        var bg = [0, 1, 2].map(function (q) { return (a[q] * (1 - tx) + b[q] * tx) * (1 - ty) + (c[q] * (1 - tx) + d[q] * tx) * ty; });
        var al = Math.max(0, Math.min(1, (dist(bg, k) - ka[0]) / (ka[1] - ka[0])));
        al = al * al * (3 - 2 * al);
        if (S.ks) {   // ลายสีสด + พื้น/วงแม่เหล็ก/ขอบใสเป็นสีเทา: พิกเซลสีจืดที่ความสว่างใกล้พื้น = ขอบวงแม่เหล็กในภาพ → ลบทิ้ง (เส้นเข้มของลายยังอยู่)
          var mx2 = Math.max(o[k], o[k + 1], o[k + 2]), sat = mx2 - Math.min(o[k], o[k + 1], o[k + 2]), dl = Math.abs(mx2 - Math.max(bg[0], bg[1], bg[2]));
          var gs = Math.max(sat / S.ks, dl / 80); if (gs < 1) al *= Math.max(0, gs * 2 - 1);
        }
        al = (S.kf || 0) + (1 - (S.kf || 0)) * al;   // kf = เคสใสสีอ่อน (พาสเทลใส): พื้นยังเหลือสีจาง ๆ ไม่ใสหมด
        if (al > 0) for (var q = 0; q < 3; q++) o[k + q] = Math.max(0, Math.min(255, (o[k + q] - bg[q] * (1 - al)) / al));
        o[k + 3] = al * 255;
      }
    }
  }
  function buildTex(S, W, H) {
    return loadPx(S.s).then(function (I) {
      var cw = Math.round(W * TXS), ch = Math.round(H * TXS), o;
      if (S.mode === 'tile') {   // แผ่นลายสะท้อนกลับ 2×2 → ต่อกันได้ไม่เห็นรอย
        var tw = Math.round(S.tw * TXS), th = Math.round(S.th * TXS), T = flatten(warp(I, S.q, tw, th), tw, th);
        o = new Uint8ClampedArray(cw * ch * 4);
        /* rep = ปูซ้ำตรง ๆ (แผ่นที่ตัดขอบตรงช่องว่างระหว่างลายพอดีคาบ — ลายจุดตาราง) · ไม่ใส่ = สะท้อนกลับ (ลายอิสระ) */
        for (var j = 0; j < ch; j++) { var b = j % (2 * th); if (b >= th) b = S.rep ? b - th : 2 * th - 1 - b; for (var i = 0; i < cw; i++) { var a = i % (2 * tw); if (a >= tw) a = S.rep ? a - tw : 2 * tw - 1 - a; var n = (j * cw + i) * 4, m = (b * tw + a) * 4; o[n] = T[m]; o[n + 1] = T[m + 1]; o[n + 2] = T[m + 2]; o[n + 3] = 255; } }
      } else o = warp(I, S.q, cw, ch, S.mf ? 0 : S.mx, S.ml, S.mb);
      if (S.tp) {   // ปะส่วนที่นิ้วบังด้วยลายส่วนอื่นแบบเลื่อน (ไม่กลับด้าน ตัวหนังสือไม่กลับ) [x0, y0, x1, y1, dx, dy] สัดส่วน · ขอบไล่ผสม 2 มม.
        var src = o.slice(), fe = 2 * TXS;
        S.tp.forEach(function (r) {
          var X0 = Math.round(r[0] * cw), Y0 = Math.round(r[1] * ch), X1 = Math.round(r[2] * cw), Y1 = Math.round(r[3] * ch), DX = Math.round(r[4] * cw), DY = Math.round(r[5] * ch);
          for (var y = Y0; y < Y1; y++) for (var x = X0; x < X1; x++) {
            var sx = Math.max(0, Math.min(cw - 1, x + DX)), sy = Math.max(0, Math.min(ch - 1, y + DY)), n = (y * cw + x) * 4, m = (sy * cw + sx) * 4;
            var e = S.tpHard ? 1 : Math.min(1, (x - X0) / fe, (y - Y0) / fe, X1 >= cw ? 1 : (X1 - x) / fe, Y1 >= ch ? 1 : (Y1 - y) / fe);   /* tpHard: เลื่อนเป็นจำนวนเต็มคาบของลายซ้ำ (ตาราง) → ต่อกันพอดี ไม่ไล่ผสมกับภาพเดิม (ภาพเดิมใต้ช่องกล้องคือกล้องของเครื่อง) */
            if (X0 <= 0 && !S.tpHard) e = Math.min(1, (y - Y0) / fe, X1 >= cw ? 1 : (X1 - x) / fe, Y1 >= ch ? 1 : (Y1 - y) / fe);
            for (var c = 0; c < 3; c++) o[n + c] = src[m + c] * e + src[n + c] * (1 - e);
          }
        });
      }
      if (S.mf) {   // ลายไม่สมมาตร (มีตัวอักษร/ตัวการ์ตูน) — ส่วนที่ถูกบังเติมสีพื้นเคสแทนการสะท้อน (สะท้อนแล้วตัวหนังสือกลับด้าน) ไล่จางรอยต่อ 4% ของความกว้าง
        var mfc = rgb(S.mf), mxv = S.mx.length ? S.mx : [S.mx, S.mx];
        for (var jm = 0; jm < ch; jm++) { var lm = (mxv[0] + (mxv[1] - mxv[0]) * jm / ch) * cw, fw = cw * .04; for (var im = Math.max(0, Math.floor(lm - fw)); im < cw; im++) { var tm = Math.min(1, (im - (lm - fw)) / fw), nm2 = (jm * cw + im) * 4; for (var cm = 0; cm < 3; cm++) o[nm2 + cm] += tm * (mfc[cm] - o[nm2 + cm]); } }
      }
      if (S.bot) {   // แถบลายขอบล่าง (เช่น เม็ดเหลืองใต้มะเขือเทศ) ขนาดจริง w×h มม. ปูสะท้อนแนวนอน วางชิดขอบล่าง
        var bw2 = Math.round(S.bot.w * TXS), bh2 = Math.round(S.bot.h * TXS), Bt = flatten(warp(I, S.bot.q, bw2, bh2), bw2, bh2), y0b = ch - bh2;
        for (var jb = 0; jb < bh2; jb++) for (var ib = 0; ib < cw; ib++) { var ab = ib % (2 * bw2); if (ab >= bw2) ab = 2 * bw2 - 1 - ab; var nb = ((y0b + jb) * cw + ib) * 4, mb = (jb * bw2 + ab) * 4; o[nb] = Bt[mb]; o[nb + 1] = Bt[mb + 1]; o[nb + 2] = Bt[mb + 2]; }
      }
      if (S.recol) {   // เปลี่ยนสีพื้นของแผ่นลาย (ใช้ลายจากเคสสีที่เห็นชัดสุด แต่พื้นเป็นสีของเคสสีนี้ที่วัดจากภาพเดียวกัน) — คงแสงเงาเดิม
        var rf = rgb(S.recol[0]), rt = rgb(S.recol[1]), rtol = S.recol[2] || 70;
        for (var pr = 0; pr < cw * ch * 4; pr += 4) {
          var dd = Math.sqrt(Math.pow(o[pr] - rf[0], 2) + Math.pow(o[pr + 1] - rf[1], 2) + Math.pow(o[pr + 2] - rf[2], 2)), wr = Math.max(0, 1 - dd / rtol);
          if (wr > 0) for (var cc = 0; cc < 3; cc++) o[pr + cc] += wr * (rt[cc] - rf[cc]);
        }
      }
      if (S.gain) for (var pg = 0; pg < cw * ch * 4; pg += 4) { o[pg] *= S.gain; o[pg + 1] *= S.gain; o[pg + 2] *= S.gain; }   // ภาพร้านที่ถ่ายในที่มืด
      if (S.key) keyBg(o, cw, ch, S);
      if (S.er) S.er.forEach(function (r) {   // เคสใส: ลบนิ้ว/มือที่จับเคสในภาพร้าน (สัดส่วน x0 y0 x1 y1) → ใสเท่าพื้น
        for (var y = Math.round(r[1] * ch); y < Math.round(r[3] * ch); y++) for (var x = Math.round(r[0] * cw); x < Math.round(r[2] * cw); x++) o[(y * cw + x) * 4 + 3] = (S.kf || 0) * 255;
      });
      if (S.cut) {   // ส่วนกล้องของเครื่องในภาพร้าน — ต้องคลุม "ทั้งกรอบกล้องนูน" ของภาพ ไม่งั้นเห็นกล้องซ้อนบนเครื่องรุ่นที่รูกล้องเล็กกว่า
        var cr = Math.round(S.cut * ch), cx2 = Math.round((S.cx || 1) * cw), fc = S.fill && S.fill[0] === '#' ? rgb(S.fill) : null;   // cx = ปะเฉพาะด้านซ้าย (กล้องสี่เหลี่ยม)
        if (S.fill === 'auto') {   // สีเฉลี่ยของแถวใต้เส้น cut (แถบสีเคสรอบกล้อง)
          var sm = [0, 0, 0], sn = 0, ry = Math.min(ch - 1, cr + 3);
          for (var xa = Math.round(cw * .15); xa < Math.round(cw * .85); xa++) { var ka = (ry * cw + xa) * 4; sm[0] += o[ka]; sm[1] += o[ka + 1]; sm[2] += o[ka + 2]; sn++; }
          fc = sm.map(function (v) { return v / sn; });
        }
        var fa = 255;
        if (S.fill === 'clear' && S.kf) {   // เคสใสสีอ่อน: ช่องกล้องเดิมเติมสีพื้นจาง ๆ เท่ากับส่วนอื่น (ไม่งั้นเห็นรอยต่อเป็นแถบ)
          var st = [0, 0, 0], sc = 0;
          for (var yk = cr; yk < Math.min(ch, cr + 6 * TXS); yk++) for (var xk = 0; xk < cw; xk += 2) { var kk = (yk * cw + xk) * 4; if (o[kk + 3] < S.kf * 255 + 3) { st[0] += o[kk]; st[1] += o[kk + 1]; st[2] += o[kk + 2]; sc++; } }
          if (sc) { fc = st.map(function (v) { return v / sc; }); fa = S.kf * 255; }
        }
        for (var y = 0; y < cr; y++) for (var x = 0; x < cx2; x++) {
          var n2 = (y * cw + x) * 4;
          if (fc) { o[n2] = fc[0]; o[n2 + 1] = fc[1]; o[n2 + 2] = fc[2]; o[n2 + 3] = fa; }
          else if (S.fill === 'clear') o[n2 + 3] = 0;
          else if (S.fill === 'hmirror' && 2 * cx2 - x < cw - 9 * TXS) {
            /* สะท้อนซ้าย-ขวารอบเส้น cx (แถวลายบนสุดเช่นขีดเหลืองต่อเนื่อง ไม่มีรอยต่อ) · ไม่เอามุมโค้งขวาบน 9 มม. และขอบบน 5 มม. (นอกเคส/ฉากหลังในภาพ)
               3 มม. ติดเส้นล่าง: ไล่ไปหาภาพสะท้อนแนวตั้ง (ต่อกับลายใต้เส้น) · 5 มม. ติดส่วนซ้ายที่ใช้ shift: ไล่ผสมกัน */
            var nh = (Math.max(y, 5 * TXS) * cw + 2 * cx2 - x - 1) * 4, wv = Math.max(0, (y - (cr - 3 * TXS)) / (3 * TXS)), nv = (Math.min(ch - 1, 2 * cr - y) * cw + x) * 4;
            var wl = Math.min(1, (x - (2 * cx2 - cw + 9 * TXS)) / (5 * TXS)), nsl = (Math.min(ch - 1, y + cr) * cw + x) * 4;
            for (var ch2 = 0; ch2 < 4; ch2++) { var hv = o[nh + ch2] * (1 - wv) + o[nv + ch2] * wv; o[n2 + ch2] = hv * wl + (o[nsl + ch2] * (1 - wv) + o[nv + ch2] * wv) * (1 - wl); }
          }
          else if (S.fill === 'syn') { }   // เติมในบล็อก syn ด้านล่าง
          else if (S.fill === 'shift' || S.fill === 'hmirror') {   // ลายตัวการ์ตูนใหญ่ (มะเขือเทศ แมว): สะท้อนแล้วตัวที่คร่อมเส้นกลายเป็นรูปตาสมมาตร → ยกลายใต้ช่องขึ้นมาตรง ๆ แล้วไล่ผสมกับภาพสะท้อนเฉพาะ 3 มม. ติดเส้น (ต่อเนื่อง)
            /* sh = ระยะยก (มม.) เท่ากับคาบของลายซ้ำ (จุดตาราง) และ ≥ ความสูงช่อง → ต่อกันพอดี ไม่ต้องไล่ผสม */
            var fb = 3 * TXS, ws = S.sh ? 0 : Math.max(0, (y - (cr - fb)) / fb), ns = (Math.min(ch - 1, y + (S.sh ? Math.round(S.sh * TXS) : cr)) * cw + x) * 4, nm = (Math.min(ch - 1, 2 * cr - y) * cw + x) * 4;
            for (var cs = 0; cs < 4; cs++) o[n2 + cs] = o[ns + cs] * (1 - ws) + o[nm + cs] * ws;
          }
          else { var sy = Math.min(ch - 1, 2 * cr - y), m2 = (sy * cw + x) * 4; o[n2] = o[m2]; o[n2 + 1] = o[m2 + 1]; o[n2 + 2] = o[m2 + 2]; o[n2 + 3] = o[m2 + 3]; }
        }
        if (S.fill === 'syn') {
          /* syn = ช่องกล้องเติม "พื้น + จุด" สังเคราะห์จากภาพเดียวกัน (เหมือนพื้นที่ข้างกรอบกล้องของเคสจริง — มะเขือเทศเริ่มใต้กรอบ)
             1) สีพื้น = สีที่พบมากสุด → ฟิตระนาบสีพื้น (แสงไล่ในภาพ) จากพิกเซลพื้นทั้งภาพนอกช่อง cut
             2) หาแผ่นสะอาดที่สุด tl มม. (พื้น+จุด ไม่มีขีดเหลือง/มะเขือเทศ) ข้างกรอบกล้อง → ปูสะท้อน + ปรับสีตามระนาบ (ผิวหนัง/จุดต่อเนื่อง ไม่เป็นบล็อก)
             3) ลายที่แตะเส้น cut (มะเขือเทศที่กรอบกล้องในภาพบังครึ่งลูก) ลบทั้งก้อนแล้วเติมพื้นแทน → ไม่มีลูกหัวแบน/แหว่ง
             (ผู้ใช้ทักเคสมะเขือเทศ พ.ย. 2026 หลายรอบ: สีเรียบ = บล็อก · สะท้อน = "ลายไม่ต่อกัน" · ยก patch = ลูกแหว่ง/หนอนแดง) */
          var NN = cw * ch, src3 = o.slice(), q3, hist3 = {}, hb3 = null, plim3 = cw - 3 * TXS;
          /* สีพื้น: นับเฉพาะพื้นที่ข้างกรอบกล้อง (พื้น+จุดเป็นหลัก) — นับทั้งภาพแล้วเคสครีม/ชมพูเข้มได้ "สีแดงมะเขือเทศ" เป็นพื้น */
          for (var hy = 6 * TXS; hy < cr; hy += 2) for (var hx = cx2 + TXS; hx < plim3; hx += 2) { q3 = (hy * cw + hx) * 4; var hk3 = (o[q3] >> 5) * 64 + (o[q3 + 1] >> 5) * 8 + (o[q3 + 2] >> 5), hv3 = hist3[hk3] || (hist3[hk3] = [0, 0, 0, 0]); hv3[0] += o[q3]; hv3[1] += o[q3 + 1]; hv3[2] += o[q3 + 2]; hv3[3]++; if (!hb3 || hv3[3] > hb3[3]) hb3 = hv3; }
          var bg3 = [hb3[0] / hb3[3], hb3[1] / hb3[3], hb3[2] / hb3[3]], dist3 = function (k, c) { var a = src3[k] - c[0], b = src3[k + 1] - c[1], d = src3[k + 2] - c[2]; return Math.sqrt(a * a + b * b + d * d); };
          /* ระนาบสีพื้น c = p0 + p1·x + p2·y (least squares ต่อช่องสี) */
          var A = [0, 0, 0, 0, 0, 0], Bv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], xx3, yy3, k3, u3, v3;
          for (yy3 = 0; yy3 < ch; yy3 += 3) for (xx3 = 0; xx3 < cw; xx3 += 3) {
            if (yy3 < cr && xx3 < cx2) continue; k3 = (yy3 * cw + xx3) * 4; if (dist3(k3, bg3) > 50) continue;
            u3 = xx3 / cw; v3 = yy3 / ch; A[0]++; A[1] += u3; A[2] += v3; A[3] += u3 * u3; A[4] += u3 * v3; A[5] += v3 * v3;
            for (var c3 = 0; c3 < 3; c3++) { Bv[c3][0] += src3[k3 + c3]; Bv[c3][1] += src3[k3 + c3] * u3; Bv[c3][2] += src3[k3 + c3] * v3; }
          }
          var solve3 = function (M, r) {   // 3×3 Cramer
            var det = function (m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); };
            var D = det(M); if (Math.abs(D) < 1e-9) return [r[0] / Math.max(1, M[0][0]), 0, 0];
            return [0, 1, 2].map(function (i) { var Mi = M.map(function (row, ri) { return row.map(function (v, ci) { return ci === i ? r[ri] : v; }); }); return det(Mi) / D; });
          };
          var MM = [[A[0], A[1], A[2]], [A[1], A[3], A[4]], [A[2], A[4], A[5]]], PL = [0, 1, 2].map(function (c) { return solve3(MM, Bv[c]); });
          var plane3 = function (x, y, c) { return PL[c][0] + PL[c][1] * x / cw + PL[c][2] * y / ch; };
          /* พิกเซลลาย = "สี" (โครมา r:g:b) ต่างจากสีพื้นตามระนาบแสงเกิน pt — ไม่ใช้ระยะ RGB เพราะเงากรอบกล้องในภาพ (สีเดียวกันแต่มืด) จะกลายเป็นลาย
             ลามเชื่อมมะเขือเทศทั้งแถว (เคสฟ้า) · จุดดำไม่นับเป็นลาย (ก้อนเล็ก ไม่ต้องลบ) */
          var PN3 = new Uint8Array(NN), PT3 = S.pt || .14;   // .1 แล้วผิวหนังพื้นชมพูเข้มเป็นลาย → ลามไปลบลูกที่ไม่ได้ถูกบัง
          for (q3 = 0; q3 < NN; q3++) {
            var qx = q3 % cw, qy = (q3 - qx) / cw, sp = src3[q3 * 4] + src3[q3 * 4 + 1] + src3[q3 * 4 + 2] + 1, b0 = plane3(qx, qy, 0), b1 = plane3(qx, qy, 1), b2 = plane3(qx, qy, 2), sb = b0 + b1 + b2 + 1;
            var e0 = src3[q3 * 4] / sp - b0 / sb, e1 = src3[q3 * 4 + 1] / sp - b1 / sb, e2 = src3[q3 * 4 + 2] / sp - b2 / sb;
            PN3[q3] = sp > 90 && Math.sqrt(e0 * e0 + e1 * e1 + e2 * e2) > PT3 ? 1 : 0;
          }
          /* กัดขอบ 2 พิกเซลก่อนไล่หาก้อน — มะเขือเทศที่แตะกันเป็นสะพานบาง ๆ จะไม่ลามต่อเป็นพวง */
          var ER3 = new Uint8Array(NN);
          for (yy3 = 2; yy3 < ch - 2; yy3++) for (xx3 = 2; xx3 < cw - 2; xx3++) { var ok3 = 1; for (var ey3 = -2; ey3 <= 2 && ok3; ey3++) for (var ex3 = -2; ex3 <= 2; ex3++) if (!PN3[(yy3 + ey3) * cw + xx3 + ex3]) { ok3 = 0; break; } ER3[yy3 * cw + xx3] = ok3; }
          /* แผ่นสะอาดที่สุดข้างกรอบกล้อง (integral image ของ PN3) */
          var IW = cw + 1, II = new Int32Array(IW * (ch + 1));
          for (yy3 = 0; yy3 < ch; yy3++) { var rs = 0; for (xx3 = 0; xx3 < cw; xx3++) { rs += PN3[yy3 * cw + xx3]; II[(yy3 + 1) * IW + xx3 + 1] = II[yy3 * IW + xx3 + 1] + rs; } }
          var wsum = function (x0, y0, w, h) { return II[(y0 + h) * IW + x0 + w] - II[y0 * IW + x0 + w] - II[(y0 + h) * IW + x0] + II[y0 * IW + x0]; };
          var TT = Math.round((S.tl || 12) * TXS), tbest = Infinity, tx0 = cx2 + TXS, ty0 = 6 * TXS;
          for (var tt = TT; tt >= 4 * TXS && tbest === Infinity; tt -= 2 * TXS) {
            for (yy3 = 6 * TXS; yy3 + tt <= ch * .86; yy3 += 4) for (xx3 = cx2 + TXS; xx3 + tt <= plim3; xx3 += 4) { var ws = wsum(xx3, yy3, tt, tt) / (tt * tt) + (yy3 > cr ? .02 : 0); if (ws < tbest) { tbest = ws; tx0 = xx3; ty0 = yy3; TT = tt; } }
          }
          var TL3 = function (x, y) { var a = x % (2 * TT), b = y % (2 * TT); if (a >= TT) a = 2 * TT - 1 - a; if (b >= TT) b = 2 * TT - 1 - b; return [tx0 + a, ty0 + b]; };
          /* มาสก์ที่ต้องเติม: ช่อง cut + ก้อนลายที่แตะเส้น cut (ใต้เส้นภายใน 25 มม.) หรือแตะขอบ cx (เหนือเส้น) */
          var MK = new Uint8Array(NN), stack = [], LIM = cr + 25 * TXS;
          for (yy3 = 0; yy3 < cr; yy3++) for (xx3 = 0; xx3 < cx2; xx3++) MK[yy3 * cw + xx3] = 1;
          var seed = function (x, y) { var k = y * cw + x; if (ER3[k] && !MK[k]) { MK[k] = 2; stack.push(k); } };
          for (yy3 = cr; yy3 < cr + 3; yy3++) for (xx3 = 0; xx3 < Math.min(cw, cx2 + TXS); xx3++) seed(xx3, yy3);
          if (cx2 < cw) for (yy3 = 0; yy3 < cr; yy3++) for (xx3 = cx2; xx3 < Math.min(cw, cx2 + 3); xx3++) seed(xx3, yy3);
          while (stack.length) {
            var kk3 = stack.pop(), kx = kk3 % cw, ky = (kk3 - kx) / cw;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = kx + d[0], ny = ky + d[1]; if (nx < 0 || ny < 0 || nx >= cw || ny >= LIM || (ny < cr && nx < cx2)) return; seed(nx, ny); });
          }
          /* จุดดำที่เส้น cut ตัดครึ่ง + เศษขอบกรอบกล้องสีอ่อน (ไม่นับเป็นลายสี) → ไล่ลบพิกเซลที่สว่าง/มืดต่างพื้นมาก ที่ต่อจากขอบช่องภายใน 2.5 มม. */
          var bgs = bg3[0] + bg3[1] + bg3[2], DKN = 2.5 * TXS, dk = function (k) { var x = k % cw, y = (k - x) / cw, s = src3[k * 4] + src3[k * 4 + 1] + src3[k * 4 + 2], b = plane3(x, y, 0) + plane3(x, y, 1) + plane3(x, y, 2); return s < b * .6 || s > b * 1.18; }, dst = [];
          var dseed = function (x, y) { var k = y * cw + x; if (!MK[k] && dk(k)) { MK[k] = 2; dst.push(k); } };
          for (xx3 = 0; xx3 < cx2; xx3++) dseed(xx3, cr);
          if (cx2 < cw) for (yy3 = 0; yy3 < cr; yy3++) dseed(cx2, yy3);
          while (dst.length) {
            var dk3 = dst.pop(), dx3 = dk3 % cw, dy3 = (dk3 - dx3) / cw;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = dx3 + d[0], ny = dy3 + d[1]; if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || (ny < cr && nx < cx2) || (ny >= cr + DKN) || (ny < cr && nx >= cx2 + DKN)) return; dseed(nx, ny); });
          }
          /* ขยายมาสก์ก้อนลายกลับ 2 (ที่กัดไป) + 4 พิกเซล (ขอบภาพร้านเบลอ — น้อยกว่านี้เหลือเงาขอบลูกเป็นวงจาง ๆ) */
          var MK2 = MK.slice();
          for (yy3 = 0; yy3 < Math.min(ch, LIM + 6); yy3++) for (xx3 = 0; xx3 < cw; xx3++) if (MK[yy3 * cw + xx3] === 2) for (var dy = -6; dy <= 6; dy++) for (var dx = -6; dx <= 6; dx++) { var ex = xx3 + dx, ey = yy3 + dy; if (ex >= 0 && ey >= 0 && ex < cw && ey < ch && !MK2[ey * cw + ex]) MK2[ey * cw + ex] = 3; }
          for (q3 = 0; q3 < NN; q3++) if (MK2[q3]) {
            var px3 = q3 % cw, py3 = (q3 - px3) / cw, tl = TL3(px3, py3), ks = (tl[1] * cw + tl[0]) * 4, kd = q3 * 4;
            for (var c4 = 0; c4 < 3; c4++) o[kd + c4] = Math.max(0, Math.min(255, src3[ks + c4] - plane3(tl[0], tl[1], c4) + plane3(px3, py3, c4)));
            o[kd + 3] = 255;
          }
          /* แสงในภาพไม่ใช่ระนาบเป๊ะ → ที่ขอบ cx (ลายเติม | ภาพเดิม) เห็นรอยสว่าง/มืดต่างกันเป็นแนวตั้ง: วัดผลต่างสีพื้นสองฝั่งทีละแถว (เฉลี่ยเลื่อน 6 มม.) แล้วชดเชยในลายเติม จางหายใน 15 มม. */
          if (cx2 < cw) {
            var W3 = 2 * TXS, DD = [], dsm = [];
            for (yy3 = 0; yy3 < cr; yy3++) {
              var sa = [0, 0, 0], na = 0, sbb = [0, 0, 0], nbb = 0;
              for (xx3 = cx2 + 2; xx3 < Math.min(cw, cx2 + W3); xx3++) { var kq = yy3 * cw + xx3; if (PN3[kq] || dk(kq) || MK2[kq]) continue; for (var c6 = 0; c6 < 3; c6++) sa[c6] += src3[kq * 4 + c6]; na++; }
              for (xx3 = Math.max(0, cx2 - W3); xx3 < cx2 - 2; xx3++) { var kr = yy3 * cw + xx3, kd2 = kr * 4; if (o[kd2] + o[kd2 + 1] + o[kd2 + 2] < bgs * .6) continue; /* ข้ามจุดดำในลายเติม */ for (var c7 = 0; c7 < 3; c7++) sbb[c7] += o[kd2 + c7]; nbb++; }
              DD.push(na && nbb ? [sa[0] / na - sbb[0] / nbb, sa[1] / na - sbb[1] / nbb, sa[2] / na - sbb[2] / nbb] : null);
            }
            for (yy3 = 0; yy3 < cr; yy3++) { var acc = [0, 0, 0], an = 0; for (var j3 = Math.max(0, yy3 - 3 * TXS); j3 < Math.min(cr, yy3 + 3 * TXS); j3++) if (DD[j3]) { acc[0] += DD[j3][0]; acc[1] += DD[j3][1]; acc[2] += DD[j3][2]; an++; } dsm.push(an ? [acc[0] / an, acc[1] / an, acc[2] / an] : [0, 0, 0]); }
            var FW = 15 * TXS;
            for (yy3 = 0; yy3 < cr; yy3++) for (xx3 = Math.max(0, cx2 - FW); xx3 < cx2; xx3++) { var wf = 1 - (cx2 - xx3) / FW, kf2 = (yy3 * cw + xx3) * 4; for (var c8 = 0; c8 < 3; c8++) o[kf2 + c8] = Math.max(0, Math.min(255, o[kf2 + c8] + dsm[yy3][c8] * wf)); }
          }
          /* ขอบมาสก์นุ่ม 1 พิกเซล — เฉลี่ยกับเพื่อนบ้านที่ไม่ได้เติม (ห้ามเฉลี่ยกับพิกเซลเดิมตรงนั้น = กรอบกล้องในภาพโผล่เป็นเส้น) */
          for (q3 = cw; q3 < NN - cw; q3++) if (MK2[q3]) { var nb = !MK2[q3 - 1] ? q3 - 1 : !MK2[q3 + 1] ? q3 + 1 : !MK2[q3 - cw] ? q3 - cw : !MK2[q3 + cw] ? q3 + cw : -1; if (nb >= 0) for (var c5 = 0; c5 < 3; c5++) o[q3 * 4 + c5] = (o[q3 * 4 + c5] * 2 + o[nb * 4 + c5]) / 3; }
        }
        /* ขอบขวาของช่องที่ปะแบบสะท้อน: ไล่ผสมออกไปทางขวา 3 มม. (ฝั่งที่เป็นลายเดิม ไม่ใช่ฝั่งกล้อง) — ไม่งั้นเห็นเส้นตรงแนวตั้งตัดลาย */
        if ((S.fill === 'mirror' || S.fill === 'shift') && cx2 < cw) for (y = 0; y < cr; y++) for (x = cx2; x < Math.min(cw, cx2 + 3 * TXS); x++) {
          var tf = (x - cx2) / (3 * TXS), nf = (y * cw + x) * 4, mf2 = (Math.min(ch - 1, S.fill === 'shift' && y < cr - 3 * TXS ? y + cr : 2 * cr - y) * cw + x) * 4;
          for (var cf = 0; cf < 3; cf++) o[nf + cf] = o[mf2 + cf] * (1 - tf) + o[nf + cf] * tf;
        }
      }
      if (S.tp2) {   /* ปะ "หลัง" เติมช่องกล้อง [x0, y0, x1, y1, dx, dy] — แทนโลโก้ที่ fill: 'mirror' สะท้อนขึ้นไปในช่อง (CaseClub: โลโก้ CASE ▣ CLUB ใต้เส้น cut ขวา) ด้วยลายช่วงอื่น · ขอบไล่ผสม 2 มม. */
        var s2 = o.slice(), f2 = 2 * TXS;
        S.tp2.forEach(function (r) {
          var X0 = Math.round(r[0] * cw), Y0 = Math.round(r[1] * ch), X1 = Math.round(r[2] * cw), Y1 = Math.round(r[3] * ch), DX = Math.round(r[4] * cw), DY = Math.round(r[5] * ch);
          for (var y = Y0; y < Y1; y++) for (var x = X0; x < X1; x++) {
            var e = Math.min(1, X0 <= 0 ? 1 : (x - X0) / f2, Y0 <= 0 ? 1 : (y - Y0) / f2, X1 >= cw ? 1 : (X1 - x) / f2, Y1 >= ch ? 1 : (Y1 - y) / f2);
            var n = (y * cw + x) * 4, m = (Math.max(0, Math.min(ch - 1, y + DY)) * cw + Math.max(0, Math.min(cw - 1, x + DX))) * 4;
            for (var c = 0; c < 3; c++) o[n + c] = s2[m + c] * e + s2[n + c] * (1 - e);
          }
        });
      }
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; cv.getContext('2d').putImageData(new ImageData(o, cw, ch), 0, 0);
      return cv.toDataURL(S.key || S.fill === 'clear' ? 'image/png' : 'image/jpeg', .9);
    });
  }
  /* คืนค่า <image> ทันที — ถ้ายังไม่มีในแคชจะสร้างเบื้องหลังแล้วใส่ href ให้ทุกภาพที่ใช้แผ่นเดียวกัน */
  function shotImg(S, x, y, W, H) {
    var key = JSON.stringify(S) + '|' + W.toFixed(2) + '|' + H.toFixed(2), id = 'tx' + (key.length + ':' + key.split('').reduce(function (a, c) { return (a * 31 + c.charCodeAt(0)) | 0; }, 7));
    if (!TX[id]) TX[id] = buildTex(S, W, H).then(function (u) { TX[id].u = u; document.querySelectorAll('image[data-tx="' + id + '"]').forEach(function (e) { e.setAttribute('href', u); }); }, function () {});
    return '<image data-tx="' + id + '" href="' + (TX[id].u || '') + '" x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(W) + '" height="' + f2(H) + '" preserveAspectRatio="none"/>';
  }

  /* ---------- ลายพิมพ์/การ์ตูนบนหลังเคส (look.art · ทับเฉพาะสีด้วย cols[i][6]) ----------
     วาดเป็น มม. บนแผ่นหลัง "ใต้" ชั้นแสงของเคส (แสงฟุ้ง เงา เส้นแสงสะท้อนทับลาย เหมือนพิมพ์ใต้ผิวเคสจริง)
     ลายซ้ำ (จุด หัวใจ มะเขือเทศ แมว หมี) ปูด้วยระยะคงที่เป็น มม. → ลายขนาดเท่าของจริงทุกขนาดเครื่อง
     ลายภาพเดียว (มาสคอต สติกเกอร์ หัวใจพิกเซล) วางตามสัดส่วนเครื่อง · ตัวละครทั้งหมดวาดขึ้นเองแบบเรียบง่าย ไม่ลอกตัวการ์ตูนลิขสิทธิ์
     k: dots (c r gx gy) · hearts (c s gx gy rot) · tomato · cats (acc bow) · bears · pix · bowheart · mascot (top m f) · stickers · wave = ผิวคลื่นเงา */
  var f2 = function (v) { return +(+v).toFixed(2); };
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function heartP(x, y, s) {
    var p = function (a, b) { return f2(x + a * s) + ' ' + f2(y + b * s); };
    return 'M' + p(0, .42) + 'C' + p(-.06, .36) + ' ' + p(-.5, .12) + ' ' + p(-.5, -.12) + 'C' + p(-.5, -.38) + ' ' + p(-.2, -.46) + ' ' + p(0, -.22) +
      'C' + p(.2, -.46) + ' ' + p(.5, -.38) + ' ' + p(.5, -.12) + 'C' + p(.5, .12) + ' ' + p(.06, .36) + ' ' + p(0, .42) + 'Z';
  }
  function starP(x, y, r, n, ri) {
    n = n || 5; ri = ri || .45; var d = '';
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * ri : r; d += (i ? 'L' : 'M') + f2(x + rr * Math.cos(a)) + ' ' + f2(y + rr * Math.sin(a)); }
    return d + 'Z';
  }
  /* ปูลายแบบแถวเหลื่อม (แถวคี่เลื่อนครึ่งช่อง) ให้คลุมเกินขอบเครื่องเล็กน้อย */
  function tile(w, h, gx, gy, fn) {
    var o = '', r = 0;
    for (var y = gy * .45; y < h + gy; y += gy, r++) for (var x = (r % 2 ? gx / 2 : 0) - gx * .25; x < w + gx; x += gx) o += fn(x, y, r);
    return o;
  }
  /* สติกเกอร์นูน 3D: เงาตก → เนื้อ (ขอบเข้ม) → ไฮไลต์ซ้ายบน */
  function puff(d, c, U, ex) {
    return '<path d="' + d + '" fill="#000" opacity=".28" transform="translate(.35 .5)" filter="' + U('b2') + '"' + (ex || '') + '/>' +
      '<path d="' + d + '" fill="' + c + '" stroke="' + dn(c, .22) + '" stroke-width=".22"' + (ex || '') + '/>' +
      '<path d="' + d + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".55" transform="translate(-.18 -.24)" filter="' + U('b2') + '"' + (ex || '') + '/>';
  }
  var circ = function (x, y, r) { return 'M' + f2(x - r) + ' ' + f2(y) + 'a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(2 * r) + ' 0a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(-2 * r) + ' 0Z'; };
  var ell = function (x, y, rx, ry) { return 'M' + f2(x - rx) + ' ' + f2(y) + 'a' + f2(rx) + ' ' + f2(ry) + ' 0 1 0 ' + f2(2 * rx) + ' 0a' + f2(rx) + ' ' + f2(ry) + ' 0 1 0 ' + f2(-2 * rx) + ' 0Z'; };
  /* ดอกไม้นูน 5 กลีบ */
  function flower(x, y, r, c, mid, U) {
    var d = '';
    for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; d += circ(x + r * .52 * Math.cos(a), y + r * .52 * Math.sin(a), r * .5); }
    return puff(d, c, U) + puff(circ(x, y, r * .33), mid, U);
  }
  /* แมวดำนอน/นั่ง (หน่วย ≈ มม. ยาว ~10) */
  function cat(x, y, s, rot, c, eye) {
    return '<g transform="translate(' + f2(x) + ' ' + f2(y) + ') rotate(' + f2(rot) + ') scale(' + f2(s) + ')">' +
      '<path d="M4.3 1.1C6.6 .6 6.8-2.1 5.3-2.8" fill="none" stroke="' + c + '" stroke-width="1" stroke-linecap="round"/>' +
      '<ellipse cx="1" cy="1.2" rx="3.7" ry="2.3" fill="' + c + '"/><circle cx="-2.7" cy="-.7" r="2.1" fill="' + c + '"/>' +
      '<path d="M-4.6-1.5L-4.5-4.1L-3.1-2.6ZM-2.3-2.7L-1-4.1L-.8-1.5Z" fill="' + c + '" stroke="' + c + '" stroke-width=".3" stroke-linejoin="round"/>' +
      '<ellipse cx="-1.6" cy="3.3" rx=".9" ry=".55" fill="' + c + '"/><ellipse cx="2.6" cy="3.3" rx=".9" ry=".55" fill="' + c + '"/>' +
      '<ellipse cx="-3.5" cy="-.7" rx=".42" ry=".5" fill="' + eye + '"/><ellipse cx="-1.95" cy="-.7" rx=".42" ry=".5" fill="' + eye + '"/>' +
      '<ellipse cx="-3.45" cy="-.68" rx=".12" ry=".34" fill="#111"/><ellipse cx="-1.9" cy="-.68" rx=".12" ry=".34" fill="#111"/></g>';
  }
  /* โบว์ริบบิ้น */
  function bow(x, y, s, c) {
    return '<g transform="translate(' + f2(x) + ' ' + f2(y) + ') scale(' + f2(s) + ')" fill="' + c + '" stroke="' + dn(c, .25) + '" stroke-width=".18" stroke-linejoin="round">' +
      '<path d="M-.3 .2L-1.1 2.2L-.5 2L-.1 2.5ZM.3 .2L1.1 2.2L.5 2L.1 2.5Z"/><path d="M0 0C-.8-1.3-2.3-1.2-2.2 0C-2.3 1.2-.8 1.3 0 0ZM0 0C.8-1.3 2.3-1.2 2.2 0C2.3 1.2 .8 1.3 0 0Z"/><circle r=".45"/></g>';
  }
  /* หมีเท็ดดี้ตัวเล็ก */
  function teddy(x, y, s, c) {
    var o = dn(c, .35), l = up(c, .18);
    return '<g transform="translate(' + f2(x) + ' ' + f2(y) + ') scale(' + f2(s) + ')" stroke="' + o + '" stroke-width=".16">' +
      '<circle cx="-1.25" cy="-3.6" r=".62" fill="' + c + '"/><circle cx="1.25" cy="-3.6" r=".62" fill="' + c + '"/>' +
      '<ellipse cy=".4" rx="1.7" ry="1.9" fill="' + c + '"/><ellipse cx="-1.8" cy="0" rx=".55" ry=".8" fill="' + c + '" transform="rotate(25 -1.8 0)"/><ellipse cx="1.8" cy="0" rx=".55" ry=".8" fill="' + c + '" transform="rotate(-25 1.8 0)"/>' +
      '<ellipse cx="-.9" cy="2.2" rx=".7" ry=".5" fill="' + c + '"/><ellipse cx=".9" cy="2.2" rx=".7" ry=".5" fill="' + c + '"/>' +
      '<circle cy="-2.4" r="1.75" fill="' + c + '"/><ellipse cy="-1.85" rx=".7" ry=".5" fill="' + l + '" stroke="none"/>' +
      '<circle cx="-.65" cy="-2.65" r=".2" fill="#2b1d12" stroke="none"/><circle cx=".65" cy="-2.65" r=".2" fill="#2b1d12" stroke="none"/><ellipse cy="-2" rx=".28" ry=".2" fill="#2b1d12" stroke="none"/></g>';
  }
  /* มาสคอตหน้าบึ้ง (หมี หมา เป็ด กระต่าย) — ตัวละครวาดเองแบบเส้นหนาสไตล์สติกเกอร์ */
  function mascot(m, cx, cy, S, f, ol) {
    var o = '', dk = lum(f) < 70, mz = dk ? '#9a9ca2' : up(f, .2), sw = f2(S * .017), st = ' stroke="' + ol + '" stroke-width="' + sw + '" stroke-linejoin="round"';
    var P2 = function (a, b) { return f2(cx + a * S) + ' ' + f2(cy + b * S); };
    var body = 'M' + P2(-.66, 1.3) + 'C' + P2(-.64, .6) + ' ' + P2(-.42, .36) + ' ' + P2(0, .36) + 'C' + P2(.42, .36) + ' ' + P2(.64, .6) + ' ' + P2(.66, 1.3) + 'Z';
    o += '<path d="' + body + '"' + st + ' fill="' + f + '"/>';
    if (m === 'dog') o += '<path d="M' + P2(-.34, .44) + 'Q' + P2(0, .56) + ' ' + P2(.34, .44) + '" fill="none" stroke="#c9472f" stroke-width="' + f2(S * .07) + '" stroke-linecap="round"/><path d="' + circ(cx, cy + S * .55, S * .055) + '" fill="#f2c14e"' + st + '/>';
    if (m === 'bear') [-1, 1].forEach(function (s) { o += '<path d="' + circ(cx + s * S * .36, cy - S * .33, S * .14) + '" fill="' + f + '"' + st + '/><path d="' + circ(cx + s * S * .36, cy - S * .33, S * .07) + '" fill="' + mz + '"/>'; });
    if (m === 'bunny') [-1, 1].forEach(function (s) { o += '<g transform="rotate(' + s * 12 + ' ' + f2(cx + s * S * .2) + ' ' + f2(cy - S * .5) + ')"><path d="' + ell(cx + s * S * .2, cy - S * .62, S * .1, S * .27) + '" fill="' + f + '"' + st + '/><path d="' + ell(cx + s * S * .2, cy - S * .6, S * .045, S * .18) + '" fill="' + up(f, .12) + '"/></g>'; });
    o += '<path d="' + ell(cx, cy, S * .5, S * .42) + '" fill="' + f + '"' + st + '/>';
    if (m === 'dog') [-1, 1].forEach(function (s) { o += '<g transform="rotate(' + (-s * 16) + ' ' + f2(cx + s * S * .46) + ' ' + f2(cy - S * .2) + ')"><path d="' + ell(cx + s * S * .47, cy - S * .02, S * .12, S * .25) + '" fill="' + dn(f, .25) + '"' + st + '/></g>'; });
    if (m === 'duck') {
      for (var i = 0; i < 5; i++) { var a = i * 2 * Math.PI / 5; o += '<path d="' + circ(cx - S * .2 + S * .06 * Math.cos(a), cy - S * .38 + S * .06 * Math.sin(a), S * .05) + '" fill="#fff"' + st + '/>'; }
      o += '<path d="' + circ(cx - S * .2, cy - S * .38, S * .035) + '" fill="#f6c945"/>';
      o += '<path d="' + ell(cx, cy + S * .16, S * .27, S * .1) + '" fill="#f29a38"' + st + '/><path d="M' + P2(-.22, .16) + 'Q' + P2(0, .2) + ' ' + P2(.22, .16) + '" fill="none" stroke="' + ol + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
    } else {
      o += '<path d="' + ell(cx, cy + S * .14, S * .2, S * .14) + '" fill="' + mz + '"' + st + '/>' +
        '<path d="' + ell(cx, cy + S * .07, S * .075, S * .05) + '" fill="' + ol + '"/>' +
        '<path d="M' + P2(-.08, .22) + 'Q' + P2(0, .17) + ' ' + P2(.08, .22) + '" fill="none" stroke="' + ol + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
    }
    /* ตาครึ่งปิด (หน้าบึ้ง) + คิ้วเฉียง */
    [-1, 1].forEach(function (s) {
      var ex = cx + s * S * .2, ey = cy - S * .06, rx = S * .085, ry = S * .07;
      o += '<path d="' + ell(ex, ey, rx, ry) + '" fill="#fff"' + st + '/><path d="' + circ(ex + s * S * .01, ey + S * .025, S * .035) + '" fill="' + ol + '"/>' +
        '<path d="M' + f2(ex - rx) + ' ' + f2(ey + ry * .1) + 'A' + f2(rx) + ' ' + f2(ry) + ' 0 0 1 ' + f2(ex + rx) + ' ' + f2(ey + ry * .1) + 'Z" fill="' + f + '"' + st + '/>' +
        '<path d="M' + f2(ex + s * S * .11) + ' ' + f2(ey - S * .13) + 'L' + f2(ex - s * S * .07) + ' ' + f2(ey - S * .1) + '" stroke="' + ol + '" stroke-width="' + f2(S * .026) + '" stroke-linecap="round"/>';
    });
    return o;
  }
  /* หัวใจพิกเซล (ขอบชมพู ไส้เหลือง ไฮไลต์ขาว) */
  var PIX = ['..XXX.XXX..', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..XXXXXXX..', '...XXXXX...', '....XXX....', '.....X.....'];
  function printArt(A, P, w, h, bc, U) {
    var o = '', rnd = seeded(A.seed || 11), ink = A.c || '#1d1d1f';
    if (A.k === 'dots') o += tile(w, h, A.gx || 8, A.gy || 7, function (x, y) { return '<circle cx="' + f2(x) + '" cy="' + f2(y) + '" r="' + (A.r || 1.2) + '" fill="' + ink + '"/>'; });
    else if (A.k === 'hearts') o += tile(w, h, A.gx || 10, A.gy || 9, function (x, y) { return '<path d="' + heartP(0, 0, A.s || 5) + '" fill="' + ink + '" transform="translate(' + f2(x + (rnd() - .5) * 1.4) + ' ' + f2(y + (rnd() - .5) * 1.2) + ') rotate(' + f2((rnd() - .5) * 2 * (A.rot || 20)) + ')"/>'; });
    else if (A.k === 'tomato') {
      /* ภาพร้าน: ลูกใหญ่ Ø ~9–10 วางเบียดแบบมือวาด (ขนาด/ตำแหน่งไม่เท่ากัน) มีลูกผ่าครึ่งเห็นเมล็ดแทรก · เว้นแถบล่าง ~13 มม. ให้เม็ดเหลือง */
      o += tile(w, h - 13, 12.5, 10.5, function (x, y, r) {
        var tx = x + (rnd() - .5) * 2.2, ty = y + (rnd() - .5) * 1.8, tr = 4.4 + rnd() * .9, cut = rnd() < .22, blue = rnd() < .3;
        if (ty + tr > h - 11.5) return '';
        var s ='<circle cx="' + f2(x + 6.2) + '" cy="' + f2(y + 5.4) + '" r=".45" fill="#3d8b3d"/><circle cx="' + f2(tx) + '" cy="' + f2(ty) + '" r="' + f2(tr) + '" fill="#df3a36"/>';
        if (cut) {   // ลูกผ่าครึ่ง: เนื้อในแดงอ่อน + ช่องเมล็ด
          s += '<circle cx="' + f2(tx) + '" cy="' + f2(ty) + '" r="' + f2(tr * .78) + '" fill="#f0675d"/>';
          for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + .6; s += '<ellipse cx="' + f2(tx + tr * .42 * Math.cos(a)) + '" cy="' + f2(ty + tr * .42 * Math.sin(a)) + '" rx="' + f2(tr * .2) + '" ry="' + f2(tr * .13) + '" fill="#f7d66a" transform="rotate(' + f2(a * 57.3) + ' ' + f2(tx + tr * .42 * Math.cos(a)) + ' ' + f2(ty + tr * .42 * Math.sin(a)) + ')"/>'; }
          return s;
        }
        return s + '<path d="' + circ(tx + .7, ty + .8, tr * .85) + '" fill="#b92a28" opacity=".35"/>' +
          '<ellipse cx="' + f2(tx - tr * .4) + '" cy="' + f2(ty - tr * .35) + '" rx="1.3" ry=".7" fill="#fff" opacity=".45" transform="rotate(-35 ' + f2(tx - tr * .4) + ' ' + f2(ty - tr * .35) + ')"/>' +
          '<path d="' + starP(tx, ty - tr * .15, tr * .48, 5, .4) + '" fill="' + (blue ? '#3fa7c9' : '#3d8b3d') + '" stroke="' + (blue ? '#2b7f9c' : '#2c6a2c') + '" stroke-width=".2" stroke-linejoin="round"/>';
      });
      for (var x = 4; x < w; x += 6.2) o += '<rect x="' + f2(x) + '" y="' + f2(h - 10) + '" width="1.8" height="4.6" rx=".9" fill="#f3d649"/>';
    } else if (A.k === 'cats') {
      var acc = A.acc || '#f4d35e';
      /* ภาพร้าน: แมวตัวใหญ่ ~12–15 มม. เบียดกันหลายท่า */
      o += tile(w, h, 26, 19, function (x, y) {
        return cat(x + (rnd() - .5) * 3, y + (rnd() - .5) * 2, 1.2 + rnd() * .3, (rnd() - .5) * 50, A.cc || '#141416', acc) +
          (A.bow ? bow(x + 13, y + 8, 1.3, acc) : '<path d="M' + f2(x + 13) + ' ' + f2(y + 4.5) + 'a3.4 3.4 0 1 0 2.7 5.2a2.6 2.6 0 1 1-2.7-5.2Z" fill="' + acc + '"/>') +
          '<path d="' + starP(x + 6 + rnd() * 4, y + 11, 1.4) + '" fill="' + acc + '"/>';
      });
    } else if (A.k === 'bears') {
      /* ภาพร้าน: หมีสูง ~7 มม. ห่าง ~18 มม. โบว์เล็กแทรกบางช่อง (ไม่ถี่เท่าหมี) */
      o += tile(w, h, 19, 16, function (x, y, r) {
        return teddy(x + (rnd() - .5) * 3, y + (rnd() - .5) * 3, 1.1, '#d7a466') + (rnd() < .6 ? bow(x + 9.5, y + 8 + (rnd() - .5) * 3, .85, r % 2 ? '#f2a3b6' : '#9cc4ec') : '');
      });
      var ly = h - 15;
      o += '<rect x="' + f2(w / 2 - 9) + '" y="' + f2(ly) + '" width="18" height="4.6" rx="2.3" fill="#fff" stroke="#f0b6c4" stroke-width=".3"/><text x="' + f2(w / 2) + '" y="' + f2(ly + 3.2) + '" text-anchor="middle" font-size="2.6" font-style="italic" font-family="Georgia,serif" fill="#e07a98">Happy Day</text>';
    } else if (A.k === 'pix') {
      var cs = Math.min(4, (w - 18) / 11), x0 = w / 2 - cs * 5.5, y0 = h * .5 - cs * 5;
      /* แถบเมฆพาสเทลด้านล่าง */
      [['#a9d3f5', .78], ['#f7b9d2', .84], ['#bfe6c9', .9]].forEach(function (b) { var y = h * b[1]; o += '<path d="M-2 ' + f2(y) + 'Q' + f2(w * .25) + ' ' + f2(y - 4) + ' ' + f2(w * .5) + ' ' + f2(y) + 'T' + f2(w + 2) + ' ' + f2(y) + 'V' + f2(y + 5) + 'H-2Z" fill="' + b[0] + '" opacity=".85"/>'; });
      PIX.forEach(function (row, j) {
        for (var i = 0; i < row.length; i++) if (row[i] === 'X') {
          var edge = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(function (d) { var r2 = PIX[j + d[1]]; return !r2 || r2[i + d[0]] !== 'X'; });
          var hl = (j === 2 && (i === 2 || i === 3)) || (j === 3 && i === 2);
          o += '<rect x="' + f2(x0 + i * cs) + '" y="' + f2(y0 + j * cs) + '" width="' + f2(cs + .05) + '" height="' + f2(cs + .05) + '" fill="' + (edge ? '#f07fb0' : hl ? '#fffdf0' : '#fbe86a') + '"/>';
        }
      });
      for (var g = 0; g < 14; g++) o += '<path d="' + starP(4 + rnd() * (w - 8), 6 + rnd() * (h - 12), .7 + rnd() * .5, 4, .35) + '" fill="#fff" opacity=".9"/>';
    } else if (A.k === 'bowheart') {
      var hs = w * .74, hy = h * .53;
      o += '<path d="' + heartP(w / 2, hy, hs) + '" fill="#fff" opacity=".45"/><path d="' + heartP(w / 2, hy, hs) + '" fill="none" stroke="#aeb3bd" stroke-width="1.1" stroke-dasharray=".01 1.7" stroke-linecap="round"/>' +
        '<path d="' + heartP(w / 2, hy, hs * .9) + '" fill="none" stroke="#c4c8d0" stroke-width=".3"/>' + bow(w / 2, hy - hs * .2, 3.4, '#fbfbfc');
      for (var q = 0; q < 26; q++) o += '<circle cx="' + f2(2 + rnd() * (w - 4)) + '" cy="' + f2(h * .2 + rnd() * h * .78) + '" r="' + f2(.25 + rnd() * .35) + '" fill="#cfd2d9"/>';
    } else if (A.k === 'mascot') {
      o += '<rect x="-2" y="-2" width="' + (w + 4) + '" height="' + f2(h * .36 + 2) + '" fill="' + (A.top || '#4c8fe3') + '"/>';
      o += mascot(A.m || 'bear', w / 2, h * .67, w * .8, A.f || '#7a5236', '#2a211c');
    } else if (A.k === 'stickers') {
      var o0 = o.length, sz = 1.35;   // ภาพร้าน: สติกเกอร์ใหญ่เต็มหลัง (ดอกไม้ Ø ~18 มม.) — วางตามสัดส่วนแล้วขยายจากกลางหลังเครื่อง
      var T =function (x, y, s, c, t, rot) { return '<text x="' + f2(x) + '" y="' + f2(y) + '" text-anchor="middle" font-size="' + s + '" font-weight="900" font-family="\'Arial Rounded MT Bold\',\'Trebuchet MS\',sans-serif" fill="' + c + '" stroke="#fff" stroke-width=".7" paint-order="stroke" stroke-linejoin="round"' + (rot ? ' transform="rotate(' + rot + ' ' + f2(x) + ' ' + f2(y) + ')"' : '') + '>' + t + '</text>'; };
      o += T(w * .3, h * .37, 6, '#b88be6', 'Tulip', -6) + flower(w * .7, h * .36, 7, '#f6b3c4', '#fbd4dd', U);
      o += '<path d="M' + f2(w * .33) + ' ' + f2(h * .5) + 'V' + f2(h * .61) + '" stroke="#4caf50" stroke-width="1.6" stroke-linecap="round"/>' +
        puff(ell(w * .28, h * .58, 2.6, 1.3), '#5cc05f', U, ' transform="rotate(-30 ' + f2(w * .28) + ' ' + f2(h * .58) + ')"') + flower(w * .33, h * .49, 6.4, '#ffd23f', '#f59a2e', U);
      o += T(w * .68, h * .5, 5.4, '#7fd3c0', 'Good') + T(w * .7, h * .56, 5.4, '#7fd3c0', 'Luck');
      o += '<path d="M' + f2(w * .5) + ' ' + f2(h * .47) + 'a4 4 0 0 1 8 0" fill="none" stroke="#f7a6c0" stroke-width=".8"/><path d="M' + f2(w * .5 + 1) + ' ' + f2(h * .47) + 'a3 3 0 0 1 6 0" fill="none" stroke="#9fd2f3" stroke-width=".8"/>';
      o += flower(w * .68, h * .71, 6.2, '#a9c6f2', '#f6b3c4', U);
      var bx = w * .32, by = h * .76;
      o += puff(circ(bx - 3.6, by - 3.6, 1.8) + circ(bx + 3.6, by - 3.6, 1.8) + ell(bx, by, 5.4, 4.6), '#c8915a', U) + '<path d="' + ell(bx, by + 1.4, 2.2, 1.6) + '" fill="#ecc896"/>' +
        '<circle cx="' + f2(bx - 2) + '" cy="' + f2(by - .6) + '" r=".55" fill="#2b1d12"/><circle cx="' + f2(bx + 2) + '" cy="' + f2(by - .6) + '" r=".55" fill="#2b1d12"/><ellipse cx="' + f2(bx) + '" cy="' + f2(by + .9) + '" rx=".7" ry=".5" fill="#2b1d12"/>' +
        puff('M' + f2(bx - 1) + ' ' + f2(by - 4.2) + 'L' + f2(bx + 2.2) + ' ' + f2(by - 9.5) + 'L' + f2(bx + 4.2) + ' ' + f2(by - 3.2) + 'Z', '#f59ab6', U);
      [[.2, .66], [.5, .62], [.82, .6], [.55, .82], [.18, .44], [.86, .44]].forEach(function (p, i) { o += '<rect x="' + f2(w * p[0]) + '" y="' + f2(h * p[1]) + '" width="2" height=".9" rx=".45" fill="' + ['#f6a04d', '#f7b9d2', '#9fd2f3'][i % 3] + '" transform="rotate(' + (i * 37 % 90 - 45) + ' ' + f2(w * p[0]) + ' ' + f2(h * p[1]) + ')"/>'; });
      o = o.slice(0, o0) + '<g transform="translate(' + f2(w / 2) + ' ' + f2(h * .56) + ') scale(' + sz + ') translate(' + f2(-w / 2) + ' ' + f2(-h * .56) + ')">' + o.slice(o0) + '</g>';
    }
    /* ผิวคลื่นนูนเงา (ภาพร้าน: ผิวเหมือนผ้าไหมยับ/ระลอกน้ำ ไม่ใช่ลายเส้นตรง) — สันคลื่นสั้นโค้ง S มุมสุ่ม: เงาร่อง → ไฮไลต์สัน → จุดแสงคม */
    if (A.wave) {
      /* สันกว้างนุ่ม (ไม่ใช่เส้นบาง) ห่าง ~15 มม. — เส้นบางถี่ดูเป็นหนอน ไม่เหมือนผิวนูน
         เบลอทั้งกลุ่มทีเดียว — เบลอทีละเส้น กรอบ filter ของเส้นแนวนอนเตี้ยมากจนตัดเงาเป็นสี่เหลี่ยม */
      var wr = seeded(29), wd = '';
      tile(w, h, 17, 13, function (x, y) {
        var cx = x + (wr() - .5) * 6, cy = y + (wr() - .5) * 5, a = (wr() - .5) * 1.2 + (wr() < .5 ? 0 : Math.PI / 2.3), L = 5 + wr() * 4, b = 1.2 + wr() * 1.2;
        var c = Math.cos(a), s = Math.sin(a), p = function (u, v) { return f2(cx + u * c - v * s) + ' ' + f2(cy + u * s + v * c); };
        var d = 'M' + p(-L, 0) + 'C' + p(-L / 2, -b * 2) + ' ' + p(L / 2, b * 2) + ' ' + p(L, 0);
        wd += '<path d="' + d + '"/>';
        return '';
      });
      o += '<g fill="none" stroke="#000" stroke-opacity=".13" stroke-width="4.6" stroke-linecap="round" filter="' + U('fz') + '"><g transform="translate(.9 1.5)">' + wd + '</g></g>' +
        '<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.4" stroke-linecap="round" filter="' + U('fz') + '">' + wd + '</g>' +
        '<g fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.3" stroke-linecap="round" filter="' + U('b3') + '"><g transform="translate(-.2 -.3)">' + wd + '</g></g>';
    }
    return o;
  }
  var swatchOf = function (look, c) { return look.edge ? c[2] : c[1]; };
  function caseSVG(P, look, col, u, fcol) {
    var w = P.w, h = P.h, R = P.R || (P.fr === 'uni' ? 10 : P.cam === 'air' ? 10.2 : 9.4), t = 1.6, Rc = R + t, pl = plate(P), ln = lenses(P, pl), K = kit('k' + u), U = K.U;
    var back = col[4] || look.back, bc = col[1] || '', ec = col[2] || '#cfd4da', clear = back === 'clear', dkB = back === 'solid' ? lum(bc) < 90 : back === 'smoke' || (back === 'frost' && bc && lum(bc) < 90);
    /* col[7] = สีล่างของเคสไล่สี (บน = col[1]) · look.gs = [จุดเริ่ม, จุดจบ] ของช่วงไล่ (สัดส่วนความสูง) · look.wg = ผนังเคสไล่สีตาม */
    var g2 = col[7] || '', gs = look.gs || [.3, .7];
    var my = look.my ? h * look.my : magY(P), out = '';   // look.my = ตำแหน่งกลางวงแม่เหล็กของเคสนั้น (สัดส่วนความสูง) ถ้าภาพร้านไม่ตรงค่ามาตรฐาน
    /* รูกล้อง */
    var hp, hb, HR = [];   // HR = รูปร่างจริงของช่องกล้อง Galaxy: [x, y, r] วงกลม · [x0, y0, x1, y1] สี่เหลี่ยม (ช่องตัว L = สองสี่เหลี่ยมซ้อน) — ใช้ดันวงแม่เหล็ก · hb = กรอบของรู [x, y, w, h, รัศมีมุมบน, รัศมีมุมล่าง] — ขอบเคสด้านบนต้องต่อเนื่องทุกรุ่น (รูไม่เปิดทะลุขอบ)
    if (P.g) {   // Galaxy: รูกลมรายเลนส์ (+ แฟลช) · S26 มีรูแคปซูลคลุมกลุ่มเลนส์ — รวมเป็น path เดียว (nonzero → ซ้อนกันเป็นรูเดียว) เพื่อใช้กับ mask / กรอบกล้อง
      var G = P.g, hs = '', HR = [], bx0 = 1e9, by0 = 1e9, bx1 = 0, by1 = 0, ext = function (x, y, r) { bx0 = Math.min(bx0, x - r); by0 = Math.min(by0, y - r); bx1 = Math.max(bx1, x + r); by1 = Math.max(by1, y + r); };
      if (G.isl && !look.grp) { var I = G.isl; hs += rrp(I[0] - 1.1, I[1] - 1.1, I[2] + 2.2, I[3] + 2.2, I[4] + 1.1, I[4] + 1.1); ext(I[0] - 1.1, I[1] - 1.1, 0); ext(I[0] + I[2] + 1.1, I[1] + I[3] + 1.1, 0); }
      if (look.grp) {   // grp: เคสจริงเจาะ "ช่องกล้องรวม" ยกขอบ (ภาพร้าน) — Ultra = รูปตัว L คลุมเลนส์ใหญ่ 3 + เลนส์เล็ก 2 + แฟลช · รุ่นอื่น = สี่เหลี่ยมมนคลุมแถวเลนส์
        var mxr = Math.max.apply(null, G.L.map(function (c) { return c[2]; })), bigL = G.L.filter(function (c) { return c[2] > mxr * .8; }), smL = G.L.filter(function (c) { return c[2] <= mxr * .8; }), pd = look.gp || 1.5;
        if (G.isl) bigL = [[G.isl[0] + G.isl[2] / 2, G.isl[1] + G.isl[3] / 2, 0]].concat([[G.isl[0], G.isl[1], 0], [G.isl[0] + G.isl[2], G.isl[1] + G.isl[3], 0]]), pd = look.gp || 1.1;   // S26 / S26 Ultra: ช่องรวมคลุมแคปซูลยกสูงทั้งก้อน
        var X0 = Math.min.apply(null, bigL.map(function (c) { return c[0] - c[2]; })) - pd, X1 = Math.max.apply(null, bigL.map(function (c) { return c[0] + c[2]; })) + pd,
          Y0 = Math.min.apply(null, bigL.map(function (c) { return c[1] - c[2]; })) - pd, Y1 = Math.max.apply(null, bigL.map(function (c) { return c[1] + c[2]; })) + pd;
        if (look.grp === 'box') {   /* grp 'box' = ช่องสี่เหลี่ยมมนเดียวคลุมเลนส์ทุกตัว+แฟลช (MOCOME: หน้าต่างกล้องใหญ่ขอบยกหนา) */
          G.L.concat([G.flash]).forEach(function (c) { X0 = Math.min(X0, c[0] - c[2] - pd); X1 = Math.max(X1, c[0] + c[2] + pd); Y0 = Math.min(Y0, c[1] - c[2] - pd); Y1 = Math.max(Y1, c[1] + c[2] + pd); });
          var rb = look.gr || (G.isl ? G.isl[4] + pd : 5);
          hs += rpoly([[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], [rb, rb, rb, rb]); HR.push([X0, Y0, X1, Y1]); ext(X0, Y0, 0); ext(X1, Y1, 0);
        } else if (smL.length) {
          var X2 =Math.max.apply(null, smL.map(function (c) { return c[0] + c[2]; })) + pd, Y2 = Math.max.apply(null, smL.map(function (c) { return c[1] + c[2]; })) + pd;
          var ri = G.isl ? G.isl[4] + pd : 3.4;   // แคปซูลมุมมน → ช่องของเคสโค้งตามแคปซูล
          hs += rpoly([[X0, Y0], [X2, Y0], [X2, Y2], [X1, Y2], [X1, Y1], [X0, Y1]], [ri, 3.4, 3.4, 2, ri, ri]); HR.push([X0, Y0, X1, Y1], [X0, Y0, X2, Y2]); ext(X0, Y0, 0); ext(X2, Y2, 0); ext(X1, Y1, 0);
        } else {
          var rq = look.gr || (G.isl ? G.isl[4] + pd : 4);   // gr = รัศมีมุมของช่อง (ซิลิโคน: แคปซูลปลายมนเต็ม)
          hs += rpoly([[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], [rq, rq, rq, rq]); HR.push([X0, Y0, X1, Y1], [G.flash[0], G.flash[1], G.flash[2] + 1.3]); ext(X0, Y0, 0); ext(X1, Y1, 0);
          hs += circ(G.flash[0], G.flash[1], G.flash[2] + 1.3); ext(G.flash[0], G.flash[1], G.flash[2] + 1.3);
        }
      } else {
        G.L.forEach(function (c) { if (!G.isl || c[0] - c[2] > I[0] + I[2]) { HR.push([c[0], c[1], c[2] + 1.1]); hs += circ(c[0], c[1], c[2] + 1.1); ext(c[0], c[1], c[2] + 1.1); } });   // เลนส์ที่อยู่ในแคปซูลใช้รูแคปซูลแทน
        hs += circ(G.flash[0], G.flash[1], G.flash[2] + 1.3); ext(G.flash[0], G.flash[1], G.flash[2] + 1.3); HR.push([G.flash[0], G.flash[1], G.flash[2] + 1.3]);
      }
      if (G.isl && !look.grp) HR.push([I[0] - 1.1, I[1] - 1.1, I[0] + I[2] + 1.1, I[1] + I[3] + 1.1]);
      hp = hs; hb = [bx0, by0, bx1 - bx0, by1 - by0, 4, 4];
      /* slide (NILLKIN CamShield — ภาพร้านครอปเทียบ พ.ย. 2026): ช่องกล้องเป็นหน้าต่างสี่เหลี่ยมมนใหญ่ ซ้ายชิดกลุ่มเลนส์ ขวาถึง ~79% ของความกว้าง
         (ที่ว่างขวาของเลนส์คือที่จอดฝาสไลด์) — เห็นเลนส์ทุกตัว ไม่ใช่ช่องตัว L */
      if (look.slide) {
        var sX0 = bx0 - .6, sY0 = by0 - .6, sY1 = by1 + 1.2, sX1 = Math.min(w - 3.2, Math.max(w * .79, bx1 + w * .26));
        hp = rrp(sX0, sY0, sX1 - sX0, sY1 - sY0, 5, 5); hb = [sX0, sY0, sX1 - sX0, sY1 - sY0, 5, 5]; HR = [[sX0, sY0, sX1, sY1]];
      }
    }
    else if (P.cam === 'triwide') hb = [2.5, 2.5, w - 5, pl.h - 1.3, 7.5, 6.2];   // 17/18 Pro: รูใหญ่คลุมแถบกล้องทั้งแถบ (แถบเริ่มยกที่ ~3 มม. จากขอบ)
    else if (pl.wide) hb = [pl.x - .9, pl.y - .9, pl.w + 1.8, pl.h + 1.8, pl.r + .9, pl.r + .9];   // Air: แถบกล้องด้านบน
    else if (pl.pill) hb = [pl.x - 1.3, pl.y - 1.3, ln.flash[0] + ln.flash[2] + 1.8 - (pl.x - 1.3), pl.h + 2.6, pl.r + 1.3, pl.r + 1.3];   // 16/17: รูเดียวคลุมแคปซูล + แฟลช
    else hb = [pl.x - 1.4, pl.y - 1.4, pl.w + 2.8, pl.h + 2.8, pl.r + 1.4, pl.r + 1.4];
    /* cov = ฝาครอบกล้องแผ่นใหญ่เต็มความกว้างด้านบน (สัดส่วนความสูง) — ภาพร้าน LITE CHIC/ฝาสไลด์: แผ่นสีเงา ขอบชุบ เจาะรูเลนส์ ไม่ใช่แถบสีแบน */
    if (look.cov) { hb = [.7, .7, w - 1.4, h * look.cov - .7, R - .7, 4.5]; hp = rrp(hb[0], hb[1], hb[2], hb[3], hb[4], hb[5]); }
    /* win = ช่องกล้องเปิดโล่งเต็มความกว้างด้านบน (สัดส่วนความสูง) มีขอบสีหนารอบช่อง — ภาพร้าน Oxygendog ใส: เห็นกล้องเครื่องทั้งแถบบน */
    else if (look.win) { var wi = look.wi || 2.4; hb = [wi, wi, w - 2 * wi, h * look.win - wi, R - wi, 6]; hp = rrp(hb[0], hb[1], hb[2], hb[3], hb[4], hb[5]); }
    else if (!P.g) hp = rrp(hb[0], hb[1], hb[2], hb[3], hb[4], hb[5]);
    /* วง MagSafe/ห่วงต้องไม่ทับรูกล้อง — รุ่นกล้องแนวตั้งยาว (S26/S25) ดันวงลงให้พ้นขอบล่างรูกล้อง 2 มม.
       (ผู้ใช้ส่งภาพ พ.ย. 2026: Colnel / อะคริลิกขอบสีบน S26 วงชนกรอบกล้อง) */
    /* รอบ 2 (ผู้ใช้ทัก พ.ย. 2026 "MagSafe ติดทับกับกล้อง"): เดิมดันวงพ้นแค่ "เลนส์" → วงยังทับช่องกล้องรวมตัว L + กรอบยกของเคส (Galaxy เกือบทุกเคสแม่เหล็ก ทับ 3–8 มม.)
       ตอนนี้วัดกับรูปร่างช่องจริง (HR) + ครึ่งความหนากรอบ (lw/2) + ระยะเว้น 1 มม. · เคสภาพร้านที่ลบพื้น (shot.key) วาดวงเอง → ดันด้วย */
    var shK = look.shot || (col[6] && col[6].shot);
    if ((look.mag || look.ring) && !look.cov && !look.win && (!shK || shK.key)) {   // เคสภาพร้านทึบ: วงอยู่ในภาพแล้ว ไม่วาดใหม่
      var mro = (look.ring ? look.rgr || 21 : look.mr || 22.3) + (look.mw || 3.6) / 2, hbB = hb[1] + hb[3];   // ขอบชุบ mch อยู่ด้านในวง ไม่นับ
      var mgo = mro + (look.lw || 1.6) / 2 + 1;
      var needC = function (cx0, cy0, rc) { var dx = Math.abs(w / 2 - cx0), R2 = mgo + rc; if (dx < R2 && my - cy0 < Math.sqrt(R2 * R2 - dx * dx)) my = cy0 + Math.sqrt(R2 * R2 - dx * dx); };
      var needR = function (x0, y0, x1, y1) { var dx = Math.max(x0 - w / 2, 0, w / 2 - x1); if (dx < mgo && my - y1 < Math.sqrt(mgo * mgo - dx * dx)) my = y1 + Math.sqrt(mgo * mgo - dx * dx); };
      if (P.g) { ln.L.concat([ln.flash], ln.aux || []).forEach(function (c) { needC(c[0], c[1], c[2] + .5); }); HR.forEach(function (s) { if (s.length === 4) needR(s[0], s[1], s[2], s[3]); else needC(s[0], s[1], s[2]); }); }
      else needR(hb[0], hb[1], hb[0] + hb[2], hbB);
    }
    /* bw = ขอบเคสที่พับเข้ามาบนด้านหลัง (มม.) — เคสบัมเปอร์/ไฮบริดจริงพับเข้ามา 2–3 มม. (ภาพร้าน) · เคสซิลิโคนเรียบแทบไม่มี */
    caseSVG.geo = { my: my, hb: hb, HR: HR, L: ln.L.concat([ln.flash], ln.aux || []), w: w, h: h };   // เครื่องมือ QC: ตรวจวงแม่เหล็กชนกล้องทุกเคส×ทุกรุ่น (TryOn._geo)
    var bw = look.bw || .15;
    var outer = rrp(-t, -t, w + 2 * t, h + 2 * t, Rc, Rc), inner = rrp(bw, bw, w - 2 * bw, h - 2 * bw, R - bw, R - bw);
    var mg = col[5] || look.mag, mc = mg === 'faint' ? (dkB ? up(bc, look.mfd || .06) : dn(bc, look.mfd || .06)) : mg === 'edge' ? ec : mg, metal = dkB || clear ? '#3b3b3f' : '#c8c8cb';
    if (look.ring && col[6] && col[6].ring) metal = col[6].ring;   /* สีห่วงขาตั้งรายสี (เคสเกราะ: ห่วงสีเดียวกับเคส) */
    else if (look.ring) metal = typeof look.ring === 'string' ? look.ring : bc && lum(bc) > 90 ? '#9a948c' : '#6f7176';
    if (look.cam === 'metal' && col[3]) metal = col[3];
    var ic = look.cam === 'island' && look.cover !== 'clear' ? col[3] || (back === 'solid' ? dn(bc, .05) : '') : '';   // '' = แผ่นครอบกล้องใส/ขุ่น (เห็นสีเครื่องผ่านแผ่น)
    var lrc = look.lr === 'case' ? up(bc, .12) : look.lr === 'edge' ? ec : look.lr || '';   // ห่วงโลหะรอบเลนส์แต่ละตัว (บนแผ่นครอบ/กรอบกล้อง)
    /* ความแรงแสงตามวัสดุ [แสงฟุ้งซ้ายบน, เงาล่างขวา] — ซิลิโคนด้านไล่แสงชัด ใสแทบไม่ไล่ (เห็นเครื่องข้างใต้) */
    var LT = back === 'solid' ? (dkB ? [.13, .3] : [.2, .16]) : back === 'smoke' ? [.12, .28] : back === 'frost' ? [.18, .16] : [.05, .06], dkW = lum(ec) < 90;
    out += '<defs>' + K.blur('b1', .5) + K.blur('b2', .25) + K.blur('fz', 1.5) + K.grain('gn', bc || '#888888', back === 'solid' ? (look.tex ? .17 : .07) : .05) +
      '<mask id="km' + 'k' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '"><rect x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '" fill="#fff"/><path d="' + hp + '" fill="#000"/></mask>' +
      '<clipPath id="kc' + 'k' + u + '"><path d="' + inner + '"/></clipPath><clipPath id="ko' + 'k' + u + '"><path d="' + outer + '"/></clipPath>' +
      (g2 ? K.lin('kv', 0, 1, [[0, bc], [gs[0], bc], [gs[1], g2], [1, g2]]) : '') +
      (g2 && look.wg ? K.lin('kw', 0, 1, [[0, up(bc, .08)], [gs[0], bc], [gs[1], g2], [1, dn(g2, .05)]]) : look.chrome ? K.lin('kw', 1, 1, [[0, up(ec, .45)], [.22, ec], [.45, dn(ec, .28)], [.7, up(ec, .32)], [1, dn(ec, .15)]])   // ขอบชุบเงา: แสงสะท้อนหลายแถบ
        : K.lin('kw', 1, 1, [[0, up(ec, clear ? .3 : back === 'solid' ? .1 : .22)], [.5, ec], [1, up(ec, back === 'solid' ? .03 : .08)]])) +   // ซิลิโคนสีทึบ: ขอบสีเดียวกับหลัง (ภาพร้าน) ไม่ขาวซีด                       // ผนังเคส
      K.lin('kb', 1, 1, [[0, up(bc || '#888888', .07)], [.6, bc || '#888888'], [1, dn(bc || '#888888', .1)]]) +
      K.lin('kg', 1, 1, [[0, '#fff', 0], [.3, '#fff', 0], [.4, '#fff', clear ? 0 : back === 'solid' && !look.gloss ? .025 : .07], [.52, '#fff', 0], [.65, '#fff', 0]]) +   // แสงสะท้อนบนแผ่นหลัง · เคสใสไม่มีแถบแสงเฉียง (ผู้ใช้: แสบตา)
      K.lin('kt', 1, 1, [[0, up(metal, .35)], [.5, metal], [1, dn(metal, .3)]]) +
      (ic ? K.lin('ki', 1, 1, look.chrome ? [[0, up(ic, .4)], [.3, ic], [.55, dn(ic, .25)], [.8, up(ic, .3)], [1, dn(ic, .1)]] : [[0, up(ic, .1)], [1, dn(ic, .08)]]) : '') +
      (lrc ? K.lin('kl', 1, 1, [[0, up(lrc, .35)], [.5, lrc], [1, dn(lrc, .3)]]) : '') +
      (look.photo ? K.lin('kp', 0, 1, [[0, '#9ec3e6'], [.6, '#d9e6f0'], [1, '#e9eef0']]) : '') +
      /* ระบบแสงของเคส — ไฟมาจากซ้ายบนเหมือนภาพเครื่อง: kL แสงฟุ้งบนแผ่นหลัง · kD เงาล่างขวา · kh ไฮไลต์ขอบ · ks เงาขอบ */
      K.rad('kL', .22, .1, 1, [[0, '#fff', LT[0]], [.5, '#fff', LT[0] * .3], [1, '#fff', 0]]) +
      K.lin('kD', 1, 1, [[0, '#000', 0], [.5, '#000', 0], [1, '#000', LT[1]]]) +
      K.lin('kh', 1, 1, [[0, '#fff', .9], [.4, '#fff', .2], [.6, '#fff', 0], [1, '#fff', .12]]) +
      K.lin('ks', 1, 1, [[0, '#000', 0], [.45, '#000', 0], [1, '#000', dkW ? .55 : .38]]) +
      K.blur('b3', .6) + K.blur('b4', 1.1) +
      '<clipPath id="kq' + 'k' + u + '"><path d="' + hp + '"/></clipPath>' +
      '<mask id="kz' + 'k' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '"><rect x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '" fill="#fff"/><path d="' + outer + '" fill="#000"/></mask></defs>';
    /* เงาตกของเคสบนพื้นหลัง (นอกขอบเคส) */
    out += '<g mask="url(#kzk' + u + ')"><path d="' + outer + '" fill="#000" opacity=".26" transform="translate(.5 1.2)" filter="' + U('b4') + '"/></g>';
    /* แผ่นหลัง (เว้นรูกล้อง) */
    out += '<g mask="url(#kmk' + u + ')">';
    if (clear) out += '<path d="' + inner + '" fill="#eaf0f6" opacity=".07"/>';
    else if (back === 'solid') out += '<path d="' + inner + '" fill="' + U(g2 ? 'kv' : 'kb') + '"/>' + '<path d="' + inner + '" fill="#000" filter="' + U('gn') + '"/>';
    else {   // ฝ้า: เห็นตัวเครื่องเบลอ ๆ ผ่านเคส
      out += '<g clip-path="url(#kck' + u + ')"><use href="#ph' + u + '" filter="' + U('fz') + '"/></g>';
      out += '<path d="' + inner + '" fill="' + (g2 ? U('kv') : bc || '#f1f1f1') + '" opacity="' + (look.fa || (back === 'smoke' ? .66 : !bc ? .42 : lum(bc) < 90 ? .8 : .62)) + '"/><path d="' + inner + '" fill="#000" filter="' + U('gn') + '"/>';
    }
    /* กากเพชร (glit) — ภาพร้าน MobiSkin/dimi888/Goodis: เกล็ดเล็กถี่ต่างความสว่าง + ประกายกากบาทบางจุด + ดาวห้าแฉกเส้นขอบ (st = จำนวนดาว)
       { c สีเกล็ด, c2 สีที่สอง, n เกล็ดต่อ 1 ตร.ซม., st ดาว, ss ขนาดดาว มม., seed } · ทับได้รายสีผ่าน col[6].glit */
    if (look.glit || (col[6] && col[6].glit)) {
      var GL = Object.assign({}, look.glit, col[6] && col[6].glit), rg = seeded(GL.seed || 5), gc = GL.c || '#ffffff', gN = Math.round(w * h / 100 * (GL.n || 9)), gS = '';
      for (var gi = 0; gi < gN; gi++) {
        var gx = rg() * w, gy = rg() * h, gr = .07 + rg() * rg() * .3, go = .2 + rg() * .75;
        gS += '<circle cx="' + gx.toFixed(2) + '" cy="' + gy.toFixed(2) + '" r="' + gr.toFixed(2) + '" fill="' + (GL.c2 && rg() < .4 ? GL.c2 : gc) + '" opacity="' + go.toFixed(2) + '"/>';
        if (rg() < .035) { var ga2 = .5 + rg() * .7; gS += '<path d="M' + (gx - ga2) + ' ' + gy + 'H' + (gx + ga2) + 'M' + gx + ' ' + (gy - ga2) + 'V' + (gy + ga2) + '" stroke="#fff" stroke-width=".12" stroke-opacity=".9" stroke-linecap="round"/>'; }
      }
      for (var si = 0; si < (GL.st || 0); si++) {
        var sx = 3 + rg() * (w - 6), sy = 3 + rg() * (h - 6), sr = (GL.ss || 3) * (.65 + rg() * .5) / 2, sa = rg() * 72, sp = '';
        for (var sk = 0; sk < 10; sk++) { var rr2 = sk % 2 ? sr * .45 : sr, an = (sa + sk * 36 - 90) * Math.PI / 180; sp += (sk ? 'L' : 'M') + (sx + rr2 * Math.cos(an)).toFixed(2) + ' ' + (sy + rr2 * Math.sin(an)).toFixed(2); }
        gS += '<path d="' + sp + 'Z" fill="none" stroke="' + gc + '" stroke-width=".3" stroke-linejoin="round" opacity=".9"/>';
      }
      out += '<g clip-path="url(#kck' + u + ')">' + gS + '</g>';
    }
    /* rib = ลายเส้นเฉียงนูนทั้งแผ่นหลัง (ภาพร้าน NILLKIN CamShield) — ค่า = ระยะห่างเส้น มม. */
    if (look.rib) {
      var rS = '';
      for (var rx = -h; rx < w + h; rx += look.rib) rS += '<path d="M' + rx.toFixed(2) + ' ' + (h + 2) + 'L' + (rx + h * .36).toFixed(2) + ' -2" stroke="#000" stroke-opacity=".65" stroke-width="' + (look.rib * .42) + '"/><path d="M' + (rx + look.rib * .38).toFixed(2) + ' ' + (h + 2) + 'L' + (rx + look.rib * .38 + h * .36).toFixed(2) + ' -2" stroke="#fff" stroke-opacity=".15" stroke-width="' + (look.rib * .2) + '"/>';
      out += '<g clip-path="url(#kck' + u + ')">' + rS + '</g>';
    }
    /* perf = เคสระบายความร้อนเจาะรูกลมเรียงสลับแถวทั้งแผ่นหลัง (ภาพร้าน BKWHALE Cooling) — { p ระยะห่างรู มม., r รัศมีรู, m ขอบทึบรอบเคส, c ขอบทึบรอบกรอบกล้อง }
       รูทะลุเห็นเครื่องข้างใต้ = มืด · ขอบล่างขวาของรูรับแสง (ไฟซ้ายบน) */
    if (look.perf) {
      var PF = look.perf, pfp = PF.p || 4.2, pfr = PF.r || 1.5, pfm = PF.m || bw + 1.8, pfc = PF.c || (look.lw || 1.6) + 1.6, pfd = '', pfrow = 0;
      var pfIn = function (x, y) {
        var e = pfm + pfr, cxr = Math.min(Math.max(x, R), w - R), cyr = Math.min(Math.max(y, R), h - R);
        if (x < e || y < e || x > w - e || y > h - e) return false;
        if (Math.hypot(x - cxr, y - cyr) > R - e) return false;
        if (PF.nb && y > h * PF.nb[0] && y < h * PF.nb[1] && Math.abs(x - w / 2) < w * PF.nb[2]) return false;   /* nb = [บน, ล่าง, ครึ่งกว้าง] แถบทึบใต้โลโก้ */
        return !(x > hb[0] - pfc - pfr && x < hb[0] + hb[2] + pfc + pfr && y < hb[1] + hb[3] + pfc + pfr);
      };
      for (var pfy = pfm + pfr; pfy < h; pfy += pfp * .866, pfrow++)
        for (var pfx = pfm + pfr + (pfrow % 2 ? pfp / 2 : 0); pfx < w; pfx += pfp)
          if (pfIn(pfx, pfy)) pfd += 'M' + (pfx - pfr).toFixed(2) + ' ' + pfy.toFixed(2) + 'a' + pfr + ' ' + pfr + ' 0 1 0 ' + (2 * pfr) + ' 0a' + pfr + ' ' + pfr + ' 0 1 0 ' + (-2 * pfr) + ' 0Z';
      /* เคสใสตาข่าย (ไม่มีสีหลัง): รูเห็นเครื่อง → วาดแค่ขอบรูเทาใส ไม่ทารูดำ */
      if (!bc) out += '<g clip-path="url(#kck' + u + ')"><path d="' + pfd + '" fill="#ffffff" fill-opacity=".05" stroke="#9aa2ac" stroke-opacity=".55" stroke-width=".22"/></g>';
      else out += '<clipPath id="kpfk' + u + '"><path d="' + pfd + '"/></clipPath><g clip-path="url(#kck' + u + ')"><path d="' + pfd + '" fill="' + dn(bc || '#888888', .32) + '"/><g clip-path="url(#kpfk' + u + ')"><path d="' + pfd + '" fill="#0c0c0d" opacity=".88" transform="translate(-.28 -.36)"/></g></g>';
    }
    /* dec = แผ่น/ชิ้นนูนบนหลังเคส วัดเป็นสัดส่วนจากภาพร้าน (GSNAP ตาราง 10%): [x0, y0, x1, y1, รัศมีมุม มม., สี, ลายกันลื่น]
       — เคสเกราะ 2 ชั้น (แผ่นดำข้าง/ใต้ห่วง), UAG (แถบกันลื่นข้าง + ปุ่มส้มบนห่วง) · ชิ้นนูน = เงาตกล่างขวา + ขอบแสงซ้ายบน */
    if (look.dec) {
      var dS = '';
      look.dec.forEach(function (d) {
        var dx = w * d[0], dy = h * d[1], dw = w * (d[2] - d[0]), dh = h * (d[3] - d[1]), drr = Math.min(d[4] || 1, dw / 2, dh / 2), dAcc = col[6] && col[6].acc || up(bc || '#555555', .07), dc = d[5] === 'case' ? dAcc : d[5] === 'hi' ? up(dAcc, lum(dAcc) > 150 ? .45 : .22) : d[5] === 'lo' ? dn(dAcc, lum(dAcc) > 150 ? .22 : .5) : d[5] === 'ring' ? (metal || '#6f7176') : d[5] || '#1c1c1e';   /* 'case' = แผ่นนูนสีเดียวกับเคส · 'ring' = สีห่วงขาตั้งรายสี */
        var dp = rrp(dx, dy, dw, dh, drr, drr);
        if (d[4] < 0) { var ch = Math.min(-d[4], dw / 2, dh / 2); dp = 'M' + [[dx + ch, dy], [dx + dw - ch, dy], [dx + dw, dy + ch], [dx + dw, dy + dh - ch], [dx + dw - ch, dy + dh], [dx + ch, dy + dh], [dx, dy + dh - ch], [dx, dy + ch]].map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L') + 'Z'; }   /* รัศมีติดลบ = แปดเหลี่ยม ตัดมุม |r| มม. (แผ่นฐาน UAG) */
        if (d[7]) { dS += '<path d="' + dp + '" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="' + d[7] + '" transform="translate(.35 .5)" filter="' + U('b3') + '"/><path d="' + dp + '" fill="none" stroke="' + dc + '" stroke-width="' + d[7] + '"/><path d="' + dp + '" fill="none" stroke="' + up(dc, .3) + '" stroke-opacity=".6" stroke-width=".25" transform="translate(-.2 -.2)"/>'; return; }   /* d[7] = ห่วงวงรี/กรอบ (เส้นหนา d[7] มม. ไม่ทึบ) — ห่วงขาตั้งทรงแคปซูลของเคสเกราะ */
        dS += '<path d="' + dp + '" fill="#000" opacity=".35" transform="translate(.35 .5)" filter="' + U('b3') + '"/><path d="' + dp + '" fill="' + dc + '"/>';
        if (d[6]) for (var dyy = dy + 1.2; dyy < dy + dh - .8; dyy += 1.3) for (var dxx = dx + 1; dxx < dx + dw - .6; dxx += 1.3) dS += '<circle cx="' + dxx.toFixed(2) + '" cy="' + dyy.toFixed(2) + '" r=".32" fill="#000" opacity=".5"/>';
        dS += '<path d="' + dp + '" fill="none" stroke="' + up(dc, .35) + '" stroke-opacity=".55" stroke-width=".25"/>';
      });
      out += '<g clip-path="url(#kck' + u + ')">' + dS + '</g>';
    }
    /* rug = เคสกันกระแทกแบบเกราะ (ภาพร้าน HOHO): รางยกสองข้าง มีร่องกันลื่น + น็อตสี่มุม */
    if (look.rug) {
      var rc0 = bc || '#555555', rgS = '', ry0 = h * .3, ry1 = h * .86;
      [bw + .5, w - bw - .5 - 3.4].forEach(function (x0) {
        rgS += '<rect x="' + (x0 + .3) + '" y="' + (ry0 + .5) + '" width="3.4" height="' + (ry1 - ry0) + '" rx="1.4" fill="#000" opacity=".35" filter="' + U('b3') + '"/>' +
          '<rect x="' + x0 + '" y="' + ry0 + '" width="3.4" height="' + (ry1 - ry0) + '" rx="1.4" fill="' + dn(rc0, .14) + '"/>';
        for (var yy = ry0 + 2; yy < ry1 - 1.5; yy += 1.7) rgS += '<path d="M' + (x0 + .7) + ' ' + yy + 'H' + (x0 + 2.7) + '" stroke="#000" stroke-opacity=".4" stroke-width=".45"/><path d="M' + (x0 + .7) + ' ' + (yy + .45) + 'H' + (x0 + 2.7) + '" stroke="#fff" stroke-opacity=".12" stroke-width=".25"/>';
        rgS += '<rect x="' + x0 + '" y="' + ry0 + '" width="3.4" height="' + (ry1 - ry0) + '" rx="1.4" fill="none" stroke="' + U('kh') + '" stroke-width=".3"/>';
      });
      [[R * .62 + 1, R * .62 + 1], [w - R * .62 - 1, R * .62 + 1], [w - R * .62 - 1, h - R * .62 - 1], [R * .62 + 1, h - R * .62 - 1]].forEach(function (s) {
        rgS += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="1.25" fill="' + dn(rc0, .3) + '"/><circle cx="' + s[0] + '" cy="' + s[1] + '" r="1.25" fill="none" stroke="' + U('kh') + '" stroke-width=".3"/><path d="M' + (s[0] - .6) + ' ' + s[1] + 'H' + (s[0] + .6) + '" stroke="#000" stroke-opacity=".6" stroke-width=".3"/>';
      });
      out += '<g clip-path="url(#kck' + u + ')">' + rgS + '</g>';
    }
    /* ลายพิมพ์/การ์ตูน — อยู่ใต้ชั้นแสง (ตัดตามแผ่นหลัง + เว้นรูกล้องจาก mask ของกลุ่มนี้) */
    /* ภาพจริงจากร้าน (shot) มาก่อน — มีแสงเงาของภาพถ่ายอยู่แล้ว จึงไม่ซ้อนแสงจำลองบนแผ่นหลังอีก */
    var shot = look.shot || (col[6] && col[6].shot) ? Object.assign({ s: look.img, mode: 'full' }, look.shot, col[6] && col[6].shot) : null;
    var art = !shot && look.art ? Object.assign({}, look.art, col[6] || {}) : null;
    if (shot) out += '<g clip-path="url(#kck' + u + ')">' + shotImg(shot, -t, -t, w + 2 * t, h + 2 * t) + '</g>';
    if (art) out += '<g clip-path="url(#kck' + u + ')">' + printArt(art, P, w, h, bc, U) + '</g>';
    var lit3 = !shot || shot.mode === 'tile' || shot.key;   // แผ่นลายปูซ้ำ/เคสใสที่ลบพื้นแล้ว ไม่มีแสงรวมของภาพ → ใส่แสงจำลอง · ภาพเต็มเคสทึบมีแสงจริงอยู่แล้ว
    if (lit3) out += '<path d="' + inner + '" fill="' + U('kL') + '"/><path d="' + inner + '" fill="' + U('kD') + '"/><path d="' + inner + '" fill="' + U('kg') + '"/>';
    /* แสงสะท้อนเป็นเส้นคมบนผิวกระจก/ซาตินเงา (`gloss`) — แถบเฉียงมุมขวาบน + เส้นบางคม
       เคสใส/ควัน: ไม่ใส่เส้นแสงเลย (ผู้ใช้: เส้นแสงแสบตา) — ความใสอ่านจากขอบหนา มุม และผนังครอบกล้องแทน */
    if (lit3 && look.gloss && !clear && back !== 'smoke') out += '<path d="M' + (w * .58) + ' 1.5L' + (w - 1.5) + ' ' + (h * .3) + '" stroke="#fff" stroke-opacity=".16" stroke-width="2.6" stroke-linecap="round" filter="' + U('b3') + '"/>' +
      '<path d="M' + (w * .66) + ' 1.5L' + (w - 1.5) + ' ' + (h * .22) + '" stroke="#fff" stroke-opacity=".3" stroke-width=".28" stroke-linecap="round"/>' +
      '<path d="M2.2 ' + (h * .55) + 'L2.2 ' + (h - 14) + '" stroke="#fff" stroke-opacity=".15" stroke-width="1.1" stroke-linecap="round" filter="' + U('b3') + '"/>';
    if (clear) out += '<path d="' + rrp(bw + .95, bw + .95, w - 2 * bw - 1.9, h - 2 * bw - 1.9, R - bw - .95, R - bw - .95) + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".7" filter="' + U('b2') + '"/>';   // ขอบหักเหแสงของ TPU ใส
    /* ขอบในที่ผนังเคสยกขึ้นจากแผ่นหลัง: ผนังบน/ซ้ายทอดเงาลงบนแผ่นหลัง · ผนังล่าง/ขวารับแสง */
    out += '<g clip-path="url(#kck' + u + ')"><path d="' + inner + '" fill="none" stroke="#000" stroke-opacity="' + (clear ? .16 : dkB ? .45 : .26) + '" stroke-width="2.2" transform="translate(.55 .75)" filter="' + U('b3') + '"/>' +
      '<path d="' + inner + '" fill="none" stroke="#fff" stroke-opacity="' + (dkB ? .12 : .4) + '" stroke-width="1.4" transform="translate(-.45 -.55)" filter="' + U('b3') + '"/></g>';
    /* ช่องใส่บัตรด้านหลัง (pocket) — วัดจากภาพร้าน JT-shop: กรอบช่องเริ่ม ~38% ของความสูง ถึง ~92% · เว้นข้าง ~11% ของความกว้าง
       กรอบเป็นขอบใสหนานูน (เส้นแสงคู่) · แผ่นหน้าช่องอยู่ต่ำกว่าขอบบนกรอบ ~3 มม. ขอบบนเว้าเป็นตัว U กว้างตื้นตรงกลาง (ไว้ดันบัตร) */
    if (look.pocket) {
      /* รอบ QC พ.ย. 2026: ขอบเว้าของจริงเป็นตัว U กว้างโค้งนุ่มทั้งเส้น (ไม่ใช่สี่เหลี่ยมคางหมู) กว้าง ~64% ลึก ~5 มม. */
      var PK = look.pk || [.385, .925, .11];   /* pk = [บน, ล่าง, เว้นข้าง] สัดส่วน — วัดจากภาพร้านด้วย GSNAP (เคสใส่บัตรทึบ: .42 → .96 เว้นข้าง .07) */
      var px = w * PK[2], py = Math.max(h * PK[0], hb[1] + hb[3] + 4), pw = w - 2 * px, ph = h * PK[1] - py, qx = w / 2, sy = py + 3, nw = pw * .32, nd = 5, pr = Math.max(2, R - px);
      var notch = 'M' + (px + 1.2) + ' ' + sy + 'H' + (qx - nw) + 'C' + (qx - nw * .55) + ' ' + sy + ' ' + (qx - nw * .62) + ' ' + (sy + nd) + ' ' + (qx - nw * .15) + ' ' + (sy + nd) + 'H' + (qx + nw * .15) + 'C' + (qx + nw * .62) + ' ' + (sy + nd) + ' ' + (qx + nw * .55) + ' ' + sy + ' ' + (qx + nw) + ' ' + sy + 'H' + (px + pw - 1.2);
      var pb = rrp(px, py, pw, ph, 2.4, pr);
      out += '<path d="' + pb + '" fill="none" stroke="#000" stroke-opacity="' + (dkB ? .3 : .14) + '" stroke-width="1.3" transform="translate(.35 .5)" filter="' + U('b3') + '"/>' +   // เงาตกของกรอบนูน
        '<path d="' + pb + '" fill="#fff" fill-opacity="' + (dkB ? .05 : .08) + '"/>' +
        '<path d="' + pb + '" fill="none" stroke="' + U('kh') + '" stroke-width="1.2"/><path d="' + pb + '" fill="none" stroke="' + U('ks') + '" stroke-width="1.2" opacity=".45"/>' +   // สันกรอบหนา: สว่างซ้ายบน มืดขวาล่าง
        '<path d="' + pb + '" fill="none" stroke="#fff" stroke-opacity="' + (dkB ? .45 : .85) + '" stroke-width=".3"/>' +
        '<path d="' + rrp(px + .7, py + .7, pw - 1.4, ph - 1.4, 1.9, pr - .7) + '" fill="none" stroke="#fff" stroke-opacity="' + (dkB ? .3 : .6) + '" stroke-width=".25"/>' +   // ขอบใสหนา: เส้นแสงคู่ (ภาพร้าน)
        '<path d="' + rrp(px + 1.05, py + 1.05, pw - 2.1, ph - 2.1, 1.6, pr - 1.05) + '" fill="none" stroke="#5d646c" stroke-opacity="' + (dkB ? .5 : .32) + '" stroke-width=".22"/>' +
        '<path d="' + notch + '" fill="none" stroke="#000" stroke-opacity="' + (dkB ? .35 : .16) + '" stroke-width=".5" transform="translate(.2 .4)" filter="' + U('b2') + '"/>' +   // ความหนาของแผ่นหน้าช่อง
        '<path d="' + notch + '" fill="none" stroke="#fff" stroke-opacity="' + (dkB ? .55 : .9) + '" stroke-width=".55"/>' +
        '<path d="' + notch + 'V' + (py + ph - 1.2) + 'H' + (px + 1.2) + 'Z" fill="#fff" fill-opacity="' + (dkB ? .04 : .07) + '"/>';
    }
    /* ช่องใส่รูปด้านหลัง (photo) — การ์ดรูปขอบขาวแบบโพลารอยด์ใต้แผ่นใส (ภาพร้าน เคส 2 in 1) */
    if (look.photo) {
      var cx0 = w * .12, cy0 = Math.max(h * .25, hb[1] + hb[3] + 3), cw = w * .76, ch = h * .75 - cy0;   // รอบ QC: ภาพร้านช่องใส่รูปใหญ่ ~.12–.88W · .25–.75h (เดิมเล็กและต่ำเกิน)
      var ix = cx0 + 2.2, iy = cy0 + 2.2, iw = cw - 4.4, ih = ch - 9;
      /* การ์ดรูป: เงาใต้การ์ด → กระดาษขาว → รูปตัวอย่าง (ฟ้า/ดวงอาทิตย์/เนิน) → ขอบช่องใสนูน + แสงสะท้อนบนแผ่นใสที่ปิดหน้า */
      out += '<rect x="' + cx0 + '" y="' + cy0 + '" width="' + cw + '" height="' + ch + '" rx="1.2" fill="#000" opacity=".22" transform="translate(.4 .6)" filter="' + U('b3') + '"/>' +
        '<rect x="' + cx0 + '" y="' + cy0 + '" width="' + cw + '" height="' + ch + '" rx="1.2" fill="#f6f6f3"/>' +
        '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '" fill="url(#kp' + 'k' + u + ')"/>' +
        '<circle cx="' + (ix + iw * .7) + '" cy="' + (iy + ih * .3) + '" r="' + (iw * .09) + '" fill="#fff4d6" opacity=".9"/>' +
        '<path d="M' + ix + ' ' + (iy + ih * .78) + 'Q' + (ix + iw * .3) + ' ' + (iy + ih * .52) + ' ' + (ix + iw * .55) + ' ' + (iy + ih * .72) + 'T' + (ix + iw) + ' ' + (iy + ih * .62) + 'V' + (iy + ih) + 'H' + ix + 'Z" fill="#6f8a7a" opacity=".85"/>' +
        '<rect x="' + cx0 + '" y="' + cy0 + '" width="' + cw + '" height="' + ch + '" rx="1.2" fill="' + (bc || '#ffffff') + '" opacity=".2"/>' +
        '<rect x="' + (cx0 - .6) + '" y="' + (cy0 - .6) + '" width="' + (cw + 1.2) + '" height="' + (ch + 1.2) + '" rx="1.8" fill="none" stroke="' + U('kh') + '" stroke-width=".5"/>' +
        '<rect x="' + (cx0 - .6) + '" y="' + (cy0 - .6) + '" width="' + (cw + 1.2) + '" height="' + (ch + 1.2) + '" rx="1.8" fill="none" stroke="' + U('ks') + '" stroke-width=".5"/>' +
        '<path d="M' + (cx0 + cw * .15) + ' ' + (cy0 + ch) + 'L' + (cx0 + cw * .75) + ' ' + cy0 + '" stroke="#fff" stroke-opacity=".28" stroke-width="3.5" filter="' + U('b3') + '"/>';
    }
    /* วง MagSafe / ห่วงขาตั้ง — เคสขอบชุบ วงก็ชุบเงาแบบเดียวกับขอบ */
    var mcs = look.chrome && mc === ec ? U('kw') : mc;   var RG = look.rgr || 21;   /* rgr = รัศมีห่วงขาตั้ง (ห่วงเล็กของเคสเกราะ) */
    if (look.ring) out += '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + RG + '" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="' + ((look.mw || 3.6) + .4) + '" transform="translate(.4 .6)" filter="' + U('b3') + '"/>' +   // ห่วงขาตั้งยกจากแผ่นหลัง: เงาตก
      '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + RG + '" fill="none" stroke="' + U('kt') + '" stroke-width="' + (look.mw || 3.6) + '"/>' +
      '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + (RG - (look.mw || 3.6) / 2 + .25) + '" fill="none" stroke="' + U('kh') + '" stroke-width=".3"/><circle cx="' + w / 2 + '" cy="' + my + '" r="' + (RG + (look.mw || 3.6) / 2 - .25) + '" fill="none" stroke="' + U('kh') + '" stroke-width=".3"/><circle cx="' + w / 2 + '" cy="' + my + '" r="' + RG + '" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".25"/><rect x="' + (w / 2 - 3.5) + '" y="' + (my + RG + 1.4) + '" width="7" height="2.2" rx="1.1" fill="' + U('kt') + '"/>';
    else if (mc && (!shot || (shot.key && !shot.kr))) {   /* kr = วงแม่เหล็กอยู่ในภาพร้านแล้ว (ไม่ใช้ ks) ไม่วาดซ้อน */
       // เคสทึบที่ใช้ภาพร้าน: วงแม่เหล็ก (ถ้ามองเห็น) อยู่ในภาพแล้ว · เคสใสที่ลบพื้น: วงขาวหายไปกับพื้น → วาดใหม่
      /* วงเต็ม หรือวงรูปตัว C (เว้นช่องด้านล่างตรงแถบบอกทิศ — look.magC) · mw = ความกว้างวง */
      var mC = col[6] && col[6].magC != null ? col[6].magC : look.magC;   /* วง C รายสี (Frost: ขาววงเต็ม ดำวง C) */
      var mw = look.mw || 3.6, rr = look.mr || 22.3,   // ค่าเริ่มต้นวัดจากภาพร้าน OSGEER/iFilm/HI-SHIELD: วงนอก Ø ~48–51 มม. กว้าง ~3.6–4.2
 ga = (look.mga || 24) * Math.PI / 180, gc0 = Math.PI / 2 + (look.mca || 0) * Math.PI / 180, pt = function (a) { return (w / 2 + rr * Math.cos(a)) + ' ' + (my + rr * Math.sin(a)); };
      var ring = function (st, sw, ex) { return mC ? '<path d="M' + pt(gc0 + ga) + 'A' + rr + ' ' + rr + ' 0 1 1 ' + pt(gc0 - ga) + '" fill="none" stroke="' + st + '" stroke-width="' + sw + '" stroke-linecap="round"' + (ex || '') + '/>' : '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + rr + '" fill="none" stroke="' + st + '" stroke-width="' + sw + '"' + (ex || '') + '/>'; };
      /* วงนูน: เงาตกล่างขวา → ตัววง → ไฮไลต์ขอบบนซ้าย (วง faint = ปั๊มนูนบนเนื้อเคส เห็นแค่แสง/เงา) */
      /* แถบบอกทิศ: กว้าง tw ยาว tl ห่างจากวง tg (ภาพร้านส่วนใหญ่เป็นแคปซูลอ้วน กว้างใกล้ ๆ ความกว้างวง) */
      /* แถบบอกทิศ: ภาพร้านส่วนใหญ่เป็นแคปซูลอ้วนยาว ~4–6 × 11–19 มม. (เดิมค่าเริ่มต้นสั้นจนเป็นขีดเล็ก ผู้ใช้ทัก พ.ย. 2026) */
      var tw = look.tw || (mC ? 2.6 : Math.max(3.6, mw * 1.1)), tl = look.tl || (mC ? 5 : 11), ty = my + rr + (mC ? 1.8 : mw / 2 + (look.tg || 3));
      var tb = function (f, ex) { return look.tab ? '<rect x="' + (w / 2 - tw / 2 + (look.tx || 0) * w) + '" y="' + ty + '" width="' + tw + '" height="' + tl + '" rx="' + tw / 2 + '" fill="' + f + '"' + (ex || '') + '/>' : ''; };
      /* วง MagSafe = แผ่นพิมพ์/ฝังบาง ๆ เรียบไปกับหลังเคสเสมอ — ห้ามวาดเงาตก/ไฮไลต์ให้ดูนูน (ผู้ใช้สั่ง พ.ย. 2026: "ทำเป็นแผ่นบาง ๆ ไม่ต้องทำให้ดูนูน")
         เห็นแค่สีของวง + เส้นขอบจาง ๆ สองเส้น (ขอบในและขอบนอก) · วง faint (ปั๊มสีเดียวกับเคส) ใช้เส้นขอบสว่างแทน */
      if (true) {
        var edge2 = function (st, op) { var s2 = ''; [rr - mw / 2, rr + mw / 2].forEach(function (q) { s2 += '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + q + '" fill="none" stroke="' + st + '" stroke-width=".3" stroke-opacity="' + op + '"/>'; }); return mC ? '' : s2; };
        /* mch = ขอบวงชุบโลหะทั้งสองข้าง · mt = [ข้อความโค้งด้านบน, ด้านล่าง] พิมพ์บนวง (ภาพร้าน Colnel: วงดำกว้าง ขอบชุบ มีตัวหนังสือขาว) */
        if (look.mch) out += ring(U('kw'), mw + (look.mch === 1 ? 1.2 : look.mch));   // mch ตัวเลข = ความกว้างขอบชุบรวมสองข้าง (มม.)
        if (look.mt) out += '<defs><path id="kmt' + u + '" d="M' + (w / 2 - rr) + ' ' + my + 'A' + rr + ' ' + rr + ' 0 0 1 ' + (w / 2 + rr) + ' ' + my + '"/><path id="kmb' + u + '" d="M' + (w / 2 - rr) + ' ' + my + 'A' + rr + ' ' + rr + ' 0 0 0 ' + (w / 2 + rr) + ' ' + my + '"/></defs>';
        out += (mC && /^#/.test(mc) ? ring(dn(mc, .3), mw + .5, ' stroke-opacity="' + (lum(mc) > 200 ? .7 : .25) + '"') : '') + ring(mcs, mw) + tb(mcs) + (look.mt ? '<text font-family="Arial,Helvetica,sans-serif" font-size="' + mw * .42 + '" fill="#f2f2f2" text-anchor="middle" dominant-baseline="central"><textPath href="#kmt' + u + '" startOffset="50%">' + look.mt[0] + '</textPath></text><text font-family="Arial,Helvetica,sans-serif" font-size="' + mw * .34 + '" fill="#f2f2f2" text-anchor="middle" dominant-baseline="central"><textPath href="#kmb' + u + '" startOffset="50%">' + look.mt[1] + '</textPath></text>' : '') + (mg === 'faint' ? edge2(dkB ? up(bc || mc, .12) : dn(bc || mc, .14), .7) : edge2(dn(mc, .3), lum(mc) > 200 ? .6 : .2));   /* วงขาวบนเคสใส/เครื่องสีอ่อน: ขอบเทาชัดตามภาพร้าน (GSNAP พ.ย. 2026) */
        /* mo = เส้นขอบวงสว่างบาง ๆ ทั้งขอบในและขอบนอก (ภาพร้านเคสซาติน: วงเรียบสีเดียวกับเคส เห็นแค่เส้นขอบเงา) */
        if (look.mo) [rr - mw / 2, rr + mw / 2].forEach(function (q) { out += '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + q + '" fill="none" stroke="' + up(bc || mc, .16) + '" stroke-width=".3"/>'; });
        /* mi = [สี, กว้าง] แถบสีเข้มด้านในวง (ภาพร้านเคสขอบชุบ: วงชุบเงินกว้าง + แถบดำด้านในพิมพ์ตัวหนังสือ) */
        if (look.mi) out += '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + (rr - mw / 2 - look.mi[1] / 2) + '" fill="none" stroke="' + look.mi[0] + '" stroke-width="' + look.mi[1] + '"/>' +
          '<circle cx="' + w / 2 + '" cy="' + my + '" r="' + (rr - mw / 2 - look.mi[1]) + '" fill="none" stroke="' + U('kw') + '" stroke-width=".5"/>';
      }
    }
    /* ลวดลายพิมพ์เล็ก ๆ บนเคส (ภาพร้าน): สายฟ้ากลางวงชาร์จ · ข้อความ · บาร์โค้ด */
    if (look.bolt) { var bx = w / 2, by = my, bs = look.bs || 1; out += '<path d="M' + (bx + 1.6 * bs) + ' ' + (by - 9 * bs) + 'L' + (bx - 4.2 * bs) + ' ' + (by + 1.2 * bs) + 'H' + (bx - .6 * bs) + 'L' + (bx - 2 * bs) + ' ' + (by + 9 * bs) + 'L' + (bx + 4.6 * bs) + ' ' + (by - 2.6 * bs) + 'H' + (bx + .9 * bs) + 'Z" fill="none" stroke="' + look.bolt + '" stroke-width=".5" stroke-linejoin="round" opacity=".9"/>'; }
    (look.txt || []).forEach(function (a) { out += '<text x="' + w * a[1] + '" y="' + h * a[2] + '" text-anchor="middle" font-family="' + (a[5] || 'Courier New,monospace') + '" font-size="' + a[3] + '" fill="' + a[4] + '" opacity=".8"' + (a[6] ? ' transform="rotate(' + a[6] + ' ' + w * a[1] + ' ' + h * a[2] + ')"' : '') + '>' + a[0] + '</text>'; });
    /* ขาตั้งพับได้กลางหลัง — วัดจากภาพร้าน PBZZ (พ.ย. 2026 ผู้ใช้ทักว่าขาตั้งเล็กเกิน):
       kick = { cy กลางห่วง, R รัศมีห่วง, sw ความกว้างก้าน (สัดส่วนความกว้างเครื่อง), by ปลายก้าน, pt ต้นแผ่นขาตั้ง (สัดส่วนความสูง), pw ความกว้างแผ่น, rw ความกว้างขอบห่วง มม. }
       = ฐานนูน (ห่วงใหญ่ + ก้านกว้างลงมา) · ในห่วงเป็นแอ่ง · แผ่นขาตั้งพับได้วางบนก้าน มีช่องสอดนิ้วด้านบน */
    if (look.kick) {
      var KK = look.kick, kx = w / 2, kcy = h * KK.cy, kR = w * KK.R, ksw = w * KK.sw, kby = h * KK.by, kpt = h * KK.pt, kpw = w * KK.pw, krw = KK.rw || 2.6, kc = bc || '#888888';
      var stem = function (x0, x1, y0, y1, r) { return 'M' + x0 + ' ' + y0 + 'H' + x1 + 'V' + (y1 - r) + 'Q' + x1 + ' ' + y1 + ' ' + (x1 - r) + ' ' + y1 + 'H' + (x0 + r) + 'Q' + x0 + ' ' + y1 + ' ' + x0 + ' ' + (y1 - r) + 'Z'; };
      var base = '<circle cx="' + kx + '" cy="' + kcy + '" r="' + kR + '"/><path d="' + stem(kx - ksw / 2, kx + ksw / 2, kcy, kby, 3.2) + '"/>';
      var plt = stem(kx - kpw / 2, kx + kpw / 2, kpt + 2.4, kby - 1.4, 2.4).replace('M' + (kx - kpw / 2) + ' ' + (kpt + 2.4) + 'H' + (kx + kpw / 2), 'M' + (kx - kpw / 2) + ' ' + (kpt + 2.4) + 'Q' + (kx - kpw / 2) + ' ' + kpt + ' ' + (kx - kpw / 2 + 2.4) + ' ' + kpt + 'H' + (kx + kpw / 2 - 2.4) + 'Q' + (kx + kpw / 2) + ' ' + kpt + ' ' + (kx + kpw / 2) + ' ' + (kpt + 2.4));
      var bf = dkB ? up(kc, .03) : dn(kc, .02), rf = dkB ? dn(kc, .3) : dn(kc, .09);
      out += '<g fill="#000" opacity="' + (dkB ? .45 : .22) + '" transform="translate(.35 .55)" filter="' + U('b3') + '">' + base + '</g>' +   // ฐานยกจากแผ่นหลัง: เงาตก
        '<g fill="' + bf + '">' + base + '</g>' +
        '<circle cx="' + kx + '" cy="' + kcy + '" r="' + (kR - krw) + '" fill="' + rf + '"/>' +   // แอ่งในห่วง
        '<circle cx="' + kx + '" cy="' + kcy + '" r="' + (kR - krw) + '" fill="none" stroke="#000" stroke-opacity="' + (dkB ? .4 : .18) + '" stroke-width=".9" transform="translate(.3 .45)" filter="' + U('b2') + '"/>' +
        '<path d="' + stem(kx - ksw / 2, kx + ksw / 2, kcy, kby, 3.2) + '" fill="' + bf + '"/>' +
        '<circle cx="' + kx + '" cy="' + kcy + '" r="' + kR + '" fill="none" stroke="' + U('kh') + '" stroke-width=".3" stroke-opacity=".7"/>' +
        '<path d="' + plt + '" fill="#000" opacity="' + (dkB ? .5 : .25) + '" transform="translate(.3 .5)" filter="' + U('b2') + '"/>' +   // แผ่นขาตั้ง: เงาตก → ตัวแผ่น → สันแสง
        '<path d="' + plt + '" fill="' + (dkB ? up(kc, .07) : up(kc, .05)) + '"/><path d="' + plt + '" fill="none" stroke="' + U('kh') + '" stroke-width=".3"/><path d="' + plt + '" fill="none" stroke="' + U('ks') + '" stroke-width=".3"/>' +
        '<rect x="' + (kx - kpw * .3) + '" y="' + (kpt + 1.6) + '" width="' + kpw * .6 + '" height="3.2" rx="1.4" fill="' + dn(kc, dkB ? .45 : .2) + '"/>' +   // ช่องสอดนิ้วงัดขาตั้ง
        '<rect x="' + (kx - kpw * .3) + '" y="' + (kpt + 1.6) + '" width="' + kpw * .6 + '" height="3.2" rx="1.4" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".4" filter="' + U('b2') + '"/>';
    }
    /* fold = [บน, ล่าง, กว้าง] แผ่นขาตั้งพับสี่เหลี่ยมใต้วงแม่เหล็ก (ภาพร้าน HOHO) — สัดส่วนความสูง/ความกว้าง · ช่องงัดด้านบน + สายฟ้ากลางแผ่น + บานพับด้านล่าง */
    if (look.fold) {
      var FD = look.fold, fx = w * (1 - FD[2]) / 2, fy = h * FD[0], fw = w * FD[2], fh = h * (FD[1] - FD[0]), fc = FD[4] || bc || '#666666', fdk = FD[4] ? lum(FD[4]) < 110 : dkB,   /* fold[3] = 0 ไม่วาดสายฟ้า · fold[4] = สีแผ่นขาตั้ง (Lereach แผ่นดำบนหลังฝ้า) */ fdp = rrp(fx, fy, fw, fh, 2.4, 2.4);
      out += '<path d="' + fdp + '" fill="#000" opacity="' + (fdk ? .55 : .3) + '" transform="translate(.4 .7)" filter="' + U('b3') + '"/>' +
        '<path d="' + fdp + '" fill="' + (fdk ? up(fc, .05) : dn(fc, .04)) + '"/><path d="' + fdp + '" fill="none" stroke="' + U('kh') + '" stroke-width=".35"/><path d="' + fdp + '" fill="none" stroke="' + U('ks') + '" stroke-width=".35"/>' +
        '<rect x="' + (fx + fw * .22) + '" y="' + (fy + 1.4) + '" width="' + fw * .56 + '" height="2.2" rx="1.1" fill="' + dn(fc, fdk ? .45 : .22) + '"/>' +
        '<path d="M' + (fx + 1) + ' ' + (fy + fh - 2.2) + 'H' + (fx + fw - 1) + '" stroke="#000" stroke-opacity=".35" stroke-width=".35"/>' +
        (FD[3] === 0 ? '' : '<path d="M' + (w / 2 + .5) + ' ' + (fy + fh * .4) + 'L' + (w / 2 - 1.3) + ' ' + (fy + fh * .55) + 'H' + (w / 2 - .1) + 'L' + (w / 2 - .6) + ' ' + (fy + fh * .7) + 'L' + (w / 2 + 1.3) + ' ' + (fy + fh * .5) + 'H' + (w / 2 + .1) + 'Z" fill="none" stroke="' + (fdk ? '#c9cbd0' : dn(fc, .35)) + '" stroke-width=".25" stroke-linejoin="round"/>');
    }
    /* inset = ขาตั้งพับฝังเรียบในหลังเคส (Lereach): ร่องรอบแผ่น (เงาลงในร่องด้านบนซ้าย + ขอบแสงล่างขวา) ไม่มีเงาตกแบบแผ่นนูน · p = จุดรูปร่างแผ่น (สัดส่วน) · hg = บานพับโลหะ [x ล่าง, y ล่าง, x บน, y บน] */
    if (look.inset) {
      var IS = look.inset, isc = bc || '#555555', isp = 'M' + IS.p.map(function (pt) { return (w * pt[0]).toFixed(2) + ' ' + (h * pt[1]).toFixed(2); }).join('L') + 'Z';
      out += '<defs><clipPath id="kis' + u + '"><path d="' + isp + '"/></clipPath></defs><path d="' + isp + '" fill="' + dn(isc, .05) + '" opacity=".6"/>' +
        '<g clip-path="url(#kis' + u + ')"><path d="' + isp + '" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.6" transform="translate(.35 .45)" filter="' + U('b3') + '"/></g>' +
        '<path d="' + isp + '" fill="none" stroke="' + dn(isc, .55) + '" stroke-width=".55" stroke-linejoin="round"/>' +
        '<path d="' + isp + '" fill="none" stroke="' + up(isc, .3) + '" stroke-opacity=".45" stroke-width=".25" stroke-linejoin="round" transform="translate(.4 .45)"/>';
      if (IS.hg) { var hx0 = w * IS.hg[0], hy0 = h * IS.hg[1], hx1 = w * IS.hg[2], hy1 = h * IS.hg[3];
        out += '<path d="M' + hx0 + ' ' + hy0 + 'L' + hx1 + ' ' + hy1 + '" stroke="#000" stroke-opacity=".5" stroke-width="2.9" stroke-linecap="round" transform="translate(.3 .4)" filter="' + U('b3') + '"/>' +
          '<path d="M' + hx0 + ' ' + hy0 + 'L' + hx1 + ' ' + hy1 + '" stroke="#8d9096" stroke-width="2.6" stroke-linecap="round"/><path d="M' + hx0 + ' ' + hy0 + 'L' + hx1 + ' ' + hy1 + '" stroke="#eceef0" stroke-width=".9" stroke-linecap="round" transform="translate(-.25 0)"/>'; }
    }
    if (look.bar) { var bb = look.bar, bxx = w * bb[0], byy = h * bb[1], q = 0; for (var bi = 0; bi < 16; bi++) { var bwd = [.35, .2, .5, .2, .3, .2, .45, .25][bi % 8]; out += '<rect x="' + (bxx + q) + '" y="' + byy + '" width="' + bwd + '" height="' + bb[3] + '" fill="#d4d4d4" opacity=".7"/>'; q += bwd + .28; } }
    out += '</g>';
    /* ผนังเคสรอบตัว + มุมกันกระแทก + ปุ่มกด — รุ่นที่มี Camera Control เว้นช่องเปิดที่ผนังด้านนั้น */
    var bp = btnPos(P), cn = bp.cc ? rrp(-t - .5, bp.cc[0] - .7, t + .75, bp.cc[1] - bp.cc[0] + 1.4, .6, .6) : '';
    if (cn) out += '<defs><mask id="kn' + 'k' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '"><rect x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '" fill="#fff"/><path d="' + cn + '" fill="#000"/></mask></defs><g mask="url(#knk' + u + ')">';
    out += '<g mask="url(#kmk' + u + ')">';   // ขอบที่พับเข้าหลัง (bw กว้าง) ต้องเว้นรูกล้องด้วย
    out += '<path d="' + outer + inner + '" fill-rule="evenodd" fill="' + U('kw') + '" opacity="' + (clear && !look.edge ? .82 : 1) + '"/>';   // ผนังใสหนาเห็นชัด (ภาพร้าน)
    /* ผนังเป็นท่อโค้ง: ด้านล่างขวามืด · ด้านบนซ้ายสว่าง · เส้นแสงคมกลางผนัง · รอยต่อผนังกับแผ่นหลังเป็นเส้นเข้มบาง */
    out += '<path d="' + outer + inner + '" fill-rule="evenodd" fill="' + U('ks') + '"/>';
    out += '<path d="' + outer + inner + '" fill-rule="evenodd" fill="' + U('kh') + '" opacity="' + (look.chrome ? .15 : clear ? .5 : dkW ? .22 : back === 'solid' ? .2 : .32) + '"/>';
    out += '<path d="' + outer + '" fill="none" stroke="' + dn(ec, .3) + '" stroke-opacity=".5" stroke-width=".22"/>';
    out += '<path d="' + rrp(-t / 2, -t / 2, w + t, h + t, R + t / 2, R + t / 2) + '" fill="none" stroke="#fff" stroke-opacity="' + (clear ? .55 : .2) + '" stroke-width=".35" filter="' + U('b2') + '"/>';
    out += '<path d="' + rrp(-t * .62, -t * .62, w + t * 1.24, h + t * 1.24, R + t * .62, R + t * .62) + '" fill="none" stroke="' + U('kh') + '" stroke-width=".22"/>';
    out += '<path d="' + inner + '" fill="none" stroke="#000" stroke-opacity="' + (clear ? .18 : .28) + '" stroke-width=".18"/>';
    if (bw > 1) out += '<path d="' + rrp(0, 0, w, h, R, R) + '" fill="none" stroke="#000" stroke-opacity="' + (dkW ? .25 : .1) + '" stroke-width=".25" filter="' + U('b2') + '"/>';   // รอยพับจากผนังโค้งลงมาเป็นขอบแบนบนหลัง
    out += '</g>';
    /* ในช่องเปิดเห็นข้างเครื่อง (สีกรอบ) + ปุ่ม Camera Control กระจกเข้ม */
    if (cn) out += '</g><path d="' + rrp(-t + .3, bp.cc[0] - .55, t - .3, bp.cc[1] - bp.cc[0] + 1.1, .5, .5) + '" fill="' + fcol + '"/><rect x="' + (-t + .3) + '" y="' + (bp.cc[0] - .55) + '" width=".5" height="' + (bp.cc[1] - bp.cc[0] + 1.1) + '" fill="#000" opacity=".25"/>' +
      '<rect x="' + (-t + .55) + '" y="' + bp.cc[0] + '" width="' + (t - .75) + '" height="' + (bp.cc[1] - bp.cc[0]) + '" rx=".42" fill="' + dn(fcol, .55) + '" stroke="' + up(fcol, .2) + '" stroke-width=".15"/>' +
      '<path d="' + cn + '" fill="none" stroke="' + dn(ec, .3) + '" stroke-opacity=".45" stroke-width=".18"/>';   // ขอบช่องเปิด
    /* มุมกันกระแทก (air cushion) — ภาพร้าน: มุมโป่งออกนอกแนวขอบ ~1.5 มม. แบบนูนมน ไล่ความหนาจากศูนย์ที่ปลายโค้งไปมากสุดตรงแนวทแยง
       วาดเป็นก้อนเนื้อ (ไม่ใช่เส้น) : เงาตก → เนื้อมุม → เงาด้านล่างขวา → เส้นแสงบนสัน + เส้นหักเหด้านใน */
    if (look.bump) [[R, R, 180], [w - R, R, 270], [w - R, h - R, 0], [R, h - R, 90]].forEach(function (c) {
      var B = look.bumpB || 1.5, N = 28, a0 = c[2] * Math.PI / 180, ri = R - bw - .2, o = [], ii = [], hl = [], hi = [];
      for (var i = 0; i <= N; i++) {
        var f = i / N, a = a0 + f * Math.PI / 2, s = Math.pow(Math.sin(Math.PI * f), 2), ro = R + t + B * s, cs = Math.cos(a), sn = Math.sin(a);
        o.push((c[0] + ro * cs).toFixed(2) + ' ' + (c[1] + ro * sn).toFixed(2));
        ii.unshift((c[0] + (ri - 1.4 * s) * cs).toFixed(2) + ' ' + (c[1] + (ri - 1.4 * s) * sn).toFixed(2));   // ด้านในก็หนาขึ้นตรงมุม
        hl.push((c[0] + (ro - .55) * cs).toFixed(2) + ' ' + (c[1] + (ro - .55) * sn).toFixed(2));
        hi.push((c[0] + (ri - 1.4 * s + .5) * cs).toFixed(2) + ' ' + (c[1] + (ri - 1.4 * s + .5) * sn).toFixed(2));
      }
      var lobe = 'M' + o.join('L') + 'L' + ii.join('L') + 'Z', inl = 'M' + ii.slice().reverse().join('L');
      /* เคสใส: ก้อนมุมเป็นเนื้อใส — เห็นแค่ฝ้าขาวบาง ๆ + เส้นหักเหแสง (ห้ามทาสีทึบ ไม่งั้นกลายเป็นแผ่นเทาสามเหลี่ยม)
         เคสขอบสี: เนื้อเดียวกับผนัง (ทึบ) จึงทาซ้อนได้ไม่เข้มขึ้น · ไม่ใส่ไล่เงา ks ต่อมุม (ไล่ตาม bbox ของมุมเองจะเป็นปื้นมืด) */
      var cl = clear && !look.edge;
      out += '<path d="' + lobe + '" fill="#000" opacity="' + (cl ? .1 : .26) + '" transform="translate(.35 .55)" filter="' + U('b3') + '"/>' +
        (cl ? '<path d="' + lobe + '" fill="#fff" opacity=".42"/><path d="M' + hi.join('L') + '" fill="none" stroke="#8d949c" stroke-opacity=".55" stroke-width=".35" transform="translate(.25 .3)"/>' : '<path d="' + lobe + '" fill="' + U('kw') + '"/>') +   // เคสใส: เส้นหักเหเทาในเนื้อมุม (ภาพร้าน: มุมถุงลมเห็นชัดเพราะขอบหักเหแสง)
        '<path d="' + inl + '" fill="none" stroke="#000" stroke-opacity="' + (cl ? .14 : .22) + '" stroke-width=".35" filter="' + U('b2') + '"/>' +
        '<path d="M' + hl.join('L') + '" fill="none" stroke="#fff" stroke-opacity="' + (clear ? .8 : dkW ? .22 : .4) + '" stroke-width=".4" stroke-linecap="round"/>' +
        '<path d="M' + hi.join('L') + '" fill="none" stroke="#fff" stroke-opacity="' + (clear ? .5 : .14) + '" stroke-width=".3" stroke-linecap="round"/>' +
        '<path d="M' + o.join('L') + '" fill="none" stroke="' + (cl ? '#8a939d' : dn(ec, .3)) + '" stroke-opacity="' + (cl ? .75 : .45) + '" stroke-width="' + (cl ? .32 : .2) + '"/>' +
        (cl ? '<path d="M' + hl.join('L') + '" fill="none" stroke="#9fb4c8" stroke-opacity=".45" stroke-width=".25" transform="translate(.3 .35)"/>' : '');   // รอบ QC: มุมใสบนเครื่องสีอ่อนหายไป — ของจริงเห็นขอบหักเหเทาอมฟ้าชัด
      var bpc = (col[6] && col[6].bump) || (typeof look.bump === 'string' ? look.bump : '');   /* col[6].bump = สีปลายมุมรายสี (OSGEER ใส มุมสีตามรุ่นสี) */
      if (bpc) {   // ปลายมุมกันกระแทกสีเข้ม (สั้น ๆ ตรงกลางโค้งมุม)
        var am = a0 + Math.PI / 4, d = look.bd || .3, r = R + t + B * .6;   /* bd = ความยาวปลายมุมสี (เรเดียนครึ่งหนึ่ง) · bsw = ความหนา */
        out += '<path d="M' + (c[0] + r * Math.cos(am - d)) + ' ' + (c[1] + r * Math.sin(am - d)) + 'A' + r + ' ' + r + ' 0 0 1 ' + (c[0] + r * Math.cos(am + d)) + ' ' + (c[1] + r * Math.sin(am + d)) + '" fill="none" stroke="' + bpc + '" stroke-width="' + (look.bsw || 2.4) + '" stroke-linecap="round"/>';
      }
    });
    /* ปุ่มบนเคส: เงาตก + ตัวปุ่ม + เส้นแสงบนสันปุ่ม */
    var bk = function (x, y) {
      var r = '<rect x="' + x + '" y="' + (y[0] - .6) + '" width="1.1" height="' + (y[1] - y[0] + 1.2) + '" rx=".55"';
      return r + ' fill="#000" opacity=".25" transform="translate(.25 .35)" filter="' + U('b2') + '"/>' + r + ' fill="' + U('kw') + '" stroke="' + dn(ec, .25) + '" stroke-opacity=".4" stroke-width=".15"/>' +
        '<rect x="' + (x + .3) + '" y="' + y[0] + '" width=".3" height="' + (y[1] - y[0]) + '" rx=".15" fill="#fff" opacity="' + (dkW ? .22 : .55) + '"/>';
    };
    bp.L.forEach(function (y) { out += bk(-t - .55, y); }); bp.R.forEach(function (y) { out += bk(w + t - .55, y); });
    /* กรอบกล้อง (ตัดส่วนที่เกินขอบเคสออก) */
    out += '<g clip-path="url(#kok' + u + ')">';
    var lip = function (c, wd, op, ex) { return '<path d="' + hp + '" fill="none" stroke="' + c + '" stroke-width="' + wd + '" stroke-opacity="' + (op || 1) + '"' + (ex || '') + '/>'; };
    /* กรอบกล้องยกสูง: เงาลึกลงในรู (ตกบนแผ่นกล้องของเครื่องด้านบนซ้าย) + เงาตกนอกกรอบด้านล่างขวา */
    if (look.cam !== 'island') out += '<g clip-path="url(#kqk' + u + ')"><path d="' + hp + '" fill="none" stroke="#000" stroke-opacity="' + (clear ? .3 : .5) + '" stroke-width="2.4" transform="translate(.6 .8)" filter="' + U('b3') + '"/></g>';
    out += '<path d="' + hp + '" fill="' + (ic ? '#000' : 'none') + '" fill-opacity=".3" stroke="#000" stroke-opacity="' + (clear ? .22 : .38) + '" stroke-width="' + ((look.lw || 1.3) + .8) + '" transform="translate(.45 .7)" filter="' + U('b3') + '"/>';
    if (look.cam === 'stand') out += lip('#1d1d1f', 1.8) + lip('#fff', .25, .35) + '<rect x="' + (hb[0] + hb[2] / 2 - 5) + '" y="' + (hb[1] + hb[3] + .2) + '" width="10" height="1.5" rx=".75" fill="#2a2a2c"/>';
    else if (look.cam === 'island') {
      /* ho = รูเลนส์แคบ/กว้างกว่าวงเลนส์ของเครื่อง (มม. — ซิลิโคนรูแนบเลนส์ ปิดวงโลหะของเครื่อง → ค่าติดลบ)
         nh = แผ่นครอบทึบทั้งแผ่น ไม่เจาะรู (JLK: ฝาฝ้าครอบกล้องทั้งก้อน เห็นเลนส์เบลอ ๆ ผ่านฝา) */
      var ip = hp, holes = '', ho = look.ho || 0;
      if (!look.nh) {
        ln.L.forEach(function (c) { holes += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + .25 + ho) + '" fill="#000"/>'; });
        holes += '<circle cx="' + ln.flash[0] + '" cy="' + ln.flash[1] + '" r="' + (ln.flash[2] + .7) + '" fill="#000"/>';
        ln.aux.forEach(function (a) { holes += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + (a[2] + .6) + '" fill="#000"/>'; });
      }
      out += '<defs><mask id="khole' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '"><rect x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '" fill="#fff"/>' + holes + '</mask></defs>';
      var rc = ic ? dn(ic, .2) : '#ffffff';
      /* deco = ลายบนฝาครอบ (หน้ายิ้ม/หมี/โบว์/สติกเกอร์) ตัดจากภาพร้านมาวางบนแผ่นของเรา — src/dst = [u0,v0,u1,v1] สัดส่วนของแผ่นภาพ (−t…w+t)
         ขอบนุ่ม (mask เบลอ) ให้กลืนกับสีแผ่น · รูเลนส์ของรุ่นนั้นเจาะทะลุลายเสมอ */
      var dS = shot && shot.deco, decoArt = '';
      if (dS) {
        var sq = shot.q, bl = function (a, b) { return [(1 - a) * (1 - b) * sq[0] + a * (1 - b) * sq[2] + a * b * sq[4] + (1 - a) * b * sq[6], (1 - a) * (1 - b) * sq[1] + a * (1 - b) * sq[3] + a * b * sq[5] + (1 - a) * b * sq[7]]; };
        var s0 = dS.src, d0 = dS.dst || dS.src, EW = w + 2 * t, EH = h + 2 * t, dx = -t + d0[0] * EW, dy = -t + d0[1] * EH, dw = (d0[2] - d0[0]) * EW, dh = (d0[3] - d0[1]) * EH;
        var dq = bl(s0[0], s0[1]).concat(bl(s0[2], s0[1]), bl(s0[2], s0[3]), bl(s0[0], s0[3]));
        decoArt = '<defs><mask id="kdm' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '"><rect x="' + (dx + 1) + '" y="' + (dy + 1) + '" width="' + (dw - 2) + '" height="' + (dh - 2) + '" rx="2" fill="#fff" filter="' + U('b3') + '"/></mask></defs>' +
          '<g mask="url(#khole' + u + ')"><g mask="url(#kdm' + u + ')">' + shotImg({ s: shot.s, q: dq, recol: shot.recol }, dx, dy, dw, dh) + '</g></g>';
      }
      out += ic ? '<path d="' + ip + '" fill="' + U('ki') + '" mask="url(#khole' + u + ')"/>' + lip(dn(ic, .15), .5, .6)
        : (look.nh ? '<g clip-path="url(#kqk' + u + ')"><use href="#ph' + u + '" filter="' + U('fz') + '"/></g>' : '') +   // ฝาฝ้าทึบ: เห็นเลนส์เบลอผ่านฝา
          '<path d="' + ip + '" fill="#fff" opacity="' + (look.nh ? .5 : clear ? .24 : .42) + '" mask="url(#khole' + u + ')"/>' +   // แผ่นครอบใส/ขุ่น (cols[3] = กรอบชุบรอบแผ่น)
          (col[3] ? lip(look.chrome ? U('kw') : col[3], look.lw || 1.4) + lip('#fff', .25, .5)
            /* รอบ QC 10 เคส (พ.ย. 2026): แผ่นครอบใสของจริง (ภาพร้านเคสใสมุมหนา/อะคริลิก) เป็นก้อนใสหนา — ผนังรอบแผ่นหนา ~2 มม. เห็นเป็นแถบขาวใสมีเส้นแสงคม 2 เส้น (ขอบนอก/ขอบใน) + เส้นหักเหเทากลางผนัง
               เดิมวาดเส้นบาง ๆ จนแผ่นครอบดูเป็นแผ่นกล้องของเครื่องเอง */
            : '<defs><mask id="kcw' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '">' + lip('#fff', 2.2) + lip('#000', 1.6) + '</mask></defs>' +
              lip('#fff', 2.2, .3) + lip(U('kh'), 2.2, .55) + lip(U('ks'), 2.2, .3) +
              '<g mask="url(#kcw' + u + ')">' + lip('#fff', 3, .95) + '</g>' + lip('#7d848c', .22, .5, ' transform="translate(.15 .2)"'));
      out += decoArt;
      /* ขอบรูเลนส์ — แผ่นใสหักเหแสงเป็นวงขาวหนา (ภาพร้าน) · แผ่นใส: ผนังรูหนา ~1.3 มม. = แถบขาวใส + เส้นแสงคมขอบใน/ขอบนอก + เส้นหักเหเทา */
      if (!look.nh) ln.L.forEach(function (c) {
        if (ic) { out += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + .45 + ho) + '" fill="none" stroke="' + rc + '" stroke-width=".5"/>'; return; }
        var r0 = c[2] + .25 + ho, C = '<circle cx="' + c[0] + '" cy="' + c[1] + '" fill="none" ';
        out += C + 'r="' + (r0 + .65) + '" stroke="#fff" stroke-opacity=".32" stroke-width="1.3"/>' + C + 'r="' + (r0 + .1) + '" stroke="#fff" stroke-opacity=".95" stroke-width=".28"/>' +
          C + 'r="' + (r0 + 1.25) + '" stroke="#fff" stroke-opacity=".7" stroke-width=".2"/>' + C + 'r="' + (r0 + .75) + '" stroke="#7d848c" stroke-opacity=".5" stroke-width=".18"/>';
      });
      /* มิติของแผ่นครอบ: ไล่แสงบนแผ่น + สันขอบสว่างซ้ายบน/มืดล่างขวา + ผนังรูเลนส์ (ขอบเงาด้านบนซ้ายของแต่ละรู) */
      out += '<path d="' + ip + '" fill="' + U('kL') + '" mask="url(#khole' + u + ')"/><path d="' + ip + '" fill="' + U('kD') + '" mask="url(#khole' + u + ')"/>' + lip(U('ks'), 1, 1) + lip(U('kh'), .4, ic && lum(ic) < 90 ? .45 : .8);
      if (!look.nh) ln.L.concat([ln.flash]).forEach(function (c, i) {
        var rr = (i < ln.L.length ? c[2] + .25 + ho : c[2] + .7) - .35;
        out += '<path d="M' + (c[0] - rr * .97) + ' ' + (c[1] + rr * .26) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + (c[0] + rr * .26) + ' ' + (c[1] - rr * .97) + '" fill="none" stroke="#000" stroke-opacity=".45" stroke-width=".7" stroke-linecap="round" filter="' + U('b2') + '"/>';
      });
      /* lc = กระจกกันเลนส์สีเทาใสปิดเลนส์ทีละตัว (ภาพร้านเคสซาติน: เห็นเลนส์เป็นจานเทาหม่น ไม่ดำสนิท) */
      if (look.lc) ln.L.forEach(function (c) {
        var r = c[2] + .25 + ho;
        out += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '" fill="' + look.lc + '" opacity=".62"/>' +
          '<path d="M' + (c[0] - r * .8) + ' ' + (c[1] - r * .1) + 'A' + r * .82 + ' ' + r * .82 + ' 0 0 1 ' + (c[0] - r * .1) + ' ' + (c[1] - r * .8) + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".5" stroke-linecap="round"/>';
      });
    } else {   // ขอบกล้องยกสูง: เคสใสเป็นขอบใส · เคสขอบสีใช้สีขอบ · cols[3] = กรอบโลหะคนละสี
      var fl = col[3] || (clear && !look.edge ? '#d3d7dc' : dn(ec, .05)), fo = clear && !look.edge && !col[3], lw = look.lw || (fo ? 1.6 : 1.1);
      /* ขอบใสยกสูงรอบกล้อง (ภาพร้าน: ผนังใสหนาเห็นเป็นแถบขาวเทา + เส้นแสงด้านใน) */
      /* ตัวกรอบ → เงาด้านล่างขวาของกรอบ → ไฮไลต์บนสันกรอบด้านซ้ายบน */
      if (fo && P.g) {   /* Galaxy เคสใส (ภาพร้าน rock space/HI-SHIELD/OSGEER ซูมดู พ.ย. 2026): ขอบช่องกล้องเป็น "ผนังคริสตัลใส" — เห็นเครื่องทะลุ
           มีเส้นแสงคมทั้งขอบนอกและขอบใน · สันบนซ้ายสว่าง ล่างขวาหม่น · ไม่ใช่แถบพลาสติกเทาทึบ */
        out += '<defs><mask id="kre' + u + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '">' + lip('#fff', lw) + lip('#000', lw - .6) + '</mask></defs>';
        out += lip('#fff', lw, .3) + lip(U('kh'), lw, .55) + lip(U('ks'), lw, .45) +
          '<g mask="url(#kre' + u + ')"><path d="' + hp + '" fill="none" stroke="#fff" stroke-width="' + (lw + 1) + '" stroke-opacity=".95"/></g>' +   // เส้นแสงคมขอบนอก + ขอบใน
          '<g clip-path="url(#kqk' + u + ')">' + lip('#000', lw + .9, .16) + '</g>' +   // ผนังด้านในรูหักเหเป็นแถบหม่นบาง ๆ
          lip('#5d646c', .22, .35, ' transform="translate(.12 .16)"') +   // เส้นหักเหเทากลางผนังใส (ภาพร้าน)
          lip('#fff', .22, .6, ' transform="translate(-.15 -.2)"');
      } else if (P.g && col[3]) {   // Galaxy กรอบกล้องโลหะชุบ (ภาพร้าน Wsken: กรอบตัว L ชุบเงินเงา) — แถบแสงสะท้อนหลายแถบ + ขอบคม
        out += '<defs>' + K.lin('kr', 1, 1, [[0, up(fl, .4)], [.25, fl], [.45, dn(fl, .35)], [.7, up(fl, .3)], [1, dn(fl, .2)]]) + '</defs>' +
          lip(dn(fl, .45), lw + .3) + lip(U('kr'), lw) + lip('#fff', .25, .7, ' transform="translate(-.15 -.2)"') + lip('#000', .2, .35, ' transform="translate(.2 .25)"');
      } else
      out += lip(fl, lw, fo ? .9 : 1) + lip(U('ks'), lw, 1) + lip(U('kh'), lw * .45, fo ? .9 : lum(fl) < 90 ? .45 : .7) + lip('#fff', .3, fo ? .75 : .2) + (fo && !P.g ?'<path d="' + rrp(hb[0] + lw / 2, hb[1] + lw / 2, hb[2] - lw, hb[3] - lw, Math.max(.5, hb[4] - lw / 2), Math.max(.5, hb[5] - lw / 2)) + '" fill="none" stroke="#7d848c" stroke-opacity=".45" stroke-width=".18"/>' : '');
    }
    out += '</g>';
    if (lrc) ln.L.forEach(function (c) {   // ห่วงโลหะรอบเลนส์แต่ละตัว
      out += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + .45) + '" fill="none" stroke="' + U('kl') + '" stroke-width="1.1"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] - .1) + '" fill="none" stroke="#000" stroke-opacity=".45" stroke-width=".2"/>';
    });
    if (look.cam === 'metal') ln.L.forEach(function (c) {   // ห่วงเลนส์โลหะ (แถมในกล่อง)
      out += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + .35) + '" fill="none" stroke="' + U('kt') + '" stroke-width="1.2"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] - .2) + '" fill="none" stroke="#000" stroke-opacity=".5" stroke-width=".25"/>';
    });
    /* slide = ฝาสไลด์ของ NILLKIN CamShield (ภาพร้านครอปเทียบ พ.ย. 2026): ฝาจอดอยู่ฝั่งขวาของหน้าต่างกล้อง (ตำแหน่งเปิด เห็นเลนส์ทุกตัว)
       กว้างตั้งแต่ขวาของเลนส์ที่อยู่ขวาสุด +1.4 ถึงขอบหน้าต่าง · สูงเต็มหน้าต่าง · ร่องจับแนวตั้ง 4 เส้นค่อนไปทางขวา · ขอบซ้ายยกมีเงาตกบนแผ่นกล้อง */
    if (look.slide && P.g) {
      var lr0 = Math.max.apply(null, ln.L.concat([ln.flash], ln.aux || []).map(function (c) { return c[0] + c[2]; })) + 1.4;
      var sx0 = Math.max(lr0, hb[0] + hb[2] - w * .4), sx1 = hb[0] + hb[2] - .5, sy0 = hb[1] + .5, sy1 = hb[1] + hb[3] - .5, sc = col[6] && col[6].acc ? up(col[6].acc, .04) : back === 'solid' && bc ? dn(bc, .06) : '#202124';   /* ฝาสไลด์สีเดียวกับเคสทึบ (ภาพร้านเคสเกราะสีโรสโกลด์) */
      var sdp = rrp(sx0, sy0, sx1 - sx0, sy1 - sy0, 3.6, 3.6), gx0 = sx0 + (sx1 - sx0) * .62, gy0 = sy0 + (sy1 - sy0) * .3, gy1 = sy1 - (sy1 - sy0) * .3;
      out += '<path d="' + sdp + '" fill="#000" opacity=".6" transform="translate(-.6 .5)" filter="' + U('b3') + '"/>' +
        '<path d="' + sdp + '" fill="' + sc + '"/><path d="' + sdp + '" fill="' + U('kL') + '"/><path d="' + sdp + '" fill="' + U('kD') + '"/>' +
        '<path d="' + sdp + '" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".3" transform="translate(-.15 -.15)"/><path d="' + sdp + '" fill="none" stroke="#000" stroke-opacity=".6" stroke-width=".25"/>';
      [0, 1.1, 2.2, 3.3].forEach(function (d) { out += '<path d="M' + (gx0 + d) + ' ' + gy0 + 'V' + gy1 + '" stroke="#060607" stroke-width=".55" stroke-linecap="round"/><path d="M' + (gx0 + d + .32) + ' ' + gy0 + 'V' + gy1 + '" stroke="#fff" stroke-opacity=".16" stroke-width=".2" stroke-linecap="round"/>'; });
    }
    return out;
  }

  /* o.k = พิกเซลต่อมิลลิเมตร · o.look = เคสที่จะใส่ (ไม่ส่ง = เครื่องเปล่า) */
  function phoneArt(m, o) {
    var P = PH[m.slug], u = ++uid, k = o.k || 2.2;
    var col = P.col[Math.min(o.pc || 0, P.col.length - 1)];
    var inner = '<g id="ph' + u + '">' + (P.g ? galaxySVG(P, col, u) : P.fr === 'uni' ? uniSVG(P, col, u) : classicSVG(P, col, u)) + '</g>';
    var fcol = P.fr === 'uni' || P.g ? col[3] || col[1] : col[3] || frameCol(P, col[4] || col[1]);   // สีกรอบเครื่อง (เห็นผ่านช่อง Camera Control ของเคส)
    if (o.look) inner += '<g class="ty-case">' + caseSVG(P, o.look, o.look.cols[o.cc || 0] || o.look.cols[0], u, fcol) + '</g>';
    return '<svg viewBox="-4 -4 ' + (P.w + 8) + ' ' + (P.h + 8) + '" width="' + ((P.w + 8) * k) + '" height="' + ((P.h + 8) * k) + '" style="overflow:visible;display:block" role="img" aria-label="' + esc(m.name) + '">' + inner + '</svg>';
  }

  var FR = { alu: 'อะลูมิเนียม', steel: 'สเตนเลสสตีล', ti: 'ไทเทเนียม', uni: 'อะลูมิเนียมยูนิบอดี' };
  var BK = { glossy: 'กระจกเงา', frost: 'กระจกฝ้าด้าน', matte: 'กระจกสีเนื้อด้าน' };
  var CAMT = { diag: '2 เลนส์ เรียงแนวทแยง', pill: '2 เลนส์ เรียงแนวตั้งในแคปซูล', tri: '3 เลนส์ + LiDAR', triwide: '3 เลนส์ ในแถบกล้องกว้างเต็มความกว้างเครื่อง', air: '1 เลนส์ ในแถบกล้องกว้างด้านบน',
    gx3: '3 เลนส์ เรียงแนวตั้งชิดขอบซ้าย (ลอยเดี่ยว)', gxp: '3 เลนส์ เรียงแนวตั้งในแคปซูลยกสูง', gxu: '3 เลนส์ใหญ่ + 2 เลนส์เล็ก เรียงชิดขอบซ้าย' };
  var BTN = { sw: 'สวิตช์ปิดเสียง', act: 'ปุ่ม Action', actcc: 'ปุ่ม Action + Camera Control', pv: 'ปุ่มเพาเวอร์ + ปุ่มปรับเสียง (ด้านขวา)', pvs: 'ปุ่มเพาเวอร์ + ปุ่มปรับเสียง · มี S Pen' };
  var SRC = { apple: 'สีตรวจจากหน้าร้านค้า Apple', wiki: 'สีอ้างอิงจาก Wikipedia', est: 'สีประมาณเอง — ยังไม่ได้ยืนยัน' };
  var maker = function (P) { return P.g ? 'Samsung' : 'Apple'; };

  /* ---------- แถบเลือกโทรศัพท์ / รุ่น ---------- */
  function mountBar(el) {
    var open = '', tab = bySlug(S.model).series;
    function render() {
      var m = bySlug(S.model), br = BRANDS.filter(function (b) { return b.k === S.brand; })[0] || BRANDS[0];
      var ico = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg>';
      var brandPop = BRANDS.map(function (b) { return '<button class="po ' + (b.on ? '' : 'dis') + (b.k === S.brand ? ' sel' : '') + '" data-brand="' + b.k + '"' + (b.on ? '' : ' disabled') + '><b>' + b.n + '</b><small>' + b.sub + '</small></button>'; }).join('');
      var gens = S.brand === 'galaxy' ? ['S26', 'S25', 'S24', 'S23', 'A'] : ['18', '17', '16', '15', '14', '13'];
      if (gens.indexOf(tab) < 0) tab = bySlug(S.model).series;
      var modelPop = '<div class="gtabs">' + gens.map(function (g) { return '<button data-tab="' + g + '" class="' + (g === tab ? 'on' : '') + '">' + tabName(g) + '</button>'; }).join('') + '</div><div class="mchips">' +
        ALL().filter(function (x) { return x.series === tab && brandOfM(x) === S.brand; }).map(function (x) { var p = PH[x.slug]; return '<button class="po' + (x.slug === S.model ? ' sel' : '') + '" data-model="' + x.slug + '"><b>' + short(x) + '</b><small>จอ ' + p.scr + '" · ' + (cnt(x.slug) ? cnt(x.slug) + ' เคส' : 'ยังไม่มีเคส') + '</small></button>'; }).join('') + '</div>';
      el.innerHTML = '<div class="pf' + (open === 'brand' ? ' open' : '') + '"><button class="pfb" data-open="brand"><span class="pi">' + ico + '</span><span><small>เลือกโทรศัพท์</small><b>' + br.n + '</b></span><i>▾</i></button><div class="pop">' + brandPop + '</div></div>' +
        '<span class="parrow">→</span>' +
        '<div class="pf wide' + (open === 'model' ? ' open' : '') + '"><button class="pfb" data-open="model"><span class="pi">' + ico + '</span><span><small>เลือกรุ่น</small><b>' + m.name + '</b></span><i>▾</i></button><div class="pop">' + modelPop + '</div></div>' +
        '<a class="btn pgo" href="tryon.html">ลองทาบเคส<span class="ar2">↗</span></a>';
      el.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var k = b.getAttribute('data-open'); open = open === k ? '' : k; if (k === 'model') tab = bySlug(S.model).series; render(); }; });
      el.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); tab = b.getAttribute('data-tab'); render(); }; });
      /* เปลี่ยนยี่ห้อ → ไปรุ่นแรกของยี่ห้อนั้น (รุ่นล่าสุดของ iPhone / Galaxy) */
      el.querySelectorAll('[data-brand]').forEach(function (b) { b.onclick = function () { open = ''; var k = b.getAttribute('data-brand'); if (k === S.brand) { render(); return; } set({ model: k === 'galaxy' ? 'galaxy-s26-ultra' : 'iphone-17-pro-max' }); }; });
      el.querySelectorAll('[data-model]').forEach(function (b) { b.onclick = function () { open = ''; set({ model: b.getAttribute('data-model') }); }; });
    }
    document.addEventListener('click', function (e) { if (open && !el.contains(e.target)) { open = ''; render(); } });
    document.addEventListener('selchange', render);
    render();
  }

  /* ---------- เวทีลองทาบ: ใส่/ไม่ใส่เคส · เทียบ 2 เคสข้างกัน ----------
     สถานะที่จำไว้: S.on (ใส่เคสอยู่ไหม) · S.cmp (โหมดเทียบ) · S.caseId/S.cc = เคส A · S.caseB/S.ccB = เคส B · S.slot = ช่องที่กำลังเลือก */
  /* กันเคสค้างกลางแอนิเมชัน (เลื่อนเยื้องจากเครื่อง): ถ้าแท็บถูกพัก/สลับแอป/ประหยัดแบต transition อาจไม่เดินจนจบ
     → หลังเวลาแอนิเมชัน ตัด transition ชั่วครู่ให้เคสกระโดดไปตำแหน่งสุดท้ายเสมอ */
  function settle(stg) {
    setTimeout(function () {
      stg.querySelectorAll('.ty-case').forEach(function (c) { c.style.transition = 'none'; c.getBoundingClientRect(); });
      requestAnimationFrame(function () { stg.querySelectorAll('.ty-case').forEach(function (c) { c.style.transition = ''; }); });
    }, 650);
  }
  function stage(el, opt) {
    opt = opt || {};
    /* ยังไม่มีสินค้าเลย (ข้อมูลว่าง ยังไม่ได้รันบอท) → บอกแทนการพัง */
    if (!pool().length) { el.innerHTML = '<p class="hint" style="padding:24px;text-align:center">ยังไม่มีเคสให้ลองทาบ — รันบอทแล้ว publish ก่อน (ดู bot/README.md)</p>'; return; }
    /* ใส่รุ่นนี้ได้ขึ้นก่อน (ยืนยันแล้ว → ต้องเช็ก → ไม่มีรุ่นนี้) แล้วเรียงตามลำดับเดิม (คัดมือก่อน แล้วขายดี) */
    var gs = 'rec', limit = opt.limit || (el.id === 'ty-home' ? 6 : 0);   // การเรียงของกริดเคส · หน้าแรกโชว์แค่ 6 ชิ้น
    var rank = { yes: 0, maybe: 1, no: 2 };
    var sorted = function () { return uniq(pool().filter(function (p) { return brandOk(p, S.brand); }), S.model).sort(function (a, b) { return rank[fit(a, S.model)] - rank[fit(b, S.model)] || a.order - b.order; }); };   // เฉพาะเคสของยี่ห้อที่เลือก
    function pick(id, skip) { var q = prod(id); if (q && (opt.fixedId || brandOk(q, S.brand))) return q; return sorted().filter(function (p) { return fit(p, S.model) !== 'no' && p.id !== skip; })[0] || sorted()[0] || D.products[0]; }
    var fitTxt = function (fx) { return fx === 'yes' ? 'ใส่ได้' : fx === 'maybe' ? 'ต้องเช็ก' : 'ไม่มีรุ่นนี้'; };
    function render(anim) {
      var m = bySlug(S.model), P = PH[m.slug], pc = Math.min(S.pc || 0, P.col.length - 1), pcol = P.col[pc];
      var duo = !opt.fixedId && !!S.cmp, on = S.on !== false, slot = duo && S.slot === 'b' ? 'b' : 'a';
      var A = pick(opt.fixedId || S.caseId), B = duo ? pick(S.caseB, A.id) : null;
      var ccOf = function (p, v) { return Math.min(v || 0, lookOf(p).cols.length - 1); };
      var ccA = ccOf(A, S.cc), ccB = B ? ccOf(B, S.ccB) : 0, cur = slot === 'b' ? B : A, cc = slot === 'b' ? ccB : ccA, look = lookOf(cur);
      var k = opt.k || 2.4, art = function (p, c, kk) { return phoneArt(m, { k: kk, pc: pc, look: lookOf(p), cc: c }); };
      var verdictOf = function (p) {
        var f = fit(p, m.slug);
        return f === 'yes' ? '<div class="verdict yes">✓ <b>ใส่ ' + m.name + ' ได้</b> — ร้านมีตัวเลือกรุ่นนี้ให้เลือกในหน้าสินค้า (ตรวจ 1 พ.ย. 2026)</div>' :
          f === 'maybe' ? '<div class="verdict maybe">! <b>ยังยืนยันไม่ได้</b> สำหรับ ' + m.name + ' — ตัวเลือกในร้านอาจรวมกับรุ่นอื่น เช็กช่อง "รุ่น" บน Shopee ก่อนสั่ง</div>' :
          '<div class="verdict no">✕ <b>ไม่เห็นตัวเลือก ' + m.name + '</b> ในร้านนี้ — ภาพบนเครื่องไว้ดูดีไซน์เท่านั้น ลองเคสอื่นในรายการ</div>';
      };
      /* เวที */
      var tog = '<div class="ty-tog" role="group" aria-label="ใส่เคส"><button data-on="0" class="' + (on ? '' : 'on') + '">ไม่ใส่เคส</button><button data-on="1" class="' + (on ? 'on' : '') + '">ใส่เคส</button></div>';
      var view = duo ? '<div class="ty-duo">' + [[A, ccA, 'a'], [B, ccB, 'b']].map(function (x) {
        var fx = fit(x[0], m.slug);
        return '<button class="ty-pane' + (x[2] === slot ? ' cur' : '') + '" data-slot="' + x[2] + '"><span class="ty-phone">' + art(x[0], x[1], k * .84) + '</span>' +
          '<span class="ty-cap"><i>' + x[2].toUpperCase() + '</i><b>' + esc(nm(x[0])) + '</b><small class="f-' + fx + '">' + baht(x[0].price) + ' · ' + fitTxt(fx) + '</small></span></button>';
      }).join('') + '</div>' :
        '<div class="ty-phone">' + art(A, ccA, k) + '</div>' + (fit(A, m.slug) === 'no' ? '<div class="ty-badge">ร้านนี้ไม่มีตัวเลือก ' + m.name + '</div>' : '');
      /* แผงขวา */
      var swP = P.col.map(function (c, i) { return '<button class="sw' + (i === pc ? ' on' : '') + '" data-pc="' + i + '" title="' + esc(c[0]) + '" style="--c:' + c[1] + '"><span></span></button>'; }).join('');
      var swC = look.cols.map(function (c, i) { var sc = swatchOf(look, c); return '<button class="sw' + (i === cc ? ' on' : '') + '" data-cc="' + i + '" title="' + esc(c[0]) + '" style="--c:' + (sc || 'transparent') + '"><span class="' + (sc ? '' : 'clr') + '"></span></button>'; }).join('');
      var mode = opt.fixedId ? '' : '<div class="ty-mode" role="group"><button data-cmp="0" class="' + (duo ? '' : 'on') + '">ลองทีละเคส</button><button data-cmp="1" class="' + (duo ? 'on' : '') + '">เทียบ 2 เคส</button></div>';
      var slots = duo ? '<div class="ty-slots">' + [['a', A], ['b', B]].map(function (x) { return '<button data-slot="' + x[0] + '" class="' + (x[0] === slot ? 'on' : '') + '"><i>' + x[0].toUpperCase() + '</i><span><small>' + (x[0] === slot ? 'กำลังเลือกช่องนี้' : 'กดเพื่อเปลี่ยนเคสช่องนี้') + '</small><b>' + esc(nm(x[1])) + '</b></span></button>'; }).join('') + '</div>' : '';
      /* รายการเคส + ปุ่มกรองให้ผู้ซื้อเลือกเองว่าจะลองแบบไหน */
      var flt = KINDS.some(function (k) { return k[0] === S.flt; }) ? S.flt : 'all', all = sorted();
      var shown = all.filter(function (x) { return kindHas(lookOf(x), flt) || x.id === cur.id; });
      var chips = opt.fixedId ? '' : '<div class="ty-flt" role="group" aria-label="กรองเคส">' + KINDS.map(function (k) {
        var n = all.filter(function (x) { return kindHas(lookOf(x), k[0]); }).length;
        return n ? '<button data-flt="' + k[0] + '" class="' + (k[0] === flt ? 'on' : '') + '">' + k[1] + ' <small>' + n + '</small></button>' : '';
      }).join('') + '</div>';
      /* กริดเคส (แบบ CASETiFY/Apple: รูปใหญ่ ราคาใต้รูป กดแล้วภาพเครื่องฝั่งซ้ายเปลี่ยนทันที) */
      var items = shown.slice();
      if (gs === 'price') items.sort(function (a, b) { return a.price - b.price; });
      var total = items.length; if (limit) items = items.slice(0, limit);
      var list = opt.fixedId ? '' :
        '<div class="cs-head"><h3>' + (duo ? 'เลือกเคสใส่ช่อง ' + slot.toUpperCase() : 'เลือกเคสที่จะลอง') + '</h3><span>' + all.length + ' แบบ · กดเพื่อสวมบนเครื่อง</span></div>' +
        '<div class="cs-bar">' + chips + '<label class="cs-sort">เรียง<select data-gs><option value="rec"' + (gs === 'rec' ? ' selected' : '') + '>แนะนำ</option><option value="price"' + (gs === 'price' ? ' selected' : '') + '>ราคาต่ำสุด</option></select></label></div>' +
        '<div class="cs-grid">' + items.map(function (x) {
          var fx = fit(x, m.slug), sel = x.id === cur.id;
          var tag = duo ? (x.id === A.id ? '<em class="cs-pick">A</em>' : x.id === B.id ? '<em class="cs-pick">B</em>' : '') : (sel ? '<em class="cs-pick">✓ กำลังลอง</em>' : '');
          return '<button class="cs-t f-' + fx + (sel ? ' on' : '') + '" data-case="' + x.id + '"><span class="cs-im"><img src="' + src(x) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' + tag + (x.liveOnly ? '' : '<span class="cs-cur">คัดแล้ว</span>') + '<span class="cs-fit">' + fitTxt(fx) + '</span></span>' +
            '<span class="cs-b"><b>' + esc(nm(x)) + '</b><span class="cs-m"><strong>' + baht(x.price) + '</strong>' + (x.rating ? '<small>★ ' + (+x.rating).toFixed(1) + '</small>' : '') + '</span></span></button>';
        }).join('') + '</div>' + (limit && total > limit ? '<div class="cs-more"><a class="btn sm ghost" href="tryon.html">ดูเคสทั้งหมด ' + total + ' แบบ ↗</a></div>' : '');
      var row = function (p, tagc) {
        var btns = '<div class="ty-btns">' + (opt.fixedId ? '' : '<a class="btn sm dark" href="product.html?id=' + p.id + '&m=' + m.slug + '">ดูหน้าเคส</a>') + '<a class="btn sm" href="' + p.shopee + '" target="_blank" rel="noopener sponsored">Shopee ↗</a></div>', rt = p.rating ? ' · ★ ' + (+p.rating).toFixed(1) : '';
        if (opt.fixedId) return '<div class="ty-info"><div><b>' + esc(nm(p)) + '</b><span>' + esc(p.shop) + rt + ' · ' + baht(p.price) + '</span>' + '<small class="ty-sim">ภาพลองทาบเป็นเคสที่คล้ายกัน วาดจำลองจากรูปร้าน — ดูรูปจริงในร้านก่อนสั่ง</small>' + '</div>' + btns + '</div>';
        return '<div class="ty-info">' + (tagc ? '<i class="ty-tag">' + tagc + '</i>' : '') + '<div class="ty-tx"><b>' + esc(nm(p)) + '</b><span>' + esc(p.shop) + rt + '</span>' + '<small class="ty-sim">ภาพลองทาบเป็นเคสที่คล้ายกัน วาดจำลองจากรูปร้าน — ดูรูปจริงในร้านก่อนสั่ง</small>' + '</div><div class="ty-buy"><strong class="ty-price">' + baht(p.price) + '</strong>' + btns + '</div></div>';
      };
      var diff = duo && A.price !== B.price ? '<p class="note ty-diff">' + (A.price < B.price ? 'A' : 'B') + ' ถูกกว่า ' + baht(Math.abs(A.price - B.price)) + ' (ราคาเริ่มต้นในร้าน)</p>' : '';
      var spec = '<div class="ty-spec"><div><span>ขนาด</span><b>' + P.h + ' × ' + P.w + ' × ' + P.d + ' มม.</b></div><div><span>หน้าจอ</span><b>' + P.scr + ' นิ้ว</b></div><div><span>กรอบ</span><b>' + FR[P.fr] + '</b></div><div><span>หลังเครื่อง</span><b>' + BK[P.bk] + '</b></div><div><span>กล้องหลัง</span><b>' + CAMT[P.cam] + '</b></div><div><span>ปุ่ม</span><b>' + BTN[P.btn] + '</b></div></div>';
      var stageHtml = '<div class="ty-stage' + (on && !anim ? '' : ' off') + (duo ? ' duo' : '') + '">' + tog + (opt.fixedId ? '' : '<span class="ty-model">' + m.name + ' · ' + esc(pcol[0]) + '</span>') + view + '</div>';
      var srcNote = P.col.length + ' สีที่ ' + maker(P) + ' ขายจริง — ' + SRC[pcol[2]] + (look.sample ? ' · สีเคสเป็นสีตัวอย่าง สีที่ร้านขายจริงดูจากภาพในหน้าร้าน' : '');
      var foot = '<p class="note">ภาพเครื่องวาดตามขนาดและตำแหน่งกล้องที่วัดจากภาพสินค้าของ ' + maker(P) + (P.g ? ' (ภาพเรนเดอร์ทางการ ความละเอียดต่ำ คลาดเคลื่อนได้ราว ±0.5 มม.)' : '') + ' ส่วนเคสวาดตามดีไซน์ในภาพร้าน (วัสดุ กรอบกล้อง วงแม่เหล็ก ขาตั้ง) ไม่ใช่ภาพถ่ายสินค้า</p>';
      if (opt.fixedId) {   // หน้าสินค้า: เวทีเล็กในกล่อง + สีอยู่ข้างเวที
        /* สีเครื่อง/สีเคสอยู่ใต้ภาพเครื่องทันที (บนมือถือไม่ต้องเลื่อนหนีภาพไปหาสี) */
        el.innerHTML = '<div class="ty"><div class="ty-view">' + stageHtml +
          '<div class="ty-opts"><div class="ty-og"><span>สีเคส</span><div>' + swC + '</div></div><div class="ty-og"><span>สีเครื่อง</span><div>' + swP + '</div></div></div>' +
          '<div class="ty-name"><b>' + m.name + '</b><span>' + esc(pcol[0]) + '</span></div>' + spec + '</div>' +
          '<div class="ty-side">' + verdictOf(A) +
          '<p class="note" style="margin:0 0 12px">' + P.col.length + ' สีที่ ' + maker(P) + ' ขายจริง — ' + SRC[pcol[2]] + '</p>' +
          (look.sample ? '<p class="note" style="margin:-4px 0 10px">สีเคสเป็นสีตัวอย่าง — สีที่ร้านขายจริงดูจากภาพในหน้าร้าน</p>' : '') +
          row(A) + foot + '</div></div>';
      } else {   // หน้าลองทาบ: ซ้าย = เวทีติดหน้าจอ + สี + กล่องราคา · ขวา = โหมด + กริดเคส
        el.innerHTML = '<div class="ty"><div class="ty-view">' + stageHtml +
          '<div class="ty-opts"><div class="ty-og"><span>สีเครื่อง</span><div>' + swP + '</div></div><div class="ty-og"><span>สีเคส' + (duo ? ' ' + slot.toUpperCase() : '') + '</span><div>' + swC + '</div></div></div>' +
          '<div class="ty-dock">' + (duo ? row(A, 'A') + row(B, 'B') + diff : row(A)) + '</div>' +
          '<details class="ty-sd"><summary>สเปกเครื่อง ' + m.name + ' · ที่มาของสี</summary><p class="note ty-src">' + srcNote + '</p>' + spec + '</details></div>' +
          '<div class="ty-side"><div class="cs-top">' + mode + '</div>' + (duo ? slots : verdictOf(A)) + list + foot + '</div></div>';
      }
      var stg = el.querySelector('.ty-stage');
      /* สวมเคสแบบเลื่อนลงมาครอบ (CSS transition บน .ty-case) */
      if (anim && on) setTimeout(function () { stg.classList.remove('off'); settle(stg); }, 60);
      el.querySelectorAll('[data-on]').forEach(function (b) { b.onclick = function () { S.on = b.getAttribute('data-on') === '1'; save(); stg.classList.toggle('off', !S.on); settle(stg); el.querySelectorAll('[data-on]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      el.querySelectorAll('[data-cmp]').forEach(function (b) { b.onclick = function () { S.cmp = b.getAttribute('data-cmp') === '1'; S.slot = S.cmp ? 'b' : 'a'; S.on = true; save(); render(true); }; });
      el.querySelectorAll('[data-slot]').forEach(function (b) { b.onclick = function () { S.slot = b.getAttribute('data-slot'); save(); render(false); }; });
      el.querySelectorAll('[data-pc]').forEach(function (b) { b.onclick = function () { set({ pc: +b.getAttribute('data-pc') }); }; });
      el.querySelectorAll('[data-cc]').forEach(function (b) { b.onclick = function () { if (slot === 'b') S.ccB = +b.getAttribute('data-cc'); else S.cc = +b.getAttribute('data-cc'); save(); render(false); }; });
      el.querySelectorAll('[data-gs]').forEach(function (s) { s.onchange = function () { gs = s.value; render(false); }; });
      el.querySelectorAll('[data-flt]').forEach(function (b) { b.onclick = function () { S.flt = b.getAttribute('data-flt'); save(); render(false); }; });
      /* id ของเคสจาก affiliate เป็นข้อความ shopid_itemid จึงไม่แปลงเป็นตัวเลข */
      el.querySelectorAll('[data-case]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-case'); if (slot === 'b') { S.caseB = id; S.ccB = 0; } else { S.caseId = id; S.cc = 0; } S.on = true; save(); render(true); if (!opt.fixedId && innerWidth <= 980) el.querySelector('.ty-stage').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    }
    var last = S.model;
    document.addEventListener('selchange', function () { render(S.model !== last); last = S.model; });
    render(true);
  }

  window.TryOn = { state: S, set: set, fit: fit, mountBar: mountBar, stage: stage, phoneArt: phoneArt, lookOf: lookOf, hasLook: function (p) { return !!LOOK[p.id]; }, sameLook: function (a, b) { return !!LOOK[a.id] && LOOK[a.id] === LOOK[b.id]; }, brandsOf: caseBrands, _tex: buildTex, _geo: function () { return caseSVG.geo; } };   // _tex: เครื่องมือ QC ดูแผ่นภาพที่ดัดแล้ว
})();
