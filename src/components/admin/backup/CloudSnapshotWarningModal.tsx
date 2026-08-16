import { AlertTriangle, FolderSync } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

interface CloudSnapshotWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedCloudSnapshot: () => void;
  onUseGoogleDrive: () => void;
}

export default function CloudSnapshotWarningModal({
  open,
  onOpenChange,
  onProceedCloudSnapshot,
  onUseGoogleDrive,
}: CloudSnapshotWarningModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
                onOpenChange(false);
                onProceedCloudSnapshot();
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
                onOpenChange(false);
                onUseGoogleDrive();
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
  );
}
