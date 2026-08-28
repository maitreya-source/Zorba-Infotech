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
  { pattern: /\b(d-link|dlink)\b/i, canonical: "D-Link" },
  { pattern: /\b(tp-link|tplink)\b/i, canonical: "TP-Link" },
  { pattern: /\b(fingers)\b/i, canonical: "FINGERS" },
  { pattern: /\b(logitech)\b/i, canonical: "Logitech" },
  { pattern: /\b(multybyte|multibyte)\b/i, canonical: "Multybyte" },
  { pattern: /\b(ranzz)\b/i, canonical: "RANZZ" },
  { pattern: /\b(novel)\b/i, canonical: "Novel" },
  { pattern: /\b(evm)\b/i, canonical: "EVM" },
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
  if (/\b(ink|toner|cartridge|ribbon|refill|opc drum|blade|powder|t003|t001|003|001|057|052|12a|88a|chip|fuser)\b/i.test(text)) return "toner-cartridge";
  if (/\b(printer|all in one printer|tank|ecotank|laserjet|deskjet|smart tank|dot matrix|1008|1020|lbp2900|l8180|l3210|l3110|1188a)\b/i.test(text)) return "printer";
  if (/\b(laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|inspiron|vostro|latitude|aspire|victus|pavilion|omen|legion|7520u|1215u|15-fc|15-fd|15-eq)\b/i.test(text)) return "laptop";
  if (/\b(all in one pc|desktop|aio|tower|cabinet|motherboard|cpu|processor|ryzen|intel core|i3-|i5-|i7-|i9-|h610|b550|h81)\b/i.test(text)) return "desktop-pc";
  if (/\b(cctv|camera|dvr|nvr|dome|bullet|ptz|hikvision|cp plus|trueview|smps 12v|bnc|dc pin|video balun|ds-2cd|cp-uvr)\b/i.test(text)) return "cctv-security";
  if (/\b(router|switch|access point|wifi|lan cable|cat6|cat5|patch cord|fiber|ont|gpon|epon|poe switch|dir-615)\b/i.test(text)) return "router-networking";
  if (/\b(monitor|tft|led panel|display|screen|interactive panel|touch display|ips)\b/i.test(text)) return "monitor-display";
  if (/\b(ups|inverter|battery 12v|exide|luminous|amaron|power backup)\b/i.test(text)) return "ups-inverter";
  if (/\b(barcode|scanner|pos|thermal receipt|bill printer|pos terminal|cash drawer)\b/i.test(text)) return "scanner-billing";
  if (/\b(biometric|attendance|fingerprint|face recognition|access control)\b/i.test(text)) return "biometric-attendance";
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

  // CCTV & DVR (e.g. DS-2CD1023G2-LIU, CP-UVR-0801F1-IC2)
  const cctvMatch = name.match(/\b((?:DS|CP|DH|IPC|EZVIZ)[\-\s][A-Za-z0-9\-\/]{4,20})\b/i);
  if (cctvMatch) return cctvMatch[1].replace(/dvr\s+/i, "").trim();

  // Laptop series (e.g. 15-FC0155AU, 15-FD0751TU, ThinkPad E14, V15)
  const laptopSeries = name.match(/\b(\d{2}\-[A-Za-z0-9]{4,10}|ThinkPad\s+[A-Za-z0-9]+|IdeaPad\s+[A-Za-z0-9]+|Vostro\s+\d{4}|Inspiron\s+\d{4}|Latitude\s+\d{4})\b/i);
  if (laptopSeries) return laptopSeries[1].trim();

  // CPU / Processor Model (e.g. Ryzen 5 7520U, Core i3-1215U)
  const procMatch = name.match(/\b(Ryzen\s+[3579][\-\s]\d{4}[A-Za-z0-9]*|Core\s+i[3579][\-\s]\d{4,5}[A-Za-z0-9]*|\bi[3579][\-\s]\d{4,5}[A-Za-z0-9]*|\b\d{4}[UHFK]\b)\b/i);
  if (procMatch) return procMatch[1].trim();

  // Motherboard (e.g. H610G, H610M, B550M, H81M)
  const mbMatch = name.match(/\b([HBAZ]\d{2,3}[A-Z0-9\-]*)\b/i);
  if (mbMatch && !/\b(ML|GM|MM|RPM|GB|TB|MB|GEN)\b/i.test(mbMatch[1])) return mbMatch[1].trim();

  // SSD (e.g. SN570, SN580, 870 EVO)
  const ssdMatch = name.match(/\b(SN\d{3}[A-Za-z]*|870\s*EVO|980\s*PRO|970\s*EVO|990\s*PRO|BX500|MX500|SA400)\b/i);
  if (ssdMatch) return ssdMatch[1].trim();

  // Printer / MFP Model (e.g. 1008A, 1188A, 1020 Plus, 1008, 1005, L3210, L8180, LBP2900B)
  const printerMatch = name.match(/\b(L\d{3,4}|M\d{3,4}|G\d{3,4}|LBP\s*\d{3,4}[A-Za-z]*|DCP[\-\s][A-Za-z0-9]+|1008[A-Za-z]?|1188[A-Za-z]?|1020\s*(?:Plus)?|1005|1010|1018|1022|1108|1200|126a|128fn|2900[A-Za-z]?)\b/i);
  if (printerMatch) return printerMatch[1].trim();

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

