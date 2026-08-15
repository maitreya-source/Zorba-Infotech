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
  Terminal,
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
  const [showCliGuide, setShowCliGuide] = useState(false);
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
      toast.error("Unauthorized: Database export downloads are restricted to Executive Owners.");
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

  // 2. Save Cloud Snapshot
  const handleSaveCloudSnapshot = async () => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Cloud snapshot creation is restricted to Executive Owners.");
      return;
    }
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

  // 3. Handle File Upload & Run Pre-flight Validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthorized) {
      toast.error("Unauthorized: Database restore operations are restricted to Executive Owners.");
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
      toast.error("Unauthorized: Database restore operations are restricted to Executive Owners.");
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
      toast.error("Unauthorized: Database restore operations are restricted to Executive Owners.");
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
      toast.error("Unauthorized: Deleting recovery checkpoints is restricted to Executive Owners.");
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
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto text-xs">
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
                Firebase Backup & Disaster Recovery Center
              </h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Partitioned Financial-Year backups, paginated dataset streams (10,000+ tickets), pre-flight schema validation, and instant rollback safety snapshots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowCliGuide(!showCliGuide)}
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700 rounded-xl"
            >
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              GCP Native CLI Guide
            </Button>
          </div>
        </div>
      </div>

      {/* GCP Native CLI Guide Accordion */}
      {showCliGuide && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-600" />
              Google Cloud Managed Firestore Bucket Export (For 100k+ enterprise backups)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCliGuide(false)}
              className="h-6 text-xs text-blue-700 dark:text-blue-300"
            >
              Close
            </Button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            For multi-gigabyte databases, Google Cloud Firestore provides native asynchronous export jobs to Cloud Storage:
          </p>
          <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
            <p className="text-slate-400"># Export entire Firestore database directly to GCS bucket:</p>
            <p className="text-emerald-400">
              gcloud firestore export gs://zorba-infotech-web.firebasestorage.app/firestore-backups/$(date +%Y-%m-%d)
            </p>
            <p className="text-slate-400 pt-1"># Export specific collection group (e.g. service calls):</p>
            <p className="text-emerald-400">
              gcloud firestore export gs://zorba-infotech-web.firebasestorage.app/backups --collection-ids=service_calls,customers
            </p>
          </div>
        </div>
      )}

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
              Database JSON exports and cloud disaster recovery restores are reserved for executive owners (<code>manishm9730@gmail.com</code>, <code>zorbainfotech@gmail.com</code>, <code>maitreya.mul@gmail.com</code>).
              Your current account (<strong>{user?.email || "Staff"}</strong>) cannot download raw customer database files or execute database restores.
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

      {/* Section 1: Granular Scoped Backup Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Scoped Export Card */}
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
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

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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

            <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border">
              💡 <strong>Partitioning Tip:</strong> Exporting by specific Financial Year (e.g. FY 2026-27) produces compact, segregated archives that avoid browser memory bloat and download instantaneously.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleExportDownload}
              disabled={!isAuthorized || exporting || restoring}
              className="flex-1 gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold h-9 rounded-xl disabled:opacity-50"
            >
              {!isAuthorized ? (
                <Lock className="h-4 w-4 text-slate-300" />
              ) : exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              {exporting ? "Streaming Records..." : !isAuthorized ? "Export Restricted" : "Download Scoped JSON"}
            </Button>
            <Button
              onClick={handleSaveCloudSnapshot}
              disabled={!isAuthorized || savingCloud || restoring}
              variant="outline"
              className="gap-2 h-9 rounded-xl font-semibold disabled:opacity-50"
            >
              {savingCloud ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 text-blue-500" />
              )}
              Save to Cloud History
            </Button>
          </div>
        </div>

        {/* Restore from File Card */}
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pre-Flight Validated Restore</h2>
              <p className="text-[11px] text-slate-400">Upload `.json` archive with Zod schema verification</p>
            </div>
          </div>

          <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors bg-slate-50/50 dark:bg-slate-900/30">
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
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                Strict pre-flight schema inspection detects invalid phone numbers, corrupted tickets, and missing IDs before modifying Firestore.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => isAuthorized && fileInputRef.current?.click()}
              disabled={!isAuthorized || restoring}
              className="mt-2 h-8 text-xs font-bold rounded-xl gap-1.5 disabled:opacity-50"
            >
              {!isAuthorized ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Upload className="h-3.5 w-3.5" />}
              {!isAuthorized ? "Restore Restricted" : "Browse & Validate Backup File"}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Cloud Snapshots & Automatic Rollback Checkpoints */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cloud Disaster Recovery Points & Rollback Checkpoints
            </h2>
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {snapshots.length} Points
            </Badge>
          </div>

          <Button
            onClick={loadData}
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSnapshots ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loadingSnapshots ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
            <p className="text-xs text-muted-foreground">Loading recovery checkpoints...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Clock className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No cloud disaster recovery points recorded yet
            </p>
            <p className="text-[10px] text-slate-400">
              Click "Save to Cloud History" to create your first cloud snapshot point.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {snapshots.map((s) => {
              const isRollback = s.id.startsWith("rollback-");
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-3.5 space-y-2.5 flex flex-col justify-between ${
                    isRollback
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
                      : "bg-slate-50/50 dark:bg-slate-900/50"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isRollback ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                        )}
                        {new Date(s.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isRollback ? (
                        <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                          Rollback Guard
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          {s.totalDocuments} docs
                        </Badge>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 truncate">
                      Scope: <strong className="text-slate-700 dark:text-slate-300">{s.scope || "Full Snapshot"}</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1 border-t">
                      <span>Tickets: <strong>{s.summary?.serviceCalls || 0}</strong></span>
                      <span>Customers: <strong>{s.summary?.customers || 0}</strong></span>
                      <span>Products: <strong>{s.summary?.products || 0}</strong></span>
                      <span>Team: <strong>{s.summary?.teamMembers || 0}</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center gap-1.5">
                    <Button
                      onClick={() => handleRestoreCloudSnapshot(s)}
                      disabled={!isAuthorized || restoring || !s.backupData}
                      size="sm"
                      className={`flex-1 h-7 text-[11px] gap-1 rounded-lg font-bold text-white disabled:opacity-50 ${
                        isRollback
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-[#2563EB] hover:bg-blue-700"
                      }`}
                    >
                      <RotateCcw className="h-3 w-3" /> {isRollback ? "Undo & Rollback" : "Restore"}
                    </Button>
                    {s.backupData && (
                      <Button
                        onClick={() => downloadBackupAsJson(s.backupData!)}
                        disabled={!isAuthorized}
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 text-slate-500 hover:text-slate-900 rounded-lg disabled:opacity-50"
                        title={isAuthorized ? "Download JSON" : "Download restricted"}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      onClick={() => setDeleteSnapshotId(s.id)}
                      disabled={!isAuthorized}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg disabled:opacity-50"
                      title={isAuthorized ? "Delete Snapshot" : "Delete restricted"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
