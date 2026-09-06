import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Wrench,
  Users,
  FileText,
  Phone,
  ArrowRight,
  Clock,
  CheckCircle2,
  X,
  Building2,
  ExternalLink,
  Laptop,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getServiceCalls, getQuotations, searchCustomers } from "@/lib/firestore";
import type { ServiceCall, Quotation, Customer } from "@/lib/types";
import { formatIndianPhoneNumber } from "@/lib/utils";

interface GlobalAdminSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalAdminSearchModal({
  open,
  onOpenChange,
}: GlobalAdminSearchModalProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Cached pool for ultra-fast instant 0ms search
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [matchedCustomers, setMatchedCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (open) {
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 50);

      // Pre-warm data if not already fetched
      if (serviceCalls.length === 0) {
        getServiceCalls().then(setServiceCalls).catch(() => {});
      }
      if (quotations.length === 0) {
        getQuotations().then(setQuotations).catch(() => {});
      }
    } else {
      setQuery("");
      setMatchedCustomers([]);
    }
  }, [open]);

  // Debounced search for customers
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setMatchedCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const custs = await searchCustomers(q, 8);
        setMatchedCustomers(custs);
      } catch {
        setMatchedCustomers([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Matched Service Calls
  const matchedServiceCalls = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const qDigits = q.replace(/\D/g, "");

    return serviceCalls
      .filter((sc) => {
        if (sc.isDeleted) return false;
        const ticket = (sc.ticketNo || "").toLowerCase();
        const name = (sc.customerName || "").toLowerCase();
        const phone = (sc.customerPhone || "").replace(/\D/g, "");
        const device = (sc.deviceCategory || "").toLowerCase();
        const model = (sc.modelNumber || "").toLowerCase();
        const serial = (sc.serialNumber || "").toLowerCase();

        return (
          ticket.includes(q) ||
          name.includes(q) ||
          device.includes(q) ||
          model.includes(q) ||
          serial.includes(q) ||
          (qDigits && phone.includes(qDigits))
        );
      })
      .slice(0, 6);
  }, [query, serviceCalls]);

  // Matched Quotations
  const matchedQuotations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const qDigits = q.replace(/\D/g, "");

    return quotations
      .filter((qt) => {
        const no = (qt.quotationNo || "").toLowerCase();
        const name = (qt.customerName || "").toLowerCase();
        const phone = (qt.customerPhone || "").replace(/\D/g, "");

        return (
          no.includes(q) ||
          name.includes(q) ||
          (qDigits && phone.includes(qDigits))
        );
      })
      .slice(0, 5);
  }, [query, quotations]);


  const scCount = matchedServiceCalls.length;
  const custCount = matchedCustomers.length;
  const qtCount = matchedQuotations.length;
  const totalResults = scCount + custCount + qtCount;

  const [selectedNavIndex, setSelectedNavIndex] = useState(0);

  // Clamp selection when search results change
  useEffect(() => {
    if (totalResults === 0) {
      setSelectedNavIndex(0);
    } else if (selectedNavIndex >= totalResults) {
      setSelectedNavIndex(Math.max(0, totalResults - 1));
    }
  }, [totalResults, selectedNavIndex]);

  // Auto-scroll highlighted result into view
  useEffect(() => {
    if (totalResults > 0) {
      const el = document.getElementById(`omnisearch-item-${selectedNavIndex}`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedNavIndex, totalResults]);

  const handleSelectServiceCall = (id: string) => {
    onOpenChange(false);
    navigate(`/admin/service-calls/${id}/edit`);
  };

  const handleSelectCustomer = (id: string) => {
    onOpenChange(false);
    navigate(`/admin/customers/${id}`);
  };

  const handleSelectQuotation = (id: string) => {
    onOpenChange(false);
    navigate(`/admin/quotations/${id}/edit`);
  };

  const handleActivateCurrent = (indexToActivate: number = selectedNavIndex) => {
    if (totalResults === 0 || indexToActivate < 0 || indexToActivate >= totalResults) return;

    if (indexToActivate < scCount) {
      const item = matchedServiceCalls[indexToActivate];
      if (item) handleSelectServiceCall(item.id);
    } else if (indexToActivate < scCount + custCount) {
      const custIdx = indexToActivate - scCount;
      const item = matchedCustomers[custIdx];
      if (item) handleSelectCustomer(item.id);
    } else {
      const qtIdx = indexToActivate - scCount - custCount;
      const item = matchedQuotations[qtIdx];
      if (item) handleSelectQuotation(item.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (totalResults === 0) return;

    // 1. Enter: Open active result
    if (e.key === "Enter") {
      e.preventDefault();
      handleActivateCurrent(selectedNavIndex);
      return;
    }

    const isDesktopTwoCol = typeof window !== "undefined" && window.innerWidth >= 640 && custCount > 1;

    // 2. ArrowDown: Navigate vertically down through sections
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedNavIndex((prev) => {
        // A. Inside Service Calls
        if (prev < scCount) {
          if (prev + 1 < scCount) return prev + 1;
          // Jump to Customers if present, else Quotations
          if (custCount > 0) return scCount;
          if (qtCount > 0) return scCount + custCount;
          return prev;
        }

        // B. Inside Customers (2-column grid on desktop, 1-col on mobile)
        if (prev < scCount + custCount) {
          const cIdx = prev - scCount;
          if (isDesktopTwoCol) {
            // Move down one row (+2)
            if (cIdx + 2 < custCount) return scCount + cIdx + 2;
            // If on bottom row, jump to Quotations if present
            if (qtCount > 0) return scCount + custCount;
            // Otherwise if on left column with single bottom element
            if (cIdx % 2 === 0 && cIdx + 1 < custCount) return scCount + cIdx + 1;
            return prev;
          } else {
            // 1-col mobile
            if (cIdx + 1 < custCount) return scCount + cIdx + 1;
            if (qtCount > 0) return scCount + custCount;
            return prev;
          }
        }

        // C. Inside Quotations
        if (prev < totalResults - 1) {
          return prev + 1;
        }
        return prev;
      });
      return;
    }

    // 3. ArrowUp: Navigate vertically up through sections
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedNavIndex((prev) => {
        // A. Inside Quotations
        if (prev >= scCount + custCount) {
          const qIdx = prev - scCount - custCount;
          if (qIdx > 0) return prev - 1;
          // Jump up to Customers if present
          if (custCount > 0) {
            if (isDesktopTwoCol) {
              // Jump to bottom row of customers
              const lastIdx = custCount - 1;
              return scCount + lastIdx;
            }
            return scCount + custCount - 1;
          }
          // Else jump to Service Calls
          if (scCount > 0) return scCount - 1;
          return prev;
        }

        // B. Inside Customers
        if (prev >= scCount) {
          const cIdx = prev - scCount;
          if (isDesktopTwoCol) {
            // Move up one row (-2)
            if (cIdx - 2 >= 0) return scCount + cIdx - 2;
            // Jump to last Service Call
            if (scCount > 0) return scCount - 1;
            return prev;
          } else {
            // 1-col mobile
            if (cIdx - 1 >= 0) return scCount + cIdx - 1;
            if (scCount > 0) return scCount - 1;
            return prev;
          }
        }

        // C. Inside Service Calls
        if (prev > 0) {
          return prev - 1;
        }
        return prev;
      });
      return;
    }

    // 4. ArrowRight: Move across columns in Customers grid
    if (e.key === "ArrowRight") {
      if (prevIsInCustomers(selectedNavIndex) && isDesktopTwoCol) {
        const cIdx = selectedNavIndex - scCount;
        if (cIdx % 2 === 0 && cIdx + 1 < custCount) {
          e.preventDefault();
          setSelectedNavIndex(scCount + cIdx + 1);
        }
      }
      return;
    }

    // 5. ArrowLeft: Move back across columns in Customers grid
    if (e.key === "ArrowLeft") {
      if (prevIsInCustomers(selectedNavIndex) && isDesktopTwoCol) {
        const cIdx = selectedNavIndex - scCount;
        if (cIdx % 2 === 1) {
          e.preventDefault();
          setSelectedNavIndex(scCount + cIdx - 1);
        }
      }
      return;
    }
  };

  function prevIsInCustomers(idx: number): boolean {
    return idx >= scCount && idx < scCount + custCount;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Global Admin Search</DialogTitle>
        {/* Top Search Input Box */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search phone (e.g. 98260), ticket #, customer, laptop model, or serial..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedNavIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-10 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedNavIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors shadow-2xs shrink-0"
            title="Close (Esc)"
          >
            <span>Esc</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[68vh] overflow-y-auto p-3 space-y-4 text-sm">
          {!query.trim() ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Search className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                Omnisearch: Instant Customer, Ticket & Phone Triage
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Type 4 digits of a mobile number or ticket ID to immediately answer walk-in or telephone inquiries.
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No matching records found for "{query}"
              </p>
              <p className="text-xs text-slate-400">
                Try searching with digits only (e.g. last 4 digits of phone number).
              </p>
            </div>
          ) : (
            <>
              {/* Service Calls Group */}
              {matchedServiceCalls.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Service Calls & Repair Tickets ({matchedServiceCalls.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedServiceCalls.map((sc, idx) => {
                      const navIdx = idx;
                      const isSelected = selectedNavIndex === navIdx;
                      return (
                        <div
                          key={sc.id}
                          id={`omnisearch-item-${navIdx}`}
                          onClick={() => handleSelectServiceCall(sc.id)}
                          onMouseEnter={() => setSelectedNavIndex(navIdx)}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-blue-500 shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/30"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400">
                                {sc.ticketNo}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {sc.customerName}
                              </span>
                              <span className="font-mono text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {formatIndianPhoneNumber(sc.customerPhone)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 truncate">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {sc.deviceCategory}
                              </span>
                              {sc.modelNumber && (
                                <span className="text-slate-500 truncate">
                                  • {sc.modelNumber}
                                </span>
                              )}
                              <span className="text-slate-400 truncate">
                                • {sc.issueDescription}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <div className="text-right">
                              <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                                ₹{(sc.grandTotal || 0).toLocaleString("en-IN")}
                              </div>
                              <span className="inline-block mt-0.5 text-[11px] font-semibold capitalize px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {sc.status.replace(/_/g, " ")}
                              </span>
                            </div>
                            <ArrowRight
                              className={`h-4 w-4 transition-all ${
                                isSelected
                                  ? "text-blue-600 dark:text-blue-400 translate-x-0.5"
                                  : "text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customers Group */}
              {matchedCustomers.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    <Users className="h-3.5 w-3.5" />
                    <span>Customers Master ({matchedCustomers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchedCustomers.map((cust, cIdx) => {
                      const navIdx = scCount + cIdx;
                      const isSelected = selectedNavIndex === navIdx;
                      return (
                        <div
                          key={cust.id}
                          id={`omnisearch-item-${navIdx}`}
                          onClick={() => handleSelectCustomer(cust.id)}
                          onMouseEnter={() => setSelectedNavIndex(navIdx)}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                            isSelected
                              ? "border-purple-500 bg-purple-50/90 dark:bg-purple-950/50 ring-2 ring-purple-500 shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-purple-50/40 dark:hover:bg-purple-950/30"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {cust.name}
                            </p>
                            <p className="font-mono text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-purple-500" />
                              {formatIndianPhoneNumber(cust.phone)}
                            </p>
                            {cust.companyName && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {cust.companyName}
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            className={`h-4 w-4 ml-2 transition-all shrink-0 ${
                              isSelected
                                ? "text-purple-600 dark:text-purple-400 translate-x-0.5"
                                : "text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quotations Group */}
              {matchedQuotations.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Quotations & Price Estimates ({matchedQuotations.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedQuotations.map((qt, qIdx) => {
                      const navIdx = scCount + custCount + qIdx;
                      const isSelected = selectedNavIndex === navIdx;
                      return (
                        <div
                          key={qt.id}
                          id={`omnisearch-item-${navIdx}`}
                          onClick={() => handleSelectQuotation(qt.id)}
                          onMouseEnter={() => setSelectedNavIndex(navIdx)}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 ring-2 ring-emerald-500 shadow-sm"
                              : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                {qt.quotationNo}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {qt.customerName}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-slate-500">
                              📞 {qt.customerPhone} • {qt.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                              ₹{(qt.grandTotal || 0).toLocaleString("en-IN")}
                            </span>
                            <ArrowRight
                              className={`h-4 w-4 transition-all ${
                                isSelected
                                  ? "text-emerald-600 dark:text-emerald-400 translate-x-0.5"
                                  : "text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold">←→</kbd>
              <span>Columns</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold">Enter</kbd>
              <span>Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold">Esc</kbd>
              <span>Close</span>
            </span>
          </div>
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold hidden md:inline">Zorba Fast Counter Triage</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
