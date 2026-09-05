import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// The app is prerendered to static HTML for SEO (see scripts/prerender.mjs), so
// crawlers get fully-rendered pages. On the client we do a normal render over
// that markup rather than hydration — the scroll-in animations mean the initial
// client render intentionally differs from the settled prerendered DOM, which
// would trip hydration. Client rendering keeps the animations and avoids that.

if (typeof window !== "undefined") {
  // Prevent accidental increment/decrement via ArrowUp/ArrowDown on all number inputs globally
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        (e.key === "ArrowUp" || e.key === "ArrowDown") &&
        e.target instanceof HTMLInputElement &&
        e.target.type === "number"
      ) {
        e.preventDefault();
      }
    },
    { capture: true }
  );

  // Prevent accidental change of number values while mouse/trackpad scrolling
  window.addEventListener(
    "wheel",
    () => {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number"
      ) {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

createRoot(document.getElementById("root")!).render(<App />);

