import { useState, useMemo } from "react";
import { Mail, Send, Copy, Check, FileCode, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Quotation } from "@/lib/types";
import { formatIndianPhoneNumber } from "@/lib/utils";

interface QuotationEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
}

export default function QuotationEmailModal({
  open,
  onOpenChange,
  quotation,
}: QuotationEmailModalProps) {
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [tab, setTab] = useState<"preview" | "code" | "text">("preview");

  const customerEmail = quotation?.customerEmail || "";
  const subject = useMemo(() => {
    if (!quotation) return "";
    return `[QUOTATION #${quotation.quotationNo}] Price Estimate - Zorba Infotech`;
  }, [quotation]);

  // Build Branded HTML Email Template matching Service Calls header & real shop contact info
  const htmlContent = useMemo(() => {
    if (!quotation) return "";

    const itemsRows = quotation.items
      .map((it, idx) => {
        const unit = it.estimatedPrice || 0;
        const total = it.totalPrice || unit * (it.quantity || 1);
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 10px; font-size: 12px; color: #64748b; text-align: center; vertical-align: top;">${idx + 1}</td>
            <td style="padding: 12px 10px; font-size: 13px; color: #0f172a; vertical-align: top;">
              <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">${it.productName || "Product"}</div>
              <div style="margin-top: 3px; font-size: 11px;">
                ${it.category ? `<span style="display: inline-block; background-color: #f3e8ff; color: #7e22ce; padding: 2px 7px; border-radius: 4px; font-weight: 700; margin-right: 6px;">${it.category}</span>` : ""}
                ${it.modelNumber ? `<span style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 4px; font-family: monospace; font-weight: 600;">Model: ${it.modelNumber}</span>` : ""}
              </div>
              ${it.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">${it.description}</div>` : ""}
            </td>
            <td style="padding: 12px 10px; font-size: 12px; color: #0f172a; text-align: center; font-weight: 700; vertical-align: top;">${it.quantity || 1}</td>
            <td style="padding: 12px 10px; font-size: 12px; color: #0f172a; text-align: right; font-family: monospace; vertical-align: top;">₹${unit.toLocaleString("en-IN")}</td>
            <td style="padding: 12px 10px; font-size: 13px; color: #1e40af; text-align: right; font-weight: 800; font-family: monospace; vertical-align: top;">₹${total.toLocaleString("en-IN")}</td>
          </tr>
        `;
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Estimate Quotation #${quotation.quotationNo} - Zorba Infotech</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 640px; margin: 24px auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 6px 16px rgba(0,0,0,0.06);">
    <!-- Dark Navy Branding Header (Identical to Service Calls) -->
    <div style="background-color: #0f172a; padding: 26px 32px; text-align: center; border-bottom: 3px solid #3b82f6;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">ZORBA INFOTECH</h1>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Authorized Service Hub &amp; Hardware Solutions</p>
    </div>

    <!-- Notification Banner -->
    <div style="background: #eff6ff; border-bottom: 1px solid #dbeafe; padding: 14px 32px; text-align: center;">
      <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 4px 14px; border-radius: 20px; text-transform: uppercase;">
        PRICE ESTIMATE QUOTATION
      </span>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px 32px;">
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${quotation.customerName || "Valued Customer"}</strong>,
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        Thank you for contacting Zorba Infotech. Please find below the estimated pricing and configuration summary for your requested products:
      </p>

      <!-- Quotation Meta Bar -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <span style="color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; display: block;">Quotation Reference #</span>
              <span style="font-family: monospace; font-weight: 800; color: #1e40af; font-size: 14px;">#${quotation.quotationNo}</span>
              ${quotation.templateName ? `<div style="font-size: 11px; color: #7e22ce; font-weight: 600; margin-top: 2px;">Package: ${quotation.templateName}</div>` : ""}
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right;">
              <span style="color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; display: block;">Date of Issuance</span>
              <span style="color: #1e293b; font-weight: 700; font-size: 13px;">${quotation.date || new Date().toISOString().split("T")[0]}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Customer Details Card -->
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Prepared Exclusively For:</div>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${quotation.customerName || "Customer"}</div>
        ${quotation.customerPhone ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;"><strong>Phone:</strong> ${formatIndianPhoneNumber(quotation.customerPhone)}</div>` : ""}
        ${quotation.customerEmail ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;"><strong>Email:</strong> ${quotation.customerEmail}</div>` : ""}
        ${quotation.customerAddress ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;"><strong>Address:</strong> ${quotation.customerAddress}</div>` : ""}
      </div>

      <!-- Items Table -->
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700;">
              <th style="padding: 10px 8px; text-align: center; width: 32px;">#</th>
              <th style="padding: 10px 8px; text-align: left;">Product &amp; Specifications</th>
              <th style="padding: 10px 8px; text-align: center; width: 44px;">Qty</th>
              <th style="padding: 10px 8px; text-align: right; width: 90px;">Est. Unit</th>
              <th style="padding: 10px 8px; text-align: right; width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <!-- Financial Totals Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; font-weight: 500; padding: 4px 0;">Items Subtotal:</td>
            <td style="text-align: right; font-weight: 700; font-family: monospace; color: #0f172a; padding: 4px 0;">₹${quotation.subtotal.toLocaleString("en-IN")}</td>
          </tr>
          ${(quotation.discount || 0) > 0 ? `
          <tr>
            <td style="color: #059669; font-weight: 600; padding: 4px 0;">Special Discount:</td>
            <td style="text-align: right; font-weight: 700; font-family: monospace; color: #059669; padding: 4px 0;">-₹${(quotation.discount || 0).toLocaleString("en-IN")}</td>
          </tr>
          ` : ""}
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding-top: 10px; font-size: 15px; font-weight: 800; color: #0f172a;">Estimated Grand Total:</td>
            <td style="padding-top: 10px; text-align: right; font-size: 18px; font-weight: 900; color: #1e40af; font-family: monospace;">₹${quotation.grandTotal.toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>

      <!-- Terms & Disclaimer Notice -->
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #d97706; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; margin-bottom: 4px;">Terms &amp; Estimate Notice:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.6; white-space: pre-line;">${quotation.termsAndConditions || `1. All prices mentioned above are estimated approximate prices based on current market rates and are subject to change at the time of actual purchase/order confirmation based on product availability.\n2. This is not an invoice. This is only a quotation and should not be treated as a tax invoice.\n3. Final tax invoice and warranty terms will be provided upon confirmation and fulfillment of order.`}</div>
      </div>

      <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
        Please feel free to reply to this email or call our team to confirm your order or customize this configuration.
      </p>
    </div>

    <!-- Official Footer matching static Contact page -->
    <div style="background-color: #f8fafc; padding: 22px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a; font-size: 12px;">ZORBA INFOTECH &bull; IT Solutions &amp; Service Hub</p>
      <p style="margin: 0 0 6px 0; color: #475569;">Shop No. 5 &amp; 6, U-Shape Market, Tagore Marg, Neemuch, Madhya Pradesh - 458441, India</p>
      <p style="margin: 0 0 4px 0; color: #1e293b;">
        <strong>Main:</strong> +91 99935 99730 &bull; <strong>Support:</strong> +91 93021 99730 &bull; <strong>Sales:</strong> +91 94248 99730 &bull; <strong>Accounts:</strong> +91 91796 99730
      </p>
      <p style="margin: 0; color: #64748b;">
        Email: <a href="mailto:zorbainfotech@gmail.com" style="color: #2563eb; text-decoration: none;">zorbainfotech@gmail.com</a> / <a href="mailto:zorba99730@gmail.com" style="color: #2563eb; text-decoration: none;">zorba99730@gmail.com</a> &bull; GSTIN: 23AATPM9267A1ZH &bull; <a href="https://www.zorbainfotech.in" style="color: #2563eb; text-decoration: none;">www.zorbainfotech.in</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }, [quotation]);

  // Plain Text Version
  const textContent = useMemo(() => {
    if (!quotation) return "";
    const itemsText = quotation.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.productName}${it.category ? ` [${it.category}]` : ""}${it.modelNumber ? ` (Model: ${it.modelNumber})` : ""} - Qty: ${it.quantity} @ ~₹${it.estimatedPrice} = ₹${(it.totalPrice || it.estimatedPrice * it.quantity).toLocaleString("en-IN")}`
      )
      .join("\n");

    return `Dear ${quotation.customerName || "Customer"},

Thank you for contacting Zorba Infotech. Please find below the estimated quotation for your requested items:

========================================
ZORBA INFOTECH - PRICE ESTIMATE QUOTATION
========================================
Quotation Ref: #${quotation.quotationNo}
Date of Issuance: ${quotation.date || new Date().toISOString().split("T")[0]}
Customer: ${quotation.customerName || "Valued Customer"}
Phone: ${quotation.customerPhone ? formatIndianPhoneNumber(quotation.customerPhone) : "N/A"}

----------------------------------------
ESTIMATED PRODUCT ITEMS:
----------------------------------------
${itemsText}

----------------------------------------
FINANCIAL SUMMARY:
----------------------------------------
Items Subtotal: ₹${quotation.subtotal.toLocaleString("en-IN")}
${(quotation.discount || 0) > 0 ? `Special Discount: -₹${(quotation.discount || 0).toLocaleString("en-IN")}\n` : ""}Estimated Grand Total: ₹${quotation.grandTotal.toLocaleString("en-IN")}

----------------------------------------
TERMS & CONDITIONS:
----------------------------------------
${quotation.termsAndConditions || `1. All prices mentioned above are estimated approximate prices based on current market rates and are subject to change at the time of actual purchase/order confirmation based on product availability.\n2. This is not an invoice. This is only a quotation and should not be treated as a tax invoice.\n3. Final tax invoice and warranty terms will be provided upon confirmation and fulfillment of order.`}

Thank you for choosing Zorba Infotech!

Zorba Infotech & Service Center
Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch (M.P.) - 458441
Main: +91 99935 99730 | Support: +91 93021 99730 | Sales: +91 94248 99730
Email: zorbainfotech@gmail.com / zorba99730@gmail.com
Web: www.zorbainfotech.in
`;
  }, [quotation]);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopiedHtml(true);
      toast.success("HTML Email code copied to clipboard!");
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      toast.error("Failed to copy HTML code");
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      toast.success("Plain text email copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const handleOpenMailClient = () => {
    if (!quotation) return;
    const to = encodeURIComponent(customerEmail || "");
    const subj = encodeURIComponent(subject);
    const body = encodeURIComponent(textContent);
    window.open(`mailto:${to}?subject=${subj}&body=${body}`, "_blank");
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 text-xs">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Send Quotation Email</span>
                  <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono font-bold border-blue-200">
                    #{quotation.quotationNo}
                  </Badge>
                </DialogTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Branded HTML quotation sheet with Zorba Infotech header, terms & verified contacts
                </p>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tab === "preview"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>Live Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("code")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tab === "code"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileCode className="h-3 w-3" />
                <span>HTML Code</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("text")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  tab === "text"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>Plain Text</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Email Metadata Bar (Read-only customer email) */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Recipient Email (Non-Editable)
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              {customerEmail || <span className="text-slate-400 font-normal italic">No customer email on record</span>}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Subject Line
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {subject}
            </div>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-slate-950/80">
          {tab === "preview" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[420px]">
              <iframe
                title="Quotation Email HTML Preview"
                srcDoc={htmlContent}
                className="w-full h-[450px] border-0"
              />
            </div>
          )}

          {tab === "code" && (
            <div className="relative">
              <textarea
                readOnly
                value={htmlContent}
                className="w-full h-[420px] p-4 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-hidden"
              />
            </div>
          )}

          {tab === "text" && (
            <div className="relative">
              <textarea
                readOnly
                value={textContent}
                className="w-full h-[420px] p-4 font-mono text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-hidden leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyHtml}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs"
            >
              {copiedHtml ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedHtml ? "HTML Copied!" : "Copy HTML Code"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs"
            >
              {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedText ? "Text Copied!" : "Copy Plain Text"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-xl"
            >
              Close
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenMailClient}
              className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Send via Email Client</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
