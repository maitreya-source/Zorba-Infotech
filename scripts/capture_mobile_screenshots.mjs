#!/usr/bin/env node

/**
 * Automated Mobile & Tablet Screenshotting Suite for Zorba Infotech
 *
 * Captures pixel-perfect screenshots for public pages, admin CRM routes,
 * and key interactive modals/drawers across standard mobile and tablet viewports.
 *
 * Viewports supported:
 *  - Mobile Phone (390x844 - iPhone 14/15/16)
 *  - Mobile Small (375x667 - iPhone SE / compact)
 *  - Tablet Portrait (768x1024 - iPad portrait)
 *  - Tablet Landscape (1024x768 - iPad landscape)
 *
 * Usage:
 *  node scripts/capture_mobile_screenshots.mjs
 *  node scripts/capture_mobile_screenshots.mjs --viewports=mobile_390,tablet_768
 *  node scripts/capture_mobile_screenshots.mjs --pages=admin
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// Configuration & CLI Arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  if (match) return match.split("=")[1];
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return defaultValue;
}
const hasFlag = (name) => args.includes(`--${name}`);

const BASE_URL = getArg("baseUrl", process.env.BASE_URL || "http://localhost:8080");
const OUT_DIR = resolve(PROJECT_ROOT, getArg("outDir", "dist/screenshots"));
const SCALE = Number(getArg("scale", "1"));
const VIEWPORT_ONLY = hasFlag("viewportOnly");
const FULL_ONLY = hasFlag("fullOnly");

// Viewport Definitions
const ALL_VIEWPORTS = {
  mobile_390: {
    id: "mobile_390",
    label: "iPhone 14/15/16 Mobile",
    width: 390,
    height: 844,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
  },
  mobile_375: {
    id: "mobile_375",
    label: "iPhone SE / Compact Mobile",
    width: 375,
    height: 667,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
  },
  tablet_768: {
    id: "tablet_768",
    label: "iPad Portrait Tablet",
    width: 768,
    height: 1024,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
  },
  tablet_1024: {
    id: "tablet_1024",
    label: "iPad Landscape Tablet",
    width: 1024,
    height: 768,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
  },
};

const requestedViewports = getArg("viewports", "all");
const VIEWPORTS =
  requestedViewports === "all"
    ? Object.values(ALL_VIEWPORTS)
    : requestedViewports
        .split(",")
        .map((k) => ALL_VIEWPORTS[k.trim()])
        .filter(Boolean);

// Page Target Definitions
const PAGES = [
  // Admin Core Routes
  {
    id: "admin_service_calls",
    path: "/admin/service-calls",
    title: "Admin Service Calls Dashboard",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_service_call_form",
    path: "/admin/service-calls/new",
    title: "Admin Service Call Form (New)",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_quotations",
    path: "/admin/quotations",
    title: "Admin Quotations Dashboard",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_quotation_form",
    path: "/admin/quotations/new",
    title: "Admin Quotation Form (New)",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_customers",
    path: "/admin/customers",
    title: "Admin Customer Directory",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_customer_detail",
    path: "/admin/customers/sample",
    title: "Admin Customer Detail Profile",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_products",
    path: "/admin/products",
    title: "Admin Products Catalog Management",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_product_form",
    path: "/admin/products/new",
    title: "Admin Product Form (New)",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_reports",
    path: "/admin/reports",
    title: "Admin Daily & Monthly Reports",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_team",
    path: "/admin/team",
    title: "Admin Team & Personnel",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_service_centers",
    path: "/admin/service-centers",
    title: "Admin Service Centers",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_couriers",
    path: "/admin/couriers",
    title: "Admin Couriers & Logistics",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_inquiries",
    path: "/admin/inquiries",
    title: "Admin Website Inquiries",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_job_applications",
    path: "/admin/job-applications",
    title: "Admin Job Applications",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_tally_sync",
    path: "/admin/tally-sync",
    title: "Admin Tally ERP Sync",
    category: "admin",
    requiresAuth: true,
  },
  {
    id: "admin_backup",
    path: "/admin/backup",
    title: "Admin Backup & Restore",
    category: "admin",
    requiresAuth: true,
  },

  // Public Routes
  {
    id: "public_landing",
    path: "/",
    title: "Public Landing Page",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_catalog",
    path: "/catalog",
    title: "Public Product Catalog",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_contact",
    path: "/contact",
    title: "Public Contact Us",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_payments",
    path: "/payments",
    title: "Public Payments & UPI",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_dealers",
    path: "/dealers",
    title: "Public Dealers & Wholesale",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_careers",
    path: "/careers",
    title: "Public Careers & Opportunities",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_terms",
    path: "/terms-of-service",
    title: "Public Terms of Service",
    category: "public",
    requiresAuth: false,
  },
  {
    id: "public_privacy",
    path: "/privacy-policy",
    title: "Public Privacy Policy",
    category: "public",
    requiresAuth: false,
  },
];

const requestedPages = getArg("pages", "all");
const FILTERED_PAGES = PAGES.filter((p) => {
  if (requestedPages === "all") return true;
  if (requestedPages === "admin") return p.category === "admin";
  if (requestedPages === "public") return p.category === "public";
  const list = requestedPages.split(",").map((s) => s.trim());
  return list.includes(p.id) || list.includes(p.path);
});

// Modals to capture
const MODAL_TARGETS = [
  {
    id: "modal_search",
    title: "Admin Global Omnisearch Modal",
    pageUrl: "/admin/service-calls?dev_auth=true",
    trigger: async (page) => {
      const btn = await page.$('button[title*="Search"]');
      if (btn) {
        await btn.click();
      } else {
        await page.keyboard.down("Control");
        await page.keyboard.press("KeyK");
        await page.keyboard.up("Control");
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
    },
    dismiss: async (page) => {
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 150));
    },
  },
  {
    id: "modal_shortcuts",
    title: "Admin Keyboard Shortcuts Modal",
    pageUrl: "/admin/service-calls?dev_auth=true",
    trigger: async (page) => {
      const btn = await page.$('button[title*="Shortcuts"]');
      if (btn) {
        await btn.click();
      } else {
        await page.keyboard.press("?");
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
    },
    dismiss: async (page) => {
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 150));
    },
  },
  {
    id: "drawer_mobile_nav",
    title: "Admin Mobile Navigation Drawer",
    pageUrl: "/admin/service-calls?dev_auth=true",
    mobileOnly: true,
    trigger: async (page) => {
      const btn = await page.$('button[aria-label="Open Menu"]');
      if (btn) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    dismiss: async (page) => {
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 150));
    },
  },
  {
    id: "modal_add_customer",
    title: "Admin Add Customer Modal",
    pageUrl: "/admin/service-calls?dev_auth=true",
    trigger: async (page) => {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) => b.textContent && b.textContent.includes("Add Customer"));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      if (clicked) {
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      }
    },
    dismiss: async (page) => {
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 150));
    },
  },
];

async function setupPageAuthAndBypass(page) {
  await page.evaluateOnNewDocument(() => {
    // AuthContext bypass
    localStorage.setItem("zorba_dev_auth", "true");

    // StaffProfileContext bypass (active duty session for Manish Mulchandani)
    localStorage.setItem(
      "zorba_active_staff_profile_v2",
      JSON.stringify({
        id: "dev-admin-1",
        name: "Manish Mulchandani",
        role: "admin",
        avatar: "penguin",
        email: "manishm9730@gmail.com",
        phone: "+91 94251 06138",
        selectedAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 60 * 1000,
      })
    );
  });
}

async function disableAnimations(page) {
  try {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          transition-duration: 0.001s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });
  } catch {}
}

async function measureContentHeight(page) {
  return await page.evaluate(() => {
    const main = document.querySelector("main");
    if (main) {
      return Math.max(
        main.scrollHeight + 64,
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
    }
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  });
}

async function captureRouteAllViewports(page, target, viewports, manifest) {
  const sep = target.path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${target.path}${target.requiresAuth ? `${sep}dev_auth=true` : ""}`;

  // Initial load at default mobile size
  await page.setViewport({
    width: viewports[0].width,
    height: viewports[0].height,
    deviceScaleFactor: viewports[0].deviceScaleFactor,
    isMobile: viewports[0].isMobile,
    hasTouch: viewports[0].hasTouch,
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (err) {
    console.warn(`    ⚠️ Warning loading ${url}:`, err.message);
  }

  // Ensure React DOM has mounted
  try {
    await page.waitForFunction(
      () => {
        const root = document.getElementById("root");
        return root && root.children.length > 0;
      },
      { timeout: 6000 }
    );
  } catch {}

  await disableAnimations(page);
  await new Promise((r) => setTimeout(r, 200));

  // Now capture for each requested viewport
  for (const vp of viewports) {
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    await new Promise((r) => setTimeout(r, 100));

    // Determine content height for this viewport
    const pageHeight = await measureContentHeight(page);

    // 1. Viewport Screenshot (above the fold)
    if (!FULL_ONLY) {
      const filename = `${target.id}_${vp.id}.png`;
      const filepath = join(OUT_DIR, filename);

      await page.screenshot({ path: filepath, fullPage: false });

      manifest.screenshots.push({
        id: `${target.id}_${vp.id}`,
        filename,
        filepath: filepath.replace(PROJECT_ROOT + "/", ""),
        targetId: target.id,
        title: target.title,
        route: target.path,
        type: "viewport",
        viewport: vp.id,
        width: vp.width,
        height: vp.height,
        pageHeight,
      });
      console.log(`  📸 [viewport] ${filename} (${vp.width}x${vp.height})`);
    }

    // 2. Fullpage Screenshot (entire scrollable content)
    if (!VIEWPORT_ONLY) {
      const filename = `${target.id}_${vp.id}_full.png`;
      const filepath = join(OUT_DIR, filename);

      // Expand viewport to content height to accurately capture fixed/overflow-scroll layouts
      await page.setViewport({
        width: vp.width,
        height: Math.max(vp.height, pageHeight),
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });
      await new Promise((r) => setTimeout(r, 80));

      await page.screenshot({ path: filepath, fullPage: false });

      // Restore original viewport
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });

      manifest.screenshots.push({
        id: `${target.id}_${vp.id}_full`,
        filename,
        filepath: filepath.replace(PROJECT_ROOT + "/", ""),
        targetId: target.id,
        title: `${target.title} (Full Page)`,
        route: target.path,
        type: "fullpage",
        viewport: vp.id,
        width: vp.width,
        height: Math.max(vp.height, pageHeight),
        pageHeight,
      });
      console.log(`  📜 [fullpage] ${filename} (${vp.width}x${Math.max(vp.height, pageHeight)})`);
    }
  }
}

async function captureModal(page, modal, vp, manifest) {
  if (modal.mobileOnly && vp.width >= 768) {
    return; // skip mobile-only drawers on tablets/desktop
  }

  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  });

  const url = `${BASE_URL}${modal.pageUrl}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (err) {
    console.warn(`    ⚠️ Warning loading modal parent ${url}:`, err.message);
  }

  await disableAnimations(page);
  await new Promise((r) => setTimeout(r, 200));

  try {
    await modal.trigger(page);
    await new Promise((r) => setTimeout(r, 200));

    const filename = `${modal.id}_${vp.id}.png`;
    const filepath = join(OUT_DIR, filename);

    await page.screenshot({ path: filepath, fullPage: false });

    manifest.screenshots.push({
      id: `${modal.id}_${vp.id}`,
      filename,
      filepath: filepath.replace(PROJECT_ROOT + "/", ""),
      targetId: modal.id,
      title: modal.title,
      route: modal.pageUrl,
      type: "modal",
      viewport: vp.id,
      width: vp.width,
      height: vp.height,
      pageHeight: vp.height,
    });
    console.log(`  ✨ [modal] ${filename} (${vp.width}x${vp.height})`);

    await modal.dismiss(page);
  } catch (err) {
    console.warn(`    ⚠️ Failed capturing modal ${modal.id} on ${vp.id}:`, err.message);
  }
}

async function main() {
  const startTime = Date.now();
  console.log(`\n========================================================`);
  console.log(`🚀 Zorba Infotech Automated Screenshot Suite`);
  console.log(`========================================================`);
  console.log(`📍 Base URL:       ${BASE_URL}`);
  console.log(`📁 Output Dir:     ${OUT_DIR}`);
  console.log(`📱 Viewports:      ${VIEWPORTS.map((v) => `${v.id} (${v.width}x${v.height})`).join(", ")}`);
  console.log(`📑 Pages count:    ${FILTERED_PAGES.length}`);
  console.log(`✨ Modals count:   ${MODAL_TARGETS.length}`);
  console.log(`⚙️ Mode:           ${VIEWPORT_ONLY ? "Viewport Only" : FULL_ONLY ? "Full Page Only" : "Both (Viewport + Full)"}`);
  console.log(`========================================================\n`);

  await mkdir(OUT_DIR, { recursive: true });

  const manifest = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalScreenshots: 0,
    viewports: ALL_VIEWPORTS,
    screenshots: [],
  };

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await setupPageAuthAndBypass(page);

    // 1. Capture Pages
    for (const target of FILTERED_PAGES) {
      console.log(`\n🔍 Capturing [${target.category.toUpperCase()}] ${target.title} (${target.path}):`);
      await captureRouteAllViewports(page, target, VIEWPORTS, manifest);
    }

    // 2. Capture Modals & Drawers
    if (requestedPages === "all" || requestedPages === "modals") {
      console.log(`\n✨ Capturing Interactive Modals & Drawers:`);
      for (const modal of MODAL_TARGETS) {
        console.log(`\n  👉 Modal: ${modal.title}:`);
        for (const vp of VIEWPORTS) {
          await captureModal(page, modal, vp, manifest);
        }
      }
    }

    manifest.totalScreenshots = manifest.screenshots.length;
    const manifestPath = join(OUT_DIR, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n========================================================`);
    console.log(`✅ Completed in ${elapsed}s!`);
    console.log(`📸 Total Screenshots Captured: ${manifest.totalScreenshots}`);
    console.log(`📄 Manifest Written:           ${manifestPath}`);
    console.log(`========================================================\n`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal error during screenshot execution:", err);
  process.exit(1);
});
