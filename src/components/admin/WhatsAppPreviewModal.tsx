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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface WhatsAppPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  recipientName: string;
  recipientRole?: string;
  defaultPhone: string;
  defaultMessage: string;
}

export default function WhatsAppPreviewModal({
  open,
  onOpenChange,
  title,
  recipientName,
  recipientRole = "Recipient",
  defaultPhone,
  defaultMessage,
}: WhatsAppPreviewModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || "");
  const [message, setMessage] = useState(defaultMessage || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setPhoneNumber(defaultPhone || "");
      setMessage(defaultMessage || "");
      setCopied(false);
    }
  }, [open, defaultPhone, defaultMessage]);

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = () => {
    const rawPhone = phoneNumber.replace(/\D/g, "");
    if (!rawPhone) {
      toast.error("Please enter a valid phone number with country code");
      return;
    }
    const cleanPhone = rawPhone.startsWith("91") && rawPhone.length > 10 ? rawPhone : rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    if (!message.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                {title || "Send WhatsApp Message"}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Review and customize the message and phone number before sending
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Top Section: Phone Number & Recipient Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">{recipientName || "Contact"}</span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {recipientRole}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Recipient WhatsApp Number
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
                Compiled Message (Editable)
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {message.length} characters
              </span>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={11}
              placeholder="Enter your WhatsApp message..."
              className="text-xs font-mono rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200"
            />
            <p className="text-[10px] text-slate-400 italic">
              Tip: Use *bold* for emphasis, _italics_ for secondary text. Line breaks will be preserved.
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0 flex items-center justify-between sm:justify-between">
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
                <span>Copied!</span>
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
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
