import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

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
async function verifyAdminCaller(context: functions.https.CallableContext): Promise<{ email: string; uid: string }> {
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required. Caller must be signed in."
    );
  }

  const email = context.auth.token.email.toLowerCase().trim();
  const uid = context.auth.uid;

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

  throw new functions.https.HttpsError(
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
// 1. WhatsApp Cloud API Dispatcher
// ==========================================

export interface SendWhatsAppRequest {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
}

export const sendWhatsAppMessage = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(async (data: SendWhatsAppRequest, context) => {
    // 1. Authorize caller
    const caller = await verifyAdminCaller(context);

    const { to, message, templateName, templateParams } = data;
    const formattedPhone = formatPhoneForMeta(to);

    if (!formattedPhone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid phone number. Please provide a valid 10-digit mobile number."
      );
    }

    // 2. Retrieve secure server configuration
    const token = (process.env.META_WHATSAPP_TOKEN || functions.config().meta?.whatsapp_token || "").trim();
    const phoneId = (process.env.META_PHONE_NUMBER_ID || functions.config().meta?.phone_number_id || "").trim();

    if (!token || !phoneId) {
      console.error("Meta WhatsApp Cloud API credentials missing on server.");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Server configuration missing: META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID must be set in Firebase Functions configuration."
      );
    }

    // 3. Construct Meta Cloud API Payload
    let payload: any;
    if (templateName && templateParams && templateParams.length > 0) {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: templateParams.map((param) => ({
                type: "text",
                text: param,
              })),
            },
          ],
        },
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
        throw new functions.https.HttpsError("internal", errMsg);
      }

      console.log(`WhatsApp message dispatched successfully to ${formattedPhone} by ${caller.email}`);
      const messageId = responseData?.messages?.[0]?.id || "msg_sent";

      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      console.error("Error calling Meta WhatsApp API:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", err.message || "Failed to dispatch WhatsApp message.");
    }
  });

// ==========================================
// 2. Fetch Meta WhatsApp Templates
// ==========================================

export const fetchMetaWhatsAppTemplates = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(async (_, context) => {
    // 1. Authorize caller
    await verifyAdminCaller(context);

    // 2. Retrieve secure server configuration
    const token = (process.env.META_WHATSAPP_TOKEN || functions.config().meta?.whatsapp_token || "").trim();
    const wabaId = (process.env.META_WABA_ID || functions.config().meta?.waba_id || "").trim();

    if (!token || !wabaId) {
      throw new functions.https.HttpsError(
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
        throw new functions.https.HttpsError(
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
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", err.message || "Failed to fetch templates.");
    }
  });


