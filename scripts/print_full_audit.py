import json
import subprocess

with open("/usr/local/google/home/maitreyam/personal/zorba/scripts/firestore_audit_dump.json", "r") as f:
    audit = json.load(f)

cols = audit.get("collections", {})

print(f"{'#':2s} | {'COLLECTION NAME':30s} | {'DOCS':7s} | {'FIELDS':6s} | {'SRC REFS':8s} | {'CLASSIFICATION'}")
print("=" * 95)

idx = 0
for col_name, info in sorted(cols.items()):
    idx += 1
    doc_count = info.get("documentCount", 0)
    field_count = info.get("fieldCount", 0)
    
    # Grep across whole repo
    grep_cmd = f"rg -w '{col_name}' /usr/local/google/home/maitreyam/personal/zorba/src /usr/local/google/home/maitreyam/personal/zorba/functions/src /usr/local/google/home/maitreyam/personal/zorba/firestore.rules --count-matches"
    try:
        grep_out = subprocess.check_output(grep_cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        match_count = sum(int(line.split(":")[-1]) for line in grep_out.strip().split("\n") if line)
    except:
        match_count = 0

    # Also check without exact word match or with camelCase
    # Check what files reference it
    find_cmd = f"rg '{col_name}' /usr/local/google/home/maitreyam/personal/zorba/src /usr/local/google/home/maitreyam/personal/zorba/functions/src -l"
    try:
        files = subprocess.check_output(find_cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip().split("\n")
        files = [f.split("/")[-1] for f in files if f]
    except:
        files = []

    print(f"{idx:2d} | {col_name:30s} | {str(doc_count):7s} | {str(field_count):6s} | {str(match_count):8s} | Files: {files[:3]}")

