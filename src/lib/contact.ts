// Central contact configuration.
//
// WHATSAPP_PRIMARY is the WhatsApp Business API number. General sales & product
// inquiries route here so conversations land in the Business API inbox where they
// can be managed/automated. Payments (per receiving entity) and Careers (HR queue)
// intentionally use their own numbers and do NOT use this constant.
export const WHATSAPP_PRIMARY = "919424899730";

// Builds a wa.me click-to-chat link with an optional prefilled message.
export const whatsappLink = (text?: string, phone: string = WHATSAPP_PRIMARY) =>
  `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
