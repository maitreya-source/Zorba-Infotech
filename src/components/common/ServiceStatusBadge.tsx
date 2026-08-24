import type { ElementType } from "react";
import {
  Inbox,
  Clock,
  Package,
  CheckCircle2,
  Send,
  XCircle,
  FileText,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import type { ServiceCallStatus, QuotationStatus } from "@/lib/types";

interface ServiceStatusBadgeProps {
  status: ServiceCallStatus | QuotationStatus | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: ElementType;
  classes: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Service Call Statuses
  received: {
    label: "Received",
    icon: Inbox,
    classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  waiting_for_parts: {
    label: "Waiting for Parts",
    icon: Package,
    classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  completed: {
    label: "Ready for Delivery",
    icon: CheckCircle2,
    classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  delivered: {
    label: "Delivered",
    icon: Send,
    classes: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    classes: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },

  // Quotation Statuses
  draft: {
    label: "Draft",
    icon: FileText,
    classes: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
  sent: {
    label: "Sent to Client",
    icon: Send,
    classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  accepted: {
    label: "Accepted / Approved",
    icon: FileCheck,
    classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected / Declined",
    icon: XCircle,
    classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

/**
 * Standardized status badge for Service Calls and Quotations.
 */
export default function ServiceStatusBadge({
  status,
  size = "md",
  className = "",
}: ServiceStatusBadgeProps) {
  const normalized = (status || "").toLowerCase();
  const config = STATUS_MAP[normalized] || {
    label: status ? String(status).replace(/_/g, " ") : "Unknown",
    icon: FileText,
    classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  const Icon = config.icon;

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1"
      : size === "lg"
      ? "text-xs px-3 py-1 gap-1.5 font-bold"
      : "text-[11px] px-2.5 py-0.5 gap-1.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-display tracking-tight shrink-0 transition-colors ${config.classes} ${sizeClasses} ${className}`}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5 shrink-0" : "h-3 w-3 shrink-0"} />
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
