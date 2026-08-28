import json
import os
import sys
from google.cloud import firestore

PROJECT_ID = "zorba-infotech-web"
print(f"Connecting to Firestore for project: {PROJECT_ID}...")

try:
    db = firestore.Client(project=PROJECT_ID)
except Exception as e:
    print(f"Error initializing Firestore Client: {e}")
    sys.exit(1)

print("Listing all root collections...")
collections = list(db.collections())
print(f"Found {len(collections)} root collections.")

audit_report = {
    "project": PROJECT_ID,
    "totalCollections": len(collections),
    "collections": {}
}

for col in collections:
    col_id = col.id
    print(f"\nScanning collection: '{col_id}'...")
    
    docs_iter = col.limit(500).stream()
    docs_list = []
    
    count = 0
    sample_docs = []
    sample_fields = set()
    
    for doc in docs_iter:
        count += 1
        d_data = doc.to_dict()
        if count <= 5:
            # Store sanitized sample
            sample_docs.append({
                "id": doc.id,
                "fields": list(d_data.keys()),
                "sampleValues": {k: (str(v)[:100] + '...' if len(str(v)) > 100 else v) for k, v in list(d_data.items())[:8]}
            })
        sample_fields.update(d_data.keys())
    
    # If 500 reached, get full aggregation count
    full_count = count
    if count == 500:
        try:
            agg = col.count().get()
            full_count = agg[0][0].value
        except:
            full_count = ">= 500"

    print(f"  • Collection '{col_id}': {full_count} documents. Fields: {list(sample_fields)[:10]}")
    
    audit_report["collections"][col_id] = {
        "documentCount": full_count,
        "distinctFieldNames": list(sample_fields),
        "samples": sample_docs
    }

# Save report
out_path = "/usr/local/google/home/maitreyam/personal/zorba/scripts/firestore_audit_dump.json"
with open(out_path, "w") as f:
    json.dump(audit_report, f, indent=2)

print(f"\n✅ Firestore Audit Complete. Detailed JSON saved to {out_path}")
