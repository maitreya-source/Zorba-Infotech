import { useEffect, useRef } from "react";

function isTextField(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toUpperCase();
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    const nonTextTypes = ["checkbox", "radio", "button", "submit", "reset", "file", "image", "color", "range"];
    return !nonTextTypes.includes((input.type || "").toLowerCase());
  }
  return false;
}

interface TallyShortcutOptions {
  onAltC?: (context?: { isProductSection?: boolean; isCustomerSection?: boolean }) => void;  // Create New Customer / Product / Category
  onAltA?: () => void;  // Add Service Call / Add Row
  onAltD?: () => void;  // Delete Selected Row / Entry
  onAltP?: () => void;  // Print Job Card / Quotation
  onAltW?: () => void;  // WhatsApp Dispatch
  onCtrlA?: () => void; // Accept / Save current screen (Ctrl + A / Cmd + A)
  onEsc?: () => void;   // Close current screen / modal
  onC?: () => void;     // Press C to continue / dismiss prompt
  onCtrlF2?: () => void;// Change Date (Ctrl + F2 or F2)
  onF2?: () => void;    // Focus Date field
  onF5?: () => void;    // Replacement Sent to Service Center
  onF6?: () => void;    // Replacement Received from Service Center
  onF8?: () => void;    // Replacement Product Given to Customer
  onF9?: () => void;    // Replacement Product Received from Customer
}

export function useTallyShortcuts(options: TallyShortcutOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const opts = optionsRef.current;
      // Ctrl + A (or Cmd + A) -> Accept / Save current screen
      // If inside a text field, let standard text selection happen normally!
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        if (isTextField(e.target)) {
          return;
        }
        if (opts.onCtrlA) {
          e.preventDefault();
          opts.onCtrlA();
          return;
        }
      }

      // C key -> Continue editing if onC is provided (e.g. when Esc warning is active)
      if (opts.onC && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key.toLowerCase() === "c" || e.code === "KeyC")) {
        e.preventDefault();
        opts.onC();
        return;
      }

      // Ctrl + F2 -> Change Date
      if ((e.ctrlKey || e.metaKey) && e.key === "F2") {
        e.preventDefault();
        opts.onCtrlF2?.();
        return;
      }

      // F2 -> Focus Date field
      if (e.key === "F2") {
        e.preventDefault();
        if (opts.onF2) opts.onF2();
        else if (opts.onCtrlF2) opts.onCtrlF2();
        return;
      }

      // Esc -> Close current screen / modal
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        const insideDialog = target?.closest?.('[role="dialog"], [role="alertdialog"]');
        const openDialogInDom = document.querySelector('[role="dialog"], [role="alertdialog"]');
        if (insideDialog || openDialogInDom) {
          // Allow the modal / dialog itself to handle its own close event without triggering screen-level onEsc
          return;
        }
        opts.onEsc?.();
        return;
      }

      // Alt + 1 -> Stage 1: Received from Customer
      if (e.altKey && (e.key === "1" || e.code === "Digit1")) {
        e.preventDefault();
        opts.onF5?.();
        return;
      }

      // Alt + 2 -> Stage 2: Sent to Service Center
      if (e.altKey && (e.key === "2" || e.code === "Digit2")) {
        e.preventDefault();
        opts.onF6?.();
        return;
      }

      // Alt + 3 -> Stage 3: Received from Service Center
      if (e.altKey && (e.key === "3" || e.code === "Digit3")) {
        e.preventDefault();
        opts.onF8?.();
        return;
      }

      // Alt + 4 -> Stage 4: Delivered to Customer
      if (e.altKey && (e.key === "4" || e.code === "Digit4")) {
        e.preventDefault();
        opts.onF9?.();
        return;
      }

      // Alt + C -> Multi-purpose Create (Customer / Product / Category depending on focus)
      if (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC")) {
        e.preventDefault();
        const activeEl = document.activeElement as HTMLElement | null;
        const isProductSection = Boolean(
          activeEl?.closest?.('[data-shortcut-section="product"]') ||
          activeEl?.closest?.('[data-section="products"]') ||
          activeEl?.closest?.('[data-section="parts"]')
        );
        const isCustomerSection = Boolean(
          activeEl?.closest?.('[data-shortcut-section="customer"]') ||
          activeEl?.closest?.('[data-section="customer"]')
        );
        opts.onAltC?.({ isProductSection, isCustomerSection });
        return;
      }
      // Alt + A -> Add new item/service call
      if (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        e.preventDefault();
        opts.onAltA?.();
        return;
      }
      // Alt + D -> Delete item/row
      if (e.altKey && (e.key.toLowerCase() === "d" || e.code === "KeyD")) {
        e.preventDefault();
        opts.onAltD?.();
        return;
      }
      // Alt + P -> Print Job Card / Quotation
      if (e.altKey && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
        e.preventDefault();
        opts.onAltP?.();
        return;
      }
      // Alt + W -> WhatsApp Dispatch
      if (e.altKey && (e.key.toLowerCase() === "w" || e.code === "KeyW")) {
        e.preventDefault();
        opts.onAltW?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
