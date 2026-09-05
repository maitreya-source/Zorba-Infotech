import type { ServiceCall, ServiceCallStatus, ServiceCallType, PaymentStatus, WarrantyStatus } from "./types";

export interface ReportMetrics {
  totalCalls: number;
  totalRevenue: number;
  partsTotal: number;
  serviceCharges: number;
  courierCharges: number;
  discounts: number;
  amountCollected: number;
  amountDue: number;
  collectionRate: number; // percentage (0 - 100)
  completedCalls: number;
  activeCalls: number;
  cancelledCalls: number;
  completionRate: number; // percentage (0 - 100)
  averageTicketValue: number;
  inHouseCount: number;
  serviceCenterCount: number;
  onsiteCount: number;
  technicianBreakdown: Record<
    string,
    {
      technicianId: string;
      technicianName: string;
      totalTickets: number;
      completedTickets: number;
      activeTickets: number;
      revenue: number;
    }
  >;
  categoryBreakdown: Record<
    string,
    {
      category: string;
      count: number;
      revenue: number;
    }
  >;
  paymentBreakdown: {
    paidAmount: number;
    dueAmount: number;
    paidCount: number;
    partialCount: number;
    dueCount: number;
    byMode: Record<string, number>;
  };
}

export interface DailyReportGroup {
  date: string; // YYYY-MM-DD
  displayDate: string;
  weekday: string;
  count: number;
  revenue: number;
  collected: number;
  due: number;
  calls: ServiceCall[];
}

export interface ReportFilters {
  search?: string;
  status?: string; // "all" | "active" | "completed" | specific ServiceCallStatus
  type?: string; // "all" | ServiceCallType
  technicianId?: string; // "all" | "unassigned" | specific ID
  paymentStatus?: string; // "all" | PaymentStatus
  warrantyStatus?: string; // "all" | WarrantyStatus
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

/**
 * Formats a number as Indian Currency (e.g. ₹1,25,000)
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `₹${rounded.toLocaleString("en-IN")}`;
}

/**
 * Calculates comprehensive metrics for a list of service calls
 */
export function calculateReportMetrics(calls: ServiceCall[]): ReportMetrics {
  let totalRevenue = 0;
  let partsTotal = 0;
  let serviceCharges = 0;
  let courierCharges = 0;
  let discounts = 0;
  let amountCollected = 0;
  let amountDue = 0;
  let completedCalls = 0;
  let activeCalls = 0;
  let cancelledCalls = 0;
  let inHouseCount = 0;
  let serviceCenterCount = 0;
  let onsiteCount = 0;

  const technicianMap: ReportMetrics["technicianBreakdown"] = {};
  const categoryMap: ReportMetrics["categoryBreakdown"] = {};
  const paymentByMode: Record<string, number> = {};
  let paidCount = 0;
  let partialCount = 0;
  let dueCount = 0;

  for (const call of calls) {
    const grandTotal = Number(call.grandTotal) || 0;
    const parts = Number(call.partsTotal) || 0;
    const service = Number(call.serviceCharges) || 0;
    const courier = Number(call.courierCharges) || 0;
    const discount = Number(call.discount) || 0;

    totalRevenue += grandTotal;
    partsTotal += parts;
    serviceCharges += service;
    courierCharges += courier;
    discounts += discount;

    // Payment calculations
    const paid = Number(call.amountPaid) || 0;
    const isPaid = call.paymentStatus === "paid";
    const isPartial = call.paymentStatus === "partial";

    if (isPaid) {
      paidCount++;
      const effectivePaid = paid > 0 ? paid : grandTotal;
      amountCollected += effectivePaid;
    } else if (isPartial) {
      partialCount++;
      amountCollected += paid;
      amountDue += Math.max(0, grandTotal - paid);
    } else {
      dueCount++;
      amountDue += grandTotal;
    }

    if (call.paymentMode) {
      paymentByMode[call.paymentMode] = (paymentByMode[call.paymentMode] || 0) + (paid > 0 ? paid : grandTotal);
    }

    // Status calculations
    const st = call.status;
    if (st === "completed" || st === "delivered") {
      completedCalls++;
    } else if (st === "cancelled") {
      cancelledCalls++;
    } else {
      activeCalls++;
    }

    // Service type
    if (call.type === "in_house_repair") inHouseCount++;
    else if (call.type === "company_service_center") serviceCenterCount++;
    else if (call.type === "onsite_visit") onsiteCount++;

    // Technician breakdown
    const techKey = call.technicianId || "unassigned";
    const techName = call.technicianName || "Unassigned";
    if (!technicianMap[techKey]) {
      technicianMap[techKey] = {
        technicianId: techKey,
        technicianName: techName,
        totalTickets: 0,
        completedTickets: 0,
        activeTickets: 0,
        revenue: 0,
      };
    }
    technicianMap[techKey].totalTickets++;
    technicianMap[techKey].revenue += grandTotal;
    if (st === "completed" || st === "delivered") {
      technicianMap[techKey].completedTickets++;
    } else if (st !== "cancelled") {
      technicianMap[techKey].activeTickets++;
    }

    // Device category breakdown
    const cat = (call.deviceCategory || "General").trim();
    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, count: 0, revenue: 0 };
    }
    categoryMap[cat].count++;
    categoryMap[cat].revenue += grandTotal;
  }

  const totalCalls = calls.length;
  const collectionRate = totalRevenue > 0 ? Math.min(100, Math.round((amountCollected / totalRevenue) * 100)) : 100;
  const completionRate = totalCalls > 0 ? Math.min(100, Math.round((completedCalls / totalCalls) * 100)) : 0;
  const averageTicketValue = totalCalls > 0 ? Math.round(totalRevenue / totalCalls) : 0;

  return {
    totalCalls,
    totalRevenue,
    partsTotal,
    serviceCharges,
    courierCharges,
    discounts,
    amountCollected,
    amountDue,
    collectionRate,
    completedCalls,
    activeCalls,
    cancelledCalls,
    completionRate,
    averageTicketValue,
    inHouseCount,
    serviceCenterCount,
    onsiteCount,
    technicianBreakdown: technicianMap,
    categoryBreakdown: categoryMap,
    paymentBreakdown: {
      paidAmount: amountCollected,
      dueAmount: amountDue,
      paidCount,
      partialCount,
      dueCount,
      byMode: paymentByMode,
    },
  };
}

