// เฟส 5 "ราคาลงวันนี้" (docs/growth-next-phases.md) — อ่าน bot/data/price_history.csv แล้วหาชิ้นที่ราคาล่าสุดลง ≥ DROP จากค่ากลางของวันก่อนหน้า
// ผล: bot/data/price_drops.json (เรียงตาม % ที่ลง) ให้หน้าเว็บ/คิวโพสต์เอาไปใช้ต่อ
// ใช้: node bot/scripts/price_drops.js [--days 14] [--drop 0.15] [--min-points 4]
// กติกา:
//   - ค่ากลาง = median ของราคา "ก่อนวันล่าสุดของชิ้นนั้น" ย้อนไม่เกิน --days วัน (ตอนนี้ข้อมูลมีแค่ ~8 วัน จึงใช้เท่าที่มี)
//   - ต้องมีจุดก่อนหน้า ≥ --min-points วัน ไม่งั้นข้าม (กันชิ้นที่เพิ่งเก็บราคา)
//   - ข้ามราคาล่อ < ฿15 ทั้งราคาล่าสุดและค่ากลาง (ร้านตั้งตัวเลือกราคา 1 บาท)
//   - ราคาล่าสุดต้องเป็นของ 3 วันล่าสุดในไฟล์ (ของเก่ากว่านั้นไม่ใช่ "วันนี้")
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? Number(process.argv[i + 1]) : def; };
const DAYS = arg('days', 14), DROP = arg('drop', 0.15), MIN_POINTS = arg('min-points', 4), MIN_PRICE = 15, FRESH_DAYS = 3;

const rows = fs.readFileSync(path.join(ROOT, 'bot', 'data', 'price_history.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1);
const byKey = {};
let lastDate = '';
for (const line of rows) {
  const [date, key, price] = line.split(',');
  const p = Number(price);
  if (!date || !key || !(p > 0)) continue;
  (byKey[key] = byKey[key] || {})[date] = p; // วันเดียวกันหลายแถว → เอาแถวหลังสุด
  if (date > lastDate) lastDate = date;
}
const dayMs = 864e5, toMs = (d) => Date.parse(d + 'T00:00:00Z');
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

let products = {};
try {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'bot', 'data', 'products.json'), 'utf8'));
  for (const it of Array.isArray(p) ? p : p.products || Object.values(p)) if (it && it.key) products[it.key] = it;
} catch {}

const MAX_REAL = 0.6;
const drops = [], suspect = [];
let checked = 0, tooFew = 0;
for (const [key, hist] of Object.entries(byKey)) {
  const dates = Object.keys(hist).sort();
  const today = dates[dates.length - 1];
  if (toMs(lastDate) - toMs(today) > (FRESH_DAYS - 1) * dayMs) continue;
  const prev = dates.slice(0, -1).filter((d) => toMs(today) - toMs(d) <= DAYS * dayMs).map((d) => hist[d]);
  if (prev.length < MIN_POINTS) { tooFew++; continue; }
  checked++;
  const now = hist[today], base = median(prev);
  if (now < MIN_PRICE || base < MIN_PRICE) continue;
  const pct = (base - now) / base;
  if (pct < DROP) continue;
  // ราคาต้อง "เพิ่งลง": วันก่อนหน้าล่าสุดยังแพงกว่าตอนนี้ และลงภายใน FRESH_DAYS วัน (กันชิ้นที่ลงค้างมาหลายวันแล้ว)
  let since = today;
  for (let i = dates.length - 2; i >= 0 && hist[dates[i]] <= now; i--) since = dates[i];
  if (toMs(lastDate) - toMs(since) > (FRESH_DAYS - 1) * dayMs) continue;
  const it = products[key] || {};
  // ลงเกิน 60% = มักเป็นร้านเพิ่มตัวเลือกราคาล่อ ไม่ใช่ลดจริง → แยกไว้ suspect ให้คนดูก่อน ไม่ขึ้นหน้าเว็บ
  if (pct > MAX_REAL) { suspect.push({ key, name: it.name || '', price: now, base, pct: Math.round(pct * 1000) / 10, since }); continue; }
  drops.push({ key, name: it.name || '', image: it.image || '', model: it.model || '', price: now, base: Math.round(base * 100) / 100, pct: Math.round(pct * 1000) / 10, date: today, points: prev.length + 1 });
}
drops.sort((a, b) => b.pct - a.pct);

const out = { generated: new Date().toISOString(), lastDate, rule: { days: DAYS, drop: DROP, minPoints: MIN_POINTS, minPrice: MIN_PRICE }, checked, skippedTooFewPoints: tooFew, drops, suspect };
fs.writeFileSync(path.join(ROOT, 'bot', 'data', 'price_drops.json'), JSON.stringify(out, null, 1));
console.log(`ข้อมูลถึง ${lastDate} · ตรวจได้ ${checked} ชิ้น · จุดไม่พอ ${tooFew} ชิ้น · ราคาลง ≥${DROP * 100}% : ${drops.length} ชิ้น · น่าสงสัย (ลง >${MAX_REAL * 100}%) ${suspect.length}`);
for (const d of drops.slice(0, 10)) console.log(`  -${d.pct}%  ฿${d.base} → ฿${d.price}  ${d.key}  ${d.name.slice(0, 50)}`);
