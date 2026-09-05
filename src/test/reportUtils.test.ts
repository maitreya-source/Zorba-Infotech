import { describe, it, expect } from "vitest";
import {
  calculateReportMetrics,
  groupServiceCallsByDay,
  filterServiceCalls,
  formatINR,
  generateWhatsAppReportSummary,
} from "../lib/reportUtils";
import type { ServiceCall } from "../lib/types";

const mockCalls: ServiceCall[] = [
  {
    id: "sc-1",
    ticketNo: "SC-001",
    type: "in_house_repair",
    dateTime: "2026-09-05T10:30:00",
    customerId: "c-1",
    customerName: "Aman Gupta",
    customerPhone: "9876543210",
    deviceCategory: "Laptop",
    modelNumber: "ThinkPad T480",
    issueDescription: "No display",
    warrantyStatus: "out_of_warranty",
    status: "completed",
    technicianId: "tech-1",
    technicianName: "Ramesh Sharma",
    quantity: 1,
    parts: [{ id: "p-1", name: "RAM 8GB", quantity: 1, unitPrice: 2000, totalPrice: 2000 }],
    partsTotal: 2000,
    serviceCharges: 500,
    discount: 100,
    grandTotal: 2400,
    paymentStatus: "paid",
    paymentMode: "upi",
    amountPaid: 2400,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "sc-2",
    ticketNo: "SC-002",
    type: "company_service_center",
    dateTime: "2026-09-05T14:00:00",
    customerId: "c-2",
    customerName: "Pooja Verma",
    customerPhone: "9876500000",
    deviceCategory: "Laser Printer",
    modelNumber: "HP LaserJet 1020",
    quantity: 1,
    issueDescription: "Paper jam issue",
    warrantyStatus: "in_warranty",
    status: "sent_to_service_center",
    technicianId: "tech-2",
    technicianName: "Vikram Singh",
    courierCharges: 150,
    parts: [],
    partsTotal: 0,
    serviceCharges: 300,
    grandTotal: 450,
    paymentStatus: "partial",
    amountPaid: 200,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "sc-3",
    ticketNo: "SC-003",
    type: "onsite_visit",
    dateTime: "2026-09-04T11:15:00",
    customerId: "c-3",
    customerName: "Neelam Jain",
    customerPhone: "9123456789",
    deviceCategory: "Desktop",
    modelNumber: "Dell OptiPlex",
    quantity: 1,
    issueDescription: "OS installation",
    warrantyStatus: "out_of_warranty",
    status: "in_progress",
    technicianId: "tech-1",
    technicianName: "Ramesh Sharma",
    parts: [],
    partsTotal: 0,
    serviceCharges: 800,
    grandTotal: 800,
    paymentStatus: "due",
    amountPaid: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe("reportUtils unit tests", () => {
  it("formats Indian currency correctly", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(1500)).toBe("₹1,500");
    expect(formatINR(125000)).toBe("₹1,25,000");
  });

  it("calculates report metrics accurately", () => {
    const metrics = calculateReportMetrics(mockCalls);

    expect(metrics.totalCalls).toBe(3);
    expect(metrics.totalRevenue).toBe(2400 + 450 + 800); // 3650
    expect(metrics.partsTotal).toBe(2000);
    expect(metrics.serviceCharges).toBe(500 + 300 + 800); // 1600
    expect(metrics.courierCharges).toBe(150);
    expect(metrics.discounts).toBe(100);

    // Paid amount: sc-1 is 2400, sc-2 is 200, sc-3 is 0 => 2600
    expect(metrics.amountCollected).toBe(2600);
    // Due amount: sc-2 is (450 - 200) = 250, sc-3 is 800 => 1050
    expect(metrics.amountDue).toBe(1050);

    // Status counts
    expect(metrics.completedCalls).toBe(1);
    expect(metrics.activeCalls).toBe(2);
    expect(metrics.cancelledCalls).toBe(0);

    // Types
    expect(metrics.inHouseCount).toBe(1);
    expect(metrics.serviceCenterCount).toBe(1);
    expect(metrics.onsiteCount).toBe(1);

    // Technicians
    expect(metrics.technicianBreakdown["tech-1"].totalTickets).toBe(2);
    expect(metrics.technicianBreakdown["tech-1"].revenue).toBe(3200);
    expect(metrics.technicianBreakdown["tech-2"].totalTickets).toBe(1);

    // Categories
    expect(metrics.categoryBreakdown["Laptop"].count).toBe(1);
    expect(metrics.categoryBreakdown["Laser Printer"].count).toBe(1);
  });

  it("groups service calls by day in reverse chronological order", () => {
    const groups = groupServiceCallsByDay(mockCalls);
    expect(groups.length).toBe(2);
    expect(groups[0].date).toBe("2026-09-05");
    expect(groups[0].count).toBe(2);
    expect(groups[0].revenue).toBe(2850);
    expect(groups[1].date).toBe("2026-09-04");
    expect(groups[1].count).toBe(1);
    expect(groups[1].revenue).toBe(800);
  });

  it("filters service calls by search text", () => {
    const searchByName = filterServiceCalls(mockCalls, { search: "aman" });
    expect(searchByName.length).toBe(1);
    expect(searchByName[0].ticketNo).toBe("SC-001");

    const searchByDevice = filterServiceCalls(mockCalls, { search: "laser" });
    expect(searchByDevice.length).toBe(1);
    expect(searchByDevice[0].ticketNo).toBe("SC-002");
  });

  it("filters service calls by status, technician, and payment", () => {
    const completedOnly = filterServiceCalls(mockCalls, { status: "completed" });
    expect(completedOnly.length).toBe(1);

    const tech1Only = filterServiceCalls(mockCalls, { technicianId: "tech-1" });
    expect(tech1Only.length).toBe(2);

    const paidOnly = filterServiceCalls(mockCalls, { paymentStatus: "paid" });
    expect(paidOnly.length).toBe(1);
    expect(paidOnly[0].ticketNo).toBe("SC-001");

    const dueOnly = filterServiceCalls(mockCalls, { paymentStatus: "due" });
    expect(dueOnly.length).toBe(1);
    expect(dueOnly[0].ticketNo).toBe("SC-003");
  });

  it("generates WhatsApp report summary message", () => {
    const metrics = calculateReportMetrics(mockCalls);
    const summary = generateWhatsAppReportSummary(metrics, "05 Sep 2026");
    expect(summary).toContain("ZORBA INFOTECH — SERVICE CALL REPORT");
    expect(summary).toContain("05 Sep 2026");
    expect(summary).toContain("*Total Revenue:* ₹3,650");
    expect(summary).toContain("*Collected:* ₹2,600");
    expect(summary).toContain("*Pending Dues:* ₹1,050");
    expect(summary).toContain("Ramesh Sharma");
  });
});
