/**
 * Canonical Product Normalization Engine for Zorba Infotech
 * Used across:
 *  1. Automated Tally live sync ingestion
 *  2. Admin manual product addition/editing (human ingestion)
 *  3. Catalog search & filtering
 *
 * STRICT INTEGRITY RULES:
 *  - ZERO GUID or raw document hashes exposed in product number or model fields.
 *  - Hardware model extraction identifies genuine OEM product numbers (e.g. 1008, 1188A, L8180, L3210, LBP2900B, SN570, 7520U).
 *  - If not explicitly provided, fields remain empty strings ("") or null.
 *  - Tally closing rates are purchase prices and are NEVER ingested as selling prices.
 */

export interface RawProductInput {
  id?: string;
  name?: string;
  title?: string;
  tallyName?: string;
  tallyGuid?: string;
  brand?: string;
  category?: string;
  categoryId?: string;
  model?: string;
  itemCode?: string;
  partNo?: string;
  uom?: string;
  stockCount?: number | string;
  closingBalance?: string | number;
  price?: number | string | null;
  sellingPrice?: number | string | null;
  description?: string;
  photoUrl?: string | null;
  warranty?: string;
  serviceCenter?: string;
  productUrl?: string;
  inStock?: boolean;
  featured?: boolean;
  showOnWebsite?: boolean;
  showPriceOnWebsite?: boolean;
  order?: number | null;
  customFields?: Array<{ key: string; label: string; value: string }>;
  hsnCode?: string;
  hsn?: string;
}

export interface NormalizedProduct {
  id: string;
  name: string;
  tallyName: string;
  tallyGuid: string | null;
  brand: string;
  categoryId: string;
  categoryName: string;
  model: string;
  itemCode: string;
  uom: string;
  stockCount: number;
  inStock: boolean;
  price: number | null;
  description: string;
  photoUrl: string | null;
  warranty: string;
  serviceCenter: string;
  productUrl: string;
  featured: boolean;
  showOnWebsite: boolean;
  showPriceOnWebsite: boolean;
  order: number | null;
  customFields: Array<{ key: string; label: string; value: string }>;
  hsnCode?: string;
  lastSyncedAt?: number;
  updatedAt: number;
}

