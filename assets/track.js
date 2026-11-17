/* ตัววัด (เฟส 1): ส่ง view ตอนเปิดหน้า และ buy ตอนกดลิงก์ไป Shopee ไปที่ /t ของเซิร์ฟเวอร์เราเอง (setup/serve.ps1 จดลง setup/track.log)
   ใช้ sendBeacon จึงไม่หน่วงการกด · เปิดไฟล์ตรง ๆ (file://) หรือไม่มี endpoint = เงียบ ไม่มี error · ไม่ส่งข้อมูลส่วนตัว */
(function () {
  if (!/^https?:$/.test(location.protocol) || !navigator.sendBeacon) return;
  var qs = new URLSearchParams(location.search);
  var cut = function (s, n) { return String(s || '').replace(/[^\w.\-:]/g, '').slice(0, n); };
  /* หน้าคงที่: pages/m/<รุ่น>.html → "m:<รุ่น>" · pages/p/<ร้าน_สินค้า>.html → "p" และรหัสสินค้า = ชื่อไฟล์ */
  var parts = location.pathname.split('/'), file = parts.pop().replace(/\.html$/, ''), dir = parts.pop();
  var page = cut(dir === 'm' ? 'm:' + file : dir === 'p' ? 'p' : file, 60) || 'index';
  var pid = cut(qs.get('id') || (dir === 'p' ? file : ''), 60);
  function send(e, extra) {
    var d = { e: e, pg: page, id: pid };
    for (var k in extra) d[k] = extra[k];
    try { navigator.sendBeacon('/t?' + new URLSearchParams(d).toString()); } catch (err) {}
  }
  var ref = '';
  try { if (document.referrer) { var rh = new URL(document.referrer).hostname; ref = rh === location.hostname ? 'self' : cut(rh, 60); } } catch (err) {}
  var src = cut(qs.get('src') || qs.get('utm_source') || (qs.get('fbclid') ? 'fbclid' : ''), 30);
  send('view', { r: ref, s: src });
  /* ลิงก์ไป Shopee: href ที่โฮสต์เป็น shopee.* / shp.ee — รหัสลิงก์ = ท้าย path (โค้ดลิงก์ affiliate หรือ ร้าน_สินค้า) */
  function onClick(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (!/(^|\.)(shopee\.[a-z.]+|shp\.ee)$/i.test(u.hostname)) return;
    var m = u.pathname.match(/\/product\/(\d+)\/(\d+)/) || u.pathname.match(/-i\.(\d+)\.(\d+)/);
    var lk = m ? m[1] + '_' + m[2] : cut(u.pathname.split('/').filter(Boolean).pop(), 60);
    var host = a.closest('[data-id],[data-pid],[data-wish]');
    var id = host ? cut(host.getAttribute('data-id') || host.getAttribute('data-pid') || host.getAttribute('data-wish'), 60) : '';
    send('buy', id ? { l: lk, id: id } : { l: lk });
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', function (ev) { if (ev.button === 1) onClick(ev); }, true);
})();
