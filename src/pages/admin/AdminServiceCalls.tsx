import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Wrench,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Trash2,
  Pencil,
  Printer,
  UserPlus,
  FolderPlus,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Archive,
  Activity,
  BarChart3,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getServiceCalls, deleteServiceCall, updateServiceCall } from "@/lib/firestore";
import type { ServiceCall, ServiceCallStatus, ServiceCallType } from "@/lib/types";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import ShortcutsHelpModal from "@/components/admin/ShortcutsHelpModal";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";

export default function AdminServiceCalls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
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
      const data = await getServiceCalls();
      setCalls(data);
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

  // Keyboard Shortcuts handler
  useTallyShortcuts({
    onAltA: () => navigate("/admin/service-calls/new"),
    onAltC: () => setShowCustomerModal(true),
    onAltD: () => {
      if (filtered.length > 0) {
        setDeleteId(filtered[0].id);
      }
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteServiceCall(deleteId);
      toast.success("Service Call deleted");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete service call");
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

  const getStatusBadge = (status: ServiceCallStatus) => {
    switch (status) {
      case "received":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/40">Received</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800/40">In Progress</Badge>;
      case "sent_to_service_center":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800/40">Service Center</Badge>;
      case "waiting_for_parts":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800/40">Waiting Parts</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800/40">Completed</Badge>;
      case "delivered":
        return <Badge variant="outline" className="bg-green-600/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800/40">Delivered</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: ServiceCallType | string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("company") || t.includes("center") || t.includes("return")) {
      return (
        <Badge variant="outline" className="gap-1 border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40 font-semibold">
          <Building2 className="h-3 w-3 text-purple-600" /> Service Center Return
        </Badge>
      );
    }
    if (t.includes("onsite") || t.includes("visit") || t.includes("install")) {
      return (
        <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 font-semibold">
          <MapPin className="h-3 w-3 text-emerald-600" /> Onsite Visit
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 font-semibold">
        <Wrench className="h-3 w-3 text-blue-600" /> In-House Service
      </Badge>
    );
  };

  // Categorize active vs inactive
  const isCallActive = (status: ServiceCallStatus) =>
    ["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(status);

  const activeCalls = calls.filter((c) => isCallActive(c.status));
  const inactiveCalls = calls.filter((c) => !isCallActive(c.status));

  // Statistics calculation for hero header
  const totalCalls = calls.length;
  const inProgressCount = activeCalls.length;
  const serviceCenterCount = calls.filter((c) => c.type === "company_service_center").length;
  const onsiteCount = calls.filter((c) => c.type === "onsite_visit").length;
  const totalRevenue = calls.reduce((acc, c) => acc + (c.grandTotal || 0), 0);

  const currentList = activeTab === "active" ? activeCalls : inactiveCalls;

  const filtered = currentList.filter((c) => {
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.ticketNo.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.customerPhone.toLowerCase().includes(q) ||
      c.deviceCategory.toLowerCase().includes(q) ||
      c.issueDescription.toLowerCase().includes(q) ||
      (c.modelNumber && c.modelNumber.toLowerCase().includes(q)) ||
      (c.serialNumber && c.serialNumber.toLowerCase().includes(q));

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 md:p-5 space-y-3.5 max-w-7xl mx-auto">
      {/* Integrated Hero Header with Stats Pills & ? Help Icon */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md border border-white/10 text-primary-foreground">
                <Sparkles className="h-3 w-3 text-amber-400" /> Service Call ERP
              </div>

              {/* Integrated Header Stats Bar */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium flex-wrap">
                <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 font-bold">
                  Total: {totalCalls}
                </span>
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 font-bold">
                  Active: {inProgressCount}
                </span>
                <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 font-bold">
                  Service Center: {serviceCenterCount}
                </span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 font-bold">
                  Onsite: {onsiteCount}
                </span>
                <span className="rounded-full bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 font-extrabold font-mono">
                  Revenue: ₹{totalRevenue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Service Ticket Management
            </h1>
          </div>

          {/* Header Action Buttons & ? Shortcuts Icon */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Help ? Icon for Mac & Windows Shortcuts */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowShortcutsModal(true)}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-md rounded-lg"
              title="Keyboard Shortcuts (Win / Mac)"
            >
              <HelpCircle className="h-4 w-4 text-amber-300" />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 h-8 bg-white/10 hover:bg-white/20 text-white border-white/10 text-xs backdrop-blur-md"
              title="Print Service Calls List"
            >
              <Printer className="h-3.5 w-3.5" /> Print List
            </Button>

            <Link to="/admin/reports">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 h-8 bg-white/10 hover:bg-white/20 text-white border-white/10 text-xs backdrop-blur-md"
              >
                <BarChart3 className="h-3.5 w-3.5 text-blue-300" /> Reports
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCustomerModal(true)}
              className="gap-1.5 h-8 bg-white/10 hover:bg-white/20 text-white border-white/10 text-xs backdrop-blur-md"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add Customer
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCategoryModal(true)}
              className="gap-1.5 h-8 bg-white/10 hover:bg-white/20 text-white border-white/10 text-xs backdrop-blur-md"
            >
              <FolderPlus className="h-3.5 w-3.5" /> Device Category
            </Button>

            <Link to="/admin/service-calls/new">
              <Button size="sm" className="gap-1.5 h-8 bg-primary hover:bg-primary/90 text-white shadow-glow-sm text-xs font-bold">
                <Plus className="h-4 w-4" /> New Service Call
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Active vs Inactive Section Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3">
        <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl border">
          <button
            onClick={() => {
              setActiveTab("active");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "active"
                ? "bg-card text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4 text-blue-500" />
            Active Service Calls
            <Badge variant="secondary" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] px-1.5">
              {activeCalls.length}
            </Badge>
          </button>

          <button
            onClick={() => {
              setActiveTab("inactive");
              setStatusFilter("all");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "inactive"
                ? "bg-card text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Archive className="h-4 w-4 text-slate-500" />
            Inactive / Completed Calls
            <Badge variant="secondary" className="bg-slate-500/15 text-slate-600 dark:text-slate-400 font-extrabold text-[10px] px-1.5">
              {inactiveCalls.length}
            </Badge>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ticket, customer, device…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-9 text-xs rounded-xl">
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
            <SelectTrigger className="w-36 h-9 text-xs rounded-xl">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {activeTab === "active" ? (
                <>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
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

      {/* Main Table / State Render */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3" />
          <p className="text-xs text-muted-foreground font-medium">Connecting to Firebase...</p>
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm">
          <Wrench className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="font-bold text-base font-display">
            No {activeTab === "active" ? "Active" : "Inactive"} Service Calls Found
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {calls.length === 0
              ? 'Click "New Ticket" to record your first service call.'
              : `There are currently no ${activeTab} service call records matching your filter.`}
          </p>
          <Link to="/admin/service-calls/new" className="mt-4">
            <Button size="sm" className="gap-2 font-bold shadow-glow-sm">
              <Plus className="h-4 w-4" /> Create New Service Call
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="border-b bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground/80">
              <tr>
                <th className="px-4 py-3.5 text-left">Ticket & Date</th>
                <th className="px-4 py-3.5 text-left">Customer</th>
                <th className="px-4 py-3.5 text-left">Device & Category</th>
                <th className="px-4 py-3.5 text-left">Issue / Task</th>
                <th className="px-4 py-3.5 text-left">Status</th>
                <th className="px-4 py-3.5 text-right">Charges</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest("button") && !target.closest("a")) {
                      navigate(`/admin/service-calls/${item.id}/edit`);
                    }
                  }}
                  className="hover:bg-muted/40 transition-colors group cursor-pointer"
                >
                  {/* Ticket & Date */}
                  <td className="px-4 py-2.5">
                    <div className="font-mono font-bold text-primary text-sm tracking-tight">{item.ticketNo}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(item.dateTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-foreground text-xs">{item.customerName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">📞 {item.customerPhone}</div>
                  </td>

                  {/* Device & Category */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-semibold text-foreground">{item.deviceCategory}</span>
                      {getTypeBadge(item.type)}
                    </div>
                    {(item.modelNumber || item.serialNumber) && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {[item.modelNumber && `Model: ${item.modelNumber}`, item.serialNumber && `S/N: ${item.serialNumber}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </td>

                  {/* Issue */}
                  <td className="px-4 py-3.5 max-w-xs truncate" title={item.issueDescription}>
                    <div className="font-medium text-foreground truncate">{item.issueDescription}</div>
                    {item.parts && item.parts.length > 0 && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        Parts: {item.parts.map((p) => p.name).join(", ")}
                      </div>
                    )}
                  </td>

                  {/* Status with Quick Select */}
                  <td className="px-4 py-2.5">
                    <Select
                      value={item.status}
                      onValueChange={(val: ServiceCallStatus) => handleStatusChange(item.id, val)}
                    >
                      <SelectTrigger className="h-7 border-0 bg-transparent p-0 shadow-none focus:ring-0 w-auto">
                        <SelectValue>{getStatusBadge(item.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="sent_to_service_center">Sent to Service Center</SelectItem>
                        <SelectItem value="waiting_for_parts">Waiting for Parts</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Total Charges */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-extrabold text-foreground text-sm font-display">₹{item.grandTotal.toLocaleString("en-IN")}</div>
                    {item.partsTotal > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        Parts ₹{item.partsTotal} + Service ₹{item.serviceCharges}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end items-center gap-1 opacity-90 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        title="Print Receipt / Job Card"
                        onClick={() => setPrintCall(item)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Link to={`/admin/service-calls/${item.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800" title="Edit Service Call">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Delete Ticket"
                        onClick={() => setDeleteId(item.id)}
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
      )}

      {/* Inline Modals */}
      <CreateCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />
      <CreateDeviceCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />
      <ShortcutsHelpModal open={showShortcutsModal} onOpenChange={setShowShortcutsModal} />
      <JobCardPrintModal serviceCall={printCall} open={!!printCall} onOpenChange={(open) => !open && setPrintCall(null)} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Call Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this service call ticket permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
