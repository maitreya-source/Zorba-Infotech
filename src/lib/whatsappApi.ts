import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { fetchWithTimeout, formatFirebaseError } from "./firestore";
import { formatIndianPhoneNumber } from "./utils";

export interface WhatsAppApiConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  enabled: boolean;
  autoFallbackToWeb: boolean;
  verifiedBusinessName?: string;
  updatedAt?: number;
}

const DEFAULT_CONFIG: WhatsAppApiConfig = {
  accessToken: import.meta.env.VITE_META_WHATSAPP_TOKEN || "",
  phoneNumberId: import.meta.env.VITE_META_PHONE_NUMBER_ID || "",
  wabaId: import.meta.env.VITE_META_WABA_ID || "",
  enabled: true,
  autoFallbackToWeb: true,
  verifiedBusinessName: "Zorba Infotech",
};

/**
 * Retrieves the stored WhatsApp Cloud API configuration from Firestore
 * with fallback to local environment variables.
 */
export async function getWhatsAppApiConfig(): Promise<WhatsAppApiConfig> {
  try {
    const docRef = doc(db, "settings", "whatsapp_api");
    const snap = await fetchWithTimeout(getDoc(docRef)).catch(() => null);

    if (snap && snap.exists()) {
      const data = snap.data() as Partial<WhatsAppApiConfig>;
      return {
        accessToken: data.accessToken || DEFAULT_CONFIG.accessToken,
        phoneNumberId: data.phoneNumberId || DEFAULT_CONFIG.phoneNumberId,
        wabaId: data.wabaId || DEFAULT_CONFIG.wabaId,
        enabled: data.enabled !== undefined ? data.enabled : true,
        autoFallbackToWeb: data.autoFallbackToWeb !== undefined ? data.autoFallbackToWeb : true,
        verifiedBusinessName: data.verifiedBusinessName || DEFAULT_CONFIG.verifiedBusinessName,
        updatedAt: data.updatedAt,
      };
    }
  } catch (err) {
    console.warn("Could not read WhatsApp API settings from Firestore, using defaults:", err);
  }

  return DEFAULT_CONFIG;
}

/**
 * Persists the WhatsApp Cloud API configuration to Firestore settings.
 */
export async function saveWhatsAppApiConfig(config: Partial<WhatsAppApiConfig>): Promise<void> {
  try {
    const docRef = doc(db, "settings", "whatsapp_api");
    await setDoc(
      docRef,
      {
        ...config,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.error("Failed to save WhatsApp API config:", err);
    throw new Error(formatFirebaseError(err));
  }
}

/**
 * Formats phone number into Meta Graph API compliant E.164 without '+' or spaces.
 * e.g. "+91 98210 11223" -> "919821011223"
 */
export function formatPhoneForMetaApi(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export interface SendWhatsAppResult {
  success: boolean;
  mode: "cloud_api" | "whatsapp_web";
  messageId?: string;
  error?: string;
  fallbackToWeb?: boolean;
}

export interface SendWhatsAppMessageParams {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
  configOverride?: Partial<WhatsAppApiConfig>;
}

/**
 * Sends a WhatsApp message via Meta Cloud API.
 * If the API is unconfigured or encounters an error, returns fallback status.
 */
export async function sendWhatsAppMessage({
  to,
  message,
  templateName,
  templateParams,
  configOverride,
}: SendWhatsAppMessageParams): Promise<SendWhatsAppResult> {
  const config = configOverride
    ? { ...(await getWhatsAppApiConfig()), ...configOverride }
    : await getWhatsAppApiConfig();

  const formattedPhone = formatPhoneForMetaApi(to);
  if (!formattedPhone) {
    throw new Error("Invalid phone number. Please provide a valid 10-digit mobile number.");
  }

  // If Cloud API is disabled or credentials are missing
  if (!config.enabled || !config.accessToken || !config.phoneNumberId) {
    return {
      success: false,
      mode: "whatsapp_web",
      fallbackToWeb: true,
      error: "Meta WhatsApp Cloud API credentials are not yet configured.",
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;

    // Construct Payload (Template or Standard Text)
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
          body: message.trim(),
        },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `Meta API error (${response.status}): ${JSON.stringify(data)}`;

      console.error("Meta WhatsApp Cloud API returned error:", data);

      if (config.autoFallbackToWeb) {
        return {
          success: false,
          mode: "whatsapp_web",
          fallbackToWeb: true,
          error: errorMsg,
        };
      }

      throw new Error(errorMsg);
    }

    const messageId = data?.messages?.[0]?.id || "msg_sent";
    return {
      success: true,
      mode: "cloud_api",
      messageId,
    };
  } catch (err: any) {
    console.error("Error dispatching WhatsApp Cloud API message:", err);

    if (config.autoFallbackToWeb) {
      return {
        success: false,
        mode: "whatsapp_web",
        fallbackToWeb: true,
        error: err.message || "Failed to deliver via Cloud API",
      };
    }

    throw err;
  }
}

/**
 * Sends a test ping to verify token validity and phone number access
 */
export async function testWhatsAppApiConnection(
  testPhone: string,
  token: string,
  phoneNumberId: string
): Promise<{ success: boolean; message: string }> {
  if (!token || !phoneNumberId) {
    throw new Error("Please enter both the Meta Access Token and Phone Number ID.");
  }

  const formattedPhone = formatPhoneForMetaApi(testPhone);
  if (!formattedPhone) {
    throw new Error("Please enter a valid recipient phone number for the test.");
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: {
      preview_url: false,
      body: `🔔 *Zorba Infotech ERP — WhatsApp Cloud API Connected!*\n\nThis is a verified test ping confirming that your Meta WhatsApp Cloud API credentials are working seamlessly.\nTimestamp: ${new Date().toLocaleString("en-IN")}`,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorDetails = data?.error?.message || JSON.stringify(data);
    throw new Error(`Meta API Verification Failed: ${errorDetails}`);
  }

  return {
    success: true,
    message: "Test message delivered successfully! Your WhatsApp Cloud API is operational.",
  };
}
