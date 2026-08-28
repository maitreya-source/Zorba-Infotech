import requests
import json

KEY = "fS2DEpX7qMPvtd7mUEoQ8obRRrPZp4nARXDfkyoXWFN3hzkvtRh27Vs4Xzk6zz5mDWscr3rxteuoJbxb3tGdT1jiKPgyb7mbSrPe8pWVIUofFaSWkPCpfmJmNaaI5TlS"
headers = {"X-Zorba-Sync-Key": KEY}

snap_id = "snap_20260827_163651_941592"
url = f"https://zorba-tally-gateway-703650129045.asia-south1.run.app/api/tally/snapshot?id={snap_id}"
print(f"Fetching specific snapshot: {snap_id} from {url}")

r = requests.get(url, headers=headers, timeout=60)
print("HTTP Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    print("Snapshot ID:", data.get("id"))
    print("Received At:", data.get("receivedAt"))
    print("Content Length:", data.get("contentLength"), "bytes (~", round(data.get("contentLength", 0)/(1024*1024), 2), "MB)")
    print("User Agent:", data.get("userAgent"))
    
    parsed = data.get("parsedData")
    if isinstance(parsed, dict):
        print("\n--- Summary Counts ---")
        print(json.dumps(parsed.get("summary"), indent=2))
        
        print("\n--- Active Company & Companies List ---")
        print("Active Company:", parsed.get("activeCompany"))
        for c in parsed.get("companies", []):
            print("  Company:", c)
            
        print("\n--- Sample Stock Items ---")
        items = parsed.get("items", [])
        print(f"Total Stock Items in Payload: {len(items)}")
        for it in items[:15]:
            name = it.get("tallyName")
            qty = it.get("closingBalance")
            uom = it.get("uom")
            rate = it.get("rate")
            val = it.get("value")
            grp = it.get("parentGroup")
            hsn = it.get("hsnCode")
            print(f"  • [{name}] Qty: {qty} {uom} | Rate: Rs.{rate} | Value: Rs.{val} | Group: {grp} | HSN: {hsn}")
            
        print("\n--- Stock Groups ---")
        groups = parsed.get("stockGroups", [])
        print(f"Total Stock Groups: {len(groups)}")
        for g in groups[:15]:
            print(f"  • {g.get('name')} (Parent: {g.get('parent')})")
            
        print("\n--- Units ---")
        for u in parsed.get("units", []):
            print(f"  • {u.get('name')}")
            
        print("\n--- Godowns ---")
        for gd in parsed.get("godowns", []):
            print(f"  • {gd.get('name')} (Extra: {gd.get('extraDetail')})")
            
        print("\n--- Sample Ledgers ---")
        ledgers = parsed.get("ledgers", [])
        print(f"Total Ledgers: {len(ledgers)}")
        for l in ledgers[:15]:
            print(f"  • {l.get('name')} | Bal: {l.get('balance')} | Extra: {l.get('extraDetail')}")
            
    else:
        raw = data.get("rawData", "")
        print("Raw Data length:", len(raw))
        print("Raw Data preview:\n", raw[:1500])
else:
    print("Response text:", r.text[:500])
