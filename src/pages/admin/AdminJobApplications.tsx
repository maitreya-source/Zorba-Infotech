import { useEffect, useState, useMemo } from "react";
import {
  Briefcase,
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
  FileText,
  UserCheck,
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
  getJobApplications,
  updateJobApplicationStatus,
  deleteJobApplication,
} from "@/lib/firestore";
import { subscribeSyncSignal } from "@/lib/realtimeSync";
import type { JobApplication, JobApplicationStatus } from "@/lib/types";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { formatIndianPhoneNumber } from "@/lib/utils";

export default function AdminJobApplications() {
  const { activeProfile } = useStaffProfile();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobApplicationStatus>("all");
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getJobApplications();
      setApplications(list);
    } catch {
      toast.error("Failed to load job applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time zero-cost table refresh when job applications change
    const unsub = subscribeSyncSignal("job_applications", () => {
      getJobApplications().then((list) => setApplications(list)).catch(() => {});
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.fullName.toLowerCase().includes(q) ||
        app.phone.includes(q) ||
        (app.email && app.email.toLowerCase().includes(q)) ||
        (app.positionApplied && app.positionApplied.toLowerCase().includes(q)) ||
        (app.experience && app.experience.toLowerCase().includes(q)) ||
        (app.message && app.message.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const counts = useMemo(() => {
    return {
      all: applications.length,
      pending: applications.filter((i) => i.status === "pending").length,
      reviewed: applications.filter((i) => i.status === "reviewed").length,
      completed: applications.filter((i) => i.status === "completed").length,
      dismissed: applications.filter((i) => i.status === "dismissed").length,
    };
  }, [applications]);

  const handleUpdateStatus = async (id: string, newStatus: JobApplicationStatus) => {
    try {
      await updateJobApplicationStatus(
        id,
        newStatus,
        undefined,
        activeProfile?.id,
        activeProfile?.name
      );
      setApplications((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(`Application status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job application?")) return;
    try {
      await deleteJobApplication(id);
      setApplications((prev) => prev.filter((i) => i.id !== id));
      if (selectedApp?.id === id) setSelectedApp(null);
      toast.success("Job application deleted");
    } catch {
      toast.error("Failed to delete application");
    }
  };

  const getStatusBadge = (status: JobApplicationStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px] font-bold">
            <Clock className="h-3 w-3" /> New
          </Badge>
        );
      case "reviewed":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-[10px] font-bold">
            <UserCheck className="h-3 w-3" /> Shortlisted
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" /> Hired / Accepted
          </Badge>
        );
      case "dismissed":
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30 gap-1 text-[10px] font-bold">
            <XCircle className="h-3 w-3" /> Rejected / Dismissed
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
              <Briefcase className="h-5 w-5 text-blue-400" />
              <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white">
                Job Applications & Candidate Submissions
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              Review candidates applying for Hardware Technician, Network Engineer, and Service roles.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">New</span>
              <span className="font-mono text-base font-extrabold text-amber-400">{counts.pending}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Shortlisted</span>
              <span className="font-mono text-base font-extrabold text-blue-400">{counts.reviewed}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Hired</span>
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
          {(["all", "pending", "reviewed", "completed", "dismissed"] as const).map((tab) => (
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
              placeholder="Search by candidate name, position, phone..."
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
          <LoadingScreen fullScreen={false} title="Job Applications" subtitle="Loading candidate profiles..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job applications found"
          description={
            search
              ? "No applications matched your search keyword."
              : "When candidates apply from the website careers page, their submissions will appear here."
          }
        />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Position Applied</th>
                  <th className="px-4 py-3">Phone & WhatsApp</th>
                  <th className="px-4 py-3">Experience</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedApps.map((app) => {
                  const cleanPhone = app.phone.replace(/\D/g, "");
                  const waUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                    `Hi ${app.fullName}, regarding your application for the "${app.positionApplied}" position at Zorba Infotech Neemuch. We would like to connect with you.`
                  )}`;

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {app.fullName}
                        </div>
                        {app.email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {app.email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {app.positionApplied}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatIndianPhoneNumber(app.phone)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 font-semibold">
                          {app.experience || "Fresher"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-3">
                        {getStatusBadge(app.status)}
                      </td>

                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {app.resumeLink && (
                            <a
                              href={app.resumeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                              title="Open Resume / Bio Link"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            title="WhatsApp Candidate"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <a
                            href={`tel:${app.phone}`}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Call Candidate"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-900"
                            onClick={() => setSelectedApp(app)}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-destructive"
                            onClick={() => handleDelete(app.id)}
                            title="Delete Application"
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
            currentItemsCount={paginatedApps.length}
            hasMore={currentPage < totalPages}
            label="candidates"
            onPageChange={(newPage) => setCurrentPage(newPage)}
          />
        </div>
      )}

      {/* Application Detail Modal */}
      <Dialog open={Boolean(selectedApp)} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <span>Job Application Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedApp.fullName}</span>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Position</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{selectedApp.positionApplied}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{selectedApp.experience || "Fresher"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatIndianPhoneNumber(selectedApp.phone)}
                    </span>
                  </div>
                  {selectedApp.email && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                      <span className="text-slate-900 dark:text-white">{selectedApp.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedApp.resumeLink && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-900 dark:text-purple-200">Candidate Resume / Portfolio</span>
                  </div>
                  <a
                    href={selectedApp.resumeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:underline"
                  >
                    Open Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedApp.message && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Candidate Statement / Cover Note</span>
                  <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedApp.message}
                  </p>
                </div>
              )}

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t flex-wrap">
                <Button
                  onClick={() => handleUpdateStatus(selectedApp.id, "reviewed")}
                  className="flex-1 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1"
                >
                  <UserCheck className="h-4 w-4" /> Shortlist
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedApp.id, "completed")}
                  className="flex-1 h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Hire
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedApp.id, "dismissed")}
                  className="h-9 text-xs rounded-xl gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
