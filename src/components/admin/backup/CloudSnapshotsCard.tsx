import {
  Cloud,
  RefreshCw,
  Clock,
  ShieldCheck,
  RotateCcw,
  Download,
  Trash2,
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
import LoadingScreen from "@/components/common/LoadingScreen";
import type { CloudSnapshot, FullDatabaseBackup } from "@/lib/backup";

interface CloudSnapshotsCardProps {
  snapshots: CloudSnapshot[];
  loadingSnapshots: boolean;
  isAuthorized: boolean;
  restoring: boolean;
  onRefresh: () => void;
  onRestoreSnapshot: (snapshot: CloudSnapshot) => void;
  onDownloadSnapshot: (backupData: FullDatabaseBackup) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

export default function CloudSnapshotsCard({
  snapshots,
  loadingSnapshots,
  isAuthorized,
  restoring,
  onRefresh,
  onRestoreSnapshot,
  onDownloadSnapshot,
  onDeleteSnapshot,
}: CloudSnapshotsCardProps) {
  return (
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
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSnapshots ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loadingSnapshots ? (
          <LoadingScreen
            fullScreen={false}
            title="Cloud Snapshots"
            subtitle="Loading recovery checkpoints..."
          />
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
                        onClick={() => onRestoreSnapshot(s)}
                        disabled={!isAuthorized || restoring || !s.backupData}
                        className="gap-2 cursor-pointer font-medium text-xs text-blue-600 dark:text-blue-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{isRollback ? "Undo & Rollback" : "Restore Checkpoint"}</span>
                      </DropdownMenuItem>
                      {s.backupData && (
                        <DropdownMenuItem
                          onClick={() => onDownloadSnapshot(s.backupData!)}
                          disabled={!isAuthorized}
                          className="gap-2 cursor-pointer text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download JSON</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDeleteSnapshot(s.id)}
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
  );
}
