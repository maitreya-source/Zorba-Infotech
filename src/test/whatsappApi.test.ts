import { describe, it, expect } from "vitest";
import {
  formatPhoneForMetaApi,
  getWhatsAppApiConfig,
  isWhatsAppApiConfigured,
  sendWhatsAppMessage,
} from "@/lib/whatsappApi";

describe("WhatsApp API & Meta Integration", () => {
  it("formats Indian phone numbers correctly for Meta Graph API E.164 without leading plus", () => {
    expect(formatPhoneForMetaApi("+91 95891 99730")).toBe("919589199730");
    expect(formatPhoneForMetaApi("9589199730")).toBe("919589199730");
    expect(formatPhoneForMetaApi("+919589199730")).toBe("919589199730");
    expect(formatPhoneForMetaApi("919589199730")).toBe("919589199730");
    expect(formatPhoneForMetaApi("+91 98210 11223")).toBe("919821011223");
  });

  it("resolves Meta Cloud API credentials from environment variables", () => {
    const config = getWhatsAppApiConfig();
    expect(config.enabled).toBe(true);
    expect(config.appId).toBe("987270487103449");
    expect(config.appToken).toBe("b41cdec6d5231b80636be92ce1032bc9");
    expect(config.businessId).toBe("133073620892193");
    expect(config.wabaId).toBe("2282245665324330");
    expect(config.phoneNumberId).toBe("27903338926023164");
    expect(config.accessToken).toContain("987270487103449|b41cdec6d5231b80636be92ce1032bc9");
    expect(isWhatsAppApiConfigured()).toBe(true);
  });

  it("throws a descriptive error when sending to an invalid phone number", async () => {
    await expect(
      sendWhatsAppMessage({
        to: "",
        message: "Test message",
      })
    ).rejects.toThrow("Invalid phone number");
  });
});
