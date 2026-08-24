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
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  variant?: "destructive" | "warning";
}

/**
 * Standardized delete confirmation modal with destructive button,
 * loading state, and accessible keyboard navigation.
 */
export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Are you sure you want to delete this record?",
  description = "This action cannot be undone and will permanently remove this record.",
  confirmLabel = "Delete Record",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  variant = "destructive",
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl p-6 border-slate-200 dark:border-slate-800 shadow-2xl">
        <AlertDialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                variant === "destructive"
                  ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
              }`}
            >
              {variant === "destructive" ? (
                <Trash2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <AlertDialogTitle className="text-base font-bold font-display text-slate-900 dark:text-slate-100">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-4">
          <AlertDialogCancel
            disabled={loading}
            className="text-xs font-semibold rounded-xl h-9 px-4 mt-0 border-slate-200 dark:border-slate-800"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={`text-xs font-bold rounded-xl h-9 px-4 gap-1.5 shadow-sm text-white ${
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmLabel}</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
