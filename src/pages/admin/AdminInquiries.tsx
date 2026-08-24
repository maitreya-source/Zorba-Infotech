import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  TablePagination,
  LoadingScreen,
} from "@/components/common";
import {
  getInquiries,
  updateInquiryStatus,
  deleteInquiry,
} from "@/lib/firestore";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { formatIndianPhoneNumber } from "@/lib/utils";

export default function AdminInquiries() {
  const { activeProfile } = useStaffProfile();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InquiryStatus>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getInquiries();
      setInquiries(list);
    } catch {
      toast.error("Failed to load customer inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchesStatus = statusFilter === "all" || inq.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inq.name.toLowerCase().includes(q) ||
        inq.phone.includes(q) ||
        (inq.email && inq.email.toLowerCase().includes(q)) ||
        (inq.subject && inq.subject.toLowerCase().includes(q)) ||
        (inq.message && inq.message.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [inquiries, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedInquiries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const counts = useMemo(() => {
    return {
      all: inquiries.length,
      pending: inquiries.filter((i) => i.status === "pending").length,
      completed: inquiries.filter((i) => i.status === "completed").length,
      dismissed: inquiries.filter((i) => i.status === "dismissed").length,
    };
  }, [inquiries]);

  const handleUpdateStatus = async (id: string, newStatus: InquiryStatus) => {
    try {
      await updateInquiryStatus(
        id,
        newStatus,
        undefined,
        activeProfile?.id,
        activeProfile?.name
      );
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
      );
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(`Inquiry marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inquiry?")) return;
    try {
      await deleteInquiry(id);
      setInquiries((prev) => prev.filter((i) => i.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      toast.success("Inquiry deleted");
    } catch {
      toast.error("Failed to delete inquiry");
    }
  };

  const getInquirySubject = (inq: Inquiry) => {
    if (inq.subject && inq.subject.trim() && inq.subject !== "General Inquiry") {
      return inq.subject;
    }
    if (inq.source === "dealers_portal") {
      return "Dealer & Wholesale Pricing Registration";
    }
    if (inq.source === "careers_page") {
      return "Job Application / Hiring";
    }
    if (inq.source === "product_page") {
      return "Product & Price Inquiry";
    }
    return inq.subject || "Product & Service Inquiry";
  };

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px] font-bold">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" /> Resolved
          </Badge>
        );
      case "dismissed":
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30 gap-1 text-[10px] font-bold">
            <XCircle className="h-3 w-3" /> Dismissed
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs text-slate-900 dark:text-slate-100">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white">
                Customer Inquiries & Leads
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              Manage website contact submissions, pre-sales inquiries, and product questions.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Pending</span>
              <span className="font-mono text-base font-extrabold text-amber-400">{counts.pending}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Resolved</span>
              <span className="font-mono text-base font-extrabold text-emerald-400">{counts.completed}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Total</span>
              <span className="font-mono text-base font-extrabold text-white">{counts.all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(["all", "pending", "completed", "dismissed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusFilter(tab);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by name, phone, requirement..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 px-3 rounded-xl gap-1 text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Customer Inquiries" subtitle="Loading web leads..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No inquiries found"
          description={
            search
              ? "No inquiries matched your search keyword."
              : "When customers submit questions from the website contact page, they will appear here."
          }
        />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone & WhatsApp</th>
                  <th className="px-4 py-3">Subject & Requirement</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedInquiries.map((inq) => {
                  const cleanPhone = inq.phone.replace(/\D/g, "");
                  const waUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                    `Hi ${inq.name}, thank you for contacting Zorba Infotech regarding "${inq.subject || "your inquiry"}". How can we assist you?`
                  )}`;

                  return (
                    <tr
                      key={inq.id}
                      onClick={() => setSelectedInquiry(inq)}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {inq.name}
                        </div>
                        {inq.email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {inq.email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatIndianPhoneNumber(inq.phone)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {getInquirySubject(inq)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                          {inq.message}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(inq.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-3">
                        {getStatusBadge(inq.status)}
                      </td>

                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <a
                            href={`tel:${inq.phone}`}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-900"
                            onClick={() => setSelectedInquiry(inq)}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-destructive"
                            onClick={() => handleDelete(inq.id)}
                            title="Delete Inquiry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <TablePagination
            pageNumber={currentPage}
            currentItemsCount={paginatedInquiries.length}
            hasMore={currentPage < totalPages}
            label="inquiries"
            onPageChange={(newPage) => setCurrentPage(newPage)}
          />
        </div>
      )}

      {/* Inquiry Detail Modal */}
      <Dialog open={Boolean(selectedInquiry)} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Customer Inquiry Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedInquiry.name}</span>
                  {getStatusBadge(selectedInquiry.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatIndianPhoneNumber(selectedInquiry.phone)}
                    </span>
                  </div>
                  {selectedInquiry.email && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                      <span className="text-slate-900 dark:text-white">{selectedInquiry.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Subject / Requirement</span>
                <p className="font-bold text-slate-900 dark:text-white text-xs">{getInquirySubject(selectedInquiry)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Message</span>
                <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedInquiry.message}
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t">
                {selectedInquiry.status !== "completed" && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedInquiry.id, "completed")}
                    className="flex-1 h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Complete
                  </Button>
                )}
                {selectedInquiry.status !== "dismissed" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedInquiry.id, "dismissed")}
                    className="flex-1 h-9 text-xs rounded-xl gap-1 text-slate-600"
                  >
                    <XCircle className="h-4 w-4" /> Dismiss
                  </Button>
                )}
                {selectedInquiry.status !== "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedInquiry.id, "pending")}
                    className="h-9 text-xs rounded-xl"
                  >
                    Mark Pending
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
