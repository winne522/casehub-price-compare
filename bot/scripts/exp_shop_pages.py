# -*- coding: utf-8 -*-
"""ทดลองแบบ A: เปิด "หน้าร้าน" 1 หน้า แล้วอ่านราคา/รูปของสินค้าทุกชิ้นบนการ์ด แทนเปิดหน้าสินค้าทีละชิ้น
ใช้ Bot.goto ของ bot.py (delay/พักยาว/guard เดิมทุกอย่าง) · ไม่แก้ catalog — เขียนผลลง data/exp_shop_cards.json
เติมรูปอุปกรณ์เสริมที่เจอบนการ์ดลง assets/accessories.js (ถ้าไม่ใส่ --dry)
ใช้: python scripts/exp_shop_pages.py [--acc 8] [--case 7] [--click 0] [--dry]
--pages N = เปิดหน้าถัดไปของร้าน (สูงสุด N หน้า/ร้าน) จนกว่าจะเจอของที่ต้องการครบหรือไม่มีการ์ดใหม่
ผลทดลอง 2026-11-10: หน้าร้านไม่โดน verify (15 หน้า) ได้รูป 2.5 ชิ้น/หน้า · ราคาการ์ดเชื่อไม่ได้ (ราคาล่อ) · แบบ B โดน verify ตั้งแต่คลิกแรก — เลิกใช้
--click N = ทดลองแบบ B (เลิกใช้): ในแต่ละหน้าร้าน คลิกการ์ดสินค้าที่ต้องการ N ชิ้น (เข้าแบบคลิก ไม่ goto) แล้วย้อนกลับ"""
import argparse, io, json, random, re, sys, time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "bot"))
import bot as B
import guard
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--acc", type=int, default=8); ap.add_argument("--case", type=int, default=7)
ap.add_argument("--click", type=int, default=0); ap.add_argument("--dry", action="store_true")
ap.add_argument("--pages", type=int, default=1); ap.add_argument("--force", action="store_true")
a = ap.parse_args()
WHO = "exp_shop_pages" + ("+click" if a.click else "")
OUT = ROOT / "bot" / "data" / ("exp_shop_click.json" if a.click else "exp_shop_cards.json")
ACC = ROOT / "assets" / "accessories.js"


def log(*x): print(time.strftime("%H:%M:%S"), *x, flush=True)


def pending_acc():
    urls = json.loads((ROOT / "data" / "acc-urls.json").read_text(encoding="utf-8"))
    t = ACC.read_text(encoding="utf-8")
    want = {}
    for i in re.findall(r"id: ['\"](\d+)['\"][^}]*?img: ''", t):
        m = re.search(r"/product/(\d+)/(\d+)", urls.get(i, ""))
        if m: want.setdefault(m.group(1), {})[m.group(2)] = i
    return want  # shop -> {itemid: acc id}


def save_img(i, name):
    t = ACC.read_text(encoding="utf-8")
    t2 = re.sub(r"(id: ['\"]%s['\"][^}]*?img: ')(')" % i, lambda m: m.group(1) + name + m.group(2), t, count=1)
    if t2 != t: ACC.write_text(t2, encoding="utf-8")


why = guard.why_not(a.force)
if why: print("ไม่เริ่ม:", why); sys.exit(3)
guard.acquire(WHO)
cfg = B.load_config(B.BASE_DIR / "config.json")
done = set(json.loads(OUT.read_text(encoding="utf-8")).get("shops", {})) if OUT.exists() else set()
acc = pending_acc()
catalog = B.load_json(B.CATALOG_FILE, {})
case = {}
for k, v in catalog.items():
    if v.get("affiliate_link"): case.setdefault(k.split("_")[0], {})[k.split("_")[1]] = v
plan = [("acc", s) for s, _ in Counter({s: len(v) for s, v in acc.items() if s not in done}).most_common(a.acc)]
plan += [("case", s) for s, _ in Counter({s: len(v) for s, v in case.items() if s not in done}).most_common(a.case)]
cfg["max_page_loads_per_run"] = len(plan) * (a.pages + a.click)  # แบบคลิก: นับการคลิกเข้าสินค้าเป็น 1 หน้าด้วย
res = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"shops": {}, "runs": []}
run = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "who": WHO, "status": "ok", "pages": 0}
B.ensure_chrome(cfg)

