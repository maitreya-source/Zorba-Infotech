import json
import os
import subprocess

with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/firestore_audit_dump.json", "r") as f:
    audit = json.load(f)

cols = audit.get("collections", {})
print(f"Total Collections in Firestore: {len(cols)}\n")

# Check usage of each collection in codebase (src/, functions/, etc.)
results = []

for col_name, info in sorted(cols.items()):
    doc_count = info.get("documentCount", 0)
    field_count = info.get("fieldCount", 0)
    fields = info.get("fields", [])
    
    # Grep in codebase
    grep_cmd = f"rg -w '{col_name}' /usr/local/google/home/maitreyam/personal/zorba/src /usr/local/google/home/maitreyam/personal/zorba/functions/src /usr/local/google/home/maitreyam/personal/zorba/firestore.rules --count-matches"
    try:
        grep_out = subprocess.check_output(grep_cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        match_count = sum(int(line.split(":")[-1]) for line in grep_out.strip().split("\n") if line)
    except:
        match_count = 0

    status = "🟢 ACTIVE / IN-USE" if match_count > 0 else "🔴 UNUSED / OBSOLETE"
    if col_name in ["backups", "tally_inspection_snapshots", "tally_stock_snapshots", "tally_snapshots"]:
        status = "🟡 SYSTEM / BACKUP / SNAPSHOT"

    results.append({
        "collection": col_name,
        "documentCount": doc_count,
        "fieldCount": field_count,
        "codeReferences": match_count,
        "status": status,
        "sampleFields": fields[:6]
    })

print(f"{'COLLECTION':30s} | {'DOCS':7s} | {'FIELDS':6s} | {'CODE REFS':9s} | {'STATUS'}")
print("-" * 85)
for r in results:
    print(f"{r['collection']:30s} | {str(r['documentCount']):7s} | {str(r['fieldCount']):6s} | {str(r['codeReferences']):9s} | {r['status']}")

print("\n--- DETAILED COLLECTION BREAKDOWN ---")
for r in results:
    print(f"\n📁 Collection: {r['collection']} (Docs: {r['documentCount']}, Refs: {r['codeReferences']}, Status: {r['status']})")
    print(f"   Fields: {r['sampleFields']}")
    # Show sample doc if available
    samples = audit["collections"][r['collection']].get("samples", [])
    if samples:
        print(f"   Sample Doc ID: {samples[0]['id']}")
        print(f"   Sample Data: {json.dumps(samples[0].get('sample', {}), indent=2)}")

