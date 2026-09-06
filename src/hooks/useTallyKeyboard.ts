import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import { useNavigate } from "react-router-dom";

/** Check if an event target is an editable input or textarea */
export function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toUpperCase();
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    const nonText = ["checkbox", "radio", "button", "submit", "reset", "file", "image", "color", "range"];
    return !nonText.includes((input.type || "").toLowerCase());
  }
  return false;
}

/** Check if an element is a navigable form control (input, textarea, select, combobox, or tally field) */
export function isFormNavigableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  // Never treat options or open popper contents as standalone form fields
  if (el.closest('[data-radix-popper-content-wrapper]')) return false;
  if (el.closest('[role="listbox"]')) return false;
  if (el.getAttribute("role") === "option" || el.closest('[role="option"]')) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.getAttribute("tabindex") === "-1" && !el.hasAttribute("data-tally-field")) return false;

  if (isEditableElement(el)) return true;
  const tag = el.tagName.toUpperCase();
  if (tag === "SELECT") return true;
  if (el.getAttribute("role") === "combobox") return true;
  if (el.hasAttribute("data-tally-field")) return true;
  if (el.closest('[role="combobox"]')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// 1. GLOBAL NAVIGATION CHORD HOOK (G -> S, G -> Q, etc.)
// ---------------------------------------------------------------------------

export interface TallyChordRoute {
  key: string;
  label: string;
  path: string;
  description: string;
}

export const DEFAULT_TALLY_ROUTES: TallyChordRoute[] = [
  { key: "s", label: "Service Calls", path: "/admin/service-calls", description: "Repair Tickets & Intake" },
  { key: "q", label: "Quotations", path: "/admin/quotations", description: "Price Estimates & Invoices" },
  { key: "p", label: "Products", path: "/admin/products", description: "Catalog & Stock Inventory" },
  { key: "c", label: "Customers", path: "/admin/customers", description: "Customer Master Directory" },
  { key: "r", label: "Reports", path: "/admin/reports", description: "Daily & Monthly Statements" },
  { key: "i", label: "Inquiries", path: "/admin/inquiries", description: "Website Leads" },
  { key: "j", label: "Job Applications", path: "/admin/job-applications", description: "Careers & Resumes" },
  { key: "t", label: "Team", path: "/admin/team", description: "Staff & Duty Register" },
  { key: "w", label: "Service Centers", path: "/admin/service-centers", description: "Company RMA Centers" },
  { key: "l", label: "Couriers", path: "/admin/couriers", description: "Logistics Partners" },
  { key: "k", label: "Categories", path: "/admin/categories", description: "Product Categories" },
  { key: "y", label: "Tally Live Sync", path: "/admin/tally-sync", description: "Tally XML / Cloud Bridge" },
  { key: "b", label: "Backup & Restore", path: "/admin/backup", description: "System Snapshots" },
];

export interface UseTallyGlobalOptions {
  routes?: TallyChordRoute[];
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
  chordTimeoutMs?: number;
  enabled?: boolean;
}

export function useTallyGlobalNavigation(options: UseTallyGlobalOptions = {}) {
  const navigate = useNavigate();
  const routes = options.routes || DEFAULT_TALLY_ROUTES;
  const timeoutMs = options.chordTimeoutMs || 2500;
  const enabled = options.enabled ?? true;

  const [isChordActive, setIsChordActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelChord = useCallback(() => {
    setIsChordActive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const activateChord = useCallback(() => {
    setIsChordActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsChordActive(false);
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If Chord is active, process second stroke
      if (isChordActive) {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelChord();
          return;
        }

        const pressedKey = e.key.toLowerCase();
        const matched = routes.find((r) => r.key === pressedKey);
        if (matched) {
          e.preventDefault();
          cancelChord();
          navigate(matched.path);
          return;
        }

        // Any other key cancels chord
        cancelChord();
        return;
      }

      const target = e.target as HTMLElement | null;
      const insideInput = isFormNavigableElement(target);

      // 2. Alt + G -> Always triggers Go To chord, even from inside input
      if (e.altKey && (e.key.toLowerCase() === "g" || e.code === "KeyG")) {
        e.preventDefault();
        activateChord();
        return;
      }

      // 3. 'G' without modifier when NOT in input
      if (!insideInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.toLowerCase() === "g" || e.code === "KeyG")) {
        e.preventDefault();
        activateChord();
        return;
      }

      // 4. Ctrl + K / Cmd + K -> Omnisearch
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        options.onOpenSearch?.();
        return;
      }

      // 5. '/' outside input -> Omnisearch
      if (!insideInput && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === "/") {
        e.preventDefault();
        options.onOpenSearch?.();
        return;
      }

      // 6. '?' outside input -> Shortcuts Modal
      if (!insideInput && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === "?") {
        e.preventDefault();
        options.onOpenShortcuts?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, isChordActive, routes, activateChord, cancelChord, navigate, options]);

  return {
    isChordActive,
    cancelChord,
    routes,
  };
}

// ---------------------------------------------------------------------------
// 2. LIST VIEW KEYBOARD NAVIGATION HOOK (ArrowUp/Down, Enter, PageUp/Down, Space)
// ---------------------------------------------------------------------------

export interface UseTallyListOptions<T> {
  items: T[];
  onOpenItem: (item: T, index: number) => void;
  onNewItem?: () => void;
  onDeleteItem?: (item: T, index: number) => void;
  onPrintItem?: (item: T, index: number) => void;
  onWhatsAppItem?: (item: T, index: number) => void;
  onToggleSelect?: (item: T, index: number) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  searchRef?: RefObject<HTMLInputElement | null>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  columns?: number;
  containerRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
  initialIndex?: number;
}

export function useTallyListNavigation<T>({
  items = [] as T[],
  onOpenItem,
  onNewItem,
  onDeleteItem,
  onPrintItem,
  onWhatsAppItem,
  onToggleSelect,
  onPrevPage,
  onNextPage,
  searchRef,
  searchInputRef,
  columns,
  containerRef,
  enabled = true,
  initialIndex = 0,
}: UseTallyListOptions<T>) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const effectiveSearchRef = searchInputRef || searchRef;

  // Sync initialIndex if updated by parent (e.g. stateful return to directory)
  useEffect(() => {
    if (initialIndex !== undefined && initialIndex >= 0) {
      setSelectedIndex(initialIndex);
    }
  }, [initialIndex]);

  // Keep index clamped when items change
  useEffect(() => {
    const len = items?.length || 0;
    if (len === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= len) {
      setSelectedIndex(len - 1);
    }
  }, [items?.length, selectedIndex]);

  // Auto-scroll highlighted row into view
  useEffect(() => {
    const len = items?.length || 0;
    if (!enabled || len === 0) return;
    const root = containerRef?.current || document;
    const el = root.querySelector(`[data-tally-row="${selectedIndex}"]`) as HTMLElement | null;
    if (el && typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch {
        // ignore if not supported
      }
    }
  }, [selectedIndex, enabled, items?.length, containerRef]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const insideSearchInput = effectiveSearchRef?.current && target === effectiveSearchRef.current;
      const insideOtherInput = !insideSearchInput && isEditableElement(target);

      // If user is inside an input other than search, ignore list shortcuts
      if (insideOtherInput) return;

      // Special handling when focus is in the search input
      if (insideSearchInput) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          effectiveSearchRef.current?.blur();
          setSelectedIndex(0);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          effectiveSearchRef.current?.blur();
          return;
        }
        return;
      }

      // Dialog or modal open in DOM? Let dialog handle its own events
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        return;
      }

      // Determine active grid column count dynamically from DOM (or explicit option)
      const getColumns = (): number => {
        if (columns && columns > 0) return columns;
        const root = containerRef?.current || document;
        const el0 = root.querySelector('[data-tally-row="0"]') as HTMLElement | null;
        const el1 = root.querySelector('[data-tally-row="1"]') as HTMLElement | null;
        if (!el0 || !el1) return 1;
        const top0 = el0.getBoundingClientRect().top;
        const top1 = el1.getBoundingClientRect().top;
        if (Math.abs(top0 - top1) > 8) return 1;
        let count = 1;
        while (true) {
          const next = root.querySelector(`[data-tally-row="${count}"]`) as HTMLElement | null;
          if (!next) break;
          if (Math.abs(next.getBoundingClientRect().top - top0) <= 8) {
            count++;
          } else {
            break;
          }
        }
        return Math.max(1, count);
      };

      const cols = getColumns();

      // 1. Arrow Right -> Next Column (in multi-column card grids)
      if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (cols > 1) {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
          return;
        }
      }

      // 2. Arrow Left -> Previous Column (in multi-column card grids)
      if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (cols > 1) {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
      }

      // 3. Arrow Down -> Next Row (or Down by cols in grid)
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (cols > 1) {
            const next = prev + cols;
            return next < items.length ? next : Math.min(items.length - 1, prev + 1);
          }
          return Math.min(items.length - 1, prev + 1);
        });
        return;
      }

      // 4. Arrow Up -> Previous Row (or Up by cols in grid)
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (cols > 1) {
            const prevRow = prev - cols;
            return prevRow >= 0 ? prevRow : Math.max(0, prev - 1);
          }
          return Math.max(0, prev - 1);
        });
        return;
      }

      // 5. Enter -> Open Highlighted Record
      if (e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (items.length > 0 && items[selectedIndex]) {
          e.preventDefault();
          onOpenItem(items[selectedIndex], selectedIndex);
        }
        return;
      }

      // 6. '/' -> Instantly Focus Search Bar
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (effectiveSearchRef?.current) {
          e.preventDefault();
          effectiveSearchRef.current.focus();
          effectiveSearchRef.current.select();
        }
        return;
      }

      // 7. Alt+C / Alt+N / 'Insert' -> Create New Record
      // Plain 'n' and plain 'a' are strictly banished to prevent accidental modals while typing or navigating
      if (
        (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC" || e.key.toLowerCase() === "n" || e.code === "KeyN")) ||
        e.key === "Insert"
      ) {
        e.preventDefault();
        onNewItem?.();
        return;
      }

      // 8. PageUp / '[' -> Previous Page
      if (e.key === "PageUp" || (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "[")) {
        e.preventDefault();
        onPrevPage?.();
        return;
      }

      // 9. PageDown / ']' -> Next Page
      if (e.key === "PageDown" || (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "]")) {
        e.preventDefault();
        onNextPage?.();
        return;
      }

      // 10. Space -> Toggle Row Selection / Status
      if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (items.length > 0 && items[selectedIndex] && onToggleSelect) {
          e.preventDefault();
          onToggleSelect(items[selectedIndex], selectedIndex);
        }
        return;
      }

      // 11. Alt + P -> Print Highlighted Row
      if (e.altKey && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
        if (items.length > 0 && items[selectedIndex] && onPrintItem) {
          e.preventDefault();
          onPrintItem(items[selectedIndex], selectedIndex);
        }
        return;
      }

      // 12. WhatsApp Highlighted Row / Card: 'w', 'W', or Alt+W
      if (
        ((!e.ctrlKey && !e.metaKey && !e.altKey && (e.key.toLowerCase() === "w" || e.code === "KeyW")) ||
         (e.altKey && (e.key.toLowerCase() === "w" || e.code === "KeyW"))) &&
        items.length > 0 &&
        items[selectedIndex] &&
        onWhatsAppItem
      ) {
        e.preventDefault();
        onWhatsAppItem(items[selectedIndex], selectedIndex);
        return;
      }

      // 13. Alt + D / Delete -> Delete Highlighted Row
      if ((e.altKey && (e.key.toLowerCase() === "d" || e.code === "KeyD")) || e.key === "Delete") {
        if (items.length > 0 && items[selectedIndex] && onDeleteItem) {
          e.preventDefault();
          onDeleteItem(items[selectedIndex], selectedIndex);
        }
        return;
      }

      // 14. Alphanumeric typing while navigating list -> focus search bar and start searching
      if (
        effectiveSearchRef?.current &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key.length === 1 &&
        /^[a-zA-Z0-9]$/.test(e.key)
      ) {
        const input = effectiveSearchRef.current;
        e.preventDefault();
        input.focus();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        const currentVal = input.value || "";
        const newVal = currentVal + e.key;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, newVal);
        } else {
          input.value = newVal;
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, items, selectedIndex, onOpenItem, onNewItem, onDeleteItem, onPrintItem, onWhatsAppItem, onToggleSelect, onPrevPage, onNextPage, searchRef]);

  return {
    selectedIndex,
    setSelectedIndex,
    selectedItem: items[selectedIndex],
    isRowSelected: (idx: number) => idx === selectedIndex,
    getRowProps: (idx: number) => ({
      "data-tally-row": idx,
      tabIndex: idx === selectedIndex ? 0 : -1,
      onClick: () => setSelectedIndex(idx),
      onDoubleClick: () => items[idx] && onOpenItem(items[idx], idx),
      className: idx === selectedIndex
        ? "bg-blue-50/90 dark:bg-blue-950/70 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset cursor-pointer transition-all"
        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all",
    }),
  };
}