// Comprehensive Brand Mapping Dictionary
const BRAND_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  // Top OEM / Global Tech
  { pattern: /\b(hp|hewlett|laser\s*tank|smart\s*tank|deskjet|laserjet|laser\s*jet)\b/i, canonical: "HP" },
  { pattern: /\b(epson|ecotank|eco\s*tank)\b/i, canonical: "Epson" },
  { pattern: /\b(canon|pixma|imageclass|lbp\s*\d+)\b/i, canonical: "Canon" },
  { pattern: /\b(samsung)\b/i, canonical: "Samsung" },
  { pattern: /\b(dell|vostro|inspiron|latitude|optiplex)\b/i, canonical: "Dell" },
  { pattern: /\b(lenovo|thinkpad|ideapad|thinkcentre)\b/i, canonical: "Lenovo" },
  { pattern: /\b(acer|aspire|travelmate|nitro)\b/i, canonical: "Acer" },
  { pattern: /\b(asus|zenbook|vivobook|tuf|rog)\b/i, canonical: "ASUS" },
  { pattern: /\b(apple|macbook|ipad|iphone)\b/i, canonical: "Apple" },
  { pattern: /\b(gigabyte|gigabye)\b/i, canonical: "Gigabyte" },
  { pattern: /\b(msi)\b/i, canonical: "MSI" },
  { pattern: /\b(asrock|a\s*s\s*r\s*o\s*c\s*k)\b/i, canonical: "ASRock" },
  { pattern: /\b(intel|core\s*i[3579]|pentium|celeron)\b/i, canonical: "Intel" },
  { pattern: /\b(amd|ryzen|radeon)\b/i, canonical: "AMD" },
  { pattern: /\b(sony)\b/i, canonical: "Sony" },
  { pattern: /\b(panasonic)\b/i, canonical: "Panasonic" },
  { pattern: /\b(lg)\b/i, canonical: "LG" },
  { pattern: /\b(benq|b\s*e\s*n\s*q)\b/i, canonical: "BenQ" },
  { pattern: /\b(viewsonic)\b/i, canonical: "ViewSonic" },
  { pattern: /\b(toshiba)\b/i, canonical: "Toshiba" },

  // Storage & Memory
  { pattern: /\b(western\s*digital|w\s*d|wd\b|sn570|sn580|sn770|green\s*ssd|blue\s*ssd|purple\s*surveillance|red\s*nas)\b/i, canonical: "Western Digital" },
  { pattern: /\b(seagate|barracuda|skyhawk|ironwolf)\b/i, canonical: "Seagate" },
  { pattern: /\b(sandisk)\b/i, canonical: "SanDisk" },
  { pattern: /\b(crucial|micron)\b/i, canonical: "Crucial" },
  { pattern: /\b(kingston|fury)\b/i, canonical: "Kingston" },
  { pattern: /\b(adata|a\s*data)\b/i, canonical: "ADATA" },
  { pattern: /\b(hynix|sk\s*hynix|h\s*y\s*n\s*i\s*x)\b/i, canonical: "SK Hynix" },
  { pattern: /\b(simtronics)\b/i, canonical: "Simtronics" },
  { pattern: /\b(geonix)\b/i, canonical: "Geonix" },
  { pattern: /\b(consistent|consistant)\b/i, canonical: "Consistent" },

  // Printers & Scanners & Copiers
  { pattern: /\b(brother)\b/i, canonical: "Brother" },
  { pattern: /\b(ricoh|r\s*i\s*c\s*o\s*h)\b/i, canonical: "Ricoh" },
  { pattern: /\b(tvs|tvs\s*electronics|t\s*v\s*s)\b/i, canonical: "TVS" },
  { pattern: /\b(wep)\b/i, canonical: "WeP" },
  { pattern: /\b(lipi)\b/i, canonical: "Lipi" },
  { pattern: /\b(pantum)\b/i, canonical: "Pantum" },
  { pattern: /\b(xerox|x\s*e\s*r\s*o\s*x)\b/i, canonical: "Xerox" },
  { pattern: /\b(konica|minolta|konika)\b/i, canonical: "Konica Minolta" },
  { pattern: /\b(kyocera)\b/i, canonical: "Kyocera" },
  { pattern: /\b(tsc)\b/i, canonical: "TSC" },
  { pattern: /\b(citizen)\b/i, canonical: "Citizen" },
  { pattern: /\b(posiflex)\b/i, canonical: "Posiflex" },
  { pattern: /\b(argox)\b/i, canonical: "Argox" },
  { pattern: /\b(zebra)\b/i, canonical: "Zebra" },
  { pattern: /\b(retsol|ret\s*sol)\b/i, canonical: "Retsol" },

  // CCTV, Security, Surveillance
  { pattern: /\b(hikvision|hik\s*vision)\b/i, canonical: "Hikvision" },
  { pattern: /\b(cp\s*plus|c\s*p\s*p\s*l\s*u\s*s|cpplus)\b/i, canonical: "CP Plus" },
  { pattern: /\b(dahua)\b/i, canonical: "Dahua" },
  { pattern: /\b(trueview|true\s*view)\b/i, canonical: "Trueview" },
  { pattern: /\b(prama)\b/i, canonical: "Prama" },
  { pattern: /\b(secure\s*eye|secureeye)\b/i, canonical: "Secure Eye" },
  { pattern: /\b(hi\s*focus|hifocus)\b/i, canonical: "Hi Focus" },
  { pattern: /\b(active\s*pixel)\b/i, canonical: "Active Pixel" },
  { pattern: /\b(cam\s*angle)\b/i, canonical: "Cam Angle" },
  { pattern: /\b(tvt)\b/i, canonical: "TVT" },
  { pattern: /\b(sparsh)\b/i, canonical: "Sparsh" },
  { pattern: /\b(secure\s*link|securelink)\b/i, canonical: "Secure Link" },

  // Networking & Fiber
  { pattern: /\b(tp\s*link|tplink|t\s*link|t\s*p\s*l\s*i\s*n\s*k)\b/i, canonical: "TP-Link" },
  { pattern: /\b(d\s*link|dlink|d\s*l\s*i\s*n\s*k)\b/i, canonical: "D-Link" },
  { pattern: /\b(tenda)\b/i, canonical: "Tenda" },
  { pattern: /\b(digisol)\b/i, canonical: "Digisol" },
  { pattern: /\b(netgear)\b/i, canonical: "Netgear" },
  { pattern: /\b(mercusys)\b/i, canonical: "Mercusys" },
  { pattern: /\b(syrotech)\b/i, canonical: "Syrotech" },
  { pattern: /\b(cisco)\b/i, canonical: "Cisco" },
  { pattern: /\b(ubiquiti|unifi)\b/i, canonical: "Ubiquiti" },
  { pattern: /\b(micro\s*control)\b/i, canonical: "Micro Control" },
  { pattern: /\b(netrack)\b/i, canonical: "Netrack" },
  { pattern: /\b(adc\s*krone)\b/i, canonical: "ADC Krone" },

  // Peripherals, Accessories & Cables
  { pattern: /\b(logitech)\b/i, canonical: "Logitech" },
  { pattern: /\b(zebronics|zeb\b|zebion)\b/i, canonical: "Zebronics" },
  { pattern: /\b(portronics)\b/i, canonical: "Portronics" },
  { pattern: /\b(lapcare|lapstar)\b/i, canonical: "Lapcare" },
  { pattern: /\b(frontech|f\s*r\s*o\s*n\s*t\s*e\s*c\s*h)\b/i, canonical: "Frontech" },
  { pattern: /\b(iball|i\s*ball|i\s*-\s*b\s*a\s*l\s*l)\b/i, canonical: "iBall" },
  { pattern: /\b(quantum|q\s*u\s*a\s*n\s*t\s*u\s*m|qhmpl)\b/i, canonical: "Quantum" },
  { pattern: /\b(fingers)\b/i, canonical: "FINGERS" },
  { pattern: /\b(intex)\b/i, canonical: "Intex" },
  { pattern: /\b(ant\s*esports)\b/i, canonical: "Ant Esports" },
  { pattern: /\b(cosmic\s*byte)\b/i, canonical: "Cosmic Byte" },
  { pattern: /\b(circle)\b/i, canonical: "Circle" },
  { pattern: /\b(artis)\b/i, canonical: "Artis" },
  { pattern: /\b(amkette|amkett)\b/i, canonical: "Amkette" },
  { pattern: /\b(zoook)\b/i, canonical: "Zoook" },
  { pattern: /\b(multybyte|multibyte)\b/i, canonical: "Multybyte" },
  { pattern: /\b(ranzz|ranz)\b/i, canonical: "RANZZ" },
  { pattern: /\b(novel)\b/i, canonical: "Novel" },
  { pattern: /\b(evm)\b/i, canonical: "EVM" },
  { pattern: /\b(aarvex)\b/i, canonical: "Aarvex" },
  { pattern: /\b(cablet)\b/i, canonical: "Cablet" },
  { pattern: /\b(smart\s*pro)\b/i, canonical: "Smart Pro" },
  { pattern: /\b(coreprix)\b/i, canonical: "Coreprix" },
  { pattern: /\b(dayton|dyton)\b/i, canonical: "Dayton" },
  { pattern: /\b(setmi)\b/i, canonical: "Setmi" },
  { pattern: /\b(ugreen|u\s*green)\b/i, canonical: "UGREEN" },
  { pattern: /\b(bafo)\b/i, canonical: "Bafo" },
  { pattern: /\b(belkin)\b/i, canonical: "Belkin" },
  { pattern: /\b(terabyte)\b/i, canonical: "Terabyte" },
  { pattern: /\b(live\s*tech)\b/i, canonical: "Live Tech" },
  { pattern: /\b(ad\s*net)\b/i, canonical: "Ad Net" },
  { pattern: /\b(linetek)\b/i, canonical: "LineTek" },
  { pattern: /\b(foxin)\b/i, canonical: "Foxin" },
  { pattern: /\b(rapoo)\b/i, canonical: "Rapoo" },
  { pattern: /\b(orico)\b/i, canonical: "ORICO" },
  { pattern: /\b(deep\s*cool|deepcool)\b/i, canonical: "Deepcool" },
  { pattern: /\b(cooler\s*master)\b/i, canonical: "Cooler Master" },
  { pattern: /\b(nzxt)\b/i, canonical: "NZXT" },
  { pattern: /\b(corsair)\b/i, canonical: "Corsair" },
  { pattern: /\b(erd|e\s*r\s*d)\b/i, canonical: "ERD" },
  { pattern: /\b(f&d|f\s*&\s*d)\b/i, canonical: "F&D" },

  // Inks, Toners & Consumables Brands
  { pattern: /\b(formujet|indigo)\b/i, canonical: "Formujet" },
  { pattern: /\b(splashjet)\b/i, canonical: "Splashjet" },
  { pattern: /\b(prodot|pro\s*dot)\b/i, canonical: "ProDot" },
  { pattern: /\b(print\s*star|printstar)\b/i, canonical: "Print Star" },
  { pattern: /\b(jet\s*tech)\b/i, canonical: "Jet Tech" },
  { pattern: /\b(blue\s*streak)\b/i, canonical: "Blue Streak" },
  { pattern: /\b(black\s*kobra)\b/i, canonical: "Black Kobra" },
  { pattern: /\b(odyssey|o\s*d\s*y\s*s\s*s\s*e\s*y)\b/i, canonical: "Odyssey" },
  { pattern: /\b(oddy)\b/i, canonical: "Oddy" },
  { pattern: /\b(desmat)\b/i, canonical: "Desmat" },
  { pattern: /\b(imagestar)\b/i, canonical: "ImageStar" },
  { pattern: /\b(vms)\b/i, canonical: "VMS" },
  { pattern: /\b(growlam)\b/i, canonical: "Growlam" },
  { pattern: /\b(kores)\b/i, canonical: "Kores" },

  // Biometrics
  { pattern: /\b(mantra)\b/i, canonical: "Mantra" },
  { pattern: /\b(morpho)\b/i, canonical: "Morpho" },
  { pattern: /\b(secugen|securegen)\b/i, canonical: "SecuGen" },
  { pattern: /\b(startek)\b/i, canonical: "Startek" },
  { pattern: /\b(mivanta)\b/i, canonical: "Mivanta" },
  { pattern: /\b(morx)\b/i, canonical: "Morx" },
  { pattern: /\b(aratek|aaratek)\b/i, canonical: "Aratek" },

  // Antivirus & Software
  { pattern: /\b(quick\s*heal|quickheal)\b/i, canonical: "Quick Heal" },
  { pattern: /\b(k7|k\s*7)\b/i, canonical: "K7 Computing" },
  { pattern: /\b(npav|net\s*protector)\b/i, canonical: "Net Protector (NPAV)" },
  { pattern: /\b(mcafee|mc\s*afee)\b/i, canonical: "McAfee" },
  { pattern: /\b(kaspersky)\b/i, canonical: "Kaspersky" },
  { pattern: /\b(tally)\b/i, canonical: "Tally" },
  { pattern: /\b(busy|b\s*u\s*s\s*y)\b/i, canonical: "Busy" },
  { pattern: /\b(microsoft|ms\s*office|windows|m\s*i\s*c\s*r\s*o\s*s\s*o\s*f\s*t)\b/i, canonical: "Microsoft" },

  // Power & Inverters & Electrical
  { pattern: /\b(microtek|microteck)\b/i, canonical: "Microtek" },
  { pattern: /\b(luminous)\b/i, canonical: "Luminous" },
  { pattern: /\b(exide)\b/i, canonical: "Exide" },
  { pattern: /\b(amaron)\b/i, canonical: "Amaron" },
  { pattern: /\b(eveready|everedy)\b/i, canonical: "Eveready" },
  { pattern: /\b(duracell)\b/i, canonical: "Duracell" },
  { pattern: /\b(finolex)\b/i, canonical: "Finolex" },
  { pattern: /\b(havells)\b/i, canonical: "Havells" },
  { pattern: /\b(ahuja)\b/i, canonical: "Ahuja" },
  { pattern: /\b(syska)\b/i, canonical: "Syska" },
  { pattern: /\b(beetel)\b/i, canonical: "Beetel" },

  // Generic / Categorical fallbacks
  { pattern: /\b(oem|o\s*e\s*m)\b/i, canonical: "OEM" },
  { pattern: /\b(imported)\b/i, canonical: "Imported" },
];

