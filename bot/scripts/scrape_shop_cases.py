# -*- coding: utf-8 -*-
"""ดึงสินค้าจาก "หน้าร้าน" ที่ผู้ใช้คัดไว้แล้วว่าเคสสวย (ผ่าน Chrome ของบอท, delay/guard เดิมทุกอย่าง)
ใช้: python scripts/scrape_shop_cases.py 1188867011 1382380664 [--pages 3] [--sort sales|pop|ctime] [--force]
ผลต่อร้านเขียนลง data/shop_picks/<shopid>.json ทีละหน้า (โดนบล็อกกลางทางก็ไม่เสียของที่ได้แล้ว)
ไม่แก้ catalog / products.json — ขั้นต่อไปคือสร้างลิงก์ affiliate แล้วค่อยนำเข้า"""
import argparse, json, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "bot"))
import bot as B
import guard
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("shops", nargs="+")
ap.add_argument("--pages", type=int, default=3)
ap.add_argument("--sort", default="sales")
ap.add_argument("--start", type=int, default=0, help="เริ่มที่หน้าที่ (นับจาก 0)")
ap.add_argument("--force", action="store_true")
ap.add_argument("--verify-wait", type=float, default=15, help="รอคนกด verify กี่นาที (ไม่รีเฟรชระหว่างรอ)")
a = ap.parse_args()
WHO = "scrape_shop_cases"
OUT = ROOT / "bot" / "data" / "shop_picks"
OUT.mkdir(exist_ok=True)


def log(*x): print(time.strftime("%H:%M:%S"), *x, flush=True)


why = guard.why_not(a.force)
if why: print("ไม่เริ่ม:", why); sys.exit(3)
guard.acquire(WHO)
cfg = B.load_config(B.BASE_DIR / "config.json")
cfg["max_page_loads_per_run"] = len(a.shops) * a.pages
B.ensure_chrome(cfg)
status = "ok"

with sync_playwright() as p:
    ctx = B.launch(p, cfg, headless=False)
    b = B.Bot(cfg, ctx, False, {})
    try:
        for shop in a.shops:
            f = OUT / ("%s.json" % shop)
            items = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
            for pgno in range(a.start, a.start + a.pages):
                before = len(items)
                q = "?sortBy=%s" % a.sort + ("&page=%d" % pgno if pgno else "")
                url = "https://shopee.co.th/shop/%s/search%s" % (shop, q)
                try:
                    b.goto(url)
                except B.Blocked as e:  # ให้คนกดยืนยันเองในหน้าต่าง Chrome ของบอท แล้วโหลดหน้าเดิมซ้ำ 1 ครั้ง
                    log("เจอ verify — กดยืนยันในหน้าต่าง Chrome ของบอท (รอสูงสุด %g นาที ไม่รีเฟรช)" % a.verify_wait)
                    end = time.time() + a.verify_wait * 60
                    while "verify" in b.page.url and time.time() < end: b.page.wait_for_timeout(3000)
                    if "verify" in b.page.url: raise
                    log("กดผ่านแล้ว — โหลดหน้าร้านต่อ")
                    b.goto(url)
                for _, data in b.payloads():
                    for it in B.find_items(cfg, data): items.setdefault(str(it["itemid"]), it)
                for it in b.dom_items(): items.setdefault(str(it["itemid"]), it)
                f.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
                log("ร้าน %s หน้า %d: รวม %d ชิ้น (+%d)" % (shop, pgno, len(items), len(items) - before))
                if len(items) == before: break
    except B.Blocked as e:
        status = "blocked_" + e.kind
        guard.note_block(WHO, b.loads, e.kind)
        log("!!! โดนบล็อก (%s) หลัง %d หน้า — หยุด ไม่ลองซ้ำ: %s" % (e.kind, b.loads, e.url[:100]))
    except B.BudgetUsed:
        log("ครบงบหน้า")
    log("จบ: %s · %d หน้า" % (status, b.loads))
sys.exit(0 if status == "ok" else 2)
