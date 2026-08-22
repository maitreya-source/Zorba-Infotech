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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  getQuotations,
  deleteQuotation,
  getQuotationTemplates,
} from "@/lib/firestore";
import type { Quotation, QuotationTemplate } from "@/lib/types";
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
        {/* Total Quotes */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Total Quotations
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {quotations.length}
            </span>
            <span className="text-[10px] text-slate-500">records</span>
          </div>
        </div>

        {/* Quotes This Month */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
            This Month
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-950 dark:text-blue-100 font-mono">
              {quotesMonthCount}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400">issued</span>
          </div>
        </div>

        {/* Filtered Total Value */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            Estimated Total (Filtered)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 font-mono">
              ₹{totalPipeline.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Reusable Templates */}
        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/60">
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
            Active Templates
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-950 dark:text-purple-100 font-mono">
              {templates.length}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400">packages</span>
          </div>
        </div>
      </div>

      {/* Filter and Date Range Control Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Quick Date Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setDateFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
          <div className="flex items-center gap-2 animate-in fade-in duration-150">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs rounded-xl w-36"
              placeholder="From Date"
            />
            <span className="text-slate-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs rounded-xl w-36"
              placeholder="To Date"
            />
          </div>
        )}

        {/* Right: Search Box */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search Quote #, customer, model, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Main Quotations Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading quotations catalog...</p>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-bold text-foreground text-sm font-display">No Quotations Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {quotations.length === 0
              ? "Click Create Quotation to generate your first price estimate for a customer."
              : "No quotations match the active date or search criteria."}
          </p>
          <Button
            onClick={() => navigate("/admin/quotations/new")}
            size="sm"
            className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" /> Create Quotation
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Quote #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Estimated Items</th>
                  <th className="px-4 py-3 text-right">Est. Grand Total</th>
                  <th className="px-4 py-3 text-right">Actions & Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    {/* Quote No */}
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/quotations/${q.id}/edit`}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>#{q.quotationNo}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                      {q.templateName && (
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                          {q.templateName}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {q.date}
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{q.customerName}</div>
                      {q.customerPhone && (
                        <div className="text-[11px] text-slate-500 font-mono">{q.customerPhone}</div>
                      )}
                    </td>

                    {/* Items Summary with clean model spacing */}
                    <td className="px-4 py-3 max-w-[280px]">
                      <div className="space-y-1">
                        {q.items?.slice(0, 2).map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs truncate">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {it.productName}
                            </span>
                            {it.modelNumber && (
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 rounded shrink-0">
                                {it.modelNumber}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ×{it.quantity}
                            </span>
                          </div>
                        ))}
                        {(q.items?.length || 0) > 2 && (
                          <div className="text-[10px] text-slate-400">
                            +{(q.items?.length || 0) - 2} more item{q.items?.length === 3 ? "" : "s"}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Est. Grand Total */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-extrabold text-sm text-slate-950 dark:text-white">
                        ₹{q.grandTotal.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Quick Dispatches & Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Print */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                          title="Print Quotation"
                          onClick={() => {
                            setActiveQuoteForModal(q);
                            setShowPrintModal(true);
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>

                        {/* WhatsApp */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"
                          title="Send on WhatsApp"
                          onClick={() => {
                            setActiveQuoteForModal(q);
                            setShowWhatsAppModal(true);
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>

                        {/* Email */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                          title="Send Email"
                          onClick={() => {
                            setActiveQuoteForModal(q);
                            setShowEmailModal(true);
                          }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          title="Edit Quotation"
                          onClick={() => navigate(`/admin/quotations/${q.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                          title="Delete Quotation"
                          onClick={() => setDeleteQuoteId(q.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(deleteQuoteId)} onOpenChange={(open) => !open && setDeleteQuoteId(null)}>
        <AlertDialogContent className="rounded-3xl border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
              Delete Quotation Record?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-8 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
