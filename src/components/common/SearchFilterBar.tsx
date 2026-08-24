import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchFilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  count?: number;
  countLabel?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Standardized Search & Filter Header with search input, clear button,
 * item tally badge, and slot for filter dropdowns.
 */
export default function SearchFilterBar({
  value,
  onChange,
  placeholder = "Search records...",
  count,
  countLabel = "Items",
  children,
  className = "",
}: SearchFilterBarProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 ${className}`}
    >
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-8 h-9 text-xs rounded-xl w-full border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 focus:bg-white transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {children}

        {count !== undefined && (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 ml-auto sm:ml-0">
            <span>{countLabel}:</span>
            <Badge
              variant="secondary"
              className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] px-2 py-0.5"
            >
              {count}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
