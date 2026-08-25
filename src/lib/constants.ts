export const DEFAULT_WARRANTY_PERIOD = "1 Year";
export const DEFAULT_WARRANTY_BY = "Brand";
export const DEFAULT_WARRANTY_TYPE = "Carry-In Limited Warranty";

export const DEFAULT_WARRANTY =
  "1 Year Carry-In Limited Warranty by Brand, subject to Company Terms & Conditions.";

export const WARRANTY_PERIODS = [
  "1 Year",
  "1.5 Year",
  "2 Years",
  "3 Years",
  "4 Years",
  "5 Years",
  "10 Years",
  "1 Month",
  "2 Months",
  "3 Months",
  "6 Months",
  "9 Months",
  "12 Months",
  "No Warranty",
] as const;

export const WARRANTY_BY_OPTIONS = [
  "Brand",
  "Vendor",
] as const;

export const WARRANTY_TYPE_OPTIONS = [
  { value: "Carry-In Limited Warranty", label: "Carry-In Limited Warranty (Standard)" },
  { value: "Toll-Free Onsite Warranty", label: "Toll-Free Onsite Warranty (Brand Support)" },
  { value: "Onsite Warranty", label: "Onsite Warranty" },
  { value: "Carry-In Warranty", label: "Carry-In Warranty" },
] as const;

export interface WarrantyComponents {
  period: string;
  by: string;
  type: string;
  isCustom?: boolean;
  customText?: string;
}

/**
 * Composes a full standard warranty clause string from individual components.
 */
export function buildWarrantyString(components: WarrantyComponents): string {
  if (components.isCustom && components.customText !== undefined) {
    return components.customText.trim();
  }

  const period = components.period || DEFAULT_WARRANTY_PERIOD;
  const by = components.by || DEFAULT_WARRANTY_BY;
  const type = components.type || DEFAULT_WARRANTY_TYPE;

  if (period === "No Warranty") {
    return "No Warranty (Testing Warranty Only, subject to Company Terms & Conditions).";
  }

  return `${period} ${type} by ${by}, subject to Company Terms & Conditions.`;
}

/**
 * Parses an existing warranty string into its constituent period, by, and type components.
 */
export function parseWarrantyString(str?: string | null): WarrantyComponents {
  if (!str || !str.trim()) {
    return {
      period: DEFAULT_WARRANTY_PERIOD,
      by: DEFAULT_WARRANTY_BY,
      type: DEFAULT_WARRANTY_TYPE,
      isCustom: false,
    };
  }

  const trimmed = str.trim();

  if (trimmed.toLowerCase().includes("no warranty")) {
    return {
      period: "No Warranty",
      by: "Brand",
      type: DEFAULT_WARRANTY_TYPE,
      isCustom: false,
    };
  }

  // Regex pattern matching: "<Period> <Type> by/By <Provider> ..."
  const match = trimmed.match(
    /^([0-9.]+\s*(?:Months?|Years?))\s*(Carry[-\s]In Limited Warranty|Toll[-\s]Free Onsite Warranty|Onsite Warranty|Carry[-\s]In Warranty)\s*by\s*(Brand|Vendor)/i
  );

  if (match) {
    const rawPeriod = match[1].trim();
    // Normalize period string to match our array
    const normalizedPeriod =
      WARRANTY_PERIODS.find((p) => p.toLowerCase() === rawPeriod.toLowerCase()) || rawPeriod;

    const rawType = match[2].trim();
    const normalizedType =
      WARRANTY_TYPE_OPTIONS.find(
        (t) => t.value.toLowerCase().replace(/[-\s]/g, "") === rawType.toLowerCase().replace(/[-\s]/g, "")
      )?.value || rawType;

    const rawBy = match[3].trim();
    const normalizedBy =
      WARRANTY_BY_OPTIONS.find((b) => b.toLowerCase() === rawBy.toLowerCase()) || rawBy;

    return {
      period: normalizedPeriod,
      type: normalizedType,
      by: normalizedBy,
      isCustom: false,
    };
  }

  // If non-standard string, return as custom text
  return {
    period: DEFAULT_WARRANTY_PERIOD,
    by: DEFAULT_WARRANTY_BY,
    type: DEFAULT_WARRANTY_TYPE,
    isCustom: true,
    customText: trimmed,
  };
}