/**
 * Groups service calls by day in reverse chronological order
 */
export function groupServiceCallsByDay(calls: ServiceCall[]): DailyReportGroup[] {
  const groups: Record<string, DailyReportGroup> = {};

  for (const call of calls) {
    const rawDate = call.dateTime ? call.dateTime.slice(0, 10) : "Unknown Date";
    if (!groups[rawDate]) {
      let displayDate = rawDate;
      let weekday = "";
      if (rawDate !== "Unknown Date" && !isNaN(Date.parse(rawDate))) {
        const d = new Date(rawDate);
        displayDate = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
      }

      groups[rawDate] = {
        date: rawDate,
        displayDate,
        weekday,
        count: 0,
        revenue: 0,
        collected: 0,
        due: 0,
        calls: [],
      };
    }

    const g = groups[rawDate];
    const total = Number(call.grandTotal) || 0;
    const paid = Number(call.amountPaid) || 0;

    g.count += 1;
    g.revenue += total;
    if (call.paymentStatus === "paid") {
      g.collected += paid > 0 ? paid : total;
    } else if (call.paymentStatus === "partial") {
      g.collected += paid;
      g.due += Math.max(0, total - paid);
    } else {
      g.due += total;
    }
    g.calls.push(call);
  }

  // Sort calls within each day by ticketNo or time
  Object.values(groups).forEach((g) => {
    g.calls.sort((a, b) => (b.dateTime || "").localeCompare(a.dateTime || ""));
  });

  // Sort days newest first
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Filters a list of service calls according to user criteria
 */
export function filterServiceCalls(calls: ServiceCall[], filters: ReportFilters): ServiceCall[] {
  const search = (filters.search || "").trim().toLowerCase();
  const status = filters.status || "all";
  const type = filters.type || "all";
  const technicianId = filters.technicianId || "all";
  const paymentStatus = filters.paymentStatus || "all";
  const warrantyStatus = filters.warrantyStatus || "all";
  const startDate = filters.startDate || "";
  const endDate = filters.endDate || "";

  return calls.filter((call) => {
    // Date Range filter
    if (startDate || endDate) {
      const callDate = call.dateTime ? call.dateTime.slice(0, 10) : "";
      if (startDate && callDate < startDate) return false;
      if (endDate && callDate > endDate) return false;
    }

    // Status filter
    if (status !== "all") {
      if (status === "active") {
        if (!["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(call.status)) {
          return false;
        }
      } else if (status === "completed") {
        if (!["completed", "delivered"].includes(call.status)) {
          return false;
        }
      } else if (call.status !== status) {
        return false;
      }
    }

    // Service Type filter
    if (type !== "all" && call.type !== type) {
      return false;
    }

    // Technician filter
    if (technicianId !== "all") {
      if (technicianId === "unassigned") {
        if (call.technicianId || call.technicianName) return false;
      } else if (call.technicianId !== technicianId) {
        return false;
      }
    }

    // Payment status filter
    if (paymentStatus !== "all") {
      const effectivePayment = call.paymentStatus || "due";
      if (effectivePayment !== paymentStatus) return false;
    }

    // Warranty filter
    if (warrantyStatus !== "all" && call.warrantyStatus !== warrantyStatus) {
      return false;
    }

    // Freeform text search
    if (search) {
      const match =
        (call.ticketNo || "").toLowerCase().includes(search) ||
        (call.customerName || "").toLowerCase().includes(search) ||
        (call.customerPhone || "").toLowerCase().includes(search) ||
        (call.deviceCategory || "").toLowerCase().includes(search) ||
        (call.modelNumber || "").toLowerCase().includes(search) ||
        (call.serialNumber || "").toLowerCase().includes(search) ||
        (call.issueDescription || "").toLowerCase().includes(search) ||
        (call.technicianName || "").toLowerCase().includes(search) ||
        (call.rmaNumber || "").toLowerCase().includes(search);

      if (!match) return false;
    }

    return true;
  });
}

/**
 * Formats and downloads a comprehensive CSV export for Excel / Tally
 */
export function downloadServiceCallsCsv(calls: ServiceCall[], filename: string): void {
  const headers = [
    "Ticket No",
    "Date",
    "Time",
    "Customer Name",
    "Customer Phone",
    "Customer Address",
    "Device Category",
    "Model Number",
    "Serial Number",
    "Warranty Status",
    "Service Type",
    "Issue Description",
    "Status",
    "Technician",
    "Handled By Staff",
    "Parts Total (INR)",
    "Service Charges (INR)",
    "Discount (INR)",
    "Courier Charges (INR)",
    "Grand Total (INR)",
    "Payment Status",
    "Payment Mode",
    "Amount Paid (INR)",
    "Amount Due (INR)",
    "RMA / Tracking No",
  ];

  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = calls.map((c) => {
    const rawDate = c.dateTime || "";
    const datePart = rawDate.slice(0, 10);
    const timePart = rawDate.length > 10 ? rawDate.slice(11, 16) : "";
    const total = Number(c.grandTotal) || 0;
    const paid = Number(c.amountPaid) || 0;
    const due = c.paymentStatus === "paid" ? 0 : Math.max(0, total - paid);

    return [
      escapeCsv(c.ticketNo || ""),
      escapeCsv(datePart),
      escapeCsv(timePart),
      escapeCsv(c.customerName || ""),
      escapeCsv(c.customerPhone || ""),
      escapeCsv(c.customerAddress || ""),
      escapeCsv(c.deviceCategory || ""),
      escapeCsv(c.modelNumber || ""),
      escapeCsv(c.serialNumber || ""),
      escapeCsv(c.warrantyStatus || ""),
      escapeCsv(c.type ? c.type.replace(/_/g, " ") : ""),
      escapeCsv(c.issueDescription || ""),
      escapeCsv(c.status ? c.status.replace(/_/g, " ") : ""),
      escapeCsv(c.technicianName || ""),
      escapeCsv(c.handledByStaffName || ""),
      escapeCsv(c.partsTotal || 0),
      escapeCsv(c.serviceCharges || 0),
      escapeCsv(c.discount || 0),
      escapeCsv(c.courierCharges || 0),
      escapeCsv(total),
      escapeCsv(c.paymentStatus || "due"),
      escapeCsv(c.paymentMode || ""),
      escapeCsv(paid),
      escapeCsv(due),
      escapeCsv(c.rmaNumber || ""),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an executive WhatsApp report summary string
 */
export function generateWhatsAppReportSummary(metrics: ReportMetrics, periodLabel: string): string {
  const topTechs = Object.values(metrics.technicianBreakdown)
    .filter((t) => t.technicianId !== "unassigned")
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  let techLines = "";
  if (topTechs.length > 0) {
    techLines =
      "\n*👨‍🔧 Top Technicians:*\n" +
      topTechs
        .map((t) => `• ${t.technicianName}: ${t.totalTickets} tickets (${formatINR(t.revenue)})`)
        .join("\n");
  }

  return `*📊 ZORBA INFOTECH — SERVICE CALL REPORT*
📅 *Period:* ${periodLabel}
─────────────────────────────
💰 *Total Revenue:* ${formatINR(metrics.totalRevenue)}
✅ *Collected:* ${formatINR(metrics.amountCollected)} (${metrics.collectionRate}%)
⏳ *Pending Dues:* ${formatINR(metrics.amountDue)}
📦 *Parts Revenue:* ${formatINR(metrics.partsTotal)}
🛠 *Service Charges:* ${formatINR(metrics.serviceCharges)}

*🔧 Ticket Volume & Status:*
• Total Tickets: ${metrics.totalCalls}
• Completed / Delivered: ${metrics.completedCalls} (${metrics.completionRate}%)
• Active in Workshop: ${metrics.activeCalls}
• Cancelled: ${metrics.cancelledCalls}
• Avg Ticket Value: ${formatINR(metrics.averageTicketValue)}

*📍 Service Distribution:*
• In-House Repairs: ${metrics.inHouseCount}
• Service Center Dispatches: ${metrics.serviceCenterCount}
• Onsite Visits: ${metrics.onsiteCount}${techLines}
─────────────────────────────
_Report generated via Zorba ERP Support Desk_`.trim();
}
