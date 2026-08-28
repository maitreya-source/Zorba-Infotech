import requests
import json
import re
import xml.etree.ElementTree as ET

KEY = "fS2DEpX7qMPvtd7mUEoQ8obRRrPZp4nARXDfkyoXWFN3hzkvtRh27Vs4Xzk6zz5mDWscr3rxteuoJbxb3tGdT1jiKPgyb7mbSrPe8pWVIUofFaSWkPCpfmJmNaaI5TlS"
headers = {"X-Zorba-Sync-Key": KEY}

r = requests.get("https://zorba-tally-gateway-703650129045.asia-south1.run.app/api/tally/preview-latest", headers=headers)
data = r.json()

raw_dumps = {}
for p in data.get("samplePreview", []):
    if p.get("key") == "rawXmlDumps":
        raw_dumps = p.get("value", {})
        break

stock_xml = raw_dumps.get("stockItems", "")
print(f"Stock Items XML Length: {len(stock_xml)} characters")

# Sanitize invalid XML entity control characters: &#1; to &#31; (except 9, 10, 13)
cleaned_xml = re.sub(r'&#(?:[0-8]|1[1-2]|1[4-9]|2[0-9]|3[0-1]);', '', stock_xml)

root = ET.fromstring(cleaned_xml)
items = root.findall(".//COLLECTION/STOCKITEM")
print(f"\n🎉 Successfully parsed {len(items)} Stock Items from Tally!")

parsed_items = []
for it in items:
    name = it.attrib.get("NAME") or (it.findtext("NAME") or "").strip()
    parent = (it.findtext("PARENT") or "").strip()
    category = (it.findtext("CATEGORY") or "").strip()
    uom = (it.findtext("BASEUNITS") or "").strip()
    closing_bal = (it.findtext("CLOSINGBALANCE") or "").strip()
    closing_rate = (it.findtext("CLOSINGRATE") or "").strip()
    closing_val = (it.findtext("CLOSINGVALUE") or "").strip()
    part_no = (it.findtext("PARTNO") or "").strip()
    hsn = (it.findtext("HSNCODE") or "").strip()
    guid = (it.findtext("GUID") or "").strip()
    
    parsed_items.append({
        "name": name,
        "parent": parent,
        "category": category,
        "uom": uom,
        "closingBalance": closing_bal,
        "closingRate": closing_rate,
        "closingValue": closing_val,
        "partNo": part_no,
        "hsn": hsn,
        "guid": guid
    })

print("\n--- First 25 Stock Items from Shop Database ---")
for idx, p in enumerate(parsed_items[:25]):
    print(f"[{idx+1:02d}] {p['name']}")
    print(f"     Group: {p['parent']} | Balance: {p['closingBalance']} | Rate: {p['closingRate']} | Value: {p['closingValue']} | HSN: {p['hsn']}")

# Save to cleaned JSON file for our catalog matching!
with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_stock_dump.json", "w") as f:
    json.dump(parsed_items, f, indent=2)

print(f"\n💾 Saved all {len(parsed_items)} live items to tally_live_stock_dump.json")
