import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { FullDatabaseBackup } from "@/lib/backup";
import type { PreFlightValidationReport } from "@/lib/backupValidation";

interface RestoreInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingBackup: FullDatabaseBackup | null;
  validationReport: PreFlightValidationReport | null;
  skipInvalid: boolean;
  onSkipInvalidChange: (val: boolean) => void;
  createRollback: boolean;
  onCreateRollbackChange: (val: boolean) => void;
  onExecuteRestore: () => void;
}

export default function RestoreInspectionDialog({
  open,
  onOpenChange,
  pendingBackup,
  validationReport,
  skipInvalid,
  onSkipInvalidChange,
  createRollback,
  onCreateRollbackChange,
  onExecuteRestore,
}: RestoreInspectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <Switch checked={createRollback} onCheckedChange={onCreateRollbackChange} />
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
                  <Switch checked={skipInvalid} onCheckedChange={onSkipInvalidChange} />
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
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onExecuteRestore}
            disabled={!validationReport?.isValid && !skipInvalid}
            className="h-9 text-xs rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
          >
            Confirm & Restore {validationReport?.validCount} Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
