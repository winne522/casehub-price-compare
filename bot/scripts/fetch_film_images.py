# -*- coding: utf-8 -*-
"""ดึงรูปสินค้าอุปกรณ์เสริมทุกหมวด (assets/accessories.js ที่ img: '') จากหน้าสินค้า Shopee — ใช้ Chrome ของบอท (พอร์ต 9222) ที่ล็อกอินอยู่
URL สินค้าอยู่ใน data/acc-urls.json · เปิดหน้าแรก Shopee ก่อน แล้วเปิดสินค้าทีละชิ้น เว้น 25–45 วินาที (เร็วกว่านี้โดน verify — ดู bot/BOT_LOG.md) · ถ้าเจอหน้า verify จะ "หยุดรอให้คนกดยืนยันเอง"
(สคริปต์ไม่กดแทน ไม่ปลอมตัว) · จบรอบถ้าเกินจำนวนที่กำหนด หรือรอ verify เกิน 10 นาที
ใช้: bot\.venv\Scripts\python.exe bot\scripts\fetch_film_images.py [--max 8]"""
import argparse, json, random, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ACC = ROOT / "assets" / "accessories.js"
URLS = json.loads((ROOT / "data" / "acc-urls.json").read_text(encoding="utf-8"))
sys.path.insert(0, str(ROOT / "bot"))
import guard  # cooldown / งบหน้าต่อวัน / lock ร่วมกับ bot.py
ap = argparse.ArgumentParser(); ap.add_argument("--max", type=int, default=8)
ap.add_argument("--round", type=int, default=15, help="ปิดแท็บแล้วเปิดใหม่ทุกกี่ชิ้น (เหมือนรอบของ bot.py)")
ap.add_argument("--delay", type=float, default=0, help="เว้นต่อชิ้น (วินาที, สุ่ม -15%%/+25%%) · 0 = ค่าเดิม 40-70 วิ")
ap.add_argument("--verify-wait", type=float, default=5, help="รอคนกด verify กี่นาที")
ap.add_argument("--stop-after-verify", action="store_true", help="จำลอง: เจอ verify แล้ว (คนกดผ่าน) ให้จบรอบ")
ap.add_argument("--rest-every", type=int, default=5, help="พักยาวทุกกี่ชิ้น (0 = ไม่พัก)")
ap.add_argument("--todo-cases", action="store_true", help="เก็บรูปแถว cat=case ใน bot/acc_todo.csv → data/acc-case-images.json (ยังไม่จับคู่รุ่น)")
ap.add_argument("--force", action="store_true"); a = ap.parse_args()
CASEIMG = ROOT / "data" / "acc-case-images.json"  # {id: ชื่อรูป susercontent} ของแถว case ใน acc_todo.csv
if a.todo_cases:
    import csv
    with open(ROOT / "bot" / "acc_todo.csv", encoding="utf-8-sig", newline="") as f:
        URLS = {r["id"]: r["url"] for r in csv.DictReader(f) if r["cat"] == "case" and r["url"]}
import builtins
def print(*x, **k): builtins.print(time.strftime("%H:%M:%S"), *x, **k)
NOIMG = ROOT / "bot" / "data" / "acc-noimg.json"  # ชิ้นที่เปิดหน้าแล้วไม่มีรูป — ไม่เปิดซ้ำทุกรอบ
noimg = set(json.loads(NOIMG.read_text(encoding="utf-8"))) if NOIMG.exists() else set()
WHO = "fetch_film_images"
why = guard.why_not(a.force)
if why: print("ไม่เริ่ม:", why); sys.exit(3)
guard.acquire(WHO)

def case_imgs(): return json.loads(CASEIMG.read_text(encoding="utf-8")) if CASEIMG.exists() else {}

def pending():
    if a.todo_cases:
        have = case_imgs()
        return [i for i in URLS if i not in have and i not in noimg]
    t = ACC.read_text(encoding="utf-8")
    return [i for i in re.findall(r"id: ['\"](\d+)['\"][^}]*?img: ''", t) if i in URLS and i not in noimg]

def save(i, name):
    if a.todo_cases:
        d = case_imgs(); d[i] = name
        CASEIMG.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8"); return
    t = ACC.read_text(encoding="utf-8")
    t2 = re.sub(r"(id: ['\"]%s['\"][^}]*?img: ')(')" % i, lambda m: m.group(1) + name + m.group(2), t, count=1)
    if t2 != t: ACC.write_text(t2, encoding="utf-8")

def verifying(pg): return "/verify/" in pg.url

