import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// Super admin email whitelist matching firestore.rules
const SUPER_ADMIN_EMAILS = [
  "maitreya.mul@gmail.com",
  "manishm9730@gmail.com",
  "zorbainfotech@gmail.com",
  "zorbasquad@gmail.com",
  "maitreyam@google.com",
];

/**
 * Validates that the function caller is authenticated and is an active Administrator
 */
async function verifyAdminCaller(request: CallableRequest): Promise<{ email: string; uid: string }> {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required. Caller must be signed in."
    );
  }

  const email = request.auth.token.email.toLowerCase().trim();
  const uid = request.auth.uid;

  // 1. Check if super admin
  if (SUPER_ADMIN_EMAILS.includes(email)) {
    return { email, uid };
  }

  // 2. Check if registered admin in Firestore /admins/ collection
  try {
    const adminDoc = await db.collection("admins").doc(email).get();
    if (adminDoc.exists && adminDoc.data()?.active !== false) {
      return { email, uid };
    }
  } catch (err) {
    console.error("Error verifying admin status in Firestore:", err);
  }

  throw new HttpsError(
    "permission-denied",
    `Access denied. ${email} is not authorized as an Administrator.`
  );
}

/**
 * Formats phone number into Meta Graph API compliant E.164 without '+' or spaces.
 */
function formatPhoneForMeta(rawPhone: string): string {
  const digits = (rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

// ==========================================
// WhatsApp Cloud API Dispatcher (v2)
// ==========================================

export interface SendWhatsAppRequest {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
  templateLanguage?: string;
  headerImageUrl?: string;
}

export const sendWhatsAppMessage = onCall(
  {
    region: "asia-south1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<SendWhatsAppRequest>) => {
    // 1. Authorize caller
    const caller = await verifyAdminCaller(request);

    const { to, message, templateName, templateParams, templateLanguage, headerImageUrl } = request.data || {};
    const formattedPhone = formatPhoneForMeta(to);

    if (!formattedPhone) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid phone number. Please provide a valid 10-digit mobile number."
      );
    }

    // 2. Retrieve secure server configuration from functions/.env
    const token = (process.env.META_WHATSAPP_TOKEN || "").trim();
    const phoneId = (process.env.META_PHONE_NUMBER_ID || "").trim();

    if (!token || !phoneId) {
      console.error("Meta WhatsApp Cloud API credentials missing on server.");
      throw new HttpsError(
        "failed-precondition",
        "Server configuration missing: META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID must be set in Firebase Functions environment variables."
      );
    }

    // 3. Construct Meta Cloud API Payload
    let payload: any;
    if (templateName) {
      const templateComponents: any[] = [];

      // Include header image if specified or for templates that require image header like '11'
      if (headerImageUrl || templateName === "11") {
        templateComponents.push({
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: headerImageUrl || "https://zorbainfotech.in/zorba-logo.png",
              },
            },
          ],
        });
      }

      if (templateParams && templateParams.length > 0) {
        templateComponents.push({
          type: "body",
          parameters: templateParams.map((param) => ({
            type: "text",
            text: param,
          })),
        });
      }

      const templateObj: any = {
        name: templateName,
        language: { code: templateLanguage || "en" },
      };

      if (templateComponents.length > 0) {
        templateObj.components = templateComponents;
      }

      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: templateObj,
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: (message || "").trim(),
        },
      };
    }

    // 4. Dispatch server-to-server request
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Meta WhatsApp API error response:", responseData);
        const errMsg =
          responseData?.error?.message ||
          responseData?.error?.error_user_msg ||
          `Meta API Error HTTP ${response.status}`;
        throw new HttpsError("internal", errMsg);
      }

      console.log(`WhatsApp message dispatched successfully to ${formattedPhone} by ${caller.email}`);
      const messageId = responseData?.messages?.[0]?.id || "msg_sent";

      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      console.error("Error calling Meta WhatsApp API:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err.message || "Failed to dispatch WhatsApp message.");
    }
  }
);

// ==========================================
// Fetch Meta WhatsApp Templates (v2)
// ==========================================

export const fetchMetaWhatsAppTemplates = onCall(
  {
    region: "asia-south1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request: CallableRequest) => {
    // 1. Authorize caller
    await verifyAdminCaller(request);

    // 2. Retrieve secure server configuration from functions/.env
    const token = (process.env.META_WHATSAPP_TOKEN || "").trim();
    const wabaId = (process.env.META_WABA_ID || "").trim();

    if (!token || !wabaId) {
      throw new HttpsError(
        "failed-precondition",
        "Server configuration missing: META_WHATSAPP_TOKEN and META_WABA_ID must be set in Firebase Functions."
      );
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new HttpsError(
          "internal",
          responseData?.error?.message || `Meta API Error HTTP ${response.status}`
        );
      }

      return {
        success: true,
        templates: responseData?.data || [],
      };
    } catch (err: any) {
      console.error("Error fetching Meta templates:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err.message || "Failed to fetch templates.");
    }
  }
);

/**
 * Scheduled Cloud Function: Runs daily at 02:00 AM IST (Asia/Kolkata)
 * Automatically purges soft-deleted tickets that have been in the Trash for more than 90 days.
 */
export const autoPurgeTrashCron = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    memory: "256MiB",
  },
  async () => {
    const RETENTION_DAYS = 90;
    const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    console.log(`[Trash Auto-Purge] Running purge for items deleted before ${new Date(cutoffTime).toISOString()}`);

    try {
      const snap = await db
        .collectionGroup("service_calls")
        .where("isDeleted", "==", true)
        .where("deletedAt", "<=", cutoffTime)
        .limit(500)
        .get();

      if (snap.empty) {
        console.log("[Trash Auto-Purge] No expired trash records found.");
        return;
      }

      const batch = db.batch();
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`[Trash Auto-Purge] Successfully purged ${snap.size} expired records.`);
    } catch (err) {
      console.error("[Trash Auto-Purge] Error executing purge:", err);
      throw err;
    }
  }
);
