import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Wrench,
  Trash2,
  Pencil,
  Printer,
  RefreshCw,
  Activity,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Inbox,
  Building2,
  Clock,
  Package,
  CheckCircle2,
  Send,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getServiceCalls, deleteServiceCall, restoreServiceCall, updateServiceCall, getFinancialYears } from "@/lib/firestore";
import type { ServiceCall, ServiceCallStatus, FinancialYearDoc } from "@/lib/types";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import ShortcutsHelpModal from "@/components/admin/ShortcutsHelpModal";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";

type SortField = "status" | "ticket" | "customer" | "device" | "charges";
type SortDirection = "asc" | "desc";

const statusPriority: Record<ServiceCallStatus, number> = {
  in_progress: 1,
  sent_to_service_center: 2,
  waiting_for_parts: 3,
  received: 4,
  completed: 5,
  delivered: 6,
  cancelled: 7,
};

const STATUS_OPTIONS: {
  value: ServiceCallStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgClass: string;
}[] = [
  {
    value: "received",
    label: "Received",
    icon: Inbox,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60",
  },
  {
    value: "sent_to_service_center",
    label: "Sent to Service Center",
    icon: Building2,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: Clock,
    iconColor: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60",
  },
  {
    value: "waiting_for_parts",
    label: "Waiting for Parts",
    icon: Package,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60",
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60",
  },
  {
    value: "delivered",
    label: "Delivered",
    icon: Send,
    iconColor: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    iconColor: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60",
  },
];

