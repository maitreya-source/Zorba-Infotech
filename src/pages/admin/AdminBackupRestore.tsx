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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  createFullDatabaseBackup,
  downloadBackupAsJson,
  saveSnapshotToCloud,
  getCloudSnapshots,
  deleteCloudSnapshot,
  restoreDatabaseFromBackup,
  type FullDatabaseBackup,
  type CloudSnapshot,
  type RestoreProgress,
} from "@/lib/backup";

export default function AdminBackupRestore() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);

  // Restore State
  const [pendingBackup, setPendingBackup] = useState<FullDatabaseBackup | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [deleteSnapshotId, setDeleteSnapshotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const data = await getCloudSnapshots();
      setSnapshots(data);
    } catch {
      toast.error("Failed to load cloud snapshots");
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  // 1. Export & Download JSON
  const handleExportDownload = async () => {
    setExporting(true);
    try {
      const backup = await createFullDatabaseBackup(user?.email || "Super Admin");
      downloadBackupAsJson(backup);
      toast.success(
        `Backup downloaded successfully (${backup.metadata.counts.totalDocuments} total documents)`
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
    setSavingCloud(true);
    try {
      const backup = await createFullDatabaseBackup(user?.email || "Super Admin");
      await saveSnapshotToCloud(backup);
      toast.success("Database snapshot saved to cloud successfully");
      loadSnapshots();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save cloud snapshot");
    } finally {
      setSavingCloud(false);
    }
  };

  // 3. Handle File Upload for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.metadata || !json.data) {
          toast.error("Invalid backup file format. Must contain metadata and data objects.");
          return;
        }
        setPendingBackup(json as FullDatabaseBackup);
        setShowPreviewModal(true);
      } catch (err) {
        toast.error("Failed to parse JSON backup file");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 4. Restore from Cloud Snapshot
  const handleRestoreCloudSnapshot = (snapshot: CloudSnapshot) => {
    if (!snapshot.backupData) {
      toast.error("This cloud snapshot does not contain full backup data.");
      return;
    }
    setPendingBackup(snapshot.backupData);
    setShowPreviewModal(true);
  };

  // 5. Execute Restore
  const handleExecuteRestore = async () => {
    if (!pendingBackup) return;
    setShowPreviewModal(false);
    setRestoring(true);
    setProgress({
      currentCollection: "Initializing",
      processedDocs: 0,
      totalDocs: pendingBackup.metadata.counts.totalDocuments,
      percent: 0,
      status: "restoring",
    });

    try {
      const result = await restoreDatabaseFromBackup(pendingBackup, {
        onProgress: (p) => setProgress(p),
      });

      if (result.errors.length > 0) {
        toast.warning(
          `Restored ${result.restoredCount} documents with ${result.errors.length} warnings.`
        );
      } else {
        toast.success(`Successfully restored ${result.restoredCount} database documents!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Database restore encountered an error");
    } finally {
      setRestoring(false);
    }
  };

  // 6. Delete Cloud Snapshot
  const handleDeleteSnapshot = async () => {
    if (!deleteSnapshotId) return;
    try {
      await deleteCloudSnapshot(deleteSnapshotId);
      toast.success("Snapshot removed");
      setDeleteSnapshotId(null);
      loadSnapshots();
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
              Perform on-demand full database snapshots, download offline JSON backups, and safely restore collection states with atomic batch transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSaveCloudSnapshot}
              disabled={savingCloud || exporting || restoring}
              size="sm"
              variant="outline"
              className="gap-1.5 font-bold bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700 rounded-xl"
            >
              {savingCloud ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-blue-400" />
              )}
              {savingCloud ? "Saving Snapshot..." : "Save Cloud Snapshot"}
            </Button>

            <Button
              onClick={handleExportDownload}
              disabled={exporting || savingCloud || restoring}
              size="sm"
              className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white shadow-md rounded-xl"
            >
              {exporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exporting ? "Generating Backup..." : "Download JSON Backup"}
            </Button>
          </div>
        </div>
      </div>

      {/* Restore in Progress Progress Banner */}
      {restoring && progress && (
        <div className="rounded-2xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              Restoring Database: {progress.currentCollection}...
            </span>
            <span>
              {progress.processedDocs} / {progress.totalDocs} documents ({progress.percent}%)
            </span>
          </div>
          <Progress value={progress.percent} className="h-2 rounded-full" />
        </div>
      )}

      {/* Main Grid: Backup & Restore Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* On-Demand Export Card */}
        <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Export & Backup Operations</h2>
              <p className="text-[11px] text-slate-400">Generate complete Firestore JSON snapshots on-demand</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              Includes all active collections:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Activity className="h-3 w-3 text-blue-500" /> Service Calls & FY Subcollections
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Users className="h-3 w-3 text-emerald-500" /> Customers Directory
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Package className="h-3 w-3 text-amber-500" /> Products & Inventories
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Layers className="h-3 w-3 text-purple-500" /> Master Categories
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleExportDownload}
              disabled={exporting || restoring}
              className="flex-1 gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold h-9 rounded-xl"
            >
              <FileJson className="h-4 w-4" /> Download Backup JSON
            </Button>
            <Button
              onClick={handleSaveCloudSnapshot}
              disabled={savingCloud || restoring}
              variant="outline"
              className="gap-2 h-9 rounded-xl font-semibold"
            >
              <Cloud className="h-4 w-4 text-blue-500" /> Save Cloud Snapshot
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
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Restore from Backup File</h2>
              <p className="text-[11px] text-slate-400">Upload a valid Zorba ERP JSON backup file</p>
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
              <p className="text-[10px] text-slate-400">
                Validates metadata and dry-runs collection counts before execution
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="mt-2 h-8 text-xs font-bold rounded-xl gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Browse Backup File
            </Button>
          </div>
        </div>
      </div>

      {/* Cloud Snapshots History */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cloud Database Snapshots History
            </h2>
            <Badge variant="outline" className="text-[10px] px-2 py-0">
              {snapshots.length} Snapshots
            </Badge>
          </div>

          <Button
            onClick={loadSnapshots}
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
            <p className="text-xs text-muted-foreground">Loading cloud snapshot history...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Clock className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No cloud snapshots recorded yet
            </p>
            <p className="text-[10px] text-slate-400">
              Click "Save Cloud Snapshot" above to create your first cloud disaster recovery point.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {snapshots.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 p-3.5 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      {new Date(s.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.totalDocuments} docs
                    </Badge>
                  </div>

                  <p className="text-[10px] text-slate-400 truncate">
                    Author: <span className="text-slate-600 dark:text-slate-300 font-medium">{s.exportedBy}</span>
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
                    disabled={restoring || !s.backupData}
                    size="sm"
                    className="flex-1 h-7 text-[11px] gap-1 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                  {s.backupData && (
                    <Button
                      onClick={() => downloadBackupAsJson(s.backupData!)}
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-slate-500 hover:text-slate-900 rounded-lg"
                      title="Download JSON"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    onClick={() => setDeleteSnapshotId(s.id)}
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation & Metadata Preview Dialog */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              Confirm Database Restore
            </DialogTitle>
          </DialogHeader>

          {pendingBackup && (
            <div className="space-y-4 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 p-3.5 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Caution: Database Synchronization</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Restoring will update matching documents and recreate all subcollections. Existing records with conflicting IDs will be overwritten.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/60 p-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Backup Metadata
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Created:</span>{" "}
                    <strong>{new Date(pendingBackup.metadata.createdAt).toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Author:</span>{" "}
                    <strong>{pendingBackup.metadata.exportedBy || "Admin"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Version:</span>{" "}
                    <strong>{pendingBackup.metadata.version}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Records:</span>{" "}
                    <strong className="text-[#2563EB]">{pendingBackup.metadata.counts.totalDocuments}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Breakdown by Collection
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    Service Calls: <strong>{pendingBackup.metadata.counts.service_calls}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    Customers: <strong>{pendingBackup.metadata.counts.customers}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    Products: <strong>{pendingBackup.metadata.counts.products}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    Categories: <strong>{pendingBackup.metadata.counts.categories}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    Team Members: <strong>{pendingBackup.metadata.counts.team_members}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    Service Centers: <strong>{pendingBackup.metadata.counts.service_centers}</strong>
                  </div>
                </div>
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
              className="h-9 text-xs rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Confirm & Execute Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteSnapshotId)} onOpenChange={(open) => !open && setDeleteSnapshotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Cloud Snapshot?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this cloud snapshot recovery point?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSnapshot}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Snapshot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
