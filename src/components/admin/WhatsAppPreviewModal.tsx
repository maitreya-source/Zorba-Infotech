import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Phone,
  RotateCcw,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { isWhatsAppApiConfigured, sendWhatsAppMessage } from "@/lib/whatsappApi";
import {
  getWhatsAppTemplates,
  getServiceCenters,
  getCouriers,
  getTeamMembers,
} from "@/lib/firestore";
import { getPublicAppOrigin } from "@/lib/utils";
import type {
  WhatsAppTemplateDoc,
  WhatsAppTargetModule,
  ServiceCall,
  StaffTask,
  ServiceCenter,
  Courier,
  Customer,
  TeamMember,
} from "@/lib/types";

export interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientRole?: string;
  defaultPhone?: string;
  recipientPhone?: string;
  defaultMessage?: string;
  title?: string;
  ticketId?: string;
  /** Optional target module to filter saved templates */
  targetModule?: WhatsAppTargetModule;
  /** Preferred template slug to pre-select */
  templateName?: string;
  /** Optional ServiceCall entity for automatic ERP field hydration */
  serviceCall?: ServiceCall;
  /** Optional list of ServiceCalls for customer detail view */
  serviceCallsList?: ServiceCall[];
  /** Optional StaffTask entity for automatic task field hydration */
  staffTask?: StaffTask;
  /** Optional context dictionary for automatic {{variable}} hydration */
  erpContext?: Record<string, string | number | undefined>;
  /** Callback invoked after user clicks Send on WhatsApp or Copy */
  onSent?: (finalMessage: string, recipientPhone: string) => void;
}

const PURCHASE_INQUIRY_CATEGORY_PRESETS = [
  "Laptops & Desktop PCs",
  "Server & Workstation Hardware",
  "Motherboards, RAM & CPUs",
  "SSD & Enterprise Storage",
  "CCTV & Surveillance Systems",
  "Printers & Networking Gear",
  "Gaming Peripherals & Accessories",
];

const SERVICE_STATUS_PRESETS = [
  "RECEIVED - Under Inspection",
  "SENT TO SERVICE CENTER",
  "READY FOR PICKUP",
  "DELIVERED & CLOSED",
];

