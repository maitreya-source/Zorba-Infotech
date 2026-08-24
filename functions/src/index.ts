import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

/**
 * Scheduled Cloud Function: Runs daily at 02:00 AM IST (Asia/Kolkata)
 * Automatically purges soft-deleted tickets that have been in the Trash for more than 90 days.
 */
export const autoPurgeTrashCron = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    memory: "256MiB",
  },
  async () => {
    const RETENTION_DAYS = 90;
    const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    console.log(`[Trash Auto-Purge] Running purge for items deleted before ${new Date(cutoffTime).toISOString()}`);

    try {
      const snap = await db
        .collectionGroup("service_calls")
        .where("isDeleted", "==", true)
        .where("deletedAt", "<=", cutoffTime)
        .limit(500)
        .get();

      if (snap.empty) {
        console.log("[Trash Auto-Purge] No expired trash records found.");
        return;
      }

      const batch = db.batch();
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`[Trash Auto-Purge] Successfully purged ${snap.size} expired records.`);
    } catch (err) {
      console.error("[Trash Auto-Purge] Error executing purge:", err);
      throw err;
    }
  }
);
