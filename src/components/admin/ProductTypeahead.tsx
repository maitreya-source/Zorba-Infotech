import { useState, useEffect, useRef } from "react";
import { Search, Tag, Check, Plus, Loader2, Package, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchProducts } from "@/lib/firestore";
import type { Product } from "@/lib/types";

interface ProductTypeaheadProps {
  selectedProductId?: string;
  onSelectProduct: (product: Product) => void;
  onAddNewProduct?: () => void;
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (name: string) => void;
}

export default function ProductTypeahead({
  selectedProductId,
  onSelectProduct,
  onAddNewProduct,
  className = "",
  placeholder = "Search 4000+ catalog products by name, model (e.g. T480), brand, code...",
  value,
  onChange,
}: ProductTypeaheadProps) {
  const [searchQuery, setSearchQuery] = useState(value ?? "");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Debounced search across catalog
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const prods = await searchProducts(searchQuery, undefined, 25);
        if (active) {
          setResults(prods);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error("Error searching products:", err);
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

  const handleSelect = (prod: Product) => {
    setSearchQuery(prod.name);
    if (onChange) onChange(prod.name);
    onSelectProduct(prod);
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
    <div ref={wrapperRef} className={`relative w-full ${isOpen ? "z-[60]" : "z-10"} ${className}`}>
      <div className="relative w-full">
        <Input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 pr-8 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:bg-white transition-colors w-full"
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
              const isSelected = p.id === selectedProductId;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                  } ${isSelected ? "border-l-4 border-purple-600 bg-purple-50/40" : ""}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Line 1: Product Name & Brand */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white leading-snug">
                        {p.name}
                      </span>
                      {p.brand && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {p.brand}
                        </span>
                      )}
                    </div>

                    {/* Line 2: Category first, then Model, then Price */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {p.categoryId && (
                        <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 text-[10px] font-bold px-1.5 py-0">
                          {p.categoryId}
                        </Badge>
                      )}
                      {p.model && (
                        <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                          <Tag className="h-3 w-3 text-purple-500" /> Model: {p.model}
                        </span>
                      )}
                      {p.price !== null && p.price !== undefined && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold ml-auto">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-purple-600 shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
              <Package className="h-4 w-4 text-slate-300" />
              <span>No matching products found in catalog for "{searchQuery}".</span>
            </div>
          )}

          {/* Create Product CTA at bottom */}
          {onAddNewProduct && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewProduct();
                }}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Catalog Product (Alt+C)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
