import type { ElementType, ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: ReactNode;
  icon: ElementType;
  iconClassName?: string;
  iconBgClassName?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Standardized KPI / metric summary card used across Reports,
 * Customer Details, Dashboard, and Invoicing.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName = "text-blue-600 dark:text-blue-400",
  iconBgClassName = "bg-blue-50 dark:bg-blue-950/50",
  onClick,
  className = "",
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-card rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-blue-500/50 hover:shadow-md" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            {value}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBgClassName}`}>
          <Icon className={`h-5 w-5 ${iconClassName}`} />
        </div>
      </div>

      {subtitle && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}
