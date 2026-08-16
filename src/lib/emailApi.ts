/**
 * Zorba Infotech Email Dispatch & Template Engine
 * Supports direct API dispatch, webhook delivery, and mailto fallback
 */

import type { ServiceCall } from "./types";
import { toTitleCase } from "./utils";
import { sendDirectGmailMessage } from "./googleAuthService";

export interface EmailApiConfig {
  endpoint: string;
  apiKey?: string;
  senderEmail: string;
  senderName: string;
  enabled: boolean;
}

export function getEmailApiConfig(): EmailApiConfig {
  const endpoint = (import.meta.env.VITE_EMAIL_API_ENDPOINT || "").trim();
  const apiKey = (import.meta.env.VITE_EMAIL_API_KEY || import.meta.env.VITE_RESEND_API_KEY || "").trim();
  const senderEmail = (import.meta.env.VITE_EMAIL_SENDER_ADDRESS || "service@zorbainfotech.com").trim();
  const senderName = (import.meta.env.VITE_EMAIL_SENDER_NAME || "Zorba Infotech Service Center").trim();

  return {
    endpoint,
    apiKey,
    senderEmail,
    senderName,
    enabled: Boolean(endpoint || apiKey),
  };
}

export function isEmailApiConfigured(): boolean {
  const cfg = getEmailApiConfig();
  return cfg.enabled;
}

export type EmailTemplateType =
  | "service_intake"
  | "status_update"
  | "estimate_notice"
  | "service_completed"
  | "device_delivered"
  | "freeform";

export interface EmailTemplateOption {
  id: EmailTemplateType;
  label: string;
  subjectPrefix: string;
  noticeHeader: string;
  defaultStatusLabel: string;
}

export const EMAIL_TEMPLATES: EmailTemplateOption[] = [
  {
    id: "service_intake",
    label: "📥 Service Intake Confirmation",
    subjectPrefix: "Service Intake Confirmation",
    noticeHeader: "SERVICE INTAKE CONFIRMATION",
    defaultStatusLabel: "RECEIVED AT SERVICE DESK",
  },
  {
    id: "status_update",
    label: "⚙️ Service Work In-Progress Update",
    subjectPrefix: "Service Status Update",
    noticeHeader: "SERVICE WORK IN PROGRESS",
    defaultStatusLabel: "IN PROGRESS / UNDER DIAGNOSIS",
  },
  {
    id: "estimate_notice",
    label: "🔍 Diagnosis & Estimate Notice",
    subjectPrefix: "Diagnosis & Repair Estimate",
    noticeHeader: "DIAGNOSIS & ESTIMATE NOTICE",
    defaultStatusLabel: "ESTIMATE PENDING CUSTOMER APPROVAL",
  },
  {
    id: "service_completed",
    label: "✅ Service Completed & Ready for Pickup",
    subjectPrefix: "Service Completed - Ready for Pickup",
    noticeHeader: "SERVICE COMPLETED - READY FOR PICKUP",
    defaultStatusLabel: "COMPLETED & TESTED OK",
  },
  {
    id: "device_delivered",
    label: "📦 Device Delivered & Handover Receipt",
    subjectPrefix: "Device Delivered - Service Summary",
    noticeHeader: "DEVICE DELIVERED TO CUSTOMER",
    defaultStatusLabel: "DELIVERED / HANDED OVER",
  },
  {
    id: "freeform",
    label: "💬 Custom Freeform Email",
    subjectPrefix: "Service Inquiry",
    noticeHeader: "SERVICE CENTER UPDATE",
    defaultStatusLabel: "COMMUNICATION NOTICE",
  },
];

export interface GenerateEmailContentParams {
  templateType: EmailTemplateType;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  ticketNo: string;
  dateTime?: string;
  deviceCategory?: string;
  modelNumber?: string;
  serialNumber?: string;
  issueDescription?: string;
  status?: string;
  grandTotal?: number;
  remarks?: string;
  customBody?: string;
}

export function buildEmailSubject(params: GenerateEmailContentParams): string {
  const tpl = EMAIL_TEMPLATES.find((t) => t.id === params.templateType) || EMAIL_TEMPLATES[0];
  const ticket = params.ticketNo || "SC-SERVICE";
  const device = params.deviceCategory ? ` | ${params.deviceCategory}` : "";
  return `[${ticket}] ${tpl.subjectPrefix}${device} - Zorba Infotech`;
}

