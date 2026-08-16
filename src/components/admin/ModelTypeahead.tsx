import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getDeviceModels } from "@/lib/firestore";
import type { DeviceModel } from "@/lib/types";

interface ModelTypeaheadProps {
  categoryName: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ModelTypeahead({
  categoryName,
  value,
  onChange,
  placeholder = "e.g. 2Mp Ip Dome 2.8MM DS-2CD...",
  className = "",
}: ModelTypeaheadProps) {
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDeviceModels(categoryName).then((list) => {
      setModels(list);
    });
  }, [categoryName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = models.filter((m) =>
    m.modelName.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 placeholder:text-slate-500 dark:placeholder:text-slate-400 font-medium"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md p-1 space-y-0.5">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.modelName);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium truncate"
            >
              {m.modelName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
