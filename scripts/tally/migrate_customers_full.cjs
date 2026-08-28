const admin = require("firebase-admin");
const fs = require("fs");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "zorba-infotech-web" });
}
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const phoneRegex = /(?:(?:\+?91[\-\s]?)|(?:\b0))?([6-9]\d{9})\b/g;
const leadingCodeRegex = /^\d+\s+/;
const mobilePrefixRegex = /\b(mo|mob|mobile|ph|phone|contact)[\s\:\-\.]*/gi;
const trailingPunctRegex = /[\-,\s/]+$/;
const leadingPunctRegex = /^\s*[\-,\s/]+/;
const multiSpaceRegex = /\s+/g;
const groupCodeRegex = /^(\d+\s*[\-\.]\s*)/;

const spacedNorth = /\bN\s*O\s*R\s*T\s*H\b/gi;
const spacedEast = /\bE\s*A\s*S\s*T\b/gi;
const spacedSouth = /\bS\s*O\s*U\s*T\s*H\b/gi;
const spacedWest = /\bW\s*E\s*S\s*T\b/gi;
const dirPrefix = /^(North|East|South|West)\s*[\-\:]\s*/i;
const debtorsCode = /\s*debtors\s*[\-\:]\s*code[\-\s\d]*/gi;
const debtorsWord = /\s*debtors\b/gi;
const plusSpacing = /\s*\+\s*/g;
const commaSpace = /\s*,\s*/g;
const dashSpace = /\s*-\s*/g;

