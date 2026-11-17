/* ข้อมูลเครื่อง iPhone 13–18 (เก็บเมื่อ 1–4 พ.ย. 2026) — ใช้วาดภาพเครื่องและเคสในหน้า "ลองทาบ"
   ขนาด (มม.) = หน้าสเปกของ Apple (17, Air, 18 Pro) + Wikipedia (รุ่นที่เลิกขายแล้ว)
   สี: src 'apple' = สุ่มสีจากสวอตช์บนหน้าสั่งซื้อ Apple · 'wiki' = สวอตช์สีใน Wikipedia · 'est' = ประมาณเอง (ยังไม่ได้ยืนยัน)
   cam: diag=2 เลนส์ทแยง (13/14/15) · pill=2 เลนส์แนวตั้งในแคปซูล (16/17) · tri=3 เลนส์ (Pro 13–16)
        triwide=3 เลนส์ในแถบกว้างเต็มความกว้าง (17 Pro/18 Pro) · air=1 เลนส์ในแถบกว้าง
   fr: alu=อะลูมิเนียม · steel=สเตนเลส · ti=ไทเทเนียม · uni=อะลูมิเนียมยูนิบอดี
   bk: glossy=กระจกเงา · frost=กระจกด้าน (Pro) · matte=กระจกสีเนื้อด้าน
   btn: sw=สวิตช์ปิดเสียง · act=ปุ่ม Action · cc=มีปุ่ม Camera Control
   สี 17 Pro / 18 Pro มีค่าที่ 4–5 = สีอะลูมิเนียม / สีกระจกหลัง ที่วัดจากภาพถ่ายสินค้าของ Apple (ใช้วาดภาพเครื่องให้เหมือนภาพจริง) */
