import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TallySyncRules {
  updatedAt: number;
  scrapKeywords: string[];
  exactJunkNames: string[];
  tallyGroupMappings: Record<string, string>; // e.g. "Printers": "printer", "Sundry Debtors": "customer"
  brandRules: Array<{ canonical: string; patterns: string[] }>;
  categoryRules: Array<{
    categoryId: string;
    categoryName: string;
    keywords: string[];
    negativeKeywords?: string[];
  }>;
}

export const DEFAULT_TALLY_RULES: TallySyncRules = {
  updatedAt: Date.now(),
  scrapKeywords: [
    "scrap", "old ", "old item", "second hand", "old printer", "old ram", "old cabinet",
    "old ups", "old led", "old motherboard", "old power supply", "old broadband",
    "old ont", "old adapter", "old battery", "old laminator", "old note book",
    "service repair", "repair charge", "installation charge", "labour charge",
    "courier charge", "freight", "maintenance charge", "service charge", "sms pack",
    "demo item", "demo", "sample", "testing", "replacement", "for replacement",
    "gst sales", "gst purchase", "gst sale"
  ],
  exactJunkNames: [
    "gst purchase @ 18% item", "gst purchase @ 12 % item", "gst purchase @ 28 % item",
    "gst purchase @ 5%", "gst sales @ 28 %", "gst sales @28% with quantity",
    "gst sales & services @ 12%", "gst sales & services @ 18%", "gst sales peripherals- 84716060",
    "gst sales patch cord cable", "gst sales 120 gm powder universal - 37079090",
    "gst sales printer ink tank - 84433100", "gst sales lamination machine", "old items",
    "b b b b 2", "f f f f 6", "g g g g 7", "o o o o  15", "wwww  23", "zzzz  26"
  ],
  tallyGroupMappings: {
    "printers": "printer",
    "printer": "printer",
    "printing consumables": "toner-cartridge",
    "toners": "toner-cartridge",
    "cartridges": "toner-cartridge",
    "laptops": "laptop",
    "laptop": "laptop",
    "desktops": "desktop-pc",
    "desktop pc": "desktop-pc",
    "cctv": "cctv-security",
    "cctv cameras": "cctv-security",
    "security cameras": "cctv-security",
    "networking": "router-networking",
    "routers": "router-networking",
    "switches": "router-networking",
    "monitors": "monitor-display",
    "led monitors": "monitor-display",
    "ups": "ups-inverter",
    "inverters": "ups-inverter",
    "scanners": "scanner-billing",
    "pos": "scanner-billing",
    "biometric": "biometric-attendance",
    "biometrics": "biometric-attendance",
    "processors": "processor",
    "cpu": "processor",
    "accessories": "accessories"
  },
  brandRules: [
    { canonical: "HP", patterns: ["hp", "hewlett", "laser tank", "smart tank", "deskjet", "laserjet"] },
    { canonical: "Epson", patterns: ["epson", "ecotank", "eco tank"] },
    { canonical: "Canon", patterns: ["canon", "pixma", "imageclass", "lbp"] },
    { canonical: "Samsung", patterns: ["samsung"] },
    { canonical: "Dell", patterns: ["dell", "vostro", "inspiron", "latitude", "optiplex"] },
    { canonical: "Lenovo", patterns: ["lenovo", "thinkpad", "ideapad", "thinkcentre"] },
    { canonical: "Acer", patterns: ["acer", "aspire", "travelmate", "nitro"] },
    { canonical: "ASUS", patterns: ["asus", "zenbook", "vivobook", "tuf", "rog"] },
    { canonical: "Apple", patterns: ["apple", "macbook", "ipad", "iphone"] },
    { canonical: "Gigabyte", patterns: ["gigabyte", "gigabye"] },
    { canonical: "MSI", patterns: ["msi"] },
    { canonical: "ASRock", patterns: ["asrock"] },
    { canonical: "Intel", patterns: ["intel", "core i3", "core i5", "core i7", "core i9", "pentium", "celeron"] },
    { canonical: "AMD", patterns: ["amd", "ryzen", "radeon"] },
    { canonical: "Western Digital", patterns: ["western digital", "wd", "sn570", "sn580", "sn770", "purple surveillance", "red nas"] },
    { canonical: "Seagate", patterns: ["seagate", "barracuda", "skyhawk", "ironwolf"] },
    { canonical: "SanDisk", patterns: ["sandisk"] },
    { canonical: "Crucial", patterns: ["crucial", "micron"] },
    { canonical: "Kingston", patterns: ["kingston", "fury"] },
    { canonical: "ADATA", patterns: ["adata"] },
    { canonical: "Brother", patterns: ["brother"] },
    { canonical: "Ricoh", patterns: ["ricoh"] },
    { canonical: "TVS", patterns: ["tvs", "tvs electronics"] },
    { canonical: "WeP", patterns: ["wep"] },
    { canonical: "Hikvision", patterns: ["hikvision", "ezviz"] },
    { canonical: "CP Plus", patterns: ["cp plus", "cpplus"] },
    { canonical: "Dahua", patterns: ["dahua"] },
    { canonical: "Trueview", patterns: ["trueview"] },
    { canonical: "TP-Link", patterns: ["tp-link", "tplink", "t-link"] },
    { canonical: "D-Link", patterns: ["d-link", "dlink"] },
    { canonical: "Tenda", patterns: ["tenda"] },
    { canonical: "Digisol", patterns: ["digisol"] },
    { canonical: "Logitech", patterns: ["logitech"] },
    { canonical: "Zebronics", patterns: ["zebronics", "zeb"] },
    { canonical: "Portronics", patterns: ["portronics"] },
    { canonical: "Lapcare", patterns: ["lapcare", "lapstar"] },
    { canonical: "Frontech", patterns: ["frontech"] },
    { canonical: "iBall", patterns: ["iball"] },
    { canonical: "Quantum", patterns: ["quantum", "qhmpl"] },
    { canonical: "FINGERS", patterns: ["fingers"] },
    { canonical: "Formujet", patterns: ["formujet", "indigo"] },
    { canonical: "ProDot", patterns: ["prodot", "pro dot"] },
    { canonical: "Mantra", patterns: ["mantra", "mfs100", "mfs500"] },
    { canonical: "Morpho", patterns: ["morpho"] },
    { canonical: "Quick Heal", patterns: ["quick heal", "quickheal"] },
    { canonical: "Microtek", patterns: ["microtek"] },
    { canonical: "Luminous", patterns: ["luminous"] }
  ],
  categoryRules: [
    {
      categoryId: "processor",
      categoryName: "Processor",
      keywords: ["processor", "cpu", "core i3", "core i5", "core i7", "core i9", "ryzen", "pentium gold", "celeron", "athlon", "12100", "12400", "13100", "13400", "14100", "14400", "5600g", "8500g", "5700g", "3200g"],
      negativeKeywords: ["fan", "cooler", "paste", "heatsink", "cable", "motherboard", "cabinet", "all in one", "desktop"]
    },
    {
      categoryId: "printer",
      categoryName: "Printer",
      keywords: ["printer", "all in one printer", "ecotank", "smart tank", "laserjet", "deskjet", "lbp", "l3210", "l8180", "l3110", "l3310", "l4360", "l6490", "l8050", "l11050", "l130", "1008a", "1008w", "1188a", "1188w", "1020 plus", "1020w", "1005 printer", "dot matrix", "passbook", "dcp-", "hl-", "m126", "mf271", "p1108"],
      negativeKeywords: ["ink", "toner", "cartridge", "powder", "drum", "blade", "cable", "roller", "adapter"]
    },
    {
      categoryId: "toner-cartridge",
      categoryName: "Toner / Cartridge",
      keywords: ["ink", "toner", "tonner", "cartridge", "cartdge", "ribbon", "refill", "opc drum", "wiper blade", "doctor blade", "toner powder", "t003", "t001", "003", "001", "005", "057", "052", "12a", "88a", "cyan", "magenta", "yellow", "black ink", "ink bottle", "waste box"],
      negativeKeywords: ["printer", "adapter", "cable", "toolkit"]
    },
    {
      categoryId: "laptop",
      categoryName: "Laptop",
      keywords: ["laptop", "notebook", "macbook", "thinkpad", "ideapad", "vivobook", "zenbook", "inspiron", "vostro", "latitude", "aspire", "victus", "pavilion", "omen", "legion", "loq", "15-fc", "15-fd", "15-eq", "15-du", "15s-", "14-ep"],
      negativeKeywords: ["bag", "cover", "sleeve", "skin", "adapter", "battery", "keyboard", "screen guard"]
    },
    {
      categoryId: "desktop-pc",
      categoryName: "Desktop & PC",
      keywords: ["motherboard", "h610", "b550", "h81", "h110", "b760", "a520", "b450", "q270", "h55", "h61", "g41", "all in one pc", "desktop pc", "branded pc", "gaming cabinet", "pc cabinet", "ram", "ddr3", "ddr4", "ddr5", "sata hdd", "hard disk", "internal ssd", "nvme ssd", "graphic card", "gtx", "rtx", "gt 710", "gt 730"],
      negativeKeywords: ["bag", "cover", "screws", "converter", "cable", "external"]
    },
    {
      categoryId: "cctv-security",
      categoryName: "CCTV & Security",
      keywords: ["cctv", "camera", "dvr", "nvr", "dome camera", "bullet camera", "ptz", "4g camera", "wifi camera", "solar camera", "hikvision", "cp plus", "trueview", "hi focus", "ezviz", "prama"],
      negativeKeywords: ["cable", "bnc", "connector", "adapter", "dc pin", "stand"]
    },
    {
      categoryId: "router-networking",
      categoryName: "Router & Networking",
      keywords: ["router", "poe switch", "gigabit switch", "access point", "mesh wifi", "ont", "gpon", "epon", "media converter", "patch panel", "server rack", "network rack", "modem", "broadband"],
      negativeKeywords: ["cat6 cable", "patch cord", "rj45", "tool"]
    },
    {
      categoryId: "monitor-display",
      categoryName: "Monitor & Display",
      keywords: ["led monitor", "tft monitor", "desktop monitor", "interactive panel", "projector screen", "projection screen", "projector", "touch display", "ips monitor"],
      negativeKeywords: ["cable", "stand", "mount", "remote"]
    },
    {
      categoryId: "ups-inverter",
      categoryName: "UPS & Inverter",
      keywords: ["ups", "inverter", "microtek legend", "amaron ups", "luminous ups", "mini ups", "mls1255", "u1205", "zeb-u735"],
      negativeKeywords: ["battery only", "cable", "repair"]
    },
    {
      categoryId: "scanner-billing",
      categoryName: "Scanner & Billing",
      keywords: ["barcode scanner", "2d scanner", "pos terminal", "thermal receipt", "bill printer", "currency counting", "currency counter", "cash drawer", "barcode printer", "barcode sticker", "direct thermal", "thermal roll", "billing roll"],
      negativeKeywords: ["cable", "adapter"]
    },
    {
      categoryId: "biometric-attendance",
      categoryName: "Biometric & Attendance",
      keywords: ["biometric", "attendance", "fingerprint", "face recognition", "access control", "morpho", "mantra", "mfs100", "mfs500", "mfs 110", "bioface", "secugen", "startek", "iris scanner"],
      negativeKeywords: ["cable", "stand"]
    },
    {
      categoryId: "accessories",
      categoryName: "Accessories",
      keywords: ["cable", "cord", "adapter", "charger", "mouse", "keyboard", "pad", "headphone", "speaker", "webcam", "toolkit", "case", "sleeve", "caddy", "paste", "power bank", "roller", "gear", "fuser", "blade", "hinge", "battery"],
      negativeKeywords: []
    }
  ]
};

