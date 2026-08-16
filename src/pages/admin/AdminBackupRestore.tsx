import { useEffect, useState, useRef } from "react";
import {
  Database,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  createScopedDatabaseBackup,
  downloadBackupAsJson,
  saveSnapshotToCloud,
  getCloudSnapshots,
  deleteCloudSnapshot,
  restoreDatabaseFromBackup,
  isBackupDownloadAuthorized,
  isDriveSyncAuthorized,
  type FullDatabaseBackup,
  type CloudSnapshot,
  type RestoreProgress,
  type BackupScopeOptions,
} from "@/lib/backup";
import {
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  downloadBackupFromDriveItem,
  type DriveBackupItem,
} from "@/lib/googleDriveBackup";
import {
  validateBackupPayload,
  type PreFlightValidationReport,
} from "@/lib/backupValidation";
import { getFinancialYears } from "@/lib/firestore";
import type { FinancialYearDoc } from "@/lib/types";

// Modular Child Components
import ScopedExportCard from "@/components/admin/backup/ScopedExportCard";
import GoogleDriveArchivesCard from "@/components/admin/backup/GoogleDriveArchivesCard";
import CloudSnapshotsCard from "@/components/admin/backup/CloudSnapshotsCard";
import ValidatedRestoreUploadCard from "@/components/admin/backup/ValidatedRestoreUploadCard";
import RestoreInspectionDialog from "@/components/admin/backup/RestoreInspectionDialog";
import CloudSnapshotWarningModal from "@/components/admin/backup/CloudSnapshotWarningModal";

