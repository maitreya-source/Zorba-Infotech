import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

export interface WhatsAppApiConfig {
  endpoint?: string;
  accessToken?: string;
  appId?: string;
  appToken?: string;
  businessId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  enabled: boolean;
}

export function getWhatsAppApiConfig(): WhatsAppApiConfig {
  const endpoint = (import.meta.env.VITE_WHATSAPP_API_ENDPOINT || "").trim();
  const appId = (import.meta.env.VITE_META_APP_ID || import.meta.env.VITE_APP_ID || "").trim();
  const appToken = (import.meta.env.VITE_META_APP_TOKEN || import.meta.env.VITE_APP_TOKEN || "").trim();
  const businessId = (import.meta.env.VITE_META_BUSINESS_ID || import.meta.env.VITE_BUSINESS_ID || "").trim();
  let token = (import.meta.env.VITE_META_WHATSAPP_TOKEN || "").trim();
  const phoneId = (import.meta.env.VITE_META_PHONE_NUMBER_ID || import.meta.env.VITE_PHONE_NUMBER_ID || "").trim();
  const wabaId = (import.meta.env.VITE_META_WABA_ID || import.meta.env.VITE_WABA_ID || "").trim();

  // If direct token isn't provided but App ID & App Secret / Token are, compose the client/app token
  if (!token && appId && appToken) {
    token = `${appId}|${appToken}`;
  } else if (!token && appToken) {
    token = appToken;
  }

  // Enabled if backend endpoint, Firebase functions, or direct credentials are available
  return {
    endpoint,
    accessToken: token,
    appId,
    appToken,
    businessId,
    phoneNumberId: phoneId,
    wabaId,
    enabled: true,
  };
}

/**
 * Checks whether Meta WhatsApp API dispatch is configured (via backend endpoint or direct credentials)
 */
export function isWhatsAppApiConfigured(): boolean {
  const cfg = getWhatsAppApiConfig();
  return cfg.enabled;
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
  messageId?: string;
  error?: string;
}

export interface SendWhatsAppMessageParams {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
  templateLanguage?: string;
  headerImageUrl?: string;
}

/**
 * Sends a WhatsApp message via Firebase Cloud Function, backend proxy endpoint, or direct Meta API.
 */
export async function sendWhatsAppMessage({
  to,
  message,
  templateName,
  templateParams,
  templateLanguage,
  headerImageUrl,
}: SendWhatsAppMessageParams): Promise<SendWhatsAppResult> {
  const config = getWhatsAppApiConfig();
  const formattedPhone = formatPhoneForMetaApi(to);

  if (!formattedPhone) {
    throw new Error("Invalid phone number. Please provide a valid 10-digit mobile number.");
  }

  // 1. First Priority: Dispatch via Firebase Cloud Function
  try {
    const sendWhatsAppCallable = httpsCallable<SendWhatsAppMessageParams, { success: boolean; messageId: string }>(
      functions,
      "sendWhatsAppMessage"
    );
    const result = await sendWhatsAppCallable({
      to: formattedPhone,
      message: message.trim(),
      templateName,
      templateParams,
      templateLanguage,
      headerImageUrl,
    });
    if (result.data?.success) {
      return {
        success: true,
        messageId: result.data.messageId || "msg_sent",
      };
    }
  } catch (fnErr: any) {
    // If functions isn't deployed or returned not-found, proceed to secondary fallbacks
    const isFnNotFound = fnErr?.code === "not-found" || fnErr?.code === "unimplemented";
    if (!isFnNotFound && fnErr?.message && !config.endpoint && !config.accessToken) {
      return {
        success: false,
        error: fnErr.message,
      };
    }
    console.warn("Firebase Callable sendWhatsAppMessage not available, checking fallback channels:", fnErr?.message);
  }

  // 2. Second Priority: Dispatch via custom backend proxy endpoint if configured
  if (config.endpoint) {
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formattedPhone,
          message: message.trim(),
          templateName,
          templateParams,
          templateLanguage,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.success || data.messageId || data.id)) {
        return {
          success: true,
          messageId: data.messageId || data.id || "msg_sent",
        };
      }
      return {
        success: false,
        error: data.error || `WhatsApp proxy returned HTTP ${response.status}`,
      };
    } catch (endpointErr: any) {
      console.error("Backend WhatsApp proxy dispatch failed:", endpointErr);
      return {
        success: false,
        error: endpointErr?.message || "Failed to reach WhatsApp dispatch service",
      };
    }
  }

  // 3. Third Priority: Direct Meta Graph API fallback (development only)
  if (config.accessToken && config.phoneNumberId) {
    try {
      const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;

      let payload: any;
      if (templateName) {
        const templateComponents: any[] = [];
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

        const tplObj: any = {
          name: templateName,
          language: { code: templateLanguage || "en" },
        };
        if (templateComponents.length > 0) {
          tplObj.components = templateComponents;
        }

        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: tplObj,
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
          "Authorization": `Bearer ${config.accessToken}`,
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

        return {
          success: false,
          error: errorMsg,
        };
      }

      return {
        success: true,
        messageId: data?.messages?.[0]?.id || "msg_sent",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to deliver message via WhatsApp Cloud API",
      };
    }
  }

  return {
    success: false,
    error: "WhatsApp service not available. Deploy the sendWhatsAppMessage Firebase Function or configure a backend endpoint.",
  };
}

/**
 * Fetches message templates via Firebase Cloud Function or direct Meta WABA API
 */
export async function fetchMetaTemplates(): Promise<{
  success: boolean;
  templates?: any[];
  error?: string;
}> {
  // 1. Try Firebase Cloud Function first
  try {
    const fetchTemplatesCallable = httpsCallable<void, { success: boolean; templates: any[] }>(
      functions,
      "fetchMetaWhatsAppTemplates"
    );
    const result = await fetchTemplatesCallable();
    if (result.data?.success && Array.isArray(result.data.templates)) {
      return {
        success: true,
        templates: result.data.templates,
      };
    }
  } catch (fnErr: any) {
    const isFnNotFound = fnErr?.code === "not-found" || fnErr?.code === "unimplemented";
    if (!isFnNotFound && fnErr?.message) {
      console.warn("Firebase fetchMetaWhatsAppTemplates error:", fnErr.message);
    }
  }

  // 2. Direct Meta Graph API fallback
  const config = getWhatsAppApiConfig();
  if (config.accessToken && config.wabaId) {
    try {
      const url = `https://graph.facebook.com/v19.0/${config.wabaId}/message_templates?limit=100`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data?.error?.message || `Meta API Error (${response.status})`,
        };
      }

      return {
        success: true,
        templates: data?.data || [],
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to fetch templates from Meta",
      };
    }
  }

  return {
    success: false,
    error: "Templates unavailable. Deploy the fetchMetaWhatsAppTemplates Firebase Function or set META_WABA_ID.",
  };
}