const JUNK_BRAND_NAMES = new Set([
  "black colour", "white @18%", "pink", "grey", "red", "silver", "yellow", "green", "colours",
  "generic", "first copy products", "imported", "gst sales", "gst purchase @18%",
  "gst purchase item @28%", "old items", "service repair charges", "gst purchase @12%",
  "gst purchase @5%", "white @5%", "colours", "b b b b 2", "f f f f 6", "g g g g 7",
  "o o o o  15", "wwww  23", "zzzz  26", "demo", "replacement", "special", "original", "normal",
  "gst purchase", "gst sales @18%", "gst sale"
]);

const CATEGORY_MAP: Record<string, { id: string; name: string }> = {
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

export function normalizeBrand(rawBrand?: string, itemName?: string): string {
  const combined = `${rawBrand || ""} ${itemName || ""}`.trim();
  for (const { pattern, canonical } of BRAND_PATTERNS) {
    if (pattern.test(combined)) return canonical;
  }
  if (rawBrand) {
    let clean = rawBrand.replace(/@\d+%/g, "");
    clean = clean.replace(/1800\s*[\d\s\-]+|1860\s*[\d\s\-]+|022-[\d\s\-]+|\b\d{6,}\b/g, "");
    clean = clean.replace(/-\s*[A-Z0-9]{5,}.*$/, "");
    clean = clean.replace(/\s+/g, " ").trim();
    if (clean.length > 1 && clean.length < 35 && !JUNK_BRAND_NAMES.has(clean.toLowerCase())) {
      return clean;
    }
  }
  return "General";
}

export function isNonProductLedger(name: string, rawCat?: string, rawGroup?: string): boolean {
  const text = `${name || ""} ${rawCat || ""} ${rawGroup || ""}`.toLowerCase().trim();

  // 1. Any Old / Second Hand / Scrap / Writeoff item
  if (/\b(old\s*items?|second\s*hand|scrap|old\s*printer|old\s*ram|old\s*cabinet|old\s*ups|old\s*led|old\s*motherboard|old\s*power\s*supply|old\s*broadband|old\s*ont|old\s*adapter|old\s*battery|old\s*laminator|old\s*note\s*book|lcd\s*t\s*v\s*tuner\s*old)\b/i.test(text)) {
    return true;
  }

  // 2. Service, Repair, Labour, Freight, Installation, Testing, Maintenance charges
  if (/\b(service\s*repair|repair\s*charges?|installation\s*charges?|labour\s*charges?|courier\s*charges?|freight|maintenance\s*charge|service\s*charge|sms\s*pack|instalation\s*charges?|mantenence\s*charges?|networking\s*charges?)\b/i.test(text)) {
    return true;
  }

  // 3. Demo / Samples / Dummy voucher items
  if (/\b(demo\s*item|demo\b|sample\b|testing\b)/i.test(text) || (rawGroup || "").toLowerCase() === "demo") {
    return true;
  }

  // 4. GST Sales / Purchase placeholder vouchers & Ledgers
  if (/^(gst\s*(?:sales|purchase|sale)\b)/i.test((name || "").trim())) {
    return true;
  }

  const exactJunk = new Set([
    "gst purchase @ 18% item", "gst purchase @ 12 % item", "gst purchase @ 28 % item",
    "gst purchase @ 5%", "gst sales @ 28 %", "gst sales @28% with quantity",
    "gst sales & services @ 12%", "gst sales & services @ 18%", "gst sales peripherals- 84716060",
    "gst sales patch cord cable", "gst sales 120 gm powder universal - 37079090",
    "gst sales printer ink tank - 84433100", "gst sales lamination machine", "old items"
  ]);
  if (exactJunk.has((name || "").toLowerCase().trim())) {
    return true;
  }

  // 5. Replacement voucher lines
  if ((rawGroup || "").toLowerCase() === "replacement" || /\bfor\s*replacement\b/i.test(text)) {
    return true;
  }

  return false;
}

export function inferCategoryId(name: string, rawCat?: string, rawGroup?: string): string {
  const text = `${name || ""} ${rawCat || ""} ${rawGroup || ""}`.toLowerCase();

  // 1. Media & Labels (Barcode stickers, thermal rolls, paper rolls -> scanner-billing)
  if (/\b(barcode\s*sticker|direct\s*thermal|thermal\s*roll|billing\s*roll|polyster\s*roll|chromo|jewellery\s*chromo)\b/i.test(text)) {
    return "scanner-billing";
  }

  // 2. RAM / Storage / Hardware components (Desktop & PC)
  if (/\b(ram\b|ddr[2345]|sata\s*hdd|hdd\b|hard\s*disk|internal\s*ssd|sata\s*ssd|nvme\s*ssd|2\.5\s*inch\s*ssd|graphic\s*card|gtx\s*\d+|rtx\s*\d+|gt\s*710|gt\s*730|gt\s*610)\b/i.test(text)) {
    if (!/\b(cover|caddy|case|box|bag|screws|paste|converter|cable)\b/i.test(text)) {
      return "desktop-pc";
    }
  }

  // 3. Universal Spare Parts, Spares, Assemblies, Mechanics, Cables, Adapters, Batteries, Keypads, Tools, Mounts -> Accessories
  const sparePatterns = [
    /\b(roller|pressure|pickup|pick\s*up|seperation|separation|feed|caping|capping|assembly|assly|assembley)\b/i,
    /\b(knowb|knob|gear|gears|clutch|lever|cam|bushing|bush|bracket|stand|tray|lock|lsu|laser\s*unit)\b/i,
    /\b(heating\s*element|element|fuser|fuser\s*film|fuser\s*sleeve|thermistor|thermostat|lamp|strip|encoder|timing\s*belt|belt|carriage)\b/i,
    /\b(devloper|developer|blade|wiper\s*blade|doctor\s*blade|pcr|opc|opc\s*drum|drum\s*unit|chip)\b/i,
    /\b(hinge|hinges|door|cover|body|panel|head|printhead|printer\s*head|pipe|ciss|damper)\b/i,
    /\b(cable|cord|wire|vga|hdmi|usb|lan|cat6|cat5|patch|power\s*cord|power\s*cable|flex\s*cable)\b/i,
    /\b(adapter|adaptor|charger|pin|jack|dc\s*pin|connector|bnc|rj45|coupler|splitter|converter|hub)\b/i,
    /\b(sleeve|sleev|sleeves|bag|pouch|case|skin|guard|screen\s*guard|keypad\s*guard|toolkit|tool\s*kit|tool|caddy)\b/i,
    /\b(pad|mouse\s*pad|mousepad|cooling|cooler|paste|compound|screws|screw|tester|crimping|punch\s*down)\b/i,
    /\b(battery|bettery|keypad|mouse|keyboard|headphone|earphone|speaker|soundbar|webcam|web\s*camera|mic|mike|microphone|remote)\b/i,
    /\b(card\s*reader|sharer|pci|repair|service|pencil|stylus|temper\s*glass|maintenance\s*box|logic\s*board|logic\s*card|power\s*supply|smps|volt|amp|watt)\b/i,
    /\b(pvc\s*card|card|power\s*bank|str\s*for|motor|power\s*switch|switch\s*for|switch\s*type|wall\s*mount|mounting|i\s*o\s*box|io\s*box|junction\s*box|housing|pinjra|cage)\b/i
  ];

  for (const sp of sparePatterns) {
    if (sp.test(text)) {
      if (/\b(ink|toner|tonner|cartridge|cartdge|cartdg|ribbon|ribben|refill|powder|bottle|t003|t001|003|001|005|057|052|12a|88a)\b/i.test(text) && !/\b(cable|adapter|toolkit|paper|spares|chip|cleaner)\b/i.test(text)) {
        return "toner-cartridge";
      }
      return "accessories";
    }
  }

  // 4. Consumables (Toner / Cartridge / Ink / Powders / Drums / Ribbons)
  if (/\b(ink|toner|tonner|cartridge|cartdge|cartdg|ribbon|ribben|refill|opc\s*drum|wiper\s*blade|doctor\s*blade|toner\s*powder|t003|t001|003|001|005|057|052|12a|88a|cyan|magenta|megenta|yellow|black\s*ink|ink\s*bottle|waste\s*box)\b/i.test(text)) {
    return "toner-cartridge";
  }

  // 5. Biometrics & Attendance (Machines)
  if (/\b(biometric|attendance|fingerprint|face\s*recognition|access\s*control|morpho|mantra|mfs100|mfs500|mfs\s*110|bioface|secugen|startek|aratek|pb1000|iris\s*scanner)\b/i.test(text)) {
    return "biometric-attendance";
  }

  // 6. Scanner & Billing (POS Machines & Scanners & Bill Printers)
  if (/\b(barcode\s*scanner|2d\s*scanner|pos\s*terminal|thermal\s*receipt|bill\s*printer|currency\s*counting|currency\s*counter|cash\s*drawer|barcode\s*printer|pc42t|te\s*244|ttp\s*244|lp46|rp3160|rp3200|rp3210|rp3230|tm-t|rp82|rtp80|rtp82|udy\s*58b|80d\s*bluetooth|easycount|maxsell|star\s*plus\s*cash|bs-i|bs-l|bs-c)\b/i.test(text)) {
    return "scanner-billing";
  }

  // 7. UPS & Inverters (Power backup systems)
  if (/\b(ups|inverter|microtek\s*legend|amaron\s*ups|luminous\s*ups|mini\s*ups|mls1255|u1205|zeb-u735)\b/i.test(text)) {
    return "ups-inverter";
  }

  // 8. CCTV & Security (Cameras, DVRs, NVRs)
  if (/\b(cctv|camera|dvr|nvr|dome\s*camera|bullet\s*camera|ptz|4g\s*camera|wifi\s*camera|solar\s*camera|hikvision|cp\s*plus|trueview|hi\s*focus|ezviz|coreprix|prama)\b/i.test(text)) {
    return "cctv-security";
  }

  // 9. Router & Networking (Active switches, routers, APs, racks)
  if (/\b(router|poe\s*switch|gigabit\s*switch|access\s*point|mesh\s*wifi|ont|gpon|epon|media\s*converter|patch\s*panel|server\s*rack|network\s*rack|switch\s*\d+\s*port|modem|broadband)\b/i.test(text)) {
    return "router-networking";
  }

  // 10. Monitor & Display (Screens, LED Monitors, Projectors)
  if (/\b(led\s*monitor|tft\s*monitor|desktop\s*monitor|interactive\s*panel|projector\s*screen|projection\s*screen|projector|touch\s*display|ips\s*monitor|r25f|pixa\s*play)\b/i.test(text)) {
    return "monitor-display";
  }

  // 11. Printers (Physical Hardware Machines: Laser, Inktank, Dot-Matrix)
  if (/\b(printer|all\s*in\s*one\s*printer|ecotank|smart\s*tank|laserjet|deskjet|lbp|l3210|l8180|l3110|l3310|l4360|l6490|l8050|l11050|l130|1008a|1008w|1188a|1188w|1020\s*plus|1020w|1005\s*printer|dot\s*matrix|passbook|dcp-|hl-|msp\s*\d+|m126|mf271|mf272|mfc-|p1108|up-x898)\b/i.test(text)) {
    return "printer";
  }

  // 12. Laptops (Physical Laptops, Notebooks, MacBooks)
  if (/\b(laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|inspiron|vostro|latitude|aspire|victus|pavilion|omen|legion|loq|slim3|v15|al15)\b/i.test(text) || /\b(?:15-fc\w*|15-fd\w*|15-eq\w*|15-du\w*|15s-\w*|14-ep\w*|250r\w*|255g\w*|fa506\w*)\b/i.test(text)) {
    return "laptop";
  }

  // 13. Processors (Standalone CPUs)
  if (/\b(processor|cpu\b|core\s*i[3579]-|core\s*i\s*[3579]\b|ryzen\s*[3579]\b|pentium\s*gold|celeron\b|athlon\b|core\s*to\s*duo|12100|12400|13100|13400|14100|14400|5600g|8500g|5700g|3200g|4650g)\b/i.test(text)) {
    if (!/\b(fan|cooler|paste|heatsink|cable|bag|sleeve|case|screws|motherboard|cabinet|all\s*in\s*one|desktop\s*pc)\b/i.test(text)) {
      return "processor";
    }
  }

  // 14. Desktop & PC (Motherboards, Cabinets, Complete Desktops)
  if (/\b(all\s*in\s*one\s*pc|desktop\s*pc|branded\s*pc|all\s*in\s*one\s*24-|motherboard|h610m?|b550m?|h81m?|h110m?|b760m?|a520m?|b450m?|q270|h55\b|h61\b|g41\b|gaming\s*cabinet|pc\s*cabinet)\b/i.test(text)) {
    return "desktop-pc";
  }

  return "accessories";
}

const TECH_ACRONYMS = new Set([
  "HP", "USB", "HDMI", "VGA", "LAN", "CCTV", "DVR", "NVR", "UPS",
  "GB", "TB", "MB", "KB", "RAM", "SSD", "HDD", "DDR3", "DDR4", "DDR5",
  "WIFI", "WI-FI", "FHD", "LED", "TFT", "NVME", "CAT6", "CAT5", "RJ45",
  "BNC", "SMPS", "MFP", "AIO", "DOS", "BT", "POS", "PC", "CPU", "PCIE",
  "SATA", "DPI", "DC", "AC", "AMP", "AH", "KVA", "VA", "MP", "UHD", "RGB",
  "IC", "RD", "PVC", "OPC", "PCR", "TVS", "EVM", "MSI", "ASUS", "AMD", "ADATA", "RANZZ"
]);

const LOWERCASE_WORDS = new Set(["for", "in", "with", "and", "or", "to", "by", "of", "the", "a", "an", "on", "at", "per"]);

export function toTechTitleCase(title: string): string {
  if (!title) return "";
  const words = title.trim().split(/\s+/);
  const result: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const stripped = w.replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();

    if (TECH_ACRONYMS.has(stripped)) {
      result.push(w.toUpperCase());
    } else if (/^\d+(\.\d+)?(gb|tb|mb|m|v|amp|ah|kva|va|mp|ghz|mhz|w|inch|pin)$/i.test(w)) {
      const match = w.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
      if (match) {
        const [, num, unit] = match;
        const unitUpper = unit.toUpperCase();
        const unitFmt = ["GB", "TB", "MB", "V", "W", "AH", "MHZ", "GHZ", "MP"].includes(unitUpper)
          ? unitUpper
          : unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
        result.push(`${num} ${unitFmt}`);
      } else {
        result.push(w.charAt(0).toUpperCase() + w.slice(1));
      }
    } else if (/^[A-Za-z0-9]+-[A-Za-z0-9\-]+$/i.test(w)) {
      // Preserve hardware SKU strings like 15-FC0500AU, DS-7116HGHI-M1
      result.push(w.toUpperCase());
    } else if (i > 0 && i < words.length - 1 && LOWERCASE_WORDS.has(w.toLowerCase())) {
      result.push(w.toLowerCase());
    } else {
      result.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
  }

  return result.join(" ");
}

export function cleanProductName(rawName: string): string {
  if (!rawName) return "";
  let clean = rawName
    .replace(/@\d+%/g, "")
    .replace(/-\s*[A-Z]\d+-\d*-?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  clean = clean.replace(/-\s*$/, "").trim();
  return toTechTitleCase(clean);
}

/**
 * Intelligent hardware product number / OEM model extractor
 */
export function extractProductModelNumber(name: string, rawModel?: string): string {
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

export function parseStockNumber(val?: string | number): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.max(0, val);
  const match = String(val).replace(/,/g, "").match(/[-+]?\d*\.?\d+/);
  if (match) {
    const n = parseFloat(match[0]);
    return isNaN(n) ? 0 : Math.max(0, n);
  }
  return 0;
}

/**
 * Main Normalization Function
 * Produces clean models and ensures GUID is never placed in model or user-facing fields.
 */
export function normalizeProduct(input: RawProductInput): NormalizedProduct {
  const rawTitle = input.name || input.title || input.tallyName || "";
  const name = cleanProductName(rawTitle);
  const tallyName = input.tallyName || rawTitle;
  const tallyGuid = input.tallyGuid || input.id || null;
  const brand = normalizeBrand(input.brand, name);
  
  const catId = input.categoryId && CATEGORY_MAP[input.categoryId] 
    ? input.categoryId 
    : inferCategoryId(name, input.category, input.brand);
  
  const categoryInfo = CATEGORY_MAP[catId] || { id: "accessories", name: "Accessories" };
  const model = extractProductModelNumber(name, input.model || input.partNo);
  const itemCode = input.itemCode ? input.itemCode.trim() : "";
  
  const stockCount = parseStockNumber(input.stockCount !== undefined ? input.stockCount : input.closingBalance);
  const inStock = stockCount > 0;
  
  let explicitPrice: number | null = null;
  if (input.price !== undefined && input.price !== null && typeof input.price === "number" && input.price > 0) {
    explicitPrice = input.price;
  }
  
  const uom = input.uom ? input.uom.trim() : "Nag.";

  return {
    id: input.tallyGuid || input.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    tallyName,
    tallyGuid: input.tallyGuid || null,
    brand,
    categoryId: categoryInfo.id,
    categoryName: categoryInfo.name,
    model,
    itemCode,
    uom,
    stockCount,
    inStock,
    price: explicitPrice,
    description: input.description ? input.description.trim() : "",
    photoUrl: input.photoUrl || null,
    warranty: input.warranty ? input.warranty.trim() : "",
    serviceCenter: input.serviceCenter ? input.serviceCenter.trim() : "",
    productUrl: input.productUrl ? input.productUrl.trim() : "",
    featured: Boolean(input.featured),
    showOnWebsite: input.showOnWebsite !== undefined ? Boolean(input.showOnWebsite) : true,
    showPriceOnWebsite: explicitPrice !== null && input.showPriceOnWebsite === true,
    order: input.order !== undefined ? input.order : null,
    customFields: input.customFields || [],
    hsnCode: input.hsnCode || input.hsn || undefined,
    lastSyncedAt: Date.now(),
    updatedAt: Date.now(),
  };
}
