# -*- coding: utf-8 -*-
"""เพิ่มหนึ่งบรรทัดลง BOT_LOG.md (ก่อนบรรทัด 'สถานะข้อมูล ณ') · ใช้: python scripts/_log.py "ข้อความ" """
import io, sys
from datetime import datetime
from pathlib import Path
p = Path(__file__).resolve().parents[1] / "BOT_LOG.md"
s = io.open(p, encoding="utf-8").read()
line = "- %s %s\n" % (datetime.now().strftime("%m-%d %H:%M"), sys.argv[1])
k = s.find("\nสถานะข้อมูล ณ")
s = s[:k].rstrip("\n") + "\n" + line + s[k:] if k >= 0 else s.rstrip("\n") + "\n" + line
io.open(p, "w", encoding="utf-8", newline="").write(s)
