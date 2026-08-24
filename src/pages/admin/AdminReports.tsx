import { useEffect, useState, useRef } from "react";
import {
  Calendar,
  Printer,
  Wrench,
  Building2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServiceCallsForMonth, getFinancialYear } from "@/lib/firestore";
import type { ServiceCall } from "@/lib/types";

export default function AdminReports() {
  const monthInputRef = useRef<HTMLInputElement>(null);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    setLoading(true);
    const fyId = getFinancialYear(selectedMonth + "-01").fyId;
    getServiceCallsForMonth(fyId, selectedMonth)
      .then((data) => setCalls(data))
      .catch((err) => {
        console.error("Error loading monthly report:", err);
        setCalls([]);
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  // Filter calls for this month
  const filteredCalls = calls;

  // Calculate Key Metrics
  const totalCalls = filteredCalls.length;
  const totalRevenue = filteredCalls.reduce((acc, c) => acc + (c.grandTotal || 0), 0);
  const totalPartsRevenue = filteredCalls.reduce((acc, c) => acc + (c.partsTotal || 0), 0);
  const totalServiceCharges = filteredCalls.reduce((acc, c) => acc + (c.serviceCharges || 0), 0);
  const completedCalls = filteredCalls.filter((c) => c.status === "completed" || c.status === "delivered").length;
  const activeCalls = filteredCalls.filter((c) =>
    ["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(c.status)
  ).length;

  // Breakdown by Type
  const inHouseCount = filteredCalls.filter((c) => c.type === "in_house_repair").length;
  const serviceCenterCount = filteredCalls.filter((c) => c.type === "company_service_center").length;
  const onsiteCount = filteredCalls.filter((c) => c.type === "onsite_visit").length;

  // Daily Groupings
  const dailyGroups = filteredCalls.reduce((acc, call) => {
    const dateStr = call.dateTime ? call.dateTime.slice(0, 10) : "Unknown Date";
    if (!acc[dateStr]) {
      acc[dateStr] = { date: dateStr, count: 0, revenue: 0, calls: [] };
    }
    acc[dateStr].count += 1;
    acc[dateStr].revenue += call.grandTotal || 0;
    acc[dateStr].calls.push(call);
    return acc;
  }, {} as Record<string, { date: string; count: number; revenue: number; calls: ServiceCall[] }>);

  const dailyList = Object.values(dailyGroups).sort((a, b) => b.date.localeCompare(a.date));

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto print:p-0 text-xs">
      {/* Integrated Hero Header (Black Box) */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 md:p-5 text-white shadow-md print:hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Daily & Monthly Service Call Reports
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Track daily billing revenue, completed service tickets, parts consumption, and workshop throughput
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Month Selector Wrapper with Dark Container */}
            <div
              onClick={() => monthInputRef.current?.showPicker?.()}
              className="relative flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-3 h-9 w-48 min-w-[190px] cursor-pointer transition-colors group shadow-inner"
            >
              <Calendar className="h-4 w-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
              <input
                ref={monthInputRef}
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white w-full focus:outline-none cursor-pointer pr-1"
              />
            </div>

            <Button
              onClick={handlePrintReport}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white h-9 px-4 rounded-xl cursor-pointer shadow-sm shrink-0"
            >
              <Printer className="h-4 w-4" /> Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Print-Only CSS */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-4 border-b border-black pb-3">
        <h1 className="text-xl font-bold font-display text-black">ZORBA INFOTECH — Service Call Report</h1>
        <p className="text-xs text-black mt-0.5 font-medium">Period: {selectedMonth} | Printed: {new Date().toLocaleDateString("en-IN")}</p>
      </div>

      {/* Metrics Grid (Hidden during print) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold font-display text-foreground">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </p>
          <div className="text-[11px] text-muted-foreground">
            Parts ₹{totalPartsRevenue} + Service ₹{totalServiceCharges}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Calls</span>
            <Wrench className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-extrabold font-display text-foreground">{totalCalls}</p>
          <div className="text-[11px] text-muted-foreground">
            {completedCalls} Completed · {activeCalls} Active
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>In-House Service</span>
            <Wrench className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-extrabold font-display text-blue-600 dark:text-blue-400">{inHouseCount}</p>
          <div className="text-[11px] text-muted-foreground">Refills & Shop Repairs</div>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Service Center & Onsite</span>
            <Building2 className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xl font-extrabold font-display text-purple-600 dark:text-purple-400">
            {serviceCenterCount + onsiteCount}
          </p>
          <div className="text-[11px] text-muted-foreground">
            {serviceCenterCount} Service Center · {onsiteCount} Visits
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="font-bold text-sm font-display flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Daily Revenue & Ticket Summary ({selectedMonth})
          </h2>
          <span className="text-xs text-muted-foreground font-medium">{dailyList.length} Active Days</span>
        </div>

        {dailyList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            No service calls recorded for {selectedMonth}.
          </div>
        ) : (
          <div className="space-y-4">
            {dailyList.map((day) => (
              <div key={day.date} className="rounded-xl border bg-muted/20 p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b pb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-foreground font-mono">
                      📅 {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {day.count} Tickets
                    </Badge>
                  </div>
                  <div className="font-extrabold text-xs sm:text-sm text-primary font-display">
                    Daily Revenue: ₹{day.revenue.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Day Service Calls List */}
                <div className="divide-y text-xs">
                  {day.calls.map((call) => (
                    <div key={call.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-mono font-bold text-primary text-[11px]">{call.ticketNo}</span>
                        <span className="font-semibold text-foreground">{call.customerName}</span>
                        <span className="text-muted-foreground font-mono text-[11px]">({call.deviceCategory})</span>
                        {call.technicianName && (
                          <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            👤 {call.technicianName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] sm:text-xs">
                        <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{call.issueDescription}</span>
                        <span className="font-bold text-foreground shrink-0 font-mono">₹{call.grandTotal || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
