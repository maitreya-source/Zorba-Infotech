import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import * as firestoreModule from "@/lib/firestore";
import { deduplicateCustomers, safeLocalStorageSet } from "@/lib/firestore";
import type { Customer } from "@/lib/types";

describe("Customer Deduplication & Quota Safety", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("deduplicateCustomers", () => {
    it("deduplicates records with identical 10-digit phone numbers and merges their fields", () => {
      const records: Partial<Customer>[] = [
        {
          id: "doc-1",
          name: "Rajesh Sharma",
          phone: "+91 98260 11111",
          companyName: "Sharma Enterprises",
          email: "rajesh@sharma.com",
          address: "Shop 12 Neemuch",
          group: "Sundry Debtors",
          updatedAt: 1000,
        },
        {
          id: "doc-2",
          name: "Rajesh Sharma",
          phone: "9826011111", // Duplicate phone format
          companyName: "Sharma Enterprises",
          address: "Shop 12, Main Market Road, Neemuch MP", // Richer address
          group: "Sundry Debtors",
          additionalPhones: ["+91 98260 22222"],
          updatedAt: 2000, // Newer timestamp
        },
      ];

      const deduplicated = deduplicateCustomers(records as Customer[]);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].name).toBe("Rajesh Sharma");
      expect(deduplicated[0].phone).toBe("+91 98260 11111");
      expect(deduplicated[0].address).toBe("Shop 12, Main Market Road, Neemuch MP");
      expect(deduplicated[0].email).toBe("rajesh@sharma.com");
      expect(deduplicated[0].additionalPhones).toContain("+91 98260 22222");
      expect(deduplicated[0].updatedAt).toBe(2000);
    });

    it("deduplicates records with no phone number but identical ledger name and company", () => {
      const records: Partial<Customer>[] = [
        {
          id: "tally-1",
          name: "Ultratech Cement Neemuch Unit",
          phone: "",
          companyName: "Ultratech Cement",
          group: "Corporate Debtors",
          updatedAt: 100,
        },
        {
          id: "tally-2",
          name: "Ultratech Cement Neemuch Unit",
          phone: undefined,
          companyName: "Ultratech Cement",
          group: "Corporate Debtors",
          address: "Plot 10 Industrial Area Neemuch",
          updatedAt: 200,
        },
      ];

      const deduplicated = deduplicateCustomers(records as Customer[]);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].name).toBe("Ultratech Cement Neemuch Unit");
      expect(deduplicated[0].address).toBe("Plot 10 Industrial Area Neemuch");
    });

    it("does NOT merge different customers who share the same name but have DIFFERENT phone numbers", () => {
      const records: Partial<Customer>[] = [
        {
          id: "c-1",
          name: "Amit Patel",
          phone: "+91 98260 12345",
          city: "Neemuch",
        },
        {
          id: "c-2",
          name: "Amit Patel",
          phone: "+91 98260 99999",
          city: "Mandsaur",
        },
      ];

      const deduplicated = deduplicateCustomers(records as Customer[]);
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map((c) => c.phone)).toEqual(["+91 98260 12345", "+91 98260 99999"]);
    });

    it("halves a doubled dataset representing duplicate Tally sync imports", () => {
      const initial: Customer[] = [];
      for (let i = 0; i < 50; i++) {
        initial.push({
          id: `orig-${i}`,
          name: `Customer ${i}`,
          phone: `+91 98260 ${String(10000 + i)}`,
          companyName: `Company ${i}`,
          group: i % 2 === 0 ? "Sundry Debtors" : "Retail",
          createdAt: 1000,
          updatedAt: 1000,
        });
      }
      // Duplicate each record with a new doc id (simulating duplicate Tally XML batch imports)
      const doubled: Customer[] = [
        ...initial,
        ...initial.map((c, i) => ({
          ...c,
          id: `duplicate-${i}`,
          updatedAt: 2000,
        })),
      ];

      expect(doubled).toHaveLength(100);
      const deduplicated = deduplicateCustomers(doubled);
      expect(deduplicated).toHaveLength(50);
    });
  });

  describe("safeLocalStorageSet", () => {
    it("safely stores small keys in localStorage without error", () => {
      const ok = safeLocalStorageSet("test_key", "test_value");
      expect(ok).toBe(true);
      expect(localStorage.getItem("test_key")).toBe("test_value");
    });

    it("handles QuotaExceededError gracefully by purging legacy bulk keys and returning false without crashing", () => {
      localStorage.setItem("zorba_cust_index_v5", "bloated_data");
      localStorage.setItem("zorba_categories_cache", "cache_data");

      const originalSetItem = localStorage.setItem;
      const quotaError = new DOMException("The quota has been exceeded", "QuotaExceededError");
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, val) => {
        if (key === "huge_data") {
          throw quotaError;
        }
        originalSetItem.call(localStorage, key, val);
      });

      expect(() => {
        const result = safeLocalStorageSet("huge_data", "some_data");
        expect(result).toBe(false);
      }).not.toThrow();

      // Legacy bloated keys should have been purged during recovery
      expect(localStorage.getItem("zorba_cust_index_v5")).toBeNull();
    });
  });

  describe("AdminCustomers Directory UI Sorting & Group Filtering", () => {
    const mockCustomers: Customer[] = [
      { id: "c-1", name: "Zoya Khan", phone: "+91 98260 11111", group: "Retail", createdAt: 100 },
      { id: "c-2", name: "Amit Sharma", phone: "+91 98260 22222", group: "Sundry Debtors", createdAt: 200 },
      { id: "c-3", name: "Bhavik Jain", phone: "+91 98260 33333", group: "Sundry Debtors", createdAt: 300 },
    ];

    it("renders customers in alphabetical A-Z order by default", async () => {
      vi.spyOn(firestoreModule, "getCustomers").mockResolvedValue(mockCustomers);
      vi.spyOn(firestoreModule, "subscribeCustomers").mockReturnValue(() => {});

      render(
        <MemoryRouter>
          <AdminCustomers />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Customer Directory")).toBeInTheDocument();
        expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
      });

      const customerRows = screen.getAllByRole("row");
      // Row 0 is the table header; Row 1 should be Amit Sharma, Row 2 Bhavik Jain, Row 3 Zoya Khan
      expect(customerRows[1]).toHaveTextContent("Amit Sharma");
      expect(customerRows[2]).toHaveTextContent("Bhavik Jain");
      expect(customerRows[3]).toHaveTextContent("Zoya Khan");
    });
  });
});
