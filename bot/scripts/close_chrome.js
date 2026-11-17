// ปิด Chrome ของบอทเมื่องานจบ (ผู้ใช้สั่ง 2026-11-13) — ปิดเฉพาะ Chrome ที่บอทเปิดเอง (พอร์ต debug + โปรไฟล์ของบอท) ไม่แตะ Chrome ปกติของผู้ใช้
//   node close_chrome.js shopee|all     (ไม่ใส่ = all)
//   require('./close_chrome').closeBotChrome(['shopee'])  → คืน [{ lane, port, result }]
// วิธีปิด: สั่ง Browser.close ผ่าน CDP (ปิดแบบปกติ คุกกี้ถูกเขียนลงโปรไฟล์ครบ) · ไม่สำเร็จค่อย taskkill ตัวหลักของ Chrome นั้น
// ก่อนปิดตรวจ command line ว่ามี --remote-debugging-port=<พอร์ต> และ --user-data-dir ของบอทจริง ๆ — พอร์ตที่ไม่ใช่ของบอทจะไม่ถูกปิด
const { spawnSync } = require('child_process');

const LANES = {
  shopee: { port: 9222, profile: 'chrome_profile' }, // bot/bot.py (browser_mode = attach)
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpVersion(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(2500) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// Chrome ตัวหลัก (ไม่มี --type=) ที่เปิดด้วยพอร์ตและโปรไฟล์ของบอท
function botChromePids(port, profile) {
  const ps = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine -notmatch '--type=' -and $_.CommandLine -match '--remote-debugging-port=${port}' -and $_.CommandLine -match '${profile}' } | ForEach-Object { $_.ProcessId }`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  return String(r.stdout || '').split(/\s+/).map(Number).filter(Boolean);
}

function browserClose(wsUrl) {
  return new Promise((resolve) => {
    let done = false;
    const end = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      ws.onclose = () => end(true);
      ws.onerror = () => end(false);
      setTimeout(() => { end(false); try { ws.close(); } catch {} }, 8000);
    } catch { end(false); }
  });
}

async function closeLane(lane) {
  const { port, profile } = LANES[lane];
  const v = await cdpVersion(port);
  if (!v) return { lane, port, result: 'ไม่ได้เปิดอยู่' };
  const pids = botChromePids(port, profile);
  if (!pids.length) return { lane, port, result: `พอร์ต ${port} ไม่ใช่ Chrome ของบอท — ไม่ปิด` };
  await browserClose(v.webSocketDebuggerUrl);
  for (let i = 0; i < 10; i++) { if (!(await cdpVersion(port))) return { lane, port, result: 'ปิดแล้ว' }; await sleep(1000); }
  for (const pid of botChromePids(port, profile)) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
  await sleep(1500);
  return { lane, port, result: (await cdpVersion(port)) ? 'ปิดไม่สำเร็จ' : 'ปิดแล้ว (บังคับ)' };
}

async function closeBotChrome(lanes) {
  const list = (lanes && lanes.length ? lanes : Object.keys(LANES)).filter((l) => LANES[l]);
  const out = [];
  for (const l of list) out.push(await closeLane(l));
  return out;
}

module.exports = { closeBotChrome, LANES };

if (require.main === module) {
  const a = process.argv[2];
  closeBotChrome(!a || a === 'all' ? null : [a]).then((r) => {
    for (const x of r) console.log(`Chrome ของบอท ${x.lane} (พอร์ต ${x.port}): ${x.result}`);
    process.exit(r.some((x) => x.result === 'ปิดไม่สำเร็จ') ? 1 : 0);
  });
}
