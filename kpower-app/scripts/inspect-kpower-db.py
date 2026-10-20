#!/usr/bin/env python3
"""Export stock kpower.db device_data rows as HistorySample-compatible JSON."""
import json
import os
import sqlite3
import sys
from datetime import datetime

db = os.path.join(os.environ.get("LOCALAPPDATA", ""), "KPower", "data", "kpower.db")
if not os.path.isfile(db):
    print(json.dumps({"ok": False, "message": "kpower.db not found", "db": db}))
    sys.exit(0)

con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")]
summary = {}
for t in tables:
    try:
        n = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
        cols = [c[1] for c in con.execute(f'PRAGMA table_info("{t}")')]
        summary[t] = {"rows": n, "cols": cols}
    except Exception as e:
        summary[t] = {"error": str(e)}


def parse_at(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        # Heuristic: seconds vs ms
        return int(val if val > 1e12 else val * 1000)
    if isinstance(val, str):
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                return int(datetime.strptime(val[:19], fmt).timestamp() * 1000)
            except Exception:
                pass
        try:
            return int(datetime.fromisoformat(val.replace(" ", "T")).timestamp() * 1000)
        except Exception:
            return None
    return None


samples = []
if "device_data" in tables:
    cols = [c[1] for c in con.execute('PRAGMA table_info("device_data")')]
    rows = con.execute("SELECT * FROM device_data ORDER BY id ASC").fetchall()
    for row in rows:
        rec = dict(zip(cols, row))
        at = parse_at(rec.get("dateTime"))
        if at is None:
            continue

        def f(*names, default=0.0):
            for n in names:
                if n in rec and isinstance(rec[n], (int, float)):
                    return float(rec[n])
            return default

        samples.append(
            {
                "at": at,
                "loadPercent": f("load"),
                "batteryPercent": 0,  # stock table stores battVol (V), not capacity %
                "inputVoltage": f("inputVol"),
                "outputVoltage": f("outputVol"),
                "connected": True,
                "mode": "line",
                "sourceTable": "device_data",
                "batteryVoltage": f("battVol"),
                "temperatureC": f("temperature"),
                "frequency": f("inputFreq"),
            }
        )

con.close()
print(
    json.dumps(
        {"ok": True, "db": db, "tables": summary, "samples": samples[-2000:]},
        default=str,
    )
)
