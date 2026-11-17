# -*- coding: utf-8 -*-
"""
PhoneCase Bot - ดึงราคาเคสมือถือ + โค้ดส่วนลดร้าน จาก Shopee TH แล้วส่งออกเป็น CSV / JSON

วิธีรัน (ปกติใช้ผ่านไฟล์ .bat):
  python bot.py              รันทันที (ถ้า Shopee ขอยืนยันตัวตน จะรอให้คุณทำเองในหน้าต่างเบราว์เซอร์)
  python bot.py --scheduled  โหมดตั้งเวลา (ถ้าเจอหน้ายืนยันตัวตน จะบันทึกผลที่ได้แล้วหยุดทันที)
  python bot.py --login      เปิดเบราว์เซอร์ให้ล็อกอิน Shopee (ทำครั้งแรกครั้งเดียว)

บอทตั้งใจทำงานช้าและสุภาพ: เปิดทีละหน้า เว้นระยะสุ่ม จำกัดจำนวนหน้าต่อรอบ
และไม่พยายามหลบระบบกันบอทของ Shopee ถ้าโดนขอยืนยันตัวตนจะหยุดเสมอ
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import random
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote_plus

import guard  # cooldown / งบหน้าต่อวัน / lock ร่วมกับสคริปต์อื่น

try:
    from playwright.sync_api import Error as PWError
    from playwright.sync_api import TimeoutError as PWTimeout
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ยังไม่ได้ติดตั้ง Playwright - ดับเบิลคลิก 1_install.bat ก่อน")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent
PROFILE_DIR = BASE_DIR / "browser_profile"
ATTACH_PROFILE = BASE_DIR / "chrome_profile"
DATA_DIR = BASE_DIR / "data"
LOG_DIR = BASE_DIR / "logs"
AFF_FILE = BASE_DIR / "affiliate_links.csv"
NEED_LINKS_FILE = BASE_DIR / "need_affiliate_links.txt"
STATE_FILE = DATA_DIR / "state.json"
CATALOG_FILE = DATA_DIR / "catalog.json"
FEED_FILE = DATA_DIR / "feed_catalog.json"  # สินค้าที่นำเข้าจาก CSV ลิงก์ affiliate (import_links.py)
HISTORY_FILE = DATA_DIR / "price_history.csv"
IMG_CDN = "https://down-th.img.susercontent.com/file/"

DEFAULTS = {
    "base_url": "https://shopee.co.th",
    "searches": [],
    "product_urls": [],
    "search_sort": "relevancy",
    "filters": {"max_price": 199, "min_rating": 4.5, "min_sold": 30},
    "exclude_words": [],
    "check_vouchers_per_run": 20,
    "voucher_max_age_days": 3,
    "delay_seconds": [8, 20],
    "max_page_loads_per_run": 30,
    "settle_ms": 2500,      # รอหลังหน้าโหลดก่อนเริ่มอ่าน (มิลลิวินาที)
    "scroll_steps": 4,      # จำนวนครั้งที่เลื่อนหน้าให้ข้อมูล/รูปโหลดครบ
    "idle_ms": 6000,        # รอให้เครือข่ายนิ่งสูงสุดกี่มิลลิวินาที (Shopee ไม่เคยนิ่งจริง จึงรอเต็มเวลาทุกหน้า)
    "headless": False,
    "browser_channel": "chrome",
    "feed_exclude_words": [],
    "track_per_run": 0,
    "carry_days": 3,
    "browser_mode": "launch",
    "attach_port": 9222,
    "publish_only_with_affiliate_link": True,
}

log = logging.getLogger("phonecase-bot")


class Blocked(Exception):
    """Shopee ขอยืนยันตัวตน / ให้ล็อกอินใหม่ / หน้าเว็บว่างผิดปกติ"""

    def __init__(self, kind: str, url: str):
        super().__init__(kind)
        self.kind = kind
        self.url = url


class BudgetUsed(Exception):
    """เปิดหน้าเว็บครบจำนวนที่ตั้งไว้ต่อรอบแล้ว"""


# --------------------------------------------------------------------------- helpers
def now() -> datetime:
    return datetime.now()


def today_str() -> str:
    return now().strftime("%Y-%m-%d")


def walk(obj):
    """ไล่ทุก dict ที่ซ้อนอยู่ใน JSON ตามลำดับเดิม (สำคัญ: ลำดับผลค้นหาของ Shopee)"""
    stack = [obj]
    while stack:
        o = stack.pop()
        if isinstance(o, dict):
            yield o
            stack.extend(reversed(list(o.values())))
        elif isinstance(o, list):
            stack.extend(reversed(o))


def first(d: dict, *keys):
    for k in keys:
        v = d.get(k)
        if v not in (None, "", -1):
            return v
    return None


def money(v):
    """แปลงราคาเป็นบาท (API ของ Shopee เก็บราคา x100000)"""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, dict):
        for k in ("single_value", "range_min", "value", "price"):
            if k in v:
                return money(v[k])
        return None
    if isinstance(v, str):
        s = re.sub(r"[^\d.]", "", v)
        if not s:
            return None
        try:
            v = float(s)
        except ValueError:
            return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    if v < 0:
        return None
    if v >= 100000:
        v = v / 100000
    return round(v, 2)


def fmt_baht(v) -> str:
    if v is None:
        return ""
    return f"{v:,.0f}" if float(v).is_integer() else f"{v:,.2f}"


THAI_MULT = {"พัน": 1e3, "หมื่น": 1e4, "แสน": 1e5, "ล้าน": 1e6, "k": 1e3, "K": 1e3, "m": 1e6, "M": 1e6}


def parse_sold(text: str):
    m = re.search(r"ขาย(?:ได้|แล้ว)\s*([\d.,]+)\s*(พัน|หมื่น|แสน|ล้าน|k|K|m|M)?", text or "")
    if not m:
        return None
    n = float(m.group(1).replace(",", ""))
    return int(n * THAI_MULT.get(m.group(2) or "", 1))


KEY_RES = [
    re.compile(r"/product/(\d+)/(\d+)"),
    re.compile(r"-i\.(\d+)\.(\d+)"),
    re.compile(r"[/.]i\.(\d+)\.(\d+)"),
]


def url_key(url: str):
    """ดึง shopid_itemid จากลิงก์สินค้า Shopee"""
    for r in KEY_RES:
        m = r.search(url or "")
        if m:
            return f"{m.group(1)}_{m.group(2)}"
    return None


def make_item(cfg: dict, shopid, itemid, **kw) -> dict:
    it = {
        "key": f"{shopid}_{itemid}",
        "shopid": int(shopid),
        "itemid": int(itemid),
        "name": "",
        "url": f"{cfg['base_url']}/product/{shopid}/{itemid}",
        "image": "",
        "model": "",
        "style": "",
        "keyword": "",
        "price": None,
        "price_max": None,
        "case_price": None,      # ราคาตัวเคสจริง (ไม่นับตัวเลือกล่อ/แพ็กหลายชิ้น) จากหน้าสินค้า
        "opt_prices": {},        # {ชื่อตัวเลือกรุ่น: ราคา} เฉพาะเมื่อราคาต่างตามรุ่น
        "bait_options": [],      # ชื่อตัวเลือกล่อที่ตัดทิ้ง
        "price_before_discount": None,
        "discount_pct": 0,
        "rating": None,
        "sold": None,
        "vouchers": [],
        "vouchers_checked_at": "",
        "voucher_checked": False,
        "curated": False,
        "source": "",
    }
    it.update(kw)
    return it


# ---- ราคาแยกตามตัวเลือก (หน้าสินค้า: data.item.models[] + tier_variations) ----
# ร้านมักใส่ตัวเลือกล่อ เช่น "ผ้าเช็ดฟิล์ม ฿3" หรือรุ่นเก่า ฿1 ให้หน้าค้นหาดูถูก และบางร้านราคาต่างตามรุ่นมือถือ
# (เช็กจริง 2026-11-09: Manis Lemon ฿44 ทุกรุ่น ยกเว้น iPhone 18 ฿219) → เก็บราคาตัวเคสจริง + ราคาต่อรุ่น
BAIT_OPT_RE = re.compile(r"ผ้าเช็ด|ฟิล์ม|สติ[๊ก]?เกอร์|sticker|สายคล้อง|สายห้อย|พวงกุญแจ|ของแถม|gift|lanyard|strap|keychain|cloth"
                         r"|ไม่ใช่เคส|ตัวอย่าง|sample", re.I)
PACK_RE = re.compile(r"(\d+)\s*(?:อัน|ชิ้น|pcs|pc|แพ็ค|แพ็ก|pack|ใบ)", re.I)
PHONE_OPT_RE = re.compile(r"iphone|ไอโฟน|galaxy|samsung|\bip\s?\d|(?:^|[^a-z0-9])(?:1[1-8]|s2[3-6]|a\d{2}|xr|xs|se)(?![0-9])", re.I)


def variant_info(d: dict) -> dict:
    models = d.get("models")
    if not isinstance(models, list) or not models:
        return {}
    tiers = [t.get("options") or [] for t in (d.get("tier_variations") or []) if isinstance(t, dict)]
    rows, bait = [], set()
    for m in models:
        if not isinstance(m, dict) or m.get("status", 1) != 1:
            continue
        price = money(m.get("price"))
        if price is None or price <= 0:
            continue
        idx = (m.get("extinfo") or {}).get("tier_index") or []
        opts = [tiers[t][i] for t, i in enumerate(idx) if t < len(tiers) and isinstance(i, int) and i < len(tiers[t])]
        if not opts:
            opts = [s.strip() for s in str(m.get("name") or "").split(",") if s.strip()]
        if any(BAIT_OPT_RE.search(o) for o in opts):
            bait.update(o for o in opts if BAIT_OPT_RE.search(o))
            continue
        if any(int(n) > 1 for o in opts for n in PACK_RE.findall(o)):   # แพ็กหลายชิ้น ไม่ใช่ราคาต่อชิ้น
            continue
        rows.append((opts, price))
    if not rows:
        return {}
    cnt = {}
    for _, p in rows:
        cnt[p] = cnt.get(p, 0) + 1
    common = sorted(cnt, key=lambda p: (-cnt[p], p))[0]
    keep = []
    for opts, p in rows:
        if p < common * 0.4:   # ถูกผิดปกติเทียบราคาส่วนใหญ่ = ตัวเลือกล่อ (รุ่นเก่า ฿1 ฯลฯ)
            bait.add(" / ".join(opts))
        else:
            keep.append((opts, p))
    # กลุ่มตัวเลือกที่เป็น "รุ่นมือถือ" = กลุ่มที่ชื่อตัวเลือกดูเป็นรุ่นมากที่สุด
    mt, best = None, 0.0
    for t, options in enumerate(tiers):
        if options:
            r = sum(1 for o in options if PHONE_OPT_RE.search(str(o))) / len(options)
            if r > best:
                mt, best = t, r
    opt_prices = {}
    if mt is not None and best >= 0.5:
        for opts, p in keep:
            if mt < len(opts):
                o = str(opts[mt]).strip()[:40]
                opt_prices[o] = min(p, opt_prices.get(o, p))
    if len(set(opt_prices.values())) <= 1:
        opt_prices = {}   # ทุกรุ่นราคาเท่ากัน ไม่ต้องเก็บแยก (ประหยัดขนาด live.js)
    return {"case_price": min(p for _, p in keep), "opt_prices": opt_prices, "bait_options": sorted(bait)[:5]}


def item_from_api(cfg: dict, d: dict) -> dict | None:
    iid = first(d, "itemid", "item_id")
    sid = first(d, "shopid", "shop_id")
    name = first(d, "name", "title")
    if not iid or not sid or not isinstance(name, str):
        return None
    price = money(first(d, "price_min", "price"))
    if price is None:
        return None
    before = money(first(d, "price_before_discount", "price_min_before_discount"))
    if before is not None and before <= price:
        before = None
    disc = d.get("raw_discount")
    if not isinstance(disc, (int, float)) or disc <= 0:
        m = re.search(r"(\d+)", str(d.get("discount") or ""))
        disc = int(m.group(1)) if m else (round((1 - price / before) * 100) if before else 0)
    img = d.get("image") or ""
    if isinstance(img, str) and img and not img.startswith("http"):
        img = IMG_CDN + img
    rating = None
    ir = d.get("item_rating")
    if isinstance(ir, dict):
        rating = ir.get("rating_star")
    if rating is None:
        rating = d.get("rating_star")
    sold = first(d, "historical_sold", "sold", "global_sold_count")
    return make_item(
        cfg, sid, iid,
        name=name.strip(),
        image=img if isinstance(img, str) else "",
        price=price,
        price_max=money(d.get("price_max")),
        price_before_discount=before,
        discount_pct=int(disc or 0),
        rating=round(float(rating), 2) if isinstance(rating, (int, float)) and rating > 0 else None,
        sold=int(sold) if isinstance(sold, (int, float)) else None,
        source="api",
        **variant_info(d),
    )


def find_items(cfg: dict, data) -> list[dict]:
    out = []
    for d in walk(data):
        if first(d, "itemid", "item_id") and first(d, "shopid", "shop_id") and first(d, "name", "title"):
            it = item_from_api(cfg, d)
            if it:
                out.append(it)
    return out


def voucher_text(v: dict) -> str:
    if v["kind"] == "coins":
        main = f"Coins คืน {v['pct']:g}%" if v["pct"] else f"Coins คืน {fmt_baht(v['value'])}"
    elif v["value"]:
        main = f"ลด ฿{fmt_baht(v['value'])}"
    else:
        main = f"ลด {v['pct']:g}%"
        if v["cap"]:
            main += f" สูงสุด ฿{fmt_baht(v['cap'])}"
    if v["min_spend"]:
        main += f" ขั้นต่ำ ฿{fmt_baht(v['min_spend'])}"
    return main


def find_vouchers(data, shopid: int) -> list[dict]:
    out = []
    for d in walk(data):
        if "min_spend" not in d:
            continue
        if not any(k in d for k in ("discount_value", "discount_percentage", "discount_percent")):
            continue
        sid = first(d, "shopid", "shop_id")
        if sid is not None and int(sid) != shopid:
            continue  # โค้ดของร้านอื่น หรือโค้ดแพลตฟอร์ม (shopid 0)
        value = money(d.get("discount_value")) or 0
        try:
            pct = float(d.get("discount_percentage") or d.get("discount_percent") or 0)
        except (TypeError, ValueError):
            pct = 0
        if not value and not pct:
            continue
        end = d.get("end_time")
        end_date = ""
        if isinstance(end, (int, float)) and end > 0:
            end_date = datetime.fromtimestamp(end).strftime("%Y-%m-%d")
        v = {
            "code": str(d.get("voucher_code") or d.get("code") or ""),
            "kind": "coins" if d.get("reward_type") == 1 else "discount",
            "value": value,
            "pct": pct,
            "cap": money(first(d, "discount_cap", "max_value")) or 0,
            "min_spend": money(d.get("min_spend")) or 0,
            "end_date": end_date,
        }
        v["text"] = voucher_text(v)
        out.append(v)
    return out


def apply_vouchers(price: float, vouchers: list[dict]):
    """คืนค่า (ราคาหลังโค้ดดีที่สุด, โค้ดที่ใช้, โค้ดถัดไปที่ต้องซื้อเพิ่มถึงจะใช้ได้)"""
    best, best_v, nxt = price, None, None
    for v in vouchers:
        if v["kind"] != "discount":
            continue
        if v["min_spend"] <= price:
            disc = v["value"] if v["value"] else price * v["pct"] / 100
            if v["pct"] and not v["value"] and v["cap"]:
                disc = min(disc, v["cap"])
            cand = max(round(price - disc, 2), 0)
            if cand < best:
                best, best_v = cand, v
        elif nxt is None or v["min_spend"] < nxt["min_spend"]:
            nxt = v
    return best, best_v, nxt


def compile_excludes(words: list[str]):
    pats = []
    for w in words or []:
        w = w.strip()
        if not w:
            continue
        if re.fullmatch(r"[A-Za-z0-9 .&'-]+", w):
            pats.append(re.compile(r"(?<![A-Za-z0-9])" + re.escape(w) + r"(?![A-Za-z0-9])", re.I))
        else:
            pats.append(re.compile(re.escape(w), re.I))
    return pats


# --------------------------------------------------------------------------- files
def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8-sig") as f:
        user = json.load(f)
    cfg = json.loads(json.dumps(DEFAULTS))
    for k, v in user.items():
        if k.startswith("_"):
            continue  # คีย์ที่ขึ้นต้นด้วย _ คือคำอธิบาย
        if isinstance(v, dict) and isinstance(cfg.get(k), dict):
            cfg[k].update({kk: vv for kk, vv in v.items() if not kk.startswith("_")})
        else:
            cfg[k] = v
    cfg["base_url"] = cfg["base_url"].rstrip("/")
    lo, hi = cfg["delay_seconds"]
    cfg["delay_seconds"] = [float(min(lo, hi)), float(max(lo, hi))]
    return cfg


def load_json(path: Path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path: Path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def load_affiliates():
    rows, mapping = [], {}
    if AFF_FILE.exists():
        with open(AFF_FILE, encoding="utf-8-sig", errors="replace", newline="") as f:
            for r in csv.DictReader(f):
                rows.append(r)
                k = url_key(r.get("product_url") or "")
                link = (r.get("affiliate_link") or "").strip()
                if k and link:
                    mapping[k] = link
    return rows, mapping


def add_affiliate_rows(rows: list[dict], items: list[dict]) -> int:
    """เพิ่มสินค้าใหม่ลง affiliate_links.csv (ช่องลิงก์ว่างไว้ให้กรอก)"""
    existing = {url_key(r.get("product_url") or "") for r in rows}
    new = [it for it in items if it["key"] not in existing]
    if not new:
        return 0
    header = ["product_url", "affiliate_link", "name", "model"]
    try:
        if not AFF_FILE.exists() or AFF_FILE.stat().st_size == 0:
            f = open(AFF_FILE, "w", encoding="utf-8-sig", newline="")
            writer = csv.writer(f)
            writer.writerow(header)
        else:
            with open(AFF_FILE, "rb") as fb:
                fb.seek(-1, 2)
                needs_nl = fb.read(1) not in (b"\n", b"\r")
            f = open(AFF_FILE, "a", encoding="utf-8", newline="")
            if needs_nl:
                f.write("\r\n")
            writer = csv.writer(f)
        with f:
            for it in new:
                writer.writerow([it["url"], "", it["name"], it["model"]])
        return len(new)
    except PermissionError:
        log.warning("เขียน affiliate_links.csv ไม่ได้ (เปิดค้างใน Excel อยู่?) - ดูรายการใน need_affiliate_links.txt แทน")
        return 0


def update_history(items: list[dict]) -> dict:
    """บันทึกราคาวันนี้ แล้วคืนราคาต่ำสุด 30 วันของแต่ละสินค้า"""
    today = today_str()
    new_file = not HISTORY_FILE.exists()
    with open(HISTORY_FILE, "a", encoding="utf-8-sig" if new_file else "utf-8", newline="") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(["date", "key", "price", "best_price"])
        for it in items:
            w.writerow([today, it["key"], it["price"], it["best_price"]])
    return load_lowest()


def load_lowest() -> dict:
    cutoff = (now() - timedelta(days=30)).strftime("%Y-%m-%d")
    lowest: dict[str, float] = {}
    if not HISTORY_FILE.exists():
        return lowest
    with open(HISTORY_FILE, encoding="utf-8-sig", errors="replace", newline="") as f:
        for r in csv.DictReader(f):
            if (r.get("date") or "") < cutoff:
                continue
            try:
                p = float(r.get("best_price") or r.get("price") or "")
            except ValueError:
                continue
            k = r.get("key")
            if k and (k not in lowest or p < lowest[k]):
                lowest[k] = p
    return lowest


# --------------------------------------------------------------------------- browser
def chrome_path():
    for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), os.environ.get("LocalAppData")):
        if base:
            exe = Path(base) / "Google" / "Chrome" / "Application" / "chrome.exe"
            if exe.exists():
                return str(exe)
    return None


def cdp_alive(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=2):
            return True
    except Exception:
        return False


def start_chrome(cfg: dict, url: str | None = None):
    """เปิด Chrome ปกติ (ไม่ใช่ Chrome ที่ Playwright ควบคุม) พร้อมพอร์ตให้บอทเกาะ - ล็อกอิน Google ได้ตามปกติ
    ถ้า Chrome ตัวนี้เปิดอยู่แล้ว (โปรไฟล์เดียวกัน) การเรียกซ้ำจะเปิดแท็บใหม่ในหน้าต่างเดิม"""
    exe = chrome_path()
    if not exe:
        raise SystemExit("ไม่พบ Google Chrome - ติดตั้ง Chrome ก่อน หรือเปลี่ยน browser_mode ใน config.json เป็น \"launch\"")
    ATTACH_PROFILE.mkdir(exist_ok=True)
    args = [exe, f"--remote-debugging-port={int(cfg['attach_port'])}", f"--user-data-dir={ATTACH_PROFILE}",
            "--no-first-run", "--no-default-browser-check", "--lang=th-TH"]
    if url:
        args.append(url)
    subprocess.Popen(args)


def ensure_chrome(cfg: dict):
    port = int(cfg["attach_port"])
    if cdp_alive(port):
        return
    log.info("เปิด Chrome ของบอท (พอร์ต %d)", port)
    start_chrome(cfg)
    for _ in range(30):
        if cdp_alive(port):
            return
        time.sleep(1)
    raise SystemExit("เปิด Chrome ของบอทไม่สำเร็จ - ปิด Chrome ที่ใช้โฟลเดอร์ chrome_profile ให้หมดแล้วลองใหม่")


def launch(p, cfg: dict, headless: bool):
    if cfg.get("browser_mode") == "attach":
        ensure_chrome(cfg)
        browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{int(cfg['attach_port'])}")
        return browser.contexts[0] if browser.contexts else browser.new_context()
    PROFILE_DIR.mkdir(exist_ok=True)
    opts = dict(
        user_data_dir=str(PROFILE_DIR),
        headless=headless,
        locale="th-TH",
        timezone_id="Asia/Bangkok",
        viewport={"width": 1366, "height": 850},
    )
    channel = (cfg.get("browser_channel") or "").strip()
    errors = []
    for ch in ([channel] if channel else []) + [None]:
        try:
            return p.chromium.launch_persistent_context(channel=ch, **opts) if ch else \
                p.chromium.launch_persistent_context(**opts)
        except PWError as e:
            msg = str(e)
            if "already in use" in msg or "ProcessSingleton" in msg or "profile appears to be in use" in msg:
                raise SystemExit("เบราว์เซอร์ของบอทเปิดค้างอยู่ (อาจเป็นหน้าต่าง login หรือรอบที่ตั้งเวลาไว้) - ปิดก่อนแล้วรันใหม่")
            errors.append(f"{ch or 'chromium'}: {msg.splitlines()[0]}")
            if ch:
                log.warning("เปิด %s ไม่ได้ ลองใช้ Chromium ของ Playwright แทน", ch)
    raise SystemExit("เปิดเบราว์เซอร์ไม่ได้ - รัน 1_install.bat อีกครั้ง\n" + "\n".join(errors))


class Bot:
    def __init__(self, cfg: dict, ctx, interactive: bool, state: dict):
        self.cfg = cfg
        self.ctx = ctx
        self.interactive = interactive
        self.wait_human = interactive or bool(cfg.get("_wait_verify"))  # รอให้คนยืนยันเอง (บอทไม่กดแทน)
        self.state = state
        attach = cfg.get("browser_mode") == "attach"  # โหมดเกาะ Chrome: เปิดแท็บใหม่ ไม่แตะแท็บที่คุณเปิดไว้
        self.page = ctx.new_page() if attach or not ctx.pages else ctx.pages[0]
        self.responses = []
        self.page.on("response", self._on_response)
        self.loads = 0
        self.empty_streak = 0
        self.excludes = compile_excludes(cfg.get("exclude_words"))

    # ---- page loading
    def _on_response(self, r):
        try:
            if "/api/" in r.url and r.status == 200:
                self.responses.append(r)
        except Exception:
            pass

    def _block_kind(self):
        url = self.page.url.lower()
        if "/verify/" in url or "captcha" in url:
            return "verify"
        if "/buyer/login" in url or "/login?" in url:
            return "login"
        return None

    def goto(self, url: str):
        if self.loads >= self.cfg["max_page_loads_per_run"] or (guard.budget() and guard.pages_today() >= guard.budget()):
            raise BudgetUsed()
        for attempt in range(2):
            if self.loads > 0:
                time.sleep(random.uniform(*self.cfg["delay_seconds"]))
                re = int(self.cfg.get("rest_every", 0))
                if re and attempt == 0 and self.loads % re == 0:  # พักยาวเป็นระยะ ไม่ให้ดูรัวต่อเนื่อง
                    rest = random.uniform(*self.cfg.get("rest_seconds", [150, 240]))
                    log.info("พักยาว %d วินาที (ครบ %d หน้า)", rest, self.loads)
                    time.sleep(rest)
            self.loads += 1
            guard.note_page("bot.py")
            self.responses = []
            log.info("เปิดหน้า [%d/%d] %s", self.loads, self.cfg["max_page_loads_per_run"], url)
            try:
                self.page.goto(url, wait_until="domcontentloaded", timeout=45000)
            except PWTimeout:
                log.warning("หน้าเว็บโหลดช้า ใช้เท่าที่โหลดได้")
            self.page.wait_for_timeout(int(self.cfg.get("settle_ms", 2500)))
            kind = self._block_kind()
            if kind:
                if self.wait_human and attempt == 0:
                    self._wait_for_user(kind)
                    continue
                raise Blocked(kind, self.page.url)
            for _ in range(int(self.cfg.get("scroll_steps", 4))):  # เลื่อนหน้าเหมือนคนอ่าน ให้รูป/ข้อมูลโหลดครบ
                self.page.mouse.wheel(0, random.randint(900, 1500))
                self.page.wait_for_timeout(random.randint(700, 1300))
            try:
                self.page.wait_for_load_state("networkidle", timeout=int(self.cfg.get("idle_ms", 6000)))
            except PWTimeout:
                pass
            kind = self._block_kind()
            if kind:  # Shopee มักเด้งไปหน้ายืนยันหลังหน้าโหลดเสร็จ (เช็กรอบแรกยังไม่เห็น) — รอให้ผู้ใช้ยืนยันเองแล้วลองหน้าเดิมอีกครั้ง
                if self.wait_human and attempt == 0:
                    self._wait_for_user(kind)
                    continue
                raise Blocked(kind, self.page.url)
            return

    def _wait_for_user(self, kind: str):
        what = "ยืนยันตัวตน" if kind == "verify" else "ล็อกอิน"
        print()
        print(f">>> Shopee ขอให้{what} - ทำเองในหน้าต่างเบราว์เซอร์ของบอท (บอทจะไม่กดแทนคุณ)")
        print(">>> พอยืนยันเสร็จบอทจะไปต่อเอง (หรือกด Enter ที่หน้าต่างนี้) — รอได้สูงสุด 5 นาที ถ้าไม่ยืนยันบอทจะหยุดและนำข้อมูลที่มีขึ้นเว็บ")
        # ห้ามใช้ input() ค้างไว้: Playwright แบบ sync ต้องได้ทำงานระหว่างรอ ไม่งั้นการเชื่อมต่อกับ Chrome หลุดแล้วบอทค้างหลังยืนยันเสร็จ
        try:
            import msvcrt
        except ImportError:
            msvcrt = None
        deadline = time.time() + 5 * 60
        while time.time() < deadline:
            self.page.wait_for_timeout(1000)
            if self._block_kind() is None:
                return
            if msvcrt is not None and msvcrt.kbhit() and msvcrt.getwch() in ("\r", "\n"):
                return
        raise Blocked(kind, self.page.url)

    def payloads(self):
        out = []
        for r in self.responses:
            try:
                if "json" not in (r.headers.get("content-type") or ""):
                    continue
                out.append((r.url, r.json()))
            except Exception:
                continue
        return out

    def _note_result(self, found: bool):
        self.empty_streak = 0 if found else self.empty_streak + 1
        if self.empty_streak >= 2:
            raise Blocked("empty", self.page.url)

    # ---- search page
    def search(self, s: dict) -> list[dict]:
        kw = s["keyword"]
        f = self.cfg["filters"]
        url = f"{self.cfg['base_url']}/search?keyword={quote_plus(kw)}"
        if f.get("max_price"):
            url += f"&maxPrice={int(f['max_price'])}"
        if self.cfg.get("search_sort") and self.cfg["search_sort"] != "relevancy":
            url += f"&sortBy={self.cfg['search_sort']}"
        self.goto(url)

        payloads = self.payloads()
        found = []
        for prefer_search in (True, False):
            for u, data in payloads:
                if prefer_search and "search" not in u:
                    continue
                found.extend(find_items(self.cfg, data))
            if found:
                break
        if not found:
            found = self.dom_items()
        uniq, seen = [], set()
        for it in found:
            if it["key"] not in seen:
                seen.add(it["key"])
                uniq.append(it)
        self._note_result(bool(uniq))

        kept = []
        for it in uniq:
            reason = self._filter_reason(it)
            if reason:
                continue
            it.update(model=s.get("model", ""), style=s.get("style", ""), keyword=kw)
            kept.append(it)
            if len(kept) >= int(s.get("max_items", 20)):
                break
        log.info("  '%s': เจอ %d ชิ้น ผ่านตัวกรอง %d ชิ้น", kw, len(uniq), len(kept))
        return kept

    def _filter_reason(self, it: dict):
        f = self.cfg["filters"]
        if any(p.search(it["name"]) for p in self.excludes):
            return "exclude_word"
        if f.get("max_price") and it["price"] is not None and it["price"] > f["max_price"]:
            return "price"
        if f.get("min_price") and it["price"] is not None and it["price"] < f["min_price"]:
            return "price"  # ราคา ฿1-5 มักเป็นราคาหลอกของตัวเลือกหนึ่ง ไม่ใช่ราคาเคสจริง
        if f.get("min_rating") and it["rating"] is not None and it["rating"] < f["min_rating"]:
            return "rating"
        if f.get("min_sold") and it["sold"] is not None and it["sold"] < f["min_sold"]:
            return "sold"
        return None

    def dom_items(self) -> list[dict]:
        """สำรอง: อ่านจากการ์ดสินค้าที่แสดงบนหน้า ถ้าอ่านจากข้อมูล API ไม่ได้"""
        try:
            cards = self.page.evaluate(
                """() => Array.from(document.querySelectorAll('a[href*="-i."], a[href*="/product/"]'))
                       .map(a => ({href: a.href, text: a.innerText || '',
                                   img: (a.querySelector('img') || {}).src || ''}))"""
            )
        except PWError:
            return []
        out = []
        for c in cards:
            key = url_key(c["href"])
            if not key:
                continue
            lines = [ln.strip() for ln in c["text"].splitlines() if ln.strip()]
            text_lines = [ln for ln in lines if "฿" not in ln and not re.fullmatch(r"-?\d+%", ln)]
            name = max(text_lines, key=len) if text_lines else ""
            prices = [float(x.replace(",", "")) for x in re.findall(r"฿\s*([\d,]+(?:\.\d+)?)", c["text"])]
            if not name or not prices:
                continue
            m = re.search(r"-(\d+)%", c["text"])
            sid, iid = key.split("_")
            out.append(make_item(
                self.cfg, sid, iid, name=name, image=c["img"], price=min(prices),
                discount_pct=int(m.group(1)) if m else 0, sold=parse_sold(c["text"]), source="dom",
            ))
        return out

    # ---- product page
    def ld_product(self):
        try:
            blobs = self.page.eval_on_selector_all(
                'script[type="application/ld+json"]', "els => els.map(e => e.textContent)")
        except PWError:
            return None
        for b in blobs:
            try:
                data = json.loads(b)
            except ValueError:
                continue
            for d in walk(data):
                t = d.get("@type")
                if t == "Product" or (isinstance(t, list) and "Product" in t):
                    return d
        return None

    def visit_product(self, it: dict) -> bool:
        self.goto(it["url"])
        payloads = self.payloads()
        got = False
        for _, data in payloads:
            for x in find_items(self.cfg, data):
                if x["key"] == it["key"]:
                    for k in ("price", "price_max", "price_before_discount", "discount_pct", "rating", "sold"):
                        if x[k] not in (None, 0) or it[k] is None:
                            it[k] = x[k]
                    it["name"] = it["name"] or x["name"]
                    it["image"] = it["image"] or x["image"]
                    if x.get("case_price") is not None:   # หน้าสินค้ามีราคาแยกตามตัวเลือก
                        for k in ("case_price", "opt_prices", "bait_options"):
                            it[k] = x[k]
                    got = True
        if not got:
            ld = self.ld_product()
            if ld:
                offers = ld.get("offers") or {}
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}
                price = money(first(offers, "price", "lowPrice"))
                if price is not None:
                    it["price"] = price
                    it["price_max"] = money(offers.get("highPrice"))
                    got = True
                it["name"] = it["name"] or str(ld.get("name") or "").strip()
                img = ld.get("image")
                if isinstance(img, list):
                    img = img[0] if img else ""
                it["image"] = it["image"] or (img or "")
                ar = ld.get("aggregateRating") or {}
                if it["rating"] is None and ar.get("ratingValue"):
                    try:
                        it["rating"] = round(float(ar["ratingValue"]), 2)
                    except (TypeError, ValueError):
                        pass
                it["source"] = it["source"] or "ld+json"
        if it["price"] is None or not it["name"]:
            try:
                meta = self.page.evaluate(
                    """() => { const m = n => (document.querySelector(
                                   `meta[property="${n}"], meta[name="${n}"]`) || {}).content || '';
                               return {title: m('og:title') || document.title || '', image: m('og:image'),
                                       price: m('product:price:amount')}; }""")
            except PWError:
                meta = {"title": "", "image": "", "price": ""}
            it["name"] = it["name"] or re.sub(r"\s*[|｜]\s*Shopee.*$", "", meta["title"], flags=re.I).strip()
            it["image"] = it["image"] or meta["image"]
            if it["price"] is None and money(meta["price"]) is not None:
                it["price"] = money(meta["price"])
                it["source"] = it["source"] or "meta"
        if it["price"] is None:
            log.warning("  อ่านราคาไม่ได้: %s (ข้ามสินค้านี้)", it["url"])
        # นับว่า "หน้าว่าง" เฉพาะตอนไม่เจออะไรเลย (อาจโดนบล็อกแบบไม่เปลี่ยน URL)
        self._note_result(it["price"] is not None or bool(it["name"]))

        vouchers, seen = [], set()
        for _, data in payloads:
            for v in find_vouchers(data, it["shopid"]):
                sig = (v["code"], v["kind"], v["value"], v["pct"], v["min_spend"])
                if sig not in seen:
                    seen.add(sig)
                    vouchers.append(v)
        it["vouchers"] = vouchers
        it["vouchers_checked_at"] = now().strftime("%Y-%m-%d %H:%M")
        it["voucher_checked"] = True
        self.state[it["key"]] = {"vouchers": vouchers, "checked_at": it["vouchers_checked_at"]}
        if it["price"] is not None:
            log.info("  %s | ราคา ฿%s | โค้ดร้าน %d รายการ", it["name"][:40] or it["key"],
                     fmt_baht(it["price"]), len(vouchers))
        return got


# --------------------------------------------------------------------------- main flow
def suspect_price_keys() -> set:
    """สินค้าที่ราคาในข้อมูลเก่าดูเป็นตัวเลือกล่อ (ต่ำมากเทียบราคาสูงสุด) และยังไม่ได้เช็กซ้ำวันนี้"""
    out = set()
    try:
        import csv
        today = today_str()
        with open(DATA_DIR / "products_all.csv", encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                try:
                    p = float(r["price"]); pm = float(r["price_max"] or 0)
                except (ValueError, KeyError):
                    continue
                if (p < 15 or (p < 20 and pm >= p * 2)) and (r.get("price_checked_at") or "")[:10] < today:
                    out.add(r["key"])
    except OSError:
        pass
    return out


def pick_tracked(cfg: dict, aff_map: dict, state: dict, limit: int) -> list[dict]:
    """สินค้าจาก feed_catalog ที่มีลิงก์ affiliate แล้ว เลือกชิ้นที่ไม่ได้เช็กนานที่สุด (ไม่เคยเช็กมาก่อน) ก่อน"""
    feed = load_json(FEED_FILE, {})
    catalog = load_json(CATALOG_FILE, {})
    keys = [k for k in feed if k in aff_map]
    sus = suspect_price_keys()  # ราคาน่าสงสัย (ตัวเลือกล่อ) ที่ยังไม่ได้เช็กซ้ำวันนี้ → ทำก่อน
    keys.sort(key=lambda k: (0 if k in sus else 1, state.get(k, {}).get("checked_at", ""), -(feed[k].get("sold") or 0), k))  # ไม่เคยเช็กก่อน ขายดีก่อน
    out = []
    for k in keys[:limit]:
        f = feed[k]
        sid, iid = k.split("_")
        it = make_item(cfg, sid, iid, name=f.get("name", ""), price=f.get("price"), sold=f.get("sold"),
                       curated=True, source="feed")
        it.update(catalog.get(k, {}))
        it.update(shop=f.get("shop", ""), commission_pct=f.get("commission_pct"), feed_price=f.get("price"),
                  voucher_checked=False)
        out.append(it)
    return out


def fix_bait(it: dict):
    """ราคาหน้าสินค้าที่ต่ำกว่า 40% ของราคาใน feed มักเป็นตัวเลือก "สินค้า 1 บาท" ไม่ใช่ราคาเคส - ใช้ราคา feed แทน"""
    cp = it.get("case_price")
    if cp:   # มีราคาจากตัวเลือกจริงแล้ว — แม่นกว่าการเดา
        if it.get("price") is not None and it["price"] < cp:
            log.info("  ราคาล่อ ฿%s -> ราคาตัวเคส ฿%s (ตัดตัวเลือก: %s)", fmt_baht(it["price"]), fmt_baht(cp),
                     ", ".join(it.get("bait_options") or []) or "-")
            it["bait_price"] = it["price"]
        it["price"] = cp
        if it.get("opt_prices"):
            it["price_max"] = max(it["opt_prices"].values())
        return
    fp = it.get("feed_price")
    if fp and it.get("price") is not None and it["price"] < fp * 0.4:
        log.info("  ราคาหน้าสินค้า ฿%s ต่ำผิดปกติ (feed ฿%s) - ใช้ราคา feed", fmt_baht(it["price"]), fmt_baht(fp))
        it["price"] = fp
    # feed ของ Shopee ก็รายงานราคาตัวเลือกล่อเหมือนกัน (เช็ก 2026-11-09: feed ฿3 แต่ตัวเคส ฿15) → ใช้ราคาตัวเลือกสูงสุดแทน
    p, pm = it.get("price"), it.get("price_max")
    if p is not None and p < 15 and pm and pm >= p * 2:
        log.info("  ราคา ฿%s น่าจะเป็นตัวเลือกล่อ (ตัวเลือกสูงสุด ฿%s) - ใช้ราคาตัวเลือกสูงสุด", fmt_baht(p), fmt_baht(pm))
        it["bait_price"] = p
        it["price"] = pm


def finalize(cfg: dict, items: dict, aff_rows, aff_map, state: dict, status: dict):
    today = today_str()
    stamp = now().strftime("%Y-%m-%d %H:%M")
    max_age = timedelta(days=float(cfg["voucher_max_age_days"]))
    for it in items.values():
        it["price_checked_at"] = stamp
        it["stale"] = False

    # รอบที่โดนหยุดกลางทาง: เอาสินค้าที่เคยเจอใน 3 วันล่าสุดมารวมด้วย เว็บจะได้ไม่หายครึ่งหนึ่ง
    if status["status"] != "ok" or int(cfg["track_per_run"]) > 0:
        carry_cutoff = (now() - timedelta(days=float(cfg["carry_days"]))).strftime("%Y-%m-%d %H:%M")
        carried = 0
        for k, old in load_json(CATALOG_FILE, {}).items():
            if k not in items and old.get("price_checked_at", "") >= carry_cutoff:
                old.update(stale=True, voucher_checked=True)
                items[k] = old
                carried += 1
        if carried:
            log.info("ใช้ข้อมูลเดิม %d ชิ้นที่รอบนี้ยังไม่ได้อัปเดต", carried)

    final = []
    for it in items.values():
        if it["price"] is None:
            continue
        if not it["voucher_checked"]:
            st = state.get(it["key"])
            if st:
                try:
                    age = now() - datetime.strptime(st["checked_at"], "%Y-%m-%d %H:%M")
                except (KeyError, ValueError):
                    age = max_age + timedelta(days=1)
                if age <= max_age:
                    it["vouchers"] = st.get("vouchers", [])
                    it["vouchers_checked_at"] = st["checked_at"]
        it["vouchers"] = [v for v in it["vouchers"] if not v.get("end_date") or v["end_date"] >= today]
        best, best_v, nxt = apply_vouchers(it["price"], it["vouchers"])
        base = it["price_before_discount"] or it["price"]
        it["best_price"] = best
        it["best_voucher"] = best_v["text"] if best_v else ""
        it["next_voucher"] = (f"ซื้อครบ ฿{fmt_baht(nxt['min_spend'])} {nxt['text'].split(' ขั้นต่ำ')[0]}"
                              if nxt else "")
        it["save_pct"] = round((1 - best / base) * 100) if base and best < base else 0
        it["affiliate_link"] = aff_map.get(it["key"], "")
        final.append(it)

    fresh = [it for it in final if not it["stale"]]
    lowest = update_history(fresh) if fresh else load_lowest()
    for it in final:
        low = lowest.get(it["key"])
        it["lowest_30d"] = min(low, it["best_price"]) if low is not None else it["best_price"]

    final.sort(key=lambda x: (-x["save_pct"], x["best_price"]))
    status.update(finished=now().strftime("%Y-%m-%d %H:%M:%S"), items=len(final), fresh_items=len(fresh))
    if not final:
        write_json(DATA_DIR / "last_run.json", status)
        log.warning("รอบนี้ไม่ได้ข้อมูลสินค้าเลย - ไม่เขียนทับ products.json เดิม")
        return
    write_json(CATALOG_FILE, {it["key"]: {k: v for k, v in it.items() if k != "lowest_30d"} for it in final})
    added = add_affiliate_rows(aff_rows, final)
    missing = [it for it in final if not it["affiliate_link"]]
    NEED_LINKS_FILE.write_text("\n".join(it["url"] for it in missing) + ("\n" if missing else ""),
                               encoding="utf-8")

    cols = ["key", "name", "model", "style", "keyword", "price", "price_max", "price_before_discount",
            "discount_pct", "best_price", "save_pct", "best_voucher", "next_voucher", "voucher_count",
            "vouchers_checked_at", "price_checked_at", "rating", "sold", "lowest_30d", "affiliate_link",
            "url", "image", "source"]
    try:
        with open(DATA_DIR / "products_all.csv", "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            for it in final:
                w.writerow({**it, "voucher_count": len(it["vouchers"])})
    except PermissionError:
        log.warning("เขียน products_all.csv ไม่ได้ (เปิดค้างใน Excel อยู่?)")

    publish = [it for it in final if it["affiliate_link"] or not cfg["publish_only_with_affiliate_link"]]
    write_json(DATA_DIR / "products.json", {
        "updated_at": stamp,
        "note": "ราคาและโค้ด ณ เวลาที่อัปเดต อาจเปลี่ยนได้ เช็กราคาจริงที่หน้า Shopee ก่อนสั่งซื้อ",
        "count": len(publish),
        "products": [{
            "key": it["key"], "name": it["name"], "model": it["model"], "style": it["style"],
            "image": it["image"], "price": it["price"], "price_max": it["price_max"],
            "case_price": it.get("case_price"), "opt_prices": it.get("opt_prices") or {},
            "bait_options": it.get("bait_options") or [],
            "price_before_discount": it["price_before_discount"], "best_price": it["best_price"],
            "save_pct": it["save_pct"], "best_voucher": it["best_voucher"],
            "next_voucher": it["next_voucher"], "vouchers": [v["text"] for v in it["vouchers"]],
            "vouchers_checked_at": it["vouchers_checked_at"], "price_checked_at": it["price_checked_at"],
            "rating": it["rating"], "sold": it["sold"],
            "lowest_30d": it["lowest_30d"], "link": it["affiliate_link"] or it["url"],
            "is_affiliate": bool(it["affiliate_link"]),
            "shop": it.get("shop", ""), "commission_pct": it.get("commission_pct"), "stale": it["stale"],
        } for it in publish],
    })

    cutoff = (now() - timedelta(days=30)).strftime("%Y-%m-%d")
    write_json(STATE_FILE, {k: v for k, v in state.items() if v.get("checked_at", "") >= cutoff})

    status.update(
        published=len(publish), need_affiliate_links=len(missing),
        new_rows_in_affiliate_csv=added,
        with_shop_vouchers=sum(1 for it in final if it["vouchers"]),
    )
    write_json(DATA_DIR / "last_run.json", status)
    log.info("สรุป: สินค้า %d | ขึ้นเว็บ %d | มีโค้ดร้าน %d | ยังไม่มีลิงก์ affiliate %d",
             len(final), len(publish), status["with_shop_vouchers"], len(missing))
    if missing:
        log.info("  -> สร้างลิงก์ affiliate ให้สินค้าใน need_affiliate_links.txt แล้ววางลงคอลัมน์ "
                 "affiliate_link ใน affiliate_links.csv")


def run(cfg: dict, interactive: bool) -> int:
    DATA_DIR.mkdir(exist_ok=True)
    status = {"started": now().strftime("%Y-%m-%d %H:%M:%S"), "status": "ok", "message": "",
              "mode": "interactive" if interactive else "scheduled"}
    aff_rows, aff_map = load_affiliates()
    state = load_json(STATE_FILE, {})
    items: dict[str, dict] = {}
    code = 0

    with sync_playwright() as p:
        ctx = launch(p, cfg, headless=bool(cfg["headless"]))
        bot = Bot(cfg, ctx, interactive, state)
        try:
            for entry in cfg["product_urls"]:  # สินค้าที่คุณเลือกเอง ทำก่อน
                e = {"url": entry} if isinstance(entry, str) else dict(entry)
                key = url_key(e.get("url", ""))
                if not key:
                    log.warning("อ่านลิงก์สินค้าไม่ได้ (ต้องเป็นลิงก์เต็ม ไม่ใช่ลิงก์สั้น): %s", e.get("url"))
                    continue
                if key in items:
                    continue
                sid, iid = key.split("_")
                it = make_item(cfg, sid, iid, model=e.get("model", ""), style=e.get("style", ""),
                               curated=True, source="product_page")
                bot.visit_product(it)
                items[key] = it

            if int(cfg["track_per_run"]) > 0:  # วนเช็กสินค้า affiliate ใน feed_catalog ทีละชุด
                for it in pick_tracked(cfg, aff_map, state, int(cfg["track_per_run"])):
                    bot.visit_product(it)
                    fix_bait(it)
                    items[it["key"]] = it

            for s in cfg["searches"]:
                for it in bot.search(s):
                    items.setdefault(it["key"], it)

            todo = [it for it in items.values() if not it["voucher_checked"]]
            todo.sort(key=lambda it: (0 if it["key"] in aff_map else 1,
                                      state.get(it["key"], {}).get("checked_at", "")))
            for it in todo[: int(cfg["check_vouchers_per_run"])]:
                bot.visit_product(it)
        except Blocked as b:
            code = 2
            msg = {
                "verify": "Shopee ขอยืนยันตัวตน (กันบอท) - เปิด 3_run_bot.bat แล้วยืนยันเองในหน้าต่างเบราว์เซอร์",
                "login": "หลุดล็อกอิน - ดับเบิลคลิก 2_login.bat แล้วล็อกอินใหม่",
                "empty": "เปิดหน้าแล้วไม่เจอข้อมูลสินค้า 2 หน้าติดกัน (อาจโดนจำกัดหรือหน้าเว็บเปลี่ยน) - หยุดไว้ก่อน",
            }[b.kind]
            status.update(status=f"blocked_{b.kind}", message=msg, blocked_url=b.url)
            if b.kind in ("verify", "empty"):
                guard.note_block("bot.py", bot.loads, b.kind)  # เริ่ม cooldown ให้ทุกสคริปต์
            log.warning("หยุดรอบนี้: %s", msg)
        except BudgetUsed:
            status["message"] = "เปิดหน้าครบจำนวนที่ตั้งไว้ต่อรอบ (max_page_loads_per_run)"
            log.info(status["message"])
        except KeyboardInterrupt:  # Ctrl-C: เก็บผลที่ได้แล้วก่อนออก ไม่ทิ้งทั้งรอบ
            code = 2
            status.update(status="interrupted", message="หยุดโดยผู้ใช้ (Ctrl-C) - บันทึกผลที่ได้แล้ว")
            log.warning(status["message"])
        except Exception as e:  # ข้อผิดพลาดกลางทาง (เช่น เบราว์เซอร์หลุด): เก็บผลที่ได้แล้ว ไม่ทิ้งทั้งรอบ
            code = 2
            status.update(status="error", message=f"หยุดกลางทาง: {type(e).__name__}: {e}"[:300])
            log.exception("หยุดกลางทาง - บันทึกผลที่ได้แล้ว")
        finally:
            status["page_loads"] = bot.loads
            try:
                bot.page.close() if cfg.get("browser_mode") == "attach" else ctx.close()
            except Exception:
                pass

    finalize(cfg, items, aff_rows, aff_map, state, status)
    return code


def login(cfg: dict) -> int:
    if cfg.get("browser_mode") == "attach":
        start_chrome(cfg, cfg["base_url"] + "/buyer/login")
        print()
        print("1) ล็อกอิน Shopee ใน Chrome ที่เปิดขึ้นมา (ล็อกอินด้วย Google ได้ตามปกติ)")
        print("   แนะนำให้ใช้บัญชีผู้ซื้อแยก ไม่ใช่บัญชีร้านค้าหรือบัญชี Affiliate")
        print("2) ล็อกอินเสร็จแล้วกลับมากด Enter ที่หน้าต่างนี้ (ปล่อย Chrome ไว้ ไม่ต้องปิด)")
        try:
            input()
        except EOFError:
            pass
        print("บันทึกการล็อกอินแล้ว ต่อไปรัน 3_run_bot.bat ได้เลย (ระหว่างบอททำงาน อย่าใช้ Chrome ตัวนี้)")
        return 0
    with sync_playwright() as p:
        ctx = launch(p, cfg, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        try:
            page.goto(cfg["base_url"] + "/buyer/login", wait_until="domcontentloaded", timeout=60000)
        except PWTimeout:
            pass
        print()
        print("1) ล็อกอิน Shopee ในหน้าต่างเบราว์เซอร์ที่เปิดขึ้นมา")
        print("   แนะนำให้ใช้บัญชีผู้ซื้อแยก ไม่ใช่บัญชีร้านค้าหรือบัญชี Affiliate")
        print("2) ล็อกอินเสร็จแล้วกลับมากด Enter ที่หน้าต่างนี้")
        try:
            input()
        except EOFError:
            pass
        ctx.close()
    print("บันทึกการล็อกอินแล้ว ต่อไปรัน 3_run_bot.bat ได้เลย")
    return 0


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="PhoneCase Bot - Shopee TH price & shop voucher collector")
    ap.add_argument("--login", action="store_true", help="เปิดเบราว์เซอร์ให้ล็อกอิน Shopee")
    ap.add_argument("--scheduled", action="store_true", help="โหมดตั้งเวลา: ไม่รอให้คนกด")
    ap.add_argument("--wait-verify", action="store_true",
                    help="เจอหน้ายืนยันตัวตนให้รอคนยืนยันเอง (สูงสุด 15 นาที) แล้วทำต่อ ถ้าไม่มีใครยืนยันจะหยุด")
    ap.add_argument("--force", action="store_true", help="ข้าม cooldown/งบรายวัน (ใช้หลังยืนยันเองในหน้าต่างเบราว์เซอร์แล้วเท่านั้น)")
    ap.add_argument("--config", default=str(BASE_DIR / "config.json"))
    args = ap.parse_args()

    cfg = load_config(Path(args.config))
    cfg["_wait_verify"] = bool(args.wait_verify)
    if args.login:
        return login(cfg)
    logfile = setup_logging()
    why = guard.why_not(args.force)
    if why:
        log.error("ไม่เริ่มรอบ: %s", why)
        return 3
    guard.acquire("bot.py")
    interactive = (not args.scheduled) and sys.stdin is not None and sys.stdin.isatty()
    log.info("เริ่มรอบ (%s) log: %s", "รันเอง" if interactive else "ตั้งเวลา", logfile.name)
    try:
        return run(cfg, interactive)
    except SystemExit as e:
        log.error(str(e))
        return 1
    except Exception:
        log.exception("เกิดข้อผิดพลาด")
        return 1


def setup_logging() -> Path:
    LOG_DIR.mkdir(exist_ok=True)
    for old in LOG_DIR.glob("run_*.log"):
        try:
            if time.time() - old.stat().st_mtime > 30 * 86400:
                old.unlink()
        except OSError:
            pass
    logfile = LOG_DIR / f"run_{now():%Y%m%d_%H%M%S}.log"
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S")
    fh = logging.FileHandler(logfile, encoding="utf-8")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    log.setLevel(logging.INFO)
    log.addHandler(fh)
    log.addHandler(sh)
    return logfile


if __name__ == "__main__":
    sys.exit(main())