let cachedRules: TallySyncRules = DEFAULT_TALLY_RULES;

export async function fetchTallySyncRules(): Promise<TallySyncRules> {
  try {
    const docRef = doc(db, "settings", "tally_rules");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      cachedRules = { ...DEFAULT_TALLY_RULES, ...snap.data() } as TallySyncRules;
      return cachedRules;
    }
  } catch (err) {
    console.warn("Could not fetch remote tally_rules, using default:", err);
  }
  return cachedRules;
}

export function subscribeTallySyncRules(callback: (rules: TallySyncRules) => void): () => void {
  const docRef = doc(db, "settings", "tally_rules");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      cachedRules = { ...DEFAULT_TALLY_RULES, ...snap.data() } as TallySyncRules;
      callback(cachedRules);
    } else {
      callback(DEFAULT_TALLY_RULES);
    }
  }, (err) => {
    console.warn("Rules listener warning:", err);
    callback(cachedRules);
  });
}

export async function saveTallySyncRules(rules: Partial<TallySyncRules>): Promise<void> {
  const docRef = doc(db, "settings", "tally_rules");
  const merged: TallySyncRules = {
    ...cachedRules,
    ...rules,
    updatedAt: Date.now()
  };
  await setDoc(docRef, merged, { merge: true });
  cachedRules = merged;
}