function toTitleCase(s) {
  if (!s) return "";
  const words = String(s).trim().split(/\s+/);
  return words
    .map((w) => {
      if (w.length <= 3 && w === w.toUpperCase() && !/[aeiou]/i.test(w)) {
        return w; // Keep short acronyms like MP, CRPF, NCC, B2B
      }
      const lower = w.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function extractPhones(text) {
  if (!text) return [];
  const matches = String(text).matchAll(/(?:(?:\+?91[\-\s]?)|(?:\b0))?([6-9]\d{9})\b/g);
  const seen = new Set();
  const phones = [];
  for (const m of matches) {
    const digits = m[1];
    if (digits && digits.length === 10) {
      const formatted = `91${digits}`;
      if (!seen.has(formatted)) {
        seen.add(formatted);
        phones.push(formatted);
      }
    }
  }
  return phones;
}

function cleanCustomerName(raw) {
  if (!raw) return "";
  let name = String(raw).replace(/(?:(?:\+?91[\-\s]?)|(?:\b0))?[6-9]\d{9}\b/g, "");
  name = name.replace(leadingCodeRegex, "");
  name = name.replace(mobilePrefixRegex, "");
  name = name.replace(commaSpace, ", ");
  name = name.replace(dashSpace, " - ");
  name = name.replace(trailingPunctRegex, "");
  name = name.replace(leadingPunctRegex, "");
  name = name.replace(multiSpaceRegex, " ").trim();
  return toTitleCase(name);
}

function normalizeGroupAndAddress(parentGroup) {
  const raw = parentGroup ? String(parentGroup).trim() : "";
  if (!raw || raw.toLowerCase() === "sundry debtors") {
    return { group: "Sundry Debtors", address: "" };
  }

  const codeMatch = raw.match(groupCodeRegex);
  let prefix = "";
  let rest = raw;
  if (codeMatch) {
    prefix = codeMatch[1].replace(/\s+/g, "");
    if (!prefix.endsWith("-")) prefix += "-";
    rest = raw.slice(codeMatch[0].length);
  }

  let g = rest.replace(spacedNorth, "North");
  g = g.replace(spacedEast, "East");
  g = g.replace(spacedSouth, "South");
  g = g.replace(spacedWest, "West");
  g = g.replace(dirPrefix, "");
  g = g.replace(debtorsCode, "");
  g = g.replace(debtorsWord, "");
  g = g.replace(plusSpacing, " + ");
  g = g.replace(trailingPunctRegex, "");
  g = g.replace(leadingPunctRegex, "");
  g = g.replace(multiSpaceRegex, " ").trim();

  const cleanRest = toTitleCase(g);
  const normGroup = prefix ? `${prefix}${cleanRest}` : cleanRest;
  const address = cleanRest;

  return { group: normGroup, address };
}

function extractCity(rawName, parentGroup) {
  const combined = `${rawName || ""} ${parentGroup || ""}`.toLowerCase();
  const knownCities = [
    { key: "neemuch", name: "Neemuch" },
    { key: "jawad", name: "Jawad" },
    { key: "mandsaur", name: "Mandsaur" },
    { key: "manasa", name: "Manasa" },
    { key: "singoli", name: "Singoli" },
    { key: "rampura", name: "Rampura" },
    { key: "ratlam", name: "Ratlam" },
    { key: "nayagaon", name: "Nayagaon" },
    { key: "suvakheda", name: "Suvakheda" },
    { key: "khor", name: "Khor" },
    { key: "bharbhadiya", name: "Bharbhadiya" },
    { key: "indore", name: "Indore" },
    { key: "bhopal", name: "Bhopal" },
  ];
  for (const c of knownCities) {
    if (combined.includes(c.key)) return c.name;
  }
  return "Neemuch";
}

async function migrateCustomers() {
  console.log("===============================================================================");
  console.log("🚀 STARTING FULL TALLY CUSTOMER MIGRATION TO FIRESTORE");
  console.log("===============================================================================");

  const dumpPath = "/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_customers_dump.json";
  console.log(`\n1. Reading Tally Customer Dump: ${dumpPath}...`);
  const rawData = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));
  console.log(`   Found ${rawData.length} total customer records in Tally dump.`);

  const cleanCustomers = [];
  const seenGuids = new Set();
  let phonesFound = 0;
  let gstinsFound = 0;
  const groupStats = {};

  for (const c of rawData) {
    const guid = c.guid ? String(c.guid).trim() : "";
    const rawName = c.name ? String(c.name).trim() : "";
    const parent = c.parentGroup ? String(c.parentGroup).trim() : "";
    const rawGstin = c.gstin ? String(c.gstin).trim().toUpperCase() : "";

    if (!guid || !rawName || seenGuids.has(guid)) continue;
    seenGuids.add(guid);

    const phones = extractPhones(`${rawName} ${c.extraDetail || ""} ${c.narration || ""}`);
    const primaryPhone = phones.length > 0 ? phones[0] : "";
    const additionalPhones = phones.length > 1 ? phones.slice(1) : [];
    if (primaryPhone) phonesFound++;

    const cleanName = cleanCustomerName(rawName) || toTitleCase(rawName);
    const { group: normGroup, address } = normalizeGroupAndAddress(parent);
    const city = extractCity(rawName, parent);
    const gstin = rawGstin.length === 15 ? rawGstin : "";
    if (gstin) gstinsFound++;

    groupStats[normGroup] = (groupStats[normGroup] || 0) + 1;

    const docData = {
      id: guid,
      tallyGuid: guid,
      name: cleanName,
      companyName: cleanName,
      phone: primaryPhone,
      city,
      group: normGroup,
      createdAt: 1787860000000,
      updatedAt: 1787860000000,
    };

    if (address) docData.address = address;
    if (additionalPhones.length > 0) docData.additionalPhones = additionalPhones;
    if (gstin) docData.gstin = gstin;
    if (parent) docData.notes = `Tally Group: ${parent}`;

    cleanCustomers.push(docData);
  }

  console.log(`\n2. Normalized ${cleanCustomers.length} unique customer records:`);
  console.log(`   • Customers with WhatsApp Mobile (+91): ${phonesFound}`);
  console.log(`   • Customers with Valid GSTINs: ${gstinsFound}`);
  console.log(`   • Unique Regional Groups: ${Object.keys(groupStats).length}`);

  // Ingest in batches of 400
  console.log(`\n3. Writing ${cleanCustomers.length} Customers to Firestore in Batches of 400...`);
  const BATCH_SIZE = 400;
  let batchIndex = 0;
  const startTime = Date.now();

  for (let i = 0; i < cleanCustomers.length; i += BATCH_SIZE) {
    batchIndex++;
    const chunk = cleanCustomers.slice(i, i + BATCH_SIZE);
    const writeBatch = db.batch();

    for (const cust of chunk) {
      const docRef = db.collection("customers").doc(cust.id);
      writeBatch.set(docRef, cust, { merge: true });
    }

    await writeBatch.commit();
    const progress = Math.min(i + BATCH_SIZE, cleanCustomers.length);
    console.log(`   ✅ Committed Batch ${batchIndex} (${chunk.length} records) - Total Written: ${progress} / ${cleanCustomers.length} (${Math.round((progress/cleanCustomers.length)*100)}%)`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 CUSTOMER MIGRATION COMPLETE in ${durationSec}s!`);
  console.log(`   Total Customers Migrated: ${cleanCustomers.length}`);
  console.log(`   Total Firestore Writes: ${cleanCustomers.length} ($0.00 cost)`);

  console.log("\n===============================================================================");
  console.log("📊 CUSTOMER DISTRIBUTION BY REGIONAL GROUP:");
  console.log("===============================================================================");
  for (const [g, count] of Object.entries(groupStats).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${g.padEnd(45)}: ${count} customers`);
  }

  // Backup output
  const outPath = "/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/migrated_full_customers_firestore.json";
  fs.writeFileSync(outPath, JSON.stringify(cleanCustomers, null, 2));
  console.log(`\n💾 Saved clean customer manifest to ${outPath}`);
}

migrateCustomers().catch(console.error);