// ---------------------------------------------------------------------------
// 3. FORM WORKFLOW & VOUCHER ENTRY HOOK (Enter-to-advance, Ctrl+A Save, Esc dirty check)
// ---------------------------------------------------------------------------

export interface UseTallyFormOptions {
  formRef?: RefObject<HTMLFormElement | HTMLDivElement | null>;
  onSave: () => void;
  onEsc?: () => void;
  isDirty?: boolean;
  onConfirmExit?: () => void;
  onAddRow?: () => void;
  onDeleteRow?: () => void;
  onWorkflowModeChange?: (direction: "prev" | "next") => void;
  enabled?: boolean;
}

/** Auto-advance helper: finds next focusable field in the form container and focuses it (skipping tally-skip elements) */
export function advanceToNextFormField(
  currentEl: HTMLElement,
  backwards = false,
  onSave?: () => void,
  customRoot?: HTMLElement | null
) {
  const root = customRoot || currentEl.closest("form") || currentEl.closest('[data-shortcut-container="form"]') || document.body;
  const focusableSelector = [
    'input:not([type="hidden"]):not([disabled]):not([readonly]):not([data-tally-skip]):not([aria-hidden="true"])',
    'select:not([disabled]):not([data-tally-skip]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([readonly]):not([data-tally-skip]):not([aria-hidden="true"])',
    '[role="combobox"]:not([disabled]):not([data-tally-skip]):not([aria-hidden="true"])',
    'button[role="combobox"]:not([disabled]):not([data-tally-skip]):not([aria-hidden="true"])',
    '[data-tally-field]:not([disabled]):not([data-tally-skip]):not([aria-hidden="true"])',
    'button[data-tally-field]:not([disabled]):not([data-tally-skip]):not([aria-hidden="true"])',
  ].join(", ");

  const elements = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    // Exclude hidden selects injected by Radix UI or libraries
    if (el.getAttribute("tabindex") === "-1" && !el.hasAttribute("data-tally-field")) return false;
    if (el.closest('[data-tally-ignore="true"]')) return false;
    if (el.closest('[data-radix-popper-content-wrapper]')) return false;

    // Filter out 0/1px hidden inputs or display none elements in real browsers
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.userAgent.includes("jsdom")) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 && rect.height <= 1) return false;
    }

    return (
      el.offsetParent !== null ||
      (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom"))
    );
  });

  const focusableEl = currentEl.closest<HTMLElement>(focusableSelector) || currentEl;
  let currentIndex = elements.indexOf(focusableEl);
  if (currentIndex === -1) {
    const allEls = Array.from(root.querySelectorAll<HTMLElement>("*"));
    const myPos = allEls.indexOf(currentEl);
    const nextEls = elements.filter((el) => allEls.indexOf(el) > myPos);
    if (nextEls.length > 0) {
      const targetEl = backwards ? nextEls[nextEls.length - 1] : nextEls[0];
      targetEl.focus();
      try {
        targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {}
      if (targetEl instanceof HTMLInputElement && ["text", "number", "tel", "email"].includes(targetEl.type)) {
        targetEl.select();
      }
    }
    return;
  }

  const nextIndex = backwards ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex >= 0 && nextIndex < elements.length) {
    const nextEl = elements[nextIndex];
    nextEl.focus();
    try {
      nextEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      // fallback if scrollIntoView not supported
    }
    if (nextEl instanceof HTMLInputElement && ["text", "number", "tel", "email"].includes(nextEl.type)) {
      nextEl.select();
    }
  } else if (!backwards && currentIndex === elements.length - 1 && onSave) {
    onSave();
  }
}

