import {
  HardDrive,
  RefreshCw,
  Folder,
  FileJson,
  RotateCcw,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { DriveBackupItem } from "@/lib/googleDriveBackup";

interface GoogleDriveArchivesCardProps {
  driveBackups: DriveBackupItem[];
  loadingDriveBackups: boolean;
  restoringFromDriveId: string | null;
  isAuthorized: boolean;
  restoring: boolean;
  onRefresh: () => void;
  onRestoreFromDrive: (item: DriveBackupItem) => void;
}

export default function GoogleDriveArchivesCard({
  driveBackups,
  loadingDriveBackups,
  restoringFromDriveId,
  isAuthorized,
  restoring,
  onRefresh,
  onRestoreFromDrive,
}: GoogleDriveArchivesCardProps) {
  return (
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
              onClick={onRefresh}
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
                        onClick={() => onRestoreFromDrive(f)}
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
  );
}
