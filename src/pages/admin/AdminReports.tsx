import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Printer,
  Wrench,
  Building2,
  Search,
  Download,
  Share2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  CreditCard,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ServiceStatusBadge, TablePagination } from "@/components/common";
import {
  getServiceCallsForMonth,
  getServiceCalls,
  getFinancialYear,
  getTechnicians,
} from "@/lib/firestore";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import type { ServiceCall, ServiceCallStatus, ServiceCallType, Technician, PaymentStatus, WarrantyStatus } from "@/lib/types";
import {
  calculateReportMetrics,
  groupServiceCallsByDay,
  filterServiceCalls,
  formatINR,
  downloadServiceCallsCsv,
  generateWhatsAppReportSummary,
  type ReportFilters,
} from "@/lib/reportUtils";
import ReportWhatsAppShareModal from "@/components/admin/ReportWhatsAppShareModal";
import { useTallyListNavigation } from "@/hooks/useTallyKeyboard";

type PeriodPreset = "today" | "yesterday" | "last7" | "this_month" | "last_month" | "custom";
type LayoutMode = "table" | "daily_grouped";
type SortField = "date" | "ticket" | "customer" | "revenue";
type SortDirection = "asc" | "desc";

export default function AdminReports() {
  const navigate = useNavigate();
  const { activeProfile } = useStaffProfile();
  const monthInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // In-memory cache for fetched months
  const monthCacheRef = useRef<Record<string, ServiceCall[]>>({});

  // Period State
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Data State
  const [rawCalls, setRawCalls] = useState<ServiceCall[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Layout View State
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("table");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Filtration State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [warrantyFilter, setWarrantyFilter] = useState<string>("all");

  // Ledger Table Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch Technicians for Filter Dropdown
  useEffect(() => {
    getTechnicians()
      .then((data) => setTechnicians(data.filter((t) => t.active)))
      .catch((err) => console.warn("Could not load technicians:", err));
  }, []);

  // Compute effective date range based on preset
  const { effectiveStartDate, effectiveEndDate, periodLabel } = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (preset === "today") {
      return {
        effectiveStartDate: selectedDate,
        effectiveEndDate: selectedDate,
        periodLabel: `Daily Report — ${new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`,
      };
    }

    if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      return {
        effectiveStartDate: yStr,
        effectiveEndDate: yStr,
        periodLabel: `Yesterday's Report — ${y.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`,
      };
    }

    if (preset === "last7") {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 6);
      const past7Str = `${past7.getFullYear()}-${String(past7.getMonth() + 1).padStart(2, "0")}-${String(past7.getDate()).padStart(2, "0")}`;
      return {
        effectiveStartDate: past7Str,
        effectiveEndDate: todayStr,
        periodLabel: `Last 7 Days (${past7.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`,
      };
    }

    if (preset === "last_month") {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lmKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
      const lastDay = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).getDate();
      return {
        effectiveStartDate: `${lmKey}-01`,
        effectiveEndDate: `${lmKey}-${String(lastDay).padStart(2, "0")}`,
        periodLabel: `Monthly Report — ${lastMonthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`,
      };
    }

    if (preset === "custom") {
      const s = customStartDate || todayStr;
      const e = customEndDate || todayStr;
      return {
        effectiveStartDate: s,
        effectiveEndDate: e,
        periodLabel: `Custom Period: ${s} to ${e}`,
      };
    }

    // Default: this_month
    const [y, m] = selectedMonth.split("-").map(Number);
    const dObj = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      effectiveStartDate: `${selectedMonth}-01`,
      effectiveEndDate: `${selectedMonth}-${String(lastDay).padStart(2, "0")}`,
      periodLabel: `Monthly Report — ${dObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`,
    };
  }, [preset, selectedMonth, selectedDate, customStartDate, customEndDate]);

  // Load Data with caching & multi-month support
  const loadReportData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
      monthCacheRef.current = {};
    } else {
      setLoading(true);
    }

    try {
      const startMonth = effectiveStartDate.slice(0, 7);
      const endMonth = effectiveEndDate.slice(0, 7);

      const requiredMonths: string[] = [startMonth];
      if (startMonth !== endMonth) {
        let current = new Date(`${startMonth}-01`);
        const end = new Date(`${endMonth}-01`);
        while (current <= end) {
          const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
          if (!requiredMonths.includes(key)) requiredMonths.push(key);
          current.setMonth(current.getMonth() + 1);
        }
      }

      const fetchPromises = requiredMonths.map(async (mKey) => {
        if (!forceRefresh && monthCacheRef.current[mKey]) {
          return monthCacheRef.current[mKey];
        }
        const fy = getFinancialYear(`${mKey}-01`).fyId;
        const monthCalls = await getServiceCallsForMonth(fy, mKey);
        monthCacheRef.current[mKey] = monthCalls;
        return monthCalls;
      });

      const results = await Promise.all(fetchPromises);
      const combined = results.flat();

      const seen = new Set<string>();
      const deduped: ServiceCall[] = [];
      for (const call of combined) {
        const key = call.ticketNo || call.id;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(call);
        }
      }

      setRawCalls(deduped);
    } catch (err: any) {
      console.error("Error loading service calls report:", err);
      toast.error("Failed to load reports data. Retrying fallback...");
      try {
        const fallback = await getServiceCalls();
        setRawCalls(fallback);
      } catch (fallbackErr) {
        console.error("Fallback load failed:", fallbackErr);
        setRawCalls([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [effectiveStartDate, effectiveEndDate]);

  // Client-side filtering
  const filters: ReportFilters = useMemo(
    () => ({
      search: searchQuery,
      status: statusFilter,
      type: typeFilter as ServiceCallType | "all",
      technicianId: technicianFilter,
      paymentStatus: paymentFilter as PaymentStatus | "all",
      warrantyStatus: warrantyFilter as WarrantyStatus | "all",
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    }),
    [
      searchQuery,
      statusFilter,
      typeFilter,
      technicianFilter,
      paymentFilter,
      warrantyFilter,
      effectiveStartDate,
      effectiveEndDate,
    ]
  );

  const filteredCalls = useMemo(() => {
    return filterServiceCalls(rawCalls, filters);
  }, [rawCalls, filters]);

  // Aggregated Report Metrics
  const metrics = useMemo(() => {
    return calculateReportMetrics(filteredCalls);
  }, [filteredCalls]);

  // Grouped by day
  const dailyList = useMemo(() => {
    return groupServiceCallsByDay(filteredCalls);
  }, [filteredCalls]);

  // Sorted Ledger Calls
  const sortedLedgerCalls = useMemo(() => {
    const list = [...filteredCalls];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = (a.dateTime || "").localeCompare(b.dateTime || "");
      } else if (sortField === "ticket") {
        comparison = (a.ticketNo || "").localeCompare(b.ticketNo || "");
      } else if (sortField === "customer") {
        comparison = (a.customerName || "").localeCompare(b.customerName || "");
      } else if (sortField === "revenue") {
        comparison = (a.grandTotal || 0) - (b.grandTotal || 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return list;
  }, [filteredCalls, sortField, sortDirection]);

  // Paginated Calls
  const paginatedLedgerCalls = useMemo(() => {
    if (pageSize === 0) return sortedLedgerCalls;
    const start = (currentPage - 1) * pageSize;
    return sortedLedgerCalls.slice(start, start + pageSize);
  }, [sortedLedgerCalls, currentPage, pageSize]);

  const totalLedgerPages = pageSize > 0 ? Math.ceil(sortedLedgerCalls.length / pageSize) || 1 : 1;

  const reportSearchRef = useRef<HTMLInputElement>(null);

  // Tally Keyboard Navigation for Daily & Monthly Registers (ArrowUp/Down, Enter to open, / for search, [ / ] for pages)
  const { selectedIndex, getRowProps } = useTallyListNavigation({
    items: paginatedLedgerCalls,
    searchInputRef: reportSearchRef,
    onOpenItem: (call) => navigate(`/admin/service-calls/${call.id}/edit`),
    onPrevPage: () => setCurrentPage((p) => Math.max(1, p - 1)),
    onNextPage: () => setCurrentPage((p) => Math.min(totalLedgerPages, p + 1)),
  });

  // Stepper controls (Previous / Next)
  const handleStepMonth = (direction: -1 | 1) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextKey);
    setPreset("this_month");
  };

  const handleStepDay = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setSelectedDate(nextStr);
    setPreset("today");
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setTechnicianFilter("all");
    setPaymentFilter("all");
    setWarrantyFilter("all");
    toast.info("All filters reset");
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    technicianFilter !== "all" ||
    paymentFilter !== "all" ||
    warrantyFilter !== "all";

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const sanitizedPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const filename = `zorba_service_report_${sanitizedPeriod}`;
    downloadServiceCallsCsv(filteredCalls, filename);
    toast.success(`Exported ${filteredCalls.length} service calls to CSV`);
  };

  const whatsAppSummaryText = useMemo(() => {
    return generateWhatsAppReportSummary(metrics, periodLabel);
  }, [metrics, periodLabel]);

  return (
    <div className="p-3 md:p-5 space-y-4 max-w-[1440px] mx-auto print:p-0 text-slate-900 dark:text-slate-100 min-h-screen text-xs">
      {/* ─── PRINT ONLY HEADER & STYLESHEET ─── */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 10px !important;
            overflow: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 4px 6px !important;
            color: #000000 !important;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="hidden print:block mb-4 border-b-2 border-black pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-black tracking-tight">
              ZORBA INFOTECH — SERVICE CALL AUDIT REPORT
            </h1>
            <p className="text-xs text-black font-semibold mt-0.5">{periodLabel}</p>
          </div>
          <div className="text-right text-[10px] text-black space-y-0.5">
            <p>Generated: {new Date().toLocaleString("en-IN")}</p>
            {activeProfile && <p>Audited By: {activeProfile.name}</p>}
            <p className="font-bold">Total Calls: {filteredCalls.length}</p>
          </div>
        </div>

        {/* Print Summary Strip */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed border-gray-400 text-xs">
          <div>
            <span className="text-gray-600 block text-[9px]">TOTAL REVENUE:</span>
            <span className="font-bold font-mono text-sm">{formatINR(metrics.totalRevenue)}</span>
          </div>
          <div>
            <span className="text-gray-600 block text-[9px]">COLLECTED:</span>
            <span className="font-bold font-mono text-sm text-green-800">{formatINR(metrics.amountCollected)}</span>
          </div>
          <div>
            <span className="text-gray-600 block text-[9px]">PENDING DUE:</span>
            <span className="font-bold font-mono text-sm text-red-800">{formatINR(metrics.amountDue)}</span>
          </div>
          <div>
            <span className="text-gray-600 block text-[9px]">COMPLETION:</span>
            <span className="font-bold font-mono text-sm">{metrics.completionRate}% ({metrics.completedCalls}/{metrics.totalCalls})</span>
          </div>
        </div>
      </div>

      {/* ─── STANDARD INTEGRATED HERO HEADER (Matching AdminServiceCalls theme) ─── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 md:p-5 text-white shadow-md print:hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Daily &amp; Monthly Service Call Reports
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Track daily billing revenue, completed service tickets, parts consumption, and workshop throughput
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReportData(true)}
              disabled={refreshing || loading}
              className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-2xs backdrop-blur-md cursor-pointer"
              title="Force Refresh Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-300" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWhatsAppModal(true)}
              className="h-9 px-3.5 rounded-xl gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-2xs backdrop-blur-md cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>WhatsApp Summary</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredCalls.length === 0}
              className="h-9 px-3.5 rounded-xl gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-2xs backdrop-blur-md cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-blue-300" />
              <span>Export CSV</span>
            </Button>

            <Button
              onClick={handlePrint}
              size="sm"
              className="h-9 px-4 rounded-xl gap-1.5 text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white shadow-sm cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Report</span>
            </Button>
          </div>
        </div>

        {/* ─── INTEGRATED PERIOD SELECTION CONTROLS ─── */}
        <div className="mt-3.5 pt-3.5 border-t border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                setSelectedDate(todayStr);
                setPreset("today");
              }}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                preset === "today"
                  ? "bg-white text-slate-900 font-bold shadow-sm hover:bg-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Today
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
                setSelectedDate(yStr);
                setPreset("yesterday");
              }}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                preset === "yesterday"
                  ? "bg-white text-slate-900 font-bold shadow-sm hover:bg-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Yesterday
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreset("last7")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                preset === "last7"
                  ? "bg-white text-slate-900 font-bold shadow-sm hover:bg-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Last 7 Days
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const d = new Date();
                setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                setPreset("this_month");
              }}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                preset === "this_month"
                  ? "bg-white text-slate-900 font-bold shadow-sm hover:bg-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              This Month
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreset("last_month")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                preset === "last_month"
                  ? "bg-white text-slate-900 font-bold shadow-sm hover:bg-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Last Month
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreset("custom")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                preset === "custom"
                  ? "bg-white text-slate-900 font-bold shadow-sm hover:bg-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Custom Range
            </Button>
          </div>

          {/* Stepper Navigator & Date Input */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {preset === "today" || preset === "yesterday" ? (
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-2 h-8 transition-colors">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStepDay(-1)}
                  className="h-6 w-6 rounded-lg text-white hover:bg-white/20 cursor-pointer p-0"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <div
                  onClick={() => dateInputRef.current?.showPicker?.()}
                  className="flex items-center gap-1.5 px-2 cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setPreset("today");
                    }}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStepDay(1)}
                  className="h-6 w-6 rounded-lg text-white hover:bg-white/20 cursor-pointer p-0"
                  title="Next Day"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : preset === "custom" ? (
              <div className="flex items-center gap-2 flex-wrap text-white">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-300 text-[11px]">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white/15 px-2 py-1 rounded-lg text-xs font-medium border border-white/20 text-white"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-300 text-[11px]">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white/15 px-2 py-1 rounded-lg text-xs font-medium border border-white/20 text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-2 h-8 transition-colors">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStepMonth(-1)}
                  className="h-6 w-6 rounded-lg text-white hover:bg-white/20 cursor-pointer p-0"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <div
                  onClick={() => monthInputRef.current?.showPicker?.()}
                  className="flex items-center gap-1.5 px-2 cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <input
                    ref={monthInputRef}
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setPreset("this_month");
                    }}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStepMonth(1)}
                  className="h-6 w-6 rounded-lg text-white hover:bg-white/20 cursor-pointer p-0"
                  title="Next Month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── REAL-TIME SEARCH & MULTI-FILTER TOOLBAR ─── */}
      <div className="rounded-2xl border bg-card p-3.5 space-y-3 shadow-2xs print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={reportSearchRef}
              placeholder="Search ticket #, customer, phone, device, issue, tech... (Press / to search)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px] rounded-xl bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active (Workshop)</SelectItem>
                <SelectItem value="completed">Completed/Delivered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_for_parts">Waiting for Parts</SelectItem>
                <SelectItem value="sent_to_service_center">Sent to Center</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Service Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px] rounded-xl bg-background">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in_house_repair">In-House Repair</SelectItem>
                <SelectItem value="company_service_center">Service Center</SelectItem>
                <SelectItem value="onsite_visit">Onsite Visit</SelectItem>
              </SelectContent>
            </Select>

            {/* Technician Filter */}
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px] rounded-xl bg-background">
                <SelectValue placeholder="Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9 text-xs w-[120px] rounded-xl bg-background">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Fully Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="due">Due / Unpaid</SelectItem>
              </SelectContent>
            </Select>

            {/* Warranty Filter */}
            <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
              <SelectTrigger className="h-9 text-xs w-[120px] rounded-xl bg-background">
                <SelectValue placeholder="Warranty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warranty</SelectItem>
                <SelectItem value="in_warranty">In Warranty</SelectItem>
                <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Compact Financial & Volume Summary Strip (Consumes minimal vertical space) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-foreground">
              Period: <strong className="font-mono text-primary">{periodLabel}</strong>
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              Total: <strong className="font-mono font-bold text-foreground">{filteredCalls.length}</strong> calls
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              Invoiced: <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatINR(metrics.totalRevenue)}</strong>
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              Collected: <strong className="font-mono font-bold text-foreground">{formatINR(metrics.amountCollected)}</strong>
            </span>
            {metrics.amountDue > 0 && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Pending Due: <strong className="font-mono font-bold">{formatINR(metrics.amountDue)}</strong>
                </span>
              </>
            )}
          </div>

          {/* View Mode Toggle: All Table vs Grouped by Day */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border text-[11px]">
              <button
                onClick={() => setLayoutMode("table")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  layoutMode === "table" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unified Table
              </button>
              <button
                onClick={() => setLayoutMode("daily_grouped")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  layoutMode === "daily_grouped" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Group by Day
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PRIMARY TABULAR STRUCTURE (CONSUMING ENTIRE MAIN SPACE) ─── */}
      {loading ? (
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6">
          <EmptyState
            icon={Calendar}
            title="No Service Call Records Found"
            description={
              hasActiveFilters
                ? "No service calls matched your active search or filter criteria. Try resetting filters."
                : `No service calls recorded for ${periodLabel}.`
            }
            actionLabel={hasActiveFilters ? "Reset Filters" : undefined}
            onAction={hasActiveFilters ? handleResetFilters : undefined}
          />
        </div>
      ) : layoutMode === "table" ? (
        /* ─── UNIFIED TABULAR LEDGER ─── */
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortField === "ticket") setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
                      else { setSortField("ticket"); setSortDirection("asc"); }
                    }}
                  >
                    Ticket No
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortField === "date") setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
                      else { setSortField("date"); setSortDirection("desc"); }
                    }}
                  >
                    Date
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortField === "customer") setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
                      else { setSortField("customer"); setSortDirection("asc"); }
                    }}
                  >
                    Customer &amp; Phone
                  </th>
                  <th className="p-3">Device &amp; Category</th>
                  <th className="p-3 max-w-xs">Defect / Issue</th>
                  <th className="p-3">Technician</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Parts (₹)</th>
                  <th className="p-3 text-right">Labor (₹)</th>
                  <th
                    className="p-3 text-right cursor-pointer hover:text-foreground select-none"
                    onClick={() => {
                      if (sortField === "revenue") setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
                      else { setSortField("revenue"); setSortDirection("desc"); }
                    }}
                  >
                    Grand Total (₹)
                  </th>
                  <th className="p-3 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedLedgerCalls.map((call, idx) => {
                  const rowProps = getRowProps(idx);
                  return (
                    <tr
                      key={call.id}
                      {...rowProps}
                      onClick={(e) => {
                        const t = e.target as HTMLElement;
                        if (t.closest("button") || t.closest("a")) return;
                        rowProps.onClick?.();
                        navigate(`/admin/service-calls/${call.id}/edit`);
                      }}
                      className={`hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${rowProps.className}`}
                    >
                      <td className="p-3 font-mono font-bold text-primary whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {idx === selectedIndex && (
                            <span className="text-blue-600 dark:text-blue-400 font-black text-xs animate-in fade-in duration-100">▶</span>
                          )}
                          <Link
                            to={`/admin/service-calls/${call.id}/edit`}
                            className="hover:underline flex items-center gap-1"
                            title="Open Service Call Ticket"
                          >
                            <span>{call.ticketNo}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                      {call.dateTime ? call.dateTime.slice(0, 10) : "N/A"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{call.customerName}</div>
                      {call.customerPhone && (
                        <div className="text-[11px] text-muted-foreground font-mono">{call.customerPhone}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground text-xs whitespace-nowrap">
                        {call.deviceCategory}
                      </div>
                      {call.modelNumber && (
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                          {call.modelNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {call.issueDescription || "—"}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {call.technicianName ? (
                        <Badge variant="outline" className="text-[10px] bg-muted/40 font-normal">
                          👤 {call.technicianName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {call.type === "in_house_repair"
                          ? "In-Shop"
                          : call.type === "company_service_center"
                          ? "Center"
                          : "Onsite"}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <ServiceStatusBadge status={call.status} size="sm" />
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                      {formatINR(call.partsTotal || 0)}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                      {formatINR(call.serviceCharges || 0)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums text-foreground">
                      {formatINR(call.grandTotal || 0)}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          call.paymentStatus === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : call.paymentStatus === "partial"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {(call.paymentStatus || "due").toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <TablePagination
            pageNumber={currentPage}
            totalPages={totalLedgerPages}
            currentItemsCount={sortedLedgerCalls.length}
            hasMore={currentPage < totalLedgerPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            label="tickets"
            className="rounded-t-none border-t border-b-0 border-x-0"
          />
        </div>
      ) : (
        /* ─── GROUPED BY DAY TABULAR VIEW ─── */
        <div className="space-y-3">
          {dailyList.map((day) => (
            <div
              key={day.date}
              className="rounded-2xl border bg-card overflow-hidden shadow-2xs break-inside-avoid print:border-black"
            >
              {/* Day Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-foreground font-mono">
                    📅 {day.displayDate} ({day.weekday})
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono font-semibold">
                    {day.count} {day.count === 1 ? "Ticket" : "Tickets"}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground font-mono">
                    Collected: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(day.collected)}</strong>
                  </span>
                  {day.due > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">
                      Due: {formatINR(day.due)}
                    </span>
                  )}
                  <div className="font-bold text-xs sm:text-sm text-primary font-mono tabular-nums pl-2 border-l">
                    Daily Total: {formatINR(day.revenue)}
                  </div>
                </div>
              </div>

              {/* Day Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/20 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-2.5 pl-3">Ticket No</th>
                      <th className="p-2.5">Customer &amp; Phone</th>
                      <th className="p-2.5">Device &amp; Category</th>
                      <th className="p-2.5">Issue Description</th>
                      <th className="p-2.5">Technician</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right pr-3">Grand Total (₹)</th>
                      <th className="p-2.5 text-center pr-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {day.calls.map((call) => (
                      <tr
                        key={call.id}
                        onClick={(e) => {
                          const t = e.target as HTMLElement;
                          if (t.closest("button") || t.closest("a")) return;
                          navigate(`/admin/service-calls/${call.id}/edit`);
                        }}
                        className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 pl-3 font-mono font-bold text-primary whitespace-nowrap">
                          <Link
                            to={`/admin/service-calls/${call.id}/edit`}
                            className="hover:underline flex items-center gap-1"
                            title="Open Service Call Ticket"
                          >
                            <span>{call.ticketNo}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-semibold text-foreground">{call.customerName}</span>
                          {call.customerPhone && (
                            <span className="text-[11px] text-muted-foreground font-mono ml-1.5">
                              ({call.customerPhone})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="font-medium text-foreground">{call.deviceCategory}</span>
                          {call.modelNumber && (
                            <span className="text-[11px] text-muted-foreground font-mono ml-1">
                              ({call.modelNumber})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 max-w-xs">
                          <span className="text-muted-foreground truncate block max-w-xs">
                            {call.issueDescription || "—"}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {call.technicianName ? (
                            <Badge variant="outline" className="text-[10px]">
                              {call.technicianName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <ServiceStatusBadge status={call.status} size="sm" />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold tabular-nums pr-3 text-foreground">
                          {formatINR(call.grandTotal || 0)}
                        </td>
                        <td className="p-2.5 text-center pr-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              call.paymentStatus === "paid"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : call.paymentStatus === "partial"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {(call.paymentStatus || "due").toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WHATSAPP SUMMARY MODAL ─── */}
      <ReportWhatsAppShareModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        summaryText={whatsAppSummaryText}
        periodLabel={periodLabel}
      />
    </div>
  );
}