export const COMMON_WARRANTY_PRESETS = [
  {
    label: "1Y Brand Carry-In (Default)",
    period: "1 Year",
    by: "Brand",
    type: "Carry-In Limited Warranty",
  },
  {
    label: "2Y Brand Carry-In",
    period: "2 Years",
    by: "Brand",
    type: "Carry-In Limited Warranty",
  },
  {
    label: "3Y Brand Carry-In",
    period: "3 Years",
    by: "Brand",
    type: "Carry-In Limited Warranty",
  },
  {
    label: "1Y Brand Onsite",
    period: "1 Year",
    by: "Brand",
    type: "Toll-Free Onsite Warranty",
  },
  {
    label: "2Y Brand Onsite",
    period: "2 Years",
    by: "Brand",
    type: "Toll-Free Onsite Warranty",
  },
  {
    label: "3Y Brand Onsite",
    period: "3 Years",
    by: "Brand",
    type: "Toll-Free Onsite Warranty",
  },
  {
    label: "1M Vendor",
    period: "1 Month",
    by: "Vendor",
    type: "Carry-In Limited Warranty",
  },
  {
    label: "3M Vendor",
    period: "3 Months",
    by: "Vendor",
    type: "Carry-In Limited Warranty",
  },
  {
    label: "6M Vendor",
    period: "6 Months",
    by: "Vendor",
    type: "Carry-In Limited Warranty",
  },
  {
    label: "12M Vendor",
    period: "12 Months",
    by: "Vendor",
    type: "Carry-In Limited Warranty",
  },
];

export interface HardwareBrand {
  name: string;
  category: "PC & Laptops" | "Printers & Scanners" | "CCTV & Security" | "Components & Storage" | "Peripherals" | "Networking & Power";
  popular?: boolean;
}

