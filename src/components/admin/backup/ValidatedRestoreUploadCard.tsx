import { Upload, FileJson, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ValidatedRestoreUploadCardProps {
  isAuthorized: boolean;
  restoring: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ValidatedRestoreUploadCard({
  isAuthorized,
  restoring,
  fileInputRef,
  onFileSelect,
}: ValidatedRestoreUploadCardProps) {
  return (
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
            onChange={onFileSelect}
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
  );
}
