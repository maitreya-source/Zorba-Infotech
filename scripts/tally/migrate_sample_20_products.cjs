const admin = require("firebase-admin");
const fs = require("fs");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "zorba-infotech-web" });
}
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const BRAND_PATTERNS = [
  { pattern: /\b(hp|h\s*p|hewlett|laser\s*tank)\b/i, canonical: "HP" },
  { pattern: /\b(epson|e\s*p\s*s\s*o\s*n)\b/i, canonical: "Epson" },
  { pattern: /\b(canon|c\s*a\s*n\s*o\s*n)\b/i, canonical: "Canon" },
  { pattern: /\b(samsung|s\s*a\s*m\s*s\s*u\s*n\s*g)\b/i, canonical: "Samsung" },
  { pattern: /\b(dell|d\s*e\s*l\s*l)\b/i, canonical: "Dell" },
  { pattern: /\b(lenovo|l\s*e\s*n\s*o\s*v\s*o)\b/i, canonical: "Lenovo" },
  { pattern: /\b(acer|a\s*c\s*e\s*r)\b/i, canonical: "Acer" },
  { pattern: /\b(asus|a\s*s\s*u\s*s)\b/i, canonical: "ASUS" },
  { pattern: /\b(gigabyte|gigabye)\b/i, canonical: "Gigabyte" },
  { pattern: /\b(msi|m\s*s\s*i)\b/i, canonical: "MSI" },
  { pattern: /\b(hikvision|hik\s*vision)\b/i, canonical: "Hikvision" },
  { pattern: /\b(cp\s*plus|c\s*p\s*p\s*l\s*u\s*s)\b/i, canonical: "CP Plus" },
  { pattern: /\b(dahua)\b/i, canonical: "Dahua" },
  { pattern: /\b(trueview)\b/i, canonical: "Trueview" },
  { pattern: /\b(tvs|tvs\s*electronics)\b/i, canonical: "TVS" },
  { pattern: /\b(portronics)\b/i, canonical: "Portronics" },
  { pattern: /\b(quick\s*heal|quickheal)\b/i, canonical: "Quick Heal" },
  { pattern: /\b(zebronics)\b/i, canonical: "Zebronics" },
  { pattern: /\b(lapcare|lapstar)\b/i, canonical: "Lapcare" },
  { pattern: /\b(ant\s*esports)\b/i, canonical: "Ant Esports" },
  { pattern: /\b(formujet|indigo)\b/i, canonical: "Formujet" },
  { pattern: /\b(splashjet)\b/i, canonical: "Splashjet" },
  { pattern: /\b(aarvex)\b/i, canonical: "Aarvex" },
  { pattern: /\b(crucial)\b/i, canonical: "Crucial" },
  { pattern: /\b(sandisk)\b/i, canonical: "SanDisk" },
  { pattern: /\b(western\s*digital|w\s*d|wd\b|sn570|sn580)\b/i, canonical: "Western Digital" },
  { pattern: /\b(seagate)\b/i, canonical: "Seagate" },
  { pattern: /\b(brother)\b/i, canonical: "Brother" },
];

const CATEGORY_MAP = {
  printer: { id: "printer", name: "Printer" },
  "toner-cartridge": { id: "toner-cartridge", name: "Toner / Cartridge" },
  laptop: { id: "laptop", name: "Laptop" },
  "desktop-pc": { id: "desktop-pc", name: "Desktop & PC" },
  "cctv-security": { id: "cctv-security", name: "CCTV & Security" },
  "router-networking": { id: "router-networking", name: "Router & Networking" },
  "monitor-display": { id: "monitor-display", name: "Monitor & Display" },
  "ups-inverter": { id: "ups-inverter", name: "UPS & Inverter" },
  "scanner-billing": { id: "scanner-billing", name: "Scanner & Billing" },
  "biometric-attendance": { id: "biometric-attendance", name: "Biometric & Attendance" },
  accessories: { id: "accessories", name: "Accessories" },
};

function normalizeBrand(rawBrand, itemName) {
  const combined = `${rawBrand || ""} ${itemName || ""}`.trim();
  for (const { pattern, canonical } of BRAND_PATTERNS) {
    if (pattern.test(combined)) return canonical;
  }
  if (rawBrand) {
    const clean = rawBrand.replace(/@\d+%/g, "").replace(/-\s*\d+.*$/, "").trim();
    if (clean.length > 1 && clean.length < 30) return clean;
  }
  return "General";
}

