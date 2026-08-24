import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  pageNumber: number;
  currentItemsCount: number;
  hasMore?: boolean;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
  pageSize?: number;
  label?: string;
  className?: string;
}

/**
 * Standardized table footer pagination bar with current page index,
 * item tally, and prev/next page buttons.
 */
export default function TablePagination({
  pageNumber,
  currentItemsCount,
  hasMore = false,
  onPageChange,
  isLoading = false,
  pageSize = 25,
  label = "records",
  className = "",
}: TablePaginationProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs ${className}`}
    >
      <div className="text-slate-500 dark:text-slate-400 font-medium">
        Page <span className="font-extrabold text-slate-900 dark:text-white">{pageNumber}</span>
        {currentItemsCount > 0 && (
          <span>
            {" "}• Showing <span className="font-bold text-slate-900 dark:text-white">{currentItemsCount}</span> {label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={pageNumber <= 1 || isLoading}
          className="h-8 px-3 text-xs gap-1 rounded-xl font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={!hasMore || isLoading}
          className="h-8 px-3 text-xs gap-1 rounded-xl font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
