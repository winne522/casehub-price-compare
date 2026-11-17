"""นำเข้าเคสที่ดึงจากหน้าร้าน (scripts/scrape_shop_cases.py) + ลิงก์ affiliate ที่สร้างแล้ว เข้า catalog / affiliate_links.csv / products.json
ใช้: python import_shop_picks.py [data/shop_picks/cases_20261113.csv]
รูป/ราคา/ยอดขายมาจากการ์ดหน้าร้าน (ราคาการ์ดอาจเป็นราคาล่อ → ตั้ง stale ให้บอทเช็กหน้าสินค้าอีกรอบ) · ไม่เปิด Shopee · รันซ้ำได้"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import bot
from import_links import AFF_HEADER

SHOP_NAME = {"1188867011": "Wishwindy", "1382380664": "CaseClub"}


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else bot.DATA_DIR / "shop_picks" / "cases_20261113.csv"
    cfg = bot.load_config(bot.BASE_DIR / "config.json")
    with open(src, encoding="utf-8-sig", newline="") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("affiliate_link") or "").startswith("http")]
    picks = {}
    for sid in {r["shop"] for r in rows}:
        picks.update(json.loads((bot.DATA_DIR / "shop_picks" / f"{sid}.json").read_text(encoding="utf-8")))
    stamp = bot.now().strftime("%Y-%m-%d %H:%M")

    aff_rows, _ = bot.load_affiliates()
    index = {bot.url_key(r.get("product_url") or ""): r for r in aff_rows}
    feed = bot.load_json(bot.FEED_FILE, {})
    catalog = bot.load_json(bot.CATALOG_FILE, {})
    n_aff = n_new = n_noimg = 0
    for r in rows:
        key = bot.url_key(r["product_url"])
        sid, iid = key.split("_")
        card = picks.get(iid) or {}
        a = index.get(key)
        if a is None:
            aff_rows.append({"product_url": r["product_url"], "affiliate_link": r["affiliate_link"], "name": r["name"], "model": ""}); n_aff += 1
        elif not (a.get("affiliate_link") or "").strip():
            a["affiliate_link"] = r["affiliate_link"]; n_aff += 1
        price = float(r["price_card"]) if r.get("price_card") else None
        sold = int(float(r["sold"])) if r.get("sold") else None
        shop = SHOP_NAME.get(sid, "")
        feed[key] = feed.get(key, {}) | {"name": r["name"], "price": price, "sold": sold, "shop": shop, "url": r["product_url"],
                                          "added": feed.get(key, {}).get("added", stamp)}
        old = catalog.get(key)
        if old:
            old.update(shop=shop, feed_price=price)
            if not old.get("image") and card.get("image"): old["image"] = card["image"]
            continue
        it = bot.make_item(cfg, sid, iid, name=r["name"], image=card.get("image") or "", price=price, sold=sold,
                           discount_pct=card.get("discount_pct") or 0, curated=True, source="shop_page", shop=shop,
                           feed_price=price, price_checked_at=stamp, stale=True, voucher_checked=True)
        catalog[key] = it; n_new += 1
        if not it["image"]: n_noimg += 1
    with open(bot.AFF_FILE, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=AFF_HEADER, extrasaction="ignore"); w.writeheader(); w.writerows(aff_rows)
    bot.write_json(bot.FEED_FILE, feed); bot.write_json(bot.CATALOG_FILE, catalog)
    print(f"affiliate_links.csv +{n_aff} · catalog ใหม่ {n_new} (ไม่มีรูป {n_noimg}) · feed {len(feed)}")

    last_run = bot.DATA_DIR / "last_run.json"
    prev = last_run.read_text(encoding="utf-8") if last_run.exists() else None
    aff_rows, aff_map = bot.load_affiliates()
    status = {"started": stamp, "status": "feed_import", "message": "นำเข้าเคสจากหน้าร้าน", "mode": "import"}
    bot.finalize(cfg, {}, aff_rows, aff_map, bot.load_json(bot.STATE_FILE, {}), status)
    if prev is not None: last_run.write_text(prev, encoding="utf-8")
    n = len(json.loads((bot.DATA_DIR / "products.json").read_text(encoding="utf-8"))["products"])
    print("สร้าง data/products.json แล้ว:", n, "ชิ้น")
    return 0


if __name__ == "__main__":
    sys.exit(main())
