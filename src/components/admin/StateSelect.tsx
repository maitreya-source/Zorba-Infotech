import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X } from "lucide-react";
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
  placeholder = "Select or type state (e.g. MP, Delhi)",
  className = "",
  disabled = false,
}: StateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldSelectAllRef = useRef(false);

  // Sync external value when dropdown is closed (e.g. data load from server or form reset)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || "");
      setIsSearching(false);
    }
  }, [value]);

  // Determine filtered states:
  // When dropdown is opened without typing or search is empty, show all 36 states.
  // When user actively types a query, filter using searchIndianStates (matches both name & 2-letter code).
  const filteredStates: IndianState[] = useMemo(() => {
    if (!isSearching || !searchTerm.trim()) {
      return INDIAN_STATES;
    }
    return searchIndianStates(searchTerm);
  }, [searchTerm, isSearching]);

  // When filtered states change, reset highlighted index to 0 so Enter immediately selects top match
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredStates]);

  // Scroll highlighted item into view during keyboard navigation
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (typeof item?.scrollIntoView === "function") {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const commitState = (stateName: string) => {
    setSearchTerm(stateName);
    setIsSearching(false);
    setIsOpen(false);
    onChange(stateName);
  };

  const normalizeAndCommit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      commitState("");
      return;
    }
    // Match exact code (e.g. "mp" -> "Madhya Pradesh") or exact name
    const match = INDIAN_STATES.find(
      (s) =>
        s.name.toLowerCase() === trimmed.toLowerCase() ||
        s.code.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      commitState(match.name);
    } else {
      // Check prefix/contains search
      const searchResults = searchIndianStates(trimmed);
      if (searchResults.length > 0 && trimmed.length >= 2) {
        commitState(searchResults[0].name);
      } else {
        commitState(trimmed);
      }
    }
  };

  const handleSelect = (st: IndianState) => {
    commitState(st.name);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm("");
    setIsSearching(false);
    onChange("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Close dropdown and normalize state name/code on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (isOpen) {
          normalizeAndCommit(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        setIsSearching(false);
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
        prev > 0 ? prev - 1 : Math.max(0, filteredStates.length - 1)
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredStates.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredStates.length) {
        handleSelect(filteredStates[highlightedIndex]);
      } else {
        normalizeAndCommit(searchTerm);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchTerm(value || "");
      setIsSearching(false);
      setIsOpen(false);
    } else if (e.key === "Tab") {
      if (filteredStates.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredStates.length) {
        handleSelect(filteredStates[highlightedIndex]);
      } else {
        normalizeAndCommit(searchTerm);
      }
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
            setIsOpen(true);
            setIsSearching(false);
            shouldSelectAllRef.current = true;
            e.target.select();
          }}
          onMouseDown={() => {
            if (!isOpen) {
              shouldSelectAllRef.current = true;
            }
          }}
          onMouseUp={(e) => {
            if (shouldSelectAllRef.current) {
              shouldSelectAllRef.current = false;
              e.currentTarget.select();
            }
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            setSearchTerm(nextVal);
            setIsSearching(true);
            setIsOpen(true);
            onChange(nextVal);
          }}
          onKeyDown={handleKeyDown}
          className="h-8 text-xs rounded-lg pr-12 bg-white dark:bg-slate-950 font-medium"
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {searchTerm && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer rounded-full"
              title="Clear state"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
                normalizeAndCommit(searchTerm);
              } else {
                setIsOpen(true);
                setIsSearching(false);
                inputRef.current?.focus();
                inputRef.current?.select();
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer rounded-full"
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
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-50 py-1 text-xs"
        >
          {filteredStates.length === 0 ? (
            <div className="p-2.5 text-center text-slate-400 italic text-[11px]">
              No state found for "{searchTerm}". Press Enter to use as-is.
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
                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
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

