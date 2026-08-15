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
  where,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "./firebase";
import { cleanFirestoreData, formatFirebaseError } from "./firestore";
import { validateBackupPayload, type PreFlightValidationReport } from "./backupValidation";

// ─── Authorization Constants & Checkers ───────────────────────────────────────

export const BACKUP_AUTHORIZED_EMAILS = [
  "maitreya.mul@gmail.com",
  "manishm9730@gmail.com",
  "zorbainfotech@gmail.com",
];

export function isBackupDownloadAuthorized(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return BACKUP_AUTHORIZED_EMAILS.includes(clean);
}

export interface BackupScopeOptions {
  fyId?: string; // e.g. "FY2627" or "all"
  monthKey?: string; // e.g. "2026-08" or "all"
  modules?: {
    serviceCalls?: boolean;
    customers?: boolean;
    products?: boolean;
    categories?: boolean;
    teamMembers?: boolean;
    serviceCenters?: boolean;
    couriers?: boolean;
    masterCatalogs?: boolean;
    systemSettings?: boolean;
  };
  exportedBy?: string;
}

export interface BackupMetadata {
  version: string;
  scope: string;
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
  scope: string;
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
  status: "idle" | "validating" | "restoring" | "completed" | "error";
  error?: string;
}

// ─── Paginated Collection Fetcher (Safe for 10k+ documents) ───────────────────

