import { useState, useEffect, useMemo } from "react";
import {
  Printer,
  Truck,
  Box,
  FileText,
  AlertTriangle,
  MapPin,
  Building2,
  Scissors,
  ExternalLink,
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
import type { ServiceCall, ServiceCenter, ServiceCallProduct, ServicePart } from "@/lib/types";
import { getServiceCallProducts } from "@/lib/types";
import { getServiceCenters } from "@/lib/firestore";
import { formatPhoneForPrint, formatFullAddress } from "@/lib/utils";
import { printIsolatedElement, openStandalonePrintWindow } from "@/lib/printUtils";

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
  // Legacy case where two 7-digit landlines were stored concatenated with 91 (e.g. 9140662614066262)
  if (digits.startsWith("91") && digits.length === 16) {
    return `${digits.slice(2, 9)}, ${digits.slice(9)}`;
  }
  return formatPhoneForPrint(raw);
}

export interface DispatchSlipPrintModalProps {
  serviceCall?: ServiceCall | null;
  serviceCalls?: ServiceCall[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceCenter?: ServiceCenter | null;
  serviceCenters?: ServiceCenter[];
  onSwitchToJobCard?: () => void;
}

export type PrintLayoutMode = "dual" | "challan" | "label";

export default function DispatchSlipPrintModal({
  serviceCall,
  serviceCalls,
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
  const [showParts, setShowParts] = useState(true);
  const [showIssue, setShowIssue] = useState(true);
  const [showCustomerRef, setShowCustomerRef] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  // Quick Dispatch Customizations (Screen only adjustments before print)
  const [packageCount, setPackageCount] = useState("1 Box");
  const [packageWeight, setPackageWeight] = useState("");
  const [dispatchRemarks, setDispatchRemarks] = useState(
    "Return to service center for authorized warranty/repair inspection. Please handle with care."
  );

  // Consolidate calls: either serviceCalls array or single serviceCall
  const effectiveCalls = useMemo(() => {
    if (serviceCalls && serviceCalls.length > 0) return serviceCalls;
    if (serviceCall) return [serviceCall];
    return [];
  }, [serviceCall, serviceCalls]);

  const primaryCall = effectiveCalls[0] || null;

  // Aggregate all products across calls (supporting multiple products per call)
  const allProducts: Array<ServiceCallProduct & { ticketNo?: string }> = useMemo(() => {
    const list: Array<ServiceCallProduct & { ticketNo?: string }> = [];
    effectiveCalls.forEach((call, cIdx) => {
      const prods = getServiceCallProducts(call);
      prods.forEach((p, pIdx) => {
        list.push({
          ...p,
          id: `${call.id || cIdx}-${p.id || pIdx}`,
          ticketNo: call.ticketNo,
        });
      });
    });
    return list;
  }, [effectiveCalls]);

  const totalProductUnits = useMemo(() => {
    return allProducts.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
  }, [allProducts]);

  // Aggregate all spare parts across calls
  const allParts: Array<ServicePart & { ticketNo?: string }> = useMemo(() => {
    const list: Array<ServicePart & { ticketNo?: string }> = [];
    effectiveCalls.forEach((call, cIdx) => {
      (call.parts || []).forEach((part, partIdx) => {
        list.push({
          ...part,
          id: `${call.id || cIdx}-${part.id || partIdx}`,
          ticketNo: call.ticketNo,
        });
      });
    });
    return list;
  }, [effectiveCalls]);

  const totalPartsUnits = useMemo(() => {
    return allParts.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
  }, [allParts]);

  // Adaptive compact density: in dual mode with 2+ products or parts, automatically compact so it never exceeds single A4
  const [compactMode, setCompactMode] = useState<boolean | null>(null);
  const autoCompact = layoutMode === "dual" && (allProducts.length > 1 || allParts.length > 1 || (allProducts.length + allParts.length) > 2);
  const isCompact = compactMode !== null ? compactMode : autoCompact;

  // Resolve Service Center details if needed
  const [resolvedCenter, setResolvedCenter] = useState<ServiceCenter | null>(
    passedServiceCenter || null
  );

  useEffect(() => {
    if (passedServiceCenter) {
      setResolvedCenter(passedServiceCenter);
      return;
    }
    const centerId = primaryCall?.serviceCenterId;
    if (centerId && passedServiceCenters && passedServiceCenters.length > 0) {
      const found = passedServiceCenters.find((sc) => sc.id === centerId);
      if (found) {
        setResolvedCenter(found);
        return;
      }
    }
    // Fetch if needed and open
    if (open && centerId && !resolvedCenter) {
      getServiceCenters()
        .then((centers) => {
          const found = centers.find(
            (sc) =>
              sc.id === centerId ||
              sc.name.toLowerCase() === (primaryCall?.serviceCenterName || "").toLowerCase()
          );
          if (found) setResolvedCenter(found);
        })
        .catch(() => {});
    }
  }, [open, primaryCall, passedServiceCenter, passedServiceCenters]);

  // Selected Hub address
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  useEffect(() => {
    if (resolvedCenter?.addresses && resolvedCenter.addresses.length > 0) {
      const matched = resolvedCenter.addresses.find(
        (a) => a.address === primaryCall?.serviceCenterAddress
      );
      setSelectedAddressId(matched ? matched.id : resolvedCenter.addresses[0].id);
    }
  }, [resolvedCenter, primaryCall?.serviceCenterAddress]);

  if (!primaryCall) return null;

  const handlePrint = () => {
    printIsolatedElement("printable-dispatch-slip-area", `Dispatch Slip - ${primaryCall?.ticketNo || "Zorba"}`);
  };

  const handleOpenPrintWindow = () => {
    openStandalonePrintWindow("printable-dispatch-slip-area", `Dispatch Slip - ${primaryCall?.ticketNo || "Zorba"}`);
  };

  // Active address object
  const activeAddressObj =
    resolvedCenter?.addresses?.find((a) => a.id === selectedAddressId) ||
    resolvedCenter?.addresses?.[0];

  // Resolved Center details
  const destinationCenterName =
    primaryCall.serviceCenterName || resolvedCenter?.name || "Authorized Service Center";
  const destinationAddress = activeAddressObj
    ? formatFullAddress({
        lines: activeAddressObj.lines,
        city: activeAddressObj.city,
        state: activeAddressObj.state,
        pincode: activeAddressObj.pincode,
        fallbackAddress: activeAddressObj.address,
      })
    : formatFullAddress({
        fallbackAddress:
          primaryCall.serviceCenterAddress || "Authorized Service Center Address",
      });
  const destinationPhone = resolvedCenter?.phone || resolvedCenter?.whatsappPhone || "";
  const destinationEmail = resolvedCenter?.email || "";
  const primaryPOC = resolvedCenter?.pocs?.[0];

  const formattedDate = primaryCall.dateTime
    ? new Date(primaryCall.dateTime).toLocaleDateString("en-IN", {
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

  const ticketDisplay = effectiveCalls.map((c) => c.ticketNo).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-5">
        {/* Bulletproof Strict 1-Page A4 Print CSS: Fast, Never Hangs, Zero Background Overhead */}
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
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
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

            /* Completely hide modal overlay backdrop, action buttons, and non-printable elements */
            div[data-radix-dialog-overlay],
            div[data-radix-portal] > div[data-state="open"]:not([role="dialog"]),
            .fixed.inset-0,
            button,
            .print\\:hidden {
              display: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              visibility: hidden !important;
            }

            /* Strip Radix Dialog centering offsets so content flows naturally on page */
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

            #printable-dispatch-slip-area {
              display: block !important;
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              box-sizing: border-box !important;
            }

            .print-avoid-break {
              page-break-inside: avoid !important;
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
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenPrintWindow}
              className="gap-1.5 text-xs font-semibold cursor-pointer border-slate-300 dark:border-slate-700"
              title="Open in clean window without browser modal constraints"
            >
              <ExternalLink className="h-4 w-4 text-slate-500" />
              <span>Clean Print Window</span>
            </Button>
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
              {resolvedCenter?.addresses && resolvedCenter.addresses.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-slate-500 font-medium">Hub:</label>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="px-2 py-1 text-xs border rounded-md bg-white dark:bg-slate-950 font-medium cursor-pointer"
                  >
                    {resolvedCenter.addresses.map((a, i) => (
                      <option key={a.id || i} value={a.id}>
                        {a.city ? `${a.city} Hub` : `Location #${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
              Hardware / Products {allProducts.length > 0 ? `(${allProducts.length})` : ""}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showParts}
                onChange={(e) => setShowParts(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Spare Parts & Consumables {allParts.length > 0 ? `(${allParts.length})` : ""}
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
            <label className="flex items-center gap-1.5 cursor-pointer text-blue-700 dark:text-blue-400 font-bold">
              <input
                type="checkbox"
                checked={isCompact}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Single A4 Compact Fit {autoCompact ? "(Auto-fit)" : ""}
            </label>
          </div>
        </div>

        {/* Printable Single Page A4 Content Container with Adaptive Density and Zero Clipping */}
        <div
          id="printable-dispatch-slip-area"
          className={`font-sans ${isCompact ? "py-0.5 space-y-1.5" : "py-1 space-y-3"} text-xs print:p-0`}
        >
          {/* ========================================================================= */}
          {/* TOP SECTION: SERVICE CENTER DISPATCH CHALLAN (Included in "dual" & "challan" modes) */}
          {/* ========================================================================= */}
          {(layoutMode === "dual" || layoutMode === "challan") && (
            <div
              className={`print-avoid-break border border-black rounded-xl ${
                isCompact ? "p-2 space-y-1.5 print:p-2 print:space-y-1" : "p-3.5 space-y-2.5 print:p-3"
              } bg-white print:border-black`}
            >
              {/* Challan Header */}
              <div className={`flex justify-between items-start border-b border-black ${isCompact ? "pb-1" : "pb-2"}`}>
                <div className="flex items-center gap-2">
                  <ZorbaLogoIcon className={`${isCompact ? "h-6 w-6" : "h-8 w-8"} shrink-0`} isMonochrome={true} />
                  <div>
                    <h2 className={`${isCompact ? "text-[13px]" : "text-base"} font-black tracking-tight text-black leading-tight`}>
                      ZORBA INFOTECH — SERVICE DISPATCH CHALLAN
                    </h2>
                    <p className={`${isCompact ? "text-[8.5px]" : "text-[9.5px]"} font-medium text-black leading-tight mt-0.5`}>
                      Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458 441 (M.P.) | Phone: {formatPhoneForPrint("9993599730")}, {formatPhoneForPrint("9302199730")}
                    </p>
                    <p className={`${isCompact ? "text-[8px]" : "text-[8.5px]"} text-slate-800 leading-tight`}>
                      Email: zorbainfotech@gmail.com | Official Service Center Delivery Challan
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`${isCompact ? "text-[11px]" : "text-xs"} font-black text-black tabular-nums`}>
                    {effectiveCalls.length > 1 ? `Tickets: ${ticketDisplay}` : `Ticket #${primaryCall.ticketNo}`}
                  </span>
                  <span className={`${isCompact ? "text-[8.5px]" : "text-[9px]"} font-semibold text-black mt-0.5`}>Date: {formattedDate}</span>
                </div>
              </div>

              {/* Service Center & Dispatch Logistics (Asymmetric 65% / 35%) */}
              <div className={`flex ${isCompact ? "gap-1.5" : "gap-2.5"} text-xs items-stretch`}>
                {/* To: Service Center (65% width) */}
                <div className={`flex-[65] border-2 border-black rounded-lg ${isCompact ? "p-1.5" : "p-2.5"} bg-slate-50/10 print:bg-white flex flex-col justify-between`}>
                  <div>
                    <span className={`${isCompact ? "text-[8px] mb-1 pb-0.5" : "text-[8.5px] mb-1.5 pb-1"} font-black uppercase tracking-wider text-black block border-b border-black/30`}>
                      DESTINATION SERVICE CENTER (DELIVER TO):
                    </span>
                    <p className={`font-black ${isCompact ? "text-xs" : "text-sm"} text-black leading-tight`}>{destinationCenterName}</p>
                    <p className={`${isCompact ? "text-[9.5px] leading-snug mt-0.5" : "text-[11px] leading-relaxed mt-1"} font-semibold text-black whitespace-pre-line`}>{destinationAddress}</p>
                    {primaryPOC && (
                      <div className={`${isCompact ? "text-[9px] mt-1 pt-0.5" : "text-[10px] mt-2 pt-1"} text-black border-t border-black/30 font-bold space-y-0.5`}>
                        <p>POC: {primaryPOC.name}</p>
                        <p className="tabular-nums">Phone: {formatPhoneForPrint(primaryPOC.phone)}</p>
                      </div>
                    )}
                    {formattedDestPhone && !primaryPOC && (
                      <p className={`${isCompact ? "text-[9px] mt-1 pt-0.5" : "text-[10px] mt-1.5 pt-1"} text-black border-t border-black/30 font-bold tabular-nums`}>
                        Phone: {formattedDestPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Logistics & Dispatch Reference (35% width) */}
                <div className={`flex-[35] border border-black rounded-lg ${isCompact ? "p-1.5 space-y-0.5" : "p-2.5 space-y-1"} flex flex-col justify-between`}>
                  <div>
                    <span className={`${isCompact ? "text-[8px] mb-1 pb-0.5" : "text-[8.5px] mb-1.5 pb-1"} font-bold uppercase tracking-wider text-black block border-b border-black/30`}>
                      DISPATCH DETAILS
                    </span>
                    <div className={`flex justify-between ${isCompact ? "text-[9px] py-0" : "text-[10px] py-0.5"}`}>
                      <span className="text-black font-medium">Ticket No:</span>
                      <span className="font-bold text-black tabular-nums">{ticketDisplay}</span>
                    </div>
                    <div className={`flex justify-between ${isCompact ? "text-[9px] py-0" : "text-[10px] py-0.5"}`}>
                      <span className="text-black font-medium">Dispatch Date:</span>
                      <span className="font-bold text-black tabular-nums">{formattedDate}</span>
                    </div>
                    <div className={`flex justify-between ${isCompact ? "text-[9px] py-0" : "text-[10px] py-0.5"}`}>
                      <span className="text-black font-medium">Courier:</span>
                      <span className="font-bold text-black">{primaryCall.courierName || "Direct Handover"}</span>
                    </div>
                    <div className={`flex justify-between ${isCompact ? "text-[9px] py-0" : "text-[10px] py-0.5"}`}>
                      <span className="text-black font-medium">Warranty:</span>
                      <span className="capitalize font-bold text-black">
                        {allProducts.length > 1
                          ? (allProducts.every((p) => p.warrantyStatus === allProducts[0].warrantyStatus)
                              ? (allProducts[0].warrantyStatus || "not_applicable").replace(/_/g, " ")
                              : "Mixed Warranty")
                          : (primaryCall.warrantyStatus || "not_applicable").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware / Device Description Table (Supports Multiple Products) */}
              {showDevice && allProducts.length > 0 && (
                <div>
                  <div className={`flex justify-between items-center ${isCompact ? "mb-0.5" : "mb-1"}`}>
                    <h3 className={`${isCompact ? "text-[8px]" : "text-[8.5px]"} font-bold uppercase tracking-wider text-black`}>
                      CONSIGNMENT ITEM & HARDWARE SPECIFICATIONS ({allProducts.length} Item{allProducts.length > 1 ? "s" : ""}, {totalProductUnits} Unit{totalProductUnits > 1 ? "s" : ""})
                    </h3>
                  </div>
                  <table className="w-full text-xs border border-black rounded-lg overflow-hidden">
                    <thead className="border-b border-black font-bold uppercase bg-slate-100 text-black print:bg-transparent">
                      <tr>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9px]"} text-center border-r border-black w-8`}>#</th>
                        {effectiveCalls.length > 1 && (
                          <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9px]"} text-left border-r border-black w-24`}>Ticket #</th>
                        )}
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-left border-r border-black`}>Device Category</th>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-left border-r border-black`}>Brand / Model</th>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-left border-r border-black`}>Serial Number / IMEI</th>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-center border-r border-black w-12`}>Qty</th>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-left`}>Warranty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/40">
                      {allProducts.map((prod, idx) => (
                        <tr key={prod.id || idx}>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} text-center font-bold border-r border-black`}>{idx + 1}</td>
                          {effectiveCalls.length > 1 && (
                            <td className={`${isCompact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} border-r border-black font-bold tabular-nums`}>{prod.ticketNo}</td>
                          )}
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} font-bold border-r border-black`}>{prod.deviceCategory}</td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} border-r border-black font-semibold`}>{prod.modelNumber || "Standard Unit"}</td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} font-mono font-bold border-r border-black tabular-nums tracking-wide`}>{prod.serialNumber || "N/A"}</td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} text-center font-black border-r border-black`}>{prod.quantity || 1}</td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} capitalize font-semibold`}>{(prod.warrantyStatus || "not_applicable").replace(/_/g, " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                    {allProducts.length > 1 && (
                      <tfoot className="border-t-2 border-black font-bold bg-slate-50 print:bg-transparent">
                        <tr>
                          <td colSpan={effectiveCalls.length > 1 ? 5 : 4} className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9px]"} text-right uppercase border-r border-black`}>
                            Total Consignment Units:
                          </td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} text-center font-black border-r border-black`}>{totalProductUnits}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Spare Parts & Consumables Dispatched Table */}
              {showParts && allParts.length > 0 && (
                <div>
                  <div className={`flex justify-between items-center ${isCompact ? "mb-0.5" : "mb-1"}`}>
                    <h3 className={`${isCompact ? "text-[8px]" : "text-[8.5px]"} font-bold uppercase tracking-wider text-black flex items-center gap-1`}>
                      <Box className="h-3 w-3 inline text-black" />
                      SPARE PARTS & CONSUMABLES DISPATCHED ({allParts.length} Item{allParts.length > 1 ? "s" : ""}, {totalPartsUnits} Total Qty)
                    </h3>
                  </div>
                  <table className="w-full text-xs border border-black rounded-lg overflow-hidden">
                    <thead className="border-b border-black font-bold uppercase bg-slate-100 text-black print:bg-transparent">
                      <tr>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9px]"} text-center border-r border-black w-8`}>#</th>
                        {effectiveCalls.length > 1 && (
                          <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9px]"} text-left border-r border-black w-24`}>Ticket #</th>
                        )}
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-left border-r border-black`}>Spare Part / Item Name</th>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-center border-r border-black w-14`}>Qty</th>
                        <th className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"} text-left`}>Classification / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/40">
                      {allParts.map((part, idx) => (
                        <tr key={part.id || idx}>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} text-center font-bold border-r border-black`}>{idx + 1}</td>
                          {effectiveCalls.length > 1 && (
                            <td className={`${isCompact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"} border-r border-black font-bold tabular-nums`}>{part.ticketNo}</td>
                          )}
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} font-bold border-r border-black`}>{part.name}</td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} text-center font-black border-r border-black`}>{part.quantity}</td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"}`}>{part.category || "Replacement / Service Consumable"}</td>
                        </tr>
                      ))}
                    </tbody>
                    {allParts.length > 1 && (
                      <tfoot className="border-t-2 border-black font-bold bg-slate-50 print:bg-transparent">
                        <tr>
                          <td colSpan={effectiveCalls.length > 1 ? 3 : 2} className={`${isCompact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9px]"} text-right uppercase border-r border-black`}>
                            Total Spare Parts Qty:
                          </td>
                          <td className={`${isCompact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10.5px]"} text-center font-black border-r border-black`}>{totalPartsUnits}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Secondary Details: Customer Ref & Purchase Details (if enabled) */}
              {(showCustomerRef || primaryCall.dateOfPurchase || primaryCall.billNumber) && (
                <div className={`grid grid-cols-2 gap-2 ${isCompact ? "text-[9px] p-1" : "text-[10px] p-2"} border border-black/40 rounded-lg bg-slate-50/20 print:bg-transparent`}>
                  {showCustomerRef && (
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-bold text-black">Customer Reference:</span>{" "}
                        <span className="font-semibold">
                          {effectiveCalls.length > 1
                            ? Array.from(new Set(effectiveCalls.map((c) => c.customerName).filter(Boolean))).join(", ") || "Multiple Customers"
                            : primaryCall.customerName || "Customer"}
                        </span>
                      </div>
                    </div>
                  )}
                  {(primaryCall.dateOfPurchase || primaryCall.billNumber) && (
                    <div className="text-right">
                      {primaryCall.dateOfPurchase && (
                        <span>Purchase Date: <strong className="tabular-nums">{primaryCall.dateOfPurchase}</strong> </span>
                      )}
                      {primaryCall.billNumber && (
                        <span>| Bill No: <strong className="tabular-nums">{primaryCall.billNumber}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Reported Fault / RMA Issue */}
              {showIssue && (
                <div className={`border border-black rounded-lg ${isCompact ? "p-1.5 text-[10px]" : "p-2.5 text-xs"}`}>
                  <span className={`${isCompact ? "text-[8px] mb-0.5" : "text-[8.5px] mb-1"} font-bold uppercase tracking-wider text-black block`}>
                    REPORTED ISSUE / FAULT DESCRIPTION (REASON FOR RETURN):
                  </span>
                  <div className="font-bold text-black leading-snug space-y-0.5">
                    {effectiveCalls.length > 1 ? (
                      effectiveCalls.map((c) => (
                        <div key={c.id}>
                          <span className="font-mono text-slate-700">[{c.ticketNo}]:</span> {c.issueDescription || "Service inspection requested"}
                        </div>
                      ))
                    ) : (
                      <p>{primaryCall.issueDescription || "Diagnostic inspection and warranty service requested."}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Special Dispatch Remarks */}
              {dispatchRemarks && (
                <div className={`${isCompact ? "text-[8.5px] p-1" : "text-[9.5px] p-1.5"} text-black italic leading-tight border border-black/30 rounded-lg`}>
                  <strong>Special Instructions / Remarks:</strong> {dispatchRemarks}
                </div>
              )}

              {/* Statutory Declaration */}
              {showSignatures && (
                <div className={`border-t border-black ${isCompact ? "pt-1 text-[8px]" : "pt-2 text-[9.5px]"} flex justify-between items-start gap-3 text-black`}>
                  <div className="flex-1">
                    <p className={`font-bold text-black ${isCompact ? "text-[8px]" : "text-[9px]"} uppercase`}>NON-COMMERCIAL DISPATCH DECLARATION:</p>
                    <p className={`${isCompact ? "text-[7.5px]" : "text-[8.5px]"} leading-tight text-black mt-0.5`}>
                      This consignment contains computer hardware / IT products being dispatched solely for warranty repair, testing, or servicing by the manufacturer / authorized service center. Not for sale. No commercial value involved. Subject to Neemuch Jurisdiction.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-black text-black ${isCompact ? "text-[8.5px]" : "text-[10px]"}`}>For ZORBA INFOTECH, NEEMUCH</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCISSOR CUT DIVIDER (Clean, compact when needed) */}
          {/* ========================================================================= */}
          {layoutMode === "dual" && (
            <div className={`print-avoid-break ${isCompact ? "my-1.5 py-0.5" : "my-3 py-1"} flex items-center justify-between gap-2.5 select-none`}>
              <div className="flex-1 border-t-2 border-dashed border-black" />
              <div className={`inline-flex items-center gap-2 ${isCompact ? "px-2.5 py-0.5" : "px-3.5 py-1"} border-2 border-dashed border-black rounded-lg bg-white print:bg-white text-black shrink-0`}>
                <Scissors className={`${isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 text-black`} />
                <span className={`${isCompact ? "text-[8.5px]" : "text-[10px]"} font-black uppercase tracking-wider text-black`}>
                  CUT ALONG DOTTED LINE — AFFIX BOTTOM SECTION TO PARCEL BOX
                </span>
                <Scissors className={`${isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 text-black -scale-x-100`} />
              </div>
              <div className="flex-1 border-t-2 border-dashed border-black" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: OUTER BOX SHIPPING LABEL (Included in "dual" & "label" modes) */}
          {/* ========================================================================= */}
          {(layoutMode === "dual" || layoutMode === "label") && (
            <div
              className={`print-avoid-break border-2 border-black rounded-xl ${
                isCompact ? "p-2 space-y-1.5 print:p-2" : "p-3.5 space-y-2.5 print:p-3"
              } bg-white print:border-black`}
            >
              {/* Box Label Header with Tracking & Barcode */}
              <div className={`flex justify-between items-center border-b-2 border-black ${isCompact ? "pb-1" : "pb-2"}`}>
                <div className="flex items-center gap-2">
                  <ZorbaLogoIcon className={`${isCompact ? "h-6 w-6" : "h-7 w-7"} shrink-0`} isMonochrome={true} />
                  <div>
                    <span className={`${isCompact ? "text-xs" : "text-[13px]"} font-black uppercase tracking-wider text-black block leading-tight`}>
                      PARCEL DISPATCH / SHIPPING LABEL
                    </span>
                    <span className={`${isCompact ? "text-[8px]" : "text-[9px]"} font-bold text-black uppercase tracking-tight`}>
                      AUTHORIZED SERVICE CENTER CONSIGNMENT
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="text-[7.5px] font-bold uppercase block text-black">DISPATCH DATE</span>
                    <span className={`${isCompact ? "text-[11px]" : "text-xs"} font-black text-black tabular-nums`}>{formattedDate}</span>
                  </div>
                  <BarcodeSvg value={primaryCall.ticketNo} height={isCompact ? 20 : 26} />
                </div>
              </div>

              {/* ASYMMETRIC FROM & TO GRID */}
              <div className={`flex ${isCompact ? "gap-1.5" : "gap-2.5"} items-stretch`}>
                {/* DELIVER TO / DESTINATION BOX (Dominant 68% width) */}
                {showRecipient && (
                  <div className={`flex-[68] border-2 border-black rounded-lg ${isCompact ? "p-1.5 min-h-[95px]" : "p-3 min-h-[140px]"} bg-slate-50/20 print:bg-white flex flex-col justify-between`}>
                    <div>
                      <div className={`flex items-center justify-between border-b-2 border-black ${isCompact ? "pb-0.5 mb-1 px-1.5 py-0.5 text-[9.5px]" : "pb-1 mb-2 px-2 py-1 text-xs"} bg-black text-white rounded -mx-0.5 -mt-0.5 print:bg-black print:text-white`}>
                        <span className="font-black uppercase tracking-wider flex items-center gap-1 text-white">
                          <MapPin className="h-3 w-3 inline text-white shrink-0" /> SHIP TO / DELIVER TO (DESTINATION):
                        </span>
                        <span className={`${isCompact ? "text-[7.5px] px-1 py-0.2" : "text-[9px] px-2 py-0.5"} font-black uppercase rounded bg-white text-black tracking-wide`}>
                          ★ PARCEL DESTINATION ★
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h3 className={`${isCompact ? "text-xs sm:text-sm" : "text-base sm:text-lg"} font-black uppercase text-black leading-tight tracking-tight`}>
                          {destinationCenterName}
                        </h3>
                        <p className={`${isCompact ? "text-[9.5px] font-bold leading-snug" : "text-xs sm:text-[12.5px] font-bold leading-relaxed"} text-black whitespace-pre-wrap mt-0.5`}>
                          {destinationAddress}
                        </p>
                        {primaryPOC && (
                          <div className={`${isCompact ? "mt-1 pt-1 text-[9px]" : "mt-2 pt-1.5 text-xs"} border-t border-black/30 text-black font-bold space-y-0.2`}>
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
                          <div className={`${isCompact ? "mt-1 pt-1 text-[9px]" : "mt-2 pt-1.5 text-xs"} border-t border-black/30 text-black font-bold tabular-nums`}>
                            Phone: {formattedDestPhone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`mt-1 pt-0.5 border-t border-black/30 flex justify-between items-center ${isCompact ? "text-[8px]" : "text-[9px]"} font-bold text-black uppercase`}>
                      <span>Delivery Destination: Service Center</span>
                      <span className="font-bold tabular-nums tracking-wide">
                        {effectiveCalls.length > 1 ? `TICKETS: ${ticketDisplay}` : `TICKET #${primaryCall.ticketNo}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* DISPATCHED FROM / SENDER BOX (Compact 32% width) */}
                {showSender && (
                  <div className={`flex-[32] border border-black/80 rounded-lg ${isCompact ? "p-1.5" : "p-2.5"} bg-white flex flex-col justify-between`}>
                    <div>
                      <div className={`flex items-center justify-between border-b border-black/40 ${isCompact ? "pb-0.5 mb-1 text-[7.5px]" : "pb-1 mb-1.5 text-[8.5px]"} text-black font-bold uppercase`}>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5 inline text-black" /> FROM / SENDER:
                        </span>
                        <span className="text-[7px] font-black px-1 py-0.2 rounded border border-black/40 text-black">
                          RETURN
                        </span>
                      </div>

                      <div className="space-y-0.2">
                        <h4 className={`${isCompact ? "text-[10px]" : "text-[11px]"} font-black uppercase text-black leading-tight`}>
                          ZORBA INFOTECH
                        </h4>
                        <p className={`${isCompact ? "text-[8.5px]" : "text-[9.5px]"} font-medium text-black leading-tight`}>
                          Shop No. 5 & 6, U-Shape Market,
                        </p>
                        <p className={`${isCompact ? "text-[8.5px]" : "text-[9.5px]"} font-bold text-black leading-tight`}>
                          Tagore Marg, Neemuch 458 441 (M.P.)
                        </p>
                        <p className={`${isCompact ? "text-[8.5px] mt-0.5" : "text-[9.5px] mt-1"} text-black leading-tight font-bold tabular-nums`}>
                          Phone: {formatPhoneForPrint("9993599730")}
                        </p>
                        <p className={`${isCompact ? "text-[7.5px]" : "text-[8.5px]"} text-black leading-tight font-semibold tabular-nums`}>
                          Support: {formatPhoneForPrint("9302199730")}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-1 pt-0.5 border-t border-black/20 ${isCompact ? "text-[7px]" : "text-[7.5px]"} text-black/80 font-semibold`}>
                      <span>Note: Return to Zorba Neemuch</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Parcel Logistics Bar */}
              <div className={`grid grid-cols-3 gap-2 border border-black rounded-lg ${isCompact ? "p-1.5 text-[10px]" : "p-2 text-xs"} text-black bg-slate-50/20 print:bg-transparent`}>
                <div>
                  <span className={`${isCompact ? "text-[7.5px]" : "text-[8px]"} uppercase block font-bold text-black`}>Courier / Transporter:</span>
                  <span className={`font-black ${isCompact ? "text-[10.5px]" : "text-xs"} text-black`}>{primaryCall.courierName || "Direct Handover / By Hand"}</span>
                </div>
                <div>
                  <span className={`${isCompact ? "text-[7.5px]" : "text-[8px]"} uppercase block font-bold text-black`}>Consignment Item:</span>
                  <span className={`font-black ${isCompact ? "text-[10.5px]" : "text-xs"} text-black leading-tight block`}>
                    {allProducts.length === 1
                      ? `${allProducts[0].deviceCategory} (${totalProductUnits} Unit${totalProductUnits > 1 ? "s" : ""})`
                      : `${allProducts.length} Products (${totalProductUnits} Units)`}
                    {allParts.length > 0 ? ` + ${totalPartsUnits} Spare Part${totalPartsUnits > 1 ? "s" : ""}` : ""}
                  </span>
                </div>
                <div>
                  <span className={`${isCompact ? "text-[7.5px]" : "text-[8px]"} uppercase block font-bold text-black`}>Package Units:</span>
                  <span className={`font-black ${isCompact ? "text-[10.5px]" : "text-xs"} text-black`}>
                    {packageCount} {packageWeight ? `(${packageWeight})` : ""}
                  </span>
                </div>
              </div>

              {/* Fragile & Sensitive IT Hardware Warning Banner */}
              <div className={`border border-black rounded-md ${isCompact ? "px-2 py-1" : "px-3 py-1.5"} flex items-center justify-between bg-black text-white print:bg-black print:text-white`}>
                <span className={`${isCompact ? "text-[8.5px]" : "text-[9.5px]"} font-black uppercase tracking-wider flex items-center gap-1.5 text-white`}>
                  <AlertTriangle className="h-3 w-3 inline shrink-0 text-white" />
                  FRAGILE — HANDLE WITH CARE — SENSITIVE ELECTRONIC HARDWARE
                </span>
                <span className={`${isCompact ? "text-[7.5px]" : "text-[8.5px]"} font-bold uppercase text-white`}>
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
