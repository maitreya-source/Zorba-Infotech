import { useState } from "react";
import { Copy, Check, MessageSquare, ExternalLink, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ReportWhatsAppShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryText: string;
  periodLabel: string;
}

export default function ReportWhatsAppShareModal({
  open,
  onOpenChange,
  summaryText,
  periodLabel,
}: ReportWhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [customMessage, setCustomMessage] = useState(summaryText);

  // Keep custom message in sync when summaryText changes
  const messageToUse = customMessage || summaryText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageToUse);
      setCopied(true);
      toast.success("Report summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy report text");
    }
  };

  const handleOpenWhatsApp = () => {
    const raw = recipientPhone.replace(/\D/g, "");
    let phoneParam = "";
    if (raw.length === 10) {
      phoneParam = `91${raw}`;
    } else if (raw.length > 10) {
      phoneParam = raw;
    }

    const encoded = encodeURIComponent(messageToUse);
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, "_blank");
    toast.success("Opening WhatsApp with report summary...");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="px-5 py-4 bg-slate-900 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white leading-snug">
                  Share Report on WhatsApp
                </DialogTitle>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Formatted summary for store managers & partners
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/10 text-white border-0 font-mono text-[11px]">
              {periodLabel}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <Label htmlFor="phone-input" className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              Recipient Phone Number (Optional)
            </Label>
            <Input
              id="phone-input"
              type="tel"
              placeholder="e.g. 98260 12345 (leave empty to pick contact in WhatsApp)"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              If blank, WhatsApp will prompt you to pick a contact or group when opened.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
              <span>Message Preview (Editable)</span>
              <span className="text-[10px] font-normal text-muted-foreground">Markdown formatted</span>
            </Label>
            <Textarea
              rows={11}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="text-[11px] font-mono leading-relaxed rounded-xl p-3 bg-muted/40 border-muted-foreground/20 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3.5 bg-muted/30 border-t flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs rounded-xl h-9 gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 h-9 px-4 gap-1.5 shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
