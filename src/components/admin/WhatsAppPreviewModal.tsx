import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  Copy,
  Check,
  User,
  Phone,
  Edit3,
  Zap,
  Settings,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getWhatsAppApiConfig,
  sendWhatsAppMessage,
  formatPhoneForMetaApi,
  type WhatsAppApiConfig,
} from "@/lib/whatsappApi";
import WhatsAppApiSettingsModal from "./WhatsAppApiSettingsModal";

interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  recipientName: string;
  recipientRole?: string;
  defaultPhone: string;
  defaultMessage: string;
  ticketId?: string;
  templateName?: string;
  templateParams?: string[];
  onSent?: (result: { mode: "cloud_api" | "whatsapp_web"; messageId?: string }) => void;
}

export default function WhatsAppPreviewModal({
  open,
  onOpenChange,
  title,
  recipientName,
  recipientRole = "Recipient",
  defaultPhone,
  defaultMessage,
  ticketId,
  templateName,
  templateParams,
  onSent,
}: WhatsAppPreviewModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || "");
  const [message, setMessage] = useState(defaultMessage || "");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState<WhatsAppApiConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (open) {
      setPhoneNumber(defaultPhone || "");
      setMessage(defaultMessage || "");
      setCopied(false);
      getWhatsAppApiConfig().then(setConfig);
    }
  }, [open, defaultPhone, defaultMessage]);

  const isApiReady = Boolean(config?.enabled && config?.accessToken && config?.phoneNumberId);

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = formatPhoneForMetaApi(phoneNumber);
    if (!cleanPhone) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!message.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onSent?.({ mode: "whatsapp_web" });
    onOpenChange(false);
  };

  const handleSend = async () => {
    const cleanPhone = formatPhoneForMetaApi(phoneNumber);
    if (!cleanPhone) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!message.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    // If Cloud API is configured, send directly via API
    if (isApiReady) {
      setSending(true);
      try {
        const result = await sendWhatsAppMessage({
          to: cleanPhone,
          message: message.trim(),
          templateName,
          templateParams,
        });

        if (result.success) {
          toast.success("⚡ WhatsApp delivered directly via Meta Cloud API!");
          onSent?.({ mode: "cloud_api", messageId: result.messageId });
          onOpenChange(false);
        } else if (result.fallbackToWeb) {
          toast.info("Cloud API not reachable. Redirecting to WhatsApp Web fallback...");
          handleOpenWhatsAppWeb();
        }
      } catch (err: any) {
        console.error("Direct send failed:", err);
        toast.error(`WhatsApp send error: ${err.message}`);
        if (config?.autoFallbackToWeb) {
          handleOpenWhatsAppWeb();
        }
      } finally {
        setSending(false);
      }
    } else {
      // Direct API not configured yet -> open WhatsApp Web
      handleOpenWhatsAppWeb();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
          {/* Header */}
          <DialogHeader className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{title || "Send WhatsApp Message"}</span>
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isApiReady ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Zap className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Direct Cloud API Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <span>Web Redirect Mode</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* API Settings Trigger Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
                className="h-8 px-2.5 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 rounded-xl cursor-pointer"
                title="Configure Meta WhatsApp Cloud API"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">API Settings</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Phone Number & Recipient Info */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">{recipientName || "Contact"}</span>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {recipientRole}
                  </span>
                </div>
                {ticketId && (
                  <Badge variant="outline" className="font-mono text-[10px] bg-white dark:bg-slate-950">
                    {ticketId}
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Recipient WhatsApp Mobile Number
                </Label>
                <Input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Compiled & Editable Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-[#2563EB]" />
                  Message Content (Editable)
                </Label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {message.length} chars
                </span>
              </div>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={9}
                placeholder="Enter your WhatsApp message..."
                className="text-xs font-mono rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200"
              />
              <p className="text-[10px] text-slate-400 italic">
                Tip: Use *bold* for emphasis, _italics_ for secondary details.
              </p>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0 flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs rounded-xl gap-1.5 border-slate-300 dark:border-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </Button>

              {isApiReady && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenWhatsAppWeb}
                  className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl gap-1"
                  title="Open in WhatsApp Web"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Web</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSend}
                disabled={sending}
                className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 cursor-pointer px-4"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    {isApiReady ? <Zap className="h-3.5 w-3.5 fill-white" /> : <Send className="h-3.5 w-3.5" />}
                    <span>{isApiReady ? "Send via Cloud API" : "Send WhatsApp Web"}</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp API Configuration Modal */}
      <WhatsAppApiSettingsModal
        open={showSettingsModal}
        onOpenChange={(isOpen) => {
          setShowSettingsModal(isOpen);
          if (!isOpen) {
            getWhatsAppApiConfig().then(setConfig);
          }
        }}
      />
    </>
  );
}