export const TOP_HARDWARE_BRANDS: HardwareBrand[] = [
  // PCs, Laptops, Workstations & Servers
  { name: "HP", category: "PC & Laptops", popular: true },
  { name: "Dell", category: "PC & Laptops", popular: true },
  { name: "Lenovo", category: "PC & Laptops", popular: true },
  { name: "Asus", category: "PC & Laptops", popular: true },
  { name: "Acer", category: "PC & Laptops", popular: true },
  { name: "Apple", category: "PC & Laptops", popular: true },
  { name: "MSI", category: "PC & Laptops", popular: true },
  { name: "Gigabyte", category: "PC & Laptops" },
  { name: "Samsung", category: "PC & Laptops", popular: true },
  { name: "LG", category: "PC & Laptops" },
  { name: "Microsoft Surface", category: "PC & Laptops" },
  { name: "Intel", category: "PC & Laptops", popular: true },
  { name: "AMD", category: "PC & Laptops", popular: true },
  { name: "Toshiba", category: "PC & Laptops" },
  { name: "Dynabook", category: "PC & Laptops" },
  { name: "Alienware", category: "PC & Laptops" },
  { name: "Avita", category: "PC & Laptops" },
  { name: "Razer", category: "PC & Laptops" },
  { name: "Fujitsu", category: "PC & Laptops" },
  { name: "HCL", category: "PC & Laptops" },
  { name: "Wipro", category: "PC & Laptops" },

  // Printers, Scanners, POS & Projectors
  { name: "Canon", category: "Printers & Scanners", popular: true },
  { name: "Epson", category: "Printers & Scanners", popular: true },
  { name: "Brother", category: "Printers & Scanners", popular: true },
  { name: "TVS Electronics", category: "Printers & Scanners", popular: true },
  { name: "Zebra", category: "Printers & Scanners" },
  { name: "TSC", category: "Printers & Scanners" },
  { name: "Honeywell", category: "Printers & Scanners" },
  { name: "Posiflex", category: "Printers & Scanners" },
  { name: "Bixolon", category: "Printers & Scanners" },
  { name: "Everycom", category: "Printers & Scanners" },
  { name: "Pantum", category: "Printers & Scanners" },
  { name: "Ricoh", category: "Printers & Scanners" },
  { name: "Xerox", category: "Printers & Scanners" },
  { name: "Kyocera", category: "Printers & Scanners" },
  { name: "Konica Minolta", category: "Printers & Scanners" },
  { name: "Lexmark", category: "Printers & Scanners" },
  { name: "Sharp", category: "Printers & Scanners" },
  { name: "Casio", category: "Printers & Scanners" },
  { name: "BenQ", category: "Printers & Scanners" },
  { name: "ViewSonic", category: "Printers & Scanners" },
  { name: "Optoma", category: "Printers & Scanners" },
  { name: "XGIMI", category: "Printers & Scanners" },

  // CCTV, Security, IP Cameras & Biometrics
  { name: "Hikvision", category: "CCTV & Security", popular: true },
  { name: "CP Plus", category: "CCTV & Security", popular: true },
  { name: "Dahua", category: "CCTV & Security", popular: true },
  { name: "Ezviz", category: "CCTV & Security", popular: true },
  { name: "Imou", category: "CCTV & Security", popular: true },
  { name: "TP-Link Tapo", category: "CCTV & Security", popular: true },
  { name: "TP-Link Vigi", category: "CCTV & Security" },
  { name: "Uniview", category: "CCTV & Security" },
  { name: "UNV", category: "CCTV & Security" },
  { name: "Bosch", category: "CCTV & Security" },
  { name: "Axis Communications", category: "CCTV & Security" },
  { name: "Panasonic", category: "CCTV & Security" },
  { name: "Matrix Comsec", category: "CCTV & Security" },
  { name: "Realtime Biometrics", category: "CCTV & Security" },
  { name: "eSSL", category: "CCTV & Security", popular: true },
  { name: "Biomax", category: "CCTV & Security" },
  { name: "ZKTeco", category: "CCTV & Security", popular: true },
  { name: "Secureye", category: "CCTV & Security" },
  { name: "Godrej Security", category: "CCTV & Security" },
  { name: "Trueview", category: "CCTV & Security" },
  { name: "Prama", category: "CCTV & Security" },
  { name: "Hi-Focus", category: "CCTV & Security" },
  { name: "Vintron", category: "CCTV & Security" },
  { name: "Hawkvision", category: "CCTV & Security" },
  { name: "Milesight", category: "CCTV & Security" },
  { name: "Provision-ISR", category: "CCTV & Security" },
  { name: "Hanwha Vision", category: "CCTV & Security" },
  { name: "Tiandy", category: "CCTV & Security" },
  { name: "Longse", category: "CCTV & Security" },
  { name: "Reolink", category: "CCTV & Security" },
  { name: "Eufy", category: "CCTV & Security" },

  // Storage & Computer Components
  { name: "Western Digital (WD)", category: "Components & Storage", popular: true },
  { name: "Seagate", category: "Components & Storage", popular: true },
  { name: "Kingston", category: "Components & Storage", popular: true },
  { name: "Crucial", category: "Components & Storage", popular: true },
  { name: "SanDisk", category: "Components & Storage", popular: true },
  { name: "Transcend", category: "Components & Storage" },
  { name: "Adata", category: "Components & Storage" },
  { name: "Corsair", category: "Components & Storage" },
  { name: "G.Skill", category: "Components & Storage" },
  { name: "XPG", category: "Components & Storage" },
  { name: "Zotac", category: "Components & Storage" },
  { name: "Sapphire", category: "Components & Storage" },
  { name: "Galax", category: "Components & Storage" },
  { name: "ASRock", category: "Components & Storage" },
  { name: "Biostar", category: "Components & Storage" },
  { name: "Palit", category: "Components & Storage" },
  { name: "Inno3D", category: "Components & Storage" },
  { name: "PowerColor", category: "Components & Storage" },
  { name: "PNY", category: "Components & Storage" },
  { name: "Patriot", category: "Components & Storage" },
  { name: "TeamGroup", category: "Components & Storage" },
  { name: "EVM", category: "Components & Storage" },
  { name: "Consistent", category: "Components & Storage" },
  { name: "Geonix", category: "Components & Storage" },
  { name: "Simmtronics", category: "Components & Storage" },
  { name: "Ant Esports", category: "Components & Storage" },
  { name: "DeepCool", category: "Components & Storage" },
  { name: "Cooler Master", category: "Components & Storage" },
  { name: "Antec", category: "Components & Storage" },

  // Peripherals & Accessories
  { name: "Logitech", category: "Peripherals", popular: true },
  { name: "Rapoo", category: "Peripherals" },
  { name: "Redragon", category: "Peripherals" },
  { name: "Zebronics", category: "Peripherals", popular: true },
  { name: "Fingers", category: "Peripherals" },
  { name: "Portronics", category: "Peripherals" },
  { name: "ProDot", category: "Peripherals" },
  { name: "Lapcare", category: "Peripherals" },
  { name: "Frontech", category: "Peripherals" },
  { name: "Intex", category: "Peripherals" },
  { name: "Artis", category: "Peripherals" },
  { name: "Enter", category: "Peripherals" },
  { name: "Circle", category: "Peripherals" },
  { name: "Terabyte", category: "Peripherals" },
  { name: "Quantum", category: "Peripherals" },

  // Networking, UPS & Power
  { name: "D-Link", category: "Networking & Power", popular: true },
  { name: "TP-Link", category: "Networking & Power", popular: true },
  { name: "Cisco", category: "Networking & Power" },
  { name: "Netgear", category: "Networking & Power" },
  { name: "Ubiquiti", category: "Networking & Power" },
  { name: "Tenda", category: "Networking & Power" },
  { name: "Mercusys", category: "Networking & Power" },
  { name: "Ruijie Reyee", category: "Networking & Power" },
  { name: "Mikrotik", category: "Networking & Power" },
  { name: "APC by Schneider Electric", category: "Networking & Power", popular: true },
  { name: "Microtek", category: "Networking & Power", popular: true },
  { name: "Luminous", category: "Networking & Power", popular: true },
  { name: "V-Guard", category: "Networking & Power" },
  { name: "Numeric", category: "Networking & Power" },
  { name: "Vertiv Liebert", category: "Networking & Power" },
  { name: "CyberPower", category: "Networking & Power" },
  { name: "Eaton", category: "Networking & Power" },
];