export default function AdminBackupRestore() {
  const { user } = useAuth();
  const canDownloadAndRestore = isBackupDownloadAuthorized(user?.email);
  const canSyncToDrive = isDriveSyncAuthorized(user?.email);
  const isAuthorized = canDownloadAndRestore; // Alias for general restore/snapshot access
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYearDoc[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [showCloudWarningModal, setShowCloudWarningModal] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupItem[]>([]);
  const [loadingDriveBackups, setLoadingDriveBackups] = useState(false);
  const [restoringFromDriveId, setRestoringFromDriveId] = useState<string | null>(null);

  // Scope Export Filters
  const [selectedFyId, setSelectedFyId] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");

  // Restore & Pre-flight Validation State
  const [pendingBackup, setPendingBackup] = useState<FullDatabaseBackup | null>(null);
  const [validationReport, setValidationReport] = useState<PreFlightValidationReport | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [createRollback, setCreateRollback] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [deleteSnapshotId, setDeleteSnapshotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoadingSnapshots(true);
    try {
      const [snapData, fyData] = await Promise.all([
        getCloudSnapshots(),
        getFinancialYears(),
      ]);
      setSnapshots(snapData);
      setFinancialYears(fyData);
    } catch {
      toast.error("Failed to load disaster recovery data");
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getExportScopeConfig = (): BackupScopeOptions => {
    const isModuleAll = selectedModule === "all";
    return {
      fyId: selectedFyId,
      monthKey: "all",
      exportedBy: user?.email || "Super Admin",
      modules: {
        serviceCalls: isModuleAll || selectedModule === "service_calls",
        customers: isModuleAll || selectedModule === "customers",
        products: isModuleAll || selectedModule === "products",
        categories: isModuleAll || selectedModule === "categories",
        teamMembers: isModuleAll || selectedModule === "team_members",
        serviceCenters: isModuleAll || selectedModule === "logistics",
        couriers: isModuleAll || selectedModule === "logistics",
        masterCatalogs: isModuleAll || selectedModule === "settings",
        systemSettings: isModuleAll || selectedModule === "settings",
      },
    };
  };

  // 1. Export & Download JSON
  const handleExportDownload = async () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Database export downloads are restricted to executive administrators.");
      return;
    }
    setExporting(true);
    try {
      const config = getExportScopeConfig();
      const backup = await createScopedDatabaseBackup(config);
      const filename = `zorba-erp-backup-${selectedFyId !== "all" ? selectedFyId : "full"}-${new Date().toISOString().slice(0, 10)}.json`;
      downloadBackupAsJson(backup, filename);
      toast.success(
        `Backup downloaded (${backup.metadata.counts.totalDocuments} docs across ${backup.metadata.scope})`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate database backup");
    } finally {
      setExporting(false);
    }
  };

  // 2. Save Cloud Snapshot (Trigger Warning Modal)
  const handleSaveCloudSnapshot = () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Cloud snapshot creation is restricted to executive administrators.");
      return;
    }
    setShowCloudWarningModal(true);
  };

  const executeCloudSnapshot = async () => {
    setSavingCloud(true);
    try {
      const config = getExportScopeConfig();
      const backup = await createScopedDatabaseBackup(config);
      await saveSnapshotToCloud(backup);
      toast.success(`Cloud snapshot created (${backup.metadata.counts.totalDocuments} records)`);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save cloud snapshot");
    } finally {
      setSavingCloud(false);
    }
  };

  // 3. Sync Backup to Google Drive
  const handleSyncToGoogleDrive = async () => {
    if (!canSyncToDrive) {
      toast.error("Unauthorized: Google Drive backup sync is restricted to authorized administrators.");
      return;
    }
    setSyncingDrive(true);
    try {
      const config = getExportScopeConfig();
      const backup = await createScopedDatabaseBackup(config);
      const result = await uploadBackupToGoogleDrive(backup);
      toast.success(
        `Multi-file backup created in Google Drive ("${result.folderName}")! (${result.fileCount} partition files)`
      );
      loadDriveBackups();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to sync backup to Google Drive");
    } finally {
      setSyncingDrive(false);
    }
  };

  const loadDriveBackups = async () => {
    setLoadingDriveBackups(true);
    try {
      const files = await listGoogleDriveBackups();
      setDriveBackups(files);
    } catch {
      // User may not have authorized drive scope yet
    } finally {
      setLoadingDriveBackups(false);
    }
  };

  // Restore from Google Drive Item
  const handleRestoreFromDrive = async (item: DriveBackupItem) => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Database restore operations are restricted to executive administrators.");
      return;
    }
    setRestoringFromDriveId(item.id);
    try {
      toast.info(`Fetching & assembling backup from Google Drive...`);
      const backup = await downloadBackupFromDriveItem(item);
      const report = validateBackupPayload(backup);

      setPendingBackup(backup);
      setValidationReport(report);
      setShowPreviewModal(true);

      if (!report.isValid) {
        toast.warning(`Drive archive contains ${report.invalidCount} invalid or malformed rows`);
      } else {
        toast.success("Drive backup loaded! Pre-flight schema validation passed (100% valid records)");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to restore backup from Google Drive");
    } finally {
      setRestoringFromDriveId(null);
    }
  };

  // 4. Handle File Upload & Run Pre-flight Validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Database restore operations are restricted to executive administrators.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.metadata || !json.data) {
          toast.error("Invalid backup format. Must contain metadata and data objects.");
          return;
        }

        const parsedBackup = json as FullDatabaseBackup;
        const report = validateBackupPayload(parsedBackup);

        setPendingBackup(parsedBackup);
        setValidationReport(report);
        setShowPreviewModal(true);

        if (!report.isValid) {
          toast.warning(`Backup file contains ${report.invalidCount} invalid or malformed rows`);
        } else {
          toast.success("Pre-flight schema validation passed (100% valid records)");
        }
      } catch (err) {
        toast.error("Failed to parse JSON backup file");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 5. Restore from Cloud Snapshot
  const handleRestoreCloudSnapshot = (snapshot: CloudSnapshot) => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Database restore operations are restricted to executive administrators.");
      return;
    }
    if (!snapshot.backupData) {
      toast.error("This cloud snapshot does not contain full backup data.");
      return;
    }
    const report = validateBackupPayload(snapshot.backupData);
    setPendingBackup(snapshot.backupData);
    setValidationReport(report);
    setShowPreviewModal(true);
  };

  // 6. Execute Restore with Safeguards
  const handleExecuteRestore = async () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Database restore operations are restricted to executive administrators.");
      return;
    }
    if (!pendingBackup) return;
    setShowPreviewModal(false);
    setRestoring(true);
    setProgress({
      currentCollection: "Validating & Initializing",
      processedDocs: 0,
      totalDocs: pendingBackup.metadata.counts.totalDocuments,
      percent: 0,
      status: "validating",
    });

    try {
      const result = await restoreDatabaseFromBackup(pendingBackup, {
        skipInvalid,
        createRollbackPoint: createRollback,
        adminEmail: user?.email || "Super Admin",
        onProgress: (p) => setProgress(p),
      });

      if (result.skippedCount > 0) {
        toast.warning(
          `Restored ${result.restoredCount} valid documents. Skipped ${result.skippedCount} corrupted rows.`
        );
      } else {
        toast.success(`Successfully restored ${result.restoredCount} database records!`);
      }
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Database restore encountered an error");
    } finally {
      setRestoring(false);
    }
  };

  // 7. Delete Cloud Snapshot
  const handleDeleteSnapshot = async () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Deleting recovery checkpoints is restricted to executive administrators.");
      return;
    }
    if (!deleteSnapshotId) return;
    try {
      await deleteCloudSnapshot(deleteSnapshotId);
      toast.success("Snapshot removed");
      setDeleteSnapshotId(null);
      loadData();
    } catch {
      toast.error("Failed to delete snapshot");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-xs">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Database className="h-3.5 w-3.5" />
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
                Database Backup & Disaster Recovery Center
              </h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Partitioned Financial-Year backups, Google Drive off-site archives, pre-flight schema validation, and instant rollback safety checkpoints.
            </p>
          </div>
        </div>
      </div>

      {/* Access Restriction Notice */}
      {!canDownloadAndRestore && !canSyncToDrive && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-xs flex items-center gap-2">
              <span>Database Download & Restore Restricted to Executive Accounts</span>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border-amber-300 text-[10px]">
                Read-Only Access
              </Badge>
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Database JSON exports, Google Drive sync, and disaster recovery restores are reserved for authorized administrators. Your account has read-only access.
            </p>
          </div>
        </div>
      )}

      {!canDownloadAndRestore && canSyncToDrive && (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 flex items-start gap-3 text-emerald-900 dark:text-emerald-200 shadow-xs">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-xs flex items-center gap-2">
              <span>Google Drive Backup Sync Mode Active</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-300 text-[10px]">
                Drive Sync Authorized
              </Badge>
            </p>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Your account is authorized to trigger automated multi-partition backups to Google Drive. Local JSON file downloads and database restores are restricted to executive owners.
            </p>
          </div>
        </div>
      )}

      {/* Live Restore Progress Banner */}
      {restoring && progress && (
        <div className="rounded-2xl border border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              {progress.status === "validating" ? "Running Pre-Flight Zod Schema Validation..." : `Restoring Collection: ${progress.currentCollection}...`}
            </span>
            <span>
              {progress.processedDocs} / {progress.totalDocs} documents ({progress.percent}%)
            </span>
          </div>
          <Progress value={progress.percent} className="h-2 rounded-full" />
        </div>
      )}

      {/* 4-Box 2x2 Grid Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Box 1 (Top-Left): Scoped & Partitioned Export */}
        <ScopedExportCard
          financialYears={financialYears}
          selectedFyId={selectedFyId}
          onSelectFyId={setSelectedFyId}
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
          canSyncToDrive={canSyncToDrive}
          canDownloadAndRestore={canDownloadAndRestore}
          syncingDrive={syncingDrive}
          exporting={exporting}
          savingCloud={savingCloud}
          restoring={restoring}
          onSyncToGoogleDrive={handleSyncToGoogleDrive}
          onExportDownload={handleExportDownload}
          onSaveCloudSnapshot={handleSaveCloudSnapshot}
        />

        {/* Box 2 (Top-Right): Google Drive Off-Site Archives */}
        <GoogleDriveArchivesCard
          driveBackups={driveBackups}
          loadingDriveBackups={loadingDriveBackups}
          restoringFromDriveId={restoringFromDriveId}
          isAuthorized={isAuthorized}
          restoring={restoring}
          onRefresh={loadDriveBackups}
          onRestoreFromDrive={handleRestoreFromDrive}
        />

        {/* Box 3 (Bottom-Left): Cloud Disaster Recovery Points & Rollback Checkpoints */}
        <CloudSnapshotsCard
          snapshots={snapshots}
          loadingSnapshots={loadingSnapshots}
          isAuthorized={isAuthorized}
          restoring={restoring}
          onRefresh={loadData}
          onRestoreSnapshot={handleRestoreCloudSnapshot}
          onDownloadSnapshot={(backupData) => downloadBackupAsJson(backupData)}
          onDeleteSnapshot={(snapshotId) => setDeleteSnapshotId(snapshotId)}
        />

        {/* Box 4 (Bottom-Right): Pre-Flight Validated Restore */}
        <ValidatedRestoreUploadCard
          isAuthorized={isAuthorized}
          restoring={restoring}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Section 3: Pre-Flight Inspection & Dry-Run Report Dialog */}
      <RestoreInspectionDialog
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        pendingBackup={pendingBackup}
        validationReport={validationReport}
        skipInvalid={skipInvalid}
        onSkipInvalidChange={setSkipInvalid}
        createRollback={createRollback}
        onCreateRollbackChange={setCreateRollback}
        onExecuteRestore={handleExecuteRestore}
      />

      {/* Cloud Snapshot High-Cost Operation Warning Modal */}
      <CloudSnapshotWarningModal
        open={showCloudWarningModal}
        onOpenChange={setShowCloudWarningModal}
        onProceedCloudSnapshot={executeCloudSnapshot}
        onUseGoogleDrive={handleSyncToGoogleDrive}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteSnapshotId)} onOpenChange={(open) => !open && setDeleteSnapshotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Recovery Checkpoint?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this cloud disaster recovery point?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSnapshot}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Checkpoint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
