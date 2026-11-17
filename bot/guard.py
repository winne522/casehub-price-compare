# -*- coding: utf-8 -*-
"""ตัวคุมกลางของทุกสคริปต์ที่เปิดหน้า Shopee (bot.py, scripts/fetch_film_images.py)
- cooldown: โดน verify แล้วห้ามเริ่มใหม่ 6 ชม. · โดนซ้ำ 2 ครั้งใน 24 ชม. ห้าม 24 ชม. (นับจากครั้งล่าสุด)
- งบหน้าต่อวัน: ปิดแล้ว (ผู้ใช้สั่งเอาออก 2026-11-11) · ยังนับจำนวนหน้าต่อวันไว้ดูสถิติ
- lock: ไม่ให้สองสคริปต์เปิด Shopee พร้อมกัน (ถือว่าค้างถ้าไม่มีความเคลื่อนไหวเกิน 20 นาที)
สถานะเก็บใน data/guard.json · ข้ามได้ด้วย --force หลังยืนยันเองในหน้าต่าง Chrome ของบอทแล้วเท่านั้น"""
import atexit, json, os, re, time
from datetime import datetime, timedelta
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
FILE = DATA / "guard.json"
LOCK = DATA / "guard.lock"
CFG = Path(__file__).resolve().parent / "config.json"
FMT = "%Y-%m-%d %H:%M:%S"
COOLDOWN_H, COOLDOWN_REPEAT_H, STALE_LOCK_S = 6, 24, 20 * 60


def _load():
    try:
        return json.loads(FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"blocks": [], "pages": {}}


def _save(d):
    DATA.mkdir(exist_ok=True)
    d["blocks"] = d.get("blocks", [])[-20:]
    d["pages"] = dict(sorted(d.get("pages", {}).items())[-14:])
    FILE.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def budget():
    """0 = ไม่จำกัด (ผู้ใช้สั่งเอางบหน้าต่อวันออก 2026-11-11)"""
    return 0


def pages_today():
    return int(_load().get("pages", {}).get(datetime.now().strftime("%Y-%m-%d"), 0))


def cooldown_until():
    """เวลาที่เริ่มใหม่ได้ (datetime) หรือ None ถ้าไม่ติด cooldown"""
    return None  # ปิด cooldown แล้ว (ผู้ใช้ทดสอบแล้วว่าไม่มีประโยชน์) · ยังบันทึกประวัติการโดน verify ลง guard.json ไว้เฉยๆ
    blocks = [datetime.strptime(b["at"], FMT) for b in _load().get("blocks", [])]
    if not blocks:
        return None
    last = blocks[-1]
    recent = [b for b in blocks if last - b <= timedelta(hours=24)]
    until = last + timedelta(hours=COOLDOWN_REPEAT_H if len(recent) >= 2 else COOLDOWN_H)
    return until if until > datetime.now() else None


def _pid_alive(pid):
    """Windows: เช็กด้วย OpenProcess (ห้ามใช้ os.kill — บน Windows มันฆ่าโปรเซสจริง)"""
    try:
        import ctypes
        h = ctypes.windll.kernel32.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        code = ctypes.c_ulong()
        ok = ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(h)
        return bool(ok) and code.value == 259  # STILL_ACTIVE
    except Exception:
        return True  # ไม่แน่ใจ → ถือว่ายังอยู่ (ปลอดภัยไว้ก่อน)


def why_not(force=False):
    """คืนข้อความเหตุผลที่ยังไม่ควรเริ่ม หรือ '' ถ้าเริ่มได้"""
    if LOCK.exists() and time.time() - LOCK.stat().st_mtime < STALE_LOCK_S:
        txt = LOCK.read_text(encoding="utf-8").strip()
        m = re.search(r"\bpid (\d+)", txt)
        if m and not _pid_alive(m.group(1)):  # สคริปต์ที่ถือ lock ตายไปแล้ว (เช่นถูกกดหยุดจากแผง) → lock ค้าง ลบทิ้ง
            try:
                LOCK.unlink()
            except OSError:
                pass
        else:
            return "มีสคริปต์อื่นกำลังเปิด Shopee อยู่ (%s) - รอให้จบก่อน" % txt
    if force:
        return ""
    cu = cooldown_until()
    if cu:
        return "ติด cooldown หลังโดน verify - เริ่มได้อีกครั้ง %s (ข้ามด้วย --force หลังยืนยันเองแล้ว)" % cu.strftime("%m-%d %H:%M")
    if budget() and pages_today() >= budget():
        return "วันนี้เปิดครบงบ %d หน้าแล้ว (daily_page_budget) - รอพรุ่งนี้" % budget()
    return ""


def acquire(who):
    DATA.mkdir(exist_ok=True)
    LOCK.write_text("%s pid %d %s" % (who, os.getpid(), datetime.now().strftime(FMT)), encoding="utf-8")
    atexit.register(release)


def release():
    try:
        LOCK.unlink()
    except OSError:
        pass


def note_page(who):
    """เรียกทุกครั้งที่เปิดหน้า Shopee 1 หน้า · คืน True ถ้ายังมีงบเหลือ"""
    d = _load()
    day = datetime.now().strftime("%Y-%m-%d")
    d.setdefault("pages", {})[day] = int(d["pages"].get(day, 0)) + 1
    _save(d)
    try:
        os.utime(LOCK, None)
    except OSError:
        pass
    return not budget() or d["pages"][day] < budget()


def note_block(who, pages, kind="verify"):
    d = _load()
    d.setdefault("blocks", []).append({"at": datetime.now().strftime(FMT), "by": who, "pages_in_run": pages, "kind": kind})
    _save(d)
