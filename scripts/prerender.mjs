// Static prerenderer for the Zorba Infotech SPA.
//
// After `vite build`, this serves ./dist locally, loads each public route in a
// headless browser, lets React + react-helmet-async render, and writes the
// fully-rendered HTML back to dist/<route>/index.html. This makes titles,
// meta tags and JSON-LD (LocalBusiness, JobPosting, FAQ, Breadcrumb) visible in
// the raw HTML for crawlers and social scrapers that don't execute JavaScript.
//
// Run via `npm run build:seo` (vite build first). Safe to fail without touching
// the plain `vite build` output.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "..", "dist");
const PORT = 4321;

// Public routes to prerender. Admin and dynamic (/catalog/:id) routes are
// intentionally excluded — they aren't meant for organic indexing.
const ROUTES = [
  "/",
  "/products",
  "/catalog",
  "/dealers",
  "/contact",
  "/payments",
  "/careers",
  "/privacy-policy",
  "/terms-of-service",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

// Static server with SPA fallback to index.html and strict directory traversal prevention.
function startServer() {
  return new Promise((resolveServer) => {
    const server = createServer(async (req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0] || "/");
      // Sanitize path against directory traversal
      const safePath = resolve(DIST, "." + urlPath);
      let filePath = safePath;

      if (!safePath.startsWith(DIST) || !(await fileExists(safePath))) {
        filePath = join(DIST, "index.html"); // SPA fallback
      }

      try {
        const data = await readFile(filePath);
        res.setHeader("Content-Type", MIME[extname(filePath)] || "application/octet-stream");
        res.end(data);
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    });
    server.listen(PORT, () => resolveServer(server));
  });
}

async function run() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      const url = `http://localhost:${PORT}${route}`;
      // Pages open live Firestore sockets, so "networkidle" never fires — wait
      // on the DOM instead: document loaded + React has rendered into #root.
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.children.length > 0 && document.title.length > 0;
        },
        { timeout: 45000 }
      );
      // Give react-helmet-async + async content a moment to settle.
      await new Promise((r) => setTimeout(r, 800));

      const html = "<!doctype html>\n" + (await page.evaluate(() => document.documentElement.outerHTML));

      const outDir = route === "/" ? DIST : join(DIST, route);
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, "index.html"), html, "utf-8");
      await page.close();
      console.log(`  prerendered ${route} -> ${join(outDir, "index.html").replace(DIST, "dist")}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().then(
  () => {
    console.log("Prerender complete.");
    process.exit(0);
  },
  (err) => {
    console.error("Prerender failed:", err.message);
    process.exit(1);
  }
);