export function evaluateDynamicProduct(
  name: string,
  rawParent?: string,
  rawBrand?: string,
  rules: TallySyncRules = cachedRules
): {
  isScrap: boolean;
  brand: string;
  categoryId: string;
  categoryName: string;
  reason?: string;
} {
  const text = `${name || ""} ${rawParent || ""} ${rawBrand || ""}`.toLowerCase().trim();
  const lowerName = (name || "").toLowerCase().trim();
  const lowerParent = (rawParent || "").toLowerCase().trim();

  // 1. Exact Junk check
  for (const junk of rules.exactJunkNames) {
    if (lowerName === junk.toLowerCase() || lowerParent === junk.toLowerCase()) {
      return {
        isScrap: true,
        brand: "General",
        categoryId: "accessories",
        categoryName: "Accessories",
        reason: `Matches exact junk keyword: "${junk}"`
      };
    }
  }

  // 2. Scrap keyword check
  for (const kw of rules.scrapKeywords) {
    const lkw = kw.toLowerCase();
    if (text.includes(lkw)) {
      return {
        isScrap: true,
        brand: "General",
        categoryId: "accessories",
        categoryName: "Accessories",
        reason: `Contains scrap / non-product pattern: "${kw}"`
      };
    }
  }

  // 3. Brand evaluation
  let detectedBrand = "General";
  for (const b of rules.brandRules) {
    for (const pat of b.patterns) {
      if (text.includes(pat.toLowerCase())) {
        detectedBrand = b.canonical;
        break;
      }
    }
    if (detectedBrand !== "General") break;
  }

  // 4. Tally StockGroup direct mapping
  if (lowerParent && rules.tallyGroupMappings[lowerParent]) {
    const targetCatId = rules.tallyGroupMappings[lowerParent];
    const catRule = rules.categoryRules.find(c => c.categoryId === targetCatId);
    return {
      isScrap: false,
      brand: detectedBrand,
      categoryId: targetCatId,
      categoryName: catRule ? catRule.categoryName : "General",
      reason: `Mapped directly from Tally StockGroup: "${rawParent}"`
    };
  }

  // 5. Category keyword score evaluation
  let bestCategoryId = "accessories";
  let bestCategoryName = "Accessories";
  let highestScore = 0;

  for (const cat of rules.categoryRules) {
    if (cat.categoryId === "accessories") continue;

    // Check negative keywords first
    if (cat.negativeKeywords && cat.negativeKeywords.length > 0) {
      let blocked = false;
      for (const neg of cat.negativeKeywords) {
        if (text.includes(neg.toLowerCase())) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
    }

    let score = 0;
    for (const kw of cat.keywords) {
      const lkw = kw.toLowerCase();
      if (text.includes(lkw)) {
        // Longer keyword match gives higher score
        score += lkw.length * 2;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCategoryId = cat.categoryId;
      bestCategoryName = cat.categoryName;
    }
  }

  return {
    isScrap: false,
    brand: detectedBrand,
    categoryId: bestCategoryId,
    categoryName: bestCategoryName
  };
}
