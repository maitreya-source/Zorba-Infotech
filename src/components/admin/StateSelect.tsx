import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { INDIAN_STATES, IndianState, searchIndianStates } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StateSelectProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function StateSelect({
  value,
  onChange,
  placeholder = "Select or type state (e.g. MP)",
  className = "",
  disabled = false,
}: StateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value || "");
    setIsTyping(false);
  }, [value]);

  // Show all 36 states/UTs when dropdown is opened, only filter when user actively types a search
  const filteredStates: IndianState[] = useMemo(() => {
    if (!isTyping) {
      return INDIAN_STATES;
    }
    return searchIndianStates(searchTerm);
  }, [searchTerm, isTyping]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsTyping(false);
        // Normalize typed query if it matches a known state or code
        normalizeValue(searchTerm);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm]);

  const normalizeValue = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const match = INDIAN_STATES.find(
      (s) =>
        s.name.toLowerCase() === trimmed.toLowerCase() ||
        s.code.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      setSearchTerm(match.name);
      onChange(match.name);
    } else {
      onChange(trimmed);
    }
  };

  const handleSelect = (state: IndianState) => {
    setSearchTerm(state.name);
    onChange(state.name);
    setIsTyping(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsTyping(false);
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredStates.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredStates.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredStates[highlightedIndex]) {
        handleSelect(filteredStates[highlightedIndex]);
      } else if (filteredStates.length > 0) {
        handleSelect(filteredStates[0]);
      } else {
        normalizeValue(searchTerm);
        setIsTyping(false);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsTyping(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={(e) => {
            setIsTyping(false);
            setIsOpen(true);
            e.target.select();
          }}
          onClick={() => {
            if (!isOpen) {
              setIsTyping(false);
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsTyping(true);
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="h-8 text-xs rounded-lg pr-7 bg-white dark:bg-slate-950 font-medium"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setIsTyping(false);
            setIsOpen((prev) => !prev);
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Toggle Indian states list"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen && "rotate-180 text-blue-600"
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-50 py-1 text-xs">
          {filteredStates.length === 0 ? (
            <div className="p-2.5 text-center text-slate-400 italic text-[11px]">
              No state found. Press Enter to use "{searchTerm}".
            </div>
          ) : (
            filteredStates.map((st, idx) => {
              const isSelected =
                value?.toLowerCase() === st.name.toLowerCase() ||
                value?.toUpperCase() === st.code;
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={st.code}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(st)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 flex items-center justify-between text-[11.5px] transition-colors cursor-pointer",
                    isHighlighted && "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300",
                    !isHighlighted && isSelected && "bg-slate-100 dark:bg-slate-900 font-bold",
                    !isHighlighted && !isSelected && "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold">{st.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {st.code}
                    </span>
                  </span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
