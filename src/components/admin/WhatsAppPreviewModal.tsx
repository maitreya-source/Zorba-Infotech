import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  User,
  Phone,
  Zap,
  RefreshCw,
  Sliders,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWhatsAppTemplates } from "@/lib/firestore";
import type {
  WhatsAppTemplateDoc,
  WhatsAppTargetModule,
  ServiceCall,
} from "@/lib/types";
import {
  isWhatsAppApiConfigured,
  sendWhatsAppMessage,
  formatPhoneForMetaApi,
} from "@/lib/whatsappApi";

interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  recipientName: string;
  recipientRole?: string;
  defaultPhone: string;
  defaultMessage?: string;
  ticketId?: string;
  serviceCall?: ServiceCall | null;
  serviceCallsList?: ServiceCall[];
  targetModule?: WhatsAppTargetModule;
  templateName?: string;
  templateParams?: string[];
  onSent?: (result: { messageId?: string }) => void;
}

const NOTICE_HEADER_OPTIONS = [
  "SERVICE INTAKE CONFIRMATION",
  "REPAIR WORK IN PROGRESS",
  "DIAGNOSIS & ESTIMATE NOTICE",
  "SERVICE COMPLETED - READY FOR PICKUP",
  "DEVICE DELIVERED TO CUSTOMER",
  "ON-SITE ENGINEER VISIT SCHEDULED",
  "SERVICE STATUS UPDATE",
];

