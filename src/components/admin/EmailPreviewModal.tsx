import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Mail,
  Send,
  Copy,
  Check,
  User,
  Zap,
  RefreshCw,
  ExternalLink,
  FileText,
  AlertCircle,
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
import type { ServiceCall } from "@/lib/types";
import {
  EMAIL_TEMPLATES,
  type EmailTemplateType,
  buildEmailSubject,
  buildEmailHtml,
  buildEmailText,
  sendCustomerEmail,
  generateMailtoLink,
} from "@/lib/emailApi";

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  recipientName: string;
  recipientRole?: string;
  defaultEmail: string;
  defaultSubject?: string;
  defaultMessage?: string;
  ticketId?: string;
  serviceCall?: ServiceCall | null;
  serviceCallsList?: ServiceCall[];
  defaultTemplateType?: EmailTemplateType;
  onSent?: (result: { messageId?: string }) => void;
}

export default function EmailPreviewModal({
  open,
  onOpenChange,
  title,
  recipientName,
  recipientRole = "Customer",
  defaultEmail,
  defaultSubject,
  defaultMessage,
  ticketId,
  serviceCall,
  serviceCallsList = [],
  defaultTemplateType = "service_intake",
  onSent,
}: EmailPreviewModalProps) {
  const [emailAddress, setEmailAddress] = useState(defaultEmail || "");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType>(defaultTemplateType);
  const [selectedCallId, setSelectedCallId] = useState<string>(ticketId || serviceCall?.id || "");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [customBody, setCustomBody] = useState(defaultMessage || "");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewTab, setPreviewTab] = useState<"html" | "text">("html");

  const prevOpenRef = useRef(false);

  // Selected Service Call Object
  const currentServiceCall = useMemo(() => {
    if (serviceCall) return serviceCall;
    if (selectedCallId && serviceCallsList.length > 0) {
      return serviceCallsList.find((c) => c.id === selectedCallId || c.ticketNo === selectedCallId) || null;
    }
    if (serviceCallsList.length > 0) return serviceCallsList[0];
    return null;
  }, [serviceCall, selectedCallId, serviceCallsList]);

  // Initializer: ONLY initialize when modal transitions from closed to open
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setEmailAddress(defaultEmail || "");
      setSelectedCallId(ticketId || serviceCall?.id || "");

      // Determine default template based on service call status
      let tplType: EmailTemplateType = defaultTemplateType;
      if (currentServiceCall?.status === "delivered") {
        tplType = "device_delivered";
      } else if (currentServiceCall?.status === "completed") {
        tplType = "service_completed";
      } else if (currentServiceCall?.status === "waiting_for_parts") {
        tplType = "estimate_notice";
      } else if (currentServiceCall?.status === "in_progress") {
        tplType = "status_update";
      } else if (currentServiceCall?.status === "received") {
        tplType = "service_intake";
      }
      setSelectedTemplate(tplType);

      const generatedSubj = buildEmailSubject({
        templateType: tplType,
        customerName: recipientName,
        ticketNo: currentServiceCall?.ticketNo || ticketId || "SC-SERVICE",
        deviceCategory: currentServiceCall?.deviceCategory,
      });
      setSubject(defaultSubject || generatedSubj);
      setCustomBody(defaultMessage || "");
      setCopied(false);
    }
    prevOpenRef.current = open;
  }, [open, defaultEmail, defaultSubject, defaultMessage, currentServiceCall, ticketId, defaultTemplateType, recipientName, serviceCall?.id]);

  // Handle template change
  const handleTemplateChange = (val: EmailTemplateType) => {
    setSelectedTemplate(val);
    const newSubject = buildEmailSubject({
      templateType: val,
      customerName: recipientName,
      ticketNo: currentServiceCall?.ticketNo || ticketId || "SC-SERVICE",
      deviceCategory: currentServiceCall?.deviceCategory,
    });
    setSubject(newSubject);
  };

  // Handle service call select
  const handleCallSelect = (callId: string) => {
    setSelectedCallId(callId);
    const call = serviceCallsList.find((c) => c.id === callId || c.ticketNo === callId) || null;
    if (call) {
      const newSubject = buildEmailSubject({
        templateType: selectedTemplate,
        customerName: recipientName || call.customerName,
        ticketNo: call.ticketNo,
        deviceCategory: call.deviceCategory,
      });
      setSubject(newSubject);
    }
  };

  // Compile HTML & Plain Text
  const compiledHtml = useMemo(() => {
    return buildEmailHtml({
      templateType: selectedTemplate,
      customerName: recipientName || currentServiceCall?.customerName || "Customer",
      ticketNo: currentServiceCall?.ticketNo || ticketId || "SC-SERVICE",
      dateTime: currentServiceCall?.dateTime,
      deviceCategory: currentServiceCall?.deviceCategory,
      modelNumber: currentServiceCall?.modelNumber,
      serialNumber: currentServiceCall?.serialNumber,
      issueDescription: currentServiceCall?.issueDescription,
      status: currentServiceCall?.status,
      grandTotal: currentServiceCall?.grandTotal,
      remarks: undefined,
      customBody,
    });
  }, [selectedTemplate, recipientName, currentServiceCall, ticketId, customBody]);

  const compiledText = useMemo(() => {
    return buildEmailText({
      templateType: selectedTemplate,
      customerName: recipientName || currentServiceCall?.customerName || "Customer",
      ticketNo: currentServiceCall?.ticketNo || ticketId || "SC-SERVICE",
      dateTime: currentServiceCall?.dateTime,
      deviceCategory: currentServiceCall?.deviceCategory,
      modelNumber: currentServiceCall?.modelNumber,
      serialNumber: currentServiceCall?.serialNumber,
      issueDescription: currentServiceCall?.issueDescription,
      status: currentServiceCall?.status,
      grandTotal: currentServiceCall?.grandTotal,
      remarks: undefined,
      customBody,
    });
  }, [selectedTemplate, recipientName, currentServiceCall, ticketId, customBody]);

  const handleCopy = () => {
    if (!compiledText) return;
    navigator.clipboard.writeText(compiledText);
    setCopied(true);
    toast.success("Email text copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenMailto = () => {
    if (!emailAddress.trim()) {
      toast.error("Please enter a valid customer email address");
      return;
    }
    const url = generateMailtoLink({
      to: emailAddress.trim(),
      subject,
      body: compiledText,
    });
    window.open(url, "_blank");
    toast.success("Opened in your default email client!");
  };

  const handleSend = async () => {
    if (!emailAddress.trim() || !emailAddress.includes("@")) {
      toast.error("Please enter a valid customer email address");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject cannot be empty");
      return;
    }

    setSending(true);
    try {
      const result = await sendCustomerEmail({
        to: emailAddress.trim(),
        customerName: recipientName,
        subject: subject.trim(),
        htmlContent: compiledHtml,
        textContent: compiledText,
        ticketNo: currentServiceCall?.ticketNo || ticketId,
      });

      if (result.success) {
        if (result.usedFallback) {
          toast.success("Email composer opened with ticket details!");
        } else {
          toast.success("⚡ Customer email dispatched successfully!");
        }
        onSent?.({ messageId: result.messageId });
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Failed to send customer email:", err);
      toast.error(`Email error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white dark:bg-slate-950">
        {/* Dark Header */}
        <DialogHeader className="px-5 py-3.5 bg-slate-900 dark:bg-slate-950 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white leading-snug">
                  {title || "Send Customer Email"}
                </DialogTitle>
                <p className="text-[11px] text-blue-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <Zap className="h-3 w-3 fill-blue-400" /> Zorba Email Dispatch Engine
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

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Customer & Email Destination */}
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
              <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <Input
                type="email"
                placeholder="customer@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className={`h-7 w-60 text-xs font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 shadow-2xs text-slate-900 dark:text-white px-2.5 py-0 focus-visible:ring-1 focus-visible:ring-blue-500 ${
                  !emailAddress ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20" : ""
                }`}
              />
            </div>
          </div>

          {!emailAddress && (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-2 text-[11px]">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Customer email address is not yet registered. Enter an email address above to proceed.</span>
            </div>
          )}

          {/* Template & Ticket Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Select Email Template
              </Label>
              <Select value={selectedTemplate} onValueChange={(v) => handleTemplateChange(v as EmailTemplateType)}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold shadow-2xs">
                  <SelectValue placeholder="Choose email template..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 text-xs">
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                      {tpl.label}
                    </SelectItem>
                  ))}
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

          {/* Subject Line Field */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Email Subject Line
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. [SC-2026-08-0004] Service Intake Confirmation"
              className="h-8 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Freeform Message Editor */}
          {selectedTemplate === "freeform" && (
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Custom Email Body
              </Label>
              <Textarea
                rows={4}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="Type custom email message to send..."
                className="text-xs rounded-xl font-sans leading-relaxed"
              />
            </div>
          )}

          {/* Preview Viewport */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>Email Content Preview</span>
                </Label>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewTab("html")}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    previewTab === "html" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Visual HTML
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("text")}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    previewTab === "text" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Plain Text
                </button>
              </div>
            </div>

            {previewTab === "html" ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-950 p-2">
                <iframe
                  title="Email HTML Preview"
                  srcDoc={compiledHtml}
                  className="w-full h-64 border-0 rounded-lg bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="w-full h-64 overflow-y-auto rounded-xl bg-slate-50/90 dark:bg-slate-900/90 p-3.5 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text border border-slate-200/80 dark:border-slate-800 shadow-inner">
                {compiledText}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 flex items-center justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-1.5">
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
                  <span>Copy Text</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenMailto}
              className="text-xs rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 cursor-pointer h-8 shadow-2xs text-blue-600 hover:text-blue-700"
              title="Open in default email app"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Mail App</span>
            </Button>
          </div>

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
              className="text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5 cursor-pointer px-4 h-8"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Email</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