export async function fetchCollectionPaginated(
  colPath: string,
  batchLimit: number = 500
): Promise<Array<{ id: string; [key: string]: any }>> {
  const results: Array<{ id: string; [key: string]: any }> = [];
  try {
    let lastDoc: any = null;
    let hasMore = true;

    while (hasMore) {
      const q = lastDoc
        ? query(collection(db, colPath), startAfter(lastDoc), limit(batchLimit))
        : query(collection(db, colPath), limit(batchLimit));

      const snap = await getDocs(q);
      if (snap.empty) {
        hasMore = false;
        break;
      }

      snap.docs.forEach((d) => {
        results.push({ id: d.id, ...d.data() });
      });

      if (snap.docs.length < batchLimit) {
        hasMore = false;
      } else {
        lastDoc = snap.docs[snap.docs.length - 1];
      }
    }
  } catch (err) {
    console.warn(`Error paginating collection ${colPath}, falling back to single query:`, err);
    try {
      const snap = await getDocs(collection(db, colPath));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }
  return results;
}

// ─── Scoped & Year-Partitioned Backup Generator ───────────────────────────────

export async function createScopedDatabaseBackup(
  options: BackupScopeOptions = {}
): Promise<FullDatabaseBackup> {
  const {
    fyId = "all",
    monthKey = "all",
    modules = {
      serviceCalls: true,
      customers: true,
      products: true,
      categories: true,
      teamMembers: true,
      serviceCenters: true,
      couriers: true,
      masterCatalogs: true,
      systemSettings: true,
    },
    exportedBy = "Super Admin",
  } = options;

  let categories: Array<{ id: string; [key: string]: any }> = [];
  let products: Array<{ id: string; [key: string]: any }> = [];
  let customers: Array<{ id: string; [key: string]: any }> = [];
  let team_members: Array<{ id: string; [key: string]: any }> = [];
  let service_centers: Array<{ id: string; [key: string]: any }> = [];
  let couriers: Array<{ id: string; [key: string]: any }> = [];
  let device_models: Array<{ id: string; [key: string]: any }> = [];
  let spare_parts: Array<{ id: string; [key: string]: any }> = [];
  let service_calls: Array<{ id: string; [key: string]: any }> = [];
  let hierarchicalServiceCalls: Array<{ id: string; fyId: string; monthKey: string; data: any }> = [];
  let financial_years: Array<{ id: string; [key: string]: any }> = [];
  let counters: Array<{ id: string; [key: string]: any }> = [];
  let admins: Array<{ id: string; [key: string]: any }> = [];

  const tasks: Promise<void>[] = [];

  if (modules.categories) tasks.push(fetchCollectionPaginated("categories").then((r) => { categories = r; }));
  if (modules.products) tasks.push(fetchCollectionPaginated("products").then((r) => { products = r; }));
  if (modules.customers) tasks.push(fetchCollectionPaginated("customers").then((r) => { customers = r; }));
  if (modules.teamMembers) tasks.push(fetchCollectionPaginated("team_members").then((r) => { team_members = r; }));
  if (modules.serviceCenters) tasks.push(fetchCollectionPaginated("service_centers").then((r) => { service_centers = r; }));
  if (modules.couriers) tasks.push(fetchCollectionPaginated("couriers").then((r) => { couriers = r; }));
  if (modules.masterCatalogs) {
    tasks.push(fetchCollectionPaginated("device_models").then((r) => { device_models = r; }));
    tasks.push(fetchCollectionPaginated("spare_parts").then((r) => { spare_parts = r; }));
  }
  if (modules.systemSettings) {
    tasks.push(fetchCollectionPaginated("counters").then((r) => { counters = r; }));
    tasks.push(fetchCollectionPaginated("admins").then((r) => { admins = r; }));
  }

  // Handle Service Calls & Financial Years
  if (modules.serviceCalls) {
    tasks.push(
      (async () => {
        if (fyId === "all") {
          financial_years = await fetchCollectionPaginated("financial_years");
          service_calls = await fetchCollectionPaginated("service_calls");
          try {
            const cgSnap = await getDocs(collectionGroup(db, "service_calls"));
            hierarchicalServiceCalls = cgSnap.docs
              .map((d) => {
                const parts = d.ref.path.split("/");
                if (parts.length >= 6 && parts[0] === "financial_years") {
                  return { id: d.id, fyId: parts[1], monthKey: parts[3], data: d.data() };
                }
                return null;
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);
          } catch (err) {
            console.warn("CollectionGroup error:", err);
          }
        } else {
          // Specific FY / Month scope
          try {
            const fyDoc = await getDocs(query(collection(db, "financial_years"), where("id", "==", fyId)));
            financial_years = fyDoc.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch {}

          if (monthKey !== "all") {
            const path = `financial_years/${fyId}/months/${monthKey}/service_calls`;
            const monthCalls = await fetchCollectionPaginated(path);
            hierarchicalServiceCalls = monthCalls.map((c) => ({
              id: c.id,
              fyId,
              monthKey,
              data: c,
            }));
            service_calls = monthCalls;
          } else {
            // All months for specific FY
            const cgSnap = await getDocs(collectionGroup(db, "service_calls"));
            hierarchicalServiceCalls = cgSnap.docs
              .map((d) => {
                const parts = d.ref.path.split("/");
                if (parts.length >= 6 && parts[0] === "financial_years" && parts[1] === fyId) {
                  return { id: d.id, fyId: parts[1], monthKey: parts[3], data: d.data() };
                }
                return null;
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);
            service_calls = hierarchicalServiceCalls.map((h) => ({ id: h.id, ...h.data }));
          }
        }
      })()
    );
  }

  await Promise.all(tasks);

  const now = Date.now();
  const scopeDescription =
    fyId !== "all"
      ? `Financial Year: ${fyId} ${monthKey !== "all" ? `(${monthKey})` : ""}`
      : "Complete Database Scope";

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

  return {
    metadata: {
      version: "2.1.0",
      scope: scopeDescription,
      createdAt: now,
      createdAtISO: new Date(now).toISOString(),
      exportedBy,
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
}

export const createFullDatabaseBackup = (exportedBy?: string) =>
  createScopedDatabaseBackup({ fyId: "all", exportedBy });

// ─── File Download Helper ─────────────────────────────────────────────────────

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
    scope: backup.metadata.scope || "Full Database",
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
    const q = query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(25));
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

// ─── Pre-Restore Automatic Rollback Checkpoint ────────────────────────────────

export async function createPreRestoreRollbackSnapshot(adminEmail?: string): Promise<string> {
  const currentBackup = await createFullDatabaseBackup(adminEmail || "Auto-Rollback Guard");
  const rollbackId = `rollback-pre-restore-${Date.now()}`;
  const docRef = doc(db, "backups", rollbackId);

  const snapshotDoc: CloudSnapshot = {
    id: rollbackId,
    createdAt: currentBackup.metadata.createdAt,
    createdAtISO: currentBackup.metadata.createdAtISO,
    exportedBy: "System (Automatic Pre-Restore Checkpoint)",
    scope: "Automatic Safety Rollback Guard",
    totalDocuments: currentBackup.metadata.counts.totalDocuments,
    summary: {
      serviceCalls: currentBackup.metadata.counts.service_calls,
      customers: currentBackup.metadata.counts.customers,
      products: currentBackup.metadata.counts.products,
      categories: currentBackup.metadata.counts.categories,
      teamMembers: currentBackup.metadata.counts.team_members,
    },
    backupData: currentBackup,
  };

  await setDoc(docRef, cleanFirestoreData(snapshotDoc));
  return rollbackId;
}

// ─── Resilient Restore Engine with Pre-Flight Schema Filtering ─────────────────

export async function restoreDatabaseFromBackup(
  backup: FullDatabaseBackup,
  options?: {
    skipInvalid?: boolean;
    createRollbackPoint?: boolean;
    adminEmail?: string;
    onProgress?: (progress: RestoreProgress) => void;
  }
): Promise<{
  restoredCount: number;
  skippedCount: number;
  rollbackSnapshotId?: string;
  errors: string[];
  validationReport: PreFlightValidationReport;
}> {
  if (!backup || !backup.data || !backup.metadata) {
    throw new Error("Invalid backup format. Missing 'metadata' or 'data' payload.");
  }

  // 1. Run Pre-Flight Validation Pass
  if (options?.onProgress) {
    options.onProgress({
      currentCollection: "Validating Schemas",
      processedDocs: 0,
      totalDocs: backup.metadata.counts.totalDocuments,
      percent: 0,
      status: "validating",
    });
  }

  const validationReport = validateBackupPayload(backup);

  if (!validationReport.isValid && !options?.skipInvalid) {
    throw new Error(
      `Backup contains ${validationReport.invalidCount} malformed or invalid records. Enable 'Skip Invalid Records' to proceed or correct the file.`
    );
  }

  // 2. Create Automatic Rollback Snapshot before making changes
  let rollbackSnapshotId: string | undefined;
  if (options?.createRollbackPoint !== false) {
    if (options?.onProgress) {
      options.onProgress({
        currentCollection: "Creating Safety Rollback Snapshot",
        processedDocs: 0,
        totalDocs: backup.metadata.counts.totalDocuments,
        percent: 5,
        status: "restoring",
      });
    }
    try {
      rollbackSnapshotId = await createPreRestoreRollbackSnapshot(options?.adminEmail);
    } catch (err) {
      console.warn("Could not create automatic pre-restore checkpoint:", err);
    }
  }

  const { data } = backup;
  const errors: string[] = [];
  let processed = 0;
  let skipped = 0;

  // Filter out invalid items if skipInvalid is enabled
  const getCleanList = (items: any[] | undefined, colName: string) => {
    if (!items) return [];
    const colReport = validationReport.breakdown[colName];
    if (!colReport || colReport.invalid === 0) return items;

    const invalidIds = new Set(colReport.errors.map((e) => e.id));
    const validItems = items.filter((item) => {
      const id = item?.id || item?.ticketNo;
      if (id && invalidIds.has(id)) {
        skipped++;
        return false;
      }
      return true;
    });
    return validItems;
  };

  const categories = getCleanList(data.categories, "categories");
  const products = getCleanList(data.products, "products");
  const customers = getCleanList(data.customers, "customers");
  const team_members = getCleanList(data.team_members, "team_members");
  const service_centers = getCleanList(data.service_centers, "service_centers");
  const couriers = getCleanList(data.couriers, "couriers");
  const device_models = data.device_models || [];
  const spare_parts = data.spare_parts || [];
  const service_calls = getCleanList(data.service_calls, "service_calls");
  const financial_years = data.financial_years || [];
  const counters = data.counters || [];
  const admins = data.admins || [];

  const totalValidDocs =
    categories.length +
    products.length +
    customers.length +
    team_members.length +
    service_centers.length +
    couriers.length +
    device_models.length +
    spare_parts.length +
    service_calls.length +
    (data.hierarchicalServiceCalls?.length || 0) +
    financial_years.length +
    counters.length +
    admins.length;

  const reportProgress = (colName: string) => {
    if (options?.onProgress) {
      options.onProgress({
        currentCollection: colName,
        processedDocs: processed,
        totalDocs: Math.max(totalValidDocs, 1),
        percent: Math.min(100, Math.round((processed / Math.max(totalValidDocs, 1)) * 100)),
        status: "restoring",
      });
    }
  };

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
    await commitBatchList(categories, "categories");
    await commitBatchList(products, "products");
    await commitBatchList(customers, "customers");
    await commitBatchList(team_members, "team_members");
    await commitBatchList(service_centers, "service_centers");
    await commitBatchList(couriers, "couriers");
    await commitBatchList(device_models, "device_models");
    await commitBatchList(spare_parts, "spare_parts");
    await commitBatchList(financial_years, "financial_years");
    await commitBatchList(service_calls, "service_calls");

    // Hierarchical Subcollection calls
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

    await commitBatchList(counters, "counters");
    await commitBatchList(admins, "admins");

    if (options?.onProgress) {
      options.onProgress({
        currentCollection: "Complete",
        processedDocs: processed,
        totalDocs: totalValidDocs,
        percent: 100,
        status: "completed",
      });
    }

    return {
      restoredCount: processed,
      skippedCount: skipped,
      rollbackSnapshotId,
      errors,
      validationReport,
    };
  } catch (err: any) {
    if (options?.onProgress) {
      options.onProgress({
        currentCollection: "Error",
        processedDocs: processed,
        totalDocs: totalValidDocs,
        percent: Math.min(100, Math.round((processed / Math.max(totalValidDocs, 1)) * 100)),
        status: "error",
        error: err?.message || String(err),
      });
    }
    throw new Error(formatFirebaseError(err));
  }
}
