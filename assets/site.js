/* รวมเคส (CaseHub) — สคริปต์หน้าเว็บ (vanilla, ไม่ต้อง build)
   หน้า HTML แต่ละหน้าเป็นเปลือก: <body data-page="home|models|model|product|deals|clips|about|structure">
   ส่วนหัว/ท้ายและรายการสินค้าวาดจาก DATA ใน assets/data.js */
(function () {
  var D = window.DATA;
  var IMG = 'https://down-bs-th.img.susercontent.com/';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var baht = function (n) { return '฿' + Math.round(n).toLocaleString('en-US'); };
  var q = function (k) { return new URLSearchParams(location.search).get(k); };
  /* เก็บตัวกรอง/การเรียง/จำนวนที่แสดงไว้ใน URL (replaceState) → กด Back กลับมาแล้วได้รายการเดิม ตรงกับตำแหน่งเลื่อนที่เบราว์เซอร์คืนให้ */
  var syncUrl = function (path, o) {
    var s = new URLSearchParams(); Object.keys(o).forEach(function (k) { if (o[k] !== '' && o[k] != null) s.set(k, o[k]); });
    var u = path + (String(s) ? '?' + s : '');
    try { if (location.pathname.split('/').pop() + location.search !== u) history.replaceState(history.state, '', u); } catch (e) {}
  };
  /* แบ่งหน้าเป็นเลขหน้า (แทนปุ่ม "แสดงเพิ่ม") — หน้าปัจจุบันเก็บใน URL ?page=N */
  var pageP = function () { var n = parseInt(q('page'), 10); return n > 1 ? n : 1; };
  var pagerHtml = function (total, per, page) {
    var pages = Math.ceil(total / per); if (pages <= 1) return '';
    var set = {}; [1, 2, pages - 1, pages, page - 1, page, page + 1].forEach(function (n) { if (n >= 1 && n <= pages) set[n] = 1; });
    var ns = Object.keys(set).map(Number).sort(function (a, b) { return a - b; }), h = '', last = 0;
    ns.forEach(function (n) {
      if (n - last > 1) h += '<span class="pg-gap">…</span>';
      h += '<button class="pg-n' + (n === page ? ' on' : '') + '" data-pg="' + n + '"' + (n === page ? ' aria-current="page"' : '') + ' aria-label="หน้า ' + n + '">' + n + '</button>'; last = n;
    });
    var a = (page - 1) * per + 1, b = Math.min(page * per, total);
    return '<nav class="pager" aria-label="เลือกหน้า"><button class="pg-n pg-s" data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>‹ ก่อนหน้า</button>' + h +
      '<button class="pg-n pg-s" data-pg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>ถัดไป ›</button></nav><p class="pg-info">แสดงแบบที่ ' + a + '–' + b + ' จาก ' + total + ' · หน้า ' + page + '/' + pages + '</p>';
  };
  var bindPager = function (box, go) {
    box.querySelectorAll('[data-pg]').forEach(function (b) { b.onclick = function () {
      go(+b.getAttribute('data-pg'));
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }   // เปลี่ยนหน้าแล้วกลับขึ้นบนสุด (ผู้ใช้ขอ 2026-11-09)
    }; });
  };
  /* ค้นหาจากชื่อสินค้า/ร้าน: ทุกคำที่พิมพ์ต้องอยู่ในข้อความ (ไม่สนตัวพิมพ์) */
  var qWords = function (v) { return String(v || '').toLowerCase().trim().slice(0, 60).split(/s+/).filter(Boolean); };
  var qHit = function (ws, text) { text = String(text).toLowerCase(); return ws.every(function (w) { return text.indexOf(w) >= 0; }); };
  var modelBySlug = function (s) { return D.models.concat(D.galaxy || []).filter(function (m) { return m.slug === s; })[0]; };   // รวม Galaxy (หน้าเคสตามรุ่นรองรับ Samsung ด้วย)
  /* ระดับความมั่นใจว่าใส่รุ่นนี้ได้: yes = ยืนยันจากตัวเลือกร้าน (คัดมือ) · named = ชื่อสินค้าเขียนรุ่นนี้ตรงตัว (เช่น "17 Pro Max") · maybe = เดาจากเลขซีรีส์เท่านั้น */
  var SUF = { '': '', pro: '-pro', promax: '-pro-max', plus: '-plus', '+': '-plus', air: '-air' };
  function namedOf(p) {
    if (p._named) return p._named;
    var t = String(p.title).toLowerCase(), out = [], m, re = /(?<![0-9a-z.])(1[3-8])(?:\s*(pro\s*max|promax|pro|plus|\+|air))?(?![a-z0-9])/g;
    if (/iphone|ไอโฟน|\bip\s?\d/.test(t)) while ((m = re.exec(t))) {
      var s = 'iphone-' + m[1] + SUF[(m[2] || '').replace(/\s+/g, '')];
      if (D.models.some(function (x) { return x.slug === s; }) && out.indexOf(s) < 0) out.push(s);
    }
    return (p._named = out);
  }
  var fitOf = function (p, slug) { return p.confirmed.indexOf(slug) >= 0 ? 'yes' : namedOf(p).indexOf(slug) >= 0 ? 'named' : p.maybe.indexOf(slug) >= 0 ? 'maybe' : 'no'; };
  /* ยี่ห้อมือถือที่เคสรองรับ (ดูจากชื่อสินค้า) และตระกูล Samsung Galaxy — ชื่อสินค้าของร้านมักเขียนหลายรุ่นรวมกัน จึงจัดเป็นตระกูล ไม่ลงรายรุ่น */
  var SSER = [['S26', /(?:^|[^a-z0-9])s\s?26(?!\d)/], ['S25', /(?:^|[^a-z0-9])s\s?25(?!\d)/], ['S24', /(?:^|[^a-z0-9])s\s?24(?!\d)/], ['S23', /(?:^|[^a-z0-9])s\s?23(?!\d)/],
    ['S22', /(?:^|[^a-z0-9])s\s?22(?!\d)/], ['S21', /(?:^|[^a-z0-9])s\s?21(?!\d)/], ['A series', /(?:^|[^a-z0-9])a\d{2}s?(?![a-z0-9])/], ['Z Fold / Flip', /z\s?(?:fold|flip)/]];
  var brandsOf = function (p) {
    var t = String(p.title).toLowerCase(), b = [];
    if (p.confirmed.concat(p.maybe).some(function (s) { return !/^galaxy-/.test(s); }) || /iphone|ไอโฟน|\bip\s?\d/.test(t)) b.push('iphone');   // รุ่น Galaxy ใน maybe ไม่ทำให้เป็นเคส iPhone
    if (/samsung|galaxy|ซัมซุง/.test(t)) b.push('samsung');
    return b;
  };
  var isIphoneItem = function (p) { return brandsOf(p).indexOf('iphone') >= 0; };
  var samsungItems = function () { return allProducts().filter(function (p) { return brandsOf(p).indexOf('samsung') >= 0; }); };
  var galCount = function (name) { return samsungItems().filter(function (p) { return !name || SSER.some(function (r) { return r[0] === name && r[1].test(String(p.title).toLowerCase()); }); }).length; };

  /* ---------- ข้อมูลสดจากบอท (assets/live.js — ไม่มีก็ได้) ----------
     สินค้าจากบอทแยกไว้ในรายการ L ไม่ปนกับ D.products ที่คัดมือ (ลองทาบเคสใช้ D.products + ชิ้นใน L ที่ออกแบบเคสไว้แล้ว)
     บอทรู้รุ่นแค่ค่าเดียวจากคำค้น จึงใส่เป็น "maybe" เสมอ จนกว่าเราจะยืนยันรุ่นเอง
     สินค้าที่ตรงกับเคสที่คัดมืออยู่แล้ว (itemid เดียวกัน) ไม่เพิ่มซ้ำ แต่แนบราคาล่าสุดไว้ใน p.live */
  var LIVE = window.LIVE && window.LIVE.products ? window.LIVE : null;
  var L = [];
  var num = function (s) { return parseFloat(String(s).replace(/,/g, '')); };
  var soldText = function (n) { return n >= 1000 ? (Math.floor(n / 100) / 10) + 'k+' : n > 0 ? n + '+' : ''; };
  function slugOfModel(name) {
    var k = String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var m = D.models.filter(function (x) { return x.name.toLowerCase() === k; })[0];
    return m ? m.slug : '';
  }
  /* "ลด ฿20 ขั้นต่ำ ฿100" / "ลด 10% สูงสุด ฿50 ขั้นต่ำ ฿100" → { kind, value, cap, min } (Coins คืนไม่นับเป็นส่วนลด) */
  function codeOf(t) {
    var m, c = { label: t };
    if ((m = t.match(/^ลด\s*฿\s*([\d,.]+)/))) { c.kind = 'baht'; c.value = num(m[1]); }
    else if ((m = t.match(/^ลด\s*([\d.]+)\s*%/))) { c.kind = 'pct'; c.value = num(m[1]); }
    else return null;
    if ((m = t.match(/สูงสุด\s*฿\s*([\d,.]+)/))) c.cap = num(m[1]);
    if ((m = t.match(/ขั้นต่ำ\s*฿\s*([\d,.]+)/))) c.min = num(m[1]);
    return c;
  }
  /* รายการจาก CSV affiliate ไม่มีรุ่น/สไตล์ที่บอทรู้ — เดาจากชื่อสินค้า (ใช้เป็น "maybe" เท่านั้น) */
  function slugsFromName(t) {
    t = String(t).toLowerCase();
    var out = [];
    if (/iphone|ไอโฟน|\bip\s?\d/.test(t)) {
      var series = {}, re = /(^|[^0-9.])(1[3-8])(?![0-9])/g, m;
      while ((m = re.exec(t))) series[m[2]] = 1;
      out = D.models.filter(function (x) { return series[x.series]; }).map(function (x) { return x.slug; });
    }
    return out.concat(galaxyFromName(t));
  }
  /* Galaxy S24–S26 ที่ระบุในชื่อ (ลองทาบรองรับเฉพาะ 3 ซีรีส์นี้) — "S25 Ultra" → ultra · "S25+" / "S25 Plus" → plus · "S25" เฉย ๆ → รุ่นธรรมดา · "S25 FE" ไม่นับ
     ชื่อสินค้ามักเขียนหลายรุ่นรวมกัน จึงเป็น "maybe" (ต้องเช็กตัวเลือกรุ่นในร้าน) เท่านั้น */
  function galaxyFromName(t) {
    t = String(t).toLowerCase();
    if (!/samsung|galaxy|ซัมซุง|(?:^|[^a-z0-9])s\s?2[3-6]|(?:^|[^a-z0-9])a(?:16|26|55|56)(?![0-9])/.test(t)) return [];
    var out = [], re = /(?:^|[^a-z0-9])s\s?(2[3-6])\s*(ultra|อัลตร้า|u(?![a-z])|plus|พลัส|\+|fe(?![a-z]))?/g, m, add = function (s) { if (out.indexOf(s) < 0 && (D.galaxy || []).some(function (x) { return x.slug === s; })) out.push(s); };
    while ((m = re.exec(t))) {
      var suf = m[2] || '', k = /^(ultra|อัลตร้า|u)$/.test(suf) ? '-ultra' : /^(plus|พลัส|\+)$/.test(suf) ? '-plus' : suf ? null : '';
      if (k !== null) add('galaxy-s' + m[1] + k);
    }
    var ra = /(?:^|[^a-z0-9])a(16|26|55|56)(?![0-9])/g;   // A16 / A26 / A55 / A56 (A series ที่ลองทาบรองรับ)
    while ((m = ra.exec(t))) add('galaxy-a' + m[1]);
    return out;
  }
  /* ประเภทเคส 3 กลุ่ม (ชนิด · ฟีเจอร์ · ดีไซน์) อ่านจากชื่อสินค้า — ใช้เป็นตัวกรองในแถบข้าง · "มีของเคลื่อนไหว" = ทรายไหล/ของเหลวกากเพชร/ลูกบอลหมุน/ฟิดเจ็ต/ปุ่มบีบ */
  var TAG_RULES = [
    ['ชนิด', 'ใส', /ใส(?!่)|clear|transparent|โปร่งใส/], ['ชนิด', 'ซิลิโคน', /ซิลิโคน|silicone|กำมะหยี่|นิ่ม/], ['ชนิด', 'กันกระแทก', /กันกระแทก|shockproof|drop|armor|เกราะ/],
    ['ชนิด', 'หนัง', /หนัง|leather|ฝาพับ|flip/], ['ชนิด', 'แข็ง/ด้าน', /ฮาร์ด|hard|matte|ด้าน|พีซี|\bpc\b|imd/], ['ชนิด', 'กระจก', /กระจก|glass|แก้ว/], ['ชนิด', 'ผ้า/ขนฟู', /ผ้า|ถัก|knit|plush|ขนฟู|ขนปุย/],
    ['ฟีเจอร์', 'แม่เหล็ก', /แม่เหล็ก|magnetic|magsafe|magnet/], ['ฟีเจอร์', 'ชาร์จไร้สาย', /ชาร์จไร้สาย|ชาร์ได้|ชาร์จได้|wireless/], ['ฟีเจอร์', 'ขาตั้ง', /ขาตั้ง|kickstand|\bstand\b/],
    ['ฟีเจอร์', 'สายคล้อง', /สายคล้อง|สายสะพาย|lanyard|strap|crossbody|สร้อย/], ['ฟีเจอร์', 'ช่องใส่บัตร', /ช่องใส่บัตร|ใส่บัตร|กระเป๋า|wallet|card holder/], ['ฟีเจอร์', 'กันกล้อง', /กันกล้อง|ป้องกันกล้อง|ปกป้องเลนส์|ฝาปิดกล้อง|slide|camera protect/],
    ['ดีไซน์', 'การ์ตูน', /การ์ตูน|น่ารัก|cartoon|cute|หมี|แมว|กระต่าย|sanrio|kitty|stitch/], ['ดีไซน์', 'กากเพชร', /กากเพชร|glitter|กลิตเตอร์|ระยิบ|เพชร|bling/], ['ดีไซน์', '3D นูน', /3d|นูน|ตุ๊กตา/],
    ['ดีไซน์', 'ลายพิมพ์', /ลาย|pattern|\bprint|ดอกไม้|floral/], ['ดีไซน์', 'ไล่สี/หินอ่อน', /ไล่สี|gradient|หินอ่อน|marble|aurora|ออโรร่า|rainbow/], ['ดีไซน์', 'มีไฟ/เรืองแสง', /เรืองแสง|glow|\bled\b|ไฟ(?!ล์)/],
    ['ดีไซน์', 'มีของเคลื่อนไหว', /ทรายไหล|quicksand|liquid glitter|น้ำไหล|ของเหลว|ลูกบอล|หมุนได้|spinner|fidget|ฟิดเจ็ต|pop ?it|squish|สกุชชี่|บีบ/]];
  var TAG_GROUPS = ['ชนิด', 'ฟีเจอร์', 'ดีไซน์'], TAG_OF = {};
  TAG_RULES.forEach(function (r) { TAG_OF[r[1]] = r[0]; });
  TAG_OF['น่ารัก'] = 'ดีไซน์'; TAG_OF['มินิมอล'] = 'ดีไซน์'; TAG_OF['กันเลนส์'] = 'ฟีเจอร์';   // แท็กเดิมที่บอท/คัดมือใส่ไว้
  function tagsFromName(t) {
    t = String(t).toLowerCase();
    return TAG_RULES.filter(function (r) { return r[2].test(t); }).map(function (r) { return r[1]; });
  }
  /* แท็กเต็ม = แท็กเดิมของสินค้า + ที่อ่านจากชื่อ (ไว้กรอง) — การ์ตูนที่คัดมือใช้ชื่อแท็กชุดเดียวกันอยู่แล้ว */
  function ftags(p) {
    if (p._ft) return p._ft;
    var o = (p.tags || []).slice(); tagsFromName(p.title || '').forEach(function (t) { if (o.indexOf(t) < 0) o.push(t); });
    return (p._ft = o);
  }
  /* วาดช่องเลือกแท็กแบบแบ่งกลุ่ม (ชนิด/ฟีเจอร์/ดีไซน์) — cnt = จำนวนต่อแท็ก, optFn = ตัวสร้างปุ่ม */
  function tagGroupsHtml(cnt, total, cur, optFn) {
    var h = optFn('tag', '', 'ทั้งหมด', total, !cur), used = {};
    TAG_GROUPS.forEach(function (g) {
      var ts = Object.keys(cnt).filter(function (t) { return TAG_OF[t] === g; }).sort(function (a, b) { return cnt[b] - cnt[a]; });
      ts.forEach(function (t) { used[t] = 1; });
      if (ts.length) h += '<h6 class="rk-sub">' + g + '</h6>' + ts.map(function (t) { return optFn('tag', t, t, cnt[t], cur === t); }).join('');
    });
    var rest = Object.keys(cnt).filter(function (t) { return !used[t]; }).sort(function (a, b) { return cnt[b] - cnt[a]; });
    if (rest.length) h += '<h6 class="rk-sub">อื่น ๆ</h6>' + rest.map(function (t) { return optFn('tag', t, t, cnt[t], cur === t); }).join('');
    return h;
  }
  /* บอทบางรายการอ่านรูปไม่ได้ (Shopee บล็อกหน้าสินค้า) → ยืมรูปจากรายการที่ชื่อสินค้าเหมือนกันทุกตัวอักษร (ร้านอื่นขายของเดียวกัน) — live.js ถูกบอทเขียนทับทุกรอบ จึงแก้ตรงนี้ */
  var IMG_BY_NAME = {};
  if (LIVE) LIVE.products.forEach(function (r) { var n = String(r.name || '').trim().toLowerCase(); if (n && r.image && !IMG_BY_NAME[n]) IMG_BY_NAME[n] = r.image; });
  /* ราคาตามรุ่น: ชื่อตัวเลือกของร้าน ("for iPhone 16 ProMax", "IPHONE16PROMAX", "13 / 14", "S24 Ultra") → slug รุ่นของเว็บ */
  function optSlugs(name) {
    /* แยกตามตัวคั่น "/ , | &" ทีละส่วน: "15 Pro/Pro Max" → ส่วนที่ไม่มีเลขรุ่นใช้เลขก่อนหน้า · "i15"/"ip15" · "S24U" = Ultra
       (ตัวเลือกจากหน้าร้านผ่าน bot/scripts/fetch_options.py ใช้ฟังก์ชันนี้ตัดสิน "✓ ยืนยันรุ่น" — แก้แล้วเทียบกับ OPTS จริงทุกครั้ง) */
    var out = [], m, last = '';
    var add = function (x) { if (out.indexOf(x) < 0 && modelBySlug(x)) out.push(x); };
    var SUF = function (x) { x = (x || '').replace(/\s+/g, ''); return /^(promax|pm|prm)$/.test(x) ? '-pro-max' : x === 'pro' ? '-pro' : /^(plus|\+)$/.test(x) ? '-plus' : x === 'air' ? '-air' : /^(ultra|u)$/.test(x) ? '-ultra' : x === 'fe' ? '-fe' : x ? '-' + x : ''; };
    String(name).toLowerCase().replace(/iphone|ไอโฟน|apple|samsung|galaxy|ซัมซุง|for|สำหรับ|รุ่น/g, ' ').replace(/[()]/g, ' ')
      .replace(/โปร\s*แม็?ก(?:ซ์|ส์)?/g, ' pro max').replace(/โปร/g, ' pro').replace(/พลัส/g, ' plus').replace(/อัลตร้า|อัลตรา/g, ' ultra')
      .replace(/pro\s*ma?xx+|pro\s*mx/g, 'promax').replace(/purs|pluss/g, 'plus')   /* สะกดผิดที่เจอจริงในตัวเลือกร้าน: 14PROMX, 16Promaxx, 15purs */.split(/[\/,|&]|และ/).forEach(function (part) {
      var s = ' ' + part.replace(/(^|[^a-z])ip?\s?(?=1[3-8](?![0-9]))/g, '$1 ') + ' ', hit = 0, re;
      re = /(?:^|[^a-z0-9])(1[3-8])\s*(pro\s*max|promax|prm|pm|pro|plus|\+|air|mini)?(?![a-z0-9])/g;
      while ((m = re.exec(s))) { add('iphone-' + m[1] + SUF(m[2])); last = m[1]; hit = 1; }
      re = /(?:^|[^a-z0-9])s\s?(2[3-6])\s*(ultra|plus|\+|fe|u)?(?![a-z0-9])/g;
      while ((m = re.exec(s))) { add('galaxy-s' + m[1] + SUF(m[2])); hit = 1; }
      re = /(?:^|[^a-z0-9])a\s?(\d{2})(?:\s*5g)?(?![a-z0-9])/g;
      while ((m = re.exec(s))) { add('galaxy-a' + m[1]); hit = 1; }
      if (!hit && last && (m = /^\s*(pro\s*max|promax|prm|pm|pro|plus|\+|air|mini)\s*$/.exec(part))) add('iphone-' + last + SUF(m[1]));
    });
    return out;
  }
  function optPriceMap(op) {
    if (!op) return null;
    var map = {}, n = 0;
    Object.keys(op).forEach(function (k) { optSlugs(k).forEach(function (s) { if (map[s] == null || op[k] < map[s]) { map[s] = op[k]; n++; } }); });
    return n ? map : null;
  }
  function optNote(op) {
    var ks = op ? Object.keys(op) : [];
    if (ks.length < 2) return '';
    ks.sort(function (a, b) { return op[a] - op[b]; });
    return 'ราคาต่างตามรุ่น: ' + ks.slice(0, 6).map(function (k) { return k.replace(/^for\s+/i, '') + ' ฿' + op[k]; }).join(' · ') + (ks.length > 6 ? ' · …' : '');
  }
  if (LIVE) LIVE.products.forEach(function (r, i) {
    if (!r.image) r.image = IMG_BY_NAME[String(r.name || '').trim().toLowerCase()] || '';
    var iid = String(r.key).split('_')[1];
    if (!/^https:\/\//i.test(String(r.link || ''))) r.link = '';   // กันลิงก์ javascript:/data: จากข้อมูลบอท
    else r.link = r.link.replace(/["'<>\s]/g, encodeURIComponent);
    /* ราคาล่อ: ร้านตั้งตัวเลือกหนึ่ง ฿1–14 (สติกเกอร์/สายคล้อง/รุ่นเก่า) ให้หน้าค้นหาดูถูก — Shopee และ feed affiliate รายงานราคานั้น
       ถ้าราคาต่ำกว่า ฿15 และตัวเลือกแพงสุดสูงกว่าเท่าตัวขึ้นไป = ราคาล่อ → ใช้ราคาตัวเลือกสูงสุดแทน (ตรงกับราคาเคสจริงที่ผู้ใช้เช็ก 2026-11-09) */
    if (r.case_price) {   // บอทอ่านราคาตัวเลือกจริงแล้ว (ตัดตัวเลือกล่อ/แพ็กหลายชิ้น) — แม่นกว่าเดา
      r.bait = r.price != null && r.price < r.case_price ? r.price : 0;
      if (r.price !== r.case_price) { r.price = r.case_price; r.best_price = Math.max(r.best_price || 0, r.case_price); }
      /* บอทอ่านได้ต่ำกว่า ฿15 (ร้านตั้ง ฿1 ให้บางรุ่น/โปรลูกค้าใหม่): มีตัวเลือกแพงกว่าเท่าตัว → ใช้ราคาตัวเลือกสูงสุด · ไม่มี → ไม่โชว์ */
      if (r.price < 15) { if (r.price_max >= r.price * 2 && r.price_max >= 15) { r.bait = r.price; r.price = r.price_max; r.best_price = r.price_max; } else return; }
    } else {
      r.bait = r.price != null && r.price < 15 && r.price_max >= r.price * 2 ? r.price : 0;
      if (r.bait) { r.price = r.price_max; r.best_price = r.price_max; }
      else if (r.price != null && r.price < 15) return;   // ราคาต่ำผิดปกติแต่ไม่รู้ราคาจริง → ไม่โชว์ดีกว่าโชว์ผิด
    }
    r.optMap = optPriceMap(r.opt_prices);
    var live = { low: r.bait ? 0 : r.lowest_30d || 0, was: r.bait ? 0 : r.price_before_discount || 0, price: r.price, best: r.best_price, voucher: r.best_voucher, next: r.next_voucher, checked: r.price_checked_at, affiliate: !!r.is_affiliate, visited: !!r.vouchers_checked_at };
    var cur = D.products.filter(function (p) { return String(p.id) === iid; })[0];
    if (cur) { cur.live = live; cur.key = r.key; if (r.link) cur.shopee = r.link; return; }   // เคสที่คัดมือ: ใช้ลิงก์ affiliate แทนลิงก์ร้านตรง
    if (!live.affiliate) return;   // ขายเฉพาะเคสที่เรามีลิงก์ affiliate
    var slug = slugOfModel(r.model);
    L.push({
      id: r.key, key: r.key, order: 1000 + i, title: r.name, shop: r.shop || '', mall: false, img: r.image || '', shopee: r.link, soldN: r.sold || 0,
      rating: r.rating || 0, reviews: '', sold: soldText(r.sold), ships: '',
      optMap: r.optMap, optNote: optNote(r.opt_prices),
      price: r.price, priceNote: r.bait ? 'ร้านมีตัวเลือกราคาล่อ ฿' + r.bait + ' (มักไม่ใช่ตัวเคส) — ราคาตัวเคสประมาณ ฿' + r.price : r.price_max && r.price_max > r.price ? '฿' + r.price + '–' + r.price_max + ' ตามตัวเลือก' : '',
      tags: r.style ? [r.style] : tagsFromName(r.name).slice(0, 3),
      blurb: r.model ? 'บอทเจอจากคำค้น ' + [r.model, r.style].filter(Boolean).join(' · ') + ' — ยังไม่ผ่านการคัดของทีม' : 'เคสจากรายการ affiliate ของเรา — ยังไม่ผ่านการคัดของทีม',
      caution: 'เรายังไม่ได้ยืนยันว่าใส่รุ่นไหนได้บ้าง เช็กตัวเลือกรุ่นในร้านก่อนสั่ง',
      codes: (r.vouchers || []).map(codeOf).filter(Boolean),
      confirmed: [], maybe: slug ? [slug] : slugsFromName(r.name), live: live, liveOnly: true
    });
  });
  /* เคสที่คัดมือแต่ไม่มีลิงก์ affiliate ไม่ขึ้นเว็บ (เมื่อมีข้อมูลจากบอทแล้วเท่านั้น) */
  if (LIVE) D.products = D.products.filter(function (p) { return p.live && p.live.affiliate; });
  /* ขายดีขึ้นก่อน (เรียงตามยอดขายใน CSV) */
  L.sort(function (a, b) { return b.soldN - a.soldN; });
  L.forEach(function (p, i) { p.order = 1000 + i; });
  D.extra = L;   // ลองทาบเคสหยิบเฉพาะชิ้นที่มีดีไซน์ใน LOOK ของ tryon.js
  /* รุ่นจาก "ตัวเลือกในหน้าร้าน" (bot/scripts/fetch_options.py → assets/options.js: {key: {p: ตัวเลือกรุ่นที่ซื้อได้, t: วันที่เช็ก}})
     แม่นกว่าเดาจากชื่อ → confirmed = รุ่นตามตัวเลือก และล้าง maybe (รุ่นที่ร้านไม่มี/ของหมด ไม่ขึ้นว่า "เดาจากซีรีส์")
     ตัวเลือกที่แปลงเป็นรุ่นที่เว็บรู้จักไม่ได้เลย (OPPO/Vivo/ชื่อแปลก) → คงการเดาเดิม */
  var OPTS = window.OPTS || {};
  D.products.concat(L).forEach(function (p) {
    var o = OPTS[p.key] || OPTS[p.id], fit = [];
    if (!o || !o.p) return;
    o.p.forEach(function (n) { optSlugs(n).forEach(function (s) { if (fit.indexOf(s) < 0) fit.push(s); }); });
    if (!fit.length) {   // ร้านมีแต่รุ่นที่เว็บไม่มี (Z Flip, 11, A15…) → ไม่ใช่เคสของรุ่นเรา ล้างการเดา · ชื่อตัวเลือกไม่มีเลขรุ่นเลย = อ่านไม่ออก คงการเดาเดิม
      if (o.p.every(function (n) { return /\d/.test(n); })) { p.maybe = []; p.optFit = o.t || 1; }
      return;
    }
    p.confirmed = fit; p.maybe = []; p.optFit = o.t || 1;
    if (p.liveOnly) p.caution = 'รุ่นตามตัวเลือกในหน้าร้าน (เช็กเมื่อ ' + String(o.t || '').slice(0, 10) + ') — ตัวเลือกอาจเปลี่ยน ดูอีกครั้งก่อนสั่ง';
  });
  var allProducts = function () { return D.products.concat(L); };
  var prodById = function (id) { id = String(id || ''); var by = function (v) { return allProducts().filter(function (p) { return String(p.id) === v; })[0]; }; return by(id) || (id.indexOf('_') > 0 ? by(id.split('_')[1]) : undefined); };   // ลิงก์แชร์ใช้รหัส ร้าน_สินค้า — เคสคัดมือใช้รหัสสินค้าอย่างเดียว
  var countFor = function (slug) { return allProducts().filter(function (p) { return fitOf(p, slug) !== 'no'; }).length; };

  /* ---------- ส่วนประกอบร่วม ---------- */
  /* แถบหมวดสินค้าใต้เมนู (ทุกหน้า) — อุปกรณ์เสริมยังไม่มีสินค้า แสดง "เร็ว ๆ นี้" ไม่ทำลิงก์ที่กดแล้วว่าง · เคสมือถือเข้มเฉพาะหน้าที่ดูเคสอยู่ */
  var CATS = [['case', 'เคสมือถือ', 1], ['phone', 'มือถือ & แท็บเล็ต'], ['film', 'ฟิล์มมือถือ'], ['power', 'ชาร์จ & แบตสำรอง'], ['stand', 'ขาตั้ง & ไลฟ์'], ['gadget', 'แกดเจ็ต']];   // ตัวเครื่องอยู่ถัดจากเคส
  /* กลุ่มบนแถบหมวด → หมวดย่อยใน accessories.js (เลือกหมวดย่อยได้ในหน้ากลุ่ม) · ลิงก์เก่า ?c=pb ฯลฯ ยังใช้ได้ */
  var GROUPS = { film: ['film'], power: ['pb', 'chg'], stand: ['stand'], gadget: ['watch', 'fan', 'strap', 'other'], phone: ['phone'] };
  var grpOf = function (c) { if (GROUPS[c]) return c; for (var g in GROUPS) if (GROUPS[g].indexOf(c) >= 0) return g; return 'film'; };   // ตัวเครื่องไว้ท้ายสุด — เว็บยังเน้นเคส
  var CICO = { case: '<rect x="6" y="2" width="12" height="20" rx="3"/><rect x="8" y="4.5" width="5" height="5" rx="1.5"/>', film: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 7l6 6M9 11l4 4"/>',
    chg: '<rect x="5" y="4" width="10" height="10" rx="2"/><path d="M8 4V1.5M12 4V1.5M10 14v2q0 5 5 5h4"/>', pb: '<rect x="5" y="3" width="14" height="19" rx="3"/><path d="M12 7l-3 5h6l-3 5"/>',
    phone: '<rect x="6.5" y="2" width="11" height="20" rx="2.5"/><path d="M10.5 4.5h3M10.5 19h3"/>',
    stand: '<rect x="8" y="2" width="8" height="12" rx="1.5"/><path d="M12 14v4M12 18l-5 4M12 18l5 4"/>', fan: '<circle cx="12" cy="9" r="6.5"/><path d="M12 9l3-4M12 9l-4-1M12 9l1 4.5M12 15.5V22M9 22h6"/>',
    watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6V2h6v4M9 18v4h6v-4M12 10v2.5l1.5 1"/>', strap: '<rect x="8" y="9" width="8" height="13" rx="2"/><path d="M10 9C6 6 7 2 12 2s6 4 2 7"/>',
    power: '<rect x="5" y="3" width="14" height="19" rx="3"/><path d="M12 7l-3 5h6l-3 5"/>', gadget: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6V2h6v4M9 18v4h6v-4M12 10v2.5l1.5 1"/>',
    other: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>' };
  /* อุปกรณ์เสริมที่คัดแล้ว (assets/accessories.js — ไม่มีก็ได้) · หมวดที่มีสินค้าเป็นลิงก์ไปหน้า accessories.html หมวดที่ยังว่างขึ้น "เร็ว ๆ นี้" */
  var ACCI = (window.ACC && window.ACC.items) || [];
  var accOf = function (k) { var cs = GROUPS[k] || [k]; return ACCI.filter(function (i) { return cs.indexOf(i.cat) >= 0; }); };
  function catBar(active) {
    var caseOn = active === 'ranking' || active === 'models';
    return '<nav class="rk-cats" aria-label="หมวดสินค้า">' + CATS.map(function (c) {
      var ic = '<svg viewBox="0 0 24 24" aria-hidden="true">' + CICO[c[0]] + '</svg>', n = c[2] ? 0 : accOf(c[0]).length;
      if (n) { var on = active === 'acc' && grpOf(q('c') || 'film') === c[0]; return '<a class="rk-cat' + (on ? ' on" aria-current="page' : '') + '" href="accessories.html?c=' + c[0] + '">' + ic + c[1] + ' <small>' + n + '</small></a>'; }
      return c[2] ? '<a class="rk-cat' + (caseOn ? ' on" aria-current="page' : '') + '" href="ranking.html">' + ic + c[1] + ' <small>' + allProducts().length + '</small></a>' : '<span class="rk-cat soon" aria-disabled="true">' + ic + c[1] + ' <small>เร็ว ๆ นี้</small></span>';
    }).join('') + '</nav>';
  }
  /* การ์ดกริดแน่น (หน้าอันดับ · เคสตามรุ่น · หน้าแรก) — o.n เลขอันดับ · o.score คะแนนความพอใจ (0 = รอเรตติ้ง) · o.slug รุ่นที่ดูอยู่ (โชว์ความแน่ใจว่าใส่ได้) */
  var FITL = { yes: '✓ ยืนยันรุ่นแล้ว', named: '≈ ชื่อระบุรุ่นนี้', maybe: '! เดาจากซีรีส์' };
  function gcard(p, o) {
    o = o || {};
    var pr = p.liveOnly && p.live && p.live.best < p.price ? p.live.best : p.price, f = o.slug ? fitOf(p, o.slug) : '';
    if (o.slug && p.optMap && p.optMap[o.slug] != null) pr = p.optMap[o.slug];   // ร้านตั้งราคาต่างตามรุ่น → ราคาของรุ่นที่ดูอยู่
    var sc = 'score' in o ? (o.score ? '<b class="rg-s">★ ' + o.score + '</b>' : '<b class="rg-s na">รอเรตติ้ง</b>') : p.rating ? '<b class="rg-s">★ ' + p.rating + '</b>' : '';
    return '<a class="rg-c' + (o.wk ? ' wk' : '') + '" href="product.html?id=' + p.id + (o.slug ? '&m=' + o.slug : '') + '"><span class="rg-im">' + img(p) + (o.n ? '<i class="rg-n">' + o.n + '</i>' : '') + (o.wk ? '<i class="rg-wk">ประจำสัปดาห์</i>' : '') + sc + wishBtn(p) + '</span>' +
      (FITL[f] ? '<span class="rg-fit ' + f + '">' + FITL[f] + '</span>' : '') +
      '<h4>' + esc(p.title) + '</h4><p><b>' + baht(pr) + '</b>' + (p.sold ? ' · ขาย ' + p.sold : '') + '</p>' +
      (window.TryOn && TryOn.hasLook(p) ? '<span class="rg-try" role="link" tabindex="0" data-try="tryon.html?id=' + p.id + (o.slug ? '&m=' + o.slug : '') + '">ลองทาบเคสนี้ →</span>' : '') + '</a>';
  }
  /* มาสคอตแถบโค้ดตามเวลา: มือถือใส่เคสชมพู กระโดด กะพริบตา โบกมือ (SVG + CSS ล้วน) */
  var MASCOT = '<span class="tb-masc" aria-hidden="true"><svg viewBox="0 0 48 56" width="34" height="40">' +
    '<g class="mc-body"><path class="mc-arm l" d="M9 30 q-6 2 -7 -4" /><path class="mc-arm r" d="M39 30 q6 -2 8 -8" />' +
    '<rect x="9" y="8" width="30" height="42" rx="9" fill="#FF7BA5" stroke="#121212" stroke-width="2.4"/>' +
    '<rect x="13" y="13" width="22" height="32" rx="6" fill="#FFF6F9"/>' +
    '<path d="M18 8 q-4 -7 -9 -4 q4 5 9 4z M30 8 q4 -7 9 -4 q-4 5 -9 4z" fill="#FFD23F" stroke="#121212" stroke-width="2"/>' +
    '<g class="mc-eyes"><ellipse cx="19.5" cy="26" rx="2.4" ry="3" fill="#121212"/><ellipse cx="28.5" cy="26" rx="2.4" ry="3" fill="#121212"/>' +
    '<circle cx="20.3" cy="24.8" r=".9" fill="#fff"/><circle cx="29.3" cy="24.8" r=".9" fill="#fff"/></g>' +
    '<ellipse cx="16" cy="31" rx="2.6" ry="1.6" fill="#FF9FBF"/><ellipse cx="32" cy="31" rx="2.6" ry="1.6" fill="#FF9FBF"/>' +
    '<path d="M21.5 31 q2.5 3 5 0" fill="none" stroke="#121212" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path class="mc-feet" d="M17 50 v4 M31 50 v4" stroke="#121212" stroke-width="2.6" stroke-linecap="round"/></g>' +
    '<ellipse class="mc-shadow" cx="24" cy="55" rx="10" ry="1.4" fill="rgba(0,0,0,.18)"/></svg>' +
    '<i class="mc-heart">♥</i><i class="mc-heart b">♥</i></span>';
  /* เคสประจำสัปดาห์ 1 ชิ้น (แถบบน): คัดเคสน่ารัก (ไม่เอาลายลิขสิทธิ์) สุ่มด้วยสัปดาห์ — ทุกคนเห็นตัวเดียวกันทั้งสัปดาห์ */
  var dayPickHTML = null;
  function dayPick() {
    if (dayPickHTML !== null) return dayPickHTML;
    var ok = allProducts().filter(function (p) { return p.img && p.price >= 15 && (!p.rating || p.rating >= 4.6); });
    var p = dayShuffle(ok.filter(isPick), 'topbar-pick')[0] || dayShuffle(ok.filter(isCute), 'topbar-pick')[0];
    dayPickHTML = p ? '<a class="tb-day" href="product.html?id=' + p.id + '" title="' + esc(p.title) + '"><span class="tb-dim">' + img(p) + '</span>' +
      '<span class="tb-dt"><small>เคสประจำสัปดาห์ · ' + weekLabel() + '</small><b>' + esc(p.title) + '</b></span><em>' + baht(p.price) + '</em></a>' : '';
    return dayPickHTML;
  }
  function header(active) {
    var links = [['ranking.html', 'อันดับเคส', 'ranking'], ['feed.html', 'ไถดูเคส', 'feed'], ['tryon.html', 'ลองทาบเคส', 'tryon'], ['deals.html', 'โค้ดส่วนลด', 'deals']];
    return '<div class="topbar"><span class="tb-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' + MASCOT +
      '<span class="tb-msg">โค้ดตามเวลา Shopee <span class="tb-r">รอบ <b>12:00 / 20:00 น.</b> — </span>เหลืออีก <b data-countdown-text>--:--:--</b><a href="deals.html">ดูวิธีเก็บโค้ด</a></span></div>' +   // 14 พ.ย.: ผู้ใช้สั่งเอาเคสประจำสัปดาห์ (dayPick) ออกจากแถบบน
      '<div class="wrap"><nav class="nav"><a class="logo" href="index.html"><i>C</i>รวมเคส</a>' +
      '<div class="menu">' + links.map(function (l) { return '<a href="' + l[0] + '"' + (active === l[2] ? ' class="on"' : '') + '>' + l[1] + '</a>'; }).join('') + (T2 ? '<a href="saved.html"' + (active === 'saved' ? ' class="on"' : '') + '>♥ ที่เก็บไว้<b class="nav-wn" data-wn hidden></b></a>' : '') + '</div>' +
      '<span class="nav-q" role="search"><input id="nq" type="search" placeholder="ค้นหาเคส เช่น ใส แม่เหล็ก" aria-label="ค้นหาเคสจากชื่อหรือร้าน" value="' + esc(document.body.getAttribute('data-page') === 'ranking' ? (q('q') || '') : '') + '"><button type="button" id="nqb" aria-label="ค้นหา">⌕</button></span>' +
      '<a class="cta" href="models.html">เคสทุกรุ่น</a></nav>' + catBar(active) + '</div>' +
      '<div class="pbar"><div class="wrap pbar-row" id="pbar"></div></div>';
  }
  function footer() {
    return '<footer class="foot"><div class="wrap"><div class="g">' +
      '<div><a class="logo" href="index.html"><i>C</i>รวมเคส</a><p>เทียบราคาเคสมือถือบน Shopee<br>iPhone 13 – 18 Pro Max และ Samsung Galaxy</p></div>' +
      '<div><h5>เลือกเคส</h5><a href="ranking.html">อันดับเคส</a><a href="models.html">ตามรุ่นมือถือ</a><a href="ranking.html?b=samsung">เคส Samsung</a><a href="tryon.html">ลองทาบเคส</a><a href="model.html?m=iphone-17-pro-max">iPhone 17 Pro Max</a><a href="model.html?m=iphone-16-pro">iPhone 16 Pro</a></div>' +
      '<div><h5>ประหยัดขึ้น</h5><a href="deals.html">โค้ดส่วนลด Shopee</a><a href="about.html">เราคัดเคสยังไง</a><a href="m/index.html">เคสแยกตามรุ่นและสไตล์</a></div>' +
      '<div><h5>เกี่ยวกับเว็บ</h5><a href="about.html#disclosure">การเปิดเผยลิงก์ affiliate</a></div>' +
      '</div><p class="disc">ลิงก์ไปร้านค้าเป็นลิงก์ affiliate — เราอาจได้ค่าคอมมิชชันเมื่อคุณซื้อ โดยราคาที่คุณจ่ายไม่เปลี่ยน · ราคาและโค้ดที่แสดงอ่านจากหน้าร้านเมื่อวันที่ระบุ อาจเปลี่ยนได้ ตรวจราคาสุดท้ายบนแอปก่อนชำระเงิน · เว็บนี้ไม่ใช่เว็บทางการของ Shopee, TikTok หรือ Grab</p></div></footer>';
  }
  /* สินค้าจาก affiliate ราว 3 ใน 10 ไม่มีรูป (หรือรูปโหลดไม่ขึ้น) — แสดงช่องแทนรูป ไม่ปล่อยเป็นกล่องว่าง */
  var NOIMG = '<span class="noimg"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg><small>ยังไม่มีรูป</small></span>';
  document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.hasAttribute('data-fb')) t.outerHTML = NOIMG; }, true);   // error ไม่ bubble → ดักช่วง capture (แทน onerror ในแท็ก ซึ่ง CSP ของเซิร์ฟเวอร์บล็อก)
  function img(p, alt) {
    if (!p.img) return NOIMG;
    return '<img src="' + (/^https?:/.test(p.img) ? p.img : IMG + p.img) + '" alt="' + esc(alt || p.title) + '" loading="lazy" referrerpolicy="no-referrer" data-fb>';
  }
  /* บรรทัดราคาที่บอทเช็ก (ใช้ในหน้าสินค้า) */
  function liveLine(p) {
    var v = p.live; if (!v) return '';
    if (!v.visited) return '<br><small style="font-weight:400;color:var(--soft)">ราคาจากรายการ affiliate ณ ' + esc(v.checked) + ' — บอทยังไม่ได้เปิดหน้าร้านเพื่อตรวจโค้ด</small>';
    return '<br><small style="font-weight:400;color:var(--soft)">บอทเช็กเมื่อ ' + esc(v.checked) + ': ' + baht(v.price) +
      (v.best < v.price ? ' → ' + baht(v.best) + ' หลังโค้ดร้าน (' + esc(v.voucher) + ')' : '') + (v.next ? ' · ' + esc(v.next) : '') + '</small>';
  }
  function priceRows(p) {
    var cut = p.liveOnly && p.live.best < p.price;
    var shopee = cut ? baht(p.live.best) + '<small style="font-weight:400;color:var(--soft)"> หลังโค้ดร้าน</small>' :
      baht(p.price) + (p.priceNote && p.priceNote.indexOf('฿') === 0 && p.priceNote.indexOf('–') > 0 ? '+' : '');
    return '<div class="rows">' +
      '<div class="prow best"><span class="dot sh"></span>Shopee<span class="v">' + shopee + '</span></div></div>';   // TikTok Shop / Grab ซ่อนไว้จนกว่าระบบดึงราคาจะเสร็จ
  }
  function tile(p, slug) {
    var f = slug ? fitOf(p, slug) : '';
    var fit = f === 'yes' ? '<span class="fit yes">✓ ใส่ได้ — ยืนยันจากตัวเลือกร้าน</span>' : f === 'named' ? '<span class="fit named">≈ ชื่อสินค้าระบุรุ่นนี้ — เช็กตัวเลือกร้านอีกครั้ง</span>' : f === 'maybe' ? '<span class="fit maybe">! เดาจากซีรีส์ เช็กตัวเลือกรุ่นในร้านก่อนสั่ง</span>' : '';
    return '<a class="tile" href="product.html?id=' + p.id + (slug ? '&m=' + slug : '') + '">' +
      '<div class="im">' + img(p) + (p.mall ? '<span class="badge mall">Mall</span>' : p.liveOnly ? '<span class="badge">' + (p.live.visited ? 'บอทเช็กราคา' : 'รายการ affiliate') + '</span>' : '<span class="badge">★ ' + p.rating + '</span>') + '</div>' +
      '<div class="ft"><div><h4>' + esc(p.title) + '</h4><p>' + [p.shop, p.rating ? '★ ' + p.rating : '', p.sold ? 'ขาย ' + p.sold : '', p.ships ? 'ส่งจาก' + p.ships : ''].filter(Boolean).map(esc).join(' · ') + '</p></div><span class="arw">↗</span></div>' +
      fit + '<div class="tags">' + p.tags.slice(0, 3).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' + priceRows(p) + '</a>';
  }

  /* ---------- นับถอยหลังรอบโค้ด 12:00 / 20:00 (เวลาไทย) ---------- */
  function nextRound() {
    var n = new Date(Date.now() + 7 * 3600e3);
    var sec = n.getUTCHours() * 3600 + n.getUTCMinutes() * 60 + n.getUTCSeconds();
    var t = [12 * 3600, 20 * 3600, 36 * 3600].filter(function (x) { return x > sec; })[0];
    var d = t - sec;
    return { h: Math.floor(d / 3600), m: Math.floor(d % 3600 / 60), s: d % 60, label: (t % 86400) / 3600 + ':00' };
  }
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  function tick() {
    var r = nextRound();
    document.querySelectorAll('[data-countdown-text]').forEach(function (e) { e.textContent = two(r.h) + ':' + two(r.m) + ':' + two(r.s); });
    document.querySelectorAll('[data-countdown]').forEach(function (c) { c.innerHTML = '<div>' + two(r.h) + '<small>ชม.</small></div><div>' + two(r.m) + '<small>นาที</small></div><div>' + two(r.s) + '<small>วิ</small></div>'; });
    document.querySelectorAll('[data-next-round]').forEach(function (e) { e.textContent = r.label + ' น.'; });
  }

  /* ---------- หน้าต่าง ๆ ---------- */
  var pages = {};

  /* ---------- หน้าแรก 3 สกิน: ชิ้นส่วนเดียวกัน จัดวางคนละโครง ---------- */
  function homeParts() {
    var P = {}, tryM = modelBySlug('iphone-17-pro-max');
    var chips = ['iphone-17-pro-max', 'iphone-17-pro', 'iphone-16-pro-max', 'iphone-15-pro-max', 'iphone-14-pro-max', 'iphone-13-pro-max'];
    P.chips = '<div class="models">' + chips.map(function (s, i) { return '<a class="' + (s === TryOn.state.model ? 'on' : '') + '" href="model.html?m=' + s + '">' + modelBySlug(s).name + '</a>'; }).join('') + '<a href="models.html">+ ทุกรุ่น</a></div>';
    P.lead = 'เลือกรุ่นของคุณ ดูเฉพาะเคสที่ใส่ได้จริง พร้อมราคาหลังใช้โค้ด';
    P.acts = '<div class="acts"><a class="btn" href="models.html">หาเคสรุ่นของฉัน</a><a class="btn ghost" href="tryon.html">ลองทาบเคส ↗</a></div>';
    P.vcard = '<div class="dl lime vcard"><span class="off">รอบถัดไป <span data-next-round></span></span><h4>โค้ดตามเวลาของ Shopee<br>ปล่อยวันละ 2 รอบ</h4><p>ใบที่เราเจอบ่อยคือ ลด 30% สูงสุด ฿500 ขั้นต่ำ ฿200 (เช็กเมื่อ ' + D.deals.checkedAt + ') — ซื้อเคส 2 ชิ้นก็ถึง จำนวนจำกัด ต้องกดเก็บในแอปเอง</p><div class="cd" data-countdown></div><p class="lk"><a href="deals.html">ดูวิธีเก็บและซ้อนโค้ด →</a></p></div>';
    P.steps = '<div class="dl"><h4>ซ้อนโค้ดยังไง</h4><ol class="steps"><li>เลือกเคส กดเก็บโค้ดร้าน (ส่วนลดจากร้าน)</li><li>เก็บโค้ด Shopee / โค้ดตามเวลา</li><li>เก็บโค้ดส่งฟรี</li><li>ชำระ — ระบบหักให้ทีละชั้น</li></ol></div>';
    P.sec = function (h, p, b) { return '<div class="sec"><h2>' + h + '</h2><div>' + (p ? '<p>' + p + '</p>' : '') + (b ? '<div class="b"><a class="btn sm" href="' + b[0] + '">' + b[1] + '</a><a class="btn sm ar" href="' + b[0] + '">↗</a></div>' : '') + '</div></div>'; };
    var sorted = D.products.slice().sort(function (a, b) { return a.order - b.order; });
    P.curatedH = P.sec('เคสที่เราตรวจแล้ว<br>ขายดี เรตติ้งสูง', 'คัดจากยอดขายต่อเดือน ค่าคอม เรตติ้ง 4.8 ขึ้นไป และร้านที่ส่งจากในประเทศ — เรียงตามคะแนนรวมของเรา');
    P.curated = sorted.map(function (p) { return tile(p); }).join('');
    var LI = P.LI = L.filter(isIphoneItem);   // หน้าแรกเป็นของ iPhone — เคส Samsung อยู่ที่หน้า Samsung Galaxy
    P.extraH = LI.length ? P.sec('เคสเพิ่มเติม<br>จากรายการ affiliate', LI.length + ' แบบ เรียงตามยอดขาย — ยังไม่ผ่านการคัดและยังไม่ยืนยันรุ่นที่ใส่ได้ · บอทวนอัปเดตราคา/โค้ดร้านเรื่อย ๆ · ข้อมูลล่าสุด ' + esc(LIVE.updated_at || ''), ['ranking.html', 'ดูอันดับทั้งหมด']) : '';
    P.extra = LI.slice(0, 18).map(function (p) { return gcard(p); }).join('');   // กริดแน่นแบบหน้าอันดับ เห็นหลายแบบในจอเดียว
    P.tryH = P.sec('เลือกโทรศัพท์ในแถบด้านบน<br>แล้วลองทาบเคสดู', 'เลือกรุ่นของคุณ แล้วกดใส่เคสบนภาพเครื่อง หรือเทียบ 2 เคสข้างกัน ดูรูเลนส์ วงแม่เหล็ก ขาตั้ง และเช็กว่าร้านมีตัวเลือกรุ่นนี้จริงไหม', ['tryon.html', 'เปิดเต็มหน้า']);
    P.tryBox = '<div class="tryon-box" id="ty-home"></div>';
    var cnt = {}; allProducts().filter(function (p) { return fitOf(p, TryOn.state.model) !== 'no'; }).forEach(function (p) { p.tags.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });   // นับเฉพาะเคสที่ใส่รุ่นที่เลือกไว้ได้ (ลิงก์พาไปหน้ารุ่นนั้น)
    P.tags = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 8).map(function (t) { return { t: t, n: cnt[t], href: 'model.html?m=' + TryOn.state.model + '&tag=' + encodeURIComponent(t) }; });
    P.tryM = tryM;
    return P;
  }
  /* ---------- หน้าแรก (ผู้ใช้เลือก 2026-11-09: ฮีโร่ "สปอตไลต์" + ลีดเดอร์บอร์ดมีแท็บ) ----------
     ราคาเครื่องติดอยู่ที่ภาพเครื่อง · สลับ iPhone/Samsung แล้วเครื่อง+ราคาเปลี่ยนตาม · อันดับเคสอยู่ใต้ฮีโร่ทันที
     แท็บแรก "เคสประจำสัปดาห์" = เคสที่สุ่มใหม่ทุกสัปดาห์ 3 หน้า (หน้าละ 5) */
  var HV_DEF = { iphone: 'iphone-18-pro-max', samsung: 'galaxy-s26-ultra' };
  var HV_CHIPS = { iphone: ['iphone-18-pro-max', 'iphone-17-pro-max', 'iphone-17-pro', 'iphone-16-pro-max', 'iphone-15-pro-max', 'iphone-14-pro-max'], samsung: ['galaxy-s26-ultra', 'galaxy-s26', 'galaxy-s25-ultra', 'galaxy-s24-ultra', 'galaxy-a56', 'galaxy-a26'] };
  function hvState() {
    var m = modelBySlug(TryOn.state.model) || modelBySlug(HV_DEF.iphone), b = /^galaxy-/.test(m.slug) ? 'samsung' : 'iphone';
    var DV = window.DEVICES, dev = DV && DV.models.filter(function (x) { return x.slug === m.slug; })[0];
    HV_SLUG = m.slug;
    return { m: m, b: b, dev: dev && dev.offers.length ? dev : null };
  }
  var hvSold = function (p) { return p.soldN || parseFloat(p.sold) * (/k/i.test(p.sold) ? 1000 : 1) || 0; };
  /* เคสของรุ่นที่เลือก เรียงตามความพอใจ — สูตรเดียวกับหน้าอันดับ (เรตติ้งถ่วงยอดขาย) */
  function hvRank(st) {
    var all = allProducts().filter(function (p) { return brandsOf(p).indexOf(st.b) >= 0; });
    var fit = all.filter(function (p) { return st.b === 'iphone' ? fitOf(p, st.m.slug) !== 'no' : galaxyFromName(String(p.title).toLowerCase()).indexOf(st.m.slug) >= 0; });
    if (fit.length >= 10) all = fit;
    var rated = all.filter(function (p) { return p.rating > 0; }), mean = rated.reduce(function (s, p) { return s + p.rating; }, 0) / (rated.length || 1);
    all.forEach(function (p) { var v = hvSold(p); p.sat = p.rating > 0 ? (v * p.rating + 500 * mean) / (v + 500) : 0; });
    all.sort(function (a, b) { return (b.sat > 0) - (a.sat > 0) || b.sat - a.sat || hvSold(b) - hvSold(a); });
    return { list: all, total: all.length, exact: all === fit };
  }
  var HV_SLUG = '';   // รุ่นที่เลือกบนหน้าแรก — ใช้ราคาตามรุ่นถ้าร้านตั้งราคาต่างกัน
  var hvPrice = function (p) { if (HV_SLUG && p.optMap && p.optMap[HV_SLUG] != null) return p.optMap[HV_SLUG]; return p.liveOnly && p.live && p.live.best < p.price ? p.live.best : p.price; };
  var hvSane = function (p) { return hvPrice(p) >= 15; };   // กันรายการราคาหลอก (฿2–฿4 = ราคาตัวเลือกอื่น ไม่ใช่เคส)
  var hvArt = function (m, k) { try { return TryOn.phoneArt(m, { k: k, pc: 0 }); } catch (e) { return ''; } };
  var hvRankHref = function (st) { return 'ranking.html?b=' + st.b; };
  function hvBrand(st) {
    return '<div class="hv-br" role="group" aria-label="ยี่ห้อมือถือ">' + [['iphone', 'iPhone'], ['samsung', 'Samsung']].map(function (x) {
      return '<button data-hb="' + x[0] + '" aria-pressed="' + (st.b === x[0]) + '"' + (st.b === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function hvChips(st) {
    return '<div class="hv-chips">' + HV_CHIPS[st.b].map(function (s) { var m = modelBySlug(s); return m ? '<button data-hm="' + s + '"' + (s === st.m.slug ? ' class="on"' : '') + '>' + esc(m.name.replace('Galaxy ', '')) + '</button>' : ''; }).join('') + '<a href="models.html">ทุกรุ่น →</a></div>';
  }
  /* ป้ายราคาที่ติดกับภาพเครื่อง: ร้านที่ถูกที่สุดวันนี้ (รุ่นที่ยังไม่มีราคาเครื่อง → โชว์รุ่นท็อปของยี่ห้อเดียวกัน และบอกชัดว่าเป็นรุ่นไหน) */
  function hvTag(st) {
    var d = st.dev, alt = '';
    if (!d) {
      d = window.DEVICES && DEVICES.models.filter(function (x) { return x.slug === HV_DEF[st.b]; })[0];
      if (!d || !d.offers.length) return '';
      alt = '<small class="alt">ยังไม่มีราคาเครื่อง ' + esc(st.m.name) + ' · นี่คือ ' + esc(d.name) + '</small>';
    }
    var o = d.offers[0];
    return '<a class="hv-tag hang" rel="sponsored noopener" target="_blank" href="' + esc(o.aff || o.url) + '">' + alt + '<small>ถูกสุดวันนี้ · ' + esc(o.name) + (o.official ? ' ✓' : '') + '</small><b>' + baht(o.price) + '</b><span>ดูร้าน ↗</span></a>';
  }
  function hvHero(st) {
    return '<section class="hv1">' + hvBrand(st) + '<h1>เคส <em>' + esc(st.m.name) + '</em><br>ตัวไหนคุ้มสุดวันนี้</h1>' +
      '<div class="hv1-stage"><div class="hv1-ph">' + hvArt(st.m, 2.1) + '</div>' + hvTag(st) + '</div>' + hvChips(st) + '</section>';
  }
  /* เคสน่ารักประจำวัน: คัดจากชื่อสินค้า แล้วสุ่มลำดับด้วยวันที่ (เวลาไทย) — ทุกคนเห็นชุดเดียวกันทั้งวัน พรุ่งนี้เปลี่ยนเอง */
  var CUTE = /น่ารัก|การ์ตูน|cute|kawaii|หมี|แมว|กระต่าย|ลูกหมา|เป็ด|ไดโน|ดอกไม้|ลายดอก|หัวใจ|โบว์|ริบบิ้น|พาสเทล|\b(?:bear|cat|bunny|flower|heart|bow|ribbon)s?\b/i;
  /* ลายลิขสิทธิ์ (มักเป็นของปลอม) — ไม่เอาขึ้นเคสประจำวัน ตาม exclude_words ของบอท */
  var LICENSED = /sanrio|kitty|คิตตี้|kuromi|cinnamoroll|pochacco|melody|snoopy|สนูปปี้|pokemon|โปเกม่อน|doraemon|โดราเอม่อน|one ?piece|วันพีช|disney|marvel|ชินจัง|shin ?chan/i;
  var thDay = function () { var d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
  /* เคสประจำสัปดาห์: ชุดเดียวกันทั้งสัปดาห์ (จันทร์–อาทิตย์ เวลาไทย) เปลี่ยนชุดทุกวันจันทร์ */
  var thWeekStart = function () { var d = new Date(Date.now() + 7 * 3600e3); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d; };
  var thWeek = function () { return thWeekStart().toISOString().slice(0, 10); };
  var isCute = function (p) { return !LICENSED.test(p.title) && ((p.tags || []).indexOf('การ์ตูน') >= 0 || CUTE.test(p.title)); };
  /* สุ่มลำดับด้วยวันที่ (เวลาไทย) + salt — ทุกคนเห็นลำดับเดียวกันทั้งวัน */
  function dayShuffle(list, salt) {
    var s = parseInt(thWeek().replace(/-/g, ''), 10) + String(salt).length * 7919, rnd = function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    var seen = {}; list = list.filter(function (p) { var k = String(p.title).toLowerCase().replace(/[^a-z0-9฀-๿]/g, '').slice(0, 40); if (seen[k]) return false; seen[k] = 1; return true; });   // สินค้าเดียวกันหลายร้าน = โชว์ครั้งเดียว
    return list.map(function (p) { return [rnd(), p]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  }
  var weekLabel = function () {
    var a = thWeekStart(), b = new Date(a.getTime() + 6 * 864e5), M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return a.getUTCMonth() === b.getUTCMonth() ? a.getUTCDate() + '–' + b.getUTCDate() + ' ' + M[b.getUTCMonth()] : a.getUTCDate() + ' ' + M[a.getUTCMonth()] + '–' + b.getUTCDate() + ' ' + M[b.getUTCMonth()];
  };
  var dayLabel = function () { var d = thDay().split('-'); return (+d[2]) + ' ' + ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][+d[1] - 1]; };
  /* เคสน่าสนใจ (docs/research/case-selection-research.md รูปแบบ A–E): ใสกันเหลือง · MagSafe · กันกระแทก+กันกล้อง · ฝ้า/ด้าน/พาสเทล · มีของแถม
     ขายแล้ว ≥1,000 · ★≥4.7 (หรือยังไม่มีดาว) · ราคา 39–299 */
  var PICK = /anti.?yellow|กันเหลือง|ไม่.{0,6}เหลือง|magsafe|mag-?safe|แม่เหล็ก|magnet|ถุงลม|เกรดทหาร|military|ฝ้า|ผิวด้าน|matte|frosted|พาสเทล|macaron|มาการอง|แถม|ฟรีฟิล์ม|\+ฟิล์ม|กันกระแทก.*(?:กล้อง|เลนส์)|(?:กล้อง|เลนส์).*กันกระแทก/i;
  var isPick = function (p) { return p.img && !LICENSED.test(p.title) && PICK.test(p.title) && hvSold(p) >= 1000 && (!p.rating || p.rating >= 4.7) && p.price >= 39 && p.price <= 299; };
  /* เคสประจำสัปดาห์: สลับเคสน่าสนใจ A–E · เคสจากร้านที่เราคัดไว้ (CaseClub / Wishwindy) · เคสน่ารัก แล้วเติมจากที่เหลือ (ขายดีก่อน) ให้เต็ม n ช่องเสมอ ไม่ให้มีช่องว่าง */
  var isShopPick = function (p) { return p.img && /^(CaseClub|Wishwindy)$/i.test(p.shop || ''); };
  function weeklyMix(list, salt, n, nPick) {
    var ok = list.filter(function (p) { return p.img; });
    var picks = dayShuffle(ok.filter(isPick), salt).slice(0, nPick);
    var shops = dayShuffle(ok.filter(function (p) { return isShopPick(p) && picks.indexOf(p) < 0; }), salt);
    var cute = dayShuffle(ok.filter(function (p) { return isCute(p) && picks.indexOf(p) < 0 && shops.indexOf(p) < 0; }), salt);
    var half = function (r) { return shops.filter(function (_, k) { return k % 2 === r; }); };   /* ร้านที่คัดไว้ได้น้ำหนักสองเท่า */
    var out = [], used = {}, qs = [picks, half(0), cute, half(1)], i = 0, take = function (p) { if (p && !used[p.id]) { used[p.id] = 1; out.push(p); } };
    while (out.length < n && qs.some(function (q) { return i < q.length; })) { qs.forEach(function (q) { if (out.length < n) take(q[i]); }); i++; }
    if (out.length < n) ok.slice().sort(function (a, b) { return hvSold(b) - hvSold(a); }).forEach(function (p) { if (out.length < n) take(p); });
    return out;
  }
  var WEEK_PAGES = 3;
  function dailyCute(st) { // ชื่อเดิม: ตอนนี้ = เคสน่าสนใจ A–E ก่อน แล้วเติมด้วยเคสน่ารัก
    var ok = hvRank(st).list.filter(function (p) { return hvSane(p) && (!p.rating || p.rating >= 4.5); });
    return weeklyMix(ok, st.m.slug, 5 * WEEK_PAGES, 6);
  }
  var RK = { sort: 'daily', page: 1 };
  var RK_PER = 5;
  function hvRanks(st) {
    var R = hvRank(st), L;
    if (RK.sort === 'daily') L = dailyCute(st);
    else if (RK.sort === 'sold') L = R.list.slice().sort(function (a, b) { return hvSold(b) - hvSold(a); });
    else if (RK.sort === 'price') L = R.list.filter(function (p) { return p.rating >= 4.8 && hvSane(p); }).sort(function (a, b) { return hvPrice(a) - hvPrice(b); });
    else L = R.list;
    if (RK.sort !== 'daily') L = L.slice(0, RK_PER);
    var pages = Math.max(1, Math.ceil(L.length / RK_PER)); if (RK.page > pages) RK.page = 1;
    var off = (RK.page - 1) * RK_PER, rows = L.slice(off, off + RK_PER);
    var d = thDay().split('-'), MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var T = [['daily', 'เคสประจำสัปดาห์'], ['sat', 'พอใจสุด'], ['sold', 'ขายดี'], ['price', 'ถูกสุด (★4.8+)']];
    var href = function (p) { return 'product.html?id=' + p.id + (st.b === 'iphone' ? '&m=' + st.m.slug : ''); };
    return '<section class="rk2" id="rk2">' +
      '<div class="rk-hd"><div><span class="rk-k">เคสประจำสัปดาห์ · ' + weekLabel() + '</span><h2>' + esc(st.m.name) + '</h2></div>' +
      '<a class="rk-more" href="' + hvRankHref(st) + '">ทั้งหมด ' + R.total + ' แบบ <span>→</span></a></div>' +
      '<div class="rk2-tabs" role="tablist">' + T.map(function (t) { return '<button role="tab" data-rs="' + t[0] + '" aria-selected="' + (RK.sort === t[0]) + '"' + (RK.sort === t[0] ? ' class="on"' : '') + '>' + (t[0] === 'daily' ? '<i>ใหม่</i>' : '') + t[1] + '</button>'; }).join('') + '</div>' +
      (RK.sort === 'daily' ? '<p class="rk2-note">เคสน่าสนใจที่เราคัดมาให้ (ใสไม่เหลือง · MagSafe · กันกระแทก · ผิวด้าน) และเคสน่ารัก เปลี่ยนชุดใหม่ทุกสัปดาห์ — สัปดาห์หน้ามาดูอีกนะ</p>' : '') +
      (rows.length ? '<ol class="rk2-list" start="' + (off + 1) + '">' + rows.map(function (p, i) {
        return '<li><a href="' + href(p) + '"><span class="im">' + img(p) + '</span><span class="t"><b>' + (RK.sort === 'daily' ? '' : (off + i + 1) + '. ') + esc(p.title) + '</b><small>' + (p.tags || []).slice(0, 2).map(esc).join(' · ') + (p.sold ? ' · ขาย ' + p.sold : '') + '</small></span>' +
          '<span class="box"><small>' + (RK.sort === 'sold' ? 'ขาย ' + (p.sold || '-') : p.sat ? '★ ' + p.sat.toFixed(2) : 'ใหม่') + '</small><b>' + baht(hvPrice(p)) + '</b></span></a></li>'; }).join('') + '</ol>'
        : '<p class="rk2-note">สัปดาห์นี้ยังไม่มีเคสน่ารักของรุ่นนี้ — ลองดูแท็บ "พอใจสุด"</p>') +
      (pages > 1 ? '<nav class="rk2-pg" aria-label="เลือกหน้า">' + Array.apply(null, { length: pages }).map(function (_, i) { return '<button data-rp="' + (i + 1) + '"' + (RK.page === i + 1 ? ' class="on" aria-current="page"' : '') + '>' + (i + 1) + '</button>'; }).join('') +
        (RK.page < pages ? '<button class="nx" data-rp="' + (RK.page + 1) + '">หน้าถัดไป ›</button>' : '<button class="nx" data-rp="1">‹ กลับหน้าแรก</button>') + '</nav>' : '') +
      '<a class="hv-all" href="' + hvRankHref(st) + (RK.sort === 'daily' ? '&sort=daily' : '') + '"><span>ดูอันดับเคส ' + esc(st.m.name) + ' ทั้งหมด <b>' + R.total + ' แบบ</b></span><span class="ar">→</span></a></section>';
  }
  function hvMount(el) {
    var box = el.querySelector('#hv');
    var draw = function () { var st = hvState(); box.innerHTML = hvHero(st) + hvRanks(st); };
    draw();
    box.addEventListener('click', function (e) {
      var r = e.target.closest('[data-rs]'); if (r) { RK.sort = r.getAttribute('data-rs'); RK.page = 1; draw(); return; }
      var pg = e.target.closest('[data-rp]');
      if (pg) { RK.page = +pg.getAttribute('data-rp'); draw(); var t = $('#rk2'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }   // เปลี่ยนหน้าแล้วเลื่อนขึ้นไปหัวรายการ
      var b = e.target.closest('[data-hb],[data-hm]'); if (!b) return;
      var s = b.getAttribute('data-hm') || (b.getAttribute('data-hb') === hvState().b ? null : HV_DEF[b.getAttribute('data-hb')]);
      if (s) { RK.page = 1; TryOn.set({ model: s }); }
    });
    document.addEventListener('selchange', draw);
  }
  pages.home = function (el) {
    if (T2) return homeT2(el);
    var P = homeParts();
    var body = '<div id="hv" class="hv"></div>' +
      '<div class="sec"><h2>เลือกตามสไตล์</h2><div><p>กดเพื่อดูเคสสไตล์นั้นของรุ่นที่คุณเลือกไว้</p></div></div>' +
      '<div class="cols">' + P.tags.slice(0, 4).map(function (c) { return '<a class="col" href="' + c.href + '"><b>' + esc(c.t) + '</b><small>' + c.n + ' แบบ</small><span class="go">↗</span></a>'; }).join('') + '</div>' +
      P.tryH + P.tryBox + '<div class="vstrip">' + P.vcard + P.steps + '</div>';
    el.innerHTML = header('home') + '<div class="wrap">' + body + '</div>' + footer();
    hvMount(el);
    TryOn.stage($('#ty-home'), {});
  };

  /* ---------- หน้าเลือกรุ่น: 4 รูปแบบให้เลือก (?mv=1..4) ---------- */
  pages.models = function (el) {
    var VARS = [['1', 'เทียบขนาดจริง'], ['2', 'ค้นหาแล้วเลือก'], ['3', 'เลือกทีละขั้น'], ['4', 'ตารางเทียบรุ่น']];
    /* ใช้แบบ 1 เป็นหน้าจริง — แบบ 2–4 เปิดดูได้เฉพาะเมื่อใส่ ?mv= เอง (ผู้ใช้เห็นแถบสลับแบบแล้วคิดว่าเป็นหน้าเก่าที่เลิกใช้ 2026-11-06) */
    var mv = q('mv') || '';
    if (!VARS.some(function (v) { return v[0] === mv; })) mv = '1';
    var SER = ['18', '17', '16', '15', '14', '13'], PHs = window.PHONES || {};
    var GSER = ['S26', 'S25', 'S24', 'S23', 'A'], byG = function (s) { return (D.galaxy || []).filter(function (m) { return m.series === s; }); };
    var CAM = { diag: '2 เลนส์ ทแยง', pill: '2 เลนส์ แนวตั้ง', tri: '3 เลนส์ + LiDAR', triwide: '3 เลนส์ แถบกว้าง', air: '1 เลนส์ แถบกว้าง' };
    var byS = function (s) { return D.models.filter(function (m) { return m.series === s; }); };
    var ordered = function () { return SER.reduce(function (a, s) { return a.concat(byS(s)); }, []); };   // ใหม่ก่อน
    var art = function (m, k) { return PHs[m.slug] ? TryOn.phoneArt(m, { k: k, pc: 0 }) : '<span class="mdl-na">ภาพเร็ว ๆ นี้</span>'; };
    var cnt = function (m) { return countFor(m.slug); };
    var cntTxt = function (m) { var c = cnt(m); return c ? c + ' เคส' : 'ยังไม่มีเคส'; };
    var scr = function (m) { var P = PHs[m.slug]; return P ? P.scr : parseFloat(m.size) || 0; };
    var dots = function (m) { var P = PHs[m.slug]; return P ? '<span class="m-dots">' + P.col.map(function (c) { return '<i style="--c:' + c[1] + '" title="' + esc(c[0]) + '"></i>'; }).join('') + '</span>' : ''; };
    var dim = function (m) { var P = PHs[m.slug]; return P ? P.h + ' × ' + P.w + ' × ' + P.d : '—'; };
    var href = function (m) { return 'model.html?m=' + m.slug; };
    var nav = '<nav class="mdl-nav" aria-label="ข้ามไปซีรีส์"><span>ข้ามไป</span>' + SER.map(function (s) { return '<a href="#s' + s + '">iPhone ' + s + '</a>'; }).join('') + '<a href="#g' + GSER[0] + '">Galaxy</a></nav>';
    var bar = '<div class="mv-bar" role="group" aria-label="รูปแบบหน้านี้"><span>รูปแบบหน้านี้</span>' + VARS.map(function (v) { return '<a href="models.html?mv=' + v[0] + '"' + (v[0] === mv ? ' class="on"' : '') + '><b>' + v[0] + '</b> ' + v[1] + '</a>'; }).join('') + '</div>';

    /* 1 · เทียบขนาดจริง (แนวหน้าเปรียบเทียบรุ่นของ Apple): เครื่องทุกรุ่นวางบนเส้นพื้นเดียวกัน สัดส่วนจริง ตัวเลขขนาดจอเป็นพระเอก */
    function v1() {
      var sec = function (id, title, ms) {
        return '<section class="m1-sec" id="' + id + '"><div class="m1-h"><h2>' + title + '</h2><span>' + ms.length + ' รุ่น</span></div><div class="m1-row">' + ms.map(function (m) {
          return '<a class="m1-c" href="' + href(m) + '"><span class="m1-art">' + art(m, 1.45) + '</span><span class="m1-scr">' + scr(m) + '<sup>"</sup></span><b>' + m.name + '</b>' + dots(m) + '<span class="m1-cnt">' + cntTxt(m) + '</span></a>';
        }).join('') + '</div></section>';
      };
      return nav + SER.map(function (s) { return sec('s' + s, 'iPhone ' + s, byS(s)); }).join('') +
        GSER.map(function (s) { var ms = byG(s); return ms.length ? sec('g' + s, 'Galaxy ' + s, ms) : ''; }).join('');
    }
    /* 2 · ค้นหาแล้วเลือก (แนว dbrand / CASETiFY): พิมพ์ชื่อรุ่นหรือกดซีรีส์ รายการแน่นอ่านเร็ว */
    function v2() {
      return '<div class="m2"><div class="m2-bar"><label class="m2-q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="mq" type="search" placeholder="พิมพ์รุ่น เช่น 16 pro max" autocomplete="off" aria-label="ค้นหารุ่นมือถือ"></label>' +
        '<div class="m2-chips"><button class="chip on" data-ms="">ทั้งหมด</button>' + SER.map(function (s) { return '<button class="chip" data-ms="' + s + '">iPhone ' + s + '</button>'; }).join('') + '</div></div><div class="m2-list" id="m2list"></div></div>';
    }
    function v2init() {
      var qs = '', ser = '';
      function draw() {
        var rows = ordered().filter(function (m) { return (!ser || m.series === ser) && (!qs || m.name.toLowerCase().replace(/\s+/g, '').indexOf(qs) >= 0); });
        $('#m2list').innerHTML = rows.length ? rows.map(function (m) {
          return '<a class="m2-r' + (cnt(m) ? '' : ' zero') + '" href="' + href(m) + '"><span class="m2-t">' + art(m, .5) + '</span><span class="m2-n"><b>' + m.name + '</b><small>จอ ' + scr(m) + '" · ' + dim(m) + ' มม.</small></span><span class="m2-c">' + cntTxt(m) + '</span><span class="m2-go">↗</span></a>';
        }).join('') : '<div class="empty">ไม่พบรุ่น "' + esc($('#mq').value) + '" — ลองพิมพ์สั้นลง เช่น 16 หรือ pro</div>';
      }
      $('#mq').oninput = function (e) { qs = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/^iphone/, ''); qs = qs ? qs : ''; draw(); };
      document.querySelectorAll('[data-ms]').forEach(function (b) { b.onclick = function () { ser = b.getAttribute('data-ms'); document.querySelectorAll('[data-ms]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
      draw();
    }
    /* 3 · เลือกทีละขั้น (แนว Find your case): ขั้นที่ 1 เลือกซีรีส์ตัวเลขใหญ่ ขั้นที่ 2 โชว์รุ่นของซีรีส์นั้นบนหน้าเดียวกัน */
    function v3() {
      return '<div class="m3"><div class="m3-lab"><b>1</b> เลือกซีรีส์</div><div class="m3-ser" role="tablist">' + SER.map(function (s) { return '<button role="tab" data-s="' + s + '"><b>' + s + '</b><small>' + byS(s).length + ' รุ่น</small></button>'; }).join('') + '</div>' +
        '<div class="m3-lab"><b>2</b> เลือกรุ่นของคุณ</div><div class="m3-panel" id="m3p"></div></div>';
    }
    function v3init() {
      var cur = (modelBySlug(TryOn.state.model) || {}).series; if (SER.indexOf(cur) < 0) cur = '17';
      function draw() {
        document.querySelectorAll('[data-s]').forEach(function (b) { var on = b.getAttribute('data-s') === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
        $('#m3p').innerHTML = byS(cur).map(function (m) {
          return '<a class="m3-c" href="' + href(m) + '"><span class="m3-art">' + art(m, 1.55) + '</span><span class="m3-b"><b>' + m.name + '</b><small>จอ ' + scr(m) + '" · ' + cntTxt(m) + '</small></span><span class="m3-go">ดูเคส ↗</span></a>';
        }).join('');
      }
      document.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { cur = b.getAttribute('data-s'); draw(); }; });
      draw();
    }
    /* 4 · ตารางเทียบรุ่น (แนวตารางสเปก/Lazada): เรียงตามขนาดจอหรือจำนวนเคสได้ เหมาะกับคนที่รู้ขนาดที่อยากได้ */
    function v4() {
      return '<div class="m4"><div class="m4-hd"><span>รุ่น</span><button data-k="scr">จอ <i></i></button><span>ขนาดตัวเครื่อง (มม.)</span><span>กล้องหลัง</span><button data-k="cnt">จำนวนเคส <i></i></button><span></span></div><div id="m4b"></div></div>';
    }
    function v4init() {
      var key = '', dir = -1;
      function draw() {
        var rows = ordered();
        if (key) rows.sort(function (a, b) { var x = key === 'scr' ? scr(a) : cnt(a), y = key === 'scr' ? scr(b) : cnt(b); return (x - y) * dir; });
        document.querySelectorAll('.m4-hd button').forEach(function (b) { var on = b.getAttribute('data-k') === key; b.classList.toggle('on', on); b.querySelector('i').textContent = on ? (dir < 0 ? '↓' : '↑') : ''; });
        $('#m4b').innerHTML = rows.map(function (m) {
          var P = PHs[m.slug];
          return '<a class="m4-r' + (cnt(m) ? '' : ' zero') + '" href="' + href(m) + '"><span class="m4-n"><span class="m4-t">' + art(m, .5) + '</span><span><b>' + m.name + '</b><small>iPhone ' + m.series + '</small></span></span>' +
            '<span data-l="จอ"><strong>' + scr(m) + '"</strong></span><span data-l="ขนาด (มม.)">' + dim(m) + '</span><span data-l="กล้อง">' + (P ? CAM[P.cam] || '' : '—') + '</span><span data-l="เคส"><em>' + cntTxt(m) + '</em></span><span class="m4-go">↗</span></a>';
        }).join('');
      }
      document.querySelectorAll('.m4-hd button').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-k'); if (key === k) dir = -dir; else { key = k; dir = -1; } draw(); }; });
      draw();
    }
    var body = mv === '2' ? v2() : mv === '3' ? v3() : mv === '4' ? v4() : v1();
    el.innerHTML = header('models') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / เคสตามรุ่น</div>' +
      '<div class="pagehead"><h1>เลือก<em>รุ่น</em>มือถือ</h1><p>iPhone 13 ถึง 18 Pro Max และ Samsung Galaxy S23 – S26, A ซีรีส์ · กดรุ่นของคุณเพื่อดูเคสที่ใส่ได้</p></div>' + (q('mv') ? bar : '') + body + '</div>' + footer();
    if (mv === '2') v2init(); else if (mv === '3') v3init(); else if (mv === '4') v4init();
  };

  /* ---------- อันดับเคส: เรียงตามความพอใจของผู้ซื้อ เลือกยี่ห้อ iPhone / Samsung · 4 รูปแบบให้เลือก (?v=1..4) ----------
     คะแนนความพอใจ = เรตติ้ง Shopee ถ่วงด้วยยอดขาย (ค่าเฉลี่ยแบบ Bayesian)
     เพราะเรตติ้งในตลาดนี้กระจุกที่ 4.7–5.0 เกือบหมด ถ้าเรียงดิบ ๆ เคสที่ขายแค่หลักสิบแต่ได้ 5.0 จะขึ้นอันดับ 1 เสมอ
     ยอดขายใช้แทนจำนวนรีวิว เพราะข้อมูลจากบอทไม่มีจำนวนรีวิว
     สินค้าที่บอทยังไม่ได้เปิดหน้า (ไม่มีเรตติ้ง) ยังขึ้นรายการ แต่ไม่มีคะแนน — เรียงตามยอดขายต่อท้ายเคสที่มีคะแนน */
  /* ปุ่ม "ลองทาบเคสนี้" ในการ์ด (อยู่ใน <a> ของการ์ด) */
  var goTry = function (e) { var b = e.target.closest && e.target.closest('[data-try]'); if (!b || (e.type === 'keydown' && e.key !== 'Enter')) return; e.preventDefault(); e.stopPropagation(); location.href = b.getAttribute('data-try'); };
  document.addEventListener('click', goTry, true); document.addEventListener('keydown', goTry, true);
  pages.ranking = function (el) {
    var BR = [['iphone', 'iPhone'], ['samsung', 'Samsung Galaxy']];
    var TIERS = [['0', 'ทุกคะแนน'], ['4.9', '4.9 ขึ้นไป'], ['4.8', '4.8 ขึ้นไป'], ['4.7', '4.7 ขึ้นไป']];
    var ISER = ['18', '17', '16', '15', '14', '13'];
    var PRIOR = 500, AUTO_MIN = 10;   // PRIOR: ยอดขายที่ต้องมี คะแนนถึงเริ่มเชื่อเรตติ้งของเคสนั้นมากกว่าค่าเฉลี่ยตลาด · AUTO_MIN: ยี่ห้อที่มีเคสมีเรตติ้งน้อยกว่านี้ เรียงตามยอดขายเป็นค่าเริ่มต้น
    var soldOf = function (p) { return p.soldN || parseFloat(p.sold) * (/k/i.test(p.sold) ? 1000 : 1) || 0; };
    function famOf(p) {
      var t = String(p.title).toLowerCase(), out = [];
      if (p.brands.indexOf('iphone') >= 0) {
        var seen = {};
        p.confirmed.concat(p.maybe).forEach(function (s) { var m = modelBySlug(s); if (m) seen[m.series] = 1; });
        ISER.forEach(function (s) { if (seen[s]) out.push('iPhone ' + s); });
      }
      if (p.brands.indexOf('samsung') >= 0) SSER.forEach(function (r) { if (r[1].test(t)) out.push(r[0]); });
      return out;
    }
    var all = allProducts();
    var rated = all.filter(function (p) { return p.rating > 0; });
    var mean = rated.reduce(function (s, p) { return s + p.rating; }, 0) / (rated.length || 1);
    all.forEach(function (p) {
      var v = soldOf(p);
      p.rated = p.rating > 0; p.sat = p.rated ? (v * p.rating + PRIOR * mean) / (v + PRIOR) : 0;
      p.brands = brandsOf(p); p.fam = famOf(p);
    });
    var price = function (p) { return p.liveOnly && p.live && p.live.best < p.price ? p.live.best : p.price; };
    var rtxt = function (r) { return r.toFixed(2).replace(/0$/, ''); };
    var cmp = function (sort) {
      return function (a, b) {
        if (sort === 'price') return price(a) - price(b);
        if (sort === 'sold') return soldOf(b) - soldOf(a);
        if (sort === 'rating') return (b.rating - a.rating) || (soldOf(b) - soldOf(a));
        if (a.rated !== b.rated) return a.rated ? -1 : 1;
        return a.rated ? b.sat - a.sat : soldOf(b) - soldOf(a);
      };
    };

    var st = { b: BR.some(function (x) { return x[0] === q('b'); }) ? q('b') : 'iphone', tier: TIERS.some(function (t) { return t[0] === q('tier'); }) ? q('tier') : '0', tag: q('tag') || '', fam: q('fam') || '', sort: q('sort') || '', page: pageP(), q: (q('q') || '').trim().slice(0, 60) };
    var qOk = function (p) { var ws = qWords(st.q); return !ws.length || qHit(ws, p.title + ' ' + p.shop); };
    var inBrand = function () { return all.filter(function (p) { return p.brands.indexOf(st.b) >= 0; }); };
    if (st.q && !q('b') && !inBrand().some(qOk)) { var ob = BR.filter(function (x) { return x[0] !== st.b && all.some(function (p) { return p.brands.indexOf(x[0]) >= 0 && qOk(p); }); })[0]; if (ob) st.b = ob[0]; }   // คำค้นไม่เจอในยี่ห้อเริ่มต้น แต่เจอในอีกยี่ห้อ → สลับให้
    var autoSort = function () { return inBrand().filter(function (p) { return p.rated; }).length >= AUTO_MIN ? 'sat' : 'sold'; };

    /* เลย์เอาต์ที่ผู้ใช้เลือก 2026-11-06 (docs/brand-picker-options.html แบบ 1): แถบหมวดอุปกรณ์ · แถบกรองซ้าย (การ์ดรูปเครื่อง → รุ่น → คะแนน → สไตล์) · กริดแน่น */
    var SORTS = [['daily', 'เคสประจำสัปดาห์'], ['sat', 'พอใจสุด'], ['rating', 'เรตติ้ง'], ['sold', 'ขายดี'], ['price', 'ถูกสุด']];
    var famLabel = function (f) { return st.b === 'samsung' ? 'Galaxy ' + f.replace(' series', '') : f; };
    /* ภาพหลังเครื่องบนการ์ดยี่ห้อ — เปลี่ยนตามรุ่นที่เลือก (ไม่เลือกรุ่น = รุ่นที่ผู้ใช้ตั้งไว้ในแถบบน หรือรุ่นใหม่สุด) */
    function artOf(b, fam) {
      var list = b === 'iphone' ? D.models : (D.galaxy || []), mine = modelBySlug(window.TryOn && TryOn.state.model) || (D.galaxy || []).filter(function (x) { return x.slug === (window.TryOn && TryOn.state.model); })[0];
      var m = fam && list.filter(function (x) { return b === 'iphone' ? 'iPhone ' + x.series === fam : x.series === fam || (fam === 'A series' && x.series === 'A'); })[0];
      if (!m && mine && list.indexOf(mine) >= 0) m = mine;
      if (!m) m = b === 'iphone' ? list.filter(function (x) { return x.series === ISER[0]; })[0] : list.filter(function (x) { return x.slug === 'galaxy-s26-ultra'; })[0];
      try { return m ? TryOn.phoneArt(m, { k: .6 }) : ''; } catch (e) { return ''; }
    }
    var opt = function (k, v, label, n, on) { return '<button class="rk-opt' + (on ? ' on' : '') + '" data-' + k + '="' + esc(v) + '" aria-pressed="' + !!on + '"><span class="bx"></span>' + esc(label) + '<span class="n">' + n + '</span></button>'; };

    el.innerHTML = header('ranking') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / อันดับเคส</div>' +
      '<div class="pagehead"><h1>อันดับ<em>เคส</em></h1><p>เคสที่ผู้ซื้อพอใจที่สุด เรียงตามคะแนนรีวิวบน Shopee · เลือกมือถือของคุณ แล้วดูว่าชิ้นไหนคุ้มที่สุด</p></div>' +
      '' + FEED_BTN + '<div class="rk-lay"><aside class="rk-side" aria-label="ตัวกรอง">' +
      '<div class="rk-fg"><h5>มือถือของคุณ</h5><div class="rk-brand">' + BR.map(function (x) { return '<button data-b="' + x[0] + '"><span class="rk-art"></span><b>' + (x[0] === 'iphone' ? 'iPhone' : 'Galaxy') + '</b><small data-bn="' + x[0] + '"></small></button>'; }).join('') + '</div></div>' +
      '<div class="rk-fg"><h5>รุ่น</h5><div class="rk-opts" id="rk-fam"></div></div>' +
      '<div class="rk-fg"><h5>คะแนน</h5><div class="rk-stars">' + TIERS.map(function (t) { return '<button data-t="' + t[0] + '">' + (t[0] === '0' ? 'ทั้งหมด' : t[0] + '+') + '</button>'; }).join('') + '</div></div>' +
      '<div class="rk-fg" id="rk-tagg"><h5>สไตล์</h5><div class="rk-opts" id="rk-tags"></div></div>' +
      '</aside><main class="rk-main"><div class="rk-top"><div class="rk-pills" id="rk-pills"></div><div class="rk-sorts" role="group" aria-label="เรียงตาม">' + SORTS.map(function (s) { return '<button data-s="' + s[0] + '"' + (s[0] === 'daily' ? ' class="rk-daily"' : '') + '>' + (s[0] === 'daily' ? '<i>ใหม่</i>' : '') + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="rk-note" id="rk-note"></div><div id="rk-body"></div><div id="rk-more" style="text-align:center;margin:26px 0"></div></main></div>' +
      '<details class="rk-how"><summary>คะแนนความพอใจคำนวณยังไง</summary><p>เรตติ้ง Shopee ของเคสส่วนใหญ่อยู่ระหว่าง 4.7–5.0 เหมือนกันหมด จึงใช้ <b>เรตติ้งถ่วงด้วยยอดขาย</b> — เคสที่ขายได้หลักหมื่นชิ้นแล้วยังได้ 4.8 ขึ้นไป น่าเชื่อถือกว่าเคสที่ขายหลักสิบแล้วได้ 5.0 · ' +
      'ยอดขายใช้แทนจำนวนรีวิว เพราะข้อมูลที่เรามีไม่ได้แยกจำนวนรีวิวต่อชิ้น · เคสที่ยังไม่มีเรตติ้ง (บอทยังไม่ได้เปิดหน้าสินค้า) จะแสดงเป็น "รอเรตติ้ง" และเรียงตามยอดขายต่อท้าย · เป็นคะแนนของเว็บเราเอง ไม่ใช่คะแนนทางการของ Shopee · ข้อมูล ' + esc(LIVE ? LIVE.updated_at : 'คัดมือ 1 พ.ย. 2026') + '</p></details></div>' + footer();

    /* การ์ดเล็ก (กริดแน่น) — เลือกใช้แบบนี้แบบเดียว (เดิมมี 4 รูปแบบ: กริดแน่น · ตารางกะทัดรัด · โพเดียม · แยกตามสไตล์ — ผู้ใช้เลือกกริดแน่น) */
    var card = function (p, n) { return gcard(p, { n: n, score: p.rated ? p.sat.toFixed(2) : 0 }); };
    /* 1 · กริดแน่น: 6 คอลัมน์ เห็นเคสเต็มจอ */
    function v1(rows) { var o = (st.page - 1) * PER(); return '<div class="rg-grid">' + rows.slice(o, o + PER()).map(function (p, i) { return card(p, o + i + 1); }).join('') + '</div>'; }

    /* เคสประจำสัปดาห์ = 3 หน้า · จำนวนต่อหน้าเป็นจำนวนเต็มแถวของกริด (วัดจำนวนคอลัมน์จริงจาก CSS) ไม่ให้มีช่องว่างท้ายหน้า · เรียงแบบอื่นหน้าละ 60 */
    var lastCols = 0;
    function measureCols() {
      var main = el.querySelector('.rk-main'); if (!main) return 5;
      var pr = document.createElement('div'); pr.className = 'rg-grid'; pr.setAttribute('aria-hidden', 'true'); pr.style.cssText = 'position:absolute;visibility:hidden;height:0;overflow:hidden';
      pr.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>'; main.appendChild(pr);
      var n = (getComputedStyle(pr).gridTemplateColumns || '').split(' ').filter(Boolean).length; main.removeChild(pr);
      return n >= 2 ? n : 5;
    }
    var weekPer = function () { lastCols = measureCols(); return lastCols * Math.ceil(12 / lastCols); };
    var PER = function () { return st.sort === 'daily' ? weekPer() : 60; };
    var rsT; window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { if (st.sort === 'daily' && measureCols() !== lastCols) draw(); }, 150); });
    function draw() {
      if (st.sort && !SORTS.some(function (s) { return s[0] === st.sort; })) st.sort = '';   // ค่าจาก URL ที่ไม่รู้จัก
      var base = inBrand().filter(qOk), sort = st.sort || autoSort(), body = v1;
      BR.forEach(function (x) {
        var n = all.filter(function (p) { return p.brands.indexOf(x[0]) >= 0; }).length;
        var b = el.querySelector('[data-b="' + x[0] + '"]');
        el.querySelector('[data-bn="' + x[0] + '"]').textContent = n ? n + ' แบบ' : 'ยังไม่มีข้อมูล';
        b.classList.toggle('on', x[0] === st.b); b.setAttribute('aria-pressed', x[0] === st.b);
        b.querySelector('.rk-art').innerHTML = artOf(x[0], x[0] === st.b ? st.fam : '');
      });
      el.querySelectorAll('[data-t]').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-t') === st.tier); });
      el.querySelectorAll('[data-s]').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-s') === sort); });
      /* ตัวกรองรุ่น */
      var fc = {}; base.forEach(function (p) { p.fam.forEach(function (f) { fc[f] = (fc[f] || 0) + 1; }); });
      var fams = (st.b === 'iphone' ? ISER.map(function (s) { return 'iPhone ' + s; }) : SSER.map(function (r) { return r[0]; })).filter(function (f) { return fc[f]; });
      if (st.fam && !fc[st.fam]) st.fam = '';
      $('#rk-fam').innerHTML = opt('fam', '', 'ทุกรุ่น', base.length, !st.fam) + fams.map(function (f) { return opt('fam', f, famLabel(f), fc[f], st.fam === f); }).join('');
      $('#rk-fam').querySelectorAll('[data-fam]').forEach(function (c) { c.onclick = function () { st.fam = c.getAttribute('data-fam'); st.page = 1; draw(); }; });
      var pre = base.filter(function (p) { return p.rating >= +st.tier && (!st.fam || p.fam.indexOf(st.fam) >= 0); });
      /* ตัวกรองสไตล์ */
      var cnt = {}; pre.forEach(function (p) { ftags(p).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
      if (st.tag && !cnt[st.tag]) st.tag = '';
      $('#rk-tags').innerHTML = tagGroupsHtml(cnt, pre.length, st.tag, opt);
      $('#rk-tags').querySelectorAll('[data-tag]').forEach(function (c) { c.onclick = function () { st.tag = c.getAttribute('data-tag'); st.page = 1; draw(); }; });
      /* ตัวกรองที่ใช้อยู่ — กด ✕ เพื่อเอาออก */
      var pills = [];
      if (st.q) pills.push(['q', 'ค้นหา: ' + st.q]);
      if (st.fam) pills.push(['fam', famLabel(st.fam)]);
      if (st.tier !== '0') pills.push(['tier', '★ ' + st.tier + ' ขึ้นไป']);
      if (st.tag) pills.push(['tag', st.tag]);
      $('#rk-pills').innerHTML = pills.map(function (p) { return '<button class="rk-fp" data-x="' + p[0] + '" aria-label="เอาตัวกรอง ' + esc(p[1]) + ' ออก">' + esc(p[1]) + ' <i>✕</i></button>'; }).join('');
      $('#rk-pills').querySelectorAll('[data-x]').forEach(function (c) { c.onclick = function () { var x = c.getAttribute('data-x'); if (x === 'q') { st.q = ''; var ni = $('#nq'); if (ni) ni.value = ''; } if (x === 'fam') st.fam = ''; if (x === 'tier') st.tier = '0'; if (x === 'tag') st.tag = ''; st.page = 1; draw(); }; });

      var rows = pre.filter(function (p) { return !st.tag || ftags(p).indexOf(st.tag) >= 0; });
      if (sort === 'daily') { // สลับเคสน่าสนใจ A–E · เคสร้านที่คัดไว้ · เคสน่ารัก แล้วเติมให้เต็ม 3 หน้า ตัดท้ายเป็นเต็มแถว
        var dk = st.b + st.fam + st.tag, okD = rows.filter(function (p) { return price(p) >= 15 && (!p.rating || p.rating >= 4.5); }), wp = weekPer();
        rows = weeklyMix(okD, dk, wp * WEEK_PAGES, 8);
        rows = rows.slice(0, Math.floor(rows.length / lastCols) * lastCols);
      } else rows = rows.sort(cmp(sort));
      var ratedN = rows.filter(function (p) { return p.rated; }).length, brand = BR.filter(function (x) { return x[0] === st.b; })[0][1];
      $('#rk-note').innerHTML = 'แสดง <b>' + rows.length + '</b> แบบสำหรับ ' + brand + (ratedN < rows.length ? ' · มีเรตติ้งแล้ว <b>' + ratedN + '</b> แบบ' + (sort === 'sat' ? '' : ' (เคสที่ยังไม่มีเรตติ้งแสดง "รอเรตติ้ง")') : '') +
        (ratedN < rows.length && !st.sort && sort === 'sold' ? ' · <b>เรียงตามยอดขายไปก่อน</b> เพราะเรตติ้งยังไม่ครบ — บอทเปิดหน้าสินค้าทีละรอบแล้วเติมเรตติ้งและรูปให้เอง' : '') +
        ' · เช็กตัวเลือกรุ่นในร้านก่อนสั่ง';
      if (st.q) {   // คำค้นเดียวกันในอุปกรณ์เสริม — พาไปกลุ่มที่เจอมากสุด
        var ws = qWords(st.q), hit = ACCI.filter(function (i) { return qHit(ws, i.title + ' ' + i.shop); }), gc = {};
        hit.forEach(function (i) { var g = grpOf(i.cat); gc[g] = (gc[g] || 0) + 1; });
        var bg = Object.keys(gc).sort(function (a, b) { return gc[b] - gc[a]; })[0];
        if (bg) $('#rk-note').innerHTML += ' · <a href="accessories.html?c=' + bg + '&q=' + encodeURIComponent(st.q) + '"><b>อุปกรณ์เสริมที่ตรงคำนี้ ' + gc[bg] + ' ชิ้น →</b></a>';
      }
      if (sort === 'daily') $('#rk-note').innerHTML = '<b>เคสประจำสัปดาห์ ' + weekLabel() + '</b> · เคสน่าสนใจ (ใสไม่เหลือง · MagSafe · กันกระแทก · ผิวด้าน) เคสจากร้านที่เราคัดไว้ และเคสน่ารัก ' + rows.length + ' แบบ สุ่มชุดใหม่ทุกสัปดาห์ สัปดาห์หน้ามาดูอีกนะ · เช็กตัวเลือกรุ่นในร้านก่อนสั่ง';
      rkRows = rows;
      st.page = Math.max(1, Math.min(st.page, Math.ceil(rows.length / PER()) || 1));
      $('#rk-body').innerHTML = rows.length ? body(rows) : '<div class="empty">' + (st.q ? 'ไม่พบเคสที่ชื่อหรือร้านตรงกับ "' + esc(st.q) + '" — ลองคำสั้นลง เช่น "ใส" "แม่เหล็ก" หรือกด ✕ ที่ตัวกรองด้านบน' : 'ไม่มีเคสที่ตรงกับตัวกรองนี้ — ลองลดเกณฑ์คะแนนหรือเลือกรุ่น/สไตล์อื่น') + '</div>';
      $('#rk-more').innerHTML = pagerHtml(rows.length, PER(), st.page);
      bindPager($('#rk-more'), function (n) { st.page = n; draw(); });
      syncUrl('ranking.html', { q: st.q, b: st.b !== 'iphone' ? st.b : '', fam: st.fam, tier: st.tier !== '0' ? st.tier : '', tag: st.tag, sort: st.sort, page: st.page > 1 ? st.page : '' });
    }
    el.querySelectorAll('[data-b]').forEach(function (b) { b.onclick = function () { st.b = b.getAttribute('data-b'); st.tag = ''; st.fam = ''; st.sort = ''; st.page = 1; try { history.replaceState(null, '', 'ranking.html' + (st.b !== 'iphone' ? '?b=' + st.b : '')); } catch (e) {} draw(); }; });
    el.querySelectorAll('[data-t]').forEach(function (c) { c.onclick = function () { st.tier = c.getAttribute('data-t'); st.page = 1; draw(); }; });
    el.querySelectorAll('[data-s]').forEach(function (c) { c.onclick = function () { st.sort = c.getAttribute('data-s'); st.page = 1; draw(); }; });
    var rkRows = [];
    bindFeed(el, function () { return rkRows; }, '', 'อันดับเคส');
    draw();
  };

  pages.model = function (el) {
    var m = modelBySlug(q('m')) || modelBySlug('iphone-17-pro-max');
    var list = allProducts().filter(function (p) { return fitOf(p, m.slug) !== 'no'; });
    var yes = list.filter(function (p) { return fitOf(p, m.slug) === 'yes'; }).length;
    var named = list.filter(function (p) { return fitOf(p, m.slug) === 'named'; }).length;
    var tags = []; list.forEach(function (p) { ftags(p).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); });
    TryOn.set({ model: m.slug });
    el.innerHTML = header('models') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / <a href="models.html">เคสตามรุ่น</a> / ' + m.name + '</div>' +
      '<div class="pagehead"><h1>เคส <em>' + m.name + '</em></h1><p>' + (list.length ? (L.length ? 'มี ' + list.length + ' แบบ · ยืนยันรุ่นแล้ว ' + yes + ' · ชื่อสินค้าระบุรุ่นนี้ ' + named + ' · อีก ' + (list.length - yes - named) + ' แบบเดาจากซีรีส์ (เช็กตัวเลือกในร้านก่อนสั่ง)' : 'มี ' + list.length + ' แบบ ที่ตรวจตัวเลือกรุ่นในร้านแล้ว') : 'ยังไม่มีเคสที่ตรวจแล้วสำหรับรุ่นนี้') + (m.size ? ' · หน้าจอ ' + m.size : '') + '</p></div>' +
      /* โครงเดียวกับหน้าอันดับ: แถบกรองซ้าย (การ์ดรูปเครื่อง → ความแน่ใจว่าใส่ได้ → สไตล์) + กริดแน่น */
      '' + FEED_BTN + '<div class="rk-lay"><aside class="rk-side" aria-label="ตัวกรอง">' +
      '<div class="rk-fg"><h5>มือถือของคุณ</h5><a class="rk-me" href="models.html"><span class="rk-art">' + TryOn.phoneArt(m, { k: .6 }) + '</span><b>' + m.name + '</b><small>เปลี่ยนรุ่น →</small></a>' +
      '<div class="rk-buyphone"><svg viewBox="0 0 24 24" aria-hidden="true">' + CICO.phone + '</svg><span><b>ซื้อตัวเครื่อง ' + esc(m.name) + '</b><small>เทียบราคาเครื่องจากร้านทางการ · เร็ว ๆ นี้</small></span></div></div>' +
      '<div class="rk-fg"><h5>ใส่รุ่นนี้ได้แน่แค่ไหน</h5><div class="rk-opts" id="mp-fit"></div></div>' +
      '<div class="rk-fg"><h5>สไตล์</h5><div class="rk-opts" id="mp-tags"></div></div></aside>' +
      '<main class="rk-main"><div class="rk-top"><div class="rk-pills" id="mp-pills"></div><div class="rk-sorts" role="group" aria-label="เรียงตาม">' + [['week', 'เคสประจำสัปดาห์'], ['sat', 'พอใจสุด'], ['order', 'แนะนำ'], ['sold', 'ขายดี'], ['price', 'ถูกสุด']].map(function (s) { return '<button data-s="' + s[0] + '"' + (s[0] === 'week' ? ' class="rk-daily"><i>ใหม่</i>' : '>') + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="rk-note" id="cnt"></div><div id="grid"></div><div id="morebar" style="text-align:center;margin:26px 0"></div></main></div></div>' + footer();
    var soldN = function (s) { return parseFloat(s) * (/k/.test(s) ? 1000 : 1) || 0; };
    var rtd = list.filter(function (p) { return p.rating > 0; }), meanR = rtd.reduce(function (a, p) { return a + p.rating; }, 0) / (rtd.length || 1);
    var satOf = function (p) { var v = hvSold(p); return p.rating > 0 ? (v * p.rating + 500 * meanR) / (v + 500) : 0; };   // เรตติ้งถ่วงยอดขาย เหมือนหน้าอันดับ
    var PAGE = innerWidth <= 700 ? 30 : 60;   // มือถือโหลดครั้งละน้อยลง หน้าจะได้ไม่ยาวเกิน
    var tag = tags.indexOf(q('tag')) >= 0 ? q('tag') : '', sort = ['sat', 'order', 'sold', 'price'].indexOf(q('sort')) >= 0 ? q('sort') : 'week',   /* ค่าเริ่มต้น = เคสประจำสัปดาห์ขึ้นก่อน (ผู้ใช้ขอ 13 พ.ย.) */
      WEEK_N = innerWidth <= 700 ? 12 : 24, curRows = [], page = pageP(), only = ['named', 'yes'].indexOf(q('fit')) >= 0 ? q('fit') : 'all', RANK = { yes: 0, named: 1, maybe: 2 };
    var FITS = [['all', 'ทั้งหมด'], ['named', 'ยืนยัน + ชื่อระบุรุ่น'], ['yes', 'ยืนยันแล้วเท่านั้น']];
    var fitOk = function (p, k) { var f = fitOf(p, m.slug); return k === 'all' || (k === 'yes' ? f === 'yes' : f !== 'maybe'); };
    var opt = function (k, v, label, n, on) { return '<button class="rk-opt' + (on ? ' on' : '') + '" data-' + k + '="' + esc(v) + '" aria-pressed="' + !!on + '"><span class="bx"></span>' + esc(label) + '<span class="n">' + n + '</span></button>'; };
    function draw() {
      $('#mp-fit').innerHTML = FITS.map(function (f) { return opt('fit', f[0], f[1], list.filter(function (p) { return fitOk(p, f[0]); }).length, only === f[0]); }).join('');
      var pre = list.filter(function (p) { return fitOk(p, only); });
      var cnt = {}; pre.forEach(function (p) { ftags(p).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
      if (tag && !cnt[tag]) tag = '';
      $('#mp-tags').innerHTML = tagGroupsHtml(cnt, pre.length, tag, opt);
      el.querySelectorAll('[data-s]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-s') === sort); });
      var pills = [];
      if (only !== 'all') pills.push(['fit', FITS.filter(function (f) { return f[0] === only; })[0][1]]);
      if (tag) pills.push(['tag', tag]);
      $('#mp-pills').innerHTML = pills.map(function (p) { return '<button class="rk-fp" data-x="' + p[0] + '" aria-label="เอาตัวกรอง ' + esc(p[1]) + ' ออก">' + esc(p[1]) + ' <i>✕</i></button>'; }).join('');
      var rows = pre.filter(function (p) { return !tag || ftags(p).indexOf(tag) >= 0; });
      $('#cnt').innerHTML = 'แสดง <b>' + rows.length + '</b> แบบ · ป้ายใต้รูปบอกว่ามั่นใจแค่ไหนว่าใส่ ' + esc(m.name) + ' ได้ — เช็กตัวเลือกรุ่นในร้านก่อนสั่ง';
      var bySat = function (a, b) { return (satOf(b) - satOf(a)) || (soldN(b.sold) - soldN(a.sold)); };
      rows.sort(function (a, b) { return sort === 'sat' || sort === 'week' ? bySat(a, b) : sort === 'price' ? a.price - b.price : sort === 'sold' ? soldN(b.sold) - soldN(a.sold) : (RANK[fitOf(a, m.slug)] - RANK[fitOf(b, m.slug)]) || (a.order - b.order); });
      var wk = [];
      if (sort === 'week') {   // เคสประจำสัปดาห์ (ชุดเดียวกับหน้าอันดับ: น่าสนใจ A–E · ร้านที่คัด · น่ารัก) ขึ้นก่อน แล้วต่อด้วยที่เหลือเรียงตามความพอใจ
        wk = weeklyMix(rows.filter(function (p) { return priceOf(p) >= 15 && (!p.rating || p.rating >= 4.5); }), m.slug + tag, WEEK_N, 6);
        rows = wk.concat(rows.filter(function (p) { return wk.indexOf(p) < 0; }));
        $('#cnt').innerHTML = '<b>' + wk.length + ' แบบแรก = เคสประจำสัปดาห์ ' + weekLabel() + '</b> สุ่มชุดใหม่ทุกวันจันทร์ · ต่อด้วยเคสอื่นอีก ' + (rows.length - wk.length) + ' แบบ เรียงตามความพอใจ — เช็กตัวเลือกรุ่นในร้านก่อนสั่ง';
      }
      curRows = rows;
      page = Math.max(1, Math.min(page, Math.ceil(rows.length / PAGE) || 1));
      $('#grid').innerHTML = rows.length ? '<div class="rg-grid">' + rows.slice((page - 1) * PAGE, page * PAGE).map(function (p, i) { return gcard(p, { slug: m.slug, wk: wk.indexOf(p) >= 0 }); }).join('') + '</div>' : '<div class="empty">ยังไม่มีเคสในกลุ่มนี้ — เรากำลังเพิ่มทุกสัปดาห์</div>';
      $('#morebar').innerHTML = pagerHtml(rows.length, PAGE, page);
      bindPager($('#morebar'), function (n) { page = n; draw(); });
      el.querySelectorAll('[data-fit]').forEach(function (b) { b.onclick = function () { only = b.getAttribute('data-fit'); page = 1; draw(); }; });
      el.querySelectorAll('[data-tag]').forEach(function (b) { b.onclick = function () { tag = b.getAttribute('data-tag'); page = 1; draw(); }; });
      el.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = function () { if (b.getAttribute('data-x') === 'fit') only = 'all'; else tag = ''; page = 1; draw(); }; });
      syncUrl('model.html', { m: m.slug, tag: tag, fit: only !== 'all' ? only : '', sort: sort !== 'week' ? sort : '', page: page > 1 ? page : '' });
    }
    el.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { sort = b.getAttribute('data-s'); page = 1; draw(); }; });
    bindFeed(el, function () { return curRows; }, m.slug, 'เคส ' + m.name);
    draw();
  };

  pages.product = function (el) {
    var p = prodById(q('id'));
    if (!p) {   // ลิงก์เก่า/เคสที่หลุดจากรายการ: บอกตรง ๆ ไม่สลับเป็นเคสอื่นเงียบ ๆ
      var alt = allProducts().filter(function (x) { return x.img; }).sort(function (a, b) { return (b.soldN || soldN(b.sold)) - (a.soldN || soldN(a.sold)); }).slice(0, 12);
      el.innerHTML = header('models') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / ไม่พบเคสนี้</div>' +
        '<div class="pagehead"><h1>ไม่พบ<em>เคสนี้</em>แล้ว</h1><p>เคสในลิงก์นี้ถูกเอาออกจากรายการ (ร้านปิดลิงก์ หรือของหมด) — ลองดูเคสขายดีด้านล่าง หรือเลือกตามรุ่นมือถือของคุณ</p></div>' +
        '<div class="acts" style="margin-bottom:22px"><a class="btn" href="ranking.html">ดูอันดับเคส</a><a class="btn ghost" href="models.html">เลือกรุ่นมือถือ</a></div>' +
        '<div class="rg-grid">' + alt.map(function (x) { return gcard(x); }).join('') + '</div></div>' + footer();
      return;
    }
    /* ลองทาบต้องเป็นเครื่องที่เคสนี้ใส่ได้ — เดิมเปิดเคส Samsung แล้วขึ้นบน iPhone ที่เลือกค้างไว้ */
    var fitSlug = q('m') && modelBySlug(q('m')) ? q('m') : fitOf(p, TryOn.state.model) !== 'no' ? TryOn.state.model : p.confirmed.concat(namedOf(p), p.maybe).filter(function (s) { return modelBySlug(s); })[0];
    if (fitSlug && fitSlug !== TryOn.state.model) TryOn.set({ model: fitSlug }, true);   // แค่โชว์บนหน้านี้ — ไม่เซฟทับรุ่นที่ผู้ใช้เลือกไว้
    /* ปุ่มกลับ: กลับไปหน้าที่มา (รายการเดิม ตัวกรองเดิม) ถ้ามาจากเว็บเรา · ไม่งั้นไปหน้ารายการที่เกี่ยวที่สุด */
    var sam = brandsOf(p).indexOf('samsung') >= 0 && brandsOf(p).indexOf('iphone') < 0;
    var back = q('m') && modelBySlug(q('m')) ? ['model.html?m=' + q('m'), 'เคส ' + modelBySlug(q('m')).name] : sam ? ['ranking.html?b=samsung', 'อันดับเคส Samsung'] : ['ranking.html', 'อันดับเคส'];
    var ref = ''; try { ref = document.referrer && new URL(document.referrer).origin === location.origin ? new URL(document.referrer) : ''; } catch (e) {}
    if (ref) {
      var rm = /model\.html/.test(ref.pathname) && modelBySlug(ref.searchParams.get('m'));
      back = rm ? [ref.href, 'เคส ' + rm.name] : /ranking\.html/.test(ref.pathname) ? [ref.href, ref.searchParams.get('b') === 'samsung' ? 'อันดับเคส Samsung' : 'อันดับเคส'] :
        /models\.html/.test(ref.pathname) ? [ref.href, 'เลือกรุ่นมือถือ'] : /index\.html|\/$/.test(ref.pathname) ? [ref.href, 'หน้าแรก'] : back;
    }
    var backBtn = function (cls, txt) { return '<a class="' + cls + '" href="' + esc(back[0]) + '" data-back>' + txt + '</a>'; };
    var codeRadios = '<label><input type="radio" name="sc" value="-1" checked> ไม่ใช้โค้ดร้าน</label>' + p.codes.map(function (c, i) { return '<label><input type="radio" name="sc" value="' + i + '"> โค้ดร้าน ' + c.label + '</label>'; }).join('');
    /* ชิ้นส่วนของหน้าสินค้า — แต่ละสกินจัดวางคนละโครง (A: 2 คอลัมน์ · B: แกลเลอรีใหญ่ + แถบพับ · C: บล็อกเบนโต) */
    var hasTry = !(p.liveOnly && !TryOn.hasLook(p));
    var box = function (cls, title, inner, open) {
      return '<details class="box acc ' + cls + '"' + (open ? ' open' : '') + '><summary><h3>' + title + '</h3></summary><div class="acc-b">' + inner + '</div></details>';
    };
    var gal = '<div class="gal">' + img(p) + '</div>';
    var head = '<div class="pd-head"><div class="pd-tags">' + (p.mall ? '<span class="tag mall">Mall</span>' : '') + p.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' +
      '<h1' + (p.title.length > 70 ? ' class="long"' : '') + '>' + esc(p.title) + '</h1><p class="muted">' + esc(p.blurb) + '</p>' +
      '<div class="facts">' + [p.shop ? 'ร้าน ' + p.shop : '', p.rating ? '★ ' + p.rating + (p.reviews ? ' (' + p.reviews + ' รีวิว)' : '') : '', p.sold ? 'ขายแล้ว ' + p.sold : '', p.ships ? 'ส่งจาก' + p.ships : ''].filter(Boolean).map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
      '<div class="pd-buy"><div class="pd-price"><small>ราคา Shopee' + (p.liveOnly && p.live.best < p.price ? ' · หลังโค้ดร้าน' : '') + '</small><b>' + (p.liveOnly && p.live.best < p.price ? baht(p.live.best) : baht(p.price)) + (p.priceNote && p.priceNote.indexOf('฿') === 0 && p.priceNote.indexOf('–') > 0 ? '<span>+</span>' : '') + '</b>' + (p.priceNote ? '<em>' + esc(p.priceNote) + '</em>' : '') + (p.optNote ? '<em>' + esc(p.optNote) + '</em>' : '') + '</div>' +
      '<a class="btn" href="' + p.shopee + '" target="_blank" rel="noopener sponsored">ไปซื้อที่ Shopee ↗</a></div>' +
      (p.caution ? '<div class="warnbox">⚠ ' + esc(p.caution) + '</div>' : '') + '</div>';
    var tryB = hasTry ? box('pd-try', 'ลองทาบบนเครื่องของคุณ', '<div id="ty-prod"></div>', true) : '';
    var cmpB = box('pd-cmp', 'ราคาบน Shopee', '<table class="cmp"><tr><td><span class="dot sh"></span> Shopee</td><td>' + baht(p.price) + (p.priceNote ? '<br><small style="font-weight:400;color:var(--soft)">' + esc(p.priceNote) + '</small>' : '') + liveLine(p) + '</td></tr></table>' +
      '<p class="note">' + (p.liveOnly ? (p.live.visited ? 'ราคา Shopee อัปเดตโดยบอทเมื่อ ' + esc(p.live.checked) + ' และคิดเฉพาะโค้ดร้าน (ไม่รวมโค้ดทั้งแพลตฟอร์ม/Coins)' : 'ราคา Shopee มาจากรายการ affiliate เมื่อ ' + esc(p.live.checked)) : 'ราคา Shopee อ่านจากหน้าร้านเมื่อ 1 พ.ย. 2026') + ' — ราคาจริงตอนจ่ายอาจต่างตามตัวเลือก/โปรของร้าน เช็กราคาจริงก่อนสั่งซื้อ</p>', true);
    var calcB = box('calc pd-calc', 'ราคาที่ต้องจ่าย (ซ้อนโค้ด)', '<div class="calc-q"><span>จำนวน</span><span class="qty"><button id="qm" aria-label="ลดจำนวน">−</button><b id="qn">1</b><button id="qp" aria-label="เพิ่มจำนวน">+</button></span></div>' +
      '<div class="calc-c">' + codeRadios + '</div><label><input type="checkbox" id="xt"> ถ้าเก็บโค้ด Shopee ตามเวลาได้: ลด 30% สูงสุด ฿500 (ขั้นต่ำ ฿200) <small style="color:var(--soft)">· ใบที่เจอเมื่อ ' + D.deals.checkedAt + ' วันนี้อาจต่างไป</small></label>' +
      '<div id="calc"></div><p class="note">ตัวเลขนี้เป็น<b>ประมาณการ</b>จากโค้ดที่เห็นบนหน้าร้านและหน้าโปรของ Shopee — ขั้นต่ำและเพดานของโค้ดร้านเรายังไม่ได้ยืนยัน และโค้ดตามเวลามีจำนวนจำกัด ต้องกดเก็บบน Shopee ก่อน ค่าส่งไม่รวม</p>', true);
    var lv = p.live || {}, nowP = p.liveOnly && lv.best < p.price ? lv.best : p.price;
    /* ราคาย้อนหลังจากบอท (เริ่มเก็บ 4 พ.ย. 2026): โชว์เฉพาะชิ้นที่ราคาต่ำสุดเป็นราคาตัวเคสจริง (ไม่ใช่ตัวเลือกราคาล่อ) */
    var histRows = (lv.low >= 15 && lv.low <= nowP ? '<div class="line"><span>ต่ำสุดที่บอทเคยเห็น (หลังโค้ดร้าน)</span><span>' + baht(lv.low) + '</span></div><div class="line"><span>ตอนนี้</span><span>' + baht(nowP) + (nowP - lv.low >= 1 ? ' · สูงกว่าต่ำสุด ' + baht(nowP - lv.low) : ' · เท่ากับต่ำสุด') + '</span></div>' : '') +
      (lv.was > nowP ? '<div class="line"><span>ราคาป้ายก่อนลดของร้าน</span><span><s>' + baht(lv.was) + '</s></span></div>' : '');
    var histB = box('pd-hist', 'ราคาย้อนหลัง', histRows ? histRows + '<p class="note">บอทเริ่มเก็บราคาตั้งแต่ 4 พ.ย. 2026 — ยังไม่ครบ 30 วัน "ต่ำสุด" จึงหมายถึงต่ำสุดตั้งแต่เริ่มเก็บ · ราคาป้ายก่อนลดเป็นตัวเลขที่ร้านตั้งเอง ไม่ใช่ราคาที่เคยขายจริงเสมอไป</p>' : '<div class="ph">ยังไม่มีราคาย้อนหลังที่เชื่อได้ของเคสนี้ — บอทเริ่มเก็บตั้งแต่ 4 พ.ย. 2026</div>', !!histRows);
    var same = window.TryOn && TryOn.sameLook ? allProducts().filter(function (x) { return x !== p && TryOn.sameLook(p, x); }) : [];
    var sameRow = function (x, me) { var xp = x.price; return '<tr' + (me ? ' class="me"' : '') + '><td>' + (me ? esc(x.shop || 'ร้านนี้') + ' <small>(ที่ดูอยู่)</small>' : '<a href="product.html?id=' + x.id + '">' + esc(x.shop || 'ร้านอื่น') + ' →</a>') + '</td><td>' + (x.rating ? '★ ' + x.rating : '–') + '</td><td>' + (x.sold ? esc(x.sold) : '–') + '</td><td><b>' + baht(xp) + '</b></td></tr>'; };
    var sameB = same.length ? box('pd-same', 'ดีไซน์เดียวกันจากร้านอื่น', '<table class="cmp same"><tr><th>ร้าน</th><th>เรตติ้ง</th><th>ขายแล้ว</th><th>ราคาเริ่มต้น</th></tr>' + [p].concat(same).sort(function (a, b) { return a.price - b.price; }).map(function (x) { return sameRow(x, x === p); }).join('') + '</table>' +
      '<p class="note">เราจับคู่จากรูปร้านว่าเป็นเคสดีไซน์เดียวกัน — วัสดุและงานประกอบของแต่ละร้านอาจต่างกัน ราคาเป็นราคาเริ่มต้นของแต่ละร้าน</p>', true) : '';
    var shareU = p.key ? 'https://example.com/pages/p/' + p.key + '.html' : '';
    var cta = '<div class="pd-cta"><div class="acts"><a class="btn" href="' + p.shopee + '" target="_blank" rel="noopener sponsored">ไปซื้อที่ Shopee ↗</a>' + backBtn('btn ghost', '← ดูเคสอื่น') + (shareU ? '<button type="button" class="btn ghost" id="shr" data-u="' + shareU + '">คัดลอกลิงก์แชร์</button>' : '') + (T2 ? '<button type="button" class="btn ghost" data-wish="' + esc(p.id) + '" data-wl>♡ เก็บไว้ดูทีหลัง</button>' : '') + '</div>' +
      '<p class="note">ปุ่มนี้เป็นลิงก์ affiliate ของเรา — เราอาจได้ค่าคอมมิชชันเมื่อคุณซื้อ โดยราคาที่คุณจ่ายไม่เปลี่ยน</p></div>';
    var layout = '<div class="pd"><div class="pd-c1">' + gal + '</div><div class="pd-c2">' + head + tryB + cmpB + sameB + calcB + histB + cta + '</div></div>';
    var buybar = '<div class="buybar">' + backBtn('bb-back" aria-label="กลับไป' + esc(back[1]), '←') + '<div><small>ราคาเริ่มต้น</small><b>' + baht(p.price) + '</b></div><a class="btn" href="' + p.shopee + '" target="_blank" rel="noopener sponsored">ไป Shopee ↗</a></div>';
    el.innerHTML = header('models') + '<div class="wrap"><div class="pd-nav">' + backBtn('backbtn', '<i aria-hidden="true">←</i> กลับไป' + esc(back[1])) +
      '<div class="crumb"><a href="index.html">หน้าแรก</a> / <a href="' + esc(back[0]) + '">' + esc(back[1]) + '</a> / ' + esc(p.title) + '</div></div>' + layout + '</div>' + buybar + footer();
    el.querySelectorAll('[data-back]').forEach(function (a) { a.onclick = function (e) { if (ref && history.length > 1) { e.preventDefault(); history.back(); } }; });   // กลับแบบเบราว์เซอร์ = ตัวกรอง/ตำแหน่งเลื่อนเดิมยังอยู่

    var shr = $('#shr');
    if (shr) shr.onclick = function () {   // ลิงก์แชร์ = หน้าเล็กที่มีรูป/ชื่อเคสให้ Facebook/LINE ทำพรีวิว แล้วพามาหน้านี้
      var u = shr.getAttribute('data-u'), done = function () { shr.textContent = 'คัดลอกแล้ว ✓'; setTimeout(function () { shr.textContent = 'คัดลอกลิงก์แชร์'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { window.prompt('คัดลอกลิงก์นี้', u); }); else window.prompt('คัดลอกลิงก์นี้', u);
    };
    var qty = 1;
    function calc() {
      var ci = +(document.querySelector('input[name=sc]:checked') || { value: -1 }).value;
      var sub = p.price * qty, line = [['ราคาเคส ' + baht(p.price) + ' × ' + qty, sub, 0]], cur = sub;
      var minMiss = '';
      if (ci >= 0) {
        var c = p.codes[ci], d = c.kind === 'pct' ? cur * c.value / 100 : c.value;
        if (c.cap) d = Math.min(d, c.cap);
        if (c.min && cur < c.min) minMiss = '<div class="note">โค้ดร้านนี้ต้องซื้อครบ ' + baht(c.min) + ' — ลองเพิ่มจำนวน</div>';
        else { d = Math.min(d, cur); cur -= d; line.push(['โค้ดร้าน ' + c.label, -d, 1]); }
      }
      var xt = $('#xt'); var ok = cur >= 200; xt.disabled = !ok; xt.parentNode.style.opacity = ok ? 1 : .5;
      if (!ok) xt.checked = false;
      if (xt.checked) { var x = Math.min(500, cur * .3); cur -= x; line.push(['โค้ด Shopee ตามเวลา −30%', -x, 1]); }
      $('#calc').innerHTML = '<div style="margin-top:10px">' + line.map(function (l) { return '<div class="line' + (l[2] ? ' neg' : '') + '"><span>' + l[0] + '</span><span>' + (l[1] < 0 ? '−' : '') + baht(Math.abs(l[1])) + '</span></div>'; }).join('') + '</div>' + minMiss +
        (!ok ? '<div class="note">โค้ดตามเวลาต้องมียอดขั้นต่ำ ฿200 — ลองเพิ่มจำนวนเป็น ' + Math.ceil(200 / (cur / qty)) + ' ชิ้นขึ้นไป</div>' : '') +
        '<div class="total"><span>ประมาณ</span><b>' + baht(cur) + '</b></div>';
    }
    $('#qm').onclick = function () { qty = Math.max(1, qty - 1); $('#qn').textContent = qty; calc(); };
    $('#qp').onclick = function () { qty = Math.min(5, qty + 1); $('#qn').textContent = qty; calc(); };
    document.querySelectorAll('input[name=sc],#xt').forEach(function (i) { i.onchange = calc; });
    calc();
    if (!p.liveOnly || TryOn.hasLook(p)) TryOn.stage($('#ty-prod'), { fixedId: p.id, k: 1.7 });
  };

  pages.tryon = function (el) {
    /* มาจากปุ่ม "ลองทาบเคสนี้" (tryon.html?id=…&m=…) → เลือกเคสนั้น และสลับยี่ห้อ/รุ่นให้ตรงกับที่เคสใส่ได้ */
    var tp = q('id') && prodById(q('id'));
    if (tp && TryOn.hasLook(tp)) {
      var br = TryOn.brandsOf(tp), mq = q('m'), ms = D.models.concat(D.galaxy || []);
      var okM = function (sl) { return sl && ms.some(function (m) { return m.slug === sl; }) && br.indexOf(/^galaxy-/.test(sl) ? 'galaxy' : 'iphone') >= 0; };
      var fits = tp.confirmed.concat(tp.maybe).filter(okM);
      var cur = TryOn.state.model, mdl = okM(mq) ? mq : okM(cur) ? cur : fits[0] || (br[0] === 'galaxy' ? 'galaxy-s26-ultra' : 'iphone-17-pro-max');
      if (mdl !== cur) TryOn.set({ model: mdl });
      TryOn.set({ caseId: tp.id, cc: 0 });
    }
    el.innerHTML = header('tryon') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / ลองทาบเคส</div>' +
      '<div class="pagehead"><h1>ลอง<em>ทาบ</em>เคส</h1><p>เลือกโทรศัพท์และรุ่นในแถบด้านบน แล้วกดเลือกเคสจากรายการ สลับใส่/ไม่ใส่เคส หรือกด "เทียบ 2 เคส" เพื่อดูข้างกัน</p></div>' +
      '<div class="tryon-box" id="ty-page"></div></div>' + footer();
    TryOn.stage($('#ty-page'), { k: 2.4 });
  };

  pages.deals = function (el) {
    var d = D.deals;
    var vch = function (v, dim) { return '<div class="vch' + (dim ? ' dim' : '') + '"><div class="l"><b>' + v.pct + '%</b><small>ลดสูงสุด ' + baht(v.max) + '</small></div><div class="r"><b>ขั้นต่ำ ' + baht(v.min) + '</b>' + (v.tag || 'โค้ดลดทั้งแอป') + '<br><span class="st">' + 'ตัวอย่าง · เช็กเมื่อ ' + d.checkedAt + '</span></div></div>'; };
    el.innerHTML = header('deals') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / โค้ดส่วนลด</div>' +
      '<div class="pagehead"><h1>โค้ด<em>ส่วนลด</em> Shopee</h1><p>โค้ดเป็นแบบ "กดเก็บ" ในแอป Shopee ไม่มีรหัสให้คัดลอก และเปลี่ยนทุกวัน — หน้านี้บอกรอบเวลา วิธีซ้อน และพาไปหน้าเก็บโค้ดของ Shopee · ตัวอย่างโค้ดด้านล่างเราเช็กเมื่อ <b>' + d.checkedAt + '</b> ไม่ใช่ของวันนี้</p></div>' +
      '<div class="band two" style="margin-top:0"><div class="dl lime"><span class="off">รอบถัดไป <span data-next-round></span></span><h4>โค้ดเด็ดตามเวลา</h4><p>Shopee ปล่อยโค้ดใหม่รอบ ' + d.rounds.join(' และ ') + ' น. ทุกวัน — จำนวนน้อย หมดไวมาก</p><div class="cd" data-countdown></div></div>' +
      '<div class="dl"><h4>ใช้กับเคสราคา ฿80–295 ได้ไหม</h4><p>ได้ — ใบ "ลด 30% สูงสุด ฿500 ขั้นต่ำ ฿200" ต้องซื้อให้ถึง ฿200 ก่อนหักโค้ดร้าน เช่นเคส ฿100 สองชิ้น ลองคำนวณจริงในหน้าสินค้าแต่ละชิ้น</p></div></div>' +
      '<div class="sec tight"><h2>โค้ดตามเวลา</h2><div><p>ตัวอย่างที่เจอเมื่อ ' + d.checkedAt + ' จากหน้า "ส่งฟรี + โค้ดลดทั้งแอป" ของ Shopee — กดปุ่มเพื่อดูใบของวันนี้</p><div class="b"><a class="btn sm" href="' + d.pages.timed + '" target="_blank" rel="noopener">เปิดบน Shopee ↗</a></div></div></div>' +
      '<div class="vgrid">' + d.timed.map(function (v) { return vch(v, true); }).join('') + '</div>' +
      '<div class="sec tight"><h2>โค้ดลดทั้งแอปอื่น ๆ</h2><div><p>ตัวอย่างใบที่เก็บได้เมื่อ ' + d.checkedAt + ' (หมดอายุแล้ว) — ใบของวันนี้ดูในแอป</p><div class="b"><a class="btn sm" href="' + d.pages.timed + '" target="_blank" rel="noopener">เปิดบน Shopee ↗</a></div></div></div>' +
      '<div class="vgrid">' + d.app.map(function (v) { return vch(v, true); }).join('') +
      '<div class="vch"><div class="l"><b>ฟรี</b><small>ค่าส่ง</small></div><div class="r"><b>ขั้นต่ำ ' + baht(d.freeShip.min) + '</b>โค้ดส่งฟรี<br><span class="st">ใช้ได้ถึง ' + d.freeShip.until + '</span></div></div></div>' +
      '<div class="sec tight"><h2>โค้ดของร้านค้า</h2><div><p>โค้ดร้านดูได้ในหน้าสินค้าแต่ละชิ้นของเรา เพราะร้านเคสแทบไม่อยู่ในหน้า "โค้ดพิเศษจากร้านค้า" ของ Shopee</p><div class="b"><a class="btn sm" href="models.html">เลือกรุ่น</a></div></div></div></div>' + footer();
  };

  /* อุปกรณ์เสริม (ฟิล์ม ฯลฯ): การ์ดกริดเดียวกับหน้าอันดับ แต่กดแล้วไป Shopee ด้วยลิงก์ affiliate โดยตรง (ยังไม่มีหน้าสินค้าของเราเอง) */
  /* ลักษณะของอุปกรณ์เสริม อ่านจากชื่อสินค้า (ไม่ต้องแก้ข้อมูล) */
  /* ประเภทย่อยของแต่ละหมวด — สินค้าที่นำเข้าจาก CSV มี i.t ติดมาแล้ว ฟิล์มชุดแรกยังอ่านจากชื่อ */
  var ACC_TYPES = { film: [['clear', 'กระจกใส'], ['privacy', 'กันมอง'], ['matte', 'ด้าน (เล่นเกม)'], ['lens', 'เลนส์กล้อง'], ['hydro', 'ไฮโดรเจลหลัง']],
    chg: [['set', 'ชุดหัว + สาย'], ['head', 'หัวชาร์จ'], ['cable', 'สายชาร์จ & ตัวแปลง'], ['wireless', 'แท่นชาร์จไร้สาย'], ['protect', 'ตัวถนอมสาย']],
    pb: [['mag', 'แม่เหล็ก / ไร้สาย'], ['cable', 'มีสายในตัว'], ['std', 'ทั่วไป'], ['laptop', 'ชาร์จโน้ตบุ๊กได้'], ['station', 'Power Station']],
    stand: [['selfie', 'ไม้เซลฟี่ & ขาตั้งกล้อง'], ['desk', 'ขาตั้งมือถือ'], ['mag', 'แม่เหล็ก & แหวน'], ['mount', 'ที่ยึด & กริป'], ['light', 'ไฟไลฟ์ & ไฟเซลฟี่']],
    fan: [['hand', 'พัดลมมือถือ'], ['desk', 'ตั้งโต๊ะ / หนีบ'], ['big', 'ตัวใหญ่ (แคมป์ปิ้ง)']],
    watch: [['watch', 'สมาร์ทวอทช์'], ['band', 'สายนาฬิกา'], ['guard', 'ฟิล์ม & เคสนาฬิกา']],
    phone: [['phone', 'มือถือ'], ['tablet', 'แท็บเล็ต']], strap: [['strap', 'สายคล้อง']],
    other: [['acase', 'เคส iPad / AirPods'], ['tracker', 'ที่ติดตาม GPS'], ['lamp', 'โคมไฟ'], ['misc', 'อื่น ๆ']] };
  var accTypes = function (k) { return ACC_TYPES[k] || []; };
  var accType = function (i) {
    if (i.t) return i.t;
    if (i.cat !== 'film') return (accTypes(i.cat)[0] || [''])[0];
    var t = i.title;
    if (/ไฮโดรเจล/.test(t)) return 'hydro';
    if (/เลนส์กล้อง|Camera/i.test(t)) return 'lens';
    if (/กันมอง|กันเสือก|Privacy/i.test(t)) return 'privacy';
    if (/ด้าน|AG\b/.test(t)) return 'matte';
    return 'clear';
  };
  var accDev = function (i) { return /Samsung|Galaxy/i.test(i.title) ? 'samsung' : /iPhone/i.test(i.title) ? 'iphone' : 'other'; };
  /* ยี่ห้อ + ซีรีส์ ของมือถือ/แท็บเล็ต อ่านจากชื่อสินค้า (ไว้กรอง "รุ่นมือถือ") */
  var BRANDS = [['Apple', /iphone|ipad|apple/i], ['Samsung', /samsung|galaxy/i], ['OPPO', /oppo/i], ['iQOO', /iqoo/i], ['vivo', /vivo/i], ['Xiaomi', /xiaomi|redmi|poco/i], ['HONOR', /honor/i], ['HUAWEI', /huawei/i], ['realme', /realme/i], ['Infinix', /infinix/i], ['TECNO', /tecno/i]];
  var accBrand = function (i) { for (var n = 0; n < BRANDS.length; n++) if (BRANDS[n][1].test(i.title)) return BRANDS[n][0]; return 'อื่น ๆ'; };
  var SERIES = { OPPO: [['Reno', /reno/i], ['Find X', /find/i], ['A Series', /\ba\d/i]], vivo: [['X Series', /\bx\d/i], ['V Series', /\bv\d/i], ['Y Series', /\by\d/i]], Samsung: [['Galaxy S', /galaxy s\d|\bs2\d/i], ['Galaxy A', /galaxy a\d|\ba\d/i], ['Galaxy Tab', /tab/i], ['Galaxy Watch', /watch/i]],
    Xiaomi: [['Redmi', /redmi/i], ['Xiaomi รุ่นเรือธง', /xiaomi/i]], HUAWEI: [['MatePad', /matepad/i], ['Watch / Band', /watch|band/i]], HONOR: [['HONOR X', /\bx\d/i], ['HONOR 600', /\b6\d\d/i]] };
  var accSeries = function (i) { var b = accBrand(i), l = SERIES[b] || []; for (var n = 0; n < l.length; n++) if (l[n][1].test(i.title)) return b + ' ' + l[n][0]; return ''; };
  var accRange = function (i) { var m = i.title.match(/(iPhone|Samsung|Galaxy)[^()]*$/i); return m ? m[0] : ''; };

  pages.acc = function (el) {
    var cats = (window.ACC && ACC.cats) || {}, c0 = q('c') || 'film', k = grpOf(c0), subs = GROUPS[k], all = accOf(k), id = q('id');
    var gName = (CATS.filter(function (c) { return c[0] === k; })[0] || [])[1];
    var one = id && all.filter(function (i) { return i.id === id; })[0];
    if (one) return pages.accOne(el, one, gName, k);
    var defS = 'sat', rated = all.filter(function (i) { return i.rating > 0; }).length;
    var meanR = rated ? all.reduce(function (a, i) { return a + (i.rating || 0); }, 0) / rated : 0;
    var sat = function (i) { return i.rating > 0 ? (soldN(i.sold) * i.rating + 500 * meanR) / (soldN(i.sold) + 500) : 0; };
    var st = { g: subs.length > 1 && subs.indexOf(c0) >= 0 ? c0 : (q('g') || ''), d: q('d') || '', t: q('t') || '', r: q('r') || '', s: q('s') || defS, q: (q('q') || '').trim().slice(0, 60) };
    if (st.t && st.t.indexOf('/') < 0) st.t = (subs.length === 1 ? subs[0] : st.g || subs[0]) + '/' + st.t;   // ลิงก์เก่า ?t=clear
    var sub1 = function () { return subs.length === 1 ? subs[0] : st.g; };
    var card = function (i) {
      return '<a class="rg-c" href="accessories.html?c=' + esc(k) + '&id=' + esc(i.id) + '"><span class="rg-im">' + img({ img: i.img, title: i.title }) + '</span>' +
        '<h4>' + esc(i.title) + '</h4><p><b>' + baht(i.price) + '</b>' + (i.sold ? ' · ขาย ' + esc(i.sold) : '') + '</p><p>' + esc(i.shop) + '</p></a>';
    };
    /* ตัวกรองแบบเดียวกับหน้าอันดับเคส: แถบข้าง + ช่องเลือก + หมุดตัวกรองที่ใช้อยู่ + ปุ่มเรียงมุมขวา + เลขหน้า */
    var PER = 60, pg = pageP();
    var chips = function (key, opts, count) {
      var rows = [['', 'ทั้งหมด']].concat(opts.list).map(function (o) { return [o, count(o[0])]; }).filter(function (x) { return !x[0][0] || x[1]; });
      var CAP = 6, hide = rows.length > CAP + 1 && !open[key];   // รายการยาวพับไว้ ให้แถบข้างไม่ยาวเกินไป
      var shown = hide ? rows.filter(function (x, i) { return i < CAP || st[key] === x[0][0]; }) : rows;
      return '<div class="rk-fg"><h5>' + opts.label + '</h5><div class="rk-opts">' + shown.map(function (x) {
        var o = x[0], n = x[1];
        return '<button class="rk-opt' + (st[key] === o[0] ? ' on' : '') + '" data-k="' + key + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (st[key] === o[0]) + '"><span class="bx"></span>' + esc(o[1]) + '<span class="n">' + n + '</span></button>';
      }).join('') + (hide ? '<button class="rk-more" data-more="' + key + '">ดูเพิ่มอีก ' + (rows.length - shown.length) + ' ›</button>' : '') + '</div></div>';
    };
    var open = {};
    var isPh = k === 'phone', DEV = [['iphone', 'iPhone'], ['samsung', 'Samsung']];
    var brandList = function () { var c = {}; all.forEach(function (i) { c[accBrand(i)] = 1; }); return BRANDS.map(function (x) { return [x[0], x[0]]; }).concat([['อื่น ๆ', 'อื่น ๆ']]).filter(function (x) { return c[x[0]]; }); };
    var seriesList = function () { var c = {}; all.forEach(function (i) { var r = accSeries(i); if (r && (!st.d || accBrand(i) === st.d)) c[r] = 1; }); return Object.keys(c).sort().map(function (r) { return [r, r.replace(/^\S+ /, '')]; }); };
    var typeList = function () { var out = []; (st.g ? [st.g] : subs).forEach(function (c) { accTypes(c).forEach(function (t) { out.push([c + '/' + t[0], (subs.length > 1 && !st.g ? (cats[c] || c) + ' · ' : '') + t[1]]); }); }); return out; };
    var labelOf = function (key, v) {
      var l = key === 'd' ? (isPh ? brandList() : DEV) : key === 'g' ? subs.map(function (c) { return [c, cats[c] || c]; }) : key === 'r' ? seriesList().concat([[v, v]]) : typeList().concat(subs.map(function (c) { return [c + '/x', '']; }));
      if (key === 't') { var c0 = v.split('/')[0], t0 = accTypes(c0).filter(function (t) { return t[0] === v.split('/')[1]; })[0]; return t0 ? t0[1] : v; }
      return (l.filter(function (o) { return o[0] === v; })[0] || [v, v])[1];
    };
    var tkey = function (i) { return i.cat + '/' + accType(i); };
    var pass = function (i, skip) { return (!st.q || qHit(qWords(st.q), i.title + ' ' + i.shop)) && (skip === 'g' || !st.g || i.cat === st.g) && (skip === 'd' || !st.d || (isPh ? accBrand(i) : accDev(i)) === st.d) && (skip === 'r' || !st.r || accSeries(i) === st.r) && (skip === 't' || !st.t || tkey(i) === st.t); };
    var draw = function () {
      var its = all.filter(function (i) { return pass(i); });
      its.sort(st.s === 'price' ? function (a, b) { return a.price - b.price; } : st.s === 'sold' ? function (a, b) { return soldN(b.sold) - soldN(a.sold); } :
        function (a, b) { return (sat(b) - sat(a)) || (soldN(b.sold) - soldN(a.sold)); });   // พอใจสุด: เรตติ้งถ่วงยอดขาย (สูตรเดียวกับหน้าอันดับเคส) · ไม่มีเรตติ้ง = ท้ายรายการ เรียงตามยอดขาย
      var o = (Math.min(pg, Math.ceil(its.length / PER) || 1) - 1) * PER; pg = o / PER + 1;
      $('#af-f').innerHTML =
        (k === 'film' ? chips('d', { label: 'รุ่นมือถือ', list: DEV }, function (v) { return all.filter(function (i) { return pass(i, 'd') && (!v || accDev(i) === v); }).length; }) : '') +   // แยกรุ่นมีความหมายแค่กับฟิล์ม
        (isPh ? chips('d', { label: 'ยี่ห้อมือถือ', list: brandList() }, function (v) { return all.filter(function (i) { return pass(i, 'd') && (!v || accBrand(i) === v); }).length; }) +
          (seriesList().length > 1 ? chips('r', { label: 'รุ่น / ซีรีส์', list: seriesList() }, function (v) { return all.filter(function (i) { return pass(i, 'r') && (!v || accSeries(i) === v); }).length; }) : '') : '') +
        (subs.length > 1 ? chips('g', { label: 'หมวด', list: subs.map(function (c) { return [c, cats[c] || c]; }) }, function (v) { return all.filter(function (i) { return pass(i, 'g') && (!v || i.cat === v); }).length; }) : '') +
        (typeList().length > 1 ? chips('t', { label: 'ประเภท', list: typeList() }, function (v) { return all.filter(function (i) { return pass(i, 't') && (!v || tkey(i) === v); }).length; }) : '') +
        '';
      var pills = ['q', 'g', 'd', 'r', 't'].filter(function (x) { return st[x] && !(x === 'g' && subs.length === 1); });
      $('#af-p').innerHTML = pills.map(function (x) { var l = x === 'q' ? 'ค้นหา: ' + st.q : labelOf(x, st[x]); return '<button class="rk-fp" data-x="' + x + '" aria-label="เอาตัวกรอง ' + esc(l) + ' ออก">' + esc(l) + ' <i>✕</i></button>'; }).join('');
      $('#af-s').innerHTML = [['sat', 'พอใจสุด'], ['sold', 'ขายดี'], ['price', 'ถูกสุด']].map(function (s) { return '<button data-s="' + s[0] + '"' + (st.s === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('');
      $('#af-n').innerHTML = 'แสดง <b>' + its.length + '</b> จาก ' + all.length + ' ชิ้น' + (st.s === 'sat' && !rated ? ' · <b>พอใจสุด</b> ยังไม่มีเรตติ้งของหมวดนี้ — เรียงตามยอดขายไปก่อน เมื่อบอทเก็บเรตติ้งแล้วจะเรียงตามคะแนนเอง' : '') + ' · เช็กตัวเลือกรุ่น/สีในร้านก่อนสั่ง';
      $('#af-g').innerHTML = its.length ? its.slice(o, o + PER).map(card).join('') : '<div class="empty">ไม่มีสินค้าตรงตัวกรองนี้ — ลองกด "ทั้งหมด"</div>';
      $('#af-m').innerHTML = pagerHtml(its.length, PER, pg);
      bindPager($('#af-m'), function (n) { pg = n; draw(); });
      syncUrl('accessories.html', { c: k, q: st.q, g: st.g, d: st.d, r: st.r, t: st.t, s: st.s !== defS ? st.s : '', page: pg > 1 ? pg : '' });
    };
    el.innerHTML = header('acc') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / ' + esc(gName || 'อุปกรณ์เสริม') + '</div>' +
      '<div class="pagehead"><h1>' + esc(gName || 'อุปกรณ์เสริม') + '</h1><p>' + (all.length ? 'สินค้าที่เราคัดแล้ว ' + all.length + ' ชิ้น · ราคาจากรายการ affiliate เมื่อ ' + esc(ACC.updated) + ' — กดดูรายละเอียดและโค้ดก่อนไปซื้อ' : 'ยังไม่มีสินค้าในหมวดนี้ — เร็ว ๆ นี้') + '</p></div>' +
      (all.length ? '<div class="rk-lay"><aside class="rk-side" id="af-f" aria-label="ตัวกรอง"></aside><main class="rk-main"><div class="rk-top"><div class="rk-pills" id="af-p"></div><div class="rk-sorts" id="af-s" role="group" aria-label="เรียงตาม"></div></div>' +
        '<div class="rk-note" id="af-n"></div><div class="rg-grid" id="af-g"></div><div id="af-m" style="text-align:center;margin:26px 0"></div></main></div>' : '') + '</div>' + footer();
    if (!all.length) return;
    var setK = function (key, v) { st[key] = v; if (key === 'g') st.t = ''; if (key === 'd') st.r = ''; pg = 1; draw(); };
    $('#af-f').addEventListener('click', function (e) {
      var m = e.target.closest('button[data-more]'); if (m) { open[m.dataset.more] = 1; return draw(); }
      var b = e.target.closest('button[data-k]'); if (b) setK(b.dataset.k, b.dataset.v);
    });
    $('#af-p').addEventListener('click', function (e) { var b = e.target.closest('button[data-x]'); if (b) setK(b.dataset.x, ''); });
    $('#af-s').addEventListener('click', function (e) { var b = e.target.closest('button[data-s]'); if (b) { st.s = b.dataset.s; pg = 1; draw(); } });
    draw();
  };
  /* "100พัน+" = 1 แสน+, "3พัน+" = 3 พัน+, "763" */
  function soldN(s) { var n = parseFloat(String(s).replace(/[^\d.]/g, '')) || 0; return /พัน/.test(s) ? n * 1000 : /หมื่น/.test(s) ? n * 10000 : n; }

  /* หน้ารายละเอียดอุปกรณ์เสริม: ข้อมูล + โค้ด + ปุ่มไป Shopee */
  pages.accOne = function (el, i, catName, k) {
    var d = D.deals, tp = (accTypes(i.cat).filter(function (t) { return t[0] === accType(i); })[0] || ['', ''])[1], rng = accRange(i);
    var need = Math.ceil(200 / i.price);
    var tags = (tp ? '<span class="tag">' + esc(tp) + '</span>' : '') + (accDev(i) !== 'other' ? '<span class="tag">' + (accDev(i) === 'iphone' ? 'iPhone' : 'Samsung') + '</span>' : '') + (/Mall|Official/i.test(i.shop) ? '<span class="tag mall">ร้านทางการ</span>' : '');
    var vch = function (v) { return '<div class="vch dim"><div class="l"><b>' + v.pct + '%</b><small>ลดสูงสุด ' + baht(v.max) + '</small></div><div class="r"><b>ขั้นต่ำ ' + baht(v.min) + '</b>' + (v.tag || 'โค้ดลดทั้งแอป') + '<br><span class="st">' + (v.status || v.note) + '</span></div></div>'; };
    var calc = i.price >= 200
      ? 'ซื้อชิ้นเดียวก็ถึงขั้นต่ำ ฿200 ใช้โค้ด 30% (สูงสุด ฿500) ได้ — ถ้าได้ ราคาจะเหลือประมาณ <b>' + baht(i.price - Math.min(500, i.price * .3)) + '</b>'
      : 'ราคาชิ้นละ ' + baht(i.price) + ' ยังไม่ถึงขั้นต่ำ ฿200 ของโค้ด 30% — ซื้อรวมให้ถึง ฿200 (ประมาณ <b>' + need + ' ชิ้น</b> หรือซื้อคู่กับเคส) แล้วหักโค้ดได้ถึง ' + baht(Math.min(500, need * i.price * .3)) + ' · ส่งฟรีขั้นต่ำ ' + baht(d.freeShip.min) + ' ใช้ได้ถึง ' + d.freeShip.until;
    /* โครงเดียวกับหน้าเคส (pages.product): .pd > .pd-c1 รูป + .pd-c2 (pd-head → การ์ดพับได้ .box.acc → pd-cta)
       แก้หน้าตาหน้าสินค้าที่ไหน ต้องได้ผลทั้งสองหน้า — อย่ากลับไปใช้คลาสแยก af-* อีก */
    var box = function (cls, title, inner, open) {
      return '<details class="box acc ' + cls + '"' + (open ? ' open' : '') + '><summary><h3>' + title + '</h3></summary><div class="acc-b">' + inner + '</div></details>';
    };
    var facts = ['ร้าน ' + i.shop, i.rating ? '★ ' + i.rating : '', i.sold ? 'ขายแล้ว ' + i.sold : '', rng ? 'ใช้กับ ' + rng : ''].filter(Boolean).map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('');
    var head = '<div class="pd-head"><div class="pd-tags">' + tags + '</div><h1' + (i.title.length > 70 ? ' class="long"' : '') + '>' + esc(i.title) + '</h1>' +
      '<div class="facts">' + facts + '</div>' +
      '<div class="pd-buy"><div class="pd-price"><small>ราคา Shopee</small><b>' + baht(i.price) + '</b><em>ราคาจากรายการ affiliate เมื่อ ' + esc(ACC.updated) + '</em></div><a class="btn" href="' + esc(i.link) + '" target="_blank" rel="sponsored noopener">ไปซื้อที่ Shopee ↗</a></div>' +
      '<div class="warnbox">⚠ ตัวเลือก (รุ่น/สี/ความจุ) อยู่ในหน้าร้าน ต้องเลือกให้ตรงก่อนสั่ง — ราคาอาจต่างตามตัวเลือก</div></div>';
    var boxes = box('pd-calc', 'คุ้มไหม ถ้าใช้โค้ด', '<p>' + calc + '</p>', true) +
      box('pd-shopv', 'โค้ดร้านนี้', '<p>เรายังไม่ได้ตรวจโค้ดร้านของสินค้านี้ — ดูใต้ราคาในหน้าร้านบน Shopee ว่ามีโค้ดให้กดเก็บไหม</p>') +
      box('pd-appv', 'โค้ดทั้งแอป', '<p class="note">ข้อมูลตรวจเมื่อ ' + esc(d.checkedAt) + ' อาจหมดอายุแล้ว — ดูโค้ดวันนี้ที่หน้าโค้ดส่วนลด</p>' + vch(d.timed[0]));
    var cta = '<div class="pd-cta"><div class="acts"><a class="btn" href="' + esc(i.link) + '" target="_blank" rel="sponsored noopener">ไปซื้อที่ Shopee ↗</a><a class="btn ghost" href="deals.html">ดูโค้ดวันนี้ทั้งหมด</a><a class="btn ghost" href="accessories.html?c=' + esc(k) + '">← ดูชิ้นอื่น</a></div>' +
      '<p class="note">ปุ่มนี้เป็นลิงก์ affiliate ของเรา — เราอาจได้ค่าคอมมิชชันเมื่อคุณซื้อ โดยราคาที่คุณจ่ายเท่าเดิม</p></div>';
    el.innerHTML = header('acc') + '<div class="wrap"><div class="pd-nav"><div class="crumb"><a href="index.html">หน้าแรก</a> / <a href="accessories.html?c=' + esc(k) + '">' + esc(catName || 'อุปกรณ์เสริม') + '</a> / ' + esc(i.title) + '</div></div>' +
      '<div class="pd"><div class="pd-c1"><div class="gal">' + img({ img: i.img, title: i.title }) + '</div></div><div class="pd-c2">' + head + boxes + cta + '</div></div></div>' + footer();
  };

  pages.simple = function (el, active) {
    var body = el.innerHTML;
    el.innerHTML = header(active) + body + footer();
  };

  /* ---------- ธีมใหม่ (ดูตัวอย่าง: เปิดหน้าไหนก็ได้ต่อท้าย ?theme=2 · กลับแบบเดิม ?theme=1 — จำไว้ในเครื่องผู้ใช้) + รายการที่เก็บไว้ ----------
     แบบร่าง: docs/redesign-home.html · ทุกอย่างในส่วนนี้ทำงานเฉพาะเมื่อ T2 เป็นจริง คนทั่วไปยังเห็นเว็บแบบเดิม */
  var T2 = (function () { try { var u = q('theme'); if (u === '1' || u === '2') localStorage.setItem('ch-theme', u); return localStorage.getItem('ch-theme') !== '1'; } catch (e) { return true; } })();   // ธีมใหม่เป็นค่าเริ่มต้นของทุกคน (10 พ.ย. 2026) · ?theme=1 = กลับแบบเดิมเฉพาะเครื่องนั้น
  if (T2) {
    document.documentElement.classList.add('t2');
    var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@500;600;700;800&family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap'; document.head.appendChild(fl);
  }
  /* ธีมคริสต์มาส (ตกแต่งบนธีมใหม่): ?xmas=1 เปิด · ?xmas=0 ปิด (จำในเครื่อง) · ไม่ได้ตั้ง = เปิดให้ทุกคนตั้งแต่ 10 พ.ย. 2026 ถึง 6 ม.ค. แล้วปิดเอง */
  var XMAS = (function () {
    try { var u = q('xmas'); if (u === '1' || u === '0') localStorage.setItem('ch-xmas', u); var s = localStorage.getItem('ch-xmas'); if (s) return s === '1'; } catch (e) {}
    var d = new Date(), m = d.getMonth(); return m === 10 || m === 11 || (m === 0 && d.getDate() <= 6);
  })();
  if (T2 && XMAS) document.documentElement.classList.add('xmas');
  var CODE_MIN = 200;   // ขั้นต่ำของโค้ดลดทั้งแอปใบที่เจอบ่อย (D.deals.timed[0].min)
  var priceOf = function (p) { return p.liveOnly && p.live && p.live.best < p.price ? p.live.best : p.price; };
  /* รายการที่เก็บไว้: อยู่ใน localStorage ของผู้ใช้ (ไม่มีระบบสมาชิก) — จำราคาตอนเก็บไว้เทียบกับราคาล่าสุดตอนกลับมา */
  var Wish = {
    get: function () { try { var a = JSON.parse(localStorage.getItem('ch-wish') || '[]'); return Array.isArray(a) ? a.filter(function (w) { return w && w.id; }) : []; } catch (e) { return []; } },
    put: function (a) { try { localStorage.setItem('ch-wish', JSON.stringify(a.slice(0, 60))); } catch (e) {} },
    has: function (id) { return Wish.get().some(function (w) { return String(w.id) === String(id); }); },
    toggle: function (id) {
      var a = Wish.get(), had = a.some(function (w) { return String(w.id) === String(id); });
      if (had) a = a.filter(function (w) { return String(w.id) !== String(id); });
      else { var p = prodById(id); if (!p) return false; a.unshift({ id: String(p.id), price: Math.round(priceOf(p)), t: Date.now() }); }
      Wish.put(a); return !had;
    }
  };
  var wishBtn = function (p) {
    if (!T2) return '';
    var on = Wish.has(p.id);
    return '<span class="rg-wish' + (on ? ' on' : '') + '" role="button" tabindex="0" data-wish="' + esc(p.id) + '" data-overlay-ok aria-pressed="' + on + '" aria-label="เก็บเคสนี้ไว้ดูทีหลัง">♥</span>';
  };
  var svDraw = null;
  var wishSync = function () {
    var n = Wish.get().length;
    document.querySelectorAll('[data-wn]').forEach(function (e) { e.textContent = n; e.hidden = !n; });
    document.querySelectorAll('[data-wish]').forEach(function (b) {
      var on = Wish.has(b.getAttribute('data-wish')); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      if (b.hasAttribute('data-wl')) b.textContent = on ? '♥ เก็บไว้แล้ว' : '♡ เก็บไว้ดูทีหลัง';
    });
  };
  var onWish = function (e) {
    var b = e.target.closest && e.target.closest('[data-wish]');
    if (!b || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); e.stopPropagation();
    Wish.toggle(b.getAttribute('data-wish'));
    if (svDraw) svDraw();
    wishSync();
  };
  if (T2) { document.addEventListener('click', onWish, true); document.addEventListener('keydown', onWish, true); }

  /* ---------- ไถดูเคสแบบ TikTok (ผู้ใช้ขอ 13 พ.ย.) ----------
     เต็มจอ เลื่อนขึ้นทีละเคส (scroll-snap) · ใช้รายการ+ลำดับเดียวกับกริดที่กรองอยู่ · วาดทีละ 8 ใบเมื่อใกล้ท้าย
     ปุ่ม back ของมือถือ = ปิด (pushState) · ลูกศรขึ้น/ลง/j/k เลื่อน · Esc ปิด */
  var FEED_BTN = '<button type="button" class="fd-open" data-feed><span class="fd-oi" aria-hidden="true">▶</span><span><b>ไถดูเคส</b><small>ทีละเคสเต็มจอ ปัดขึ้นเพื่อดูต่อ</small></span></button>';
  function feedSlide(p, i, n, slug) {
    var pr = slug && p.optMap && p.optMap[slug] != null ? p.optMap[slug] : priceOf(p), on = Wish.has(p.id);
    var tags = ftags(p).filter(function (t) { return TAG_OF[t]; }).slice(0, 3);
    var tryU = window.TryOn && TryOn.hasLook(p) ? 'tryon.html?id=' + p.id + (slug ? '&m=' + slug : '') : '';
    return '<section class="fd-i" data-i="' + i + '"><div class="fd-im">' + img(p) + '</div>' +
      '<div class="fd-side">' +
        '<button type="button" class="fd-b' + (on ? ' on' : '') + '" data-wish="' + esc(p.id) + '" aria-pressed="' + on + '" aria-label="เก็บเคสนี้ไว้ดูทีหลัง"><i>♥</i><small>เก็บ</small></button>' +
        (tryU ? '<a class="fd-b" href="' + tryU + '" aria-label="ลองทาบเคสนี้บนมือถือ"><i>◧</i><small>ลองทาบ</small></a>' : '') +
        '<a class="fd-b" href="product.html?id=' + p.id + (slug ? '&m=' + slug : '') + '" aria-label="ดูรายละเอียดและราคาหลังใช้โค้ด"><i>i</i><small>รายละเอียด</small></a></div>' +
      '<div class="fd-info"><span class="fd-n">' + (i + 1) + ' / ' + n + '</span>' + (tags.length ? '<span class="fd-tg">' + tags.map(esc).join(' · ') + '</span>' : '') +
        '<h3>' + esc(p.title) + '</h3><p><b>' + baht(pr) + '</b>' + (p.rating ? ' · ★ ' + p.rating : '') + (p.sold ? ' · ขาย ' + esc(p.sold) : '') + (p.shop ? ' · ' + esc(p.shop) : '') + '</p>' +
        (p.shopee ? '<a class="fd-buy" href="' + esc(p.shopee) + '" target="_blank" rel="noopener sponsored">ไปซื้อที่ Shopee ↗</a>' : '') + '</div></section>';
  }
  function openFeed(list, start, slug, title) {
    list = list.filter(function (p) { return p.img; });
    if (!list.length || document.querySelector('.fd[role="dialog"]')) return;   // กดปุ่มซ้ำเร็ว ๆ เคยเปิดซ้อน 2 อัน (ตรวจ 14 พ.ย.)
    var box = document.createElement('div'), shown = 0, BATCH = 8, keepY = window.scrollY;   // จำตำแหน่งหน้า — ปิดแล้วเคยเด้งกลับบนสุด
    box.className = 'fd'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'ไถดู' + title);
    box.innerHTML = '<div class="fd-top"><b>' + esc(title) + '</b><button type="button" class="fd-x" aria-label="ปิดโหมดไถ">✕</button></div><div class="fd-s" tabindex="-1"></div>' +
      '<div class="fd-hint" aria-hidden="true"><span>⌃</span>ปัดขึ้นเพื่อดูเคสถัดไป</div>';
    var sc = box.querySelector('.fd-s');
    var more = function () { if (shown >= list.length) return; var h = ''; list.slice(shown, shown + BATCH).forEach(function (p, k) { h += feedSlide(p, shown + k, list.length, slug); }); shown = Math.min(list.length, shown + BATCH); sc.insertAdjacentHTML('beforeend', h); };
    while (shown <= start) more();
    document.body.appendChild(box); document.documentElement.classList.add('fd-lock');
    var tgt = sc.querySelector('[data-i="' + start + '"]'); if (tgt) sc.scrollTop = tgt.offsetTop;
    sc.focus({ preventScroll: true });
    var cur = function () { return Math.round(sc.scrollTop / (sc.clientHeight || 1)); };
    sc.addEventListener('scroll', function () {
      if (sc.scrollTop + sc.clientHeight * 3 > sc.scrollHeight) more();
      if (cur() > start) box.classList.add('moved');
    }, { passive: true });
    var go = function (d) { var n = Math.max(0, Math.min(list.length - 1, cur() + d)); if (n >= shown) more(); var s = sc.querySelector('[data-i="' + n + '"]'); if (s) sc.scrollTo({ top: s.offsetTop, behavior: 'smooth' }); };
    var key = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    };
    var pushed = false, closed = false;
    function shut() { if (closed) return; closed = true; box.remove(); document.documentElement.classList.remove('fd-lock'); window.scrollTo(0, keepY); document.removeEventListener('keydown', key); window.removeEventListener('popstate', onPop); wishSync(); }
    function onPop() { shut(); }
    function close() { if (pushed) history.back(); else shut(); }   // ปิดผ่าน history ให้ปุ่ม back ไม่ต้องกดซ้ำ
    try { history.pushState({ fd: 1 }, ''); pushed = true; } catch (e) {}
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', key);
    box.querySelector('.fd-x').onclick = close;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.fd-b[data-wish]');
      if (b) {
        if (!T2) Wish.toggle(b.getAttribute('data-wish'));   // ธีมเดิม (?theme=1) ไม่มี onWish แบบ capture → สลับเองที่นี่
        var on = Wish.has(b.getAttribute('data-wish')); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);   // ธีมใหม่: onWish สลับค่าไปแล้ว — แค่วาดสถานะ
        return;
      }
      /* ลิงก์ในเว็บ (ลองทาบ/รายละเอียด): ถอยประวัติของป๊อปอัปก่อนแล้วค่อยไป — ไม่งั้นกด back จากหน้าถัดไปต้องกด 2 ครั้ง */
      var a = e.target.closest('a.fd-b[href]');
      if (a && pushed && !closed && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault();
        var go2 = a.href;
        window.addEventListener('popstate', function () { location.href = go2; }, { once: true });
        history.back();
      }
    });
    /* ล้อเมาส์/ทัชแพดบนคอม: scroll-snap แบบ mandatory ดึงกลับที่เดิมเมื่อหมุนล้อ (ตรวจ 14 พ.ย.: หมุนล้อแล้วไม่ขยับ) → เลื่อนเองทีละเคส */
    var wAcc = 0, wLock = 0;
    sc.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = Date.now();
      if (now < wLock) return;
      wAcc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(wAcc) >= 40) { go(wAcc > 0 ? 1 : -1); wAcc = 0; wLock = now + 650; }
    }, { passive: false });
  }
  /* ปุ่ม "ไถดูเคส" ในหน้า · getRows = รายการที่กรอง/เรียงอยู่ตอนกด */
  function bindFeed(el, getRows, slug, title) {
    el.addEventListener('click', function (e) { if (e.target.closest('[data-feed]')) openFeed(getRows(), 0, slug, title); });
  }

  pages.saved = function (el) {
    el.innerHTML = header('saved') + '<div class="wrap"><div class="crumb"><a href="index.html">หน้าแรก</a> / ที่เก็บไว้</div>' +
      '<div class="pagehead"><h1>เคสที่<em>เก็บไว้</em></h1><p>รายการนี้อยู่ในเครื่องของคุณเท่านั้น ไม่ต้องสมัครสมาชิก · เราจำราคาวันที่คุณเก็บไว้ให้ กลับมาอีกทีจะบอกว่าราคาขึ้นหรือลง</p></div><div id="sv"></div></div>' + footer();
    svDraw = function () {
      var rows = Wish.get().map(function (w) { return { w: w, p: prodById(w.id) }; });
      var live = rows.filter(function (r) { return r.p; });
      if (!rows.length) {
        $('#sv').innerHTML = '<div class="sv-empty"><svg viewBox="0 0 160 130" width="170" aria-hidden="true"><circle cx="80" cy="66" r="56" fill="var(--blue-l)"/><rect x="50" y="18" width="60" height="100" rx="14" fill="#fff" stroke="var(--ink)" stroke-width="3.5"/><rect x="58" y="26" width="26" height="26" rx="8" fill="var(--ink)"/>' +
          '<path d="M80 96c-14-10-20-17-20-25a10 10 0 0 1 20-4a10 10 0 0 1 20 4c0 8-6 15-20 25z" fill="var(--orange)" stroke="var(--ink)" stroke-width="3"/><circle cx="132" cy="28" r="6" fill="var(--lime)"/></svg>' +
          '<h3>ยังไม่ได้เก็บเคสไว้เลย</h3><p>กดรูปหัวใจ ♥ ที่มุมรูปเคส เพื่อเก็บไว้เทียบกันทีหลัง แล้วเราจะช่วยรวมยอดให้ถึงขั้นต่ำของโค้ด</p><div class="acts"><a class="btn" href="ranking.html">ไปดูอันดับเคส</a><a class="btn ghost" href="models.html">เลือกรุ่นมือถือ</a></div></div>';
        return;
      }
      var sum = live.reduce(function (s, r) { return s + Math.round(priceOf(r.p)); }, 0), gap = Math.max(0, CODE_MIN - sum), pct = Math.min(100, Math.round(sum / CODE_MIN * 100));
      var drops = live.filter(function (r) { return Math.round(priceOf(r.p)) - r.w.price <= -1; }).length;
      var v0 = D.deals.timed[0], save = Math.round(Math.min(v0.max, sum * v0.pct / 100));
      var meter = '<div class="sv-m' + (gap ? '' : ' ok') + '"><div class="sv-mh">' + (gap
        ? '<b>อีก ' + baht(gap) + '</b> ถึงขั้นต่ำ ' + baht(CODE_MIN) + ' ของโค้ดลดทั้งแอป'
        : '<b>ถึงขั้นต่ำ ' + baht(CODE_MIN) + ' แล้ว</b> ใช้โค้ดลดทั้งแอปได้ ถ้ากดเก็บโค้ดทัน') + '<span>รวม ' + baht(sum) + ' · ' + live.length + ' ชิ้น</span></div>' +
        '<div class="sv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + CODE_MIN + '" aria-valuenow="' + Math.min(sum, CODE_MIN) + '"><i style="width:' + pct + '%"></i></div>' +
        '<p class="note">' + (gap ? '' : 'ใบที่เจอบ่อยคือลด ' + v0.pct + '% สูงสุด ' + baht(v0.max) + ' (เช็กเมื่อ ' + D.deals.checkedAt + ') ถ้าได้ใบนี้จะประหยัดราว <b>' + baht(save) + '</b> · ') +
        'โค้ดทั้งแอปคิดจากยอดรวมในตะกร้า — ต้องใส่ทุกชิ้นลงตะกร้า Shopee แล้วสั่งพร้อมกัน · ราคาเป็นราคาเริ่มต้นของแต่ละชิ้น ยังไม่รวมค่าส่ง</p></div>';
      var row = function (r) {
        var x = '<button type="button" class="sv-x" data-wish="' + esc(r.w.id) + '" aria-label="เอาออกจากรายการ">✕</button>';
        if (!r.p) return '<div class="sv-r gone"><span class="sv-im">' + NOIMG + '</span><div class="sv-t"><b>เคสนี้ไม่อยู่ในรายการของเว็บแล้ว</b><small>ราคาวันที่คุณเก็บ ' + baht(r.w.price) + '</small></div><div class="sv-p"></div>' + x + '</div>';
        var p = r.p, now = Math.round(priceOf(p)), d = now - r.w.price, href = 'product.html?id=' + p.id;
        var tag = d <= -1 ? '<span class="sv-d dn">ลดลง ' + baht(-d) + ' จากวันที่คุณเก็บ</span>' : d >= 1 ? '<span class="sv-d up">ขึ้น ' + baht(d) + ' จากวันที่คุณเก็บ</span>' : '';
        return '<div class="sv-r"><a class="sv-im" href="' + href + '">' + img(p) + '</a><div class="sv-t"><a href="' + href + '"><b>' + esc(p.title) + '</b></a><small>' +
          [p.shop, p.rating ? '★ ' + p.rating : '', p.sold ? 'ขาย ' + p.sold : ''].filter(Boolean).map(esc).join(' · ') + '</small>' + tag + '</div>' +
          '<div class="sv-p"><b>' + baht(now) + '</b><a class="btn sm" href="' + p.shopee + '" target="_blank" rel="noopener sponsored">ไป Shopee ↗</a></div>' + x + '</div>';
      };
      /* ชิ้นที่เติมแล้วถึงขั้นต่ำพอดี: ยี่ห้อเดียวกับชิ้นแรกที่เก็บ ราคาอยู่ในช่วง [ที่ขาด, ที่ขาด+80] เรียงตามยอดขาย */
      var fill = '';
      if (gap && live.length) {
        var br = brandsOf(live[0].p)[0], inW = {}; rows.forEach(function (r) { inW[r.w.id] = 1; });
        var cand = allProducts().filter(function (p) { return !inW[p.id] && p.img && priceOf(p) >= Math.max(15, gap) && priceOf(p) <= gap + 80 && (!br || brandsOf(p).indexOf(br) >= 0); })
          .sort(function (a, b) { return hvSold(b) - hvSold(a); }).slice(0, 6);
        var acc = ACCI.filter(function (i) { return i.img && i.price >= gap && i.price <= gap + 80 && (i.cat === 'film' || i.cat === 'chg'); }).sort(function (a, b) { return soldN(b.sold) - soldN(a.sold); }).slice(0, 6);
        fill = (cand.length ? '<div class="h2-sec"><h2>เติมอีกชิ้นเดียวก็ถึง ' + baht(CODE_MIN) + '<small>เคสขายดีราคา ' + baht(Math.max(15, gap)) + '–' + baht(gap + 80) + ' · กด ♥ เพื่อเพิ่มเข้ารายการ</small></h2></div><div class="rg-grid">' + cand.map(function (p) { return gcard(p); }).join('') + '</div>' : '') +
          (acc.length ? '<div class="h2-sec"><h2>หรือเติมด้วยฟิล์ม / ที่ชาร์จ<small>อุปกรณ์เสริมขายดีในช่วงราคาเดียวกัน</small></h2></div><div class="rg-grid">' + acc.map(function (i) {
            return '<a class="rg-c" href="accessories.html?c=' + grpOf(i.cat) + '&id=' + esc(i.id) + '"><span class="rg-im">' + img({ img: i.img, title: i.title }) + '</span><h4>' + esc(i.title) + '</h4><p><b>' + baht(i.price) + '</b>' + (i.sold ? ' · ขาย ' + esc(i.sold) : '') + '</p></a>'; }).join('') + '</div>' : '');
      }
      $('#sv').innerHTML = (drops ? '<div class="sv-news">มี <b>' + drops + ' ชิ้น</b>ราคาลดลงตั้งแต่วันที่คุณเก็บไว้</div>' : '') + meter + '<div class="sv-list">' + rows.map(row).join('') + '</div>' + fill;
    };
    svDraw();
  };

  /* หน้าแรกแบบใหม่: ถามรุ่นก่อน → เลือกจากเครื่อง → ขายดี → สไตล์ → ลองทาบ */
  /* ภาพฮีโร่: ใช้โมเดลเครื่องจริงของเรา (TryOn.phoneArt) — เครื่องเปล่า 1 + เครื่องใส่เคสขายดีที่มีแบบลองทาบ 1 · รุ่นตามที่ผู้ใช้เลือกไว้ */
  function heroArt(m) {
    var ph = function (o) { try { return TryOn.phoneArt(m, o); } catch (e) { return ''; } };
    var gx = /^galaxy-/.test(m.slug), c = null;
    try {
      c = allProducts().filter(function (p) { return p.img && TryOn.hasLook(p) && (gx ? galaxyFromName(String(p.title).toLowerCase()).indexOf(m.slug) >= 0 : fitOf(p, m.slug) !== 'no'); })
        .sort(function (a, b) { return hvSold(b) - hvSold(a); })[0];
    } catch (e) {}
    var back = ph({ k: 1.5, pc: 0 }), front = c ? ph({ k: 1.5, pc: 1, look: TryOn.lookOf(c) }) : ph({ k: 1.5, pc: 1 });
    if (!back) return '';
    return '<a class="h2-art" href="tryon.html' + (c ? '?id=' + esc(c.id) + '&m=' + m.slug : '') + '" aria-label="ลองทาบเคสบน ' + esc(m.name) + '">' +
      '<svg class="h2-deco" viewBox="0 0 400 360" aria-hidden="true"><circle cx="205" cy="185" r="165" fill="var(--blue-d)"/><circle cx="58" cy="66" r="13" fill="var(--lime)"/><circle cx="356" cy="304" r="8" fill="var(--orange)"/><path d="M338 44l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#fff"/></svg>' +
      '<span class="h2-p a">' + back + '</span><span class="h2-p b">' + front + '</span>' +
      '<svg class="h2-heart" viewBox="0 0 80 76" aria-hidden="true"><path d="M40 70C12 50 4 37 4 24a19 19 0 0 1 36-8a19 19 0 0 1 36 8c0 13-8 26-36 46z" fill="var(--orange)" stroke="#17181C" stroke-width="5" stroke-linejoin="round"/></svg>' +
      '<span class="h2-cap">' + esc(m.name) + (c ? ' · กดเพื่อลองทาบเคสนี้' : '') + '</span></a>';
  }
  function homeT2(el) {
    var P = homeParts();
    var DEVS = ['iphone-18-pro-max', 'iphone-17-pro-max', 'iphone-17-pro', 'iphone-16-pro-max', 'galaxy-s26-ultra', 'galaxy-s25-ultra'].map(modelBySlug).filter(Boolean);
    var devN = function (m) { return /^galaxy-/.test(m.slug) ? allProducts().filter(function (p) { return galaxyFromName(String(p.title).toLowerCase()).indexOf(m.slug) >= 0; }).length : countFor(m.slug); };
    var top = allProducts().filter(function (p) { return p.img && hvSane(p) && p.rating >= 4.7; }).sort(function (a, b) { return hvSold(b) - hvSold(a); }).slice(0, 12);
    var sec = function (h, s, link) { return '<div class="h2-sec"><h2>' + h + (s ? '<small>' + s + '</small>' : '') + '</h2>' + (link ? '<a class="h2-more" href="' + link[0] + '">' + link[1] + ' →</a>' : '') + '</div>'; };
    /* แถบสไตล์ใต้ฮีโร่ (ผู้ใช้ขอ 13 พ.ย.: เคสเยอะจนหาไม่เจอ สไตล์เดิมอยู่ล่างสุด มือถือมองไม่เห็น) — กลุ่มดีไซน์ก่อน แล้วฟีเจอร์/ชนิด · รูป = เคสขายดีสุดของสไตล์นั้นที่ใส่รุ่นที่เลือกได้ ไม่ซ้ำรูปกัน */
    var styRail = function () {
    var curM = TryOn.state.model, stCnt = {}, stTop = {}, usedImg = {};
    var fitPs = allProducts().filter(function (p) { return p.img && fitOf(p, curM) !== 'no'; }).sort(function (a, b) { return hvSold(b) - hvSold(a); });
    fitPs.forEach(function (p) { ftags(p).forEach(function (t) { if (TAG_OF[t]) stCnt[t] = (stCnt[t] || 0) + 1; }); });
    var stList = [];
    ['ดีไซน์', 'ฟีเจอร์', 'ชนิด'].forEach(function (g) {
      Object.keys(stCnt).filter(function (t) { return TAG_OF[t] === g && stCnt[t] >= 3; }).sort(function (a, b) { return stCnt[b] - stCnt[a]; }).forEach(function (t) { stList.push(t); });
    });
    stList.forEach(function (t) { for (var i = 0; i < fitPs.length; i++) { var p = fitPs[i]; if (!usedImg[p.img] && ftags(p).indexOf(t) >= 0) { stTop[t] = p; usedImg[p.img] = 1; break; } } });
    var stRail = stList.length ? '<section class="h2-sty" aria-label="เลือกเคสตามสไตล์"><div class="h2-sty-h"><h2>เลือกตามสไตล์</h2><small>สำหรับ ' + esc((modelBySlug(curM) || {}).name || 'รุ่นที่คุณเลือก') + ' · เลื่อนดูได้</small></div>' +
      '<div class="h2-sty-r">' + stList.map(function (t, i) { var p = stTop[t]; return '<a class="h2-sc c' + (i % 4) + '" href="model.html?m=' + curM + '&tag=' + encodeURIComponent(t) + '">' +
        '<span class="h2-sc-i">' + (p ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : '') + '</span><b>' + esc(t) + '</b><small>' + stCnt[t] + ' แบบ</small></a>'; }).join('') + '</div></section>' : '';
    return stRail;
    };
    var tape = 'โค้ดตามเวลา Shopee รอบ 12:00 และ 20:00 น. &nbsp;·&nbsp; รอบถัดไปในอีก <b data-countdown-text>--:--:--</b> &nbsp;·&nbsp; รวมยอดให้ถึง ' + baht(CODE_MIN) + ' แล้วใช้โค้ดลดทั้งแอป &nbsp;·&nbsp; ';
    var body = '<section class="h2-hero"><div class="h2-g"><div><span class="h2-eye">เทียบราคาเคสบน Shopee</span><h1>มือถือคุณ<br><em>รุ่นไหน?</em></h1>' +
      '<p>บอกรุ่นมาก่อน เราจะโชว์เฉพาะเคสที่ใส่ได้ เรียงตามความพอใจของคนที่ซื้อไปแล้ว</p>' +
      '<div class="h2-find"><input id="hq" type="search" placeholder="พิมพ์รุ่น หรือชื่อเคส เช่น 17 pro max" aria-label="ค้นหารุ่นหรือเคส"><button type="button" id="hqb">หาเคส</button></div>' +
      '<div class="h2-quick">' + DEVS.slice(0, 4).map(function (m) { return '<a href="model.html?m=' + m.slug + '">' + esc(m.name) + '</a>'; }).join('') + '<a href="models.html">ทุกรุ่น →</a></div></div>' + heroArt(modelBySlug(TryOn.state.model) || DEVS[0]) + '</div>' +
      '<div class="h2-tape"><span>' + tape + tape + tape + tape + '</span></div></section>' + styRail() +
      sec('เลือกจากเครื่องของคุณ', 'ตัวเลขคือจำนวนเคสที่ชื่อสินค้าระบุรุ่นนั้น', ['models.html', 'ดูทุกรุ่น']) +
      '<div class="h2-devs">' + DEVS.map(function (m) { return '<a class="h2-dev" href="model.html?m=' + m.slug + '"><span class="h2-da">' + hvArt(m, .5) + '</span><b>' + esc(m.name) + '</b><small>' + devN(m) + ' แบบ</small></a>'; }).join('') + '</div>' +
      sec('ขายดีที่สุดตอนนี้', 'เรียงตามยอดขายบน Shopee · เรตติ้ง 4.7 ขึ้นไป' + (LIVE ? ' · ราคาอัปเดต ' + esc(LIVE.updated_at) : ''), ['ranking.html?sort=sold', 'ดูอันดับทั้งหมด']) +
      '<div class="rg-grid">' + top.map(function (p, i) { return gcard(p, { n: i + 1 }); }).join('') + '</div>' +
      P.tryH + P.tryBox + '<div class="vstrip">' + P.vcard + P.steps + '</div>';
    el.innerHTML = header('home') + '<div class="wrap">' + body + '</div>' + footer();
    var go = function () {
      var v = $('#hq').value.trim(), ws = qWords(v); if (!ws.length) return $('#hq').focus();
      var ms = D.models.concat(D.galaxy || []).filter(function (m) { return qHit(ws, m.name); }).sort(function (a, b) { return a.name.length - b.name.length; });
      location.href = 'pages/' + (ms.length ? 'model.html?m=' + ms[0].slug : 'ranking.html?q=' + encodeURIComponent(v));
    };
    $('#hqb').addEventListener('click', go); $('#hq').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    TryOn.stage($('#ty-home'), {});
    document.addEventListener('selchange', function () { var a = $('.h2-art'), m = modelBySlug(TryOn.state.model), h = a && m ? heroArt(m) : ''; if (h) a.outerHTML = h; var sr = $('.h2-sty'), nr = styRail(); if (sr && nr) sr.outerHTML = nr; });   // เปลี่ยนรุ่นในแถบบน → ภาพฮีโร่เปลี่ยนตาม
  }

  /* หัวหน้าในธีมใหม่: แผ่นน้ำเงินแบบเดียวกับฮีโร่หน้าแรก + ป้ายเหลือง + โมเดลเครื่องจริงโผล่จากขอบล่าง (ทำครั้งเดียวหลังวาดหน้า) */
  function t2Dress(page) {
    var ph = $('.wrap > .pagehead'); if (!ph || ph.querySelector('.ph-t')) return;
    var TO = window.TryOn;   // หน้าอุปกรณ์เสริมไม่ได้โหลด tryon.js
    var cur = modelBySlug(q('m')) || (TO && modelBySlug(TO.state.model)) || modelBySlug('iphone-17-pro-max');
    var art = function (m, o) { try { return TO.phoneArt(m, o); } catch (e) { return ''; } };
    var cased = function (m, n) {   // เคสขายดีที่มีแบบลองทาบของรุ่นนี้ n ชิ้น (ดีไซน์ไม่ซ้ำกัน)
      var gx = /^galaxy-/.test(m.slug), out = [];
      try {
        allProducts().filter(function (p) { return p.img && TryOn.hasLook(p) && (gx ? galaxyFromName(String(p.title).toLowerCase()).indexOf(m.slug) >= 0 : fitOf(p, m.slug) !== 'no'); })
          .sort(function (a, b) { return hvSold(b) - hvSold(a); })
          .forEach(function (p) { if (out.length < n && !out.some(function (x) { return TryOn.sameLook(x, p); })) out.push(p); });
      } catch (e) {}
      return out;
    };
    var one = function (svg, href, badge, label) { return svg ? (href ? '<a href="' + href + '" aria-label="' + esc(label || '') + '">' : '<span>') + (badge ? '<i>' + badge + '</i>' : '') + svg + (href ? '</a>' : '</span>') : ''; };
    var eye = '', row = '', cls = '';
    if (page === 'models') {
      eye = 'เริ่มจากรุ่นของคุณ';
      row = ['iphone-18-pro-max', 'galaxy-s26-ultra', 'iphone-17-pro'].map(modelBySlug).filter(Boolean).map(function (m, i) { return one(art(m, { k: 1.2, pc: i }), 'model.html?m=' + m.slug, '', 'เคส ' + m.name); }).join('');
    } else if (page === 'model' && modelBySlug(q('m'))) {
      eye = 'เฉพาะเคสที่ใส่รุ่นนี้ได้';
      row = one(art(cur, { k: 1.2, pc: 0 })) + cased(cur, 2).map(function (p, i) { return one(art(cur, { k: 1.2, pc: i + 1, look: TryOn.lookOf(p) }), 'tryon.html?id=' + esc(p.id) + '&m=' + cur.slug, '', 'ลองทาบ ' + p.title); }).join('');
    } else if (page === 'ranking') {
      eye = 'เรียงตามความพอใจของคนซื้อ'; cls = ' slim';
    } else if (page === 'tryon') {
      eye = 'ลองก่อนซื้อ'; cls = ' slim';
    } else if (page === 'deals') {
      eye = 'กดเก็บในแอป ไม่มีรหัสให้คัดลอก';
      row = '<span class="ph-tk"><svg viewBox="0 0 230 150" aria-hidden="true"><g transform="rotate(-7 115 75)"><path d="M14 22h202a8 8 0 0 1 8 8v22a16 16 0 0 0 0 32v22a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V84a16 16 0 0 0 0-32V30a8 8 0 0 1 8-8z" fill="var(--lime)" stroke="#17181C" stroke-width="4"/><path d="M150 26v88" stroke="#17181C" stroke-width="3" stroke-dasharray="5 7"/><text x="80" y="88" text-anchor="middle" font-family="Kanit,sans-serif" font-weight="800" font-size="50" fill="#17181C">30%</text><text x="186" y="76" text-anchor="middle" font-family="Kanit,sans-serif" font-weight="700" font-size="15" fill="#17181C" transform="rotate(90 186 70)">SHOPEE</text></g></svg></span>';
    } else if (page === 'acc') {
      eye = 'อุปกรณ์เสริม'; cls = ' slim';
    } else if (page === 'about') {
      eye = 'บอกตรง ๆ ว่าเราทำงานยังไง';
      row = one(art(cur, { k: 1.2, pc: 0 }), '', '✓');
    } else if (page === 'saved') {
      eye = 'อยู่ในเครื่องคุณ ไม่ต้องสมัครสมาชิก';
      row = cased(cur, 1).map(function (p) { return one(art(cur, { k: 1.2, pc: 0, look: TryOn.lookOf(p) }), '', '♥'); }).join('');
    } else cls = ' slim';
    var kids = [].slice.call(ph.childNodes), t = document.createElement('div'); t.className = 'ph-t';
    if (eye) { var e = document.createElement('span'); e.className = 'h2-eye'; e.innerHTML = eye; t.appendChild(e); }
    kids.forEach(function (k) { t.appendChild(k); });
    ph.appendChild(t);
    if (row) { var r = document.createElement('div'); r.className = 'ph-art'; r.innerHTML = row; ph.appendChild(r); }
    ph.className += ' ph2' + cls + (row ? '' : ' noart');
  }

  /* ---------- เริ่มทำงาน ---------- */
  var root = document.getElementById('app');
  var page = document.body.getAttribute('data-page');
  if (page === 'about') pages.simple(root, page);
  else if (pages[page]) pages[page](root);
  if (T2) { t2Dress(page); wishSync(); }
  if (page === 'ranking' || page === 'acc' || page === 'saved') { var pb = $('.pbar'); if (pb) pb.style.display = 'none'; }   // แถบเลือกรุ่น iPhone ไม่เกี่ยวกับหน้านี้ และกินที่
  else TryOn.mountBar($('#pbar'));
  if (page === 'model') document.addEventListener('selchange', function (e) { var cur = q('m'); if (e.detail.model !== cur) location.href = 'model.html?m=' + e.detail.model; });
  var goQ = function () { var i = $('#nq'), v = i ? i.value.trim() : ''; if (v) location.href = (page === 'home' ? 'pages/' : '') + 'ranking.html?q=' + encodeURIComponent(v); else if (i) i.focus(); };
  if ($('#nq')) { $('#nq').addEventListener('keydown', function (e) { if (e.key === 'Enter') goQ(); }); $('#nqb').addEventListener('click', goQ); }
  tick(); setInterval(tick, 1000);
  var t = $('title'); if (t && page === 'model') { var mm = modelBySlug(q('m')); if (mm) t.textContent = 'เคส ' + mm.name + ' — รวมเคส (CaseHub)'; }
  if (page === 'product') { var pp = prodById(q('id')); if (!pp) t.textContent = 'ไม่พบเคสนี้ — รวมเคส (CaseHub)'; if (pp) t.textContent = (pp.title.length > 60 ? pp.title.slice(0, 60) + '…' : pp.title) + ' — รวมเคส (CaseHub)'; }
})();

/* ลิงก์ข้ามหน้า: หน้าอื่นอยู่ใน pages/ — แก้ href ให้ถูกที่ตามหน้าที่เปิดอยู่ (ทำซ้ำได้ ทุกครั้งที่ DOM เปลี่ยน) */
(function () {
  var home = (document.body.getAttribute('data-page') === 'home');
  var re = /^(about|accessories|deals|model|models|product|ranking|saved|tryon)\.html|^m\/index\.html/;   // m/ = หน้าคงที่แยกรุ่น (bot/scripts/build_static_pages.js)
  function fix(root) {
    var as = (root && root.querySelectorAll) ? root.querySelectorAll('a[href]') : [];
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      if (home && re.test(h)) as[i].setAttribute('href', 'pages/' + h);
      else if (!home && /^index\.html/.test(h)) as[i].setAttribute('href', '../' + h);
    }
  }
  var busy = false;
  function run() { if (busy) return; busy = true; fix(document); busy = false; }
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
