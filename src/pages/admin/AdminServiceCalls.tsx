import { useEffect, useState, useMemo, useRef } from "react";
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
  Truck,
  MessageSquare,
  Phone,
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
  ConfirmDeleteDialog,
  EmptyState,
  FirebaseErrorState,
  TablePagination,
  LoadingScreen,
} from "@/components/common";
import { getServiceCalls, deleteServiceCall, restoreServiceCall, updateServiceCall, getFinancialYears } from "@/lib/firestore";
import { subscribeSyncSignal } from "@/lib/realtimeSync";
import type { ServiceCall, ServiceCallStatus, FinancialYearDoc } from "@/lib/types";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import DispatchSlipPrintModal from "@/components/admin/DispatchSlipPrintModal";
import WhatsAppPreviewModal from "@/components/admin/WhatsAppPreviewModal";
import ShortcutsHelpModal from "@/components/admin/ShortcutsHelpModal";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";
import { useTallyListNavigation } from "@/hooks/useTallyKeyboard";

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
  hindiLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgClass: string;
}[] = [
  {
    value: "received",
    label: "Received",
    hindiLabel: "डिवाइस जमा हुआ",
    icon: Inbox,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60",
  },
  {
    value: "sent_to_service_center",
    label: "Sent to Service Center",
    hindiLabel: "सर्विस सेंटर भेजा गया",
    icon: Building2,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60",
  },
  {
    value: "in_progress",
    label: "In Progress",
    hindiLabel: "काम चालू है",
    icon: Clock,
    iconColor: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60",
  },
  {
    value: "waiting_for_parts",
    label: "Waiting for Parts",
    hindiLabel: "पार्ट्स का इंतजार",
    icon: Package,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60",
  },
  {
    value: "completed",
    label: "Completed",
    hindiLabel: "तैयार / ठीक हो गया",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60",
  },
  {
    value: "delivered",
    label: "Delivered",
    hindiLabel: "ग्राहक को सौंप दिया",
    icon: Send,
    iconColor: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    hindiLabel: "रद्द किया गया",
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
  const [dispatchPrintCall, setDispatchPrintCall] = useState<ServiceCall | null>(null);
  const [whatsAppCall, setWhatsAppCall] = useState<ServiceCall | null>(null);

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
    // Preload heavy Service Call form chunk in background for instant 0ms editing
    import("./AdminServiceCallForm");

    // Real-time zero-cost table refresh when tickets are updated on any machine
    const unsub = subscribeSyncSignal("service_calls", () => {
      getServiceCalls().then((data) => setCalls(data)).catch(() => {});
    });
    return () => unsub();
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
            Sent to Service Center
          </span>
        );
      case "waiting_for_parts":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Waiting for Parts
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

  // Smart cross-tab search discovery for elders/counter staff
  const matchingOtherTabCount = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q || q.length < 2) return 0;
    if (activeTab === "active") {
      return inactiveCalls.filter((c) =>
        c.ticketNo.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q)
      ).length;
    }
    if (activeTab === "inactive") {
      return activeCalls.filter((c) =>
        c.ticketNo.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q)
      ).length;
    }
    return 0;
  }, [search, activeTab, activeCalls, inactiveCalls]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tally List Navigation (ArrowUp/Down to highlight row, Enter to open, '/' to focus search, Alt+P/W/D on selected row)
  const { selectedIndex, getRowProps } = useTallyListNavigation<ServiceCall>({
    items: paginatedCalls,
    searchRef: searchInputRef,
    onOpenItem: (item) => navigate(`/admin/service-calls/${item.id}/edit`),
    onNewItem: () => navigate("/admin/service-calls/new"),
    onPrintItem: (item) => setPrintCall(item),
    onWhatsAppItem: (item) => setWhatsAppCall(item),
    onDeleteItem: (item) => setDeleteId(item.id),
    onPrevPage: () => setCurrentPage((p) => Math.max(1, p - 1)),
    onNextPage: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
  });

  return (
    <div className="p-2 md:p-4 space-y-4 max-w-[1440px] mx-auto text-xs">
      {/* 1. Compact Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg sm:text-xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">
            Service Calls
          </h1>
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {totalCalls} Total
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {inProgressCount} Active
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
              {serviceCenterCount} Center
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              {onsiteCount} Onsite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/admin/reports">
            <Button
              variant="outline"
              size="sm"
              className="h-10 sm:h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Reports
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomerModal(true)}
            className="h-10 sm:h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Add Customer
          </Button>

          <Link to="/admin/service-calls/new">
            <Button
              size="sm"
              className="h-10 sm:h-9 px-3.5 sm:px-4 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white shadow-glow-sm gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> New Service Call
            </Button>
          </Link>
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

        {/* Right Filters (Search + 3 Select Dropdowns) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full xl:w-auto">
          <div className="relative min-w-[180px] md:flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search ticket, customer, phone... (Press '/' to focus)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 sm:h-10 text-base sm:text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs w-full placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 md:flex md:items-center">
            <Select value={fyFilter} onValueChange={setFyFilter}>
              <SelectTrigger className="w-full md:w-36 h-10 sm:h-9 px-2 sm:px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-semibold">
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
              <SelectTrigger className="w-full md:w-36 h-10 sm:h-9 px-2 sm:px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-semibold">
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
              <SelectTrigger className="w-full md:w-36 h-10 sm:h-9 px-2 sm:px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs font-semibold">
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
      </div>

      {/* Cross-tab Search Discovery Banner for Elders/Counter Staff */}
      {matchingOtherTabCount > 0 && sorted.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="text-xs sm:text-sm">
            <span className="font-extrabold text-amber-800 dark:text-amber-300">💡 Note:</span> No results in{" "}
            <strong>{activeTab === "active" ? "Active Calls" : "Completed / Delivered"}</strong>, but found{" "}
            <span className="underline font-bold font-mono">{matchingOtherTabCount}</span> matching ticket(s) in{" "}
            <strong>{activeTab === "active" ? "Completed / Delivered" : "Active Calls"}</strong>!
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setActiveTab(activeTab === "active" ? "inactive" : "active")}
            className="h-11 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Switch to {activeTab === "active" ? "Completed" : "Active"} ({matchingOtherTabCount})
          </Button>
        </div>
      )}

      {/* 4. Main Table / Mobile Cards Container */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
          <LoadingScreen fullScreen={false} title="Service Calls" subtitle="Loading repair job cards..." />
        </div>
      ) : error ? (
        <FirebaseErrorState
          error={error}
          onRetry={() => loadData()}
          title="Service Calls Sync Error"
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={`No ${activeTab === "active" ? "Active" : activeTab === "inactive" ? "Completed / Delivered" : "Trash / Archived"} Service Calls Found`}
          description={
            calls.length === 0
              ? "Click \"Create New Service Call\" to record your first ticket."
              : "There are currently no repair tickets matching your active filter criteria."
          }
          actionLabel="Create New Service Call"
          actionIcon={Plus}
          onAction={() => navigate("/admin/service-calls/new")}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-3.5">
            {paginatedCalls.map((item) => {
              const displayDate = item.dateTime
                ? new Date(item.dateTime).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    const t = e.target as HTMLElement;
                    if (
                      t.closest("button") ||
                      t.closest("a") ||
                      t.closest("[role='combobox']") ||
                      t.closest("[data-state]")
                    ) {
                      return;
                    }
                    navigate(`/admin/service-calls/${item.id}/edit`);
                  }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700/60 active:scale-[0.99] transition-all"
                >
                  {/* Card Header: Customer Name & Ticket Number */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {item.customerName || "Walk-in Customer"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        📅 {displayDate}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 px-2.5 py-1 rounded-xl">
                      {item.ticketNo}
                    </span>
                  </div>

                  {/* Device Category & Problem Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-xs space-y-1 border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                      <span>💻</span>
                      <span>{item.deviceCategory}</span>
                      {item.modelNumber && (
                        <span className="text-slate-500 dark:text-slate-400 font-normal">({item.modelNumber})</span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-200">Issue:</strong>{" "}
                      {item.issueDescription || "General diagnosis & service"}
                    </p>
                  </div>

                  {/* Status and Total Row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div>
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
                                  <div className="flex flex-col text-left">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{opt.hindiLabel}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{opt.label}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Bill</div>
                      <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                        ₹{item.grandTotal.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Big 48px Action Buttons: Call, WhatsApp, Details */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {/* 1-Tap Call */}
                    <a
                      href={`tel:${item.customerPhone}`}
                      className="h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-2xs"
                      title={`Call ${item.customerPhone}`}
                    >
                      <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Call</span>
                    </a>

                    {/* 1-Tap WhatsApp */}
                    <button
                      type="button"
                      onClick={() => setWhatsAppCall(item)}
                      className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
                      title="Send WhatsApp Update"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </button>

                    {/* 1-Tap Edit / Details */}
                    <Link
                      to={`/admin/service-calls/${item.id}/edit`}
                      className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-98 transition-all border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider bg-slate-100/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200">
                  {renderSortHeader("TICKET & DATE", "ticket", "pl-6 pr-4 py-3.5")}
                  {renderSortHeader("CUSTOMER", "customer", "px-4 py-3.5")}
                  {renderSortHeader("DEVICE & CATEGORY", "device", "px-4 py-3.5")}
                  {renderSortHeader("STATUS", "status", "px-4 py-3.5")}
                  {renderSortHeader("CHARGES", "charges", "px-4 py-3.5")}
                  <th className="pl-4 pr-6 py-3.5 text-right text-slate-700 dark:text-slate-300">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {paginatedCalls.map((item, idx) => {
                  const displayDate = item.dateTime
                    ? new Date(item.dateTime).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                  const rowProps = getRowProps(idx);

                  return (
                    <tr
                      key={item.id}
                      {...rowProps}
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
                        rowProps.onClick?.();
                        navigate(`/admin/service-calls/${item.id}/edit`);
                      }}
                      className={`transition-colors group cursor-pointer ${rowProps.className}`}
                    >
                      {/* Ticket & Date */}
                      <td className="pl-6 pr-4 py-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          {idx === selectedIndex && (
                            <span className="text-blue-600 dark:text-blue-400 font-black text-xs animate-in fade-in duration-100">▶</span>
                          )}
                          <div className="font-bold text-[#2563EB] dark:text-blue-400 font-mono text-sm tracking-tight">
                            {item.ticketNo}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{displayDate}</div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4 align-middle">
                        {item.customerId ? (
                          <Link
                            to={`/admin/customers/${item.customerId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1"
                            title="View Customer Profile & Service History"
                          >
                            <span>{item.customerName}</span>
                          </Link>
                        ) : (
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {item.customerName}
                          </div>
                        )}
                        <div className="text-xs text-slate-600 dark:text-slate-300 font-mono font-semibold mt-0.5">
                          📞 {item.customerPhone}
                        </div>
                      </td>

                      {/* Device & Category */}
                      <td className="px-4 py-4 align-middle max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {item.deviceCategory}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate font-medium">
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
                                    <div className="flex flex-col text-left">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{opt.hindiLabel}</span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{opt.label}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Charges */}
                      <td className="px-4 py-4 align-middle">
                        <div className="font-extrabold text-slate-900 dark:text-white text-base font-display">
                          ₹{item.grandTotal.toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Actions (Direct 1-Click Print, WhatsApp, Edit & Secondary Dropdown) */}
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
                              {/* Direct 1-Click Print Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintCall(item);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/60 transition-colors cursor-pointer border border-blue-200/80 dark:border-blue-800/60 shadow-2xs"
                                title={`1-Click Print Job Card (${item.ticketNo})`}
                              >
                                <Printer className="h-4 w-4" />
                              </button>

                              {/* Direct 1-Click WhatsApp API Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWhatsAppCall(item);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs"
                                title={`1-Click WhatsApp API Update (${item.customerPhone})`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>

                              {/* Edit Service Call Button */}
                              <Link to={`/admin/service-calls/${item.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                                  title="Edit Service Call"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </Link>

                              {/* Secondary Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="More Options"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                                  {item.type === "company_service_center" && (
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setDispatchPrintCall(item);
                                      }}
                                      className="gap-2 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                                    >
                                      <Truck className="h-3.5 w-3.5 text-blue-500" /> Print Dispatch Slip
                                    </DropdownMenuItem>
                                  )}
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
        </div>

        {/* Pagination Controls (Shared for Mobile & Desktop) */}
        <TablePagination
          pageNumber={currentPage}
          currentItemsCount={paginatedCalls.length}
          hasMore={currentPage < totalPages}
          label="service calls"
          onPageChange={(newPage) => setCurrentPage(newPage)}
        />
      </div>
    )}

      {/* Inline Modals */}
      <CreateCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />
      <CreateDeviceCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />
      <ShortcutsHelpModal open={showShortcutsModal} onOpenChange={setShowShortcutsModal} />
      <JobCardPrintModal
        serviceCall={printCall}
        open={!!printCall}
        onOpenChange={(open) => !open && setPrintCall(null)}
        onOpenDispatchSlip={printCall?.type === "company_service_center" ? () => {
          const c = printCall;
          setPrintCall(null);
          setDispatchPrintCall(c);
        } : undefined}
      />
      <DispatchSlipPrintModal
        serviceCall={dispatchPrintCall}
        open={!!dispatchPrintCall}
        onOpenChange={(open) => !open && setDispatchPrintCall(null)}
        onSwitchToJobCard={() => {
          const c = dispatchPrintCall;
          setDispatchPrintCall(null);
          setPrintCall(c);
        }}
      />

      {/* 1-Click Table Row WhatsApp Modal (Strictly API Dispatched) */}
      {whatsAppCall && (
        <WhatsAppPreviewModal
          open={Boolean(whatsAppCall)}
          onOpenChange={(open) => {
            if (!open) setWhatsAppCall(null);
          }}
          title={`WhatsApp Customer: ${whatsAppCall.ticketNo}`}
          recipientName={whatsAppCall.customerName}
          recipientRole="Customer"
          defaultPhone={whatsAppCall.customerPhone}
          ticketId={whatsAppCall.ticketNo}
          serviceCall={whatsAppCall}
        />
      )}

      {/* Delete / Move to Trash Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Move Service Call to Trash?"
        description="This ticket will be moved to the Trash / Archived tab and hidden from active lists. You can restore it back anytime."
        confirmLabel="Move to Trash"
        variant="warning"
        onConfirm={handleDelete}
      />
    </div>
  );
}
