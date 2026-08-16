/**
 * Meta WhatsApp Cloud API Service
 * Powered strictly by environment variables (.env)
 * Direct Meta API Delivery & Template Sync Engine
 */

import type { WhatsAppTemplateDoc } from "./types";

export interface WhatsAppApiConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  enabled: boolean;
}

export function getWhatsAppApiConfig(): WhatsAppApiConfig {
  const token = (import.meta.env.VITE_META_WHATSAPP_TOKEN || "").trim();
  const phoneId = (import.meta.env.VITE_META_PHONE_NUMBER_ID || "").trim();
  const wabaId = (import.meta.env.VITE_META_WABA_ID || "").trim();

  return {
    accessToken: token,
    phoneNumberId: phoneId,
    wabaId,
    enabled: Boolean(token && phoneId),
  };
}

/**
 * Checks whether Meta WhatsApp Cloud API credentials are present in env vars
 */
export function isWhatsAppApiConfigured(): boolean {
  const cfg = getWhatsAppApiConfig();
  return Boolean(cfg.accessToken && cfg.phoneNumberId);
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
}

/**
 * Sends a WhatsApp message directly via Meta Cloud API using environment variables.
 */
export async function sendWhatsAppMessage({
  to,
  message,
  templateName,
  templateParams,
}: SendWhatsAppMessageParams): Promise<SendWhatsAppResult> {
  const config = getWhatsAppApiConfig();
  const formattedPhone = formatPhoneForMetaApi(to);

  if (!formattedPhone) {
    throw new Error("Invalid phone number. Please provide a valid 10-digit mobile number.");
  }

  if (!config.enabled || !config.accessToken || !config.phoneNumberId) {
    throw new Error(
      "Meta WhatsApp Cloud API credentials not configured. Please add VITE_META_WHATSAPP_TOKEN and VITE_META_PHONE_NUMBER_ID to your .env file."
    );
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

      console.error("Meta WhatsApp Cloud API returned error:", data);

      return {
        success: false,
        error: errorMsg,
      };
    }

    const messageId = data?.messages?.[0]?.id || "msg_sent";
    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    console.error("Error dispatching WhatsApp Cloud API message:", err);
    return {
      success: false,
      error: err.message || "Failed to deliver message via WhatsApp Cloud API",
    };
  }
}

/**
 * Fetches message templates directly from Meta WhatsApp Business Account (WABA)
 */
export async function fetchMetaTemplates(): Promise<{
  success: boolean;
  templates?: any[];
  error?: string;
}> {
  const config = getWhatsAppApiConfig();

  if (!config.accessToken || !config.wabaId) {
    return {
      success: false,
      error: "Meta WhatsApp Token (VITE_META_WHATSAPP_TOKEN) and WABA ID (VITE_META_WABA_ID) must be configured in .env",
    };
  }

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