export const BRAND_CATEGORIES = [
  "All",
  "CCTV & Security",
  "Printers & Scanners",
  "PC & Laptops",
  "Components & Storage",
  "Networking & Power",
  "Peripherals",
] as const;

export const FEATURED_QUICK_BRANDS = [
  "Hikvision",
  "CP Plus",
  "Canon",
  "Epson",
  "HP",
  "Dell",
  "Lenovo",
  "TP-Link",
  "Logitech",
  "Western Digital (WD)",
  "D-Link",
  "Brother",
];

export function mapCategoryToHardwareCategory(
  categoryName?: string | null
): HardwareBrand["category"] | null {
  if (!categoryName || !categoryName.trim()) return null;
  const lower = categoryName.trim().toLowerCase();

  if (
    lower.includes("cctv") ||
    lower.includes("camera") ||
    lower.includes("dvr") ||
    lower.includes("nvr") ||
    lower.includes("security") ||
    lower.includes("surveillance") ||
    lower.includes("biometric") ||
    lower.includes("attendance") ||
    lower.includes("access control")
  ) {
    return "CCTV & Security";
  }

  if (
    lower.includes("print") ||
    lower.includes("scan") ||
    lower.includes("pos") ||
    lower.includes("receipt") ||
    lower.includes("barcode") ||
    lower.includes("toner") ||
    lower.includes("cartridge") ||
    lower.includes("projector")
  ) {
    return "Printers & Scanners";
  }

  if (
    lower.includes("laptop") ||
    lower.includes("desktop") ||
    lower.includes("computer") ||
    lower.includes("pc") ||
    lower.includes("server") ||
    lower.includes("workstation") ||
    lower.includes("macbook") ||
    lower.includes("all-in-one") ||
    lower.includes("aio")
  ) {
    return "PC & Laptops";
  }

  if (
    lower.includes("disk") ||
    lower.includes("hdd") ||
    lower.includes("ssd") ||
    lower.includes("ram") ||
    lower.includes("memory") ||
    lower.includes("storage") ||
    lower.includes("motherboard") ||
    lower.includes("processor") ||
    lower.includes("gpu") ||
    lower.includes("graphic") ||
    lower.includes("smps") ||
    lower.includes("power supply") ||
    lower.includes("cabinet")
  ) {
    return "Components & Storage";
  }

  if (
    lower.includes("network") ||
    lower.includes("router") ||
    lower.includes("switch") ||
    lower.includes("wifi") ||
    lower.includes("wi-fi") ||
    lower.includes("lan") ||
    lower.includes("access point") ||
    lower.includes("ups") ||
    lower.includes("inverter") ||
    lower.includes("battery")
  ) {
    return "Networking & Power";
  }

  if (
    lower.includes("mouse") ||
    lower.includes("keyboard") ||
    lower.includes("headphone") ||
    lower.includes("headset") ||
    lower.includes("speaker") ||
    lower.includes("webcam") ||
    lower.includes("peripheral") ||
    lower.includes("accessory") ||
    lower.includes("cable") ||
    lower.includes("adapter")
  ) {
    return "Peripherals";
  }

  return null;
}

