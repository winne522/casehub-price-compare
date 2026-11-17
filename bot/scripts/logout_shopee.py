"""Logout Shopee in the bot Chrome (port 9222) by deleting Shopee cookies. Does not open any page."""
import json, sys, urllib.request
from playwright.sync_api import sync_playwright

port = 9222
try:
    cfg = json.load(open("config.json", encoding="utf-8"))
    port = int(cfg.get("attach_port", 9222))
except Exception:
    pass
try:
    urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=3)
except Exception:
    print(f"Bot Chrome is not running on port {port} - nothing to log out.")
    sys.exit(0)
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
    ctx = b.contexts[0]
    sh = [c for c in ctx.cookies() if "shopee" in c["domain"]]
    for d in {c["domain"] for c in sh}:
        ctx.clear_cookies(domain=d)
    left = [c for c in ctx.cookies() if "shopee" in c["domain"]]
    print(f"Removed {len(sh)} Shopee cookies, {len(left)} left. Logged out of Shopee in the bot browser.")