def go(pg, url):
    """โหลดหน้าไม่ทันใน 30 วิ (เน็ต/หน้าค้าง) ให้ลองใหม่ 1 ครั้ง แทนที่จะล้มทั้งรอบ"""
    for k in range(2):
        try: return pg.goto(url, wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            if "Timeout" not in str(e) or k: raise
            print("SIM_TIMEOUT โหลดไม่ทัน ลองใหม่ใน 30 วิ", flush=True); time.sleep(30)

def cert(ctx):
    try:
        c = {c["name"]: c for c in ctx.cookies("https://shopee.co.th/")}.get("AC_CERT_D")
        return "ไม่มี" if not c else time.strftime("%m-%d %H:%M", time.localtime(c["expires"])) if c.get("expires", -1) > 0 else "session"
    except Exception as e: return "อ่านไม่ได้ %s" % e

def wait_verify(pg, ctx, n, where):
    """คืน 'ok' = คนกดผ่าน, 'stop' = หมดเวลา"""
    print("SIM_VERIFY %s หน้าที่ %d ของรอบนี้ · AC_CERT_D %s · กดยืนยันเอง (รอสูงสุด %g นาที ไม่รีเฟรช)" % (where, n, cert(ctx), a.verify_wait), flush=True)
    end = time.time() + a.verify_wait * 60
    while verifying(pg) and time.time() < end: pg.wait_for_timeout(3000)
    if verifying(pg):
        print("หมดเวลารอ verify — หยุด", flush=True); guard.note_block(WHO, n); return "stop"
    print("SIM_SOLVED กดผ่านแล้ว · AC_CERT_D ใหม่ %s" % cert(ctx), flush=True)
    return "ok"

todo = pending()[: a.max]
print("ค้างรูป %d ชิ้น · รอบนี้ทำ %d" % (len(pending()), len(todo)))
import bot  # ใช้ ensure_chrome ตัวเดียวกับบอทหลัก — เปิด Chrome ของบอทเองถ้ายังไม่เปิด (เดิมต่อพอร์ต 9222 ตรง ๆ แล้วพัง ECONNREFUSED)
_cfg = bot.load_config(ROOT / "bot" / "config.json")
bot.ensure_chrome(_cfg)
with sync_playwright() as p:
    ctx = p.chromium.connect_over_cdp("http://127.0.0.1:%d" % int(_cfg["attach_port"])).contexts[0]
    pg = None; blocked = False; sim_hit = False
    try:  # จดสถานะคุกกี้ตอนเริ่ม เพื่อพิสูจน์ทฤษฎี captcha ตอนเริ่ม (ดู bot/BOT_THEORIES.md)
        ck = {c["name"]: c for c in ctx.cookies("https://shopee.co.th/")}
        ac = ck.get("AC_CERT_D"); exp = ac and ac.get("expires", -1)
        print("คุกกี้ตอนเริ่ม: session[%s] · AC_CERT_D %s" % (
            ",".join(n for n in ("sense_sa_r", "_sapid", "SPC_IA", "csrftoken") if n in ck) or "ไม่มี",
            "ไม่มี" if not ac else ("หมดอายุ " + time.strftime("%m-%d %H:%M", time.localtime(exp)) if exp and exp > 0 else "session")), flush=True)
    except Exception as e: print("อ่านคุกกี้ไม่ได้:", e, flush=True)
    for n, i in enumerate(todo):
        if n % a.round == 0:  # รอบใหม่: ปิดแท็บเดิม เปิดแท็บใหม่ เข้าหน้าแรกก่อน (ทดสอบว่า session ยาวในแท็บเดียวคือสาเหตุไหม)
            old, pg = pg, ctx.new_page()  # เปิดแท็บใหม่ก่อนปิดแท็บเก่า — ถ้าปิดแท็บสุดท้าย Chrome จะปิดทั้งหน้าต่าง
            if old: old.close(); print("--- จบรอบ %d ชิ้น เปิดแท็บใหม่" % a.round, flush=True)
            pg.goto("https://shopee.co.th/", wait_until="domcontentloaded"); pg.wait_for_timeout(4000)
        if guard.budget() and guard.pages_today() >= guard.budget(): print("ครบงบหน้าต่อวัน %d — หยุด" % guard.budget(), flush=True); break
        if n and a.rest_every and n % a.rest_every == 0:  # พักยาว
            r = random.uniform(150, 240); print('พักยาว %d วินาที' % r, flush=True); time.sleep(r)
        guard.note_page(WHO)
        go(pg, URLS[i])
        if verifying(pg):
            if wait_verify(pg, ctx, n + 1, "ตอนโหลด") == "stop": blocked = True; break
            if a.stop_after_verify and n > 0: sim_hit = True; break  # หน้าแรกของรอบ = ด่านตอนเริ่ม กดผ่านแล้ววัดต่อ
            go(pg, URLS[i])
        pg.wait_for_timeout(2500)
        for _ in range(3):  # เลื่อนหน้าเหมือนคนอ่าน
            pg.mouse.wheel(0, random.randint(900, 1500)); pg.wait_for_timeout(random.randint(700, 1300))
        if verifying(pg):
            if wait_verify(pg, ctx, n + 1, "หลังโหลด") == "stop": blocked = True; break
            if a.stop_after_verify and n > 0: sim_hit = True; break  # หน้าแรกของรอบ = ด่านตอนเริ่ม กดผ่านแล้ววัดต่อ
            go(pg, URLS[i]); pg.wait_for_timeout(2500)
        img = ""
        for _ in range(10):
            pg.wait_for_timeout(1000)
            img = pg.evaluate("()=>(document.querySelector('meta[property=\"og:image\"]')||{}).content||''")
            if img: break
        m = re.search(r"susercontent\.com/([^?\s]+)", img)
        if m: save(i, m.group(1)); print(i, "OK", m.group(1), flush=True)
        else:
            print(i, "ไม่เจอรูป", pg.url[:80], flush=True)
            if not verifying(pg): noimg.add(i); NOIMG.write_text(json.dumps(sorted(noimg)), encoding="utf-8")
        time.sleep(random.uniform(a.delay * 0.85, a.delay * 1.25) if a.delay else random.uniform(40, 70))
    try:
        if pg and not blocked: pg.close()  # ถ้าโดน verify ปล่อยแท็บไว้ให้คนกดยืนยันเอง
    except Exception: pass
print("เหลือค้างรูป", len(pending()))
if blocked and a.stop_after_verify: sys.exit(4)
if sim_hit: sys.exit(10)
if blocked: sys.exit(2)   # 10_collect_images.bat: โดน verify แล้วไม่มีคนกด → ไม่ไปต่อขั้นดึงตัวเลือกสินค้า และไม่ปิด Chrome (ปล่อยแท็บไว้ให้กดเอง)