function inferCategoryId(name, rawCat, rawGroup) {
  const text = `${name} ${rawCat || ""} ${rawGroup || ""}`.toLowerCase();
  if (/\b(ink|toner|cartridge|ribbon|refill|opc drum|blade|powder|t003|t001|003|001|057|052|12a|88a|chip)\b/i.test(text)) return "toner-cartridge";
  if (/\b(printer|all in one printer|tank|ecotank|laserjet|deskjet|smart tank|dot matrix|1008|1020|lbp2900|l8180|l3210|l3110)\b/i.test(text)) return "printer";
  if (/\b(laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|inspiron|vostro|aspire|victus|pavilion|7520u)\b/i.test(text)) return "laptop";
  if (/\b(all in one pc|desktop|aio|tower|cabinet|motherboard|cpu|processor|ryzen|intel core|h610|b550|h81)\b/i.test(text)) return "desktop-pc";
  if (/\b(cctv|camera|dvr|nvr|dome|bullet|ptz|hikvision|cp plus|trueview|bnc|dc pin|ds-2cd)\b/i.test(text)) return "cctv-security";
  if (/\b(router|switch|access point|wifi|lan cable|cat6|patch cord|fiber|ont|poe switch)\b/i.test(text)) return "router-networking";
  if (/\b(monitor|tft|led panel|display|screen|interactive panel)\b/i.test(text)) return "monitor-display";
  if (/\b(ups|inverter|battery 12v|exide|luminous|amaron)\b/i.test(text)) return "ups-inverter";
  if (/\b(barcode|scanner|pos|thermal receipt|bill printer)\b/i.test(text)) return "scanner-billing";
  if (/\b(biometric|attendance|fingerprint|face recognition)\b/i.test(text)) return "biometric-attendance";
  return "accessories";
}

function cleanProductName(rawName) {
  if (!rawName) return "";
  return rawName.replace(/@\d+%/g, "").replace(/-\s*[A-Z]\d+-\d*-?/g, "").replace(/\s+/g, " ").replace(/-\s*$/, "").trim();
}

function extractProductModelNumber(name, rawModel) {
  if (rawModel && rawModel.trim().length > 1 && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawModel)) {
    return rawModel.trim();
  }

  // CCTV model
  const cctvMatch = name.match(/\b((?:DS|CP|DH|IPC|NVR|DVR)[\-\s][A-Za-z0-9\-\/]{4,20})\b/i);
  if (cctvMatch) return cctvMatch[1].trim();

  // Laptop / CPU model
  const laptopMatch = name.match(/\b(Ryzen\s+[3579]\s+\d{4}[A-Za-z0-9]*|i[3579][\-\s]\d{4,5}[A-Za-z0-9]*|\b\d{4}[UHFK]\b)\b/i);
  if (laptopMatch) return laptopMatch[1].trim();

  // SSD model
  const ssdMatch = name.match(/\b(SN\d{3}[A-Za-z]*|870\s*EVO|980\s*PRO|970\s*EVO|990\s*PRO|BX500|MX500|SA400)\b/i);
  if (ssdMatch) return ssdMatch[1].trim();

  // Motherboard model
  const mbMatch = name.match(/\b([HBAZ]\d{2,3}[A-Za-z0-9\-]+)\b/i);
  if (mbMatch && !/\b(ML|GM|MM|RPM|GB|TB|MB)\b/i.test(mbMatch[1])) return mbMatch[1].trim();

  // Printer model
  const printerMatch = name.match(/\b(L\d{3,4}|M\d{3,4}|G\d{3,4}|LBP\s*\d{3,4}[A-Za-z]*|DCP[\-\s][A-Za-z0-9]+|1008[A-Za-z]?|1188[A-Za-z]?|1020\s*(?:Plus)?|1005|1010|1018|1022|1108|1200|126a|128fn|2900[A-Za-z]?)\b/i);
  if (printerMatch) return printerMatch[1].trim();

  // Toner / Cartridge code
  const cartMatch = name.match(/\b(?:Toner|Cartridge)\s+([0-9]{2,3}[A-Z]?)\b/i);
  if (cartMatch) return cartMatch[1].trim().toUpperCase();

  return "";
}

function parseStockNumber(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return Math.max(0, val);
  const match = String(val).replace(/,/g, "").match(/[-+]?\d*\.?\d+/);
  return match ? Math.max(0, parseFloat(match[0])) : 0;
}

