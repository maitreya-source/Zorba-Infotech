import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  where,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "./firebase";
import { cleanFirestoreData, formatFirebaseError } from "./firestore";
import { validateBackupPayload, type PreFlightValidationReport } from "./backupValidation";

export const BACKUP_DOWNLOAD_AUTHORIZED_EMAILS = [
  "maitreya.mul@gmail.com",
  "manishm9730@gmail.com",
  "zorbainfotech@gmail.com",
];

export const DRIVE_SYNC_AUTHORIZED_EMAILS = [
  "maitreya.mul@gmail.com",
  "manishm9730@gmail.com",
  "zorbainfotech@gmail.com",
  "zorbasquad@gmail.com",
  "maitreyam@google.com",
];

export function isBackupDownloadAuthorized(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return BACKUP_DOWNLOAD_AUTHORIZED_EMAILS.includes(clean);
}

export function isDriveSyncAuthorized(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return DRIVE_SYNC_AUTHORIZED_EMAILS.includes(clean);
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
    quotations?: number;
    quotation_templates?: number;
    technician_payouts?: number;
    whatsapp_templates?: number;
    inquiries?: number;
    job_applications?: number;
    device_categories?: number;
    settings?: number;
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
    quotations?: Array<{ id: string; [key: string]: any }>;
    quotation_templates?: Array<{ id: string; [key: string]: any }>;
    technician_payouts?: Array<{ id: string; [key: string]: any }>;
    whatsapp_templates?: Array<{ id: string; [key: string]: any }>;
    inquiries?: Array<{ id: string; [key: string]: any }>;
    job_applications?: Array<{ id: string; [key: string]: any }>;
    device_categories?: Array<{ id: string; [key: string]: any }>;
    settings?: Array<{ id: string; [key: string]: any }>;
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
  isChunked?: boolean;
  chunkCount?: number;
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
  let quotations: Array<{ id: string; [key: string]: any }> = [];
  let quotation_templates: Array<{ id: string; [key: string]: any }> = [];
  let technician_payouts: Array<{ id: string; [key: string]: any }> = [];
  let whatsapp_templates: Array<{ id: string; [key: string]: any }> = [];
  let inquiries: Array<{ id: string; [key: string]: any }> = [];
  let job_applications: Array<{ id: string; [key: string]: any }> = [];
  let device_categories: Array<{ id: string; [key: string]: any }> = [];
  let settings: Array<{ id: string; [key: string]: any }> = [];

  const tasks: Promise<void>[] = [];

  if (modules.categories) {
    tasks.push(fetchCollectionPaginated("categories").then((r) => { categories = r; }));
    tasks.push(fetchCollectionPaginated("device_categories").then((r) => { device_categories = r; }));
  }
  if (modules.products) {
    tasks.push(fetchCollectionPaginated("products").then((r) => { products = r; }));
    tasks.push(fetchCollectionPaginated("quotations").then((r) => { quotations = r; }));
    tasks.push(fetchCollectionPaginated("quotation_templates").then((r) => { quotation_templates = r; }));
  }
  if (modules.customers) {
    tasks.push(fetchCollectionPaginated("customers").then((r) => { customers = r; }));
    tasks.push(fetchCollectionPaginated("inquiries").then((r) => { inquiries = r; }));
  }
  if (modules.teamMembers) {
    tasks.push(fetchCollectionPaginated("team_members").then((r) => { team_members = r; }));
    tasks.push(fetchCollectionPaginated("technician_payouts").then((r) => { technician_payouts = r; }));
    tasks.push(fetchCollectionPaginated("job_applications").then((r) => { job_applications = r; }));
  }
  if (modules.serviceCenters) tasks.push(fetchCollectionPaginated("service_centers").then((r) => { service_centers = r; }));
  if (modules.couriers) tasks.push(fetchCollectionPaginated("couriers").then((r) => { couriers = r; }));
  if (modules.masterCatalogs) {
    tasks.push(fetchCollectionPaginated("device_models").then((r) => { device_models = r; }));
    tasks.push(fetchCollectionPaginated("spare_parts").then((r) => { spare_parts = r; }));
  }
  if (modules.systemSettings) {
    tasks.push(fetchCollectionPaginated("counters").then((r) => { counters = r; }));
    tasks.push(fetchCollectionPaginated("admins").then((r) => { admins = r; }));
    tasks.push(fetchCollectionPaginated("whatsapp_templates").then((r) => { whatsapp_templates = r; }));
    tasks.push(fetchCollectionPaginated("settings").then((r) => { settings = r; }));
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
          } catch {
            // ignore
          }

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
    quotations: quotations.length,
    quotation_templates: quotation_templates.length,
    technician_payouts: technician_payouts.length,
    whatsapp_templates: whatsapp_templates.length,
    inquiries: inquiries.length,
    job_applications: job_applications.length,
    device_categories: device_categories.length,
    settings: settings.length,
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
      admins.length +
      quotations.length +
      quotation_templates.length +
      technician_payouts.length +
      whatsapp_templates.length +
      inquiries.length +
      job_applications.length +
      device_categories.length +
      settings.length,
  };

  return {
    metadata: {
      version: "2.2.0",
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
      quotations,
      quotation_templates,
      technician_payouts,
      whatsapp_templates,
      inquiries,
      job_applications,
      device_categories,
      settings,
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

// ─── Cloud Snapshot Storage (With Automatic Chunking >700KB for Firestore 1MB Limit) ───

const MAX_INLINE_SNAPSHOT_CHARS = 700_000;
const SNAPSHOT_CHUNK_CHARS = 650_000;

async function persistSnapshotWithChunking(snapshotId: string, snapshotDoc: CloudSnapshot, backup: FullDatabaseBackup): Promise<void> {
  const docRef = doc(db, "backups", snapshotId);
  const cleanBackup = cleanFirestoreData(backup);
  const serialized = JSON.stringify(cleanBackup);

  if (serialized.length <= MAX_INLINE_SNAPSHOT_CHARS) {
    await setDoc(docRef, cleanFirestoreData({ ...snapshotDoc, isChunked: false, backupData: cleanBackup }));
    return;
  }

  // Chunk payload into subcollection `backups/{snapshotId}/chunks/{i}` so Firestore 1 MiB limit is never exceeded
  const chunks: string[] = [];
  for (let i = 0; i < serialized.length; i += SNAPSHOT_CHUNK_CHARS) {
    chunks.push(serialized.slice(i, i + SNAPSHOT_CHUNK_CHARS));
  }

  const { backupData: _omitted, ...headerOnly } = snapshotDoc;
  await setDoc(
    docRef,
    cleanFirestoreData({
      ...headerOnly,
      isChunked: true,
      chunkCount: chunks.length,
    })
  );

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkRef = doc(db, "backups", snapshotId, "chunks", String(idx));
    await setDoc(chunkRef, { index: idx, payload: chunks[idx] });
  }
}

export async function saveSnapshotToCloud(backup: FullDatabaseBackup): Promise<string> {
  const snapshotId = `snapshot-${backup.metadata.createdAt}`;

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

  await persistSnapshotWithChunking(snapshotId, snapshotDoc, backup);
  return snapshotId;
}

export async function getCloudSnapshots(): Promise<CloudSnapshot[]> {
  try {
    const q = query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(25));
    const snap = await getDocs(q);
    const results: CloudSnapshot[] = [];

    for (const d of snap.docs) {
      const item = { id: d.id, ...d.data() } as CloudSnapshot;
      if (item.isChunked && !item.backupData) {
        try {
          const chunkSnap = await getDocs(collection(db, "backups", d.id, "chunks"));
          const sorted = chunkSnap.docs
            .map((cd) => cd.data() as { index: number; payload: string })
            .sort((a, b) => a.index - b.index);
          if (sorted.length > 0) {
            item.backupData = JSON.parse(sorted.map((s) => s.payload).join(""));
          }
        } catch (chunkErr) {
          console.warn(`Failed to reassemble chunks for backup ${d.id}:`, chunkErr);
        }
      }
      results.push(item);
    }
    return results;
  } catch (err: any) {
    console.error("getCloudSnapshots error:", err);
    return [];
  }
}

