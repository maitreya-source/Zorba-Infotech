import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Layers, Tag, X } from "lucide-react";
import { getCategories } from "@/lib/firestore";
import { getIcon } from "@/lib/icons";
import type { Category } from "@/lib/types";

const POPULAR_CHIPS = [
  "Laptops",
  "CCTV 4G SIM",
  "SSD 1TB",
  "RAM DDR4/DDR5",
  "Printers",
  "Gaming PC",
];

const FALLBACK_CATEGORIES: Array<Partial<Category> & { id: string; name: string; iconName?: string; description?: string }> = [
  { id: "laptop", name: "Laptops & Notebooks", iconName: "Laptop", description: "HP, Dell, Lenovo, Asus" },
  { id: "desktop-pc", name: "Desktops & Custom PCs", iconName: "Monitor", description: "Gaming & Office Towers" },
  { id: "cctv-security", name: "CCTV & Security", iconName: "Camera", description: "4G SIM, IP & DVR Systems" },
  { id: "printer", name: "Printers & Scanners", iconName: "Printer", description: "Laser, Inkjet & Thermal" },
  { id: "router-networking", name: "Networking & Fiber", iconName: "Wifi", description: "Routers, Switches & ONTs" },
  { id: "biometric-attendance", name: "Biometrics & Attendance", iconName: "Fingerprint", description: "Mantra, Morpho & Face Rec" },
  { id: "accessories", name: "Components & Storage", iconName: "Cpu", description: "RAM, SSDs, Motherboards" },
];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Array<Partial<Category> & { id: string; name: string; iconName?: string; description?: string }>>(FALLBACK_CATEGORIES);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load categories once into memory (0 additional Firestore reads on typing)
  useEffect(() => {
    getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch(() => {
        // Fallback to FALLBACK_CATEGORIES gracefully
      });
  }, []);

  // Filter categories matching user query
  const filteredCategories = query.trim()
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : categories;

  // Total selectable items (filtered categories + popular chips if no query)
  const selectableItems = [
    ...filteredCategories.map((c) => ({ type: "category" as const, item: c })),
    ...(query.trim() === ""
      ? POPULAR_CHIPS.map((chip) => ({ type: "chip" as const, item: chip }))
      : []),
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < selectableItems.length) {
      const selected = selectableItems[selectedIndex];
      if (selected.type === "category") {
        navigateToCategory((selected.item as Category).id);
        return;
      }
      if (selected.type === "chip") {
        navigateToSearch(selected.item as string);
        return;
      }
    }

    if (query.trim()) {
      navigateToSearch(query.trim());
    } else {
      navigate("/catalog");
      setIsOpen(false);
    }
  };

  const navigateToCategory = (categoryId: string) => {
    navigate(`/catalog?category=${encodeURIComponent(categoryId)}`);
    setIsOpen(false);
  };

  const navigateToSearch = (searchTerm: string) => {
    navigate(`/catalog?search=${encodeURIComponent(searchTerm)}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < selectableItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : selectableItems.length - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Global search shortcut (Ctrl+K, Cmd+K, or '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || ""));
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto z-40">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search categories (Laptops, CCTV, Printers, RAM)..."
          className="h-11 w-full rounded-xl border border-white/20 bg-white pl-11 pr-20 text-xs sm:text-sm text-slate-900 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400/60 placeholder:font-normal"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedIndex(-1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
            <kbd className="px-2 py-0.5 text-[11px] font-semibold font-mono text-slate-600 bg-slate-100 border border-slate-300 rounded shadow-xs">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </div>
        )}
      </form>

      {/* Solid High-Contrast Category-Driven Search Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop dismiss */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-slate-900">
            <div className="max-h-[260px] overflow-y-auto p-2 space-y-2">
              {/* Category Quick Jumps */}
              <div>
                <div className="flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-blue-600" />
                    Categories
                  </span>
                </div>

                <div className="space-y-0.5">
                  {filteredCategories.slice(0, 5).map((cat, idx) => {
                    const Icon = getIcon(cat.iconName);
                    const isSelected = selectedIndex === idx;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => navigateToCategory(cat.id)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white font-bold"
                            : "text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate font-semibold text-xs">{cat.name}</span>
                        </div>

                        <ArrowRight
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isSelected ? "opacity-100 text-white" : "opacity-0 text-slate-400"
                          }`}
                        />
                      </button>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className="px-3 py-3 text-center text-xs text-slate-500">
                      Press <strong>Enter</strong> to search catalog for "{query}".
                    </div>
                  )}
                </div>
              </div>

              {/* Popular Intent Chips */}
              {query.trim() === "" && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="px-2.5 py-0.5 mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Tag className="h-3 w-3 text-amber-500" />
                    Popular Searches
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {POPULAR_CHIPS.map((chip, chipIdx) => {
                      const globalIdx = filteredCategories.length + chipIdx;
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => navigateToSearch(chip)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="bg-slate-50 border-t border-slate-100 px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Press <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700">Enter</kbd> to search
              </span>
              <button
                type="button"
                onClick={() => {
                  navigate("/catalog");
                  setIsOpen(false);
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                Full Catalog →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
