import { useState, useEffect, useRef } from "react";
import { Search, Tag, Check, Loader2, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchProducts, getDeviceModels } from "@/lib/firestore";
import type { Product, DeviceModel } from "@/lib/types";

export interface ModelTypeaheadProps {
  categoryName?: string;
  value: string;
  onChange: (val: string) => void;
  onSelectProduct?: (product: Product) => void;
  placeholder?: string;
  className?: string;
}

export default function ModelTypeahead({
  categoryName,
  value,
  onChange,
  onSelectProduct,
  placeholder = "Search 4000+ catalog products by model no. (e.g. T480, DS-2CD...), name, brand...",
  className = "",
}: ModelTypeaheadProps) {
  const [searchQuery, setSearchQuery] = useState(value ?? "");
  const [results, setResults] = useState<Product[]>([]);
  const [legacyModels, setLegacyModels] = useState<DeviceModel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSearchQuery(value);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch legacy device models for backward compatibility
  useEffect(() => {
    let isMounted = true;
    getDeviceModels(categoryName)
      .then((list) => {
        if (isMounted) setLegacyModels(list);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [categoryName]);

  // Debounced search across catalog (same mechanism as Quotation ProductTypeahead)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const prods = await searchProducts(searchQuery, undefined, 30);
        if (active) {
          // Prioritize items matching the selected category if applicable
          const sorted = [...prods].sort((a, b) => {
            if (categoryName) {
              const aCat = (a.categoryId || (a as any).category || "").toLowerCase();
              const bCat = (b.categoryId || (b as any).category || "").toLowerCase();
              const target = categoryName.toLowerCase();
              const aMatch = aCat === target || aCat.includes(target) || target.includes(aCat);
              const bMatch = bCat === target || bCat.includes(target) || target.includes(bCat);
              if (aMatch && !bMatch) return -1;
              if (!aMatch && bMatch) return 1;
            }
            return 0;
          });
          setResults(sorted);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Error searching products in ModelTypeahead:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, categoryName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelectValue = (chosenText: string, prod?: Product) => {
    const clean = chosenText.trim();
    setSearchQuery(clean);
    onChange(clean);
    if (prod && onSelectProduct) {
      onSelectProduct(prod);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    const totalCount = results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalCount - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalCount - 1));
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        const p = results[activeIndex];
        handleSelectValue(p.model?.trim() || p.name?.trim() || "", p);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Filter legacy models matching query if not already in catalog results
  const matchingLegacy = (searchQuery.trim()
    ? legacyModels.filter(
        (m) =>
          m.modelName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !results.some(
            (p) =>
              p.model?.toLowerCase() === m.modelName.toLowerCase() ||
              p.name?.toLowerCase() === m.modelName.toLowerCase()
          )
      )
    : []
  ).slice(0, 5);

  return (
    <div ref={wrapperRef} className={`relative w-full ${isOpen ? "z-[60]" : "z-10"} ${className}`}>
      <div className="relative w-full">
        <Input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors pr-8 w-full"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-100 min-w-[320px]">
          {results.length > 0 ? (
            results.map((p, idx) => {
              const modelText = p.model?.trim();
              const nameText = p.name?.trim();
              const isSelected =
                value &&
                (value.toLowerCase() === modelText?.toLowerCase() ||
                  value.toLowerCase() === nameText?.toLowerCase());
              const isActive = idx === activeIndex;
              const hasBoth = Boolean(
                modelText &&
                  nameText &&
                  modelText.toLowerCase() !== nameText.toLowerCase()
              );

              return (
                <div
                  key={p.id || idx}
                  onClick={() => handleSelectValue(modelText || nameText || "", p)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer group ${
                    isActive
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                  } ${isSelected ? "border-l-4 border-purple-600 bg-purple-50/40" : ""}`}
                >
                  <div className="min-w-0 flex-1 space-y-1 pr-2">
                    {/* Line 1: Primary identifier (Model if available, or Name) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white leading-snug">
                        {modelText || nameText}
                      </span>
                      {hasBoth && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                          ({nameText})
                        </span>
                      )}
                      {p.brand && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {p.brand}
                        </span>
                      )}
                    </div>

                    {/* Line 2: Category & Model Tags */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {p.categoryId && (
                        <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 text-[10px] font-bold px-1.5 py-0">
                          {p.categoryId}
                        </Badge>
                      )}
                      {modelText && (
                        <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                          <Tag className="h-3 w-3 text-purple-500" /> Model: {modelText}
                        </span>
                      )}
                      {p.price !== null && p.price !== undefined && p.price > 0 && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Select Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasBoth ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={`Pick Model: ${modelText}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (modelText) handleSelectValue(modelText, p);
                          }}
                          className="px-2 py-1 text-[10px] font-mono font-bold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Pick Model
                        </button>
                        <button
                          type="button"
                          title={`Pick Name: ${nameText}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (nameText) handleSelectValue(nameText, p);
                          }}
                          className="px-2 py-1 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Pick Name
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold px-2 py-1 bg-purple-50 dark:bg-purple-950/50 rounded-lg group-hover:bg-purple-100 transition-colors">
                        Select
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-purple-600 shrink-0 ml-1" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-1">
              <Package className="h-4 w-4 text-slate-400" />
              <span>
                {searchQuery.trim()
                  ? `No catalog match for "${searchQuery}". Custom model will be saved.`
                  : "Type to search 4000+ catalog products or enter custom model"}
              </span>
            </div>
          )}

          {/* Legacy Recorded Models Section if any */}
          {matchingLegacy.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span>Previously Saved Models</span>
              </div>
              {matchingLegacy.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectValue(m.modelName)}
                  className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium truncate font-mono cursor-pointer flex items-center justify-between"
                >
                  <span>{m.modelName}</span>
                  {m.categoryName && (
                    <span className="text-[10px] text-slate-400">({m.categoryName})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
