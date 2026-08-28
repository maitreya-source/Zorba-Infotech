import json
import re

print("=== SEARCHING FOR 'GOYAL' IN TALLY LEDGERS & CUSTOMERS ===")

with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_ledgers_dump.json", "r") as f:
    ledgers = json.load(f)

goyal_ledgers = [l for l in ledgers if "goyal" in l.get("name", "").lower() or "goyal" in l.get("parentGroup", "").lower()]

print(f"Total Ledgers matching 'Goyal': {len(goyal_ledgers)}")

for idx, g in enumerate(goyal_ledgers):
    print(f"\n[{idx+1:02d}] {g['name']}")
    print(f"     Parent Group    : {g['parentGroup']}")
    print(f"     Closing Balance : {g['closingBalance']} (Num: {g['closingBalanceNum']})")
    print(f"     Opening Balance : {g['openingBalance']}")
    print(f"     GSTIN           : {g['gstin'] if g['gstin'] else 'N/A'}")
    print(f"     GUID            : {g['guid']}")

# Also search in stock items
with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_stock_dump.json", "r") as f:
    stock = json.load(f)

goyal_stock = [s for s in stock if "goyal" in s.get("name", "").lower() or "goyal" in s.get("parent", "").lower()]
print(f"\nTotal Stock Items matching 'Goyal': {len(goyal_stock)}")
for idx, s in enumerate(goyal_stock):
    print(f"  • {s['name']} | Group: {s['parent']} | Balance: {s['closingBalance']}")

# Save matching Goyal records
with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/goyal_records.json", "w") as f:
    json.dump(goyal_ledgers, f, indent=2)

print(f"\n💾 Saved {len(goyal_ledgers)} Goyal records to goyal_records.json")
