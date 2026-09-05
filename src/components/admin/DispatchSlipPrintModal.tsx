import { useState, useEffect } from "react";
import {
  Printer,
  Truck,
  Box,
  FileText,
  AlertTriangle,
  MapPin,
  Building2,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ZorbaLogoIcon } from "@/components/common/ZorbaLogo";
import type { ServiceCall, ServiceCenter } from "@/lib/types";
import { getServiceCenters } from "@/lib/firestore";
import { formatPhoneForPrint } from "@/lib/utils";

// Vector Code 39 Barcode SVG Component for crisp single-page A4 printing
function BarcodeSvg({
  value,
  height = 24,
  className = "",
}: {
  value: string;
  height?: number;
  className?: string;
}) {
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
    "-": "010000101", " ": "011000100", "*": "010010100", ".": "110000100",
    "/": "010101000", "+": "010100010", "%": "000101010", "$": "010101000",
  };

  // Strip asterisks so human-readable text never has asterisks
  const cleanVal = (value || "DISPATCH")
    .toUpperCase()
    .replace(/[^A-Z0-9\-. /+$%]/g, "")
    .replace(/\*/g, "");
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
    <div className={`flex flex-col items-center shrink-0 ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ height: `${height}px`, width: `${totalWidth * 1.35}px` }}
        className="max-w-full text-black print:text-black"
        preserveAspectRatio="none"
      >
        {bars.map((b, idx) => {
          const x = currentX;
          currentX += b.width;
          if (!b.isBar) return null;
          return <rect key={idx} x={x} y="0" width={b.width} height={height} fill="black" />;
        })}
      </svg>
      <span className="font-sans text-[9.5px] font-bold tracking-widest text-black mt-0.5 tabular-nums">
        {cleanVal}
      </span>
    </div>
  );
}

/**
 * Format service center phone numbers cleanly, including handling landlines or legacy merged numbers.
 */
function formatServiceCenterPhone(phone?: string | null): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  // Legacy case where two 7-digit landlines were prefixed with 91 (e.g. 9140662614066262)
  if (digits.startsWith("91") && digits.length === 16) {
    return `0731-${digits.slice(2, 9)}, 0731-${digits.slice(9)}`;
  }
  return formatPhoneForPrint(raw);
}

export interface DispatchSlipPrintModalProps {
  serviceCall: ServiceCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceCenter?: ServiceCenter | null;
  serviceCenters?: ServiceCenter[];
  onSwitchToJobCard?: () => void;
}

export type PrintLayoutMode = "dual" | "challan" | "label";

export default function DispatchSlipPrintModal({
  serviceCall,
  open,
  onOpenChange,
  serviceCenter: passedServiceCenter,
  serviceCenters: passedServiceCenters,
  onSwitchToJobCard,
}: DispatchSlipPrintModalProps) {
  // Layout format: "dual" (Box Label + Challan on 1 page), "challan" (Full A4), "label" (Large Outer Box Label)
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>("dual");

  // Section Visibility Toggles
  const [showSender, setShowSender] = useState(true);
  const [showRecipient, setShowRecipient] = useState(true);
  const [showDevice, setShowDevice] = useState(true);
  const [showIssue, setShowIssue] = useState(true);
  const [showCustomerRef, setShowCustomerRef] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  // Quick Dispatch Customizations (Screen only adjustments before print)
  const [packageCount, setPackageCount] = useState("1 Box");
  const [packageWeight, setPackageWeight] = useState("");
  const [dispatchRemarks, setDispatchRemarks] = useState(
    "Return to service center for authorized warranty/repair inspection. Please handle with care."
  );

  // Resolve Service Center details if needed
  const [resolvedCenter, setResolvedCenter] = useState<ServiceCenter | null>(
    passedServiceCenter || null
  );

  useEffect(() => {
    if (passedServiceCenter) {
      setResolvedCenter(passedServiceCenter);
      return;
    }
    if (serviceCall?.serviceCenterId && passedServiceCenters && passedServiceCenters.length > 0) {
      const found = passedServiceCenters.find((sc) => sc.id === serviceCall.serviceCenterId);
      if (found) {
        setResolvedCenter(found);
        return;
      }
    }
    // Fetch if needed and open
    if (open && serviceCall?.serviceCenterId && !resolvedCenter) {
      getServiceCenters()
        .then((centers) => {
          const found = centers.find(
            (sc) =>
              sc.id === serviceCall.serviceCenterId ||
              sc.name.toLowerCase() === (serviceCall.serviceCenterName || "").toLowerCase()
          );
          if (found) setResolvedCenter(found);
        })
        .catch(() => {});
    }
  }, [open, serviceCall, passedServiceCenter, passedServiceCenters]);

  if (!serviceCall) return null;

  const handlePrint = () => {
    window.print();
  };

  // Resolved Center details
  const destinationCenterName =
    serviceCall.serviceCenterName || resolvedCenter?.name || "Authorized Service Center";
  const destinationAddress =
    serviceCall.serviceCenterAddress ||
    resolvedCenter?.addresses?.[0]?.address ||
    "Authorized Service Center Address";
  const destinationPhone = resolvedCenter?.phone || resolvedCenter?.whatsappPhone || "";
  const destinationEmail = resolvedCenter?.email || "";
  const primaryPOC = resolvedCenter?.pocs?.[0];

  const formattedDate = serviceCall.dateTime
    ? new Date(serviceCall.dateTime).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const formattedDestPhone = formatServiceCenterPhone(destinationPhone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-5">
        {/* Bulletproof Strict 1-Page A4 Print CSS: Eliminates 2nd page spillover */}
        <style>{`
          @media print {
            @page {
              size: portrait;
              margin: 4mm 6mm;
            }

            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              max-height: 100% !important;
              overflow: hidden !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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

            /* Make printable dispatch area and all its children visible with executive business typography */
            #printable-dispatch-slip-area,
            #printable-dispatch-slip-area * {
              visibility: visible !important;
              color: #000000 !important;
              border-color: #000000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            }

            #printable-dispatch-slip-area {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-height: 282mm !important;
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

            .print\\:hidden {
              display: none !important;
            }

            .print\\:border-black {
              border-color: #000000 !important;
            }

            .print\\:bg-white {
              background-color: #ffffff !important;
            }

            .print\\:bg-black {
              background-color: #000000 !important;
              color: #ffffff !important;
            }
          }
        `}</style>

        {/* Modal Header (Screen Only) */}
        <DialogHeader className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3.5 gap-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg text-slate-900 dark:text-white flex items-center gap-2">
                Service Center Dispatch & Parcel Shipping Label
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Print outer box shipping label and delivery challan with Zorba dispatch & service center destination addresses
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToJobCard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSwitchToJobCard}
                className="gap-1.5 text-xs font-semibold"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                <span>Switch to Job Card</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-600 text-white shadow-sm cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Print A4 Dispatch Sheet
            </Button>
          </div>
        </DialogHeader>

        {/* Selective Controls & Format Selectors (Screen Only) */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 print:hidden text-xs">
          {/* Format Selector Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Box className="h-4 w-4 text-blue-600" /> Print Format:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setLayoutMode("dual")}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    layoutMode === "dual"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Dual (Challan + Box Label)
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("challan")}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    layoutMode === "challan"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Full A4 Challan
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("label")}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    layoutMode === "label"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Outer Box Label Only
                </button>
              </div>
            </div>

            {/* Quick Package Inputs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 font-medium">Carton / Pkg:</label>
                <input
                  type="text"
                  value={packageCount}
                  onChange={(e) => setPackageCount(e.target.value)}
                  placeholder="1 Box"
                  className="w-20 px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-950 font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-slate-500 font-medium">Weight:</label>
                <input
                  type="text"
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(e.target.value)}
                  placeholder="e.g. 1.2 kg"
                  className="w-24 px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-950 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section Visibility Checkboxes */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showSender}
                onChange={(e) => setShowSender(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              From (Zorba Return Address)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showRecipient}
                onChange={(e) => setShowRecipient(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              To (Service Center Destination)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showDevice}
                onChange={(e) => setShowDevice(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Device & Serial Number
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showIssue}
                onChange={(e) => setShowIssue(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Fault / Issue Description
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomerRef}
                onChange={(e) => setShowCustomerRef(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Customer Reference
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Statutory Declaration
            </label>
          </div>
        </div>

        {/* Printable Single Page A4 Content Container with Executive Typography and Generous Padding */}
        <div id="printable-dispatch-slip-area" className="font-sans py-1 space-y-3 text-xs print:p-0">
          {/* ========================================================================= */}
          {/* TOP SECTION: SERVICE CENTER DISPATCH CHALLAN (Included in "dual" & "challan" modes) */}
          {/* ========================================================================= */}
          {(layoutMode === "dual" || layoutMode === "challan") && (
            <div className="space-y-2.5 border border-black rounded-xl p-3.5 bg-white print:border-black print:p-3">
              {/* Challan Header */}
              <div className="flex justify-between items-start border-b border-black pb-2">
                <div className="flex items-center gap-2.5">
                  <ZorbaLogoIcon className="h-8 w-8 shrink-0" isMonochrome={true} />
                  <div>
                    <h2 className="text-base font-black tracking-tight text-black leading-tight">
                      ZORBA INFOTECH — SERVICE DISPATCH CHALLAN
                    </h2>
                    <p className="text-[9.5px] font-medium text-black leading-tight mt-0.5">
                      Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.) | Phone: {formatPhoneForPrint("9993599730")}, {formatPhoneForPrint("9302199730")}
                    </p>
                    <p className="text-[8.5px] text-slate-800 leading-tight">
                      Email: zorbainfotech@gmail.com | Official Service Center Delivery Challan
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-black tabular-nums">Ticket #{serviceCall.ticketNo}</span>
                  <span className="text-[9px] font-semibold text-black mt-0.5">Date: {formattedDate}</span>
                </div>
              </div>

              {/* Service Center & Dispatch Logistics (Asymmetric 65% / 35%) */}
              <div className="flex gap-2.5 text-xs items-stretch">
                {/* To: Service Center (65% width) */}
                <div className="flex-[65] border-2 border-black rounded-lg p-2.5 bg-slate-50/10 print:bg-white flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-black block border-b border-black/30 pb-1 mb-1.5">
                      DESTINATION SERVICE CENTER (DELIVER TO):
                    </span>
                    <p className="font-black text-sm text-black leading-tight">{destinationCenterName}</p>
                    <p className="text-[11px] font-semibold text-black leading-relaxed mt-1">{destinationAddress}</p>
                    {primaryPOC && (
                      <div className="text-[10px] text-black mt-2 pt-1 border-t border-black/30 font-bold space-y-0.5">
                        <p>POC: {primaryPOC.name}</p>
                        <p className="tabular-nums">Phone: {formatPhoneForPrint(primaryPOC.phone)}</p>
                      </div>
                    )}
                    {formattedDestPhone && !primaryPOC && (
                      <p className="text-[10px] text-black mt-1.5 pt-1 border-t border-black/30 font-bold tabular-nums">
                        Phone: {formattedDestPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Logistics & Dispatch Reference (35% width) */}
                <div className="flex-[35] border border-black rounded-lg p-2.5 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-black block border-b border-black/30 pb-1 mb-1.5">
                      DISPATCH DETAILS
                    </span>
                    <div className="flex justify-between text-[10px] py-0.5">
                      <span className="text-black font-medium">Ticket No:</span>
                      <span className="font-bold text-black tabular-nums">{serviceCall.ticketNo}</span>
                    </div>
                    <div className="flex justify-between text-[10px] py-0.5">
                      <span className="text-black font-medium">Dispatch Date:</span>
                      <span className="font-bold text-black tabular-nums">{formattedDate}</span>
                    </div>
                    <div className="flex justify-between text-[10px] py-0.5">
                      <span className="text-black font-medium">Courier:</span>
                      <span className="font-bold text-black">{serviceCall.courierName || "Direct Handover"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] py-0.5">
                      <span className="text-black font-medium">Warranty:</span>
                      <span className="capitalize font-bold text-black">{serviceCall.warrantyStatus.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware / Device Description Table */}
              {showDevice && (
                <div>
                  <h3 className="text-[8.5px] font-bold uppercase tracking-wider text-black mb-1">
                    CONSIGNMENT ITEM & HARDWARE SPECIFICATIONS
                  </h3>
                  <table className="w-full text-xs border border-black rounded-lg overflow-hidden">
                    <thead className="border-b border-black font-bold uppercase bg-slate-100 text-black print:bg-transparent">
                      <tr>
                        <th className="px-3 py-1.5 text-left border-r border-black text-[9.5px]">Device Category</th>
                        <th className="px-3 py-1.5 text-left border-r border-black text-[9.5px]">Brand / Model</th>
                        <th className="px-3 py-1.5 text-left border-r border-black text-[9.5px]">Serial Number / IMEI</th>
                        <th className="px-3 py-1.5 text-center border-r border-black text-[9.5px]">Qty</th>
                        <th className="px-3 py-1.5 text-left text-[9.5px]">Warranty</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-1.5 font-bold border-r border-black">{serviceCall.deviceCategory}</td>
                        <td className="px-3 py-1.5 border-r border-black font-semibold">{serviceCall.modelNumber || "Standard Unit"}</td>
                        <td className="px-3 py-1.5 font-bold border-r border-black tabular-nums tracking-wide">{serviceCall.serialNumber || "N/A"}</td>
                        <td className="px-3 py-1.5 text-center font-black border-r border-black">{serviceCall.quantity}</td>
                        <td className="px-3 py-1.5 capitalize font-semibold">{serviceCall.warrantyStatus.replace(/_/g, " ")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Secondary Details: Customer Ref & Purchase Details (if enabled) */}
              {(showCustomerRef || serviceCall.dateOfPurchase || serviceCall.billNumber) && (
                <div className="grid grid-cols-2 gap-3 text-[10px] border border-black/40 rounded-lg p-2 bg-slate-50/20 print:bg-transparent">
                  {showCustomerRef && (
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-bold text-black">Customer Reference:</span>{" "}
                        <span className="font-semibold">{serviceCall.customerName || "Customer"}</span>
                      </div>
                      {serviceCall.customerPhone && (
                        <div className="tabular-nums">
                          <span className="font-bold text-black">Phone:</span> {formatPhoneForPrint(serviceCall.customerPhone)}
                        </div>
                      )}
                    </div>
                  )}
                  {(serviceCall.dateOfPurchase || serviceCall.billNumber) && (
                    <div className="text-right">
                      {serviceCall.dateOfPurchase && (
                        <span>Purchase Date: <strong className="tabular-nums">{serviceCall.dateOfPurchase}</strong> </span>
                      )}
                      {serviceCall.billNumber && (
                        <span>| Bill No: <strong className="tabular-nums">{serviceCall.billNumber}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Reported Fault / RMA Issue */}
              {showIssue && (
                <div className="border border-black rounded-lg p-2.5 text-xs">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-black block mb-1">
                    REPORTED ISSUE / FAULT DESCRIPTION (REASON FOR RETURN):
                  </span>
                  <p className="font-bold text-black leading-relaxed">
                    {serviceCall.issueDescription || "Diagnostic inspection and warranty service requested."}
                  </p>
                </div>
              )}

              {/* Special Dispatch Remarks */}
              {dispatchRemarks && (
                <div className="text-[9.5px] text-black italic leading-normal border border-black/30 rounded-lg p-1.5">
                  <strong>Special Instructions / Remarks:</strong> {dispatchRemarks}
                </div>
              )}

              {/* Statutory Declaration */}
              {showSignatures && (
                <div className="border-t border-black pt-2 flex justify-between items-start gap-4 text-[9.5px] text-black">
                  <div className="flex-1">
                    <p className="font-bold text-black text-[9px] uppercase">NON-COMMERCIAL DISPATCH DECLARATION:</p>
                    <p className="text-[8.5px] leading-relaxed text-black mt-0.5">
                      This consignment contains computer hardware / IT products being dispatched solely for warranty repair, testing, or servicing by the manufacturer / authorized service center. Not for sale. No commercial value involved. Subject to Neemuch Jurisdiction.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-black text-black text-[10px]">For ZORBA INFOTECH, NEEMUCH</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCISSOR CUT DIVIDER (Clean, spacious, non-overlapping) */}
          {/* ========================================================================= */}
          {layoutMode === "dual" && (
            <div className="my-3 py-1 flex items-center justify-between gap-3 select-none">
              <div className="flex-1 border-t-2 border-dashed border-black" />
              <div className="inline-flex items-center gap-2 px-3.5 py-1 border-2 border-dashed border-black rounded-lg bg-white print:bg-white text-black shrink-0">
                <Scissors className="h-3.5 w-3.5 shrink-0 text-black" />
                <span className="text-[10px] font-black uppercase tracking-wider text-black">
                  CUT ALONG DOTTED LINE — AFFIX BOTTOM SECTION TO PARCEL BOX
                </span>
                <Scissors className="h-3.5 w-3.5 shrink-0 text-black -scale-x-100" />
              </div>
              <div className="flex-1 border-t-2 border-dashed border-black" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: OUTER BOX SHIPPING LABEL (Included in "dual" & "label" modes) */}
          {/* ========================================================================= */}
          {(layoutMode === "dual" || layoutMode === "label") && (
            <div className="border-2 border-black rounded-xl p-3.5 bg-white space-y-2.5 print:border-black print:p-3">
              {/* Box Label Header with Tracking & Barcode */}
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div className="flex items-center gap-2.5">
                  <ZorbaLogoIcon className="h-7 w-7 shrink-0" isMonochrome={true} />
                  <div>
                    <span className="text-[13px] font-black uppercase tracking-wider text-black block leading-tight">
                      PARCEL DISPATCH / SHIPPING LABEL
                    </span>
                    <span className="text-[9px] font-bold text-black uppercase tracking-tight">
                      AUTHORIZED SERVICE CENTER CONSIGNMENT
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[8px] font-bold uppercase block text-black">DISPATCH DATE</span>
                    <span className="text-xs font-black text-black tabular-nums">{formattedDate}</span>
                  </div>
                  <BarcodeSvg value={serviceCall.ticketNo} height={26} />
                </div>
              </div>

              {/* ASYMMETRIC FROM & TO GRID: TO is 68% wide & bold so couriers NEVER confuse destination! */}
              <div className="flex gap-2.5 items-stretch">
                {/* DELIVER TO / DESTINATION BOX (Dominant 68% width, high-visibility black badge) */}
                {showRecipient && (
                  <div className="flex-[68] border-2 border-black rounded-lg p-3 bg-slate-50/20 print:bg-white flex flex-col justify-between min-h-[140px]">
                    <div>
                      <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2 bg-black text-white px-2 py-1 rounded -mx-1 -mt-1 print:bg-black print:text-white">
                        <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                          <MapPin className="h-3.5 w-3.5 inline text-white shrink-0" /> SHIP TO / DELIVER TO (DESTINATION):
                        </span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white text-black tracking-wide">
                          ★ PARCEL DESTINATION ★
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-black uppercase text-black leading-tight tracking-tight">
                          {destinationCenterName}
                        </h3>
                        <p className="text-xs sm:text-[12.5px] font-bold text-black leading-relaxed whitespace-pre-wrap mt-0.5">
                          {destinationAddress}
                        </p>
                        {primaryPOC && (
                          <div className="mt-2 pt-1.5 border-t border-black/30 text-xs text-black font-bold space-y-0.5">
                            <div>
                              <span>Attn: <strong>{primaryPOC.name}</strong></span>
                              {primaryPOC.designation && <span className="text-black/80 font-normal"> ({primaryPOC.designation})</span>}
                            </div>
                            <div className="font-bold tabular-nums text-black">
                              Phone: {formatPhoneForPrint(primaryPOC.phone)}
                            </div>
                          </div>
                        )}
                        {formattedDestPhone && !primaryPOC && (
                          <div className="mt-2 pt-1.5 border-t border-black/30 text-xs text-black font-bold tabular-nums">
                            Phone: {formattedDestPhone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-1 border-t border-black/30 flex justify-between items-center text-[9px] font-bold text-black uppercase">
                      <span>Delivery Destination: Service Center</span>
                      <span className="font-bold tabular-nums tracking-wide">TICKET #{serviceCall.ticketNo}</span>
                    </div>
                  </div>
                )}

                {/* DISPATCHED FROM / SENDER BOX (Compact 32% width, explicitly labeled as return address) */}
                {showSender && (
                  <div className="flex-[32] border border-black/80 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-black/40 pb-1 mb-1.5 text-[8.5px] text-black font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 inline text-black" /> FROM / SENDER:
                        </span>
                        <span className="text-[7.5px] font-black px-1 py-0.2 rounded border border-black/40 text-black">
                          RETURN ADDRESS
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-black uppercase text-black leading-tight">
                          ZORBA INFOTECH
                        </h4>
                        <p className="text-[9.5px] font-medium text-black leading-snug">
                          Shop No. 5 & 6, U-Shape Market,
                        </p>
                        <p className="text-[9.5px] font-bold text-black leading-snug">
                          Tagore Marg, Neemuch 458 441 (M.P.)
                        </p>
                        <p className="text-[9.5px] text-black mt-1 leading-tight font-bold tabular-nums">
                          Phone: {formatPhoneForPrint("9993599730")}
                        </p>
                        <p className="text-[8.5px] text-black leading-tight font-semibold tabular-nums">
                          Support: {formatPhoneForPrint("9302199730")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-1 border-t border-black/20 text-[7.5px] text-black/80 font-semibold">
                      <span>Note: If undelivered, return to Zorba Neemuch</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Parcel Logistics Bar (3 spacious columns) */}
              <div className="grid grid-cols-3 gap-3 border border-black rounded-lg p-2 text-xs text-black bg-slate-50/20 print:bg-transparent">
                <div>
                  <span className="text-[8px] uppercase block font-bold text-black">Courier / Transporter:</span>
                  <span className="font-black text-xs text-black">{serviceCall.courierName || "Direct Handover / By Hand"}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase block font-bold text-black">Consignment Item:</span>
                  <span className="font-black text-xs text-black">
                    {serviceCall.deviceCategory} ({serviceCall.quantity} Unit{serviceCall.quantity > 1 ? "s" : ""})
                  </span>
                </div>
                <div>
                  <span className="text-[8px] uppercase block font-bold text-black">Package Units:</span>
                  <span className="font-black text-xs text-black">
                    {packageCount} {packageWeight ? `(${packageWeight})` : ""}
                  </span>
                </div>
              </div>

              {/* Fragile & Sensitive IT Hardware Warning Banner */}
              <div className="border border-black rounded-md px-3 py-1.5 flex items-center justify-between bg-black text-white print:bg-black print:text-white">
                <span className="text-[9.5px] font-black uppercase tracking-wider flex items-center gap-2 text-white">
                  <AlertTriangle className="h-3.5 w-3.5 inline shrink-0 text-white" />
                  FRAGILE — HANDLE WITH CARE — SENSITIVE ELECTRONIC HARDWARE
                </span>
                <span className="text-[8.5px] font-bold uppercase text-white">
                  WARRANTY SERVICE CONSIGNMENT
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
