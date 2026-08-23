import { describe, it, expect } from "vitest";
import {
  toTitleCase,
  formatModelNumber,
  formatIndianPhoneNumber,
  formatPhoneForDisplay,
  generateSearchTokens,
  generateWhatsAppMessage,
  generateCourierPickupRequestMessage,
  generateCourierDeliveryInquiryMessage,
  generateServiceCenterFollowUpMessage,
  sanitizeExternalUrl,
} from "@/lib/utils";
import { getFinancialYear } from "@/lib/firestore";
import type { Product, ServicePart, QuotationItem } from "@/lib/types";

describe("Zorba Infotech Integration & Business Logic Suite", () => {
  // ==========================================
  // 1. Indian Financial Year Hierarchy Partitioning
  // ==========================================
  describe("Financial Year & Subcollection Partitioning", () => {
    it("correctly calculates FY for dates in Q2-Q4 (April - December)", () => {
      const aug2026 = new Date("2026-08-23T12:00:00Z");
      const meta = getFinancialYear(aug2026);
      expect(meta.fyId).toBe("FY2627");
      expect(meta.label).toBe("FY 2026-27");
      expect(meta.startYear).toBe(2026);
      expect(meta.endYear).toBe(2027);
      expect(meta.monthKey).toBe("2026-08");
      expect(meta.monthName).toBe("August 2026");
      expect(meta.startDate).toBe("2026-04-01");
      expect(meta.endDate).toBe("2027-03-31");
    });

    it("correctly calculates FY for dates in Q1 (January - March)", () => {
      const jan2026 = new Date("2026-01-15T10:00:00Z");
      const meta = getFinancialYear(jan2026);
      expect(meta.fyId).toBe("FY2526");
      expect(meta.label).toBe("FY 2025-26");
      expect(meta.startYear).toBe(2025);
      expect(meta.endYear).toBe(2026);
      expect(meta.monthKey).toBe("2026-01");
      expect(meta.monthName).toBe("January 2026");
    });

    it("handles boundary date: March 31st (end of FY) vs April 1st (start of new FY)", () => {
      const mar31 = new Date("2026-03-31T23:59:59Z");
      const apr1 = new Date("2026-04-01T00:00:00Z");

      const metaMar = getFinancialYear(mar31);
      const metaApr = getFinancialYear(apr1);

      expect(metaMar.fyId).toBe("FY2526");
      expect(metaApr.fyId).toBe("FY2627");
    });
  });

  // ==========================================
  // 2. Data Normalization & Formatting
  // ==========================================
  describe("Data Normalization (Title Case, Model, Phones)", () => {
    it("title cases customer names, product names, and addresses", () => {
      expect(toTitleCase("suresh kumar patel")).toBe("Suresh Kumar Patel");
      expect(toTitleCase("hikvision 4mp colorvu bullet ip camera")).toBe(
        "Hikvision 4mp Colorvu Bullet Ip Camera"
      );
      expect(toTitleCase("shop no. 5 & 6, u-shape market, tagore marg, neemuch")).toBe(
        "Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch"
      );
    });

    it("formats model numbers strictly with uppercase, hyphens, and no illegal characters", () => {
      expect(formatModelNumber("  ThinkPad T480s  ")).toBe("THINKPAD-T480S");
      expect(formatModelNumber("ds 2cd2043g2 i")).toBe("DS-2CD2043G2-I");
      expect(formatModelNumber("hp/laserjet#1020?")).toBe("HP-LASERJET-1020");
    });

    it("normalizes Indian phone numbers to E.164 without plus/spaces for Firestore storage", () => {
      expect(formatIndianPhoneNumber("9826122334")).toBe("919826122334");
      expect(formatIndianPhoneNumber("+91 98261 22334")).toBe("919826122334");
      expect(formatIndianPhoneNumber("09826122334")).toBe("919826122334");
      expect(formatIndianPhoneNumber("+91-98261-22334")).toBe("919826122334");
      expect(formatIndianPhoneNumber("919826122334")).toBe("919826122334");
    });

    it("formats phone number cleanly for user display", () => {
      expect(formatPhoneForDisplay("919826122334")).toBe("+91 9826122334");
      expect(formatPhoneForDisplay("9826122334")).toBe("+91 9826122334");
    });

    it("sanitizes external URLs to prevent XSS / malicious schemes", () => {
      expect(sanitizeExternalUrl("https://drive.google.com/file/d/123/view")).toBe(
        "https://drive.google.com/file/d/123/view"
      );
      expect(sanitizeExternalUrl("http://example.com/catalog.pdf")).toBe(
        "http://example.com/catalog.pdf"
      );
      expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeExternalUrl("data:text/html,<script>")).toBeNull();
      expect(sanitizeExternalUrl("")).toBeNull();
    });
  });

  // ==========================================
  // 3. Customer Search Token Generation (Server-side Indexing)
  // ==========================================
  describe("Search Token Indexing for High-Performance Search", () => {
    it("generates searchable prefixes across name, phone, company, email, and ID", () => {
      const tokens = generateSearchTokens({
        id: "cust-101",
        name: "Ramesh Sharma",
        phone: "9826122334",
        companyName: "Sharma Trading Co",
        email: "ramesh@gmail.com",
      });

      expect(tokens).toContain("ramesh");
      expect(tokens).toContain("sharma");
      expect(tokens).toContain("trading");
      expect(tokens).toContain("cust-101");
      // Phone sub-strings
      expect(tokens).toContain("9826");
      expect(tokens).toContain("2334");
    });
  });

  // ==========================================
  // 4. Products Catalog & Website Visibility Filtering
  // ==========================================
  describe("Product Catalog Logic & Website Visibility", () => {
    const mockProducts: Product[] = [
      {
        id: "T480",
        name: "Lenovo ThinkPad T480",
        brand: "Lenovo",
        model: "T480",
        itemCode: "IT-001",
        warranty: "1 Year",
        serviceCenter: "Lenovo Authorized",
        productUrl: "",
        price: 32000,
        description: "Core i5 8th Gen, 16GB RAM, 512GB SSD",
        photoUrl: "https://example.com/t480.jpg",
        categoryId: "laptops",
        inStock: true,
        featured: true,
        showOnWebsite: true,
        order: 1,
        customFields: [],
      },
      {
        id: "DS-2CD2043G2-I",
        name: "Hikvision 4MP IP Camera",
        brand: "Hikvision",
        model: "DS-2CD2043G2-I",
        itemCode: "CAM-002",
        warranty: "2 Years",
        serviceCenter: "Hikvision Hub",
        productUrl: "",
        price: 4500,
        description: "4MP PoE Bullet Camera",
        photoUrl: null,
        categoryId: "cctv",
        inStock: true,
        featured: false,
        showOnWebsite: undefined, // Defaults to visible
        order: 2,
        customFields: [],
      },
      {
        id: "INTERNAL-MOTHERBOARD-REPAIR-CHIP",
        name: "BGA Reballing IC Chip",
        brand: "OEM",
        model: "BGA-IC-99",
        itemCode: "SPARE-009",
        warranty: "None",
        serviceCenter: "",
        productUrl: "",
        price: 850,
        description: "Internal motherboard component for workshop repairs only",
        photoUrl: null,
        categoryId: "spares",
        inStock: true,
        featured: false,
        showOnWebsite: false, // Internal ERP only
        order: null,
        customFields: [],
      },
    ];

    it("filters out ERP-only products from public website catalog", () => {
      const publicCatalog = mockProducts.filter((p) => p.showOnWebsite !== false);
      expect(publicCatalog.length).toBe(2);
      expect(publicCatalog.some((p) => p.id === "T480")).toBe(true);
      expect(publicCatalog.some((p) => p.id === "DS-2CD2043G2-I")).toBe(true);
      expect(publicCatalog.some((p) => p.id === "INTERNAL-MOTHERBOARD-REPAIR-CHIP")).toBe(false);
    });

    it("allows ERP admin search to find both public and internal products", () => {
      const query = "repair";
      const erpResults = mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.model.toLowerCase().includes(query)
      );
      expect(erpResults.length).toBe(1);
      expect(erpResults[0].id).toBe("INTERNAL-MOTHERBOARD-REPAIR-CHIP");
    });
  });

  // ==========================================
  // 5. Service Call Billing & Spare Parts Calculations
  // ==========================================
  describe("Service Call Billing Calculations", () => {
    it("calculates accurate total for parts, service charge, courier, and discount", () => {
      const parts: ServicePart[] = [
        { id: "p1", name: "15.6 Inch LED Screen", quantity: 1, unitPrice: 3800, totalPrice: 3800 },
        { id: "p2", name: "DDR4 8GB RAM Crucial", quantity: 2, unitPrice: 1650, totalPrice: 3300 },
      ];

      const partsTotal = parts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
      expect(partsTotal).toBe(7100);

      const serviceCharges = 650;
      const courierCharges = 250;
      const discount = 200;

      const subTotal = partsTotal + serviceCharges + courierCharges;
      expect(subTotal).toBe(8000);

      const grandTotal = Math.max(0, subTotal - discount);
      expect(grandTotal).toBe(7800);
    });
  });

  // ==========================================
  // 6. Quotation Math & Financial Formula Validation
  // ==========================================
  describe("Quotation Item & Tax Calculations", () => {
    it("calculates line item subtotals and grand total with taxes accurately", () => {
      const items: QuotationItem[] = [
        {
          id: "item-1",
          category: "CCTV",
          productName: "Hikvision 8CH NVR",
          quantity: 1,
          estimatedPrice: 7500,
          totalPrice: 7500,
        },
        {
          id: "item-2",
          category: "Storage",
          productName: "Seagate 2TB SkyHawk Surveillance HDD",
          quantity: 1,
          estimatedPrice: 5200,
          totalPrice: 5200,
        },
        {
          id: "item-3",
          category: "Networking",
          productName: "Cat6 Cable Roll 305M D-Link",
          quantity: 2,
          estimatedPrice: 4100,
          totalPrice: 8200,
        },
      ];

      const subTotal = items.reduce(
        (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.estimatedPrice) || 0),
        0
      );
      expect(subTotal).toBe(20900);

      const taxRate = 18; // 18% GST
      const taxAmount = (subTotal * taxRate) / 100;
      expect(taxAmount).toBe(3762);

      const grandTotal = subTotal + taxAmount;
      expect(grandTotal).toBe(24662);
    });
  });

  // ==========================================
  // 7. WhatsApp Customer & Vendor Template Formatting
  // ==========================================
  describe("WhatsApp Template Generation", () => {
    it("generates customer service update notification without internal fields", () => {
      const msg = generateWhatsAppMessage({
        ticketNo: "ZRB2608001",
        dateTime: "2026-08-23 15:30",
        customerName: "Prakash Verma",
        customerPhone: "9826122334",
        deviceCategory: "Laptops",
        modelNumber: "LATITUDE-5420",
        issueDescription: "No Display & Keyboard Replacement",
        status: "waiting_for_parts",
        grandTotal: 4500,
      });

      expect(msg).toContain("ZRB2608001");
      expect(msg).toContain("Prakash Verma");
      expect(msg).toContain("LATITUDE-5420");
      expect(msg).toContain("WAITING FOR PARTS");
      expect(msg).toContain("₹4,500");
      expect(msg).toContain("Terms & Conditions:");
      expect(msg).not.toContain("DOP");
      expect(msg).not.toContain("Internal Notes");
    });

    it("generates courier pickup request message correctly", () => {
      const courierMsg = generateCourierPickupRequestMessage({
        courierName: "Maruti Air Courier",
        ticketNo: "ZRB2608001",
        serviceCenterName: "Dell Authorized Service Center Indore",
        destinationAddress: "Shop 12, Silver Mall, RNT Marg, Indore",
        dateTime: "2026-08-23",
        rmaNumber: "RMA-DELL-98211",
      });

      expect(courierMsg).toContain("Maruti Air Courier");
      expect(courierMsg).toContain("PARCEL PICKUP REQUEST");
      expect(courierMsg).toContain("Dell Authorized Service Center Indore");
      expect(courierMsg).toContain("RMA-DELL-98211");
    });
  });
});
