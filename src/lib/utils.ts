import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string (e.g. customer name) to Title Case.
 * Example: "maitreya mulchandani" -> "Maitreya Mulchandani"
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(?:^|\s|[-/(,])\S/g, (char) => char.toUpperCase());
}

/**
 * Normalizes Indian phone numbers for Firestore storage.
 * Always formats as 91 followed by 10 digits with no spaces, dashes, or pluses.
 * Examples:
 *   "9589199738" -> "919589199738"
 *   "+91 95891 99738" -> "919589199738"
 *   "09589199738" -> "919589199738"
 *   "919589199738" -> "919589199738"
 *   "+91-95891-99738" -> "919589199738"
 */
export function formatIndianPhoneNumber(phone: string): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  if (digits.startsWith("91")) {
    return digits;
  }
  return `91${digits}`;
}

/**
 * Helper to display formatted phone number in UI (+91 XXXXXXXXXX).
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "";
  const normalized = formatIndianPhoneNumber(phone);
  if (normalized.startsWith("91") && normalized.length === 12) {
    return `+91 ${normalized.slice(2)}`;
  }
  return phone;
}

/**
 * Generates search tokens (n-grams/prefixes) for indexing Firestore customer records.
 * Supports efficient server-side searching for 5,000+ customers.
 */
export function generateSearchTokens(fields: {
  name?: string;
  phone?: string;
  companyName?: string;
  email?: string;
  id?: string;
}): string[] {
  const tokens = new Set<string>();

  const processText = (text?: string) => {
    if (!text) return;
    const clean = text.toLowerCase().trim();
    if (!clean) return;

    // Word tokens
    const words = clean.split(/[\s,.\-_/()]+/);
    for (const word of words) {
      if (word.length < 2) continue;
      // Add prefixes from length 2 to 15
      for (let i = 2; i <= Math.min(word.length, 15); i++) {
        tokens.add(word.slice(0, i));
      }
    }
  };

  const processPhone = (phoneStr?: string) => {
    if (!phoneStr) return;
    const digits = phoneStr.replace(/\D/g, "");
    if (digits.length >= 4) {
      // Index last 10 digits prefixes and full digits prefixes
      const last10 = digits.slice(-10);
      for (let i = 3; i <= last10.length; i++) {
        tokens.add(last10.slice(0, i));
        tokens.add(last10.slice(-i));
      }
      for (let i = 4; i <= digits.length; i++) {
        tokens.add(digits.slice(0, i));
      }
    }
  };

  processText(fields.name);
  processText(fields.companyName);
  processText(fields.email);
  processPhone(fields.phone);
  if (fields.id) tokens.add(fields.id.toLowerCase());

  return Array.from(tokens);
}

/**
 * WhatsApp message generator with formatted status stages and terms & conditions.
 * Explicitly EXCLUDES internal-only fields (DOP, Bill Number, Internal Notes).
 */
