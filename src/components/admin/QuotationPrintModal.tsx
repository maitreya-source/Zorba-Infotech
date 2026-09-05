import { useState } from "react";
import { Printer, FileText, CheckSquare, Tag, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZorbaLogoIcon } from "@/components/common/ZorbaLogo";
import type { Quotation } from "@/lib/types";
import { formatPhoneForPrint } from "@/lib/utils";

// Vector Code 39 Barcode SVG Component for crisp single-page A4 printing
function QuotationBarcode({ value }: { value: string }) {
  const code39Map: Record<string, string> = {
    "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
    "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
    "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
    "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
    "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
    "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
    "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
    "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
    "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
    "-": "010000101", " ": "011000100", "*": "010010100",
  };

  const cleanVal = (value || "QUOT").toUpperCase().replace(/[^A-Z0-9\- ]/g, "");
  const text = `*${cleanVal}*`;
  const bars: { width: number; isBar: boolean }[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const pattern = code39Map[char] || code39Map["-"];
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "1";
      bars.push({ width: isWide ? 2.2 : 1, isBar });
    }
    if (i < text.length - 1) {
      bars.push({ width: 1, isBar: false });
    }
  }

  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);
  let currentX = 0;

  return (
    <div className="flex flex-col items-end shrink-0">
      <svg
        viewBox={`0 0 ${totalWidth} 32`}
        className="h-7 w-36 text-black print:text-black"
        preserveAspectRatio="none"
      >
        {bars.map((b, idx) => {
          const x = currentX;
          currentX += b.width;
          if (!b.isBar) return null;
          return <rect key={idx} x={x} y="0" width={b.width} height="32" fill="black" />;
        })}
      </svg>
      <span className="font-mono text-[9px] font-extrabold tracking-widest text-black mt-0.5">
        {cleanVal}
      </span>
    </div>
  );
}

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
  const [showCustomer, setShowCustomer] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showBilling, setShowBilling] = useState(true);
  const [showTerms, setShowTerms] = useState(true);

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
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        {/* Bulletproof 1-Page A4 Print CSS - Match Service Call format exactly and eliminate close button */}
        <style>{`
          @media print {
            @page {
              size: portrait;
              margin: 6mm 8mm;
            }

            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              max-height: 100% !important;
              overflow: hidden !important;
            }

            /* CRITICAL: Completely remove background React app (#root) from print layout */
            #root {
              display: none !important;
              height: 0 !important;
              max-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              visibility: hidden !important;
            }

            /* CRITICAL: Completely hide modal overlay backdrop, action buttons, and non-printable elements */
            [data-radix-portal] > div[data-state="open"]:not([role="dialog"]),
            [data-radix-portal] > div:first-child:not([role="dialog"]),
            div[data-radix-dialog-overlay],
            .fixed.inset-0,
            button,
            button.absolute,
            [data-radix-portal] button,
            [data-radix-dialog-content] > button,
            .print\\:hidden {
              display: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }

            body * {
              visibility: hidden !important;
            }

            /* Strip Radix Dialog centering and flow naturally on single page */
            [data-radix-portal],
            div[role="dialog"] {
              position: static !important;
              display: block !important;
              transform: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              overflow: visible !important;
            }

            /* Make printable card area and all its children visible */
            #printable-quotation-area,
            #printable-quotation-area * {
              visibility: visible !important;
              color: #000000 !important;
              border-color: #000000 !important;
              background-color: transparent !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }

            #printable-quotation-area {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-height: 275mm !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              filter: grayscale(100%) !important;
              box-sizing: border-box !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        <DialogHeader className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-2 print:hidden">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" /> Quotation Preview & Barcode Manager
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 font-bold print:hidden">
              <Printer className="h-4 w-4" /> Print Single Page A4
            </Button>
          </div>
        </DialogHeader>

        {/* Selective Print Controls (Screen Only) */}
        <div className="bg-muted/40 p-3.5 rounded-xl border space-y-2.5 print:hidden text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-primary" /> Select Sections to Print:
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomer(true);
                  setShowItems(true);
                  setShowBilling(true);
                  setShowTerms(true);
                }}
                className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
              >
                <FileText className="h-3 w-3" /> Full Estimate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomer(true);
                  setShowItems(true);
                  setShowBilling(true);
                  setShowTerms(false);
                }}
                className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
              >
                <Receipt className="h-3 w-3" /> Without Terms
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomer}
                onChange={(e) => setShowCustomer(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Customer Info
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showItems}
                onChange={(e) => setShowItems(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Product Items Table
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showBilling}
                onChange={(e) => setShowBilling(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Totals & Summary
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTerms}
                onChange={(e) => setShowTerms(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Terms & Notice
            </label>
          </div>
        </div>

        {/* Printable Single Page A4 Content Container */}
        <div id="printable-quotation-area" className="py-1 space-y-2 text-xs print:p-0">
          {/* Company Header with Barcode at Top Right (Matches Service Call Format) */}
          <div className="flex justify-between items-start border-b border-black/20 pb-1.5">
            <div className="flex items-center gap-2.5">
              <ZorbaLogoIcon className="h-9 w-9 shrink-0" isMonochrome={true} />
              <div>
                <h2 className="text-base font-extrabold font-display tracking-tight text-black leading-none">
                  ZORBA INFOTECH
                </h2>
                <p className="text-[10px] font-semibold text-black leading-tight mt-0.5">
                  Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.)
                </p>
                <p className="text-[8.5px] text-black mt-0.5 leading-tight">
                  Phone: Main: <strong>{formatPhoneForPrint("9993599730")}</strong> | Support: <strong>{formatPhoneForPrint("9302199730")}</strong> | Sales: <strong>{formatPhoneForPrint("9424899730")}</strong> | Accounts: <strong>{formatPhoneForPrint("9179699730")}</strong>
                </p>
                <p className="text-[8.5px] text-black mt-0.5 leading-tight">
                  Email: zorbainfotech@gmail.com | zorba99730@gmail.com
                </p>
              </div>
            </div>

            {/* Top Barcode containing Quotation Number */}
            <div className="flex flex-col items-end">
              <QuotationBarcode value={quotation.quotationNo} />
              <p className="text-[9px] text-black mt-0.5 font-semibold">
                Date: {formattedDate}
              </p>
              <p className="text-[9px] font-bold uppercase text-black">
                PRICE ESTIMATE / QUOTATION
              </p>
            </div>
          </div>

          {/* Customer Details Box */}
          {showCustomer && (
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-black/20 p-2 bg-muted/20 print:bg-transparent print:border-black">
              <div>
                <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                  Quotation Issued To
                </h3>
                <p className="font-bold text-[11px] text-black">{quotation.customerName || "Valued Customer"}</p>
                {quotation.customerPhone && (
                  <p className="text-[11px] font-sans font-bold text-black tabular-nums">
                    Phone: {formatPhoneForPrint(quotation.customerPhone)}
                  </p>
                )}
                {quotation.customerEmail && (
                  <p className="text-[10px] text-black">Email: {quotation.customerEmail}</p>
                )}
              </div>

              <div>
                <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                  Delivery / Site Address
                </h3>
                <p className="text-[10px] text-black whitespace-pre-wrap">
                  {quotation.customerAddress ? `Address: ${quotation.customerAddress}` : "Over Counter / Site Delivery"}
                </p>
                {quotation.templateName && (
                  <p className="text-[10px] font-semibold text-black mt-0.5">
                    Category: {quotation.templateName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quotation Line Items Table */}
          {showItems && (
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                Quotation Items & Specifications
              </h3>
              <table className="w-full text-[11px] border border-black rounded-lg overflow-hidden">
                <thead className="border-b border-black font-bold uppercase bg-muted/30 text-black">
                  <tr>
                    <th className="px-2 py-0.5 text-center w-8 border-r border-black">#</th>
                    <th className="px-2 py-0.5 text-left border-r border-black">Product Name / Description</th>
                    <th className="px-2 py-0.5 text-left border-r border-black">Category</th>
                    <th className="px-2 py-0.5 text-left border-r border-black">Model / Part No.</th>
                    <th className="px-2 py-0.5 text-center w-12 border-r border-black">Qty</th>
                    <th className="px-2 py-0.5 text-right w-24 border-r border-black">Est. Price</th>
                    <th className="px-2 py-0.5 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {quotation.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="px-2 py-0.5 text-center font-mono text-black border-r border-black">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-0.5 border-r border-black">
                        <div className="font-bold text-black text-[11px] leading-tight">
                          {item.productName}
                        </div>
                        {item.description && (
                          <div className="text-[9.5px] text-black leading-tight mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-0.5 text-black border-r border-black text-[10px]">
                        {item.category || "General"}
                      </td>
                      <td className="px-2 py-0.5 font-mono font-semibold text-black border-r border-black text-[10px]">
                        {item.modelNumber || "-"}
                      </td>
                      <td className="px-2 py-0.5 text-center font-mono text-black border-r border-black">
                        {item.quantity}
                      </td>
                      <td className="px-2 py-0.5 text-right font-mono text-black border-r border-black">
                        ₹{item.estimatedPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-0.5 text-right font-mono font-bold text-black">
                        ₹{(item.totalPrice || item.estimatedPrice * item.quantity).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pricing Totals & Summary */}
          {showBilling && (
            <div className="flex justify-end border-t border-black/20 pt-1 print:border-black">
              <div className="w-56 space-y-0.5 text-[11px] text-black">
                <div className="flex justify-between text-black">
                  <span>Subtotal (Estimated):</span>
                  <span className="font-mono">₹{quotation.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {Boolean(quotation.discount && quotation.discount > 0) && (
                  <div className="flex justify-between text-black font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{quotation.discount?.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-black pt-0.5 text-xs font-extrabold text-black">
                  <span>Estimated Total:</span>
                  <span className="font-mono">₹{quotation.grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions / Estimate Notice */}
          {showTerms && (
            <div className="border-t border-black/30 pt-1 text-[10px] text-black print:border-black">
              <p className="font-bold text-black mb-0.5 text-[10px]">
                Terms & Conditions / Estimate Notice:
              </p>
              <div className="rounded-lg border border-black/20 p-1.5 text-[8.5px] text-black leading-tight print:border-black whitespace-pre-wrap">
                {quotation.termsAndConditions ||
                  `1. All prices mentioned above are estimated approximate prices based on current market rates and are subject to change at the time of actual purchase/order confirmation based on product availability.
2. This is not a tax invoice. Final tax invoice and warranty terms will be provided upon confirmation and fulfillment of order.
3. Goods once sold will not be taken back or exchanged. Subject to Neemuch jurisdiction.`}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
