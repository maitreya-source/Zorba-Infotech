import { useEffect, useRef } from "react";

interface TallyShortcutOptions {
  onAltC?: () => void;  // Create New Customer / Category
  onAltA?: () => void;  // Add Service Call / Add Row
  onAltD?: () => void;  // Delete Selected Row / Entry
  onCtrlA?: () => void; // Accept / Save current screen (Ctrl + A / Cmd + A)
  onEsc?: () => void;   // Close current screen / modal
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
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        if (opts.onCtrlA) {
          e.preventDefault();
          opts.onCtrlA();
          return;
        }
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
        opts.onEsc?.();
        return;
      }

      // F5 -> Replacement Sent to Service Center
      if (e.key === "F5") {
        if (opts.onF5) {
          e.preventDefault();
          opts.onF5();
          return;
        }
      }

      // F6 -> Replacement Received from Service Center
      if (e.key === "F6") {
        if (opts.onF6) {
          e.preventDefault();
          opts.onF6();
          return;
        }
      }

      // F8 -> Replacement Product Given to Customer
      if (e.key === "F8") {
        if (opts.onF8) {
          e.preventDefault();
          opts.onF8();
          return;
        }
      }

      // F9 -> Replacement Product Received from Customer
      if (e.key === "F9") {
        if (opts.onF9) {
          e.preventDefault();
          opts.onF9();
          return;
        }
      }

      // Alt + C -> Create Customer/Category
      if (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC")) {
        e.preventDefault();
        opts.onAltC?.();
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
