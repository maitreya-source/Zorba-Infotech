import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  isWhatsAppApiConfigured,
  sendWhatsAppMessage,
  formatPhoneForMetaApi,
} from "@/lib/whatsappApi";

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
  onSent?: (result: { messageId?: string }) => void;
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

  useEffect(() => {
    if (open) {
      setPhoneNumber(defaultPhone || "");
      setMessage(defaultMessage || "");
      setCopied(false);
    }
  }, [open, defaultPhone, defaultMessage]);

  const isApiReady = isWhatsAppApiConfigured();

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
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
    if (!message.trim()) {
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
        message: message.trim(),
        templateName,
        templateParams,
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
      <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white dark:bg-slate-950">
        {/* Zorba Standard Dark Header */}
        <DialogHeader className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white shrink-0 border-b border-slate-800">
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

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {/* Customer / Recipient Information Section */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-0.5">
              {recipientRole === "Customer" || !recipientRole ? "Customer Information" : `${recipientRole} Information`}
            </Label>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                  {recipientName || "Contact"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <Input
                  type="text"
                  placeholder="+91 Mobile Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-7 w-40 text-xs font-mono font-bold bg-white dark:bg-slate-950 border-0 shadow-2xs text-slate-900 dark:text-white px-2.5 py-0 focus-visible:ring-1 focus-visible:ring-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Read-Only WhatsApp Message Preview Container */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Message Preview
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {message.length} characters
              </span>
            </div>

            <div className="w-full max-h-72 overflow-y-auto rounded-xl bg-slate-50/90 dark:bg-slate-900/90 p-3.5 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text selection:bg-emerald-100 dark:selection:bg-emerald-900/60">
              {message}
            </div>
            <p className="text-[10px] text-slate-400 italic px-0.5">
              Pre-formatted with ticket parameters according to approved WhatsApp business template.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 cursor-pointer h-9 shadow-2xs"
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
              className="text-xs rounded-xl h-9 cursor-pointer border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 cursor-pointer px-4 h-9"
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
