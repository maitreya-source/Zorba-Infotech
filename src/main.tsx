import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// The app is prerendered to static HTML for SEO (see scripts/prerender.mjs), so
// crawlers get fully-rendered pages. On the client we do a normal render over
// that markup rather than hydration — the scroll-in animations mean the initial
// client render intentionally differs from the settled prerendered DOM, which
// would trip hydration. Client rendering keeps the animations and avoids that.
createRoot(document.getElementById("root")!).render(<App />);
