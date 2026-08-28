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

ledger_xml = raw_dumps.get("ledgers", "")
print(f"Raw Ledgers XML Length: {len(ledger_xml)} characters")

# Sanitize invalid XML entity control characters: &#1; to &#31;
cleaned_xml = re.sub(r'&#(?:[0-8]|1[1-2]|1[4-9]|2[0-9]|3[0-1]);', '', ledger_xml)

root = ET.fromstring(cleaned_xml)
ledgers = root.findall(".//COLLECTION/LEDGER")
print(f"\n🎉 Successfully parsed {len(ledgers)} Ledgers from Tally!")

parsed_ledgers = []
debtors = []
creditors = []
banks = []
cash = []
expenses = []
other = []

for l in ledgers:
    name = l.attrib.get("NAME") or (l.findtext("NAME") or "").strip()
    parent = (l.findtext("PARENT") or "").strip()
    closing = (l.findtext("CLOSINGBALANCE") or "0").strip()
    opening = (l.findtext("OPENINGBALANCE") or "0").strip()
    gstin = (l.findtext("GSTIN") or (l.findtext("PARTYGSTIN") or "")).strip()
    guid = (l.findtext("GUID") or "").strip()
    
    # Parse balance number
    bal_num = 0.0
    bal_match = re.search(r"[-+]?\d*\.?\d+", closing.replace(",", ""))
    if bal_match:
        try:
            bal_num = float(bal_match.group(0))
        except:
            bal_num = 0.0

    ledger_obj = {
        "name": name,
        "parentGroup": parent,
        "closingBalance": closing,
        "closingBalanceNum": bal_num,
        "openingBalance": opening,
        "gstin": gstin,
        "guid": guid
    }
    parsed_ledgers.append(ledger_obj)
    
    parent_lower = parent.lower()
    if "debtor" in parent_lower or "customer" in parent_lower:
        debtors.append(ledger_obj)
    elif "creditor" in parent_lower or "supplier" in parent_lower:
        creditors.append(ledger_obj)
    elif "bank" in parent_lower:
        banks.append(ledger_obj)
    elif "cash" in parent_lower:
        cash.append(ledger_obj)
    elif "expense" in parent_lower or "exp" in parent_lower or "purchase" in parent_lower or "sale" in parent_lower:
        expenses.append(ledger_obj)
    else:
        other.append(ledger_obj)

print("\n=== LEDGER GROUP BREAKDOWN ===")
print(f"  • Total Ledgers / Accounts : {len(parsed_ledgers)}")
print(f"  • Sundry Debtors (Customers): {len(debtors)}")
print(f"  • Sundry Creditors (Vendors/Suppliers): {len(creditors)}")
print(f"  • Bank Accounts: {len(banks)}")
print(f"  • Cash Accounts: {len(cash)}")
print(f"  • Direct/Indirect Expenses & Sales/Purchase: {len(expenses)}")
print(f"  • Other / Capital / Fixed Asset Ledgers: {len(other)}")

print("\n--- Sample Customers (Sundry Debtors) ---")
for idx, d in enumerate(debtors[:10]):
    print(f"  [{idx+1:02d}] {d['name']:40s} | Outstanding Balance: {d['closingBalance']:15s} | GSTIN: {d['gstin']}")

print("\n--- Sample Suppliers / Vendors (Sundry Creditors) ---")
for idx, c in enumerate(creditors[:10]):
    print(f"  [{idx+1:02d}] {c['name']:40s} | Outstanding Balance: {c['closingBalance']:15s} | GSTIN: {c['gstin']}")

# Save all parsed ledgers to JSON file
with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_ledgers_dump.json", "w") as f:
    json.dump(parsed_ledgers, f, indent=2)

print(f"\n💾 Saved all {len(parsed_ledgers)} ledgers to tally_live_ledgers_dump.json")
