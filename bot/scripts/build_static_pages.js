/* สร้างหน้าคงที่ให้ Google/Facebook อ่านได้โดยไม่ต้องรัน JS (เฟส 2 ใน docs/growth-plan.md)
   เรียกจาก bot/scripts/publish_to_site.ps1 ทุกรอบ publish (node build_static_pages.js) — ไม่ต้องรันเอง
   อ่าน assets/data.js, live.js, options.js (ไฟล์สาธารณะชุดเดียวกับที่เว็บใช้ — ไม่แตะ affiliate_links.csv / config.json)
   เขียน:
     pages/m/<รุ่น>.html, pages/m/<รุ่น>-<สไตล์>.html  หน้ารวมเคสรายรุ่น/รายรุ่น×สไตล์ (มีชื่อ รูป ราคา ลิงก์ใน HTML จริง)
     pages/m/index.html                               หน้ารวมลิงก์ทุกหน้าข้างบน
     pages/p/<ร้าน_สินค้า>.html                        หน้าสินค้าเดี่ยว (ลิงก์แชร์ + og สำหรับพรีวิว Facebook) จาก share_template.html
     sitemap.xml, robots.txt                          ที่รากเว็บ
   กฎจับรุ่น/สไตล์คัดลอกมาจาก assets/site.js (optSlugs, namedOf, galaxyFromName, TAG_RULES) — แก้ที่นั่นแล้วแก้ที่นี่ด้วย
   ต่างจากเว็บ: หน้าคงที่ใช้เฉพาะรุ่นที่ "ยืนยันจากตัวเลือกร้าน" หรือ "ชื่อสินค้าระบุรุ่นตรงตัว" (ไม่ใช้รุ่นที่เดาจากซีรีส์) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://example.com';
const MIN_MODEL = 3, MIN_STYLE = 6, MAX_LIST = 48;

function load(rel) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }
  catch (e) { console.log('[!] read ' + rel + ': ' + e.message); }
  return ctx.window;
}
const D = load('assets/data.js').DATA;
const LIVE = load('assets/live.js').LIVE;
const OPTS = load('assets/options.js').OPTS || {};
if (!D || !LIVE || !Array.isArray(LIVE.products)) { console.log('[X] data.js / live.js missing - static pages NOT changed'); process.exit(1); }
const MODELS = D.models.map(m => Object.assign({ brand: 'iphone' }, m)).concat(D.galaxy || []);
const bySlug = {}; MODELS.forEach(m => { bySlug[m.slug] = m; });

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const baht = n => '฿' + Math.round(n).toLocaleString('en-US');
const soldText = n => n >= 1000 ? (Math.floor(n / 100) / 10) + 'k+' : n > 0 ? n + '+' : '';
const safeUrl = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '';

/* ---- จับรุ่น (คัดลอกจาก site.js) ---- */
function optSlugs(name) {
  const out = []; let m, last = '';
  const add = x => { if (out.indexOf(x) < 0 && bySlug[x]) out.push(x); };
  const SUF = x => { x = (x || '').replace(/\s+/g, ''); return /^(promax|pm|prm)$/.test(x) ? '-pro-max' : x === 'pro' ? '-pro' : /^(plus|\+)$/.test(x) ? '-plus' : x === 'air' ? '-air' : /^(ultra|u)$/.test(x) ? '-ultra' : x === 'fe' ? '-fe' : x ? '-' + x : ''; };
  String(name).toLowerCase().replace(/iphone|ไอโฟน|apple|samsung|galaxy|ซัมซุง|for|สำหรับ|รุ่น/g, ' ').replace(/[()]/g, ' ')
    .replace(/โปร\s*แม็?ก(?:ซ์|ส์)?/g, ' pro max').replace(/โปร/g, ' pro').replace(/พลัส/g, ' plus').replace(/อัลตร้า|อัลตรา/g, ' ultra')
    .replace(/pro\s*ma?xx+|pro\s*mx/g, 'promax').replace(/purs|pluss/g, 'plus').split(/[\/,|&]|และ/).forEach(part => {
      const s = ' ' + part.replace(/(^|[^a-z])ip?\s?(?=1[3-8](?![0-9]))/g, '$1 ') + ' '; let hit = 0, re;
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
const NSUF = { '': '', pro: '-pro', promax: '-pro-max', plus: '-plus', '+': '-plus', air: '-air' };
function namedOf(title) {
  const t = String(title).toLowerCase(), out = []; let m;
  const re = /(?<![0-9a-z.])(1[3-8])(?:\s*(pro\s*max|promax|pro|plus|\+|air))?(?![a-z0-9])/g;
  if (/iphone|ไอโฟน|\bip\s?\d/.test(t)) while ((m = re.exec(t))) {
    const s = 'iphone-' + m[1] + NSUF[(m[2] || '').replace(/\s+/g, '')];
    if (bySlug[s] && out.indexOf(s) < 0) out.push(s);
  }
  return out;
}
function galaxyFromName(t) {
  t = String(t).toLowerCase();
  if (!/samsung|galaxy|ซัมซุง|(?:^|[^a-z0-9])s\s?2[3-6]|(?:^|[^a-z0-9])a(?:16|26|55|56)(?![0-9])/.test(t)) return [];
  const out = [], add = s => { if (out.indexOf(s) < 0 && bySlug[s]) out.push(s); }; let m;
  const re = /(?:^|[^a-z0-9])s\s?(2[3-6])\s*(ultra|อัลตร้า|u(?![a-z])|plus|พลัส|\+|fe(?![a-z]))?/g;
  while ((m = re.exec(t))) {
    const suf = m[2] || '', k = /^(ultra|อัลตร้า|u)$/.test(suf) ? '-ultra' : /^(plus|พลัส|\+)$/.test(suf) ? '-plus' : suf ? null : '';
    if (k !== null) add('galaxy-s' + m[1] + k);
  }
  const ra = /(?:^|[^a-z0-9])a(16|26|55|56)(?![0-9])/g;
  while ((m = ra.exec(t))) add('galaxy-a' + m[1]);
  return out;
}
/* ---- สไตล์ที่ทำหน้า: [slug, แท็กใน TAG_RULES, คำในหัวข้อ (ตามคำที่คนค้น)] ---- */
const TAG_RULES = {
  'ใส': /ใส(?!่)|clear|transparent|โปร่งใส/, 'ซิลิโคน': /ซิลิโคน|silicone|กำมะหยี่|นิ่ม/, 'กันกระแทก': /กันกระแทก|shockproof|drop|armor|เกราะ/,
  'หนัง': /หนัง|leather|ฝาพับ|flip/, 'แม่เหล็ก': /แม่เหล็ก|magnetic|magsafe|magnet/, 'ขาตั้ง': /ขาตั้ง|kickstand|\bstand\b/,
  'สายคล้อง': /สายคล้อง|สายสะพาย|lanyard|strap|crossbody|สร้อย/, 'ช่องใส่บัตร': /ช่องใส่บัตร|ใส่บัตร|กระเป๋า|wallet|card holder/,
  'การ์ตูน': /การ์ตูน|น่ารัก|cartoon|cute|หมี|แมว|กระต่าย|sanrio|kitty|stitch/, 'กากเพชร': /กากเพชร|glitter|กลิตเตอร์|ระยิบ|เพชร|bling/
};
const STYLES = [
  ['cute', 'การ์ตูน', 'ลายการ์ตูน น่ารัก'], ['clear', 'ใส', 'ใส'], ['shockproof', 'กันกระแทก', 'กันกระแทก'], ['magsafe', 'แม่เหล็ก', 'แม่เหล็ก MagSafe'],
  ['silicone', 'ซิลิโคน', 'ซิลิโคน นิ่ม'], ['leather', 'หนัง', 'หนัง ฝาพับ'], ['glitter', 'กากเพชร', 'กากเพชร วิบวับ'], ['stand', 'ขาตั้ง', 'มีขาตั้ง'],
  ['lanyard', 'สายคล้อง', 'มีสายคล้อง'], ['card', 'ช่องใส่บัตร', 'ใส่บัตรได้']
];
const tagsOf = t => { t = String(t).toLowerCase(); return Object.keys(TAG_RULES).filter(k => TAG_RULES[k].test(t)); };

/* ---- สินค้า: ราคาแบบเดียวกับ site.js (ตัดราคาล่อ ฿1–14) ---- */
const imgByName = {};
LIVE.products.forEach(r => { const n = String(r.name || '').trim().toLowerCase(); if (n && r.image && !imgByName[n]) imgByName[n] = r.image; });
const items = [];
LIVE.products.forEach(r => {
  const key = String(r.key || '');
  const link = safeUrl(r.link);
  if (!/^\d+_\d+$/.test(key) || !r.is_affiliate || !link) return;
  let price = r.price, bait = 0;
  if (r.case_price) {
    bait = price != null && price < r.case_price ? price : 0;
    price = r.case_price;
    if (price < 15) { if (r.price_max >= price * 2 && r.price_max >= 15) { bait = price; price = r.price_max; } else return; }
  } else {
    bait = price != null && price < 15 && r.price_max >= price * 2 ? price : 0;
    if (bait) price = r.price_max; else if (price == null || price < 15) return;
  }
  const best = r.best_price && r.best_price < price && r.best_price >= 15 ? r.best_price : 0;
  const o = OPTS[key];
  let fit = [], confirmed = false;
  if (o && o.p) { o.p.forEach(n => optSlugs(n).forEach(s => { if (fit.indexOf(s) < 0) fit.push(s); })); confirmed = fit.length > 0; }
  if (!confirmed && !(o && o.p && o.p.every(n => /\d/.test(n)))) fit = namedOf(r.name).concat(galaxyFromName(r.name));
  const img = safeUrl(r.image || imgByName[String(r.name || '').trim().toLowerCase()]);
  items.push({
    key, link, name: String(r.name || '').trim(), shop: String(r.shop || '').trim(), img, price, best, bait,
    max: r.price_max && r.price_max > price ? r.price_max : 0, sold: r.sold || 0, rating: r.rating || 0,
    checked: String(r.price_checked_at || '').slice(0, 10), fit, confirmed, tags: tagsOf(r.name)
  });
});
items.sort((a, b) => b.sold - a.sold);
const updated = String(LIVE.updated_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
const thDate = (() => { const p = updated.split('-'); const M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']; return p.length === 3 ? (+p[2]) + ' ' + M[+p[1] - 1] + ' ' + p[0] : updated; })();

/* ---- ส่วนประกอบ HTML (คลาสเดียวกับ assets/site.css) ---- */
const V = { css: '20261114b', track: '20261113a' };
const EXTRA_CSS = '.sx-item{display:flex;flex-direction:column;gap:10px}.sx-item .btn{align-self:flex-start}.sx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 26px}' +
  '.sx-chips a{padding:7px 14px;border-radius:99px;background:var(--tile);font-size:14px}.sx-chips a.on{background:var(--ink);color:var(--bg,#fff)}.sx-note{color:var(--soft);font-size:14px;line-height:1.6;margin:30px 0}' +
  '.sx-hub{columns:3 240px;gap:28px;margin-bottom:40px}.sx-hub h3{font-size:17px;margin:18px 0 6px;break-after:avoid}.sx-hub a{display:block;padding:4px 0;font-size:14.5px}' +
  '.sx-nav{display:flex;align-items:center;gap:18px;padding:18px 0;flex-wrap:wrap}.sx-nav .menu{display:flex;gap:16px;flex-wrap:wrap;font-size:15px}' +
  '.sx-pd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:start;margin-bottom:36px}.sx-pd .im{border-radius:28px;overflow:hidden;background:var(--tile);aspect-ratio:1/1}' +
  '.sx-pd .im img{width:100%;height:100%;object-fit:cover}.sx-pd h1{font-size:24px;line-height:1.35;margin-bottom:10px}.sx-pd .pr{font-size:30px;font-weight:700;margin:14px 0 4px}.sx-pd .acts{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}' +
  '.sx-next{display:flex;align-items:center;gap:14px;background:var(--ink);color:#fff;border-radius:22px;padding:14px 18px;margin:0 0 40px;text-decoration:none}' +
  '.sx-next .th{display:flex;flex:0 0 auto}.sx-next img{width:52px;height:68px;object-fit:cover;border-radius:10px;border:2px solid var(--ink);margin-left:-14px;background:#333}.sx-next img:first-child{margin-left:0}' +
  '.sx-next .tx{min-width:0}.sx-next b{display:block;font-size:16px}.sx-next small{font-size:13px;opacity:.75}' +
  '@media(max-width:760px){.sx-pd{grid-template-columns:1fr;gap:18px}.sx-pd h1{font-size:20px}.sx-nav{gap:10px 14px;padding:14px 0}.sx-nav .cta{margin-left:auto}.sx-nav .menu{order:3;width:100%;gap:6px 16px;font-size:14px}}';
function head(o) {
  return '<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>' + esc(o.title) + '</title>\n<meta name="description" content="' + esc(o.desc) + '">\n<link rel="canonical" href="' + esc(o.url) + '">\n' +
    '<link rel="icon" type="image/svg+xml" href="' + o.up + 'assets/favicon.svg">\n' +
    '<meta property="og:type" content="' + (o.ogType || 'website') + '">\n<meta property="og:site_name" content="รวมเคส (CaseHub)">\n<meta property="og:url" content="' + esc(o.url) + '">\n' +
    '<meta property="og:title" content="' + esc(o.ogTitle || o.title) + '">\n<meta property="og:description" content="' + esc(o.desc) + '">\n<meta property="og:image" content="' + esc(o.img || SITE + '/assets/og.png') + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="' + o.up + 'assets/site.css?v=' + V.css + '">\n<style>' + EXTRA_CSS + '</style>\n</head>\n<body data-page="static">\n';
}
function nav(up) {
  const p = up + 'pages/';
  return '<div class="wrap"><nav class="sx-nav"><a class="logo" href="' + up + 'index.html"><i>C</i>รวมเคส</a><div class="menu">' +
    '<a href="' + p + 'ranking.html">อันดับเคส</a><a href="' + p + 'tryon.html">ลองทาบเคส</a><a href="' + p + 'deals.html">โค้ดส่วนลด</a><a href="' + p + 'm/index.html">เคสแยกรุ่น</a></div>' +
    '<a class="cta" href="' + p + 'models.html">เคสทุกรุ่น</a></nav></div>\n';
}
function foot(up) {
  return '<footer class="foot"><div class="wrap"><p class="disc">ลิงก์ไปร้านค้าเป็นลิงก์ affiliate — เราอาจได้ค่าคอมมิชชันเมื่อคุณซื้อ โดยราคาที่คุณจ่ายไม่เปลี่ยน · ' +
    'ราคาอ่านจากรายการ Shopee เมื่อ ' + thDate + ' อาจเปลี่ยนได้ ตรวจราคาสุดท้ายบนแอปก่อนชำระเงิน · เว็บนี้ไม่ใช่เว็บทางการของ Shopee · ' +
    '<a href="' + up + 'pages/about.html#disclosure">การเปิดเผยลิงก์ affiliate</a></p></div></footer>\n' +
    '<script src="' + up + 'assets/track.js?v=' + V.track + '"></script>\n<script src="' + up + 'assets/tabbar.js?v=20261114a"></script>\n</body>\n</html>\n';
}
const priceHtml = it => (it.best ? baht(it.best) + ' <small style="font-weight:400;color:var(--soft)">หลังโค้ดร้าน</small>' : baht(it.price) + (it.max ? '–' + baht(it.max) : ''));
const imgTag = (it, w) => it.img ? '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" loading="lazy" referrerpolicy="no-referrer"' + (w ? ' width="' + w + '" height="' + w + '"' : '') + '>' :
  '<span class="noimg"><small>ยังไม่มีรูป</small></span>';
function card(it, slug) {
  const fit = it.confirmed ? '<span class="fit yes">✓ ใส่ได้ — ยืนยันจากตัวเลือกร้าน</span>' : '<span class="fit named">≈ ชื่อสินค้าระบุรุ่นนี้ — เช็กตัวเลือกร้านอีกครั้ง</span>';
  return '<div class="sx-item"><a class="tile" href="../product.html?id=' + it.key + (slug ? '&amp;m=' + slug : '') + '">' +
    '<div class="im">' + imgTag(it) + '</div>' +
    '<div class="ft"><div><h4>' + esc(it.name) + '</h4><p>' + [it.shop, it.rating ? '★ ' + it.rating : '', it.sold ? 'ขาย ' + soldText(it.sold) : ''].filter(Boolean).map(esc).join(' · ') + '</p></div><span class="arw">↗</span></div>' +
    fit + '<div class="tags">' + it.tags.slice(0, 3).map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' +
    '<div class="rows"><div class="prow best"><span class="dot sh"></span>Shopee<span class="v">' + priceHtml(it) + '</span></div></div></a>' +
    '<a class="btn sm" href="' + esc(it.link) + '" target="_blank" rel="noopener sponsored nofollow">ไปซื้อที่ Shopee ↗</a></div>';
}
/* เขียนทีหลังทีเดียว: สร้างทุกหน้าในหน่วยความจำก่อน ถ้าล้มกลางทาง หน้าเดิมยังอยู่ครบ */
const OUT = new Map(), CLEAN = [];
const write = (rel, s) => { OUT.set(rel, s); };
const clean = dir => { CLEAN.push(dir); };
function flush() {
  CLEAN.forEach(dir => { const d = path.join(ROOT, dir); if (fs.existsSync(d)) fs.readdirSync(d).filter(f => f.endsWith('.html') && !OUT.has(dir + '/' + f)).forEach(f => fs.unlinkSync(path.join(d, f))); });
  OUT.forEach((s, rel) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s, 'utf8'); });
}
const modelLabel = m => m.brand === 'galaxy' ? 'Samsung ' + m.name : m.name;

/* ---- หน้ารายรุ่น / รายรุ่น×สไตล์ ---- */
clean('pages/m');
const pagesMade = [];   // {rel, label, model, style}
MODELS.forEach(m => {
  const list = items.filter(it => it.fit.indexOf(m.slug) >= 0);
  if (list.length < MIN_MODEL) return;
  const styles = STYLES.map(s => ({ s, list: list.filter(it => it.tags.indexOf(s[1]) >= 0) })).filter(x => x.list.length >= MIN_STYLE);
  const variants = [{ s: null, list }].concat(styles);
  variants.forEach(v => {
    const file = m.slug + (v.s ? '-' + v.s[0] : '') + '.html';
    const label = 'เคส ' + modelLabel(m) + (v.s ? ' ' + v.s[2] : '');
    const shown = v.list.slice(0, MAX_LIST);
    /* ช่วงราคาส่วนใหญ่ (ควอไทล์ 25–75) แทนราคาต่ำสุด — ราคาต่ำสุดมักเป็นตัวเลือกล่อ */
    const ps = v.list.map(it => it.best || it.price).sort((a, b) => a - b), qv = x => ps[Math.min(ps.length - 1, Math.floor(ps.length * x))];
    const range = qv(.25) === qv(.75) ? baht(qv(.25)) : baht(qv(.25)) + '–' + baht(qv(.75));
    const url = SITE + '/pages/m/' + file;
    const chips = '<div class="sx-chips"><a href="' + m.slug + '.html"' + (v.s ? '' : ' class="on"') + '>ทุกแบบ (' + list.length + ')</a>' +
      styles.map(x => '<a href="' + m.slug + '-' + x.s[0] + '.html"' + (v.s === x.s ? ' class="on"' : '') + '>' + esc(x.s[2]) + ' (' + x.list.length + ')</a>').join('') + '</div>';
    const html = head({
      up: '../../', url, title: label + ' ' + v.list.length + ' แบบ ราคา ' + range + ' จาก Shopee | รวมเคส',
      desc: 'รวม' + label + ' ' + v.list.length + ' แบบ บน Shopee ราคาส่วนใหญ่ ' + range + ' เรียงตามยอดขาย อัปเดต ' + thDate + ' — ดูรุ่นที่ใส่ได้ ราคาหลังโค้ดร้าน และลองทาบเคสก่อนสั่ง',
      img: (shown.find(it => it.img) || {}).img
    }) + nav('../../') +
      '<main class="wrap"><p class="crumb"><a href="../../index.html">หน้าแรก</a> › <a href="index.html">เคสแยกรุ่น</a> › ' + (v.s ? '<a href="' + m.slug + '.html">' + esc(modelLabel(m)) + '</a> › ' + esc(v.s[2]) : esc(modelLabel(m))) + '</p>' +
      '<div class="pagehead"><h1>' + esc(label) + '</h1><p>' + v.list.length + ' แบบที่ใส่ ' + esc(modelLabel(m)) + ' ได้ (ยืนยันจากตัวเลือกรุ่นในร้าน หรือชื่อสินค้าระบุรุ่นนี้) · ราคาส่วนใหญ่ ' + range + ' · เรียงตามยอดขาย · ข้อมูล ' + thDate + '</p></div>' +
      chips + '<div class="cs-grid">' + shown.map(it => card(it, m.slug)).join('') + '</div>' +
      (v.list.length > shown.length ? '<p class="sx-note">แสดง ' + shown.length + ' แบบแรกจาก ' + v.list.length + ' แบบ — <a href="../model.html?m=' + m.slug + '">ดูทั้งหมดและกรองเพิ่มในหน้าเคส ' + esc(m.name) + '</a></p>' : '') +
      '<p class="sx-note">ก่อนสั่ง: กดเลือกตัวเลือกรุ่น "' + esc(m.name) + '" ในหน้าร้านทุกครั้ง ร้านเดียวมักขายหลายรุ่นในลิงก์เดียว · ราคาอาจต่างตามรุ่นและสี · ' +
      'อยากเห็นว่าเคสเข้ากับสีเครื่องไหม ลองที่ <a href="../tryon.html">ลองทาบเคส</a> · โค้ดส่วนลดรอบ 12:00/20:00 ดูที่ <a href="../deals.html">โค้ดส่วนลด Shopee</a></p></main>\n' + foot('../../');
    write('pages/m/' + file, html);
    pagesMade.push({ rel: 'pages/m/' + file, label, model: m, style: v.s, n: v.list.length });
  });
});
/* หน้ารวม pages/m/index.html */
{
  const groups = {};
  pagesMade.forEach(p => { (groups[p.model.slug] = groups[p.model.slug] || []).push(p); });
  const html = head({ up: '../../', url: SITE + '/pages/m/index.html', title: 'เคสมือถือแยกตามรุ่นและสไตล์ — iPhone และ Samsung | รวมเคส',
    desc: 'รวมหน้าเคสมือถือแยกรุ่น iPhone 13–18 และ Samsung Galaxy แยกสไตล์ ลายการ์ตูน ใส กันกระแทก แม่เหล็ก MagSafe ราคาจาก Shopee อัปเดต ' + thDate }) + nav('../../') +
    '<main class="wrap"><p class="crumb"><a href="../../index.html">หน้าแรก</a> › เคสแยกรุ่น</p><div class="pagehead"><h1>เคสแยกตามรุ่นและสไตล์</h1><p>' + pagesMade.length + ' หน้า · ราคาจาก Shopee อัปเดต ' + thDate + '</p></div><div class="sx-hub">' +
    Object.keys(groups).map(k => '<h3>' + esc(modelLabel(bySlug[k])) + '</h3>' + groups[k].map(p => '<a href="' + path.basename(p.rel) + '">' + esc(p.label) + ' (' + p.n + ')</a>').join('')).join('') +
    '</div></main>\n' + foot('../../');
  write('pages/m/index.html', html);
}

/* ---- แถบ "ไถดูเคสแนวนี้ต่อ" ท้ายหน้าสินค้า (แบบ E · 2026-11-14) → ../feed.html?id=<key> เริ่มที่เคสนี้แล้วตามด้วยแนวเดียวกัน
   ป้ายลูกเล่น/ด่านคัด ชุดเดียวกับ assets/feed.js (แก้ที่หนึ่งให้แก้อีกที่ด้วย) ---- */
const FEED_TAGS = [
  [/ตั้งได้|ขาตั้ง|ห่วงตั้ง|พับได้|stand|holder|kickstand/i, 'ตั้งได้'], [/กำมะหยี่|กำมะยี่|velvet/i, 'กำมะหยี่'], [/กากเพชร|glitter|วิบวับ/i, 'กากเพชร'],
  [/พาสเทล|pastel|มาการอง|macaron/i, 'พาสเทล'], [/การ์ตูน|น่ารัก|หมี|กระต่าย|แมว|ตุ๊กตา|cute|bunny|teddy|meow|(^|[^ห])ลาย/i, 'ลายน่ารัก'], [/ไข่มุก|โบว์|ริบบิ้น|bow|pearl/i, 'แต่งโบว์/มุก']
];
const FEED_SHOP = /^(CaseClub|Wishwindy)$/i, FEED_LIC = /sanrio|kitty|คิตตี้|kuromi|cinnamoroll|pochacco|โปชัคโกะ|melody|snoopy|สนูปปี้|pokemon|โปเกม่อน|doraemon|โดราเอม่อน|one ?piece|วันพีช|disney|marvel|ชินจัง|shin ?chan/i;
const FEED_NOT = /สายคล้อง|กระเป๋าใส่แปรง|ฟิล์ม(?!.*เคส)|พาวเวอร์แบงค์|powerbank|หูฟัง/i;
const feedTag = it => { if (FEED_SHOP.test(it.shop || '')) return 'ร้านดีไซน์'; const t = FEED_TAGS.find(x => x[0].test(it.name)); return t ? t[1] : ''; };
const feedOk = it => it.img && it.link && !FEED_NOT.test(it.name) && !FEED_LIC.test(it.name) && (it.best || it.price) >= 39 && (!it.rating || it.rating >= 4.5) && feedTag(it) && (FEED_SHOP.test(it.shop || '') || (it.sold || 0) >= 100);
const FEED = items.filter(feedOk);
const keyHash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function feedNext(it) {
  if (!FEED.length) return '';
  const tg = feedTag(it), pool = FEED.filter(x => x.key !== it.key && (!tg || feedTag(x) === tg));
  const src = pool.length >= 3 ? pool : FEED.filter(x => x.key !== it.key), h = keyHash(it.key);
  const th = [0, 1, 2].map(i => src[(h + i * 7) % src.length]).filter((x, i, a) => x && a.indexOf(x) === i);
  return '<a class="sx-next" href="../feed.html?id=' + it.key + '"><span class="th">' + th.map(x => '<img src="' + esc(x.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">').join('') + '</span>' +
    '<span class="tx"><b>ไถดูเคส' + (tg ? 'แนว' + esc(tg) : 'ลายสวย') + 'ต่อ ▶</b><small>อีก ' + (FEED.length >= 100 ? Math.floor(FEED.length / 100) * 100 + '+' : FEED.length) + ' แบบ แบบเต็มจอ ทีละชิ้น</small></span></a>';
}

/* ---- หน้าสินค้าเดี่ยว pages/p/<key>.html ---- */
const tplFile = path.join(__dirname, 'share_template.html');
let shareN = 0;
if (fs.existsSync(tplFile)) {
  const tpl = fs.readFileSync(tplFile, 'utf8').replace(/^﻿/, '');
  clean('pages/p');
  const pageOf = {}; pagesMade.forEach(p => { if (!p.style) pageOf[p.model.slug] = path.basename(p.rel); });
  items.forEach(it => {
    const fits = it.fit.filter(s => pageOf[s]).map(s => '<a href="../m/' + pageOf[s] + '">' + esc(bySlug[s].name) + '</a>').join(' · ');
    const priceTxt = it.best ? baht(it.best) + ' หลังโค้ดร้าน' : baht(it.price) + (it.max ? '–' + baht(it.max) + ' ตามตัวเลือก' : '');
    const desc = 'ราคา Shopee ' + priceTxt + (it.shop ? ' ร้าน ' + it.shop : '') + (it.sold ? ' ขายแล้ว ' + soldText(it.sold) : '') + ' — ดูโค้ดร้าน และลองทาบเคสบนภาพเครื่องก่อนสั่ง';
    const R = {
      NAME: esc(it.name), KEY: it.key, IMG: esc(it.img || SITE + '/assets/og.png'), DESC: esc(desc), URL: SITE + '/pages/p/' + it.key + '.html',
      IMGTAG: imgTag(it, 600), PRICE: priceHtml(it), PRICENOTE: it.bait ? 'ร้านมีตัวเลือกราคาล่อ ฿' + it.bait + ' (มักไม่ใช่ตัวเคส)' : '',
      META: esc([it.shop ? 'ร้าน ' + it.shop : '', it.rating ? '★ ' + it.rating : '', it.sold ? 'ขาย ' + soldText(it.sold) : ''].filter(Boolean).join(' · ')),
      LINK: esc(it.link), FITS: fits ? (it.confirmed ? 'ใส่ได้ (ตามตัวเลือกร้าน): ' : 'ชื่อสินค้าระบุรุ่น: ') + fits : 'เช็กตัวเลือกรุ่นในหน้าร้านก่อนสั่ง',
      UPDATED: esc(it.checked || thDate), CSSV: V.css, TRACKV: V.track, EXTRA_CSS, FEEDNEXT: feedNext(it)
    };
    write('pages/p/' + it.key + '.html', tpl.replace(/\{\{(\w+)\}\}/g, (a, k) => R[k] != null ? R[k] : ''));
    shareN++;
  });
}

/* ---- assets/feed-colors.js: ภาพตัวเลือกสี/ลายของเคส (จาก bot/data/options.json) ให้หน้าไถดูเคส pages/feed.html ปัดซ้าย-ขวาได้ (2026-11-14) ---- */
try {
  const OJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'bot', 'data', 'options.json'), 'utf8'));
  const FC = {};
  Object.entries(OJ).forEach(([k, v]) => {
    const cs = ((v && v.colors) || []).filter(c => c && c.img && !c.off).map(c => [String(c.n || '').slice(0, 40), c.img]);
    if (cs.length >= 2) FC[k] = cs.slice(0, 12);
  });
  write('assets/feed-colors.js', '/* generated by bot/scripts/build_static_pages.js from bot/data/options.json - do not edit by hand */\r\nwindow.FEED_COLORS = ' + JSON.stringify(FC) + ';\r\n');
} catch (e) { console.log('[!] feed-colors: ' + e.message); }

/* ---- sitemap.xml + robots.txt ---- */
const urls = [['index.html', '1.0'], ['pages/ranking.html', '0.8'], ['pages/models.html', '0.8'], ['pages/tryon.html', '0.7'], ['pages/deals.html', '0.6'],
  ['pages/accessories.html', '0.5'], ['pages/about.html', '0.3'], ['pages/m/index.html', '0.8']]
  .concat(pagesMade.map(p => [p.rel, p.style ? '0.6' : '0.7']))
  .concat(items.map(it => ['pages/p/' + it.key + '.html', '0.4']));
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '<url><loc>' + SITE + '/' + (u[0] === 'index.html' ? '' : u[0]) + '</loc><lastmod>' + updated + '</lastmod><priority>' + u[1] + '</priority></url>').join('\n') + '\n</urlset>\n');
/* robots: เซิร์ฟเวอร์เสิร์ฟแค่ index.html, assets/, pages/, sitemap.xml, robots.txt — โฟลเดอร์ส่วนตัวตอบ 404 อยู่แล้ว จึงไม่เขียนชื่อโฟลเดอร์ส่วนตัวลงไฟล์สาธารณะนี้ */
write('robots.txt', 'User-agent: *\nAllow: /\nDisallow: /t\nDisallow: /pages/saved.html\n\nSitemap: ' + SITE + '/sitemap.xml\n');

flush();
console.log('[OK] static pages: ' + pagesMade.length + ' model/style pages + index -> pages/m · ' + shareN + ' product pages -> pages/p · sitemap.xml (' + urls.length + ' urls) + robots.txt');
