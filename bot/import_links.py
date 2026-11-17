"""นำเข้าไฟล์ CSV "ลิงก์สินค้าหลายลิงก์" จากพอร์ทัล Shopee Affiliate (วางไว้ในโฟลเดอร์ feed)

ทำสามอย่าง: ใส่ลิงก์ affiliate ลง affiliate_links.csv / จดสินค้าไว้ใน data/feed_catalog.json ให้บอทวนเช็กราคา+โค้ดร้าน /
สร้าง data/products.json ใหม่ทันที (ยังไม่มีรูป จนกว่าบอทจะเปิดหน้าสินค้านั้น) ไม่ได้เปิด Shopee เลย
รันซ้ำได้ ไฟล์ใหม่จะเพิ่ม/อัปเดตต่อจากของเดิม
"""
from __future__ import annotations

import csv
import logging
import re
import sys
from pathlib import Path

import bot

FEED_DIR = bot.BASE_DIR / "feed"
AFF_HEADER = ["product_url", "affiliate_link", "name", "model"]


def num(text):
    """"200พัน+" -> 200000, "1.4พัน" -> 1400, "฿2.79" -> 2.79, "9%" -> 9"""
    m = re.search(r"([\d,]*\.?\d+)\s*(พัน|หมื่น|แสน|ล้าน)?", text or "")
    if not m:
        return None
    return float(m.group(1).replace(",", "")) * bot.THAI_MULT.get(m.group(2) or "", 1)


def read_feed_files(files: list[Path], excludes) -> tuple[dict, dict]:
    entries: dict[str, dict] = {}
    skipped = {"ข้อมูลไม่ครบ": [], "ตรงคำที่ตัดออก": []}
    for path in files:
        with open(path, encoding="utf-8-sig", errors="replace", newline="") as f:
            for r in csv.DictReader(f):
                name = (r.get("ชื่อสินค้า") or "").strip()
                link = (r.get("ลิงก์ข้อเสนอ") or "").strip()
                key = bot.url_key(r.get("ลิงก์สินค้า") or "")
                price = num(r.get("ราคา"))
                if not (key and name and link.startswith("http") and price):
                    skipped["ข้อมูลไม่ครบ"].append(name[:50] or path.name)
                    continue
                if any(p.search(name) for p in excludes):
                    skipped["ตรงคำที่ตัดออก"].append(name[:50])
                    continue
                sold = num(r.get("ขาย"))
                entries[key] = {
                    "name": name, "price": round(price, 2), "sold": int(sold) if sold else None,
                    "shop": (r.get("ชื่อร้านค้า") or "").strip(), "commission_pct": num(r.get("อัตราค่าคอมมิชชัน")),
                    "url": (r.get("ลิงก์สินค้า") or "").strip(), "link": link,
                }
    return entries, skipped


def write_affiliate_csv(entries: dict) -> tuple[int, int]:
    rows, _ = bot.load_affiliates()
    index = {bot.url_key(r.get("product_url") or ""): r for r in rows}
    added = filled = 0
    for key, e in entries.items():
        r = index.get(key)
        if r is None:
            r = {"product_url": e["url"], "affiliate_link": e["link"], "name": e["name"], "model": ""}
            rows.append(r)
            index[key] = r
            added += 1
        elif not (r.get("affiliate_link") or "").strip():
            r["affiliate_link"] = e["link"]  # ลิงก์ที่คุณกรอกเองไว้แล้วไม่ถูกเขียนทับ
            filled += 1
    with open(bot.AFF_FILE, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=AFF_HEADER, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    return added, filled


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    cfg = bot.load_config(bot.BASE_DIR / "config.json")
    FEED_DIR.mkdir(exist_ok=True)
    files = sorted(FEED_DIR.glob("*.csv"))
    if not files:
        print(f"ไม่พบไฟล์ .csv ในโฟลเดอร์ {FEED_DIR} - วางไฟล์ลิงก์สินค้าจากพอร์ทัลไว้ที่นั่นก่อน")
        return 1

    excludes = bot.compile_excludes(list(cfg["exclude_words"]) + list(cfg["feed_exclude_words"]))
    entries, skipped = read_feed_files(files, excludes)
    print(f"อ่าน {len(files)} ไฟล์: ใช้ได้ {len(entries)} ชิ้น")
    for why, names in skipped.items():
        if names:
            print(f"  ข้าม {len(names)} ชิ้น ({why}) เช่น: " + " | ".join(names[:3]))
    if not entries:
        return 1

    try:
        added, filled = write_affiliate_csv(entries)
    except PermissionError:
        print("เขียน affiliate_links.csv ไม่ได้ - ปิดไฟล์ใน Excel ก่อนแล้วรันใหม่")
        return 1
    print(f"affiliate_links.csv: เพิ่มแถวใหม่ {added} · เติมลิงก์ในแถวเดิม {filled}")

    stamp = bot.now().strftime("%Y-%m-%d %H:%M")
    bot.DATA_DIR.mkdir(exist_ok=True)
    feed = bot.load_json(bot.FEED_FILE, {})
    catalog = bot.load_json(bot.CATALOG_FILE, {})
    seeded = 0
    for key, e in entries.items():
        feed[key] = {k: v for k, v in e.items() if k != "link"} | {"added": feed.get(key, {}).get("added", stamp)}
        old = catalog.get(key)
        if old:
            old.update(shop=e["shop"], commission_pct=e["commission_pct"], feed_price=e["price"])
            continue
        sid, iid = key.split("_")
        catalog[key] = bot.make_item(
            cfg, sid, iid, name=e["name"], price=e["price"], sold=e["sold"],
            curated=True, source="feed", shop=e["shop"], commission_pct=e["commission_pct"], feed_price=e["price"],
            price_checked_at=stamp, stale=True, voucher_checked=True)
        seeded += 1
    bot.write_json(bot.FEED_FILE, feed)
    bot.write_json(bot.CATALOG_FILE, catalog)
    print(f"feed_catalog.json: {len(feed)} ชิ้น (ใหม่ในแคตตาล็อก {seeded})")

    # สร้าง products.json ใหม่จากแคตตาล็อก (ไม่เปิด Shopee) แล้วคืนค่า last_run.json เดิม
    last_run = bot.DATA_DIR / "last_run.json"
    prev = last_run.read_text(encoding="utf-8") if last_run.exists() else None
    aff_rows, aff_map = bot.load_affiliates()
    status = {"started": stamp, "status": "feed_import", "message": "นำเข้าจาก CSV", "mode": "import"}
    bot.finalize(cfg, {}, aff_rows, aff_map, bot.load_json(bot.STATE_FILE, {}), status)
    if prev is not None:
        last_run.write_text(prev, encoding="utf-8")
    print("สร้าง data/products.json แล้ว")
    return 0


if __name__ == "__main__":
    sys.exit(main())