export function searchBrandSuggestions(
  query: string,
  limitCount = 30,
  categoryHint?: string
): HardwareBrand[] {
  const mappedCategory = mapCategoryToHardwareCategory(categoryHint);

  if (!query || !query.trim()) {
    // If a category was recognized, show all brands in that category first, then other popular brands
    if (mappedCategory) {
      const primaryCategoryBrands = TOP_HARDWARE_BRANDS.filter(
        (b) => b.category === mappedCategory
      );
      const otherCategoryBrands = TOP_HARDWARE_BRANDS.filter(
        (b) => b.category !== mappedCategory && b.popular
      );
      return [...primaryCategoryBrands, ...otherCategoryBrands].slice(0, limitCount);
    }

    // Default: Return a balanced mix of popular brands from EVERY category
    const balanced: HardwareBrand[] = [];
    const categories: HardwareBrand["category"][] = [
      "CCTV & Security",
      "Printers & Scanners",
      "PC & Laptops",
      "Components & Storage",
      "Networking & Power",
      "Peripherals",
    ];

    for (const cat of categories) {
      const catBrands = TOP_HARDWARE_BRANDS.filter((b) => b.category === cat && b.popular);
      balanced.push(...catBrands.slice(0, 4));
    }

    // If still have room, add remaining brands
    const remaining = TOP_HARDWARE_BRANDS.filter((b) => !balanced.includes(b));
    return [...balanced, ...remaining].slice(0, limitCount);
  }

  const cleanQ = query.trim().toLowerCase();

  // Search through all TOP_HARDWARE_BRANDS
  // If mappedCategory exists, matches within that category rank highest
  const exactCategoryPrefix: HardwareBrand[] = [];
  const exactCategoryContains: HardwareBrand[] = [];
  const otherPrefix: HardwareBrand[] = [];
  const otherContains: HardwareBrand[] = [];

  for (const brand of TOP_HARDWARE_BRANDS) {
    const brandName = brand.name.toLowerCase();
    const isTargetCategory = mappedCategory ? brand.category === mappedCategory : false;

    if (brandName.startsWith(cleanQ)) {
      if (isTargetCategory) {
        exactCategoryPrefix.push(brand);
      } else {
        otherPrefix.push(brand);
      }
    } else if (brandName.includes(cleanQ) || brand.category.toLowerCase().includes(cleanQ)) {
      if (isTargetCategory) {
        exactCategoryContains.push(brand);
      } else {
        otherContains.push(brand);
      }
    }
  }

  return [
    ...exactCategoryPrefix,
    ...otherPrefix,
    ...exactCategoryContains,
    ...otherContains,
  ].slice(0, limitCount);
}

