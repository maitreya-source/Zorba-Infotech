import { useRef } from "react";
import { Printer, X, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Quotation } from "@/lib/types";

interface QuotationPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
}

export default function QuotationPrintModal({
  open,
  onOpenChange,
  quotation,
}: QuotationPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = quotation.date
    ? new Date(quotation.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-slate-200 dark:border-slate-800 text-xs">
        <DialogHeader className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Printer className="h-4 w-4" />
            </div>
            <span>Quotation Preview & Print Sheet</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Quotation</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Sheet Body */}
        <div ref={printRef} className="p-6 md:p-8 bg-white text-slate-900 print:p-0 print:m-0 font-sans space-y-6">
          {/* Company Branding Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 font-display">
                ZORBA INFOTECH
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Complete IT Hardware, CCTV Surveillance, Networking & Repair Solutions
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Neemuch, Madhya Pradesh • Phone: +91 95891 99738 / +91 91798 90150 • Email: support@zorbainfotech.com
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider mb-1">
                PRICE ESTIMATE
              </div>
              <p className="font-mono font-bold text-sm text-slate-900">
                #{quotation.quotationNo}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: <span className="font-semibold text-slate-800">{formattedDate}</span>
              </p>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quotation Issued To:
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {quotation.customerName || "Valued Customer"}
              </p>
              {quotation.customerPhone && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Phone: {quotation.customerPhone}
                </p>
              )}
              {quotation.customerEmail && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Email: {quotation.customerEmail}
                </p>
              )}
            </div>

            <div className="text-right sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Delivery / Site Address:
              </span>
              <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap">
                {quotation.customerAddress || "Over Counter / Site Delivery"}
              </p>
              {quotation.templateName && (
                <p className="text-[11px] text-blue-600 font-semibold mt-1">
                  Template: {quotation.templateName}
                </p>
              )}
            </div>
          </div>

          {/* Quotation Line Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Model Number / Part</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 text-right w-28">Est. Price (₹)</th>
                  <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotation.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {item.productName}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-semibold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {item.modelNumber || "-"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">
                      {item.category || "General"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                      ₹{item.estimatedPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                      ₹{(item.totalPrice || item.estimatedPrice * item.quantity).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals & Summary */}
          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Estimated):</span>
                <span className="font-mono font-bold">
                  ₹{quotation.subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              {(quotation.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount:</span>
                  <span className="font-mono font-bold">
                    -₹{(quotation.discount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-extrabold text-slate-950">
                <span>Estimated Total:</span>
                <span className="font-mono text-base text-blue-700 font-black">
                  ₹{quotation.grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions (Mandatory Price Estimate Notice) */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Terms & Conditions / Estimate Notice</span>
            </div>
            <div className="text-amber-900/90 whitespace-pre-wrap leading-relaxed">
              {quotation.termsAndConditions ||
                `1. All prices mentioned above are estimated approximate prices based on current market rates and are subject to change at the time of actual purchase/order confirmation based on product availability.
2. This is not an invoice. This is only a quotation and should not be treated as a tax invoice.
3. Final tax invoice and warranty terms will be provided upon confirmation and fulfillment of order.`}
            </div>
          </div>

          {/* Authorized Signature */}
          <div className="pt-6 flex justify-between items-end text-xs text-slate-500 border-t border-slate-200">
            <div>
              <p className="text-[11px]">Thank you for choosing Zorba Infotech!</p>
              <p className="text-[10px] text-slate-400">Computer Hardware • CCTV • Printers • Networking</p>
            </div>
            <div className="text-right">
              <div className="h-10"></div>
              <p className="font-bold text-slate-800 border-t border-slate-400 pt-1 px-4">
                For Zorba Infotech
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 print:hidden flex justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-xl"
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Now</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
