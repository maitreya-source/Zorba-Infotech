import json
import re

with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_ledgers_dump.json", "r") as f:
    ledgers = json.load(f)

# Customer parent group keywords / codes
# In Zorba's Tally, geographic codes like "2314-N O R T H", "Neemuch", "Sundry Debtors", "Customer", etc. are used.
def is_customer(l):
    parent = l.get("parentGroup", "").lower()
    name = l.get("name", "").lower()
    
    # Exclude typical fixed assets / bank / cash / supplier / tax
    if any(x in parent for x in ["fixed asset", "bank", "cash", "creditor", "tax", "duty", "expense", "capital", "indirect", "direct"]):
        return False
    if any(x in parent for x in ["debtor", "customer", "north", "south", "east", "west", "city", "neemuch", "mandsaur", "manasa", "jawad", "singoli", "rampura", "ratlam"]):
        return True
    # Default to debtors if under Sundry Debtors
    return "debtor" in parent

customers = [l for l in ledgers if is_customer(l)]

def parse_bal(b_str):
    if not b_str:
        return 0.0, "None"
    b_str = b_str.strip()
    match = re.search(r"[-+]?\d*\.?\d+", b_str.replace(",", ""))
    val = float(match.group(0)) if match else 0.0
    bal_type = "Cr" if "Cr" in b_str or "-" in b_str else "Dr"
    return abs(val), bal_type, val

customers_with_dr = [] # Receivables (they owe us money)
customers_with_cr = [] # Advance payments (we owe them goods/money)
customers_zero = []

total_receivable = 0.0
total_advance = 0.0

for c in customers:
    mag, b_type, raw_val = parse_bal(c.get("closingBalance", "0"))
    c["balanceMagnitude"] = mag
    c["balanceType"] = b_type
    
    if raw_val > 0: # Positive in Tally = Debit (Receivable)
        customers_with_dr.append(c)
        total_receivable += mag
    elif raw_val < 0: # Negative in Tally = Credit (Advance / Credit balance)
        customers_with_cr.append(c)
        total_advance += mag
    else:
        customers_zero.append(c)

customers_with_dr.sort(key=lambda x: x["balanceMagnitude"], reverse=True)
customers_with_cr.sort(key=lambda x: x["balanceMagnitude"], reverse=True)

# Group by geographic/customer groups
cust_groups = {}
for c in customers:
    grp = c.get("parentGroup", "Unknown")
    cust_groups[grp] = cust_groups.get(grp, 0) + 1

print(f"Total Identified Customers in Database: {len(customers)}")
print(f"Customers with Active Outstanding Balances (Receivables): {len(customers_with_dr)}")
print(f"Total Outstanding Amount Receivable: ₹{total_receivable:,.2f}")
print(f"Customers with Advance/Credit Balances: {len(customers_with_cr)}")
print(f"Total Advance/Credit Amount: ₹{total_advance:,.2f}")
print(f"Customers with Zero Balance (Past/Walk-in): {len(customers_zero)}")

print("\n--- Top 15 Customer Regional Groups in Tally ---")
for grp, cnt in sorted(cust_groups.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f"  • {grp:45s} : {cnt} customers")

print("\n--- Top 15 Customers with Outstanding Receivables ---")
for idx, c in enumerate(customers_with_dr[:15]):
    print(f"  [{idx+1:02d}] {c['name']:42s} | Group: {c['parentGroup']:30s} | Outstanding: ₹{c['balanceMagnitude']:10,.2f}")

# Save customers list
with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_customers_dump.json", "w") as f:
    json.dump(customers, f, indent=2)

print(f"\n💾 Saved all {len(customers)} customers to tally_live_customers_dump.json")