export function WhatsAppPreviewModal({
  open,
  onOpenChange,
  recipientName,
  recipientRole,
  defaultPhone,
  recipientPhone,
  defaultMessage = "",
  title = "Send WhatsApp Message",
  ticketId,
  targetModule,
  templateName,
  serviceCall,
  serviceCallsList,
  staffTask,
  erpContext = {},
  onSent,
}: WhatsAppPreviewModalProps) {
  const effectiveCall = serviceCall || (serviceCallsList && serviceCallsList.length > 0 ? serviceCallsList[0] : undefined);

  const directPhone = (
    recipientPhone ||
    defaultPhone ||
    effectiveCall?.customerPhone ||
    staffTask?.assignedToPhone ||
    ""
  ).trim();

  const [phone, setPhone] = useState(directPhone);
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);
  const [sendingApi, setSendingApi] = useState(false);
  const [editRawText, setEditRawText] = useState(false);

  // Directory caches for automatic phone resolution when switching modules/templates
  const [dirCenters, setDirCenters] = useState<ServiceCenter[]>([]);
  const [dirCouriers, setDirCouriers] = useState<Courier[]>([]);
  const [dirCustomers] = useState<Customer[]>([]);
  const [dirTeam, setDirTeam] = useState<TeamMember[]>([]);

  // Template Selector State
  const [templates, setTemplates] = useState<WhatsAppTemplateDoc[]>([]);
  const [showAllModules, setShowAllModules] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
  const [varOverrides, setVarOverrides] = useState<Record<number, string>>({});

  const resolveBestPhoneForModule = (
    mod?: WhatsAppTargetModule,
    centersList: ServiceCenter[] = dirCenters,
    couriersList: Courier[] = dirCouriers,
    customersList: Customer[] = dirCustomers,
    teamList: TeamMember[] = dirTeam
  ): string => {
    const explicitCallerPhone = (recipientPhone || defaultPhone || "").trim();

    if (mod === "service_centers") {
      if (explicitCallerPhone && recipientRole?.toLowerCase().includes("service center")) {
        return explicitCallerPhone;
      }
      const scName = (effectiveCall?.serviceCenterName || recipientName || "").trim().toLowerCase();
      const matchedSc = centersList.find(
        (sc) =>
          (effectiveCall?.serviceCenterId && sc.id === effectiveCall.serviceCenterId) ||
          (scName && sc.name.trim().toLowerCase() === scName) ||
          (scName && sc.name.toLowerCase().includes(scName))
      );
      const scPhone = (matchedSc?.whatsappPhone || matchedSc?.phone || "").trim();
      if (scPhone) return scPhone;
      if (explicitCallerPhone) return explicitCallerPhone;
    }

    if (mod === "couriers") {
      if (explicitCallerPhone && recipientRole?.toLowerCase().includes("courier")) {
        return explicitCallerPhone;
      }
      const cName = (effectiveCall?.courierName || recipientName || "").trim().toLowerCase();
      const matchedCourier = couriersList.find(
        (c) =>
          (cName && c.name.trim().toLowerCase() === cName) ||
          (cName && c.name.toLowerCase().includes(cName))
      );
      const cPhone = (matchedCourier?.phone || "").trim();
      if (cPhone) return cPhone;
      if (explicitCallerPhone) return explicitCallerPhone;
    }

    if (mod === "staff_tasks") {
      if (staffTask?.assignedToPhone?.trim()) return staffTask.assignedToPhone.trim();
      const empName = (staffTask?.assignedToName || recipientName || "").trim().toLowerCase();
      const matchedEmp = teamList.find(
        (m) =>
          (staffTask?.assignedToId && m.id === staffTask.assignedToId) ||
          (empName && m.name.trim().toLowerCase() === empName)
      );
      if (matchedEmp?.phone?.trim()) return matchedEmp.phone.trim();
      if (explicitCallerPhone) return explicitCallerPhone;
    }

    // Default / Customer / Quotation module
    if (explicitCallerPhone) return explicitCallerPhone;
    if (effectiveCall?.customerPhone?.trim()) return effectiveCall.customerPhone.trim();

    const custName = (effectiveCall?.customerName || recipientName || "").trim().toLowerCase();
    const matchedCust = customersList.find(
      (c) =>
        (effectiveCall?.customerId && c.id === effectiveCall.customerId) ||
        (custName && c.name.trim().toLowerCase() === custName)
    );
    if (matchedCust?.phone?.trim()) return matchedCust.phone.trim();

    return "";
  };

  useEffect(() => {
    if (open) {
      const initial = (
        recipientPhone ||
        defaultPhone ||
        effectiveCall?.customerPhone ||
        staffTask?.assignedToPhone ||
        ""
      ).trim();
      setPhone(initial);
      setMessage(defaultMessage || "");
      setCopied(false);
      setEditRawText(false);
      setShowAllModules(false);
      loadTemplatesAndDirectories();
    }
  }, [
    open,
    recipientPhone,
    defaultPhone,
    defaultMessage,
    targetModule,
    templateName,
    effectiveCall?.id,
    effectiveCall?.customerPhone,
    effectiveCall?.serviceCenterId,
    effectiveCall?.serviceCenterName,
    effectiveCall?.courierName,
    staffTask?.id,
    staffTask?.assignedToPhone,
  ]);

  // Hydrate template variables dynamically from ServiceCall, StaffTask, and erpContext
  const resolveErpValue = (erpKey?: string, fallback?: string): string => {
    if (!erpKey) return fallback || "";

    if (erpContext[erpKey] !== undefined && erpContext[erpKey] !== "") {
      const rawVal = String(erpContext[erpKey]);
      if (rawVal.includes("http://localhost") || rawVal.includes("http://127.0.0.1")) {
        return rawVal.replace(/https?:\/\/[^/\s]+/, getPublicAppOrigin());
      }
      return rawVal;
    }

    const deviceSummary = effectiveCall
      ? [effectiveCall.deviceCategory, effectiveCall.modelNumber, effectiveCall.issueDescription]
          .filter(Boolean)
          .join(" - ")
      : "";

    const statusSummary = effectiveCall?.status
      ? `${effectiveCall.status.replace(/_/g, " ").toUpperCase()}${
          effectiveCall.grandTotal ? ` (Est. Rs. ${effectiveCall.grandTotal.toLocaleString("en-IN")})` : ""
        }`
      : "";

    const taskPortalLink = staffTask
      ? `${getPublicAppOrigin()}/t/${encodeURIComponent(staffTask.id)}${
          staffTask.accessToken ? `?k=${encodeURIComponent(staffTask.accessToken)}` : ""
        }`
      : "";

    const map: Record<string, string | undefined> = {
      "customer.name": effectiveCall?.customerName || recipientName,
      ticketNo: effectiveCall?.ticketNo || ticketId || staffTask?.linkedTicketNo,
      status: statusSummary || undefined,
      deviceCategory: deviceSummary || effectiveCall?.deviceCategory,
      issueDescription: effectiveCall?.issueDescription,
      serialNumber: effectiveCall?.serialNumber || "N/A",
      rmaNumber: effectiveCall?.rmaNumber || "Pending",
      dateTime: effectiveCall?.dateTime || new Date().toLocaleDateString("en-IN"),
      grandTotal: effectiveCall?.grandTotal !== undefined ? String(effectiveCall.grandTotal) : undefined,
      paidAmount:
        effectiveCall?.amountPaid !== undefined
          ? String(effectiveCall.amountPaid)
          : effectiveCall?.grandTotal !== undefined
          ? String(effectiveCall.grandTotal)
          : undefined,
      paymentMode: effectiveCall?.paymentMode ? effectiveCall.paymentMode.toUpperCase() : "UPI / Cash",
      paymentDate: effectiveCall?.paymentDate || new Date().toLocaleDateString("en-IN"),
      serviceCenterName:
        effectiveCall?.serviceCenterName ||
        (recipientRole?.toLowerCase().includes("service center") ? recipientName : undefined),
      courierName:
        effectiveCall?.courierName ||
        (recipientRole?.toLowerCase().includes("courier") ? recipientName : undefined),
      destinationAddress: effectiveCall?.serviceCenterAddress || "Destination City",
      taskAssigneeName: staffTask?.assignedToName || recipientName,
      taskTitleRef: staffTask
        ? `${staffTask.title}${staffTask.linkedTicketNo ? ` (${staffTask.linkedTicketNo})` : ""}`
        : undefined,
      taskPriorityDue: staffTask
        ? `${(staffTask.priority || "p2").toUpperCase()}${staffTask.dueDate ? ` (Due: ${staffTask.dueDate})` : ""}`
        : undefined,
      taskDescriptionPlain: staffTask?.description || staffTask?.title,
      taskPortalUrlPlain: taskPortalLink || undefined,
      vendorName: recipientName,
    };

    const resolved = map[erpKey];
    if (resolved !== undefined && resolved !== "") {
      return resolved;
    }
    return fallback || "";
  };

  const loadTemplatesAndDirectories = async () => {
    try {
      // 1. Load templates immediately (cached in memory after first load -> <10ms)
      const list = await getWhatsAppTemplates();
      const activeList = list.filter((t) => t.active !== false);
      setTemplates(activeList);

      const requestedSlug =
        templateName === "11" || templateName === "zorba_customer_service_update"
          ? "zorba_service_call_update"
          : templateName?.toLowerCase();

      const explicitMatch = requestedSlug
        ? activeList.find((t) => t.id.toLowerCase() === requestedSlug || t.name.toLowerCase() === requestedSlug)
        : undefined;

      const inferredModule: WhatsAppTargetModule | undefined =
        targetModule ||
        (staffTask
          ? "staff_tasks"
          : recipientRole?.toLowerCase().includes("service center")
          ? "service_centers"
          : recipientRole?.toLowerCase().includes("courier")
          ? "couriers"
          : effectiveCall
          ? "service_calls"
          : undefined);

      const moduleMatches = inferredModule
        ? activeList.filter((t) => t.targetModule === inferredModule)
        : activeList.filter((t) => t.targetModule !== "archived");

      const preferred =
        explicitMatch ||
        moduleMatches.find((t) => t.metaStatus === "approved") ||
        moduleMatches[0] ||
        activeList.find((t) => t.targetModule !== "archived" && t.metaStatus === "approved") ||
        activeList.find((t) => t.targetModule !== "archived");

      if (preferred) {
        applyTemplate(preferred.id, activeList);
      } else {
        setSelectedTemplateId("custom");
        setVarOverrides({});
      }

      // 2. Non-blocking background directory fetch for cross-module template switching
      Promise.all([
        getServiceCenters().catch(() => [] as ServiceCenter[]),
        getCouriers().catch(() => [] as Courier[]),
        getTeamMembers().catch(() => [] as TeamMember[]),
      ]).then(([scList, cList, tList]) => {
        setDirCenters(scList);
        setDirCouriers(cList);
        setDirTeam(tList);
        const resolvedPhone = resolveBestPhoneForModule(
          preferred?.targetModule || inferredModule,
          scList,
          cList,
          dirCustomers,
          tList
        );
        if (resolvedPhone) {
          setPhone((prev) => prev || resolvedPhone);
        }
      });
    } catch (err) {
      console.warn("Could not load WhatsApp templates:", err);
    }
  };

  const visibleTemplates = useMemo(() => {
    const nonArchived = templates.filter((t) => t.targetModule !== "archived");
    const inferredModule: WhatsAppTargetModule | undefined =
      targetModule ||
      (staffTask
        ? "staff_tasks"
        : recipientRole?.toLowerCase().includes("service center")
        ? "service_centers"
        : recipientRole?.toLowerCase().includes("courier")
        ? "couriers"
        : effectiveCall
        ? "service_calls"
        : undefined);

    if (showAllModules || !inferredModule) return nonArchived;
    const matches = nonArchived.filter((t) => t.targetModule === inferredModule);
    return matches.length > 0 ? matches : nonArchived;
  }, [templates, targetModule, staffTask, recipientRole, effectiveCall, showAllModules]);

  const buildBodyFromVars = (tpl: WhatsAppTemplateDoc, overrides: Record<number, string>) => {
    let text = tpl.bodyText;
    (tpl.variables || []).forEach((v) => {
      const val = overrides[v.index] ?? v.fallbackValue ?? `{{${v.index}}}`;
      const regex = new RegExp(`\\{\\{${v.index}\\}\\}`, "g");
      text = text.replace(regex, val);
    });
    return text;
  };

  const applyTemplate = (
    tplId: string,
    tplPool: WhatsAppTemplateDoc[] = templates,
    scList: ServiceCenter[] = dirCenters,
    cList: Courier[] = dirCouriers,
    custList: Customer[] = dirCustomers,
    tList: TeamMember[] = dirTeam
  ) => {
    setSelectedTemplateId(tplId);
    setEditRawText(false);
    if (tplId === "custom") {
      setMessage(defaultMessage || "");
      setVarOverrides({});
      return;
    }

    const tpl = tplPool.find((t) => t.id === tplId);
    if (!tpl) return;

    // Automatically resolve the phone number for the selected template's module if available
    const autoPhone = resolveBestPhoneForModule(tpl.targetModule, scList, cList, custList, tList);
    if (autoPhone) {
      setPhone(autoPhone);
    }

    const initialVars: Record<number, string> = {};
    (tpl.variables || []).forEach((v) => {
      initialVars[v.index] = resolveErpValue(v.erpKey, v.fallbackValue);
    });
    setVarOverrides(initialVars);
    setMessage(buildBodyFromVars(tpl, initialVars));
  };

  const handleVariableChange = (index: number, newVal: string) => {
    const updated = { ...varOverrides, [index]: newVal };
    setVarOverrides(updated);
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      setMessage(buildBodyFromVars(tpl, updated));
    }
  };

  const cleanPhoneForWhatsApp = (rawPhone: string): string => {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
    return digits;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const formattedPhone = cleanPhoneForWhatsApp(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    const encodedText = encodeURIComponent(message.trim());
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    if (onSent) {
      onSent(message.trim(), phone);
    }
    onOpenChange(false);
  };

  const handleSendViaCloudApi = async () => {
    const formattedPhone = cleanPhoneForWhatsApp(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    const selectedTpl = templates.find((t) => t.id === selectedTemplateId);
    if (!selectedTpl) {
      toast.error("Please select a Meta template to send via Cloud API, or use 'Open in WhatsApp App' for custom text.");
      return;
    }

    const orderedParams = selectedTpl.variables
      ? [...selectedTpl.variables]
          .sort((a, b) => a.index - b.index)
          .map((v) => {
            const raw = varOverrides[v.index] ?? v.fallbackValue ?? "-";
            return String(raw).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim() || "-";
          })
      : undefined;

    setSendingApi(true);
    try {
      const result = await sendWhatsAppMessage({
        to: formattedPhone,
        message: message.trim(),
        templateName: selectedTpl.name,
        templateLanguage: selectedTpl.language || "en",
        templateParams: orderedParams,
      });

      if (result.success) {
        toast.success(`WhatsApp message sent to ${recipientName || phone} via Meta Cloud API!`);
        if (onSent) {
          onSent(message.trim(), phone);
        }
        onOpenChange(false);
      } else {
        toast.error(`Meta Cloud API Error: ${result.error || "Template rejected or still pending approval"}`);
      }
    } catch (err: any) {
      toast.error(`WhatsApp API Error: ${err.message || "Unexpected failure"}`);
    } finally {
      setSendingApi(false);
    }
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
  const apiReady = isWhatsAppApiConfigured();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Top Header */}
        <DialogHeader className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>{title}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Pure Text Utility
                  </span>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-300">
                  Select a template, customize smart fields on the left, and verify the live WhatsApp preview on the right.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Main 2-Column Split Workspace */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
          {/* LEFT COLUMN (7 cols): Recipient + Clean Template Picker + Always-Visible Smart Fields */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* 1. Recipient Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="sm:col-span-5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {recipientRole || "Recipient"}
                </span>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {recipientName || "Customer / Partner"}
                </p>
              </div>
              <div className="sm:col-span-7">
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 93021 99730"
                    className="h-8 pl-8 text-xs font-mono bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 2. Clean Template Selector Pills (No dropdown scroll traps, no ugly emoji dots) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>1. Choose Message Template</span>
                </Label>
                {templates.length > visibleTemplates.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllModules((prev) => !prev)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="h-3 w-3" />
                    <span>{showAllModules ? "Show Recommended Only" : `Show All Templates (${templates.length})`}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleTemplates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const isApproved = tpl.metaStatus === "approved";
                  const liveCat = (tpl.category || "utility").toUpperCase();
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 w-full">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-1">
                          {tpl.displayName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider ${
                              liveCat === "MARKETING"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300"
                            }`}
                          >
                            {liveCat}
                          </span>
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 shrink-0">
                              <Clock className="h-2.5 w-2.5" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span className="truncate">{tpl.name}</span>
                        <span>{tpl.variables?.length || 0} fields</span>
                      </div>
                    </button>
                  );
                })}

                {/* Custom Free-Text Option */}
                <button
                  type="button"
                  onClick={() => applyTemplate("custom")}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    selectedTemplateId === "custom"
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/40 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Custom Free-Text Message
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      WhatsApp App
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Write any custom note and open directly in WhatsApp
                  </span>
                </button>
              </div>
            </div>

            {/* 3. Always-Open Smart Fields Editor (With Quick Preset Chips for Purchase Inquiry & Status!) */}
            {activeTemplate && activeTemplate.variables && activeTemplate.variables.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                    <span>2. Customize Message Fields ({activeTemplate.variables.length})</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => applyTemplate(activeTemplate.id)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Fields</span>
                  </button>
                </div>

                {/* Quick Presets for Dynamic Purchase Inquiry ({{2}} Inquiry Category) */}
                {activeTemplate.id === "zorba_purchase_inquiry" && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Quick Hardware Category Presets (Field {"{{2}}"})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PURCHASE_INQUIRY_CATEGORY_PRESETS.map((preset) => {
                        const isCurrent = varOverrides[2] === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleVariableChange(2, preset)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              isCurrent
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Presets for Service Call Status ({{3}} Status & Estimate) */}
                {activeTemplate.id === "zorba_service_call_update" && (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
                      Quick Status Presets (Field {"{{3}}"})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_STATUS_PRESETS.map((preset) => {
                        const isCurrent = varOverrides[3] === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleVariableChange(3, preset)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              isCurrent
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Field Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeTemplate.variables.map((v) => {
                    const isWide =
                      v.erpKey === "purchaseModels" ||
                      v.erpKey === "issueDescription" ||
                      v.erpKey === "destinationAddress" ||
                      v.erpKey === "taskPortalUrlPlain" ||
                      v.erpKey === "taskDescriptionPlain";
                    return (
                      <div
                        key={v.index}
                        className={`space-y-1 ${isWide ? "sm:col-span-2" : ""}`}
                      >
                        <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-extrabold">
                            {`{{${v.index}}}`}
                          </span>
                          <span className="truncate">{v.label}</span>
                        </Label>
                        <Input
                          value={varOverrides[v.index] ?? ""}
                          onChange={(e) => handleVariableChange(v.index, e.target.value)}
                          placeholder={v.fallbackValue}
                          className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5 cols): Live WhatsApp Chat Bubble Preview & Raw Editor Toggle */}
          <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/40 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Live WhatsApp Preview
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRawText((prev) => !prev)}
                    className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {editRawText ? "Show Bubble View" : "Edit Raw Text"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Authentic WhatsApp Chat Wallpaper & Bubble */}
              <div className="rounded-2xl bg-[#efeae2] dark:bg-slate-950 p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-inner min-h-[260px] flex flex-col justify-between">
                {editRawText ? (
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={11}
                    className="font-mono text-xs leading-relaxed bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 rounded-xl resize-none"
                    placeholder="Type your WhatsApp message here..."
                  />
                ) : (
                  <div className="bg-[#d9fdd3] dark:bg-emerald-950/90 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tr-xs p-3.5 shadow-sm border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                    <div className="text-xs whitespace-pre-wrap leading-relaxed break-words font-sans">
                      {message}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400 select-none">
                      <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">✓✓</span>
                    </div>
                  </div>
                )}

                <div className="pt-2.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{message.length} characters</span>
                  <span>No Image Header • Low-Cost Utility</span>
                </div>
              </div>
            </div>

            {/* Template Meta Status Info Box */}
            {activeTemplate && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                  activeTemplate.metaStatus === "approved"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {activeTemplate.metaStatus === "approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-extrabold">
                      {activeTemplate.metaStatus === "approved"
                        ? "Meta Approved Template"
                        : "Submitted to Meta (Pending Review)"}
                    </span>
                    <span className="block text-[10px] opacity-80 truncate">
                      Slug: {activeTemplate.name}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsAppWeb}
              className="gap-1.5 text-xs font-bold border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer rounded-xl h-9"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in WhatsApp App
            </Button>

            {apiReady && selectedTemplateId !== "custom" && (
              <Button
                type="button"
                size="sm"
                disabled={sendingApi}
                onClick={handleSendViaCloudApi}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-sm cursor-pointer rounded-xl h-9 px-4"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingApi ? "Sending via Cloud API..." : "Send via Cloud API"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WhatsAppPreviewModal;
