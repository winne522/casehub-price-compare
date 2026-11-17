/* แถบเมนูล่างแบบแอป (มือถือ < 760px) — ผู้ใช้เลือกแบบ D 2026-11-14 (docs/feed-placement.html)
   5 ปุ่ม: หน้าแรก · อันดับ · ▶ ไถดู (ปุ่มใหญ่กลาง) · ลองทาบ · ที่เก็บ — ใส่ทุกหน้าโดยโหลดไฟล์นี้ต่อจาก track.js
   หาโฟลเดอร์รากจาก src ของสคริปต์นี้เอง จึงใช้ได้ทั้ง index.html, pages/*.html, pages/m/*, pages/p/*
   สไตล์อยู่ในไฟล์นี้ทั้งหมด (ไม่แตะ site.css) · หน้าไถดู (body[data-page=feed]) ใช้แบบพื้นมืด */
(function () {
  var me = document.currentScript, root;
  try { root = new URL('..', me.src).href; } catch (e) { return; }
  if (document.getElementById('tbar')) return;
  var path = location.pathname.replace(/\/+$/, '/');
  var feed = document.body.getAttribute('data-page') === 'feed';
  var I = {
    home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
    rank: '<path d="M5 20V12M12 20V5M19 20v-5"/>',
    play: '<path d="M9 6.5v11l9-5.5z" fill="currentColor" stroke="none"/>',
    phone: '<rect x="7" y="3.5" width="10" height="17" rx="2.5"/><circle cx="10.2" cy="7.3" r="1.3"/>',
    heart: '<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z"/>'
  };
  var T = [
    ['index.html', 'หน้าแรก', 'home', /\/(index\.html)?$/],
    ['pages/ranking.html', 'อันดับ', 'rank', /\/pages\/(ranking|models|model)\.html$|\/pages\/m\//],
    ['pages/feed.html', 'ไถดู', 'play', /\/pages\/feed\.html$/],
    ['pages/tryon.html', 'ลองทาบ', 'phone', /\/pages\/tryon\.html$/],
    ['pages/saved.html', 'ที่เก็บ', 'heart', /\/pages\/saved\.html$/]
  ];
  var css = '#tbar{display:none}' +
    '@media(max-width:759px){' +
    '#tbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:50;height:calc(58px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);' +
    'background:#fff;border-top:1px solid #E4E0D6;align-items:stretch;justify-content:space-around;font:500 10.5px/1.2 inherit}' +
    '#tbar a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#7A776F;text-decoration:none;min-width:0}' +
    '#tbar svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '#tbar a.on{color:var(--ink,#17181C);font-weight:700}' +
    '#tbar a.mid{flex:0 0 74px;position:relative}' +
    '#tbar a.mid i{display:grid;place-items:center;width:50px;height:50px;margin-top:-24px;border-radius:50%;background:#B8172F;color:#fff;border:4px solid #fff;box-shadow:0 4px 12px rgba(184,23,47,.35)}' +
    '#tbar a.mid i svg{width:22px;height:22px;margin-left:2px}' +
    '#tbar a.mid.on{color:#B8172F}' +
    'body.has-tbar{padding-bottom:calc(58px + env(safe-area-inset-bottom))}' +
    '#tbar.dark{background:#121212;border-top-color:#2A2A2A}#tbar.dark a{color:#9A9A9A}#tbar.dark a.on{color:#fff}#tbar.dark a.mid i{border-color:#121212}' +
    '}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var nav = document.createElement('nav');
  nav.id = 'tbar'; nav.setAttribute('aria-label', 'เมนูหลัก');
  if (feed) nav.className = 'dark';
  nav.innerHTML = T.map(function (t) {
    var on = t[3].test(path), svg = '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[t[2]] + '</svg>';
    return '<a href="' + root + t[0] + '" class="' + (t[2] === 'play' ? 'mid' : '') + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' +
      (t[2] === 'play' ? '<i>' + svg + '</i>' : svg) + '<span>' + t[1] + '</span></a>';
  }).join('');
  document.body.appendChild(nav);
  document.body.classList.add('has-tbar');
})();