with sync_playwright() as p:
    ctx = B.launch(p, cfg, headless=False)
    b = B.Bot(cfg, ctx, False, {})
    try:
        for kind, shop in plan:
            want = acc[shop] if kind == "acc" else case[shop]
            items = {}; n_api = 0; n_pages = 0
            for pgno in range(a.pages):
                before = len(items)
                b.goto("https://shopee.co.th/shop/%s/search" % shop + ("?page=%d" % pgno if pgno else ""))
                n_pages += 1
                for _, data in b.payloads():
                    for it in B.find_items(cfg, data): items.setdefault(str(it["itemid"]), it)
                n_api = len(items) - before
                for it in b.dom_items(): items.setdefault(str(it["itemid"]), it)
                if len(items) == before or all(i in items for i in want): break  # ไม่มีการ์ดใหม่ / เจอครบแล้ว
            hit = {i: items[i] for i in want if i in items}
            row = {"kind": kind, "want": len(want), "found_on_page": len(items), "from_api": n_api, "hit": len(hit), "pages": n_pages,
                   "url_after": b.page.url[:90], "items": {}}
            for i, it in hit.items():
                r = {"card_price": it["price"], "card_price_max": it.get("price_max"), "has_image": bool(it.get("image")), "source": it["source"]}
                if kind == "case":
                    r["catalog_price"] = want[i].get("price"); r["catalog_bait_price"] = want[i].get("bait_price")
                elif it.get("image") and not a.dry:
                    m = re.search(r"susercontent\.com/(?:file/)?([^?\s@_]+(?:_tn)?)", it["image"])
                    if m: save_img(want[i], "file/" + m.group(1).replace("_tn", "")); r["saved_image"] = m.group(1)
                row["items"][i] = r
            log("ร้าน %s (%s): ต้องการ %d · เปิด %d หน้า · การ์ด %d · ตรง %d" % (shop, kind, len(want), n_pages, len(items), len(hit)))
            # ---- แบบ B: คลิกการ์ดเข้าสินค้า (ไม่ goto) แล้วย้อนกลับ
            clicks = []
            for i in list(hit)[: a.click]:
                time.sleep(random.uniform(*cfg["delay_seconds"]))  # เว้นเท่ากับการเปิดหน้าปกติ
                link = b.page.locator('a[href*="-i.%s.%s"], a[href*="/product/%s/%s"]' % (shop, i, shop, i)).first
                if not link.count(): clicks.append({"item": i, "result": "no_card_link"}); continue
                b.responses = []; b.loads += 1; guard.note_page(WHO)
                link.scroll_into_view_if_needed(); b.page.wait_for_timeout(random.randint(600, 1200)); link.click()
                b.page.wait_for_timeout(int(cfg.get("settle_ms", 2500)))
                for _ in range(int(cfg.get("scroll_steps", 4))):
                    b.page.mouse.wheel(0, random.randint(900, 1500)); b.page.wait_for_timeout(random.randint(700, 1300))
                if b._block_kind(): raise B.Blocked(b._block_kind(), b.page.url)
                got = [x for _, d in b.payloads() for x in B.find_items(cfg, d) if str(x["itemid"]) == i]
                best = max(got, key=lambda x: (x.get("case_price") is not None, x.get("price_max") or 0), default=None)
                clicks.append({"item": i, "result": "ok" if best else "no_data", "price": best and best["price"],
                               "case_price": best and best.get("case_price"), "url": b.page.url[:80]})
                log("  คลิกเข้า %s: %s" % (i, clicks[-1]["result"]))
                b.page.go_back(wait_until="domcontentloaded"); b.page.wait_for_timeout(2000)
            if clicks: row["clicks"] = clicks
            res["shops"][shop] = row
    except B.Blocked as e:
        run.update(status="blocked_" + e.kind, blocked_url=e.url[:120]); guard.note_block(WHO, b.loads, e.kind)
        log("!!! โดนบล็อก (%s) หลัง %d หน้า — หยุด ไม่ลองซ้ำ" % (e.kind, b.loads))
    except B.BudgetUsed:
        log("ครบงบหน้า")
    finally:
        run["pages"] = b.loads; run["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
        res["runs"].append(run)
        OUT.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
        try:
            if not run["status"].startswith("blocked"): b.page.close()
        except Exception: pass

rows = [r for s, r in res["shops"].items() if s in dict((s2, k) for k, s2 in plan)]
log("สรุป: %s · หน้า %d · ร้าน %d · ต้องการ %d ชิ้น · ได้จากการ์ด %d ชิ้น" % (
    run["status"], run["pages"], len(rows), sum(r["want"] for r in rows), sum(r["hit"] for r in rows)))