async function migrateFullInStockCatalog() {
  console.log("===============================================================================");
  console.log("🚀 STARTING FULL IN-STOCK TALLY CATALOG MIGRATION TO FIRESTORE");
  console.log("===============================================================================");

  console.log("\n1. Reading Tally Stock Dump...");
  const rawData = JSON.parse(fs.readFileSync("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_stock_dump.json", "utf-8"));
  console.log(`   Found ${rawData.length} total raw items in Tally dump.`);

  // Filter in-stock items
  const inStockItems = [];
  const seenGuids = new Set();

  for (const it of rawData) {
    if (!it.guid || seenGuids.has(it.guid)) continue;
    const stockCount = parseStockNumber(it.closingBalance);
    if (stockCount > 0) {
      const normalized = normalizeProduct(it);
      inStockItems.push(normalized);
      seenGuids.add(it.guid);
    }
  }

  console.log(`\n2. Filtered In-Stock Items: ${inStockItems.length} unique products.`);

  // Clear existing products collection for clean fresh state
  console.log("\n3. Wiping existing products collection...");
  const snap = await db.collection("products").get();
  console.log(`   Deleting ${snap.size} legacy/sample documents...`);
  
  const deleteBatches = [];
  let currentDeleteBatch = db.batch();
  let deleteCount = 0;

  snap.forEach((d) => {
    currentDeleteBatch.delete(d.ref);
    deleteCount++;
    if (deleteCount % 400 === 0) {
      deleteBatches.push(currentDeleteBatch.commit());
      currentDeleteBatch = db.batch();
    }
  });
  if (deleteCount % 400 !== 0) {
    deleteBatches.push(currentDeleteBatch.commit());
  }
  await Promise.all(deleteBatches);
  console.log("   ✅ Cleared products collection.");

  // Ingest in batches of 400
  console.log(`\n4. Writing ${inStockItems.length} In-Stock Products in Batches of 400...`);
  const BATCH_SIZE = 400;
  let batchIndex = 0;
  const startTime = Date.now();

  for (let i = 0; i < inStockItems.length; i += BATCH_SIZE) {
    batchIndex++;
    const chunk = inStockItems.slice(i, i + BATCH_SIZE);
    const writeBatch = db.batch();

    for (const prod of chunk) {
      const docRef = db.collection("products").doc(prod.id);
      writeBatch.set(docRef, prod);
    }

    await writeBatch.commit();
    console.log(`   ✅ Committed Batch ${batchIndex} (${chunk.length} items) - Total Written: ${Math.min(i + BATCH_SIZE, inStockItems.length)} / ${inStockItems.length}`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 MIGRATION COMPLETE in ${durationSec}s!`);
  console.log(`   Total Products Ingested: ${inStockItems.length}`);
  console.log(`   Total Cost: $0.00 (within Firebase daily free tier of 20,000 writes)`);

  // Category breakdown summary
  const catSummary = {};
  inStockItems.forEach(p => {
    catSummary[p.category] = (catSummary[p.category] || 0) + 1;
  });

  console.log("\n===============================================================================");
  console.log("📊 CATALOG BREAKDOWN BY CATEGORY:");
  console.log("===============================================================================");
  for (const [cat, count] of Object.entries(catSummary).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${cat.padEnd(25)}: ${count} products`);
  }

  // Backup summary for review
  const outPath = "/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/migrated_full_in_stock_catalog.json";
  fs.writeFileSync(outPath, JSON.stringify(inStockItems, null, 2));
  console.log(`\n💾 Saved local manifest to ${outPath}`);
}

migrateFullInStockCatalog().catch(console.error);
