/* หน้าไถดูเคส pages/feed.html (2026-11-14)
   คัดจาก window.LIVE.products: เคสที่มี "ลาย/ลูกเล่น" ตามรสนิยมผู้ใช้ (docs/research/case-selection-research.md ข้อ 3.1)
   — ตั้งได้/ขาตั้ง · กำมะหยี่ · พาสเทล · กากเพชร · ลายน่ารัก/การ์ตูน · แต่งโบว์/มุก · + ร้านดีไซน์ที่คัดไว้ (CaseClub / Wishwindy)
   ด่าน: มีภาพ+ลิงก์ · ราคา ≥ ฿39 (ตัดราคาล่อ) · ขายแล้ว ≥ 100 (ร้านดีไซน์ไม่ต้อง) · ดาว ≥ 4.5 หรือยังไม่มีดาว
   เรียง: สุ่มแบบคงที่ต่อวัน (เข้าวันเดียวกันได้ลำดับเดิม เข้าวันใหม่ได้ลำดับใหม่) · ปัดซ้าย-ขวา = ภาพตัวเลือกสี/ลายจาก window.FEED_COLORS */
(function () {
  var L = (window.LIVE && window.LIVE.products) || [], FC = window.FEED_COLORS || {};
  var IMG = 'https://down-th.img.susercontent.com/file/';
  var root = document.getElementById('fv'), ct = document.getElementById('ct');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var baht = function (n) { return '฿' + Math.round(n).toLocaleString('en-US'); };
  var TAGS = [
    [/ตั้งได้|ขาตั้ง|ห่วงตั้ง|พับได้|stand|holder|kickstand/i, 'ตั้งได้'],
    [/กำมะหยี่|กำมะยี่|velvet/i, 'กำมะหยี่'],
    [/กากเพชร|glitter|วิบวับ/i, 'กากเพชร'],
    [/พาสเทล|pastel|มาการอง|macaron/i, 'พาสเทล'],
    [/การ์ตูน|น่ารัก|หมี|กระต่าย|แมว|ตุ๊กตา|cute|bunny|teddy|meow|(^|[^ห])ลาย/i, 'ลายน่ารัก'],
    [/ไข่มุก|โบว์|ริบบิ้น|bow|pearl/i, 'แต่งโบว์/มุก']
  ];
  var SHOP = /^(CaseClub|Wishwindy)$/i;
  /* ตัวการ์ตูนลิขสิทธิ์ — ไม่โชว์ (ชุดเดียวกับ LICENSED ใน assets/site.js) */
  var LICENSED = /sanrio|kitty|คิตตี้|kuromi|cinnamoroll|pochacco|โปชัคโกะ|melody|snoopy|สนูปปี้|pokemon|โปเกม่อน|doraemon|โดราเอม่อน|one ?piece|วันพีช|disney|marvel|ชินจัง|shin ?chan/i;
  var NOT_CASE = /สายคล้อง|กระเป๋าใส่แปรง|ฟิล์ม(?!.*เคส)|พาวเวอร์แบงค์|powerbank|หูฟัง/i;
  var priceOf = function (p) { return p.best_price || p.case_price || p.price || 0; };
  var tagOf = function (p) {
    if (SHOP.test(p.shop || '')) return 'ร้านดีไซน์';
    for (var i = 0; i < TAGS.length; i++) if (TAGS[i][0].test(p.name)) return TAGS[i][1];
    return '';
  };
  var clean = function (s) {
    return String(s || '').replace(/[\u{1F300}-\u{1FAFF}☀-➿️]/gu, '').replace(/\[[^\]]{0,20}\]|【[^】]{0,20}】/g, '').replace(/\s+/g, ' ').trim();
  };
  var list = L.filter(function (p) {
    if (!p.image || !p.link || NOT_CASE.test(p.name) || LICENSED.test(p.name) || priceOf(p) < 39) return false;
    if (p.rating && p.rating < 4.5) return false;
    var shop = SHOP.test(p.shop || '');
    return tagOf(p) && (shop || (p.sold || 0) >= 100);
  });
  /* สุ่มคงที่ต่อวัน (ตามวันไทย) */
  var day = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), seed = 0;
  for (var i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) >>> 0;
  var rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  list = list.map(function (p) { return [rnd() - (FC[p.key] ? .35 : 0), p]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  /* สลับ: เคสทั่วไปที่มีลาย/ลูกเล่น 2 : ร้านดีไซน์ 1 (ร้านดีไซน์มีหลายร้อยชิ้น ราคาสูง ยอดขายน้อย — ไม่ให้ท่วมฟีด) */
  var shopL = list.filter(function (p) { return SHOP.test(p.shop || ''); }), restL = list.filter(function (p) { return !SHOP.test(p.shop || ''); }), mix = [];
  while (shopL.length || restL.length) { if (restL.length) mix.push(restL.shift()); if (restL.length) mix.push(restL.shift()); if (shopL.length) mix.push(shopL.shift()); }
  list = mix;

  var qs = new URLSearchParams(location.search);
  /* ?id=<ร้าน_สินค้า> (จากแถบ "ไถดูเคสแนวนี้ต่อ" ในหน้าสินค้า pages/p — แบบ E): เริ่มที่เคสนั้น แล้วตามด้วยเคสลูกเล่นเดียวกัน 12 ชิ้น */
  var startId = qs.get('id');
  if (startId) {
    var first = L.filter(function (p) { return p.key === startId && p.image && p.link; })[0];
    if (first) {
      list = list.filter(function (p) { return p.key !== startId; });
      var tg = tagOf(first), same = tg ? list.filter(function (p) { return tagOf(p) === tg; }).slice(0, 12) : [];
      list = [first].concat(same, list.filter(function (p) { return same.indexOf(p) < 0; }));
    }
  }
  /* ?src= (แบบ F: ลิงก์จาก TikTok / Reels / Shorts / โพสต์กลุ่มเข้าฟีดตรง) → ป้าย "มาจาก …" + ปุ่ม "หน้าหลัก" แทน × */
  var SRC = { tiktok: 'TikTok', reels: 'Reels', shorts: 'YouTube Shorts', fb: 'Facebook', ig: 'Instagram' }[(qs.get('src') || '').toLowerCase()];
  if (SRC) {
    var se = document.getElementById('src'), x = document.getElementById('x');
    if (se) { se.textContent = 'มาจาก ' + SRC; se.hidden = false; }
    if (x) { x.className = 'home'; x.textContent = '⌂ หน้าหลัก'; x.removeAttribute('aria-label'); }
  }

  if (!list.length) { root.innerHTML = '<p class="fv-empty">ยังไม่มีเคสให้ไถดูตอนนี้ — <a href="ranking.html" style="color:var(--lime)">ดูอันดับเคส</a></p>'; return; }

  var slide = function (p, i) {
    var shots = FC[p.key] ? FC[p.key].map(function (c) { return [c[0], IMG + c[1]]; }) : [['', p.image]];
    var pr = priceOf(p), note = p.best_price && p.best_price < (p.case_price || p.price || Infinity) ? 'หลังโค้ดร้าน' : (p.price_max && p.price_max > pr ? 'เริ่มต้น · ตามตัวเลือก' : '');
    var meta = [p.shop, p.rating ? '★ ' + p.rating : '', p.sold ? 'ขายแล้ว ' + (p.sold >= 1000 ? (Math.floor(p.sold / 100) / 10) + 'k+' : p.sold) : ''].filter(Boolean).map(esc).join(' · ');
    var lazy = i > 1 ? ' loading="lazy"' : '';
    return '<section class="fv-s" data-i="' + i + '"><div class="bg" style="background-image:url(\'' + esc(shots[0][1]) + '\')"></div>' +
      '<div class="fv-car">' + shots.map(function (s) { return '<figure><img src="' + esc(s[1]) + '" alt="' + esc(clean(p.name) + (s[0] ? ' — ' + s[0] : '')) + '"' + lazy + ' referrerpolicy="no-referrer" decoding="async"></figure>'; }).join('') + '</div>' +
      (shots.length > 1 ? '<button type="button" class="fv-lr l" data-lr="-1" aria-label="สี/ลายก่อนหน้า">‹</button><button type="button" class="fv-lr r" data-lr="1" aria-label="สี/ลายถัดไป">›</button>' : '') +
      '<div class="fv-dots">' + (shots.length > 1 ? shots.map(function (_, k) { return '<i' + (k ? '' : ' class="on"') + '></i>'; }).join('') : '') + '</div>' +
      '<div class="fv-info"><span class="fv-tag">' + esc(tagOf(p)) + '</span>' + (shots.length > 1 ? '<span class="fv-cn">' + esc(shots[0][0] || '') + ' · ปัดดู ' + shots.length + ' แบบ</span>' : '') +
      '<h2>' + esc(clean(p.name)) + '</h2>' +
      '<div class="fv-pr"><b>' + baht(pr) + '</b>' + (note ? '<span>' + esc(note) + '</span>' : '') + '</div>' +
      '<div class="fv-meta">' + meta + '</div>' +
      '<div class="fv-acts"><a class="btn" href="' + esc(p.link) + '" target="_blank" rel="noopener sponsored nofollow">ไปซื้อที่ Shopee ↗</a>' +
      '<a class="btn ghost" href="p/' + esc(p.key) + '.html">รายละเอียด</a></div></div>' +
      (i === 0 ? '<div class="fv-hint" id="hint">ไถขึ้นเพื่อดูเคสถัดไป ↑</div>' : '') + '</section>';
  };
  /* วาดทีละชุด ไม่ต้องสร้างทั้งหมดตั้งแต่แรก */
  var BATCH = 12, made = 0;
  var more = function () { var end = Math.min(list.length, made + BATCH), h = ''; for (; made < end; made++) h += slide(list[made], made); root.insertAdjacentHTML('beforeend', h); };
  more();

  var cur = 0, hint = document.getElementById('hint');
  var setCt = function () { ct.textContent = (cur + 1) + ' / ' + list.length; };
  setCt();
  root.addEventListener('scroll', function () {
    var i = Math.round(root.scrollTop / root.clientHeight);
    if (i !== cur) { cur = i; setCt(); if (hint) { hint.classList.add('gone'); hint = null; } }
    if (made - cur < 5 && made < list.length) more();
  }, { passive: true });
  /* ปัดซ้าย-ขวา: อัปเดตจุด + ชื่อสี */
  root.addEventListener('scroll', function (e) {
    var car = e.target;
    if (!car.classList || !car.classList.contains('fv-car')) return;
    var k = Math.round(car.scrollLeft / car.clientWidth), s = car.parentNode, p = list[+s.getAttribute('data-i')];
    s.querySelectorAll('.fv-dots i').forEach(function (d, j) { d.classList.toggle('on', j === k); });
    var cn = s.querySelector('.fv-cn'), sh = FC[p.key];
    if (cn && sh && sh[k]) cn.textContent = sh[k][0] + ' · ' + (k + 1) + '/' + sh.length;
    var bg = s.querySelector('.bg'), im = car.querySelectorAll('img')[k];
    if (bg && im) bg.style.backgroundImage = 'url("' + im.src + '")';
  }, true);
  var go = function (d) {
    var t = Math.max(0, Math.min(list.length - 1, cur + d));
    if (t >= made && made < list.length) more();
    root.scrollTo({ top: t * root.clientHeight, behavior: 'smooth' });
  };
  /* ปุ่ม ‹ › เปลี่ยนสี/ลาย (บนคอมที่ใช้เมาส์ธรรมดาปัดแนวนอนไม่ได้) */
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.fv-lr');
    if (!b) return;
    var car = b.parentNode.querySelector('.fv-car');
    car.scrollBy({ left: +b.getAttribute('data-lr') * car.clientWidth, behavior: 'smooth' });
  });
  document.querySelectorAll('.fv-nav button').forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-d')); }); });
  /* ล้อเมาส์/ทัชแพดบนคอม: scroll-snap แบบ mandatory ดึงกลับที่เดิมเมื่อหมุนล้อทีละนิด (ผู้ใช้ทัก 14 พ.ย. "ไถขึ้นลงในคอมไม่ได้")
     → จัดการเอง: สะสม deltaY ถึงเกณฑ์แล้วเลื่อน 1 เคส · พักสั้น ๆ กันทัชแพดยิงซ้ำ · ปัดแนวนอน (deltaX) ปล่อยให้แถบภาพสีจัดการเอง */
  var acc = 0, lock = 0;
  root.addEventListener('wheel', function (e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    var now = Date.now();
    if (now < lock) return;
    acc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    if (Math.abs(acc) >= 40) { go(acc > 0 ? 1 : -1); acc = 0; lock = now + 650; }
  }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') { e.preventDefault(); go(-1); }
  });
})();
