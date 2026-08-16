import { useState, useEffect, useRef } from "react";
import { Search, Phone, Check, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCustomers } from "@/lib/firestore";
import type { Customer } from "@/lib/types";

interface CustomerTypeaheadProps {
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Customer) => void;
  onAddNewCustomer: () => void;
  className?: string;
  placeholder?: string;
  initialName?: string;
  value?: string;
  onChange?: (name: string) => void;
}

export default function CustomerTypeahead({
  selectedCustomerId,
  onSelectCustomer,
  onAddNewCustomer,
  className = "",
  placeholder = "Search customer by name, phone (e.g. 9589199738), or company...",
  initialName = "",
  value,
  onChange,
}: CustomerTypeaheadProps) {
  const [internalQuery, setInternalQuery] = useState(initialName || value || "");
  const query = value !== undefined ? value : internalQuery;
  const setQuery = (newVal: string) => {
    if (onChange) onChange(newVal);
    setInternalQuery(newVal);
  };

  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync initialName or value if changed externally
  useEffect(() => {
    if (value !== undefined) {
      setInternalQuery(value);
    } else if (initialName && !internalQuery) {
      setInternalQuery(initialName);
    }
  }, [initialName, value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const custs = await searchCustomers(query, 25);
        if (active) {
          setResults(custs);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (cust: Customer) => {
    setQuery(cust.name);
    onSelectCustomer(cust);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query && query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-8 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:bg-white transition-colors"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-1.5 space-y-1">
          {results.length > 0 ? (
            results.map((c, idx) => {
              const isSelected = c.id === selectedCustomerId;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  } ${isSelected ? "border-l-4 border-[#2563EB]" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {c.name}
                      </span>
                      {c.companyName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium truncate">
                          {c.companyName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </span>
                      {c.email && <span className="truncate">{c.email}</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#2563EB] shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              No matching customers found.
            </div>
          )}

          {/* Create Customer CTA at bottom of typeahead */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNewCustomer();
              }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Customer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