export async function deleteCloudSnapshot(id: string): Promise<void> {
  try {
    const chunkSnap = await getDocs(collection(db, "backups", id, "chunks"));
    for (const cd of chunkSnap.docs) {
      await deleteDoc(cd.ref);
    }
  } catch {
    // ignore chunk cleanup errors
  }
  await deleteDoc(doc(db, "backups", id));
}

// ─── Pre-Restore Automatic Rollback Checkpoint ────────────────────────────────

export async function createPreRestoreRollbackSnapshot(adminEmail?: string): Promise<string> {
  const currentBackup = await createFullDatabaseBackup(adminEmail || "Auto-Rollback Guard");
  const rollbackId = `rollback-pre-restore-${Date.now()}`;

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

  await persistSnapshotWithChunking(rollbackId, snapshotDoc, currentBackup);
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
      const id = item?.id || item?.ticketNo || item?.data?.id || item?.data?.ticketNo;
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
  const hierarchicalServiceCalls = getCleanList(data.hierarchicalServiceCalls, "hierarchical_service_calls");
  const financial_years = data.financial_years || [];
  const counters = data.counters || [];
  const admins = data.admins || [];
  const quotations = data.quotations || [];
  const quotation_templates = data.quotation_templates || [];
  const technician_payouts = data.technician_payouts || [];
  const whatsapp_templates = data.whatsapp_templates || [];
  const inquiries = data.inquiries || [];
  const job_applications = data.job_applications || [];
  const device_categories = data.device_categories || [];
  const settings = data.settings || [];

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
    hierarchicalServiceCalls.length +
    financial_years.length +
    counters.length +
    admins.length +
    quotations.length +
    quotation_templates.length +
    technician_payouts.length +
    whatsapp_templates.length +
    inquiries.length +
    job_applications.length +
    device_categories.length +
    settings.length;

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
    await commitBatchList(device_categories, "device_categories");
    await commitBatchList(products, "products");
    await commitBatchList(quotations, "quotations");
    await commitBatchList(quotation_templates, "quotation_templates");
    await commitBatchList(customers, "customers");
    await commitBatchList(inquiries, "inquiries");
    await commitBatchList(team_members, "team_members");
    await commitBatchList(technician_payouts, "technician_payouts");
    await commitBatchList(job_applications, "job_applications");
    await commitBatchList(service_centers, "service_centers");
    await commitBatchList(couriers, "couriers");
    await commitBatchList(device_models, "device_models");
    await commitBatchList(spare_parts, "spare_parts");
    await commitBatchList(financial_years, "financial_years");
    await commitBatchList(service_calls, "service_calls");

    // Hierarchical Subcollection calls
    if (hierarchicalServiceCalls.length > 0) {
      reportProgress("hierarchical_service_calls");
      const BATCH_SIZE = 400;
      for (let i = 0; i < hierarchicalServiceCalls.length; i += BATCH_SIZE) {
        const chunk = hierarchicalServiceCalls.slice(i, i + BATCH_SIZE);
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

    await commitBatchList(whatsapp_templates, "whatsapp_templates");
    await commitBatchList(settings, "settings");
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
