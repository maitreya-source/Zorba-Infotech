const admin = require("firebase-admin");
const fs = require("fs");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "zorba-infotech-web" });
}
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const BRAND_PATTERNS = [
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

function inferCategoryId(name, rawCat, rawGroup) {
  const text = `${name || ""} ${rawCat || ""} ${rawGroup || ""}`.toLowerCase();

  // 1. CABLES & CORDS (Always Accessories)
  if (/\b(cable|cord|patch\s*cord|wire|vga\s*cable|hdmi\s*cable|power\s*cable|power\s*cord|usb\s*cable|lan\s*cable|cat6|cat5|audio\s*cable|rca|aux|otg|extention|extension|flex\s*cable|pin\s*cable|sata\s*cable|serial\s*cable|cctv\s*cable)\b/i.test(text)) {
    return "accessories";
  }

  // 2. ADAPTERS, CHARGERS & CONVERTERS (Always Accessories)
  if (/\b(adapter|adaptor|charger|dc\s*pin|tft\s*pin|lcd\s*pin|nvr\s*pin|dvr\s*adapter|converter|type\s*c\s*hub|usb\s*hub|splitter|dc\s*adapter|power\s*adapter|coupler)\b/i.test(text)) {
    return "accessories";
  }

  // 3. BAGS, SLEEVES & COVERS (Always Accessories)
  if (/\b(sleeve|sleeves|bag|backpack|pouch|cover|dust\s*cover|skin|case|body\s*for|cabinet\s*cover)\b/i.test(text)) {
    return "accessories";
  }

  // 4. TOOLS, STANDS, MOUNTS & SPARES (Always Accessories)
  if (/\b(toolkit|tool\s*kit|caddy|stand|bracket|cooling\s*pad|mouse\s*pad|mousepad|thermal\s*paste|compound|screws|screw|tester|crimping|plink|punch\s*down|guard|screen\s*guard|keypad\s*guard|fan\s*for|hinge|hinges|dc\s*jack|paper\s*screen|pin\s*screen|screen\s*for|display\s*for|keypad\s*for|keyboard\s*for\s*laptop|battery\s*for|bettery|sticker\s*for|control\s*panel\s*sticker|heating\s*element|gear|devloper|developer|lamp\s*for|bushing|teflon|thermistor|separation\s*pad|tray|belt|encoder|head\s*for|printhead|printer\s*head|card\s*reader|sharer|motor\s*for|lever|door\s*sensor|logic\s*board|formatter\s*board|pci\s*express\s*card|repair\s*service|opening\s*tool|repairing\s*matt|security\s*lock|touchpad\s*body|upper\s*body|base\s*body|lower\s*body)\b/i.test(text)) {
    return "accessories";
  }

  // 5. CONNECTORS & HARDWARE PASSIVES (Always Accessories)
  if (/\b(bnc|dc\s*jack|rj45|rj11|modular\s*plug|connector|coupler|gender|balun|video\s*balun|keystone)\b/i.test(text)) {
    return "accessories";
  }

  // 6. GENERAL PERIPHERALS (Mice, Keyboards, Audio, Webcams) -> Accessories
  if (/\b(mouse|keypad|headphone|headset|earphone|speaker|soundbar|sound\s*system|collar\s*mike|microphone|webcam|presenter|calculator|remote|pencil|stylus|temper\s*glass)\b/i.test(text)) {
    return "accessories";
  }

  // 7. CONSUMABLES (Toner / Cartridge / Inks / Powders / Drums)
  if (/\b(ink|toner|cartridge|cartdg|ribbon|refill|opc\s*drum|wiper\s*blade|doctor\s*blade|toner\s*powder|t003|t001|003|001|005|057|052|12a|88a|chip|cyan|magenta|megenta|yellow|black\s*ink|ink\s*bottle)\b/i.test(text)) {
    return "toner-cartridge";
  }

  // 8. BIOMETRICS & ATTENDANCE
  if (/\b(biometric|attendance|fingerprint|face\s*recognition|access\s*control|morpho|mantra\s*mfs|mfs100|bioface|secugen|startek|aratek)\b/i.test(text)) {
    return "biometric-attendance";
  }

  // 9. SCANNER & BILLING (POS Machines & Paper Rolls)
  if (/\b(barcode\s*scanner|2d\s*scanner|pos\s*terminal|receipt\s*printer|thermal\s*receipt|bill\s*printer|currency\s*counting|cash\s*drawer|thermal\s*roll|billing\s*roll|barcode\s*sticker|direct\s*thermal)\b/i.test(text)) {
    return "scanner-billing";
  }

  // 10. UPS & INVERTERS (Power backup systems & batteries)
  if (/\b(ups|inverter|microtek\s*legend|amaron\s*ups|luminous\s*ups|battery\s*12v|12v\s*7ah|12v\s*9ah|exide\s*ups|zebronics\s*ups|u1205|mls1255)\b/i.test(text)) {
    return "ups-inverter";
  }

  // 11. CCTV & SECURITY (Cameras, DVRs, NVRs)
  if (/\b(cctv|camera|dvr|nvr|dome\s*camera|bullet\s*camera|ptz|4g\s*camera|wifi\s*camera|solar\s*camera|hikvision\s*camera|cp\s*plus\s*camera|trueview\s*camera|smps\s*12v\s*\d+a|cctv\s*power\s*supply)\b/i.test(text)) {
    return "cctv-security";
  }

  // 12. ROUTER & NETWORKING (Active switches, routers, APs, racks)
  if (/\b(router|poe\s*switch|gigabit\s*switch|access\s*point|mesh\s*wifi|ont|gpon|epon|media\s*converter|patch\s*panel|server\s*rack|network\s*rack)\b/i.test(text)) {
    return "router-networking";
  }

  // 13. MONITOR & DISPLAY (Screens, LED Monitors, Projectors)
  if (/\b(led\s*monitor|tft\s*monitor|desktop\s*monitor|interactive\s*panel|projector\s*screen|projector|touch\s*display|ips\s*monitor|r25f)\b/i.test(text)) {
    return "monitor-display";
  }

  // 14. PRINTERS (Physical Hardware Machines)
  if (/\b(all\s*in\s*one\s*printer|ecotank\s*l\d+|smart\s*tank|laserjet\s*(?:pro|mfp|tank)?|lbp2900|l3210|l8180|l3110|1008a|1188a|1020\s*plus|dot\s*matrix\s*printer|passbook\s*printer|single\s*function\s*laser\s*printer|multi\s*function\s*printer|dcp-b\d+|dcp-l\d+|hl-b\d+|hl-l\d+|lp46|msp\s*\d+|rp3160|rp3200|rp3210|rp3230|tm-t\s*82|te\s*244|ttp\s*244)\b/i.test(text)) {
    return "printer";
  }

  // 15. LAPTOPS (Physical Laptops, Notebooks, MacBooks)
  if (/\b(laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|inspiron|vostro|latitude|aspire|victus|pavilion|omen|legion|loq|15-fc|15-fd|15-eq|14-ep|15s-fq|250r\s*g\d+|255\s*g\d+|fa506|slim3|v15|al15)\b/i.test(text)) {
    return "laptop";
  }

  // 16. DESKTOP & PC (CPUs, Motherboards, Cabinets, RAM, Internal SSDs, Complete Desktops)
  if (/\b(all\s*in\s*one\s*pc|desktop\s*pc|branded\s*pc|all\s*in\s*one\s*24-|motherboard|cpu\s*processor|core\s*i[3579]-|ryzen\s*[3579]\s+\d{4}|h610m?|b550m?|h81m?|h110m?|b760m?|gaming\s*cabinet|pc\s*cabinet|ram\s*ddr[345]|nvme\s*ssd|internal\s*ssd|sata\s*ssd)\b/i.test(text)) {
    return "desktop-pc";
  }

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

async function migrateAll6048ProductsWithCleanCategories() {
  console.log("===============================================================================");
  console.log("🚀 STARTING 6,048 TALLY CATALOG RE-INGESTION WITH PERFECT CATEGORIES");
  console.log("===============================================================================");

  const rawData = JSON.parse(fs.readFileSync("/usr/local/google/home/maitreyam/personal/zorba/scripts/tally/data/tally_live_stock_dump.json", "utf-8"));
  console.log(`   Read ${rawData.length} total raw items from Tally dump.`);

  const allNormalized = [];
  const manifestSlim = [];
  const seenGuids = new Set();

  for (const it of rawData) {
    if (!it.guid || seenGuids.has(it.guid)) continue;
    const normalized = normalizeProduct(it);
    allNormalized.push(normalized);
    seenGuids.add(it.guid);

    manifestSlim.push({
      id: normalized.id,
      n: normalized.name,
      b: normalized.brand,
      m: normalized.model,
      c: normalized.categoryId,
      s: normalized.stockCount,
      u: normalized.uom,
      i: normalized.inStock ? 1 : 0,
      v: normalized.showOnWebsite ? 1 : 0,
      p: normalized.price
    });
  }

  console.log(`   Processed ${allNormalized.length} unique products.`);

  // Write batches of 400 to Firestore
  const BATCH_SIZE = 400;
  let batchIndex = 0;
  const startTime = Date.now();

  for (let i = 0; i < allNormalized.length; i += BATCH_SIZE) {
    batchIndex++;
    const chunk = allNormalized.slice(i, i + BATCH_SIZE);
    const writeBatch = db.batch();

    for (const prod of chunk) {
      const docRef = db.collection("products").doc(prod.id);
      writeBatch.set(docRef, prod);
    }

    await writeBatch.commit();
    console.log(`   ✅ Committed Batch ${batchIndex} (${chunk.length} items) - Total: ${Math.min(i + BATCH_SIZE, allNormalized.length)} / ${allNormalized.length}`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 BATCH WRITE COMPLETE in ${durationSec}s!`);

  // Write static manifest
  const manifestPath = "/usr/local/google/home/maitreyam/personal/zorba/public/data/products_manifest.json";
  fs.writeFileSync(manifestPath, JSON.stringify(manifestSlim));
  console.log(`💾 Saved updated slim manifest to ${manifestPath}`);

  // Summary of canonical categories
  const catSummary = {};
  allNormalized.forEach(p => {
    catSummary[p.category] = (catSummary[p.category] || 0) + 1;
  });

  console.log("\n===============================================================================");
  console.log("📊 PERFECTED CATEGORY BREAKDOWN AFTER MIGRATION:");
  console.log("===============================================================================");
  for (const [cat, count] of Object.entries(catSummary).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${cat.padEnd(25)}: ${count} products`);
  }
}

migrateAll6048ProductsWithCleanCategories().catch(console.error);