window.PHONES = (function () {
  /* ค่าที่ 5 (รุ่น 13–17) = สีกระจกหลังที่วัดจากภาพ finish-select ของ Apple (เฉลี่ยจุด 20,70 และ 20,110 มม.) — ค่าที่ 4 ว่าง = คำนวณสีกรอบเอง */
  var A = function (n, h, al, gl) { return [n, h, 'apple', al, gl]; }, W = function (n, h, al, gl) { return [n, h, 'wiki', al, gl]; }, E = function (n, h, al, gl) { return [n, h, 'est', al, gl]; };
  var c13 = [W('Midnight', '#232A31', '', '#161d24'), W('Starlight', '#FAF6F2', '', '#f7f2ed'), W('Blue', '#276787', '', '#205d7b'), W('Pink', '#FADDD7', '', '#f7dbd5'), W('Green', '#394C38', '', '#354735'), W('(PRODUCT)RED', '#BF0013', '', '#9a0110')];
  var c13p = [W('Graphite', '#54524F'), W('Gold', '#FAE7CF'), W('Silver', '#F1F2ED'), W('Sierra Blue', '#A7C1D9'), W('Alpine Green', '#576856')];   // Apple ไม่มีภาพให้วัดแล้ว
  var c14 = [W('Midnight', '#181F26', '', '#1a2128'), W('Starlight', '#FBF7F4', '', '#f8f4ef'), W('Blue', '#A3B6C7', '', '#9db1c4'), W('Purple', '#E6DEED', '', '#e6dbeb'), W('Yellow', '#FFE681', '', '#fae268'), W('(PRODUCT)RED', '#C82333', '', '#ed0423')];
  var c14p = [W('Space Black', '#403E3D', '', '#3d3b3a'), W('Silver', '#F0F2F2', '', '#edf0f0'), W('Gold', '#F4E8CE', '', '#f3e5cb'), W('Deep Purple', '#594F63', '', '#534b5a')];
  var c15 = [W('Black', '#3C4042', '', '#4c4d4e'), W('Blue', '#D5DDE0', '', '#f2f6f7'), W('Green', '#CFD9C9', '', '#f1f5e6'), W('Yellow', '#ECE6C6', '', '#fdf7e0'), W('Pink', '#EBD0D2', '', '#fde4e4')];
  var c15p = [W('Black Titanium', '#3F4042', '', '#4a4948'), W('White Titanium', '#F2F1EB', '', '#eae9e5'), W('Blue Titanium', '#3D4555', '', '#4d525c'), W('Natural Titanium', '#BAB4A9', '', '#a6a19a')];
  var c16 = [A('Black', '#4A4E50', '', '#444545'), A('White', '#FAFAFA', '', '#f6f5f4'), A('Pink', '#F4B3DD', '', '#eea8d5'), A('Teal', '#B7D7D6', '', '#a8cecd'), A('Ultramarine', '#A2B3F8', '', '#8fa2eb')];
  var c16p = [W('Black Titanium', '#3C3C3D', '', '#5b5b5b'), W('White Titanium', '#F2F1ED', '', '#eeeeed'), W('Natural Titanium', '#C2BCB2', '', '#d0ccc4'), W('Desert Titanium', '#BFA48F', '', '#e3d1c2')];
  var c17 = [A('Black', '#4A4E50', '', '#5a5a5a'), A('White', '#FAFAFA', '', '#e4e4e2'), A('Mist Blue', '#A9BDDE', '', '#a5b5cc'), A('Sage', '#BAC79C', '', '#afb992'), A('Lavender', '#E8D8F2', '', '#dcd0e1')];
  var cAir = [A('Space Black', '#131313'), A('Cloud White', '#FCFCFC'), A('Light Gold', '#FAF3E5'), A('Sky Blue', '#E5F2FA')];
  var c17p = [E('Silver', '#D8D9DC', '#c9cac9', '#f1f1f0'), E('Cosmic Orange', '#E27A3F', '#dc7b46', '#f99150'), E('Deep Blue', '#2F3A55', '#3d4255', '#41475a')];
  var c18p = [A('Black', '#3C3C3C', '#1d1d1e', '#232224'), A('Silver', '#F7F7F7', '#d4d5d3', '#dededd'), A('Glacier', '#E8F1FE', '#a1aec2', '#b2bed0'), A('Burgundy', '#4D1822', '#49292f', '#4e2e35')];
  var P = function (h, w, d, scr, fr, bk, cam, btn, col) { return { h: h, w: w, d: d, scr: scr, fr: fr, bk: bk, cam: cam, btn: btn, col: col }; };

  /* ---------- Samsung Galaxy S24–S26 (พ.ย. 2026) ----------
     ขนาด: หน้าสเปก Samsung / GSMArena · สี: ประมาณเองจากภาพเรนเดอร์ทางการ (ยังไม่ได้วัดจากภาพถ่ายสินค้า) → ที่มา 'est'
     กล้อง: วัดจากภาพเรนเดอร์ทางการหลังเครื่อง (GSMArena, ~4 พิกเซล/มม. → คลาดเคลื่อน ±0.4 มม.) หน่วยมม. จากมุมซ้ายบนของภาพหลังเครื่อง
       g.L = [[x, y, รัศมีขอบนอกของวงเลนส์, 'tele'?, ความหนาวง(ไม่ใส่ = g.rw)]] · g.flash = [x, y, r] · g.isl = แคปซูลยกสูง [x, y, w, h, r] (S26 / S26 Ultra)
       g.rg = สีวงรอบเลนส์ ('dk' = ดำ · 'fr' = สีกรอบ · 'lt' = สีกรอบสว่างขึ้น) · g.R = รัศมีมุมหลังเครื่อง · g.btn = ปุ่มด้านขวาของเครื่อง [[y0,y1]…] (ภาพหลัง = ซ้ายมือ)
     cam: gx3 = 3 เลนส์แนวตั้งชิดขอบซ้าย (S24/S25 รุ่นธรรมดาและ +) · gxp = 3 เลนส์ในแคปซูลยกสูง (S26 / S26+) · gxu = เลนส์ใหญ่ 3 + เล็ก 2 (Ultra) */
  var X = function (n, h, fr, gl) { return [n, h, 'est', fr, gl]; };
  var g26 = [X('Black', '#2b2c30', '#3b3c40', '#2c2d31'), X('White', '#f1f2f3', '#d9dadc', '#eeeff0'), X('Cobalt Violet', '#8a87b6', '#9a97c0', '#8f8cb9'), X('Sky Blue', '#bcd1de', '#d6e3ee', '#c3d6e6'), X('Silver Shadow', '#c7c8ca', '#d9dadc', '#cbccce'), X('Pink Gold', '#ead2c6', '#f0ddd3', '#e8cfc2')];
  var g25 = [X('Icy Blue', '#c3d3e6', '#aebfd3', '#c3d3e6'), X('Mint', '#bfe0d0', '#a5c8b6', '#c2e2d3'), X('Navy', '#3f5594', '#2e3c6e', '#415896'), X('Silver Shadow', '#d4d6da', '#bfc2c7', '#d9dbdf')];
  var g25u = [X('Titanium Silverblue', '#b4bdd4', '#d0d5e6', '#b8c1d7'), X('Titanium Black', '#303236', '#45474b', '#323438'), X('Titanium Whitesilver', '#d8d9dc', '#e6e7e9', '#dcdde0'), X('Titanium Gray', '#8c8d90', '#a5a6a9', '#8f9093')];
  var g24 = [X('Onyx Black', '#38383a', '#4a4a4d', '#3a3a3c'), X('Marble Gray', '#c3c3c5', '#d6d6d8', '#c6c6c8'), X('Cobalt Violet', '#b8a9d6', '#c9bde0', '#bcaedb'), X('Amber Yellow', '#ecd48b', '#f3e2a9', '#efd997')];
  var g24u = [X('Titanium Gray', '#8f8e8b', '#a9a8a5', '#93928f'), X('Titanium Black', '#2d2d2f', '#454547', '#2f2f31'), X('Titanium Violet', '#9f93bd', '#b9aed2', '#a396c1'), X('Titanium Yellow', '#e6cd8a', '#f2e0a6', '#ead392')];
  /* S23 / A-series (วัดจากภาพเรนเดอร์ GSMArena เหมือนกัน) — ขนาด: PhoneArena / Samsung · สี 'est' */
  var g23 = [X('Phantom Black', '#2b2c2f', '#3c3d40', '#2d2e31'), X('Cream', '#eee8dc', '#d8d1c3', '#efe9de'), X('Green', '#69776a', '#7e8c7f', '#6c7a6d'), X('Lavender', '#dccfe3', '#c3b5cc', '#dfd2e6')];
  var gA55 = [X('Awesome Iceblue', '#dfe6f3', '#b8c4d6', '#e1e8f4'), X('Awesome Lilac', '#d9cfe6', '#bdb1cc', '#dcd2e8'), X('Awesome Navy', '#2d3350', '#3d4366', '#30365a'), X('Awesome Lemon', '#f1eaa6', '#d8d18c', '#f3edb0')];
  var gA56 = [X('Awesome Graphite', '#4a4b4f', '#5d5e62', '#4c4d51'), X('Awesome Lightgray', '#c4cac7', '#a9afac', '#c6ccc9'), X('Awesome Olive', '#7d8a68', '#6d7a5a', '#7f8c6a'), X('Awesome Pink', '#e9c1c9', '#d0a9b1', '#ebc6ce')];
  var gA26 = [X('Black', '#2c2d30', '#3e3f42', '#2e2f32'), X('White', '#f1f1f1', '#d6d6d8', '#f2f2f2'), X('Mint', '#cfeee5', '#aed1c7', '#d2efe7'), X('Peach Pink', '#f2c8c2', '#d6aea8', '#f4cbc5')];
  var gA16 = [X('Blue Black', '#2e3345', '#40465a', '#313648'), X('Light Gray', '#d8dbe0', '#bcbfc5', '#dadde2'), X('Light Green', '#c7dfc9', '#abc4ad', '#c9e1cb')];
  var gS23 = { R: 7, rw: 1.2, rg: 'lt', L: [[12.5, 12.6, 6.8], [12.5, 28.8, 6.8], [12.5, 45, 6.8]], flash: [26.6, 12.7, 1.9] };
  var gU23 = { R: 3, rw: 1.2, rg: 'lt', L: [[14.8, 12.8, 7.7], [14.8, 31.1, 7.7], [14.8, 49.3, 7.7], [31.7, 12.8, 4.9, '', 1], [31.7, 31.1, 4.9, '', 1]], flash: [31.7, 22, 1.75] };
  var gA5 = { R: 8, rw: 1, rg: 'lt', L: [[12.9, 13, 7.05], [12.9, 29.8, 7.05], [12.9, 46.7, 7.05]], flash: [26.1, 21.3, 2] };   // A55: ห่วงเลนส์เงาขาวบาง ๆ
  var gA16s = { R: 8, rw: 1, rg: 'dk', L: [[12.9, 13.2, 6.95], [12.9, 29.3, 6.95], [12.9, 45.4, 6.95]], flash: [26, 21.1, 2] };
  var gA56s = { R: 8, rw: 1.3, rg: '#3f4146', isc: '#15161a', isl: [6.1, 5.9, 17.7, 47, 8.85], L: [[14.2, 14.6, 6.4], [14.2, 29.3, 6.4], [14.2, 43.7, 6.4]], flash: [30, 22.6, 1.75] };   // เลนส์ในแคปซูลดำ
  var gA26s = { R: 8.5, rw: 1.3, rg: '#3f4146', isc: '#15161a', isl: [5.4, 6.2, 17.7, 46.5, 8.85], L: [[14.4, 14.8, 6.6], [14.4, 29.3, 6.6], [14.4, 43.7, 6.6]], flash: [29.7, 22.1, 1.7] };
  var GX = function (h, w, d, scr, fr, cam, btn, col, g) { var p = P(h, w, d, scr, fr, 'matte', cam, btn, col); p.g = g; p.R = g.R; return p; };
  var bB = [[26.5, 46.5], [56, 67.5]], bP = [[28, 48], [58, 69.5]], bU = [[29.5, 52], [61, 72.5]];   // ปุ่มปรับเสียง + ปุ่มเพาเวอร์
  /* ตำแหน่งวัดของ S+ ใช้ชุดเดียวกับรุ่นธรรมดา (กลุ่มกล้องยึดมุมซ้ายบนเหมือนกัน) */
  var gS24 = { R: 9, rw: 1.5, rg: 'lt', L: [[12.5, 12.2, 6.8], [12.5, 28.5, 6.8], [12.5, 44.5, 6.8]], flash: [26.4, 20.2, 1.8] };
  var gS25 = { R: 9, rw: 1.9, rg: 'dk', L: [[12.4, 12.7, 7.2], [12.4, 28.8, 7.2], [12.4, 44.9, 7.2]], flash: [26.5, 20.9, 2.2] };
  var gS26 = { R: 10, rw: 1.4, rg: 'dk', isl: [3.6, 3.6, 20.4, 52.3, 10.2], L: [[13.6, 13.7, 7.4], [13.6, 29.7, 7.4], [13.6, 45.9, 7.4]], flash: [28.9, 21.5, 2] };
  var gU24 = { R: 5.5, rw: 1.05, rg: 'lt', L: [[15.8, 13.6, 7.8], [15.8, 31.9, 7.8], [15.8, 50.1, 7.8], [32.8, 13.6, 4.8, '', .85], [32.8, 31.9, 4.8, '', .85]], flash: [32.8, 22.9, 1.8] };
  var gU25 = { R: 6.5, rw: 2, rg: 'dk', L: [[14.1, 14.2, 8.1], [14.1, 32.4, 8.1], [14.1, 50.8, 8.1], [30.9, 14.1, 4.9, '', 1.3], [30.9, 32.3, 4.9, '', 1.3]], flash: [30.9, 23.2, 1.5] };
  var gU26 = { R: 9.5, rw: 1.6, rg: 'dk', isl: [4.3, 4.3, 21, 57.6, 10.5], L: [[14.7, 14.8, 8.4], [14.7, 33.05, 8.4], [14.7, 51.35, 8.4], [32.6, 14.8, 4.7, '', 1.2], [32.6, 33, 4.7, '', 1.2]], flash: [32.6, 24, 1.9] };
  var withBtn = function (g, b) { return Object.assign({ btn: b }, g); };
  return {
    'galaxy-s24': GX(147, 70.6, 7.6, 6.2, 'alu', 'gx3', 'pv', g24, withBtn(gS24, bB)),
    'galaxy-s24-plus': GX(158.5, 75.9, 7.7, 6.7, 'alu', 'gx3', 'pv', g24, withBtn(gS24, bP)),
    'galaxy-s24-ultra': GX(162.3, 79, 8.6, 6.8, 'ti', 'gxu', 'pvs', g24u, withBtn(gU24, bU)),
    'galaxy-s25': GX(146.9, 70.5, 7.2, 6.2, 'alu', 'gx3', 'pv', g25, withBtn(gS25, bB)),
    'galaxy-s25-plus': GX(158.4, 75.8, 7.3, 6.7, 'alu', 'gx3', 'pv', g25, withBtn(gS25, bP)),
    'galaxy-s25-ultra': GX(162.8, 77.6, 8.2, 6.9, 'ti', 'gxu', 'pvs', g25u, withBtn(gU25, bU)),
    'galaxy-s26': GX(149.6, 71.7, 7.2, 6.3, 'alu', 'gxp', 'pv', g26, withBtn(gS26, bB)),
    'galaxy-s26-plus': GX(158.4, 75.8, 7.3, 6.7, 'alu', 'gxp', 'pv', g26, withBtn(gS26, bP)),
    'galaxy-s26-ultra': GX(163.6, 78.1, 7.9, 6.9, 'alu', 'gxu', 'pvs', g26, withBtn(gU26, bU)),
    'galaxy-s23': GX(146.3, 70.9, 7.6, 6.1, 'alu', 'gx3', 'pv', g23, withBtn(gS23, bB)),
    'galaxy-s23-plus': GX(157.8, 76.2, 7.6, 6.6, 'alu', 'gx3', 'pv', g23, withBtn(gS23, bP)),
    'galaxy-s23-ultra': GX(163.4, 78.1, 8.9, 6.8, 'alu', 'gxu', 'pvs', g23, withBtn(gU23, bU)),
    'galaxy-a56': GX(162.2, 77.5, 7.4, 6.7, 'alu', 'gxp', 'pv', gA56, withBtn(gA56s, bP)),
    'galaxy-a55': GX(161.1, 77.4, 8.2, 6.6, 'alu', 'gx3', 'pv', gA55, withBtn(gA5, bP)),
    'galaxy-a26': GX(164, 77.5, 7.7, 6.7, 'alu', 'gxp', 'pv', gA26, withBtn(gA26s, bP)),
    'galaxy-a16': GX(164.4, 77.9, 7.9, 6.7, 'alu', 'gx3', 'pv', gA16, withBtn(gA16s, bP)),
    'iphone-13': P(146.7, 71.5, 7.65, 6.1, 'alu', 'glossy', 'diag', 'sw', c13),
    'iphone-13-pro': P(146.7, 71.5, 7.65, 6.1, 'steel', 'frost', 'tri', 'sw', c13p),
    'iphone-13-pro-max': P(160.8, 78.1, 7.65, 6.7, 'steel', 'frost', 'tri', 'sw', c13p),
    'iphone-14': P(146.7, 71.5, 7.8, 6.1, 'alu', 'glossy', 'diag', 'sw', c14),
    'iphone-14-plus': P(160.8, 78.1, 7.8, 6.7, 'alu', 'glossy', 'diag', 'sw', c14),
    'iphone-14-pro': P(147.5, 71.5, 7.85, 6.1, 'steel', 'frost', 'tri', 'sw', c14p),
    'iphone-14-pro-max': P(160.7, 77.6, 7.85, 6.7, 'steel', 'frost', 'tri', 'sw', c14p),
    'iphone-15': P(147.6, 71.6, 7.8, 6.1, 'alu', 'matte', 'diag', 'sw', c15),
    'iphone-15-plus': P(160.9, 77.8, 7.8, 6.7, 'alu', 'matte', 'diag', 'sw', c15),
    'iphone-15-pro': P(146.6, 70.6, 8.25, 6.1, 'ti', 'frost', 'tri', 'act', c15p),
    'iphone-15-pro-max': P(159.9, 76.7, 8.25, 6.7, 'ti', 'frost', 'tri', 'act', c15p),
    'iphone-16': P(147.6, 71.6, 7.8, 6.1, 'alu', 'matte', 'pill', 'actcc', c16),
    'iphone-16-plus': P(160.9, 77.8, 7.8, 6.7, 'alu', 'matte', 'pill', 'actcc', c16),
    'iphone-16-pro': P(149.6, 71.5, 8.25, 6.3, 'ti', 'frost', 'tri', 'actcc', c16p),
    'iphone-16-pro-max': P(163.0, 77.6, 8.25, 6.9, 'ti', 'frost', 'tri', 'actcc', c16p),
    'iphone-17': P(149.6, 71.5, 7.95, 6.3, 'alu', 'matte', 'pill', 'actcc', c17),
    'iphone-17-air': P(156.2, 74.7, 5.64, 6.5, 'ti', 'matte', 'air', 'actcc', cAir),
    'iphone-17-pro': P(150.0, 71.9, 8.75, 6.3, 'uni', 'frost', 'triwide', 'actcc', c17p),
    'iphone-17-pro-max': P(163.4, 78.0, 8.75, 6.9, 'uni', 'frost', 'triwide', 'actcc', c17p),
    'iphone-18-pro': P(150.0, 71.9, 8.75, 6.3, 'uni', 'frost', 'triwide', 'actcc', c18p),
    'iphone-18-pro-max': P(163.4, 78.0, 8.75, 6.9, 'uni', 'frost', 'triwide', 'actcc', c18p)
  };
})();
