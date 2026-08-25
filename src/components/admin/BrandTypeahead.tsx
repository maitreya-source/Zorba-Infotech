import React, { useState, useEffect, useRef, useMemo } from "react";
import { Sparkles, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchBrandSuggestions,
  FEATURED_QUICK_BRANDS,
  HardwareBrand,
  TOP_HARDWARE_BRANDS,
} from "@/lib/constants";
import { toTitleCase } from "@/lib/utils";

interface BrandTypeaheadProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  showChips?: boolean;
  categoryHint?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "CCTV & Security": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "Printers & Scanners": "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "PC & Laptops": "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "Components & Storage": "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  "Networking & Power": "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  "Peripherals": "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

export default function BrandTypeahead({
  value,
  onChange,
  placeholder = "e.g. Hikvision / HP / Canon / CP Plus / Dell",
  className = "",
  showChips = true,
  categoryHint,
}: BrandTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions: HardwareBrand[] = useMemo(() => {
    return searchBrandSuggestions(value, 30, categoryHint);
  }, [value, categoryHint]);

  // Check if current typed value is an exact match for an existing suggestion
  const exactMatch = TOP_HARDWARE_BRANDS.some(
    (b) => b.name.toLowerCase() === value.trim().toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (brandName: string) => {
    onChange(brandName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex].name);
      } else if (value.trim()) {
        handleSelect(toTitleCase(value.trim()));
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`space-y-1.5 ${className}`}>
      <div className={`relative ${isOpen ? "z-[60]" : "z-10"}`}>
        <div className="relative">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Give user time to click a suggestion before auto title-casing
              setTimeout(() => {
                if (value.trim() && !exactMatch) {
                  const match = TOP_HARDWARE_BRANDS.find(
                    (s) => s.name.toLowerCase() === value.trim().toLowerCase()
                  );
                  if (match) {
                    onChange(match.name);
                  }
                }
              }, 200);
            }}
            className="h-9 text-xs pr-8 rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            tabIndex={-1}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1 space-y-0.5 min-w-[280px]">
            {/* Header info */}
            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>{value.trim() ? "Suggested Brands" : "Top Hardware Brands"}</span>
              <span className="text-[9px] font-normal normal-case text-slate-400">
                Type or select
              </span>
            </div>

            {/* Suggestions list */}
            {suggestions.map((brand, idx) => {
              const isSelected = value.trim().toLowerCase() === brand.name.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={brand.name}
                  type="button"
                  onClick={() => handleSelect(brand.name)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl text-left cursor-pointer transition-colors ${
                    isHighlighted || isSelected
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    <span>{brand.name}</span>
                  </span>

                  <Badge
                    variant="outline"
                    className={`text-[9px] font-medium px-1.5 py-0 rounded-md shrink-0 border ${
                      CATEGORY_COLORS[brand.category] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {brand.category}
                  </Badge>
                </button>
              );
            })}

            {suggestions.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching brands found.
              </div>
            )}

            {/* Custom brand entry option if user typed something not matched */}
            {value.trim() && !exactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(toTitleCase(value.trim()))}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl text-left cursor-pointer bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-semibold border-t border-slate-100 dark:border-slate-800 mt-1"
              >
                <span className="truncate">Use Custom: "{toTitleCase(value.trim())}"</span>
                <Badge variant="outline" className="text-[9px] font-mono">
                  Custom
                </Badge>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick 1-click popular brand chips */}
      {showChips && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mr-0.5">
            <Sparkles className="h-3 w-3 text-amber-500" /> Top Brands:
          </span>
          {FEATURED_QUICK_BRANDS.map((brandName) => {
            const isCurrent = value.trim().toLowerCase() === brandName.toLowerCase();
            return (
              <button
                key={brandName}
                type="button"
                onClick={() => onChange(brandName)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#2563EB] text-white border-blue-600 shadow-2xs"
                    : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 hover:border-blue-300"
                }`}
              >
                {brandName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
