import { useState } from "react";
import { Printer, CheckSquare, Tag, FileText, Receipt, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZorbaLogoIcon } from "@/components/common/ZorbaLogo";
import type { ServiceCall } from "@/lib/types";
import { formatPhoneForPrint } from "@/lib/utils";

// Vector Code 39 Barcode SVG Component for crisp single-page A4 printing
function TicketBarcode({ value }: { value: string }) {
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

  const cleanVal = (value || "TICKET").toUpperCase().replace(/[^A-Z0-9\- ]/g, "");
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

interface JobCardPrintModalProps {
  serviceCall: ServiceCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDispatchSlip?: () => void;
}

export default function JobCardPrintModal({
  serviceCall,
  open,
  onOpenChange,
  onOpenDispatchSlip,
}: JobCardPrintModalProps) {
  // Section Visibility Toggles for Selective Printing
  const [showCustomer, setShowCustomer] = useState(true);
  const [showDevice, setShowDevice] = useState(true);
  const [showIssue, setShowIssue] = useState(true);
  const [showBilling, setShowBilling] = useState(true);
  const [showTerms, setShowTerms] = useState(true);

  if (!serviceCall) return null;

  const handlePrint = () => {
    window.print();
  };

  // Presets
  const applyPresetFull = () => {
    setShowCustomer(true);
    setShowDevice(true);
    setShowIssue(true);
    setShowBilling(true);
    setShowTerms(true);
  };

  const applyPresetCustomerReceipt = () => {
    setShowCustomer(true);
    setShowDevice(true);
    setShowIssue(true);
    setShowBilling(true);
    setShowTerms(true);
  };

  const applyPresetTechTag = () => {
    setShowCustomer(true);
    setShowDevice(true);
    setShowIssue(true);
    setShowBilling(false);
    setShowTerms(false);
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "company_service_center":
        return "Company Service Center";
      case "in_house_repair":
        return "In-House Service / Repair";
      case "onsite_visit":
        return "Onsite Visit & Service";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        {/* Bulletproof 1-Page A4 Print CSS - Strip Radix positioning transforms */}
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
            .print\\:hidden {
              display: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              visibility: hidden !important;
            }

            body * {
              visibility: hidden !important;
            }

            /* Strip Radix Dialog centering offsets so content flows naturally on single page */
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
            #printable-job-card-area,
            #printable-job-card-area * {
              visibility: visible !important;
              color: #000000 !important;
              border-color: #000000 !important;
              background-color: transparent !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }

            #printable-job-card-area {
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
            <Printer className="h-5 w-5 text-primary" /> Service Print & Barcode Manager
          </DialogTitle>
          <div className="flex items-center gap-2">
            {onOpenDispatchSlip && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenDispatchSlip}
                className="gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 print:hidden"
              >
                <Truck className="h-4 w-4" /> Dispatch Slip
              </Button>
            )}
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
                onClick={applyPresetFull}
                className="h-6 text-[10px] gap-1 px-2"
              >
                <FileText className="h-3 w-3" /> Full Card
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyPresetCustomerReceipt}
                className="h-6 text-[10px] gap-1 px-2"
              >
                <Receipt className="h-3 w-3" /> Receipt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyPresetTechTag}
                className="h-6 text-[10px] gap-1 px-2"
              >
                <Tag className="h-3 w-3 text-amber-500" /> Tech Tag Only
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
                checked={showDevice}
                onChange={(e) => setShowDevice(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Device Details
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showIssue}
                onChange={(e) => setShowIssue(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Issue / Task
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showBilling}
                onChange={(e) => setShowBilling(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Parts & Billing
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTerms}
                onChange={(e) => setShowTerms(e.target.checked)}
                className="rounded border-gray-300 text-primary"
              />
              Terms & Signature
            </label>
          </div>
        </div>

        {/* Printable Single Page A4 Voucher Content Container */}
        <div id="printable-job-card-area" className="py-1 space-y-2 text-xs print:p-0">
          {/* Company Header with Barcode at Top Right */}
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

            {/* Top Barcode containing Service Call Ticket Number */}
            <div className="flex flex-col items-end">
              <TicketBarcode value={serviceCall.ticketNo} />
              <p className="text-[9px] text-black mt-0.5 font-semibold">
                Date: {new Date(serviceCall.dateTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-[9px] font-bold uppercase text-black">
                {getTypeName(serviceCall.type)}
              </p>
            </div>
          </div>

          {/* Customer & Device info grid */}
          {(showCustomer || showDevice) && (
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-black/20 p-2 bg-muted/20 print:bg-transparent print:border-black">
              {showCustomer ? (
                <div>
                  <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                    Customer Information
                  </h3>
                  <p className="font-bold text-[11px] text-black">{serviceCall.customerName}</p>
                  <p className="text-[11px] font-sans font-bold text-black tabular-nums">
                    Phone: {formatPhoneForPrint(serviceCall.customerPhone)}
                  </p>
                  {serviceCall.customerEmail && <p className="text-[10px] text-black">Email: {serviceCall.customerEmail}</p>}
                  {serviceCall.customerAddress && <p className="text-[10px] text-black mt-0.5">Address: {serviceCall.customerAddress}</p>}
                </div>
              ) : (
                <div />
              )}

              {showDevice && (
                <div>
                  <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                    Device Details
                  </h3>
                  <div className="space-y-0.5 text-[11px] text-black">
                    <p><span className="font-semibold">Category:</span> {serviceCall.deviceCategory}</p>
                    {serviceCall.modelNumber && <p><span className="font-semibold">Model:</span> {serviceCall.modelNumber}</p>}
                    {serviceCall.serialNumber && <p><span className="font-semibold">Serial No:</span> {serviceCall.serialNumber}</p>}
                    <p><span className="font-semibold">Qty:</span> {serviceCall.quantity}</p>
                    <p><span className="font-semibold">Warranty:</span> <span className="capitalize">{serviceCall.warrantyStatus.replace(/_/g, " ")}</span></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Service Center / Onsite Details if applicable */}
          {showDevice && serviceCall.type === "company_service_center" && serviceCall.serviceCenterName && (
            <div className="rounded-lg border border-black/30 p-1.5 text-[11px] text-black print:border-black">
              <span className="font-bold">Service Center Info:</span> {serviceCall.serviceCenterName}
              {serviceCall.rmaNumber && <span className="ml-3 font-semibold">| RMA / Tracking No: {serviceCall.rmaNumber}</span>}
            </div>
          )}

          {showDevice && serviceCall.type === "onsite_visit" && serviceCall.onsiteAddress && (
            <div className="rounded-lg border border-black/30 p-1.5 text-[11px] text-black print:border-black">
              <span className="font-bold">Onsite Visit Location:</span> {serviceCall.onsiteAddress}
            </div>
          )}

          {/* Problem / Task Description */}
          {showIssue && (
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                Issue / Service Task
              </h3>
              <div className="rounded-lg border border-black/20 p-1.5 font-medium text-[11px] text-black print:border-black">
                {serviceCall.issueDescription}
              </div>
            </div>
          )}

          {/* Parts & Billing Section */}
          {showBilling && (
            <>
              {/* Parts Table */}
              {serviceCall.parts && serviceCall.parts.length > 0 && (
                <div>
                  <h3 className="text-[9px] font-bold uppercase tracking-wider text-black mb-0.5">
                    Parts & Consumables Used
                  </h3>
                  <table className="w-full text-[11px] border border-black rounded-lg overflow-hidden">
                    <thead className="border-b border-black font-bold uppercase bg-muted/30 text-black">
                      <tr>
                        <th className="px-2 py-0.5 text-left border-r border-black">Item / Part Name</th>
                        <th className="px-2 py-0.5 text-center border-r border-black">Qty</th>
                        <th className="px-2 py-0.5 text-right border-r border-black">Unit Price</th>
                        <th className="px-2 py-0.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {serviceCall.parts.map((p) => (
                        <tr key={p.id}>
                          <td className="px-2 py-0.5 border-r border-black">{p.name}</td>
                          <td className="px-2 py-0.5 text-center border-r border-black">{p.quantity}</td>
                          <td className="px-2 py-0.5 text-right border-r border-black">₹{p.unitPrice.toLocaleString("en-IN")}</td>
                          <td className="px-2 py-0.5 text-right font-medium">₹{p.totalPrice.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Charges Summary */}
              <div className="flex justify-end border-t border-black/20 pt-1 print:border-black">
                <div className="w-52 space-y-0.5 text-[11px] text-black">
                  <div className="flex justify-between text-black">
                    <span>Parts Total:</span>
                    <span>₹{serviceCall.partsTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>Service Charges:</span>
                    <span>₹{serviceCall.serviceCharges.toLocaleString("en-IN")}</span>
                  </div>
                  {Boolean(serviceCall.courierCharges && serviceCall.courierCharges > 0) && (
                    <div className="flex justify-between text-black font-semibold">
                      <span>Courier / Transport:</span>
                      <span>₹{serviceCall.courierCharges?.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {Boolean(serviceCall.discount && serviceCall.discount > 0) && (
                    <div className="flex justify-between text-black font-semibold">
                      <span>Discount:</span>
                      <span>-₹{serviceCall.discount?.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black pt-0.5 text-xs font-extrabold text-black">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{serviceCall.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Terms & Signature */}
          {showTerms && (
            <div className="border-t border-black/30 pt-1.5 grid grid-cols-2 gap-4 text-[10px] text-black print:border-black">
              <div>
                <p className="font-bold text-black mb-0.5 text-[10px]">Terms & Conditions (Zorba Declaration):</p>
                <ol className="list-decimal pl-3 space-y-0.5 text-[8.5px] text-black leading-tight">
                  <li>Goods once sold or serviced will not be taken back or exchanged.</li>
                  <li>For parcels sent to authorized service centers, customer bears all courier/transport charges and any charges quoted by the service center.</li>
                  <li>Overdue credits charged with compound interest @ 2% per month after 15 days of bill date.</li>
                  <li>No warranty for physical damage, broken seal, burning, or water exposure (पानी लगने/गीला होने पर वारंटी नहीं मिलती).</li>
                  <li>Zorba Infotech is not responsible for data loss or pirated software; backup is owner's risk.</li>
                  <li>Devices not claimed within 30 days of service completion may incur storage charges.</li>
                  <li>Subject to Neemuch jurisdiction only.</li>
                </ol>
              </div>
              <div className="flex flex-col justify-between items-end text-right">
                <div>
                  <p className="font-bold text-black text-[10px]">For ZORBA INFOTECH</p>
                </div>
                <div className="border-t border-black w-32 pt-0.5 text-center font-medium mt-3 text-[9px] text-black">
                  Authorized Signature
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
