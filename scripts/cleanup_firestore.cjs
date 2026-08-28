const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'zorba-infotech-web' });
const db = getFirestore();

const OBSOLETE_COLLECTIONS = ['staff', 'staff_members', 'technicians'];

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function runCleanup() {
  console.log('=== FIRESTORE OBSOLETE COLLECTION CLEANUP ===\n');

  for (const colName of OBSOLETE_COLLECTIONS) {
    const snap = await db.collection(colName).get();
    console.log(`Deleting obsolete collection '${colName}' (${snap.size} documents)...`);
    await deleteCollection(colName);
    console.log(`  ✅ Successfully deleted collection '${colName}'.`);
  }

  console.log('\n=== RE-SCANNING REMAINING ROOT COLLECTIONS ===');
  const remaining = await db.listCollections();
  console.log(`Total remaining collections: ${remaining.length}`);
  for (const col of remaining) {
    const countSnap = await col.count().get();
    console.log(`  • ${col.id.padEnd(30)} : ${countSnap.data().count} docs`);
  }

  console.log('\n🎉 Firestore cleanup finished successfully.');
}

runCleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
