import { useEffect, useState, useRef } from "react";
import {
  Database,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Trash2,
  RotateCcw,
  Activity,
  Layers,
  Users,
  Package,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Filter,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  HardDrive,
  FolderSync,
  Folder,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  createScopedDatabaseBackup,
  downloadBackupAsJson,
  saveSnapshotToCloud,
  getCloudSnapshots,
  deleteCloudSnapshot,
  restoreDatabaseFromBackup,
  isBackupDownloadAuthorized,
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

export default function AdminBackupRestore() {
  const { user } = useAuth();
  const isAuthorized = isBackupDownloadAuthorized(user?.email);
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
    if (!isAuthorized) {
      toast.error("Unauthorized: Google Drive backup sync is restricted to executive administrators.");
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

  // 4. Restore from Cloud Snapshot
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

  // 5. Execute Restore with Safeguards
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

  // 6. Delete Cloud Snapshot
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

      {/* Access Restriction Notice if Unauthorized */}
      {!isAuthorized && (
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
              Database JSON exports and cloud disaster recovery restores are reserved for executive administrators. Your account has read-only access and does not have export or restore permissions. Please contact system management for database operations.
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
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Scoped & Partitioned Export</h2>
                  <p className="text-[11px] text-slate-400">Stream-safe for 10,000+ service calls & 5,000+ contacts</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Financial Year Scope
                </Label>
                <Select value={selectedFyId} onValueChange={setSelectedFyId}>
                  <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                    <SelectValue placeholder="Select FY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Financial Years (Full Snapshot)</SelectItem>
                    {financialYears.map((fy) => (
                      <SelectItem key={fy.id} value={fy.id}>
                        {fy.label} {fy.isCurrent ? "(Current FY)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Module Partition
                </Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ERP Modules (Complete)</SelectItem>
                    <SelectItem value="service_calls">Service Calls & Workshop Only</SelectItem>
                    <SelectItem value="customers">Customers Directory Only</SelectItem>
                    <SelectItem value="products">Products & Categories Only</SelectItem>
                    <SelectItem value="team_members">Team & Staff Only</SelectItem>
                    <SelectItem value="logistics">Couriers & Service Centers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border flex items-center gap-1.5">
              <span className="text-amber-500 shrink-0">💡</span>
              <span><strong>Partitioning Tip:</strong> Exporting by specific FY produces compact archives and instant downloads.</span>
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              onClick={handleSyncToGoogleDrive}
              disabled={!isAuthorized || syncingDrive || exporting || restoring}
              className="w-full gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9.5 rounded-xl disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {syncingDrive ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
              ) : (
                <div className="p-0.5 bg-white rounded-full flex items-center justify-center shadow-2xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.5 12.5c0-.8-.1-1.6-.2-2.5H12v4.8h5.9c-.3 1.4-1.1 2.6-2.4 3.4v2.8h3.9c2.3-2.1 3.1-5.2 3.1-8.5z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.9-2.8c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 20.4 7.3 23 12 23z" />
                    <path fill="#FBBC05" d="M5.3 13.4c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4V5.5H1.2C.4 7.1 0 8.9 0 11s.4 3.9 1.2 5.5l4.1-3.1z" />
                    <path fill="#EA4335" d="M12 4.6c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.1 15.2 0 12 0 7.3 0 3.2 2.6 1.2 6.5l4.1 3.1c.9-2.9 3.6-5 6.7-5z" />
                  </svg>
                </div>
              )}
              <span>{syncingDrive ? "Syncing to Google Drive..." : "Sync to Google Drive"}</span>
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={handleExportDownload}
                disabled={!isAuthorized || exporting || restoring || syncingDrive}
                variant="outline"
                className="gap-1.5 h-9 rounded-xl font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer truncate"
              >
                {exporting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileJson className="h-3.5 w-3.5 text-blue-500" />
                )}
                <span className="truncate">{exporting ? "Downloading..." : "Download JSON"}</span>
              </Button>

              <Button
                onClick={handleSaveCloudSnapshot}
                disabled={!isAuthorized || savingCloud || restoring || syncingDrive}
                variant="outline"
                className="gap-1.5 h-9 rounded-xl font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer truncate"
              >
                {savingCloud ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                ) : (
                  <Cloud className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                )}
                <span className="truncate">{savingCloud ? "Saving..." : "Save Cloud Snapshot"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Box 2 (Top-Right): Google Drive Off-Site Archives (Scrollable List with 3-Dot Menu) */}
        <div className="rounded-2xl border bg-card p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Drive Off-Site Archives
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {driveBackups.length} snapshots stored in Google Drive
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50">
                  {driveBackups.length} Archives
                </Badge>
                <Button
                  onClick={loadDriveBackups}
                  disabled={loadingDriveBackups}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                  title="Refresh Drive Backups"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingDriveBackups ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {loadingDriveBackups ? (
              <div className="flex flex-col items-center justify-center min-h-[190px]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2" />
                <p className="text-xs text-muted-foreground">Connecting to Google Drive...</p>
              </div>
            ) : driveBackups.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[190px] text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed p-4">
                <HardDrive className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No Google Drive backups loaded yet
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Click &quot;Sync to Google Drive&quot; to archive your database partitioned across multiple files in Google Drive.
                </p>
              </div>
            ) : (
              <div className="min-h-[190px] max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {driveBackups.map((f) => {
                  const formattedDate = f.createdTime
                    ? new Date(f.createdTime).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recent Backup";
                  const sizeInKb = f.size ? (Number(f.size) / 1024).toFixed(1) + " KB" : "";
                  const displayName = f.name.startsWith("Backup_")
                    ? f.name.replace(/^Backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/, "").replace(/_/g, " ")
                    : f.name.startsWith("zorba-erp-backup-")
                    ? "Full Database JSON Snapshot"
                    : f.name.replace(/\.json$/i, "").replace(/_/g, " ");

                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0">
                          {f.isFolder ? <Folder className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate capitalize" title={f.name}>
                            {displayName}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span>{formattedDate}</span>
                            <span className="font-mono text-[9px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                              {f.isFolder ? "Partitioned (8 files)" : sizeInKb || "JSON Archive"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* 3-Dot Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg shrink-0 cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleRestoreFromDrive(f)}
                            disabled={!isAuthorized || restoring || restoringFromDriveId === f.id}
                            className="gap-2 cursor-pointer font-medium text-xs text-emerald-700 dark:text-emerald-400"
                          >
                            {restoringFromDriveId === f.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            <span>Restore from Drive</span>
                          </DropdownMenuItem>
                          {f.webViewLink && (
                            <DropdownMenuItem
                              onClick={() => window.open(f.webViewLink, "_blank")}
                              className="gap-2 cursor-pointer text-xs"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>View in Google Drive</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t flex items-center justify-between text-[11px] text-slate-400">
            <span>Multi-file partitioned archive storage</span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300/60 dark:border-emerald-800">
              Google Drive
            </Badge>
          </div>
        </div>

        {/* Box 3 (Bottom-Left): Cloud Disaster Recovery Points & Rollback Checkpoints */}
        <div className="rounded-2xl border bg-card p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cloud Disaster Recovery Points
                </h2>
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  {snapshots.length} Points
                </Badge>
              </div>

              <Button
                onClick={loadData}
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSnapshots ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {loadingSnapshots ? (
              <div className="flex flex-col items-center justify-center min-h-[170px]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                <p className="text-xs text-muted-foreground">Loading recovery checkpoints...</p>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[170px] text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed p-4">
                <Clock className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No cloud disaster recovery points recorded yet
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Click &quot;Save Cloud Snapshot&quot; to create your first cloud snapshot point.
                </p>
              </div>
            ) : (
              <div className="min-h-[170px] max-h-[200px] overflow-y-auto space-y-2 pr-1">
                {snapshots.map((s) => {
                  const isRollback = s.id.startsWith("rollback-");
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors shadow-2xs ${
                        isRollback
                          ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
                          : "bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {isRollback ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          )}
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {new Date(s.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isRollback ? (
                            <Badge className="bg-amber-500 text-white text-[8px] px-1 py-0 shrink-0">
                              Rollback Guard
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                              {s.totalDocuments} docs
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Scope: <strong className="text-slate-700 dark:text-slate-300">{s.scope || "Full Snapshot"}</strong>
                          {" • "}T: {s.summary?.serviceCalls || 0} | C: {s.summary?.customers || 0} | P: {s.summary?.products || 0}
                        </p>
                      </div>

                      {/* 3-Dot Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg shrink-0 cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => handleRestoreCloudSnapshot(s)}
                            disabled={!isAuthorized || restoring || !s.backupData}
                            className="gap-2 cursor-pointer font-medium text-xs text-blue-600 dark:text-blue-400"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>{isRollback ? "Undo & Rollback" : "Restore Checkpoint"}</span>
                          </DropdownMenuItem>
                          {s.backupData && (
                            <DropdownMenuItem
                              onClick={() => downloadBackupAsJson(s.backupData!)}
                              disabled={!isAuthorized}
                              className="gap-2 cursor-pointer text-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download JSON</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeleteSnapshotId(s.id)}
                            disabled={!isAuthorized}
                            className="gap-2 cursor-pointer text-xs text-rose-600 dark:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Snapshot</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t flex items-center justify-between text-[11px] text-slate-400">
            <span>Instant point-in-time state restores</span>
            <Badge variant="outline" className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
              Firestore Snapshots
            </Badge>
          </div>
        </div>

        {/* Box 4 (Bottom-Right): Pre-Flight Validated Restore */}
        <div className="rounded-2xl border bg-card p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center gap-2.5 pb-2 border-b">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pre-Flight Validated Restore</h2>
                <p className="text-[11px] text-slate-400">Upload `.json` archive with Zod schema verification</p>
              </div>
            </div>

            <div className="border-2 border-dashed rounded-xl p-4 text-center space-y-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors bg-slate-50/50 dark:bg-slate-900/30 flex-1 flex flex-col items-center justify-center min-h-[170px]">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="h-8 w-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Select or drop a `.json` backup file
                </p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-0.5">
                  Pre-flight schema inspection detects invalid rows and missing IDs before Firestore writes.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => isAuthorized && fileInputRef.current?.click()}
                disabled={!isAuthorized || restoring}
                className="h-8 text-xs font-bold rounded-xl gap-1.5 disabled:opacity-50 cursor-pointer mt-1"
              >
                {!isAuthorized ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Upload className="h-3.5 w-3.5" />}
                {!isAuthorized ? "Restore Restricted" : "Upload .JSON File"}
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between text-[11px] text-slate-400">
            <span>Pre-flight Zod schema inspection</span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
              Dry-Run Safe
            </Badge>
          </div>
        </div>
      </div>

      {/* Section 3: Pre-Flight Inspection & Dry-Run Report Dialog */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              Pre-Flight Validation & Restore Inspection
            </DialogTitle>
          </DialogHeader>

          {pendingBackup && validationReport && (
            <div className="space-y-4 pt-2 text-xs text-slate-600 dark:text-slate-300">
              {/* Validation Status Card */}
              {validationReport.isValid ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/40 p-3.5 flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Schema Integrity Passed (100% Valid)</p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                      All {validationReport.totalRecordsChecked} documents passed strict Zod schema type-checking with zero corruption detected.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/40 p-3.5 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Warning: {validationReport.invalidCount} Invalid Records Detected</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      The archive contains malformed rows. You can automatically skip corrupted records during restore.
                    </p>
                  </div>
                </div>
              )}

              {/* Rejected Rows Error Inspection Table if any */}
              {!validationReport.isValid && validationReport.allErrors.length > 0 && (
                <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Rejected Corrupted Rows ({validationReport.allErrors.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                    {validationReport.allErrors.slice(0, 10).map((err, i) => (
                      <div key={i} className="p-1.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start justify-between gap-2">
                        <span><strong>[{err.collection}]</strong> {err.id}:</span>
                        <span className="text-right">{err.error}</span>
                      </div>
                    ))}
                    {validationReport.allErrors.length > 10 && (
                      <p className="text-slate-400 text-center pt-1 italic">
                        ...and {validationReport.allErrors.length - 10} more invalid rows
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata & Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/60 p-3 space-y-1 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Archive Details</p>
                  <p>Scope: <strong>{pendingBackup.metadata.scope || "Full"}</strong></p>
                  <p>Author: <strong>{pendingBackup.metadata.exportedBy || "Admin"}</strong></p>
                  <p>Date: <strong>{new Date(pendingBackup.metadata.createdAt).toLocaleString("en-IN")}</strong></p>
                </div>

                <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/60 p-3 space-y-1 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Record Verification</p>
                  <p>Total Records: <strong>{validationReport.totalRecordsChecked}</strong></p>
                  <p className="text-emerald-600">Valid Records: <strong>{validationReport.validCount}</strong></p>
                  {validationReport.invalidCount > 0 && (
                    <p className="text-red-600">Invalid Records: <strong>{validationReport.invalidCount}</strong></p>
                  )}
                </div>
              </div>

              {/* Safety Toggles */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900/60">
                  <div>
                    <Label className="text-xs font-bold text-slate-900 dark:text-white">
                      Create Automatic Safety Rollback Point
                    </Label>
                    <p className="text-[10px] text-slate-400">
                      Snapshots current database before executing restore to enable 1-click instant undo
                    </p>
                  </div>
                  <Switch checked={createRollback} onCheckedChange={setCreateRollback} />
                </div>

                {!validationReport.isValid && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                    <div>
                      <Label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Skip Invalid / Corrupted Records
                      </Label>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        Imports only {validationReport.validCount} valid records and drops {validationReport.invalidCount} corrupted rows
                      </p>
                    </div>
                    <Switch checked={skipInvalid} onCheckedChange={setSkipInvalid} />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecuteRestore}
              disabled={!validationReport?.isValid && !skipInvalid}
              className="h-9 text-xs rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Confirm & Restore {validationReport?.validCount} Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cloud Snapshot High-Cost Operation Warning Modal */}
      <AlertDialog open={showCloudWarningModal} onOpenChange={setShowCloudWarningModal}>
        <AlertDialogContent className="sm:max-w-xl md:max-w-2xl rounded-2xl p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  High-Cost Cloud Operation Warning
                </AlertDialogTitle>
                <p className="text-xs text-slate-500">Firebase Firestore Snapshot</p>
              </div>
            </div>

            <AlertDialogDescription asChild>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 pt-1">
                <p className="leading-relaxed">
                  Creating snapshots directly inside Firebase Firestore is an <strong>expensive database operation</strong> with high write/read bandwidth and cloud billing costs.
                </p>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-900 dark:text-emerald-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-xs">
                    <span>💡</span> Recommended Alternative: Google Drive Sync
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-normal">
                    Google Drive Sync is <strong>100% free</strong>, faster, and securely partitioned across modular files in your personal Google Drive account.
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Cloud snapshots should be used <strong>less frequently</strong> (e.g. only before critical database restructuring or major releases).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCloudWarningModal(false)}
              className="h-9 text-xs text-slate-500 hover:text-slate-900 rounded-xl cursor-pointer order-3 sm:order-1"
            >
              Cancel
            </Button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCloudWarningModal(false);
                  executeCloudSnapshot();
                }}
                className="h-9 text-xs text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl cursor-pointer shrink-0"
              >
                Proceed with Cloud Snapshot
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  setShowCloudWarningModal(false);
                  handleSyncToGoogleDrive();
                }}
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <FolderSync className="h-3.5 w-3.5" />
                <span>Use Free Google Drive Instead</span>
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
