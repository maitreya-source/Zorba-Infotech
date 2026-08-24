import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FirebaseErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/**
 * Standardized Firebase Error banner with error details and one-click retry handler.
 */
export default function FirebaseErrorState({
  error,
  onRetry,
  title = "Connection Error",
  className = "",
}: FirebaseErrorStateProps) {
  if (!error) return null;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4 space-y-3 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-extrabold text-destructive text-base font-display">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">{error}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} className="mt-2 gap-2 text-xs font-semibold rounded-xl" variant="outline" size="sm">
          <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
        </Button>
      )}
    </div>
  );
}
