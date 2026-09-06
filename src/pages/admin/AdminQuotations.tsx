import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Trash2,
  Printer,
  MessageSquare,
  Mail,
  Pencil,
  LayoutTemplate,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Tag,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
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
  ConfirmDeleteDialog,
  EmptyState,
  TablePagination,
  StatCard,
  LoadingScreen,
} from "@/components/common";
import {
  getQuotations,
  deleteQuotation,
  getQuotationTemplates,
} from "@/lib/firestore";
import { subscribeSyncSignal } from "@/lib/realtimeSync";
import { formatIndianPhoneNumber } from "@/lib/utils";
import type { Quotation, QuotationTemplate } from "@/lib/types";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";
import QuotationPrintModal from "@/components/admin/QuotationPrintModal";
import QuotationWhatsAppModal from "@/components/admin/QuotationWhatsAppModal";
import QuotationEmailModal from "@/components/admin/QuotationEmailModal";
import QuotationTemplateModal from "@/components/admin/QuotationTemplateModal";

type DateFilterMode = "all" | "today" | "this_month" | "custom";

export default function AdminQuotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterMode>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modals state
  const [activeQuoteForModal, setActiveQuoteForModal] = useState<Quotation | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesData, tplsData] = await Promise.all([
        getQuotations(),
        getQuotationTemplates(),
      ]);
      setQuotations(quotesData);
      setTemplates(tplsData);
    } catch (err: any) {
      console.error("Error loading quotations:", err);
      toast.error("Failed to load quotations list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time zero-cost table refresh when quotations are created/updated/deleted
    const unsub = subscribeSyncSignal("quotations", () => {
      getQuotations().then((data) => setQuotations(data)).catch(() => {});
    });
    return () => unsub();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    const query = (search || "").toLowerCase().trim();
    const queryDigits = query.replace(/\D/g, "");

    return quotations.filter((q) => {
      // Date Filtering
      const quoteDate = q.date || "";
      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = quoteDate === todayStr;
      } else if (dateFilter === "this_month") {
        matchesDate = quoteDate.startsWith(currentMonthStr);
      } else if (dateFilter === "custom") {
        if (startDate && quoteDate < startDate) matchesDate = false;
        if (endDate && quoteDate > endDate) matchesDate = false;
      }

      if (!matchesDate) return false;
      if (!query) return true;

      // Safe multi-field search
      const qNo = (q.quotationNo || "").toLowerCase();
      const cName = (q.customerName || "").toLowerCase();
      const cPhone = (q.customerPhone || "").toLowerCase();
      const cPhoneDigits = (q.customerPhone || "").replace(/\D/g, "");
      const cEmail = (q.customerEmail || "").toLowerCase();
      const cAddress = (q.customerAddress || "").toLowerCase();
      const tName = (q.templateName || "").toLowerCase();
      const notes = (q.notes || "").toLowerCase();
      const items = Array.isArray(q.items) ? q.items : [];

      const matchesNo = qNo.includes(query) || (queryDigits.length >= 1 && qNo.includes(queryDigits));
      const matchesName = cName.includes(query);
      const matchesPhone =
        cPhone.includes(query) || (queryDigits.length >= 3 && cPhoneDigits.includes(queryDigits));
      const matchesEmail = cEmail.includes(query);
      const matchesAddress = cAddress.includes(query);
      const matchesTemplate = tName.includes(query);
      const matchesNotes = notes.includes(query);
      const matchesItems = items.some((it) => {
        if (!it) return false;
        const pName = (it.productName || "").toLowerCase();
        const pModel = (it.modelNumber || "").toLowerCase();
        const pCat = (it.category || "").toLowerCase();
        const pDesc = (it.description || "").toLowerCase();
        return (
          pName.includes(query) ||
          pModel.includes(query) ||
          pCat.includes(query) ||
          pDesc.includes(query)
        );
      });

      return (
        matchesNo ||
        matchesName ||
        matchesPhone ||
        matchesEmail ||
        matchesAddress ||
        matchesTemplate ||
        matchesNotes ||
        matchesItems
      );
    });
  }, [quotations, dateFilter, startDate, endDate, search, todayStr, currentMonthStr]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, startDate, endDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / pageSize));
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotations.slice(start, start + pageSize);
  }, [filteredQuotations, currentPage, pageSize]);

  // Keyboard Shortcuts (Alt+C -> New Quotation, Alt+P -> Print First, Alt+W -> WhatsApp First)
  useTallyShortcuts({
    onAltC: () => navigate("/admin/quotations/new"),
    onAltP: () => {
      if (paginatedQuotations.length > 0) {
        setActiveQuoteForModal(paginatedQuotations[0]);
        setShowPrintModal(true);
      }
    },
    onAltW: () => {
      if (paginatedQuotations.length > 0) {
        setActiveQuoteForModal(paginatedQuotations[0]);
        setShowWhatsAppModal(true);
      }
    },
  });

  // KPI Calculations
  const quotesTodayCount = useMemo(() => {
    return quotations.filter((q) => (q.date || "").startsWith(todayStr)).length;
  }, [quotations, todayStr]);

  const quotesMonthCount = useMemo(() => {
    return quotations.filter((q) => (q.date || "").startsWith(currentMonthStr)).length;
  }, [quotations, currentMonthStr]);

  const totalPipeline = useMemo(() => {
    return filteredQuotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
  }, [filteredQuotations]);

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteQuoteId) return;
    try {
      await deleteQuotation(deleteQuoteId);
      toast.success("Quotation deleted successfully");
      setDeleteQuoteId(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete quotation");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Price Estimate Quotations</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage quotations, prepare customer estimates, reuse package templates, and dispatch via WhatsApp, Email & Print.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateModal(true)}
            className="h-8 text-xs font-bold rounded-xl border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 gap-1.5 cursor-pointer shadow-2xs"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>Template Library</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/admin/quotations/new")}
            className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Quotation</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Quotations"
          value={quotations.length}
          subtitle="All records"
          icon={FileText}
          iconClassName="text-slate-600 dark:text-slate-400"
          iconBgClassName="bg-slate-100 dark:bg-slate-800"
        />
        <StatCard
          title="This Month"
          value={quotesMonthCount}
          subtitle="Issued this month"
          icon={Calendar}
          iconClassName="text-blue-600 dark:text-blue-400"
          iconBgClassName="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title="Estimated Pipeline"
          value={`₹${totalPipeline.toLocaleString("en-IN")}`}
          subtitle="Active filter total"
          icon={DollarSign}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          iconBgClassName="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title="Active Templates"
          value={templates.length}
          subtitle="Pre-configured packages"
          icon={LayoutTemplate}
          iconClassName="text-purple-600 dark:text-purple-400"
          iconBgClassName="bg-purple-50 dark:bg-purple-950/50"
          onClick={() => setShowTemplateModal(true)}
        />
      </div>

      {/* Filter and Date Range Control Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Quick Date Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex-wrap w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setDateFilter("all")}
            className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "all"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All Quotes ({quotations.length})
          </button>
          <button
            type="button"
            onClick={() => setDateFilter("today")}
            className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "today"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Today ({quotesTodayCount})
          </button>
          <button
            type="button"
            onClick={() => setDateFilter("this_month")}
            className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "this_month"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            This Month ({quotesMonthCount})
          </button>
          <button
            type="button"
            onClick={() => setDateFilter("custom")}
            className={`flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "custom"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Middle: Custom Date Range Picker if selected */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 animate-in fade-in duration-150 w-full sm:w-auto">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 sm:h-8 text-base sm:text-xs rounded-xl flex-1 sm:w-36"
              placeholder="From Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 sm:h-8 text-base sm:text-xs rounded-xl flex-1 sm:w-36"
              placeholder="To Date"
            />
          </div>
        )}

        {/* Right: Search Box */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search Quote #, customer, model, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 sm:h-8 text-base sm:text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Main Quotations Table */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Quotations Registry" subtitle="Loading price estimates..." />
        </div>
      ) : filteredQuotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Quotations Found"
          description={
            quotations.length === 0
              ? "Click Create Quotation to generate your first price estimate for a customer."
              : "No quotations match the active date or search criteria."
          }
          actionLabel="Create Quotation"
          actionIcon={Plus}
          onAction={() => navigate("/admin/quotations/new")}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View (< md) */}
          <div className="md:hidden space-y-3.5">
            {paginatedQuotations.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5"
              >
                {/* Card Header: Customer & Quote # */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {q.customerName || "Walk-in Customer"}
                    </div>
                    {q.customerPhone ? (
                      <a
                        href={`tel:${q.customerPhone}`}
                        className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold mt-0.5 flex items-center gap-1 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 inline text-blue-600 dark:text-blue-400" />
                        <span>{formatIndianPhoneNumber(q.customerPhone)}</span>
                      </a>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        📅 {q.date}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 px-2.5 py-1 rounded-xl">
                      #{q.quotationNo}
                    </span>
                    {q.templateName && (
                      <div className="text-[10px] text-purple-700 dark:text-purple-300 font-bold mt-1">
                        {q.templateName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Summary Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                    <span>📋 Items Quoted ({q.items?.length || 0})</span>
                    <span className="text-[11px] text-slate-500 font-normal">📅 {q.date}</span>
                  </div>
                  <div className="space-y-1 pt-0.5">
                    {q.items?.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {it.productName}
                        </span>
                        <span className="text-slate-500 font-mono shrink-0">
                          ×{it.quantity}
                        </span>
                      </div>
                    ))}
                    {(q.items?.length || 0) > 3 && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        +{(q.items?.length || 0) - 3} more items
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Row */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Est. Grand Total</span>
                  <span className="font-mono font-black text-lg text-slate-950 dark:text-white">
                    ₹{q.grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Big 48px Action Buttons: Call, WhatsApp, Print, Edit */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {/* Call */}
                  <a
                    href={q.customerPhone ? `tel:${q.customerPhone}` : "#"}
                    onClick={(e) => {
                      if (!q.customerPhone) {
                        e.preventDefault();
                        toast.error("No phone number saved on this quote");
                      }
                    }}
                    className={`h-12 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-98 transition-all shadow-2xs ${
                      q.customerPhone
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                    }`}
                    title={q.customerPhone ? `Call ${q.customerPhone}` : "No phone"}
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-[10px]">Call</span>
                  </a>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuoteForModal(q);
                      setShowWhatsAppModal(true);
                    }}
                    className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-sm active:scale-98 transition-all cursor-pointer"
                    title="Send WhatsApp Quote"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-[10px]">WhatsApp</span>
                  </button>

                  {/* Print */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuoteForModal(q);
                      setShowPrintModal(true);
                    }}
                    className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-0.5 border border-slate-200/60 dark:border-slate-700/60 active:scale-98 transition-all cursor-pointer shadow-2xs"
                    title="Print Quotation"
                  >
                    <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    <span className="text-[10px]">Print</span>
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/quotations/${q.id}/edit`)}
                    className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-0.5 border border-slate-200/60 dark:border-slate-700/60 active:scale-98 transition-all cursor-pointer shadow-2xs"
                    title="Edit Quotation"
                  >
                    <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    <span className="text-[10px]">Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block rounded-2xl border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="border-b bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 font-extrabold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3.5">Quote #</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Estimated Items</th>
                    <th className="px-4 py-3.5 text-right">Est. Grand Total</th>
                    <th className="px-4 py-3.5 text-right">Actions & Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {paginatedQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      {/* Quote No */}
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/admin/quotations/${q.id}/edit`}
                          className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                        >
                          <span>#{q.quotationNo}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                        </Link>
                        {q.templateName && (
                          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-bold mt-0.5">
                            {q.templateName}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {q.date}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{q.customerName}</div>
                        {q.customerPhone && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold mt-0.5">
                            {formatIndianPhoneNumber(q.customerPhone)}
                          </div>
                        )}
                      </td>

                      {/* Items Summary with clean model spacing */}
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <div className="space-y-1">
                          {q.items?.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs truncate">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {it.productName}
                              </span>
                              {it.modelNumber && (
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                                  {it.modelNumber}
                                </span>
                              )}
                              <span className="text-slate-500 shrink-0 font-semibold">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                          {(q.items?.length || 0) > 2 && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              +{(q.items?.length || 0) - 2} more item{q.items?.length === 3 ? "" : "s"}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Est. Grand Total */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono font-black text-sm text-slate-950 dark:text-white">
                          ₹{q.grandTotal.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Quick Dispatches & Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-700 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer"
                            title="Print Quotation"
                            onClick={() => {
                              setActiveQuoteForModal(q);
                              setShowPrintModal(true);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>

                          {/* WhatsApp */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg cursor-pointer"
                            title="Send on WhatsApp"
                            onClick={() => {
                              setActiveQuoteForModal(q);
                              setShowWhatsAppModal(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>

                          {/* Email */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer"
                            title="Send Email"
                            onClick={() => {
                              setActiveQuoteForModal(q);
                              setShowEmailModal(true);
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="Edit Quotation"
                            onClick={() => navigate(`/admin/quotations/${q.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer"
                            title="Delete Quotation"
                            onClick={() => setDeleteQuoteId(q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <TablePagination
            pageNumber={currentPage}
            currentItemsCount={paginatedQuotations.length}
            hasMore={currentPage < totalPages}
            label="quotations"
            onPageChange={(newPage) => setCurrentPage(newPage)}
          />
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(deleteQuoteId)}
        onOpenChange={(open) => !open && setDeleteQuoteId(null)}
        title="Delete Quotation Record?"
        description="Are you sure you want to permanently delete this quotation? This action cannot be undone."
        confirmLabel="Delete Quotation"
        onConfirm={handleDeleteConfirm}
      />

      {/* Print Modal */}
      <QuotationPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        quotation={activeQuoteForModal}
      />

      {/* WhatsApp Modal */}
      <QuotationWhatsAppModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        quotation={activeQuoteForModal}
      />

      {/* Email Modal */}
      <QuotationEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        quotation={activeQuoteForModal}
      />

      {/* Template Modal */}
      <QuotationTemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        onSelectTemplate={(tpl) => {
          setShowTemplateModal(false);
          navigate(`/admin/quotations/new?templateId=${tpl.id}`);
        }}
      />
    </div>
  );
}