function normalizeProduct(input) {
  const rawTitle = input.name || input.title || input.tallyName || "";
  const name = cleanProductName(rawTitle);
  const tallyName = input.tallyName || rawTitle;
  const tallyGuid = input.guid || input.tallyGuid || input.id;
  const brand = normalizeBrand(input.parent || input.brand, name);
  const catId = inferCategoryId(name, input.category, input.parent || input.brand);
  const categoryInfo = CATEGORY_MAP[catId] || { id: "accessories", name: "Accessories" };
  
  const model = extractProductModelNumber(name, input.model || input.partNo);
  const itemCode = input.itemCode ? input.itemCode.trim() : "";
  
  const stockCount = parseStockNumber(input.closingBalance !== undefined ? input.closingBalance : input.stockCount);
  const inStock = stockCount > 0;
  const uom = input.uom ? input.uom.trim() : "Nag.";

  return {
    id: tallyGuid,
    name,
    tallyName,
    tallyGuid,
    brand,
    categoryId: categoryInfo.id,
    category: categoryInfo.name,
    model,
    itemCode,
    uom,
    stockCount,
    inStock,
    price: null,
    showPriceOnWebsite: false,
    description: "",
    photoUrl: null,
    warranty: "",
    serviceCenter: "",
    productUrl: "",
    featured: false,
    showOnWebsite: true,
    order: null,
    customFields: [],
    hsnCode: input.hsn || "",
    lastSyncedAt: Date.now(),
    updatedAt: Date.now(),
    createdAt: Date.now()
  };
}

async function migrateSample20() {
  console.log("=== 1. WIPING PRODUCTS FOR CLEAN DIVERSE SAMPLE MIGRATION ===");
  const snap = await db.collection("products").get();
  const deleteBatch = db.batch();
  snap.forEach(d => deleteBatch.delete(d.ref));
  await deleteBatch.commit();
  console.log(`✅ Cleared ${snap.size} documents from products.`);

  console.log("\n=== 2. SELECTING DIVERSE REPRESENTATIVE SAMPLE PRODUCTS ===");
  const rawData = JSON.parse(fs.readFileSync("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_stock_dump.json", "utf-8"));

  const sampleItems = [];
  const selectedGuids = new Set();

  // Pick prominent products across diverse categories (Printers, Laptops, CPUs, SSDs, Toners, Inks, CCTV, Networking)
  const targetKeywords = [
    "1008", "1020", "L8180", "L3210", "2900", "7520U", "1215U", "SN570", "SN580", 
    "88A", "12A", "057", "H610", "DS-2CD", "CP-UVR", "DIR-615", "003 Black", "001 Black", "008 Black", "T480"
  ];

  for (const kw of targetKeywords) {
    for (const item of rawData) {
      if (!item.guid || selectedGuids.has(item.guid)) continue;
      if (item.name && item.name.toLowerCase().includes(kw.toLowerCase())) {
        const norm = normalizeProduct(item);
        sampleItems.push(norm);
        selectedGuids.add(item.guid);
        break;
      }
    }
  }

  // Fill up to 20 if needed
  if (sampleItems.length < 20) {
    for (const item of rawData) {
      if (!item.guid || selectedGuids.has(item.guid)) continue;
      const norm = normalizeProduct(item);
      if (norm.stockCount > 0) {
        sampleItems.push(norm);
        selectedGuids.add(item.guid);
        if (sampleItems.length >= 20) break;
      }
    }
  }

  console.log(`\n=== 3. INGESTING ${sampleItems.length} CLEAN PRODUCTS TO FIRESTORE ===`);
  const writeBatch = db.batch();
  for (const prod of sampleItems) {
    const docRef = db.collection("products").doc(prod.id);
    writeBatch.set(docRef, prod);
  }
  await writeBatch.commit();
  console.log(`✅ Successfully committed batch of ${sampleItems.length} products to Firestore.`);

  console.log("\n=========================================================================================================");
  console.log("📊 20 MIGRATED PRODUCTS (CLEAN & INTELLIGENT MODEL NUMBERS)");
  console.log("=========================================================================================================");
  sampleItems.forEach((p, idx) => {
    const num = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
    console.log(`[${num}] Name  : ${p.name}`);
    console.log(`     Brand : ${p.brand.padEnd(12)} | Category: ${p.categoryId.padEnd(16)} | Model: ${p.model ? p.model : "(None)"}`);
    console.log(`     Stock : ${p.stockCount} ${p.uom} (${p.inStock ? "🟢 In Stock" : "⚪ Out of Stock"})`);
    console.log(`     Price : 🔒 Not Set (Hidden from Website)`);
    console.log(`     (Internal Doc Key: ${p.id.slice(0, 8)}... - NOT shown in table)\n`);
  });

  const reviewPath = "/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/migrated_20_products_review.json";
  fs.writeFileSync(reviewPath, JSON.stringify(sampleItems, null, 2));
}

migrateSample20().catch(console.error);
