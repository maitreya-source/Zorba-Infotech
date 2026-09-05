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

  const totalResults =
    matchedServiceCalls.length + matchedCustomers.length + matchedQuotations.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Global Admin Search</DialogTitle>
        {/* Top Search Input Box */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search phone (e.g. 98260), ticket #, customer, laptop model, or serial..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-500 bg-slate-200/80 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
            ESC to close
          </kbd>
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
                    {matchedServiceCalls.map((sc) => (
                      <div
                        key={sc.id}
                        onClick={() => handleSelectServiceCall(sc.id)}
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 cursor-pointer transition-all shadow-xs"
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
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
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
                    {matchedCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust.id)}
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/80 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 cursor-pointer transition-all shadow-xs"
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
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all ml-2" />
                      </div>
                    ))}
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
                    {matchedQuotations.map((qt) => (
                      <div
                        key={qt.id}
                        onClick={() => handleSelectQuotation(qt.id)}
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 cursor-pointer transition-all shadow-xs"
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
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Press <strong>ESC</strong> to dismiss or click any item to open.</span>
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">Zorba Fast Counter Triage</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
