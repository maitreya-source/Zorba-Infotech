import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building,
  Plus,
  Pencil,
  Printer,
  Calendar,
  DollarSign,
  Activity,
  Wrench,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  ChevronRight,
  TrendingUp,
  Inbox,
  XCircle,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCustomer, getServiceCallsForCustomer } from "@/lib/firestore";
import type { Customer, ServiceCall, ServiceCallStatus } from "@/lib/types";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import WhatsAppPreviewModal from "@/components/admin/WhatsAppPreviewModal";
import EmailPreviewModal from "@/components/admin/EmailPreviewModal";
import { formatIndianPhoneNumber } from "@/lib/utils";

const STATUS_BADGES: Record<
  ServiceCallStatus,
  { label: string; className: string; icon: any }
> = {
  received: {
    label: "Received",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Inbox,
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  sent_to_service_center: {
    label: "Service Center",
    className: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: Truck,
  },
  waiting_for_parts: {
    label: "Waiting for Parts",
    className: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    icon: Package,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  delivered: {
    label: "Delivered",
    className: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
};

export default function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all");
  const [search, setSearch] = useState("");
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [printCall, setPrintCall] = useState<ServiceCall | null>(null);
  const [whatsAppModal, setWhatsAppModal] = useState<{
    open: boolean;
    title: string;
    recipientName: string;
    recipientRole: string;
    defaultPhone: string;
    defaultMessage: string;
    ticketId?: string;
  }>({
    open: false,
    title: "",
    recipientName: "",
    recipientRole: "",
    defaultPhone: "",
    defaultMessage: "",
    ticketId: undefined,
  });
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    title: string;
    recipientName: string;
    recipientRole: string;
    defaultEmail: string;
    ticketId?: string;
  }>({
    open: false,
    title: "",
    recipientName: "",
    recipientRole: "Customer",
    defaultEmail: "",
    ticketId: undefined,
  });

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const cust = await getCustomer(id);
      if (!cust) {
        setError("Customer not found in database.");
        setLoading(false);
        return;
      }
      setCustomer(cust);

      // Lookup all historical service calls associated with this customer
      const customerCalls = await getServiceCallsForCustomer(cust.id, cust.phone, cust.name);
      setCalls(customerCalls);
    } catch (err: any) {
      console.error("Error loading customer profile:", err);
      setError(err?.message || "Failed to load customer profile and service calls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Analytics Metrics
  const totalCalls = calls.length;
  const activeCalls = calls.filter((c) =>
    ["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(c.status)
  );
  const completedCalls = calls.filter((c) => ["completed", "delivered"].includes(c.status));
  const totalRevenue = calls.reduce((acc, c) => acc + (c.grandTotal || 0), 0);

  // Filtered Calls list
  const filteredCalls = calls
    .filter((c) => {
      if (activeTab === "active") {
        return ["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(c.status);
      }
      if (activeTab === "completed") {
        return ["completed", "delivered", "cancelled"].includes(c.status);
      }
      return true;
    })
    .filter((c) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        c.ticketNo.toLowerCase().includes(q) ||
        (c.deviceCategory && c.deviceCategory.toLowerCase().includes(q)) ||
        (c.modelNumber && c.modelNumber.toLowerCase().includes(q)) ||
        (c.issueDescription && c.issueDescription.toLowerCase().includes(q)) ||
        (c.serialNumber && c.serialNumber.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
      const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
      return dateB - dateA;
    });

  const handleOpenGeneralWhatsApp = () => {
    if (!customer?.phone) return;
    const cleanPhone = customer.phone.replace(/\D/g, "");
    setWhatsAppModal({
      open: true,
      title: `WhatsApp: ${customer.name}`,
      recipientName: customer.name,
      recipientRole: "Customer",
      defaultPhone: cleanPhone,
      ticketId: calls.length > 0 ? calls[0].ticketNo : undefined,
      defaultMessage: `Hello ${customer.name}, greetings from Zorba Infotech! We are reaching out regarding your service inquiries. How may we assist you today?`,
    });
  };

  const handleOpenGeneralEmail = () => {
    setEmailModal({
      open: true,
      title: `Email: ${customer?.name}`,
      recipientName: customer?.name || "Customer",
      recipientRole: "Customer",
      defaultEmail: customer?.email || "",
      ticketId: calls.length > 0 ? calls[0].ticketNo : undefined,
    });
  };

  const handleOpenTicketWhatsApp = (call: ServiceCall) => {
    const cleanPhone = (customer?.phone || call.customerPhone || "").replace(/\D/g, "");
    setWhatsAppModal({
      open: true,
      title: `WhatsApp: ${call.ticketNo}`,
      recipientName: customer?.name || call.customerName || "Customer",
      recipientRole: "Customer",
      defaultPhone: cleanPhone,
      ticketId: call.ticketNo,
      defaultMessage: `Dear ${customer?.name || call.customerName || "Customer"},\n\nUpdate for your ticket *${call.ticketNo}* (${call.deviceCategory}${call.modelNumber ? ` - ${call.modelNumber}` : ""}):\nStatus: *${call.status.replace(/_/g, " ").toUpperCase()}*\n\nThank you for choosing Zorba Infotech!`,
    });
  };

  const handleOpenTicketEmail = (call: ServiceCall) => {
    setEmailModal({
      open: true,
      title: `Email Update: ${call.ticketNo}`,
      recipientName: customer?.name || call.customerName || "Customer",
      recipientRole: "Customer",
      defaultEmail: customer?.email || "",
      ticketId: call.ticketNo,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading customer profile & service calls lookup...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
          <XCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer Record Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || "Unable to locate this customer."}</p>
        <Link to="/admin/customers">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs">
            <ArrowLeft className="h-4 w-4" /> Return to Customer Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-5 max-w-7xl mx-auto text-xs">
      {/* 1. Integrated Hero Header (Black Box) */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 md:p-5 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/customers"
              className="p-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Back to Customer Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
                  {customer.name}
                </h1>
                {customer.companyName && (
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-white/15 text-white border-white/20">
                    <Building className="h-3 w-3 mr-1" /> {customer.companyName}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Client Profile & Complete Service Call History Lookup
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenGeneralWhatsApp}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 gap-1.5 cursor-pointer shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenGeneralEmail}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-blue-500/20 border-blue-400/40 text-blue-300 hover:bg-blue-500/30 gap-1.5 cursor-pointer shadow-2xs"
            >
              <Mail className="h-3.5 w-3.5 text-blue-400" /> Email
            </Button>

            {customer.phone && (
              <a href={`tel:${customer.phone}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-300" /> Call
                </Button>
              </a>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditCustomerOpen(true)}
              className="h-9 px-3 text-xs font-semibold rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5 cursor-pointer shadow-2xs"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-300" /> Edit Profile
            </Button>

            <Link
              to={`/admin/service-calls/new?customerId=${encodeURIComponent(customer.id)}`}
            >
              <Button
                size="sm"
                className="h-9 px-4 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white gap-1.5 shadow-glow-sm cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" /> New Service Call
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Card: Customer Details & Lifetime Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Customer Profile & Contact Information */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg font-display shadow-sm shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {customer.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {customer.companyName ? `Corporate Client: ${customer.companyName}` : "Direct Retail / Business Client"}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-lg text-slate-500">
              Verified Client
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t text-xs">
            {/* Primary Phone */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Primary Phone</span>
              <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-white">
                <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>{customer.phone || "—"}</span>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
              <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white truncate">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{customer.email || "No email on record"}</span>
              </div>
            </div>

            {/* Address */}
            <div className="sm:col-span-2 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Registered Address / Location</span>
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{customer.address || "No physical address specified"}</span>
              </div>
            </div>

            {/* Additional Contact Numbers */}
            {customer.additionalPhones && customer.additionalPhones.length > 0 && (
              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Additional Phone Numbers</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {customer.additionalPhones.map((p, idx) => (
                    <a key={idx} href={`tel:${p}`} className="group">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs py-1 px-2.5 rounded-lg group-hover:border-blue-400 transition-colors"
                      >
                        📞 {p}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Lifetime Stats & Value */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              CLIENT ENGAGEMENT OVERVIEW
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Tickets</span>
                <div className="text-xl font-extrabold font-display text-slate-900 dark:text-white mt-0.5">
                  {totalCalls}
                </div>
              </div>

              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/40 dark:border-amber-900/40">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Active Work</span>
                <div className="text-xl font-extrabold font-display text-amber-700 dark:text-amber-300 mt-0.5">
                  {activeCalls.length}
                </div>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/40 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Completed</span>
                <div className="text-xl font-extrabold font-display text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {completedCalls.length}
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200/40 dark:border-blue-900/40">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Lifetime Spent</span>
                <div className="text-base sm:text-lg font-extrabold font-mono text-blue-700 dark:text-blue-300 mt-0.5 truncate">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Link
              to={`/admin/service-calls/new?customerId=${encodeURIComponent(customer.id)}`}
              className="w-full block"
            >
              <Button className="w-full h-10 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer shadow-xs gap-1.5">
                <Plus className="h-4 w-4" /> Create Service Call for {customer.name.split(" ")[0]}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: All Service Calls for this Customer */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Filter Pills */}
          <div className="overflow-x-auto no-scrollbar max-w-full pb-0.5">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>All Service Calls</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {calls.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "active"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-blue-600" />
                <span>Active Repairs</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  {activeCalls.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("completed")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "completed"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Completed / Delivered</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  {completedCalls.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search inside this customer's calls */}
          <div className="relative min-w-[200px] w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by ticket no, model, issue…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs w-full"
            />
          </div>
        </div>

        {/* Service Calls Table / List */}
        {filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center shadow-xs px-4 space-y-3">
            <Wrench className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {calls.length === 0
                ? `No service calls recorded yet for ${customer.name}`
                : "No service calls matching your active filter"}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              {calls.length === 0
                ? "Click the button below to register the first intake ticket for this client."
                : "Try clearing your search query or switching tabs."}
            </p>
            <Link to={`/admin/service-calls/new?customerId=${encodeURIComponent(customer.id)}`}>
              <Button size="sm" className="gap-1.5 font-bold shadow-sm bg-[#2563EB] hover:bg-blue-700 text-white text-xs rounded-xl mt-2">
                <Plus className="h-4 w-4" /> Create New Service Call
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider bg-slate-50/60 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400">
                    <th className="pl-6 pr-4 py-3.5">TICKET NO & DATE</th>
                    <th className="px-4 py-3.5">DEVICE & MODEL</th>
                    <th className="px-4 py-3.5">ISSUE DESCRIPTION</th>
                    <th className="px-4 py-3.5">STATUS</th>
                    <th className="px-4 py-3.5">CHARGES</th>
                    <th className="pl-4 pr-6 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredCalls.map((item) => {
                    const displayDate = item.dateTime
                      ? new Date(item.dateTime).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    const badge = STATUS_BADGES[item.status] || STATUS_BADGES.received;
                    const StatusIcon = badge.icon;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/admin/service-calls/${item.id}/edit`)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      >
                        {/* Ticket No & Date */}
                        <td className="pl-6 pr-4 py-4 align-middle">
                          <div className="font-bold text-[#2563EB] font-mono text-sm tracking-tight group-hover:underline">
                            {item.ticketNo}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{displayDate}</span>
                          </div>
                        </td>

                        {/* Device & Model */}
                        <td className="px-4 py-4 align-middle">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{item.deviceCategory}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {item.modelNumber ? `Model: ${item.modelNumber}` : "Standard Unit"}
                            {item.serialNumber ? ` · S/N: ${item.serialNumber}` : ""}
                          </div>
                        </td>

                        {/* Issue Description */}
                        <td className="px-4 py-4 align-middle max-w-xs">
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                            {item.issueDescription || "No issue details recorded"}
                          </p>
                          {item.technicianName && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1 block">
                              Assigned Tech: {item.technicianName}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <Badge
                            variant="outline"
                            className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 w-fit ${badge.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{badge.label}</span>
                          </Badge>
                        </td>

                        {/* Charges */}
                        <td className="px-4 py-4 align-middle">
                          <div className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                            ₹{(item.grandTotal || 0).toLocaleString("en-IN")}
                          </div>
                          {item.partsTotal > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Parts: ₹{item.partsTotal}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="pl-4 pr-6 py-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTicketWhatsApp(item)}
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
                              title="Send WhatsApp Update"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTicketEmail(item)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                              title="Send Email Update"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPrintCall(item)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="Print Job Card"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            <Link to={`/admin/service-calls/${item.id}/edit`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <span>Edit</span>
                                <ChevronRight className="h-3.5 w-3.5 ml-1 text-slate-400" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Customer Profile Modal */}
      {customer && (
        <EditCustomerModal
          customer={customer}
          open={editCustomerOpen}
          onOpenChange={setEditCustomerOpen}
          onUpdated={() => loadData()}
        />
      )}

      {/* Print Job Card Modal */}
      {printCall && (
        <JobCardPrintModal
          serviceCall={printCall}
          open={Boolean(printCall)}
          onOpenChange={(open) => {
            if (!open) setPrintCall(null);
          }}
        />
      )}

      {/* WhatsApp Message Composer Modal */}
      <WhatsAppPreviewModal
        open={whatsAppModal.open}
        onOpenChange={(open) => setWhatsAppModal((prev) => ({ ...prev, open }))}
        title={whatsAppModal.title}
        recipientName={whatsAppModal.recipientName}
        recipientRole={whatsAppModal.recipientRole}
        defaultPhone={whatsAppModal.defaultPhone}
        defaultMessage={whatsAppModal.defaultMessage}
        ticketId={whatsAppModal.ticketId}
        serviceCallsList={calls}
        targetModule="service_calls"
      />

      {/* Email Message Composer Modal */}
      <EmailPreviewModal
        open={emailModal.open}
        onOpenChange={(open) => setEmailModal((prev) => ({ ...prev, open }))}
        title={emailModal.title}
        recipientName={emailModal.recipientName}
        recipientRole={emailModal.recipientRole}
        defaultEmail={emailModal.defaultEmail}
        ticketId={emailModal.ticketId}
        serviceCallsList={calls}
      />
    </div>
  );
}
