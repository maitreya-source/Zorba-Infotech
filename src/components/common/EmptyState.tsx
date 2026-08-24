import type { ElementType, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ElementType;
  secondaryAction?: ReactNode;
  className?: string;
}

/**
 * Standardized Empty State banner for empty tables, search filters, and lists.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-1">
        <Icon className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <p className="font-bold text-slate-900 dark:text-white text-sm font-display">
          {title}
        </p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(actionLabel || secondaryAction) && (
        <div className="flex items-center gap-2 pt-2">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
