import { useEffect } from "react";

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + A (or Cmd + A) -> Accept / Save current screen
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        if (options.onCtrlA) {
          e.preventDefault();
          options.onCtrlA();
          return;
        }
      }

      // Ctrl + F2 -> Change Date
      if ((e.ctrlKey || e.metaKey) && e.key === "F2") {
        e.preventDefault();
        options.onCtrlF2?.();
        return;
      }

      // F2 -> Focus Date field
      if (e.key === "F2") {
        e.preventDefault();
        if (options.onF2) options.onF2();
        else if (options.onCtrlF2) options.onCtrlF2();
        return;
      }

      // Esc -> Close current screen / modal
      if (e.key === "Escape") {
        options.onEsc?.();
        return;
      }

      // F5 -> Replacement Sent to Service Center
      if (e.key === "F5") {
        if (options.onF5) {
          e.preventDefault();
          options.onF5();
          return;
        }
      }

      // F6 -> Replacement Received from Service Center
      if (e.key === "F6") {
        if (options.onF6) {
          e.preventDefault();
          options.onF6();
          return;
        }
      }

      // F8 -> Replacement Product Given to Customer
      if (e.key === "F8") {
        if (options.onF8) {
          e.preventDefault();
          options.onF8();
          return;
        }
      }

      // F9 -> Replacement Product Received from Customer
      if (e.key === "F9") {
        if (options.onF9) {
          e.preventDefault();
          options.onF9();
          return;
        }
      }

      // Alt + C -> Create Customer/Category
      if (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC")) {
        e.preventDefault();
        options.onAltC?.();
        return;
      }
      // Alt + A -> Add new item/service call
      if (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        e.preventDefault();
        options.onAltA?.();
        return;
      }
      // Alt + D -> Delete item/row
      if (e.altKey && (e.key.toLowerCase() === "d" || e.code === "KeyD")) {
        e.preventDefault();
        options.onAltD?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options]);
}
