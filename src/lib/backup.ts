import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { cleanFirestoreData, formatFirebaseError } from "./firestore";

export interface BackupMetadata {
  version: string;
  createdAt: number;
  createdAtISO: string;
  exportedBy?: string;
  environment: string;
  counts: {
    categories: number;
    products: number;
    customers: number;
    team_members: number;
    service_centers: number;
    couriers: number;
    device_models: number;
    spare_parts: number;
    service_calls: number;
    financial_years: number;
    counters: number;
    admins: number;
    totalDocuments: number;
  };
}

export interface FullDatabaseBackup {
  metadata: BackupMetadata;
  data: {
    categories: Array<{ id: string; [key: string]: any }>;
    products: Array<{ id: string; [key: string]: any }>;
    customers: Array<{ id: string; [key: string]: any }>;
    team_members: Array<{ id: string; [key: string]: any }>;
    service_centers: Array<{ id: string; [key: string]: any }>;
    couriers: Array<{ id: string; [key: string]: any }>;
    device_models: Array<{ id: string; [key: string]: any }>;
    spare_parts: Array<{ id: string; [key: string]: any }>;
    service_calls: Array<{ id: string; [key: string]: any }>;
    hierarchicalServiceCalls: Array<{ id: string; fyId: string; monthKey: string; data: any }>;
    financial_years: Array<{ id: string; [key: string]: any }>;
    counters: Array<{ id: string; [key: string]: any }>;
    admins: Array<{ id: string; [key: string]: any }>;
  };
}

export interface CloudSnapshot {
  id: string;
  createdAt: number;
  createdAtISO: string;
  exportedBy: string;
  totalDocuments: number;
  summary: {
    serviceCalls: number;
    customers: number;
    products: number;
    categories: number;
    teamMembers: number;
  };
  backupData?: FullDatabaseBackup;
}

export interface RestoreProgress {
  currentCollection: string;
  processedDocs: number;
  totalDocs: number;
  percent: number;
  status: "idle" | "restoring" | "completed" | "error";
  error?: string;
}

// ─── Export & Backup Generator ────────────────────────────────────────────────