export function useTallyFormNavigation({
  formRef,
  onSave,
  onEsc,
  isDirty = false,
  onConfirmExit,
  onAddRow,
  onDeleteRow,
  onWorkflowModeChange,
  enabled = true,
}: UseTallyFormOptions) {
  const [showQuitPrompt, setShowQuitPrompt] = useState(false);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // Auto-advance helper: finds next focusable field in the form container
  const advanceToNextField = useCallback((currentEl: HTMLElement, backwards = false) => {
    advanceToNextFormField(currentEl, backwards, onSave, formRef?.current);
  }, [formRef, onSave]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Tally Accept / Save: Ctrl + A (or Cmd + A) from ANY field
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        e.preventDefault();
        e.stopPropagation();
        onSave();
        return;
      }

      // Also support Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        e.stopPropagation();
        onSave();
        return;
      }

      // 2. Quit Prompt Active Handling
      if (showQuitPrompt) {
        // 'Y' or Enter -> Discard & Exit
        if (e.key.toLowerCase() === "y" || e.code === "KeyY" || e.key === "Enter") {
          e.preventDefault();
          setShowQuitPrompt(false);
          onConfirmExit?.();
          return;
        }
        // 'N', 'C', or Esc -> Continue editing
        if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "c" || e.key === "Escape") {
          e.preventDefault();
          setShowQuitPrompt(false);
          return;
        }
        return;
      }

      // 3. Escape Key
      if (e.key === "Escape") {
        // If a modal or dropdown is open in DOM, let Radix UI dialog dismiss itself
        const modalOpen = document.querySelector('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]');
        if (modalOpen) return;

        e.preventDefault();
        if (isDirtyRef.current) {
          setShowQuitPrompt(true);
        } else if (onEsc) {
          onEsc();
        } else if (onConfirmExit) {
          onConfirmExit();
        }
        return;
      }

      // 4. Alt + A -> Add Row / Line Item (if onAddRow exists) OR Save Form (Tally Accept)
      if (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        e.preventDefault();
        if (onAddRow) {
          onAddRow();
        } else {
          onSave();
        }
        return;
      }

      // 5. Alt + D -> Delete Current Row
      if (e.altKey && (e.key.toLowerCase() === "d" || e.code === "KeyD")) {
        e.preventDefault();
        onDeleteRow?.();
        return;
      }

      // 6. Enter-to-advance inside form inputs, selects, and comboboxes
      const target = e.target as HTMLElement | null;
      if (target && isFormNavigableElement(target)) {
        // In TEXTAREA: Enter alone advances to next field; Ctrl+Enter or Shift+Enter inserts newline
        if (target.tagName === "TEXTAREA") {
          if ((e.ctrlKey || e.metaKey || e.shiftKey) && e.key === "Enter") {
            // Allow native multiline newline insertion
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            advanceToNextField(target, false);
            return;
          }
          return;
        }

        // If inside an open combobox/typeahead popup or Radix dropdown (user is picking an option), let user confirm choice
        const isPopupOpen = !!(
          target.getAttribute("aria-expanded") === "true" ||
          target.closest('[aria-expanded="true"]') ||
          document.querySelector('[data-radix-popper-content-wrapper]') ||
          document.querySelector('[data-typeahead-open="true"]') ||
          document.querySelector('[role="listbox"]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[role="option"]')
        );
        if (isPopupOpen) {
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          advanceToNextField(target, e.shiftKey);
          return;
        }
      }

      // 7. Arrow keys for workflow mode switching (when Alt+Arrow is pressed)
      if (onWorkflowModeChange && e.altKey) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          onWorkflowModeChange("next");
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          onWorkflowModeChange("prev");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // capture phase ensures Ctrl+A preempts browser Select All
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, onSave, onEsc, onConfirmExit, onAddRow, onDeleteRow, onWorkflowModeChange, advanceToNextField, showQuitPrompt]);

  return {
    showQuitPrompt,
    setShowQuitPrompt,
    advanceToNextField,
  };
}
