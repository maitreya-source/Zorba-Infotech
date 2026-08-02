import { useEffect } from "react";

interface TallyShortcutOptions {
  onAltC?: () => void; // Create New Customer / Category
  onAltA?: () => void; // Add Service Call / Add Row
  onAltD?: () => void; // Delete Selected Row / Entry
  onCtrlA?: () => void; // Save / Submit Form
  onEsc?: () => void;   // Back / Cancel / Close Modal
  onF2?: () => void;    // Focus Date field
}

export function useTallyShortcuts(options: TallyShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + C -> Create Customer/Category
      if (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC")) {
        e.preventDefault();
        options.onAltC?.();
      }
      // Alt + A -> Add new item/service call
      else if (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        e.preventDefault();
        options.onAltA?.();
      }
      // Alt + D -> Delete item/row
      else if (e.altKey && (e.key.toLowerCase() === "d" || e.code === "KeyD")) {
        e.preventDefault();
        options.onAltD?.();
      }
      // Ctrl + A (or Cmd + A if inside form submission context) -> Save / Accept
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && options.onCtrlA) {
        e.preventDefault();
        options.onCtrlA();
      }
      // F2 -> Change Date
      else if (e.key === "F2") {
        e.preventDefault();
        options.onF2?.();
      }
      // Esc -> Back / Cancel
      else if (e.key === "Escape") {
        options.onEsc?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options]);
}
