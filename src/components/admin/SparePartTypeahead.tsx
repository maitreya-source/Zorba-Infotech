import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getSparePartsCatalog } from "@/lib/firestore";
import type { SparePartCatalogItem } from "@/lib/types";

interface SparePartTypeaheadProps {
  value: string;
  onChangeName: (name: string) => void;
  onSelectCatalogItem?: (item: SparePartCatalogItem) => void;
  placeholder?: string;
  className?: string;
}

export default function SparePartTypeahead({
  value,
  onChangeName,
  onSelectCatalogItem,
  placeholder = "e.g. Poe Cable for Ip Camera 9 Wire 18 Inch White",
  className = "",
}: SparePartTypeaheadProps) {
  const [catalog, setCatalog] = useState<SparePartCatalogItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSparePartsCatalog().then((list) => {
      setCatalog(list);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = catalog.filter((p) =>
    p.name.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChangeName(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 placeholder:text-slate-500 dark:placeholder:text-slate-400 font-medium"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md p-1 space-y-0.5">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChangeName(item.name);
                if (onSelectCatalogItem) onSelectCatalogItem(item);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium truncate"
            >
              <span className="truncate">{item.name}</span>
              {item.unitPrice > 0 && (
                <span className="text-[11px] font-bold text-[#2563EB] shrink-0 font-display ml-2">
                  ₹{item.unitPrice}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