export function buildEmailHtml(params: GenerateEmailContentParams): string {
  const tpl = EMAIL_TEMPLATES.find((t) => t.id === params.templateType) || EMAIL_TEMPLATES[0];
  const customer = toTitleCase(params.customerName || "Valued Customer");
  const ticket = params.ticketNo || "SC-INTAKE";
  const date = params.dateTime || new Date().toISOString().split("T")[0];
  const device = params.deviceCategory ? `${params.deviceCategory}${params.modelNumber ? ` (${params.modelNumber})` : ""}` : "Hardware Unit";
  const serial = params.serialNumber ? params.serialNumber : "N/A";
  const issue = params.issueDescription || "General service & diagnosis";
  const status = (params.status || tpl.defaultStatusLabel).replace(/_/g, " ").toUpperCase();
  const total = params.grandTotal !== undefined ? `₹${params.grandTotal.toLocaleString("en-IN")}` : "Under Diagnosis / TBD";

  if (params.templateType === "freeform" && params.customBody) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Zorba Infotech Service Notice</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background-color: #0f172a; padding: 24px 32px; text-align: center; border-bottom: 3px solid #3b82f6;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">ZORBA INFOTECH</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Enterprise IT Solutions & Hardware Service Hub</p>
          </div>
          <!-- Body Content -->
          <div style="padding: 32px;">
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">Dear <strong>${customer}</strong>,</p>
            <div style="font-size: 13px; line-height: 1.7; color: #334155; white-space: pre-wrap; margin: 20px 0; background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0;">${params.customBody}</div>
            <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 0;">If you have any questions, feel free to reply to this email or contact our support team at <strong>+91 95891 99738</strong>.</p>
          </div>
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
            <p style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a;">Zorba Infotech Service Center</p>
            <p style="margin: 0 0 4px 0;">Scheme No 74-C, Vijay Nagar, Indore, Madhya Pradesh - 452010</p>
            <p style="margin: 0;">Phone: +91 95891 99738 / +91 98260 12345 &bull; Email: support@zorbainfotech.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${tpl.subjectPrefix} - Zorba Infotech</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <div style="max-width: 620px; margin: 24px auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 6px 16px rgba(0,0,0,0.06);">
        <!-- Dark Navy Branding Header -->
        <div style="background-color: #0f172a; padding: 26px 32px; text-align: center; border-bottom: 3px solid #3b82f6;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">ZORBA INFOTECH</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Authorized Service Hub & Hardware Solutions</p>
        </div>

        <!-- Notification Banner -->
        <div style="background: #eff6ff; border-bottom: 1px solid #dbeafe; padding: 14px 32px; text-align: center;">
          <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">
            ${tpl.noticeHeader}
          </span>
        </div>

        <!-- Main Content -->
        <div style="padding: 28px 32px;">
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            Dear <strong>${customer}</strong>,
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            Here is the official service update regarding your job card with Zorba Infotech:
          </p>

          <!-- Service Call Ticket Summary Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; width: 38%; background-color: #f1f5f9;">Ticket / Job Card #</td>
                  <td style="padding: 10px 14px; font-weight: 800; font-family: monospace; color: #0f172a; font-size: 13px;">${ticket}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; background-color: #f1f5f9;">Date & Time</td>
                  <td style="padding: 10px 14px; color: #1e293b;">${date}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; background-color: #f1f5f9;">Device & Model</td>
                  <td style="padding: 10px 14px; font-weight: 600; color: #0f172a;">${device}</td>
                </tr>
                ${params.serialNumber ? `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; background-color: #f1f5f9;">Serial Number</td>
                  <td style="padding: 10px 14px; font-family: monospace; color: #334155;">${serial}</td>
                </tr>
                ` : ""}
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; background-color: #f1f5f9;">Reported Fault / Scope</td>
                  <td style="padding: 10px 14px; color: #334155;">${issue}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; background-color: #f1f5f9;">Current Status</td>
                  <td style="padding: 10px 14px; font-weight: 800; color: #2563eb;">${status}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-weight: 700; color: #64748b; background-color: #f1f5f9;">Estimated / Grand Total</td>
                  <td style="padding: 10px 14px; font-weight: 800; font-family: monospace; color: #0f172a; font-size: 13px;">${total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${params.remarks ? `
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 12px; color: #92400e;">
            <strong>Technician Notes:</strong> ${params.remarks}
          </div>
          ` : ""}

          <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
            Please retain your ticket number <strong>${ticket}</strong> for all future reference. Feel free to contact our service helpline if you require any further assistance.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a;">Zorba Infotech &bull; Service & Support Center</p>
          <p style="margin: 0 0 4px 0;">Scheme No 74-C, Vijay Nagar, Indore, Madhya Pradesh - 452010</p>
          <p style="margin: 0;">Helpline: +91 95891 99738 / +91 98260 12345 &bull; Email: support@zorbainfotech.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildEmailText(params: GenerateEmailContentParams): string {
  const tpl = EMAIL_TEMPLATES.find((t) => t.id === params.templateType) || EMAIL_TEMPLATES[0];
  const customer = toTitleCase(params.customerName || "Valued Customer");
  const ticket = params.ticketNo || "SC-INTAKE";
  const date = params.dateTime || new Date().toISOString().split("T")[0];
  const device = params.deviceCategory ? `${params.deviceCategory}${params.modelNumber ? ` (${params.modelNumber})` : ""}` : "Hardware Unit";
  const serial = params.serialNumber ? params.serialNumber : "N/A";
  const issue = params.issueDescription || "General service & diagnosis";
  const status = (params.status || tpl.defaultStatusLabel).replace(/_/g, " ").toUpperCase();
  const total = params.grandTotal !== undefined ? `₹${params.grandTotal.toLocaleString("en-IN")}` : "Under Diagnosis";

  if (params.templateType === "freeform" && params.customBody) {
    return `Dear ${customer},\n\n${params.customBody}\n\nWarm regards,\nZorba Infotech Service Center\nPhone: +91 95891 99738\nEmail: support@zorbainfotech.com`;
  }

  return `========================================
ZORBA INFOTECH - ${tpl.noticeHeader}
========================================

Dear ${customer},

Here is the update regarding your service request:

- Job Card / Ticket #: ${ticket}
- Date: ${date}
- Device: ${device}
- Serial #: ${serial}
- Reported Fault: ${issue}
- Current Status: ${status}
- Grand Total: ${total}

${params.remarks ? `Remarks: ${params.remarks}\n\n` : ""}Thank you for choosing Zorba Infotech!

Zorba Infotech Service Center
Scheme No 74-C, Vijay Nagar, Indore (M.P.)
Support: +91 95891 99738 / +91 98260 12345
Email: support@zorbainfotech.com
`;
}

export function generateMailtoLink(params: {
  to: string;
  subject: string;
  body: string;
}): string {
  const to = encodeURIComponent(params.to.trim());
  const subject = encodeURIComponent(params.subject.trim());
  const body = encodeURIComponent(params.body.trim());
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  usedFallback?: boolean;
}

export async function sendCustomerEmail(params: {
  to: string;
  customerName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  ticketNo?: string;
}): Promise<SendEmailResult> {
  const config = getEmailApiConfig();

  if (!params.to || !params.to.includes("@")) {
    throw new Error("Invalid customer email address. Please provide a valid email.");
  }

  // 1. Direct Gmail API dispatch using the signed-in Gmail account & 3-month session
  try {
    const result = await sendDirectGmailMessage({
      to: params.to,
      subject: params.subject,
      html: params.htmlContent,
      text: params.textContent,
      fromName: config.senderName || "Zorba Infotech Service Center",
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (gmailErr: any) {
    console.warn("Direct Gmail API dispatch encountered error, checking fallback:", gmailErr);

    // 2. If custom HTTP endpoint is configured, try as secondary fallback
    if (config.enabled && config.endpoint) {
      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            to: params.to,
            from: `${config.senderName} <${config.senderEmail}>`,
            subject: params.subject,
            html: params.htmlContent,
            text: params.textContent,
            customerName: params.customerName,
            ticketNo: params.ticketNo,
          }),
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          return { success: true, messageId: data.id || data.messageId || "delivered" };
        }
      } catch (endpointErr) {
        console.error("Secondary endpoint dispatch failed:", endpointErr);
      }
    }

    // Re-throw the explicit Gmail error so user is informed
    throw new Error(gmailErr?.message || "Failed to dispatch email via Gmail API.");
  }
}