export default function WhatsAppPreviewModal({
  open,
  onOpenChange,
  title,
  recipientName,
  recipientRole = "Customer",
  defaultPhone,
  defaultMessage,
  ticketId,
  serviceCall,
  serviceCallsList = [],
  targetModule,
  templateName: initialTemplateName,
  templateParams: initialTemplateParams,
  onSent,
}: WhatsAppPreviewModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || "");
  const [templates, setTemplates] = useState<WhatsAppTemplateDoc[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("freeform");
  const [selectedCallId, setSelectedCallId] = useState<string>(ticketId || serviceCall?.id || "");
  const [variableValues, setVariableValues] = useState<Record<number, string>>({});
  const [customFreeformMessage, setCustomFreeformMessage] = useState(defaultMessage || "");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [showVariableEditor, setShowVariableEditor] = useState(false);

  // Load registered WhatsApp templates from Firestore
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setLoadingTemplates(true);
    getWhatsAppTemplates()
      .then((data) => {
        if (!isMounted) return;
        setTemplates(data);
      })
      .catch((err) => {
        console.error("Failed to fetch WhatsApp templates:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingTemplates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Selected Service Call Object
  const currentServiceCall = useMemo(() => {
    if (serviceCall) return serviceCall;
    if (selectedCallId && serviceCallsList.length > 0) {
      return serviceCallsList.find((c) => c.id === selectedCallId || c.ticketNo === selectedCallId) || null;
    }
    if (serviceCallsList.length > 0) return serviceCallsList[0];
    return null;
  }, [serviceCall, selectedCallId, serviceCallsList]);

  // Determine initial template and initialize variable values
  useEffect(() => {
    if (!open) return;
    setPhoneNumber(defaultPhone || "");

    const effectiveTargetModule =
      targetModule ||
      (recipientRole === "Courier Partner"
        ? "couriers"
        : recipientRole === "Service Center"
        ? "service_centers"
        : "service_calls");

    const available = effectiveTargetModule
      ? templates.filter((t) => t.targetModule === effectiveTargetModule)
      : templates;

    let match: WhatsAppTemplateDoc | undefined;
    if (initialTemplateName) {
      match = templates.find((t) => t.name === initialTemplateName || t.id === initialTemplateName);
    }

    if (!match && (recipientRole === "Courier Partner" || effectiveTargetModule === "couriers")) {
      const lowerTitle = (title || "").toLowerCase();
      if (lowerTitle.includes("pickup")) {
        match = templates.find((t) => t.id === "zorba_courier_pickup_request" || t.name === "zorba_courier_pickup_request");
      } else if (lowerTitle.includes("delivery")) {
        match = templates.find((t) => t.id === "zorba_courier_delivery_inquiry" || t.name === "zorba_courier_delivery_inquiry");
      } else {
        match = available.find((t) => t.targetModule === "couriers");
      }
    }

    if (!match && (recipientRole === "Service Center" || effectiveTargetModule === "service_centers")) {
      match = templates.find((t) => t.id === "zorba_service_center_followup" || t.targetModule === "service_centers");
    }

    if (!match && (recipientRole === "Customer" || effectiveTargetModule === "service_calls")) {
      match = available.find((t) => t.id === "zorba_customer_service_update") || available.find((t) => t.targetModule === "service_calls");
    }

    if (!match && available.length > 0) {
      match = available[0];
    }

    if (match) {
      setSelectedTemplateId(match.id);
      populateVariablesForTemplate(match, currentServiceCall);
    } else {
      setSelectedTemplateId("freeform");
      setCustomFreeformMessage(defaultMessage || "");
    }
    setCopied(false);
  }, [open, templates, initialTemplateName, defaultPhone, defaultMessage, targetModule, recipientRole, title, currentServiceCall]);

  // Populate variables from ticket details
  const populateVariablesForTemplate = (
    tpl: WhatsAppTemplateDoc,
    call: ServiceCall | null
  ) => {
    const values: Record<number, string> = {};
    if (!tpl.variables) return;

    tpl.variables.forEach((v) => {
      let val = v.fallbackValue || "";
      if (v.erpKey === "noticeHeader") {
        val = call?.status === "delivered"
          ? "DEVICE DELIVERED TO CUSTOMER"
          : call?.status === "completed"
          ? "SERVICE COMPLETED - READY FOR PICKUP"
          : "SERVICE STATUS UPDATE";
      } else if (v.erpKey === "customer.name") {
        val = (recipientRole === "Customer" ? recipientName : "") || call?.customerName || "Valued Customer";
      } else if (v.erpKey === "courierName") {
        val = (recipientRole === "Courier Partner" ? recipientName : "") || call?.courierName || "Courier Partner";
      } else if (v.erpKey === "serviceCenterName") {
        val = (recipientRole === "Service Center" ? recipientName : "") || call?.serviceCenterName || "Authorized Service Center";
      } else if (v.erpKey === "destinationAddress") {
        val = call?.serviceCenterAddress || "Destination City";
      } else if (v.erpKey === "rmaNumber") {
        val = call?.rmaNumber || "N/A";
      } else if (v.erpKey === "ticketNo") {
        val = call?.ticketNo || ticketId || "SC-XXXX";
      } else if (v.erpKey === "dateTime") {
        val = call?.dateTime || new Date().toISOString().split("T")[0];
      } else if (v.erpKey === "deviceCategory") {
        val = call?.deviceCategory ? `${call.deviceCategory}${call.modelNumber ? ` - ${call.modelNumber}` : ""}` : "Hardware Unit";
      } else if (v.erpKey === "serialNumber") {
        val = call?.serialNumber || "N/A";
      } else if (v.erpKey === "issueDescription") {
        val = call?.issueDescription || "Service Request";
      } else if (v.erpKey === "status") {
        val = call?.status ? call.status.replace(/_/g, " ").toUpperCase() : "RECEIVED";
      } else if (v.erpKey === "grandTotal") {
        val = call?.grandTotal !== undefined ? String(call.grandTotal) : "0";
      }
      values[v.index] = val;
    });

    setVariableValues(values);
  };

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === "freeform") {
      setCustomFreeformMessage(
        defaultMessage ||
          `Hello ${recipientName}, greetings from Zorba Infotech! We are reaching out regarding your service inquiries. How may we assist you today?`
      );
    } else {
      const chosen = templates.find((t) => t.id === tplId);
      if (chosen) {
        populateVariablesForTemplate(chosen, currentServiceCall);
      }
    }
  };

  const handleCallSelect = (callId: string) => {
    setSelectedCallId(callId);
    const call = serviceCallsList.find((c) => c.id === callId || c.ticketNo === callId) || null;
    const currentTpl = templates.find((t) => t.id === selectedTemplateId);
    if (currentTpl && call) {
      populateVariablesForTemplate(currentTpl, call);
    }
  };

  const handleVariableChange = (idx: number, val: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [idx]: val,
    }));
  };

  // Compile Live Message Body
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId === "freeform") return null;
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  const compiledMessage = useMemo(() => {
    if (!activeTemplate) return customFreeformMessage;
    let text = activeTemplate.bodyText;
    (activeTemplate.variables || []).forEach((v) => {
      const regex = new RegExp(`\\{\\{${v.index}\\}\\}`, "g");
      const val = variableValues[v.index] !== undefined ? variableValues[v.index] : (v.fallbackValue || `{{${v.index}}}`);
      text = text.replace(regex, val);
    });
    return text;
  }, [activeTemplate, variableValues, customFreeformMessage]);

  const compiledParamsList = useMemo(() => {
    if (!activeTemplate || !activeTemplate.variables) return [];
    return activeTemplate.variables
      .sort((a, b) => a.index - b.index)
      .map((v) => variableValues[v.index] || v.fallbackValue || "");
  }, [activeTemplate, variableValues]);

  const isApiReady = isWhatsAppApiConfigured();

  const handleCopy = () => {
    if (!compiledMessage) return;
    navigator.clipboard.writeText(compiledMessage);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = async () => {
    const cleanPhone = formatPhoneForMetaApi(phoneNumber);
    if (!cleanPhone) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!compiledMessage.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    if (!isApiReady) {
      toast.error("WhatsApp API token is pending in .env (VITE_META_WHATSAPP_TOKEN).");
      return;
    }

    setSending(true);
    try {
      const result = await sendWhatsAppMessage({
        to: cleanPhone,
        message: compiledMessage.trim(),
        templateName: activeTemplate ? activeTemplate.name : undefined,
        templateParams: activeTemplate ? compiledParamsList : undefined,
      });

      if (result.success) {
        toast.success("⚡ WhatsApp delivered successfully via Meta API!");
        onSent?.({ messageId: result.messageId });
        onOpenChange(false);
      } else {
        toast.error(`Delivery failed: ${result.error || "Meta API Error"}`);
      }
    } catch (err: any) {
      console.error("Direct send failed:", err);
      toast.error(`WhatsApp send error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white dark:bg-slate-950">
        {/* Dark Header */}
        <DialogHeader className="px-5 py-3.5 bg-slate-900 dark:bg-slate-950 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white leading-snug">
                  {title || "Send WhatsApp Message"}
                </DialogTitle>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <Zap className="h-3 w-3 fill-emerald-400" /> Meta WhatsApp Cloud API
                </p>
              </div>
            </div>

            {ticketId && (
              <Badge variant="secondary" className="bg-white/10 text-white border-0 font-mono text-[11px] px-2.5 py-1">
                {ticketId}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Customer / Recipient Information Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                {recipientName || "Customer"}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold uppercase text-slate-500 border-slate-200">
                {recipientRole}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <Input
                type="text"
                placeholder="+91 Mobile Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-7 w-40 text-xs font-mono font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 shadow-2xs text-slate-900 dark:text-white px-2.5 py-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Template Selector & Service Call Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Select WhatsApp Template
              </Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold shadow-2xs">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 text-xs">
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                      {tpl.displayName}
                    </SelectItem>
                  ))}
                  <SelectItem value="freeform" className="text-xs text-blue-600 font-semibold">
                    💬 Freeform Custom Message
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {serviceCallsList.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Populate from Ticket
                </Label>
                <Select value={selectedCallId} onValueChange={handleCallSelect}>
                  <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono shadow-2xs">
                    <SelectValue placeholder="Select ticket to fill data..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {serviceCallsList.map((call) => (
                      <SelectItem key={call.id} value={call.id} className="text-xs font-mono">
                        {call.ticketNo} — {call.deviceCategory} ({call.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Template Variables Filling Panel */}
          {activeTemplate && activeTemplate.variables && activeTemplate.variables.length > 0 ? (
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setShowVariableEditor(!showVariableEditor)}
                className="w-full px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Template Information Fields ({activeTemplate.variables.length})</span>
                </div>
                {showVariableEditor ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showVariableEditor && (
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeTemplate.variables.map((v) => {
                    const isNoticeHeader = v.erpKey === "noticeHeader";
                    return (
                      <div key={v.index} className="space-y-1">
                        <div className="flex items-center justify-between px-0.5">
                          <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            <span className="text-emerald-600 font-mono">{`{{${v.index}}}`}</span> {v.label}
                          </Label>
                        </div>

                        {isNoticeHeader ? (
                          <div className="space-y-1">
                            <Select
                              value={variableValues[v.index] || NOTICE_HEADER_OPTIONS[0]}
                              onValueChange={(val) => handleVariableChange(v.index, val)}
                            >
                              <SelectTrigger className="h-7 text-xs rounded-lg font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                {NOTICE_HEADER_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="text-xs font-bold">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <Input
                            value={variableValues[v.index] !== undefined ? variableValues[v.index] : v.fallbackValue}
                            onChange={(e) => handleVariableChange(v.index, e.target.value)}
                            className="h-7 text-xs rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedTemplateId === "freeform" ? (
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Custom Message Content
              </Label>
              <Textarea
                rows={4}
                value={customFreeformMessage}
                onChange={(e) => setCustomFreeformMessage(e.target.value)}
                placeholder="Type custom message to send..."
                className="text-xs rounded-xl font-sans leading-relaxed"
              />
            </div>
          ) : null}

          {/* Live Message Preview Container */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-emerald-600" />
                <span>Live WhatsApp Preview</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {compiledMessage.length} characters
              </span>
            </div>

            <div className="w-full max-h-56 overflow-y-auto rounded-xl bg-[#EFEAE2] dark:bg-slate-950 p-3.5 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text selection:bg-emerald-100 dark:selection:bg-emerald-900/60 border border-slate-200/80 dark:border-slate-800 shadow-inner">
              {compiledMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 cursor-pointer h-8 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-bold text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Message</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl h-8 cursor-pointer border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 cursor-pointer px-4 h-8"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send WhatsApp</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
