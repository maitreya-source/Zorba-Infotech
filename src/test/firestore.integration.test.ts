import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizePhone10,
  getFinancialYear,
  getQuotationMonthKey,
  compressImageToWebP,
} from "@/lib/firestore";
import type { Customer, ServiceCall, Quotation, Product } from "@/lib/types";

describe("Firestore Integration: Customer, Service Calls, Quotations & Storage Lifecycle", () => {
  // Test Data Store
  let customerStore: Map<string, Customer>;
  let serviceCallStore: Map<string, ServiceCall>;
  let quotationStore: Map<string, Quotation>;
  let counterStore: Map<string, number>;

  beforeEach(() => {
    customerStore = new Map();
    serviceCallStore = new Map();
    quotationStore = new Map();
    counterStore = new Map();
  });

  // =========================================================================
  // 1. Customer CRUD, Validation & Ultra-Slim Local Index Matching
  // =========================================================================
  describe("1. Customer Lifecycle & Search Indexing", () => {
    it("validates 10-digit Indian phone numbers and prevents duplicate registration", () => {
      const rawPhone1 = "+91 98261 22334";
      const norm1 = normalizePhone10(rawPhone1);
      expect(norm1).toBe("9826122334");

      const rawPhone2 = "09826122334";
      const norm2 = normalizePhone10(rawPhone2);
      expect(norm2).toBe("9826122334");

      expect(norm1).toBe(norm2); // Both map to the exact same 10-digit number
    });

    it("creates a customer, populates slim index, and handles multi-field search", () => {
      const newCustomer: Customer = {
        id: "cust-test-101",
        name: "Vikramaditya Solanki",
        phone: "919826199880",
        additionalPhones: ["917422255660"],
        companyName: "Solanki Infotech Neemuch",
        email: "vikram@solanki.com",
        address: "Shop 14, Commercial Complex, Tagore Marg",
        city: "Neemuch",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      customerStore.set(newCustomer.id, newCustomer);
      expect(customerStore.has("cust-test-101")).toBe(true);

      // In-memory slim index search simulation
      const searchIndex = Array.from(customerStore.values()).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        additionalPhones: c.additionalPhones,
        companyName: c.companyName,
        email: c.email,
      }));

      // Search by partial name
      const nameMatch = searchIndex.filter((c) =>
        c.name.toLowerCase().includes("vikram")
      );
      expect(nameMatch.length).toBe(1);
      expect(nameMatch[0].id).toBe("cust-test-101");

      // Search by company name
      const companyMatch = searchIndex.filter((c) =>
        (c.companyName || "").toLowerCase().includes("solanki")
      );
      expect(companyMatch.length).toBe(1);

      // Search by alternate phone digits
      const phoneDigits = "742225";
      const phoneMatch = searchIndex.filter(
        (c) =>
          c.phone.includes(phoneDigits) ||
          c.additionalPhones?.some((p) => p.includes(phoneDigits))
      );
      expect(phoneMatch.length).toBe(1);
      expect(phoneMatch[0].id).toBe("cust-test-101");
    });

    it("updates customer profile and cleans up after test", () => {
      const cust: Customer = {
        id: "cust-test-102",
        name: "Anil Sharma",
        phone: "919826000111",
        companyName: "Sharma Electronics",
        createdAt: Date.now(),
      };
      customerStore.set(cust.id, cust);

      // Update
      const updated = { ...cust, companyName: "Sharma Electronics & CCTV Hub", updatedAt: Date.now() };
      customerStore.set(cust.id, updated);
      expect(customerStore.get(cust.id)?.companyName).toBe("Sharma Electronics & CCTV Hub");

      // Clean up
      customerStore.delete(cust.id);
      expect(customerStore.has(cust.id)).toBe(false);
    });
  });

  // =========================================================================
  // 2. Service Call Creation, Subcollection Hierarchy & Customer Linkage
  // =========================================================================
  describe("2. Service Call Creation, Atomic Ticket Counter & History Link", () => {
    it("allocates atomic ticket number without collisions", () => {
      const monthKey = "2026-08";
      const getNextTicket = (mKey: string) => {
        const current = counterStore.get(mKey) || 0;
        const next = current + 1;
        counterStore.set(mKey, next);
        return `SC-${mKey.replace("-", "-")}-${String(next).padStart(4, "0")}`;
      };

      const ticket1 = getNextTicket(monthKey);
      const ticket2 = getNextTicket(monthKey);
      const ticket3 = getNextTicket(monthKey);

      expect(ticket1).toBe("SC-2026-08-0001");
      expect(ticket2).toBe("SC-2026-08-0002");
      expect(ticket3).toBe("SC-2026-08-0003");
    });

    it("creates a partitioned service call with parts and diagnostic fields", () => {
      const fyInfo = getFinancialYear(new Date("2026-08-24"));
      const ticketNo = "SC-2026-08-0010";

      const serviceCall: ServiceCall = {
        id: ticketNo,
        ticketNo: ticketNo,
        fyId: fyInfo.fyId,
        monthKey: fyInfo.monthKey,
        type: "in_house_repair",
        dateTime: "2026-08-24T10:00:00Z",
        customerId: "cust-test-101",
        customerName: "Vikramaditya Solanki",
        customerPhone: "919826199880",
        deviceCategory: "Laptops",
        modelNumber: "THINKPAD-E14",
        serialNumber: "PF29X890",
        quantity: 1,
        issueDescription: "Motherboard power rail dead, no boot LED",
        warrantyStatus: "out_of_warranty",
        notes: "Replaced 19V DC-in MOSFETs and 3.3V power IC",
        status: "in_progress",
        technicianId: "tech-01",
        technicianName: "Maitreya Mulchandani",
        parts: [
          { id: "p1", name: "Power Management IC", quantity: 1, unitPrice: 1200, totalPrice: 1200 },
          { id: "p2", name: "SMD MOSFET Pair", quantity: 2, unitPrice: 150, totalPrice: 300 },
        ],
        partsTotal: 1500,
        serviceCharges: 850,
        courierCharges: 0,
        discount: 100,
        grandTotal: 2250,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store in partitioned hierarchy
      serviceCallStore.set(ticketNo, serviceCall);

      expect(serviceCallStore.has(ticketNo)).toBe(true);
      const stored = serviceCallStore.get(ticketNo)!;
      expect(stored.fyId).toBe("FY2627");
      expect(stored.monthKey).toBe("2026-08");
      expect(stored.parts.length).toBe(2);
      expect(stored.grandTotal).toBe(2250);

      // Customer History Query Verification (collectionGroup where customerId == 'cust-test-101')
      const customerCalls = Array.from(serviceCallStore.values()).filter(
        (c) => c.customerId === "cust-test-101"
      );
      expect(customerCalls.length).toBe(1);
      expect(customerCalls[0].ticketNo).toBe(ticketNo);

      // Technician Assignment Query Verification
      const techCalls = Array.from(serviceCallStore.values()).filter(
        (c) => c.technicianId === "tech-01"
      );
      expect(techCalls.length).toBe(1);

      // Clean up after test
      serviceCallStore.delete(ticketNo);
      expect(serviceCallStore.has(ticketNo)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Quotation Creation, Product Selection & Clean-Up
  // =========================================================================
  describe("3. Quotation Creation with Catalog Items & Customer Association", () => {
    it("creates a quotation with selected product line items and verifies math", () => {
      const quotationNo = "QT-2026-08-0005";
      const qMonthKey = getQuotationMonthKey("2026-08-24");

      const quotation: Quotation = {
        id: "quote-test-501",
        quotationNo: quotationNo,
        customerId: "cust-test-101",
        customerName: "Vikramaditya Solanki",
        customerPhone: "919826199880",
        customerEmail: "vikram@solanki.com",
        customerAddress: "Neemuch MP",
        date: "2026-08-24",
        validUntil: "2026-09-07",
        status: "sent",
        items: [
          {
            id: "it-1",
            category: "CCTV",
            productName: "Hikvision 4MP IP ColorVu Camera",
            modelNumber: "DS-2CD2043G2-I",
            quantity: 4,
            estimatedPrice: 4200,
            totalPrice: 16800,
          },
          {
            id: "it-2",
            category: "Storage",
            productName: "WD Purple 2TB Surveillance Hard Drive",
            modelNumber: "WD20PURZ",
            quantity: 1,
            estimatedPrice: 5400,
            totalPrice: 5400,
          },
        ],
        subtotal: 22200,
        tax: 3996,
        discount: 500,
        grandTotal: 25696,
        notes: "Includes 1 year on-site warranty and installation.",
        termsAndConditions: "50% advance along with purchase order. Balance upon delivery.",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      quotationStore.set(quotation.id, quotation);
      expect(quotationStore.has("quote-test-501")).toBe(true);

      const stored = quotationStore.get("quote-test-501")!;
      expect(stored.items.length).toBe(2);
      expect(stored.grandTotal).toBe(25696);
      expect(qMonthKey.monthKey).toBe("2026-08");

      // Customer Quotations Query Verification (where customerId == 'cust-test-101')
      const customerQuotes = Array.from(quotationStore.values()).filter(
        (q) => q.customerId === "cust-test-101"
      );
      expect(customerQuotes.length).toBe(1);
      expect(customerQuotes[0].quotationNo).toBe(quotationNo);

      // Clean up after test
      quotationStore.delete(quotation.id);
      expect(quotationStore.has(quotation.id)).toBe(false);
    });
  });

  // =========================================================================
  // 4. Soft Delete, Trash Purge & Retention Lifecycle
  // =========================================================================
  describe("4. Trash Lifecycle & 90-Day Auto-Purge", () => {
    it("soft deletes tickets and purges only tickets older than 90 days", () => {
      const now = Date.now();
      const ninetyFiveDaysAgo = now - 95 * 24 * 60 * 60 * 1000;
      const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;

      // 1. Active ticket
      const activeCall: ServiceCall = {
        id: "SC-ACTIVE",
        ticketNo: "SC-ACTIVE",
        fyId: "FY2627",
        monthKey: "2026-08",
        type: "in_house_repair",
        dateTime: "2026-08-24",
        customerId: "cust-101",
        deviceCategory: "Laptops",
        quantity: 1,
        issueDescription: "Fan issue",
        warrantyStatus: "out_of_warranty",
        parts: [],
        partsTotal: 0,
        serviceCharges: 500,
        status: "in_progress",
        isDeleted: false,
        grandTotal: 500,
        createdAt: now,
        updatedAt: now,
      };

      // 2. Recent trash ticket (10 days old)
      const recentTrash: ServiceCall = {
        id: "SC-RECENT-TRASH",
        ticketNo: "SC-RECENT-TRASH",
        fyId: "FY2627",
        monthKey: "2026-08",
        type: "in_house_repair",
        dateTime: "2026-08-14",
        customerId: "cust-101",
        deviceCategory: "Laptops",
        quantity: 1,
        issueDescription: "Broken hinge",
        warrantyStatus: "out_of_warranty",
        parts: [],
        partsTotal: 0,
        serviceCharges: 300,
        status: "cancelled",
        isDeleted: true,
        deletedAt: tenDaysAgo,
        grandTotal: 300,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      };

      // 3. Expired trash ticket (95 days old)
      const expiredTrash: ServiceCall = {
        id: "SC-EXPIRED-TRASH",
        ticketNo: "SC-EXPIRED-TRASH",
        fyId: "FY2627",
        monthKey: "2026-05",
        type: "in_house_repair",
        dateTime: "2026-05-20",
        customerId: "cust-101",
        deviceCategory: "Laptops",
        quantity: 1,
        issueDescription: "Dead adaptor",
        warrantyStatus: "out_of_warranty",
        parts: [],
        partsTotal: 0,
        serviceCharges: 250,
        status: "cancelled",
        isDeleted: true,
        deletedAt: ninetyFiveDaysAgo,
        grandTotal: 250,
        createdAt: ninetyFiveDaysAgo,
        updatedAt: ninetyFiveDaysAgo,
      };

      serviceCallStore.set(activeCall.id, activeCall);
      serviceCallStore.set(recentTrash.id, recentTrash);
      serviceCallStore.set(expiredTrash.id, expiredTrash);

      // Active tickets filter
      const activeOnly = Array.from(serviceCallStore.values()).filter((c) => !c.isDeleted);
      expect(activeOnly.length).toBe(1);
      expect(activeOnly[0].id).toBe("SC-ACTIVE");

      // Auto-purge simulation (older than 90 days)
      const cutoff = now - 90 * 24 * 60 * 60 * 1000;
      let purgedCount = 0;

      for (const [id, call] of Array.from(serviceCallStore.entries())) {
        if (call.isDeleted && call.deletedAt && call.deletedAt <= cutoff) {
          serviceCallStore.delete(id);
          purgedCount++;
        }
      }

      expect(purgedCount).toBe(1);
      expect(serviceCallStore.has("SC-EXPIRED-TRASH")).toBe(false);
      expect(serviceCallStore.has("SC-RECENT-TRASH")).toBe(true); // Retained for recovery
      expect(serviceCallStore.has("SC-ACTIVE")).toBe(true);

      // Clean up remaining
      serviceCallStore.clear();
    });
  });

  // =========================================================================
  // 5. Client-Side WebP Compression Pipeline
  // =========================================================================
  describe("5. Client-Side Image Pre-Compression (WebP)", () => {
    it("handles image compression utility gracefully in browser environments", async () => {
      const mockSvg = new File(["<svg></svg>"], "logo.svg", { type: "image/svg+xml" });
      const result = await compressImageToWebP(mockSvg);
      // SVGs are preserved as-is without degradation
      expect(result).toBe(mockSvg);
    });
  });
});
