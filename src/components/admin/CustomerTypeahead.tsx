import { useState, useEffect, useRef } from "react";
import { Search, Phone, Check, Plus, Loader2, User, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCustomers, getCustomer } from "@/lib/firestore";
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
  placeholder = "Search by customer name, mobile (e.g. 9589199730), or company...",
  initialName = "",
  value,
  onChange,
}: CustomerTypeaheadProps) {
  const [searchQuery, setSearchQuery] = useState(value ?? initialName ?? "");
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSearchQuery(value);
    }
  }, [value]);

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
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const custs = await searchCustomers(searchQuery, 25);
        if (active) {
          setResults(custs);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onChange) onChange(val);
    setIsOpen(true);
  };

  const handleSelect = async (cust: Customer) => {
    setSearchQuery(cust.name);
    if (onChange) onChange(cust.name);
    onSelectCustomer(cust);
    setIsOpen(false);

    // If full address/details not present in slim index, fetch on demand in background
    if (!cust.address && cust.id) {
      try {
        const full = await getCustomer(cust.id);
        if (full) {
          onSelectCustomer(full);
        }
      } catch (err) {
        console.warn("Could not fetch full customer profile:", err);
      }
    }
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
    <div ref={wrapperRef} className={`relative ${isOpen ? "z-[60]" : "z-10"} ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-8 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400/50 dark:placeholder:text-slate-500/40 placeholder:font-normal focus:bg-white transition-colors"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-100 min-w-[300px]">
          {results.length > 0 ? (
            results.map((c, idx) => {
              const isSelected = c.id === selectedCustomerId;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                  } ${isSelected ? "border-l-4 border-blue-600 bg-blue-50/50" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {c.name}
                      </span>
                      {c.companyName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {c.companyName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Phone className="h-3 w-3 text-blue-500" /> {c.phone}
                      </span>
                      {c.email && <span className="truncate text-slate-400">{c.email}</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              No matching customers found for "{searchQuery}".
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
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Customer Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
