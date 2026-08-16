import { Download, Cloud, RefreshCw, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FinancialYearDoc } from "@/lib/types";

interface ScopedExportCardProps {
  financialYears: FinancialYearDoc[];
  selectedFyId: string;
  onSelectFyId: (val: string) => void;
  selectedModule: string;
  onSelectModule: (val: string) => void;
  canSyncToDrive: boolean;
  canDownloadAndRestore: boolean;
  syncingDrive: boolean;
  exporting: boolean;
  savingCloud: boolean;
  restoring: boolean;
  onSyncToGoogleDrive: () => void;
  onExportDownload: () => void;
  onSaveCloudSnapshot: () => void;
}

export default function ScopedExportCard({
  financialYears,
  selectedFyId,
  onSelectFyId,
  selectedModule,
  onSelectModule,
  canSyncToDrive,
  canDownloadAndRestore,
  syncingDrive,
  exporting,
  savingCloud,
  restoring,
  onSyncToGoogleDrive,
  onExportDownload,
  onSaveCloudSnapshot,
}: ScopedExportCardProps) {
  return (
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
            <Select value={selectedFyId} onValueChange={onSelectFyId}>
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
            <Select value={selectedModule} onValueChange={onSelectModule}>
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
          <span className="text-amber-500 shrink-0">��</span>
          <span><strong>Partitioning Tip:</strong> Exporting by specific FY produces compact archives and instant downloads.</span>
        </p>
      </div>

      <div className="pt-2 space-y-2">
        <Button
          onClick={onSyncToGoogleDrive}
          disabled={!canSyncToDrive || syncingDrive || exporting || restoring}
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
            onClick={onExportDownload}
            disabled={!canDownloadAndRestore || exporting || restoring || syncingDrive}
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
            onClick={onSaveCloudSnapshot}
            disabled={!canDownloadAndRestore || savingCloud || restoring || syncingDrive}
            variant="outline"
            className="gap-1.5 h-9 rounded-xl font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer truncate"
          >
            {savingCloud ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            )}
            <span className="truncate">{savingCloud ? "Saving..." : "Save Snapshot"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
