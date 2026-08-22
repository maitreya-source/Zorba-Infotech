import { useState, useEffect } from "react";
import { MessageSquare, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";
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
import type { Quotation } from "@/lib/types";

interface QuotationWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
}

export default function QuotationWhatsAppModal({
  open,
  onOpenChange,
  quotation,
}: QuotationWhatsAppModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (quotation) {
      setPhone(quotation.customerPhone || "");

      const itemsText = quotation.items
        .map(
          (it, idx) =>
            `${idx + 1}. *${it.productName}*${it.modelNumber ? `\n   Model: _${it.modelNumber}_` : ""}\n   Qty: ${it.quantity} @ ~₹${it.estimatedPrice.toLocaleString("en-IN")} = *₹${(it.totalPrice || it.estimatedPrice * it.quantity).toLocaleString("en-IN")}*`
        )
        .join("\n\n");

      const draft = `*PRICE ESTIMATE QUOTATION - ZORBA INFOTECH*
Quotation No: *#${quotation.quotationNo}*
Date: ${quotation.date || new Date().toISOString().split("T")[0]}
Customer: *${quotation.customerName || "Valued Customer"}*

*Estimated Items:*
${itemsText}

-----------------------------
*Subtotal:* ₹${quotation.subtotal.toLocaleString("en-IN")}
${(quotation.discount || 0) > 0 ? `*Discount:* -₹${(quotation.discount || 0).toLocaleString("en-IN")}\n` : ""}*Estimated Grand Total:* *₹${quotation.grandTotal.toLocaleString("en-IN")}*
-----------------------------

*Important Notice & Disclaimer:*
1. All prices mentioned above are estimated approximate prices based on current market rates and are subject to change at the time of actual purchase/order confirmation based on product availability.
2. This is not an invoice. This is only a quotation and should not be treated as a tax invoice.
3. Final tax invoice and warranty terms will be provided upon confirmation and fulfillment of order.

For any questions, feel free to contact us:
📞 +91 95891 99738 / +91 91798 90150
*Zorba Infotech, Neemuch*`;

      setMessage(draft);
    }
  }, [quotation, open]);

  if (!quotation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Quotation message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    const formattedPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12
      ? cleanPhone
      : `91${cleanPhone.slice(-10)}`;

    const encodedText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp chat with customer...");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 border-slate-200 dark:border-slate-800 text-xs">
        <DialogHeader className="p-0 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span>Send Quotation via WhatsApp</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Customer Mobile Number (WhatsApp)
            </Label>
            <Input
              placeholder="e.g. 9589199738"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-xs font-mono rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Message Preview
              </Label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy Text"}</span>
              </button>
            </div>
            <Textarea
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 p-3 leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="p-0 pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSendWhatsApp}
            className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Open in WhatsApp</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
