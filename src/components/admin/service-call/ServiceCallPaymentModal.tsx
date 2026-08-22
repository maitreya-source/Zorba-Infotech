import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, Clock, DollarSign, Wallet, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { PaymentStatus, PaymentMode } from "@/lib/types";

interface ServiceCallPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketNo: string;
  customerName?: string;
  grandTotal: number;
  currentPaymentStatus?: PaymentStatus;
  currentPaymentMode?: PaymentMode;
  currentAmountPaid?: number;
  currentPaymentDate?: string;
  currentPaymentNotes?: string;
  onConfirm: (data: {
    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;
    amountPaid?: number;
    paymentDate?: string;
    paymentNotes?: string;
  }) => void;
  saving?: boolean;
}

export default function ServiceCallPaymentModal({
  open,
  onOpenChange,
  ticketNo,
  customerName,
  grandTotal,
  currentPaymentStatus = "due",
  currentPaymentMode = "upi",
  currentAmountPaid,
  currentPaymentDate,
  currentPaymentNotes,
  onConfirm,
  saving = false,
}: ServiceCallPaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>("due");
  const [mode, setMode] = useState<PaymentMode>("upi");
  const [amount, setAmount] = useState<string>(String(grandTotal || ""));
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      // Default to "due" unless already set
      setStatus(currentPaymentStatus || "due");
      setMode(currentPaymentMode || "upi");
      setAmount(
        currentAmountPaid !== undefined && currentAmountPaid !== null
          ? String(currentAmountPaid)
          : String(grandTotal || "")
      );
      setDate(
        currentPaymentDate || new Date().toISOString().split("T")[0]
      );
      setNotes(currentPaymentNotes || "");
    }
  }, [
    open,
    currentPaymentStatus,
    currentPaymentMode,
    currentAmountPaid,
    currentPaymentDate,
    currentPaymentNotes,
    grandTotal,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    onConfirm({
      paymentStatus: status,
      paymentMode: status === "paid" || status === "partial" ? mode : undefined,
      amountPaid: status === "paid" || status === "partial" ? parsedAmount : 0,
      paymentDate: status === "paid" || status === "partial" ? date : undefined,
      paymentNotes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800 p-5 text-xs">
        <DialogHeader className="p-0 mb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <span>Payment Status Confirmation</span>
              <p className="text-[11px] font-normal text-slate-400">
                Ticket #{ticketNo} {customerName ? `• ${customerName}` : ""}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Grand Total Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Total Invoice Amount
            </span>
            <span className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-400">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Payment Status Selection: Default "due" */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-900 dark:text-white">
              Select Payment State
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus("due")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === "due"
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-xs">Payment Due</p>
                  <p className="text-[10px] text-slate-400">Mark as task to complete</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus("paid");
                  if (!amount || amount === "0") setAmount(String(grandTotal || ""));
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === "paid"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-xs">Payment Received</p>
                  <p className="text-[10px] text-slate-400">Fully paid & collected</p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional fields if Paid or Partial */}
          {status === "paid" && (
            <div className="space-y-3 p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Payment Mode
                  </Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
                    <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi" className="text-xs">UPI / QR Code</SelectItem>
                      <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                      <SelectItem value="card" className="text-xs">Debit / Credit Card</SelectItem>
                      <SelectItem value="bank_transfer" className="text-xs">Bank Transfer / NEFT</SelectItem>
                      <SelectItem value="other" className="text-xs">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Amount Collected (₹)
                  </Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Payment Date
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Reference / Transaction Notes (Optional)
                </Label>
                <Input
                  placeholder="e.g. GPay UPI Ref 928374928"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-0 pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className={`h-9 text-xs font-bold rounded-xl text-white ${
                status === "paid"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {saving
                ? "Updating..."
                : status === "paid"
                ? "Confirm Payment Received"
                : "Confirm Payment Due (Task)"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