export function generateWhatsAppMessage(options: {
  ticketNo: string;
  dateTime: string;
  customerName: string;
  customerPhone: string;
  deviceCategory: string;
  modelNumber?: string;
  issueDescription: string;
  status: string;
  grandTotal?: number;
  courierName?: string;
  courierDocketNumber?: string;
  stageTitle?: string;
}): string {
  const statusUpper = (options.status || "RECEIVED").replace(/_/g, " ").toUpperCase();
  
  let headerNotice = "SERVICE INTAKE CONFIRMATION";
  if (options.status === "sent_to_service_center") {
    headerNotice = "DISPATCHED TO SERVICE CENTER";
  } else if (options.status === "waiting_for_parts") {
    headerNotice = "STATUS UPDATE: AWAITING SPARE PARTS";
  } else if (options.status === "completed") {
    headerNotice = "SERVICE COMPLETED - READY FOR PICKUP";
  } else if (options.status === "delivered") {
    headerNotice = "SERVICE CALL DELIVERED";
  }

  let parcelDetails = "";
  if (options.courierName || options.courierDocketNumber) {
    parcelDetails = `\n📦 *Courier / Dispatch:* ${options.courierName || "Courier"} (Docket: ${options.courierDocketNumber || "N/A"})`;
  }

  const message =
    `*ZORBA INFOTECH - ${headerNotice}*\n\n` +
    `Dear *${options.customerName}*,\n` +
    `Your service request has been updated. Here are the ticket details:\n\n` +
    `🎫 *Ticket No:* ${options.ticketNo || "New Ticket"}\n` +
    `📅 *Date:* ${options.dateTime}\n` +
    `💻 *Device:* ${options.deviceCategory}${options.modelNumber ? ` - ${options.modelNumber}` : ""}\n` +
    `🔍 *Reported Issue:* ${options.issueDescription}\n` +
    `⚡ *Current Status:* ${statusUpper}` +
    parcelDetails +
    `\n💰 *Estimated Total:* ₹${(options.grandTotal || 0).toLocaleString("en-IN")}\n\n` +
    `*Terms & Conditions:*\n` +
    `1. *Collection Policy:* Please collect your device within 30 days of completion notification.\n` +
    `2. *Data Responsibility:* Zorba Infotech is not liable for data loss. Customers are advised to maintain prior backups.\n` +
    `3. *Logistics & Transit:* Devices forwarded to authorized OEM service centers are subject to carrier terms.\n` +
    `4. *Inspection Charges:* Minimum diagnostic charges apply if repair estimate is declined.\n\n` +
    `*Thank you for choosing Zorba Infotech!*\n` +
    `📞 Support Helpline: +91 95891 99738 | 🌐 www.zorbainfotech.in`;

  return message;
}

/**
 * WhatsApp follow-up message generator for Courier partners.
 */
export function generateCourierFollowUpMessage(options: {
  courierName: string;
  courierDocketNumber: string;
  ticketNo: string;
  customerName?: string;
  destination?: string;
  dateTime?: string;
}): string {
  return (
    `*ZORBA INFOTECH - COURIER SHIPMENT TRACKING INQUIRY*\n\n` +
    `Hello *${options.courierName}* Team,\n` +
    `We would like to check the real-time delivery status for our dispatched parcel:\n\n` +
    `📦 *Docket / AWB Number:* ${options.courierDocketNumber}\n` +
    `🎫 *Internal Ticket Ref:* ${options.ticketNo}\n` +
    (options.dateTime ? `📅 *Dispatch Date:* ${options.dateTime}\n` : "") +
    (options.destination ? `📍 *Destination / Consignee:* ${options.destination}\n` : "") +
    `\nPlease provide the current transit location and expected delivery timestamp.\n\n` +
    `Thank you,\n*Zorba Infotech Logistics Desk*\n📞 +91 95891 99738`
  );
}

/**
 * WhatsApp follow-up message generator for OEM Service Centers.
 */
export function generateServiceCenterFollowUpMessage(options: {
  serviceCenterName: string;
  rmaNumber?: string;
  ticketNo: string;
  deviceCategory: string;
  modelNumber?: string;
  serialNumber?: string;
  issueDescription: string;
  dateSent?: string;
}): string {
  return (
    `*ZORBA INFOTECH - SERVICE CENTER RMA / REPAIR STATUS INQUIRY*\n\n` +
    `Dear *${options.serviceCenterName}* Support Team,\n` +
    `We would like to request an update on the repair/replacement status for the following unit sent to your center:\n\n` +
    `🎫 *Our Job Card / Ticket:* ${options.ticketNo}\n` +
    (options.rmaNumber ? `🏷️ *Service Center RMA / Ref No:* ${options.rmaNumber}\n` : "") +
    (options.dateSent ? `📅 *Dispatched On:* ${options.dateSent}\n` : "") +
    `💻 *Device:* ${options.deviceCategory}${options.modelNumber ? ` - ${options.modelNumber}` : ""}\n` +
    (options.serialNumber ? `🔢 *Serial / IMEI:* ${options.serialNumber}\n` : "") +
    `🔍 *Reported Defect:* ${options.issueDescription}\n\n` +
    `Kindly let us know if the unit is diagnosed / under repair / replaced / ready for dispatch.\n\n` +
    `Thank you,\n*Zorba Infotech Service Desk*\n📞 +91 95891 99738`
  );
}