export async function createFullDatabaseBackup(exportedBy?: string): Promise<FullDatabaseBackup> {
  const fetchCol = async (colName: string) => {
    try {
      const snap = await getDocs(collection(db, colName));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  };

  // 1. Fetch Top-Level Collections concurrently
  const [
    categories,
    products,
    customers,
    team_members,
    service_centers,
    couriers,
    device_models,
    spare_parts,
    service_calls,
    financial_years,
    counters,
    admins,
  ] = await Promise.all([
    fetchCol("categories"),
    fetchCol("products"),
    fetchCol("customers"),
    fetchCol("team_members"),
    fetchCol("service_centers"),
    fetchCol("couriers"),
    fetchCol("device_models"),
    fetchCol("spare_parts"),
    fetchCol("service_calls"),
    fetchCol("financial_years"),
    fetchCol("counters"),
    fetchCol("admins"),
  ]);

  // 2. Fetch Hierarchical subcollection service_calls via collectionGroup
  let hierarchicalServiceCalls: Array<{ id: string; fyId: string; monthKey: string; data: any }> = [];
  try {
    const cgSnap = await getDocs(collectionGroup(db, "service_calls"));
    hierarchicalServiceCalls = cgSnap.docs
      .map((d) => {
        const pathSegments = d.ref.path.split("/");
        // Format: financial_years/{fyId}/months/{monthKey}/service_calls/{id}
        if (pathSegments.length >= 6 && pathSegments[0] === "financial_years") {
          return {
            id: d.id,
            fyId: pathSegments[1],
            monthKey: pathSegments[3],
            data: d.data(),
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  } catch (err) {
    console.warn("Could not fetch hierarchical service calls via collectionGroup:", err);
  }

  const now = Date.now();
  const counts = {
    categories: categories.length,
    products: products.length,
    customers: customers.length,
    team_members: team_members.length,
    service_centers: service_centers.length,
    couriers: couriers.length,
    device_models: device_models.length,
    spare_parts: spare_parts.length,
    service_calls: service_calls.length,
    financial_years: financial_years.length,
    counters: counters.length,
    admins: admins.length,
    totalDocuments:
      categories.length +
      products.length +
      customers.length +
      team_members.length +
      service_centers.length +
      couriers.length +
      device_models.length +
      spare_parts.length +
      service_calls.length +
      financial_years.length +
      counters.length +
      admins.length,
  };

  const backup: FullDatabaseBackup = {
    metadata: {
      version: "2.0.0",
      createdAt: now,
      createdAtISO: new Date(now).toISOString(),
      exportedBy: exportedBy || "Admin User",
      environment: "production",
      counts,
    },
    data: {
      categories,
      products,
      customers,
      team_members,
      service_centers,
      couriers,
      device_models,
      spare_parts,
      service_calls,
      hierarchicalServiceCalls,
      financial_years,
      counters,
      admins,
    },
  };

  return backup;
}

// ─── Browser Download Helper ──────────────────────────────────────────────────

export function downloadBackupAsJson(backup: FullDatabaseBackup, filename?: string) {
  const dateStr = new Date(backup.metadata.createdAt)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const actualFilename = filename || `zorba-erp-backup-${dateStr}.json`;

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = actualFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Cloud Snapshot Storage ───────────────────────────────────────────────────

export async function saveSnapshotToCloud(backup: FullDatabaseBackup): Promise<string> {
  const snapshotId = `snapshot-${backup.metadata.createdAt}`;
  const docRef = doc(db, "backups", snapshotId);

  const snapshotDoc: CloudSnapshot = {
    id: snapshotId,
    createdAt: backup.metadata.createdAt,
    createdAtISO: backup.metadata.createdAtISO,
    exportedBy: backup.metadata.exportedBy || "Admin User",
    totalDocuments: backup.metadata.counts.totalDocuments,
    summary: {
      serviceCalls: backup.metadata.counts.service_calls,
      customers: backup.metadata.counts.customers,
      products: backup.metadata.counts.products,
      categories: backup.metadata.counts.categories,
      teamMembers: backup.metadata.counts.team_members,
    },
    backupData: backup,
  };

  await setDoc(docRef, cleanFirestoreData(snapshotDoc));
  return snapshotId;
}

export async function getCloudSnapshots(): Promise<CloudSnapshot[]> {
  try {
    const q = query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CloudSnapshot);
  } catch (err: any) {
    console.error("getCloudSnapshots error:", err);
    return [];
  }
}

export async function deleteCloudSnapshot(id: string): Promise<void> {
  await deleteDoc(doc(db, "backups", id));
}

// ─── Restore Engine ───────────────────────────────────────────────────────────

export async function restoreDatabaseFromBackup(
  backup: FullDatabaseBackup,
  options?: {
    onProgress?: (progress: RestoreProgress) => void;
  }
): Promise<{ restoredCount: number; errors: string[] }> {
  if (!backup || !backup.data || !backup.metadata) {
    throw new Error("Invalid backup format. Missing 'metadata' or 'data' payload.");
  }

  const { data } = backup;
  const errors: string[] = [];
  let processed = 0;

  // Calculate total documents to restore
  const totalDocs =
    (data.categories?.length || 0) +
    (data.products?.length || 0) +
    (data.customers?.length || 0) +
    (data.team_members?.length || 0) +
    (data.service_centers?.length || 0) +
    (data.couriers?.length || 0) +
    (data.device_models?.length || 0) +
    (data.spare_parts?.length || 0) +
    (data.service_calls?.length || 0) +
    (data.hierarchicalServiceCalls?.length || 0) +
    (data.financial_years?.length || 0) +
    (data.counters?.length || 0) +
    (data.admins?.length || 0);

  const reportProgress = (colName: string) => {
    if (options?.onProgress) {
      options.onProgress({
        currentCollection: colName,
        processedDocs: processed,
        totalDocs: Math.max(totalDocs, 1),
        percent: Math.min(100, Math.round((processed / Math.max(totalDocs, 1)) * 100)),
        status: "restoring",
      });
    }
  };

  // Helper to commit in batches of 400 (Firestore limit is 500)
  const commitBatchList = async (
    items: Array<{ id: string; [key: string]: any }>,
    colName: string
  ) => {
    if (!items || items.length === 0) return;
    reportProgress(colName);

    const BATCH_SIZE = 400;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const { id, ...docData } = item;
        if (!id) continue;
        const docRef = doc(db, colName, id);
        batch.set(docRef, cleanFirestoreData({ id, ...docData }), { merge: true });
      }

      try {
        await batch.commit();
        processed += chunk.length;
        reportProgress(colName);
      } catch (err: any) {
        console.error(`Batch commit error on collection ${colName}:`, err);
        errors.push(`Error on ${colName} batch: ${err?.message || String(err)}`);
      }
    }
  };

  try {
    // 1. Categories
    await commitBatchList(data.categories, "categories");

    // 2. Products
    await commitBatchList(data.products, "products");

    // 3. Customers
    await commitBatchList(data.customers, "customers");

    // 4. Team Members
    await commitBatchList(data.team_members, "team_members");

    // 5. Service Centers
    await commitBatchList(data.service_centers, "service_centers");

    // 6. Couriers
    await commitBatchList(data.couriers, "couriers");

    // 7. Device Models & Spare Parts
    await commitBatchList(data.device_models, "device_models");
    await commitBatchList(data.spare_parts, "spare_parts");

    // 8. Financial Years
    await commitBatchList(data.financial_years, "financial_years");

    // 9. Top-Level Service Calls
    await commitBatchList(data.service_calls, "service_calls");

    // 10. Hierarchical Subcollection Service Calls
    if (data.hierarchicalServiceCalls && data.hierarchicalServiceCalls.length > 0) {
      reportProgress("hierarchical_service_calls");
      const BATCH_SIZE = 400;
      for (let i = 0; i < data.hierarchicalServiceCalls.length; i += BATCH_SIZE) {
        const chunk = data.hierarchicalServiceCalls.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          if (!item.id || !item.fyId || !item.monthKey) continue;
          const subDocRef = doc(
            db,
            "financial_years",
            item.fyId,
            "months",
            item.monthKey,
            "service_calls",
            item.id
          );
          batch.set(subDocRef, cleanFirestoreData({ id: item.id, ...item.data }), { merge: true });
        }

        try {
          await batch.commit();
          processed += chunk.length;
          reportProgress("hierarchical_service_calls");
        } catch (err: any) {
          console.error("Batch error on hierarchical service calls:", err);
          errors.push(`Error on subcollection service calls: ${err?.message || String(err)}`);
        }
      }
    }

    // 11. Counters & Admins
    await commitBatchList(data.counters, "counters");
    await commitBatchList(data.admins, "admins");

    if (options?.onProgress) {
      options.onProgress({
        currentCollection: "All Collections",
        processedDocs: processed,
        totalDocs,
        percent: 100,
        status: "completed",
      });
    }

    return { restoredCount: processed, errors };
  } catch (err: any) {
    if (options?.onProgress) {
      options.onProgress({
        currentCollection: "Error",
        processedDocs: processed,
        totalDocs,
        percent: Math.min(100, Math.round((processed / Math.max(totalDocs, 1)) * 100)),
        status: "error",
        error: err?.message || String(err),
      });
    }
    throw new Error(formatFirebaseError(err));
  }
}