export default function AdminServiceCalls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fyFilter, setFyFilter] = useState<string>("all");
  const [fys, setFys] = useState<FinancialYearDoc[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "inactive" | "trash">("active");
  
  // Interactive Header Sort: default sorted by status ascending (in_progress -> received)
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [printCall, setPrintCall] = useState<ServiceCall | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, fyData] = await Promise.all([
        getServiceCalls(),
        getFinancialYears().catch(() => []),
      ]);
      setCalls(data);
      setFys(fyData);
    } catch (err: any) {
      console.error("Firebase error in AdminServiceCalls:", err);
      setError(err?.message || "Unable to connect to Firebase to load service calls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteServiceCall(deleteId);
      toast.success("Ticket moved to Trash. It can be restored anytime.");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to move ticket to Trash");
    }
  };

  const handleRestore = async (callId: string, ticketNumber?: string) => {
    try {
      await restoreServiceCall(callId);
      toast.success(`Ticket ${ticketNumber || callId} restored to active list`);
      loadData();
    } catch {
      toast.error("Failed to restore service call");
    }
  };

  const handleStatusChange = async (callId: string, newStatus: ServiceCallStatus) => {
    try {
      await updateServiceCall(callId, { status: newStatus });
      toast.success(`Ticket status updated to ${newStatus.replace(/_/g, " ")}`);
      setCalls((prev) =>
        prev.map((c) => (c.id === callId ? { ...c, status: newStatus, updatedAt: Date.now() } : c))
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Status Badge with dot indicator matching Figma design
  const getStatusDotBadge = (status: ServiceCallStatus, isDeleted?: boolean) => {
    if (isDeleted) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Trash / Archived
        </span>
      );
    }

    switch (status) {
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[#7C3AED] bg-purple-50 dark:bg-purple-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            In Progress
          </span>
        );
      case "received":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-blue-50 dark:bg-blue-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
            Received
          </span>
        );
      case "sent_to_service_center":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-100 dark:bg-purple-950/60">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
            Service Center
          </span>
        );
      case "waiting_for_parts":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Waiting Parts
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 dark:bg-green-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
            Delivered
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Cancelled
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Categorize active vs inactive vs trash
  const isCallActive = (status: ServiceCallStatus) =>
    ["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(status);

  const activeCalls = calls.filter((c) => !c.isDeleted && isCallActive(c.status));
  const inactiveCalls = calls.filter((c) => !c.isDeleted && !isCallActive(c.status));
  const trashCalls = calls.filter((c) => !!c.isDeleted);

  // Statistics calculation for hero KPI cards (excluding trash)
  const nonDeletedCalls = calls.filter((c) => !c.isDeleted);
  const totalCalls = nonDeletedCalls.length;
  const inProgressCount = nonDeletedCalls.filter((c) => c.status === "in_progress").length;
  const serviceCenterCount = nonDeletedCalls.filter((c) => c.type === "company_service_center" || c.status === "sent_to_service_center").length;
  const onsiteCount = nonDeletedCalls.filter((c) => c.type === "onsite_visit").length;

  const currentList = activeTab === "active" ? activeCalls : activeTab === "inactive" ? inactiveCalls : trashCalls;

  // Filter list
  const filtered = currentList.filter((c) => {
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesFY = fyFilter === "all" || c.fyId === fyFilter || (!c.fyId && fyFilter === "all");
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.ticketNo.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.customerPhone.toLowerCase().includes(q) ||
      c.deviceCategory.toLowerCase().includes(q) ||
      c.issueDescription.toLowerCase().includes(q) ||
      (c.modelNumber && c.modelNumber.toLowerCase().includes(q)) ||
      (c.serialNumber && c.serialNumber.toLowerCase().includes(q)) ||
      (c.fyId && c.fyId.toLowerCase().includes(q)) ||
      (c.monthKey && c.monthKey.toLowerCase().includes(q));

    return matchesType && matchesStatus && matchesFY && matchesSearch;
  });

  // Handle clickable header sort toggle
  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort filtered list
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "status": {
        const pA = statusPriority[a.status] ?? 99;
        const pB = statusPriority[b.status] ?? 99;
        cmp = pA - pB;
        if (cmp === 0) {
          // secondary sort: newest first
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() || 0 : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() || 0 : 0;
          cmp = timeB - timeA;
        }
        break;
      }
      case "ticket":
        cmp = (a.ticketNo || "").localeCompare(b.ticketNo || "");
        break;
      case "customer":
        cmp = (a.customerName || "").localeCompare(b.customerName || "");
        break;
      case "device":
        cmp = (a.deviceCategory || "").localeCompare(b.deviceCategory || "");
        break;
      case "charges":
        cmp = (a.grandTotal || 0) - (b.grandTotal || 0);
        break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const renderSortHeader = (label: string, field: SortField, className = "") => {
    const isActive = sortField === field;
    return (
      <th
        className={`py-4 cursor-pointer select-none transition-colors hover:text-slate-900 dark:hover:text-white ${className}`}
        onClick={() => handleHeaderSort(field)}
        title={`Sort by ${label}`}
      >
        <div className="flex items-center gap-1.5 group">
          <span className={isActive ? "text-[#2563EB] dark:text-blue-400 font-extrabold" : "text-slate-500 dark:text-slate-400"}>
            {label}
          </span>
          <span className="shrink-0">
            {isActive ? (
              sortDirection === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter, fyFilter, activeTab, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Keyboard Shortcuts handler
  useTallyShortcuts({
    onAltC: () => navigate("/admin/service-calls/new"),
    onAltA: () => navigate("/admin/service-calls/new"),
    onAltP: () => {
      if (paginatedCalls.length > 0) {
        setPrintCall(paginatedCalls[0]);
      }
    },
    onAltD: () => {
      if (paginatedCalls.length > 0) {
        setDeleteId(paginatedCalls[0].id);
      }
    },
  });

  return (
    <div className="p-2 md:p-4 space-y-4 max-w-[1440px] mx-auto text-xs">
      {/* 1. Integrated Blue Hero Header Card (Consistent with Technicians & Staff pages) */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 md:p-5 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Service Calls Dashboard
            </h1>
            <p className="text-xs text-slate-300">
              Manage service intake tickets, OEM parcel tracking, repair lifecycle, and technician assignments
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link to="/admin/reports">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-2xs backdrop-blur-md"
              >
                Reports
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomerModal(true)}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-2xs backdrop-blur-md"
            >
              Add Customer
            </Button>

            <Link to="/admin/service-calls/new">
              <Button
                size="sm"
                className="h-9 px-4 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white shadow-glow-sm gap-1.5"
              >
                <Plus className="h-4 w-4" /> New Service Call
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI Stat Cards (4 Cards: Total, Active, Service Center, Onsite) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: TOTAL SVC CALLS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            TOTAL SVC CALLS
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-display mt-1">
            {totalCalls}
          </div>
        </div>

        {/* Card 2: ACTIVE WORK */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            ACTIVE WORK
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-[#D97706] font-display mt-1">
            {inProgressCount}
          </div>
        </div>

        {/* Card 3: SERVICE CENTER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            SERVICE CENTER
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-[#7C3AED] font-display mt-1">
            {serviceCenterCount}
          </div>
        </div>

        {/* Card 4: ONSITE CARE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            ONSITE CARE
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-[#0D9488] font-display mt-1">
            {onsiteCount}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar: Segmented Tabs + Search + Dropdowns */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-0.5">
        {/* Left Segmented Tab Pills (Horizontally scrollable on mobile) */}
        <div className="overflow-x-auto no-scrollbar max-w-full pb-0.5">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800 shrink-0 w-fit">
            <button
              onClick={() => {
                setActiveTab("active");
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              <span>Active Calls</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === "active" ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {activeCalls.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("inactive");
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "inactive"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Completed / Delivered</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === "inactive" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {inactiveCalls.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("trash");
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "trash"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Trash / Archived</span>
              {trashCalls.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                  {trashCalls.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Filters (Responsive Grid on Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2.5 w-full xl:w-auto">
          <div className="relative min-w-[180px] sm:col-span-2 md:flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search ticket, customer, device..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs w-full"
            />
          </div>

          <Select value={fyFilter} onValueChange={setFyFilter}>
            <SelectTrigger className="w-full md:w-36 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-semibold">
              <SelectValue placeholder="All FYs" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all">All Financial Years</SelectItem>
              {fys.map((fy) => (
                <SelectItem key={fy.id} value={fy.id}>
                  {fy.label || fy.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-36 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-semibold">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="company_service_center">Service Center</SelectItem>
              <SelectItem value="in_house_repair">In-House Repair</SelectItem>
              <SelectItem value="onsite_visit">Onsite Visit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-36 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-semibold sm:col-span-2 md:col-span-1">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {activeTab === "active" ? (
                <>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="sent_to_service_center">Sent to Service Center</SelectItem>
                  <SelectItem value="waiting_for_parts">Waiting for Parts</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Main Table Card Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent mb-3" />
          <p className="text-xs text-slate-500 font-medium">Connecting to Firebase...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
            <Wrench className="h-6 w-6" />
          </div>
          <p className="font-extrabold text-destructive text-lg font-display">Firebase Connection Error</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={() => loadData()} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-20 text-center shadow-xs px-4">
          <Wrench className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="font-bold text-base font-display text-slate-900 dark:text-white">
            No {activeTab === "active" ? "Active" : activeTab === "inactive" ? "Inactive" : "Trash / Archived"} Service Calls Found
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {calls.length === 0
              ? "Click \"New Service Call\" to record your first ticket."
              : "There are currently no records matching your active filters."}
          </p>
          <Link to="/admin/service-calls/new" className="mt-4">
            <Button size="sm" className="gap-1.5 font-bold shadow-sm bg-[#2563EB] hover:bg-blue-700 text-white text-xs rounded-xl">
              <Plus className="h-4 w-4" /> Create New Service Call
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                  {renderSortHeader("TICKET & DATE", "ticket", "pl-6 pr-4")}
                  {renderSortHeader("CUSTOMER", "customer", "px-4")}
                  {renderSortHeader("DEVICE & CATEGORY", "device", "px-4")}
                  {renderSortHeader("STATUS", "status", "px-4")}
                  {renderSortHeader("CHARGES", "charges", "px-4")}
                  <th className="pl-4 pr-6 py-4 text-right text-slate-500 dark:text-slate-400">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {paginatedCalls.map((item) => {
                  const displayDate = item.dateTime
                    ? new Date(item.dateTime).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={item.id}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("a") ||
                          target.closest("[role='menuitem']") ||
                          target.closest("[role='option']") ||
                          target.closest("[data-radix-popper-content-wrapper]") ||
                          target.closest(".action-cell") ||
                          target.closest(".status-cell")
                        ) {
                          return;
                        }
                        navigate(`/admin/service-calls/${item.id}/edit`);
                      }}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      {/* Ticket & Date */}
                      <td className="pl-6 pr-4 py-4 align-middle">
                        <div className="font-bold text-[#2563EB] font-mono text-sm tracking-tight">
                          {item.ticketNo}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{displayDate}</div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4 align-middle">
                        {item.customerId ? (
                          <Link
                            to={`/admin/customers/${item.customerId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-slate-900 dark:text-slate-100 text-xs hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1"
                            title="View Customer Profile & Service History"
                          >
                            <span>{item.customerName}</span>
                          </Link>
                        ) : (
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.customerName}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          📞 {item.customerPhone}
                        </div>
                      </td>

                      {/* Device & Category */}
                      <td className="px-4 py-4 align-middle max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {item.deviceCategory}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {item.modelNumber ? `Model: ${item.modelNumber}` : item.issueDescription}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="status-cell px-4 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={item.status}
                          onValueChange={(val: ServiceCallStatus) => handleStatusChange(item.id, val)}
                          disabled={!!item.isDeleted}
                        >
                          <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 w-fit">
                            <SelectValue>{getStatusDotBadge(item.status, item.isDeleted)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs py-2 cursor-pointer">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`h-6 w-6 rounded-lg ${opt.bgClass} flex items-center justify-center shrink-0`}>
                                      <Icon className={`h-3.5 w-3.5 ${opt.iconColor}`} />
                                    </div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{opt.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Charges */}
                      <td className="px-4 py-4 align-middle">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                          ₹{item.grandTotal.toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Actions (Pencil Edit & Horizontal Dots Dropdown / Restore in Trash) */}
                      <td className="action-cell pl-4 pr-6 py-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {activeTab === "trash" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(item.id, item.ticketNo);
                              }}
                              className="h-8 text-xs font-bold gap-1.5 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Restore Ticket</span>
                            </Button>
                          ) : (
                            <>
                              <Link to={`/admin/service-calls/${item.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit Service Call"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </Link>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="More Actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setPrintCall(item);
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Printer className="h-3.5 w-3.5 text-slate-500" /> Print Job Card
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      navigate(`/admin/service-calls/${item.id}/edit`);
                                    }}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteId(item.id);
                                    }}
                                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger className="h-7 w-16 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2">
                Showing {sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Modals */}
      <CreateCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />
      <CreateDeviceCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />
      <ShortcutsHelpModal open={showShortcutsModal} onOpenChange={setShowShortcutsModal} />
      <JobCardPrintModal serviceCall={printCall} open={!!printCall} onOpenChange={(open) => !open && setPrintCall(null)} />

      {/* Delete / Move to Trash Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Service Call to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This ticket will be moved to the <strong>Trash / Archived</strong> tab and hidden from active lists. You can restore it back anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
