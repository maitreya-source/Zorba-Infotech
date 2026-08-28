const { initializeApp } = require('/usr/local/google/home/maitreyam/personal/zorba/functions/node_modules/firebase-admin/app');
const { getFirestore } = require('/usr/local/google/home/maitreyam/personal/zorba/functions/node_modules/firebase-admin/firestore');
const fs = require('fs');

initializeApp({ projectId: 'zorba-infotech-web' });
const db = getFirestore();

async function runAudit() {
  console.log('Connecting to Firestore (zorba-infotech-web)...');
  const collections = await db.listCollections();
  console.log(`Found ${collections.length} root collections.\n`);

  const report = {
    projectId: 'zorba-infotech-web',
    timestamp: new Date().toISOString(),
    totalCollections: collections.length,
    collections: {},
  };

  for (const col of collections) {
    const colId = col.id;
    console.log(`Scanning collection: '${colId}'...`);

    const snapshot = await col.limit(300).get();
    const count = snapshot.size;

    const sampleDocs = [];
    const fieldSet = new Set();

    let docIdx = 0;
    snapshot.forEach((doc) => {
      docIdx++;
      const data = doc.data();
      Object.keys(data).forEach((k) => fieldSet.add(k));

      if (docIdx <= 5) {
        const previewValues = {};
        for (const [k, v] of Object.entries(data).slice(0, 10)) {
          previewValues[k] =
            typeof v === 'string' && v.length > 80
              ? v.slice(0, 80) + '...'
              : v;
        }
        sampleDocs.push({
          id: doc.id,
          fieldCount: Object.keys(data).length,
          fields: Object.keys(data),
          sample: previewValues,
        });
      }
    });

    let totalDocsCount = count;
    if (count === 300) {
      try {
        const countSnap = await col.count().get();
        totalDocsCount = countSnap.data().count;
      } catch {
        totalDocsCount = '>= 300';
      }
    }

    console.log(
      `  -> Collection '${colId}': ${totalDocsCount} documents. Fields (${fieldSet.size}): ${Array.from(fieldSet).slice(0, 8).join(', ')}`
    );

    report.collections[colId] = {
      documentCount: totalDocsCount,
      fieldCount: fieldSet.size,
      fields: Array.from(fieldSet),
      samples: sampleDocs,
    };
  }

  const outPath = '/usr/local/google/home/maitreyam/personal/zorba/scripts/firestore_audit_dump.json';
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Firestore Audit Complete. Detailed JSON saved to ${outPath}`);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
