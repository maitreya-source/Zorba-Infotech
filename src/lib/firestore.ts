import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  startAt,
  endAt,
  serverTimestamp,
  runTransaction,
  writeBatch,
  deleteField,
  onSnapshot,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { toTitleCase, formatModelNumber, formatIndianPhoneNumber } from "./utils";
import { normalizeProduct } from "./normalizeProduct";
import { publishSyncSignal, subscribeSyncSignal } from "./realtimeSync";
import type {
  Category,
  Product,
  DeviceCategory,
  DeviceModel,
  TimelineEvent,
  Customer,
  ServiceCall,
  ServiceCenter,
  Courier,
  Technician,
  TeamMember,
  FinancialYearDoc,
  WhatsAppTemplateDoc,
  Quotation,
  QuotationTemplate,
  TechnicianPayout,
  PaymentStatus,
  PaymentMode,
  Inquiry,
  InquiryStatus,
  JobApplication,
  JobApplicationStatus,
  PaginatedResult,
  StaffTask,
  TaskPriority,
  TaskStatus,
  StaffTaskHistoryEntry,
} from "./types";

const FIREBASE_TIMEOUT_MS = 10000;

export function formatFirebaseError(err: any): string {
  if (!err) return "Unknown Firebase error.";
  const msg = err?.message || String(err);
  const code = err?.code || "";

  if (code.includes("permission-denied") || msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
    return "Permission Denied: Unable to perform this database operation. Please check your network or login permissions.";
  }
  if (code.includes("unavailable") || msg.includes("unavailable") || msg.includes("Failed to get document because the client is offline")) {
    return "Database Unavailable: Check internet connection or Firebase service status.";
  }
  if (msg.includes("Operation timed out")) {
    return "Request Timed Out (10s): Slow network or unreachable Firebase backend.";
  }
  return msg;
}

export async function fetchWithTimeout<T>(promise: Promise<T>, ms: number = FIREBASE_TIMEOUT_MS): Promise<T> {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw err;
  }
}

export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === "object" && item !== null ? cleanFirestoreData(item) : item)) as unknown as T;
  }
  if (typeof data === "object" && !((data as any) instanceof Date)) {
    // Preserve Firestore FieldValue and Timestamp instances (including deleteField)
    if (
      typeof (data as any).toMillis === "function" ||
      (data as any)._methodName ||
      (data as any)._delegate !== undefined ||
      (data as any).constructor?.name === "FieldValue" ||
      (data as any).constructor?.name === "DeleteFieldValueImpl"
    ) {
      return data;
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(data as Record<string, any>)) {
      const val = (data as Record<string, any>)[key];
      if (val !== undefined) {
        result[key] = typeof val === "object" && val !== null ? cleanFirestoreData(val) : val;
      }
    }
    return result as T;
  }
  return data;
}

// ─── Default Categories ───────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: "processor", name: "Processor", iconName: "Cpu", color: "from-blue-500/10 to-blue-600/5", order: 1, description: "Intel Core & AMD Ryzen CPUs" },
  { id: "laptop", name: "Laptop", iconName: "Laptop", color: "from-purple-500/10 to-purple-600/5", order: 2, description: "Laptops, MacBooks & Notebooks" },
  { id: "printer", name: "Printer", iconName: "Printer", color: "from-emerald-500/10 to-emerald-600/5", order: 3, description: "Inkjet, Laser, Thermal & Multifunction Printers" },
  { id: "desktop-pc", name: "Desktop & PC", iconName: "Monitor", color: "from-amber-500/10 to-amber-600/5", order: 4, description: "Desktops, Motherboards, RAM & Internal SSDs" },
  { id: "cctv-security", name: "CCTV & Security", iconName: "Camera", color: "from-blue-500/10 to-blue-600/5", order: 5, description: "DVR, NVR, Cameras & Surveillance" },
  { id: "router-networking", name: "Router & Networking", iconName: "Wifi", color: "from-red-500/10 to-red-600/5", order: 6, description: "Routers, Switches, Access Points, Fiber ONTs" },
  { id: "scanner-billing", name: "Scanner & Billing", iconName: "Barcode", color: "from-pink-500/10 to-pink-600/5", order: 7, description: "Barcode Scanners, Receipt Printers, POS Terminals" },
  { id: "biometric-attendance", name: "Biometric & Attendance", iconName: "Fingerprint", color: "from-rose-500/10 to-rose-600/5", order: 8, description: "Fingerprint & Face Recognition Devices" },
  { id: "monitor-display", name: "Monitor & Display", iconName: "Tv", color: "from-violet-500/10 to-violet-600/5", order: 9, description: "Monitors, Displays, Projectors & Screens" },
  { id: "ups-inverter", name: "UPS & Inverter", iconName: "Cpu", color: "from-indigo-500/10 to-indigo-600/5", order: 10, description: "UPS Units, Batteries & Power Supplies" },
  { id: "toner-cartridge", name: "Toner / Cartridge", iconName: "Layers", color: "from-cyan-500/10 to-cyan-600/5", order: 11, description: "Toner refill, Drum replacement & Cartridges" },
  { id: "accessories", name: "Accessories", iconName: "Package", color: "from-slate-500/10 to-slate-600/5", order: 12, description: "Cables, Adapters, Keyboards & Mice" },
];

let _cachedCategories: Category[] | null = null;

// ─── Master Categories (Cached & 0-Read Capable) ──────────────────────────────

export async function getCategories(forceRefresh = false): Promise<Category[]> {
  if (!forceRefresh && _cachedCategories && _cachedCategories.length > 0) {
    return _cachedCategories;
  }

  // Check localStorage (< 1ms, 0 Firestore reads)
  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("zorba_categories_cache");
      if (stored) {
        _cachedCategories = JSON.parse(stored);
        if (_cachedCategories && _cachedCategories.length > 0) {
          return _cachedCategories;
        }
      }
    } catch {
      // fallback
    }
  }

  // Return static defaults instantly for public users without Firestore query
  if (!forceRefresh) {
    _cachedCategories = DEFAULT_CATEGORIES as Category[];
    if (typeof window !== "undefined") {
      safeLocalStorageSet("zorba_categories_cache", JSON.stringify(_cachedCategories));
    }
    return _cachedCategories;
  }

  try {
    let snap;
    try {
      const q = query(collection(db, "categories"), orderBy("order", "asc"));
      snap = await fetchWithTimeout(getDocs(q));
    } catch {
      snap = await fetchWithTimeout(getDocs(collection(db, "categories")));
    }
    const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
    if (categories.length === 0) {
      return DEFAULT_CATEGORIES as Category[];
    }
    _cachedCategories = categories;
    if (typeof window !== "undefined") {
      safeLocalStorageSet("zorba_categories_cache", JSON.stringify(categories));
    }
    return categories;
  } catch (err: any) {
    console.warn("getCategories fallback to default categories:", err);
    return DEFAULT_CATEGORIES as Category[];
  }
}

export async function createCategory(
  data: Omit<Category, "id" | "createdAt">
): Promise<void> {
  const docId = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`;
  const docRef = doc(db, "categories", docId);
  await setDoc(docRef, {
    id: docId,
    ...data,
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "categories", id), data);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}


// ─── Products (Slim In-Memory Index with Non-Blocking Delta-Sync) ──────────────

export interface ProductIndexItem {
  id: string;
  name: string;
  brand?: string;
  model: string;
  itemCode?: string;
  categoryId: string;
  category?: string;
  price?: number | null;
  stockCount?: number;
  uom?: string;
  inStock: boolean;
  showOnWebsite: boolean;
  showPriceOnWebsite?: boolean;
  featured?: boolean;
  photoUrl?: string | null;
  description?: string;
  warranty?: string;
  serviceCenter?: string;
  productUrl?: string;
  customFields?: any[];
  order?: number | null;
  createdAt?: any;
  updatedAt?: any;
}

const CATALOG_MANIFEST_VERSION = "v3_20260828_clean";
const STORAGE_KEY_PRODUCT_INDEX = `zorba_prod_index_${CATALOG_MANIFEST_VERSION}`;
const STORAGE_KEY_PRODUCT_SYNC = `zorba_prod_sync_${CATALOG_MANIFEST_VERSION}`;
const STORAGE_KEY_CATALOG_VERSION = "zorba_catalog_manifest_version";
export const STORAGE_KEY_CUSTOMER_INDEX = "zorba_cust_index_v5";
export const STORAGE_KEY_CUSTOMER_SYNC = "zorba_cust_sync_v5";

/**
 * Safe localStorage setter that never throws DOMException: QuotaExceededError.
 * When browser storage quota is reached, it purges stale bulk cache keys to reclaim space.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[safeLocalStorageSet] Storage quota exceeded for key "${key}":`, err?.message);
    if (err?.name === "QuotaExceededError" || err?.code === 22 || err?.code === 1014) {
      try {
        localStorage.removeItem(STORAGE_KEY_CUSTOMER_INDEX);
        localStorage.removeItem("zorba_cust_index_v4");
        localStorage.removeItem(STORAGE_KEY_PRODUCT_INDEX);
        localStorage.removeItem("zorba_categories_cache");
      } catch {}
    }
    return false;
  }
}

let _productIndex: ProductIndexItem[] = [];
let _isProductIndexInitialized = false;
let _isSyncingProductIndex = false;
let _lastProductSyncTimestamp = 0;

// Load local product sync timestamp synchronously on startup (< 1ms)
function loadLocalProductIndex(): void {
  if (typeof window === "undefined") return;
  try {
    // Purge large legacy product blob from localStorage to free browser storage quota (saves ~2.4 MB)
    localStorage.removeItem(STORAGE_KEY_PRODUCT_INDEX);
    localStorage.removeItem("zorba_prod_index_v2");
    const syncStr = localStorage.getItem(STORAGE_KEY_PRODUCT_SYNC);
    if (syncStr) {
      _lastProductSyncTimestamp = parseInt(syncStr, 10) || 0;
    }
  } catch (e) {
    console.warn("Failed to check local product sync timestamp:", e);
  }
}
loadLocalProductIndex();

// Auto delta sync on window focus if stale (> 30s) or on real-time sync signal
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    if (Date.now() - _lastProductSyncTimestamp > 30000 && !_isSyncingProductIndex) {
      syncProductIndex();
    }
  });

  subscribeSyncSignal("products", () => {
    syncProductIndex();
  });
  subscribeSyncSignal("customers", () => {
    syncCustomerIndex();
  });
}

/**
 * Non-blocking background delta-sync for catalog products.
 * Downloads only modified product records since lastSync without blocking UI.
 * Payload is ultra-slim (~50 bytes/record, ~350 KB for 7,000 products).
 */
export async function syncProductIndex(forceFull = false): Promise<void> {
  if (_isSyncingProductIndex) return;
  _isSyncingProductIndex = true;

  try {
    let lastSync = 0;
    if (typeof window !== "undefined") {
      const syncStr = localStorage.getItem(STORAGE_KEY_PRODUCT_SYNC);
      if (syncStr) lastSync = parseInt(syncStr, 10) || 0;
    }

    if (forceFull || _productIndex.length === 0 || lastSync === 0) {
      // 1. Ultra-fast bootstrap from static CDN manifest (< 40ms, 0 Firestore Reads)
      let loadedFromManifest = false;
      if (typeof window !== "undefined" && !forceFull) {
        try {
          const res = await fetch(`/data/products_manifest.json?v=${CATALOG_MANIFEST_VERSION}`);
          if (res.ok) {
            const manifestData = await res.json();
            if (Array.isArray(manifestData) && manifestData.length > 0) {
              const categoryNames: Record<string, string> = {
                processor: "Processor",
                printer: "Printer",
                "toner-cartridge": "Toner / Cartridge",
                laptop: "Laptop",
                "desktop-pc": "Desktop & PC",
                "cctv-security": "CCTV & Security",
                "router-networking": "Router & Networking",
                "monitor-display": "Monitor & Display",
                "ups-inverter": "UPS & Inverter",
                "scanner-billing": "Scanner & Billing",
                "biometric-attendance": "Biometric & Attendance",
                accessories: "Accessories",
              };
              _productIndex = manifestData.map((it: any) => ({
                id: it.id,
                name: it.n || "",
                brand: it.b || "",
                model: it.m || "",
                itemCode: "",
                categoryId: it.c || "accessories",
                category: categoryNames[it.c] || "Accessories",
                price: it.p !== undefined ? it.p : null,
                stockCount: typeof it.s === "number" ? it.s : 0,
                uom: it.u || "Nag.",
                inStock: it.i === 1,
                showOnWebsite: it.v !== 0,
                showPriceOnWebsite: it.p !== null && it.p > 0,
                featured: false,
                photoUrl: null,
                description: "",
                order: null,
                createdAt: 1787860000000,
                updatedAt: 1787860000000,
              }));
              loadedFromManifest = true;
              lastSync = 1787860000000;
            }
          }
        } catch (manifestErr) {
          console.warn("Manifest bootstrap fallback:", manifestErr);
        }
      }

      // 2. If manifest was unavailable or full refresh requested, query Firestore
      if (!loadedFromManifest && _productIndex.length === 0) {
        try {
          const snap = await fetchWithTimeout(getDocs(collection(db, "products")));
          const items: ProductIndexItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || "",
              brand: data.brand || "",
              model: data.model || "",
              itemCode: data.itemCode || "",
              categoryId: data.categoryId || "",
              category: data.category || "",
              price: data.price !== undefined ? data.price : null,
              stockCount: typeof data.stockCount === "number" ? data.stockCount : 0,
              uom: data.uom || "Nag.",
              inStock: data.inStock !== undefined ? Boolean(data.inStock) : true,
              showOnWebsite: data.showOnWebsite !== undefined ? Boolean(data.showOnWebsite) : true,
              showPriceOnWebsite: data.showPriceOnWebsite !== undefined ? Boolean(data.showPriceOnWebsite) : true,
              featured: Boolean(data.featured),
              photoUrl: data.photoUrl || null,
              description: data.description || "",
              order: data.order !== undefined ? data.order : null,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
            };
          });
          _productIndex = items;
        } catch (fsErr) {
          console.warn("Firestore products fetch fallback error:", fsErr);
        }
      }
    } else {
      // Delta sync: fetch only updated docs since last sync with 60s overlap buffer
      const sinceTime = Math.max(0, lastSync - 60000);
      const deltaQ = query(
        collection(db, "products"),
        where("updatedAt", ">", sinceTime)
      );
      try {
        const snap = await fetchWithTimeout(getDocs(deltaQ));
        if (!snap.empty) {
          const itemMap = new Map<string, ProductIndexItem>(_productIndex.map((p) => [p.id, p]));
          snap.docs.forEach((d) => {
            const data = d.data();
            itemMap.set(d.id, {
              id: d.id,
              name: data.name || "",
              brand: data.brand || "",
              model: data.model || "",
              itemCode: data.itemCode || "",
              categoryId: data.categoryId || "",
              category: data.category || "",
              price: data.price !== undefined ? data.price : null,
              stockCount: typeof data.stockCount === "number" ? data.stockCount : 0,
              uom: data.uom || "Nag.",
              inStock: data.inStock !== undefined ? Boolean(data.inStock) : true,
              showOnWebsite: data.showOnWebsite !== undefined ? Boolean(data.showOnWebsite) : true,
              showPriceOnWebsite: data.showPriceOnWebsite !== undefined ? Boolean(data.showPriceOnWebsite) : true,
              featured: Boolean(data.featured),
              photoUrl: data.photoUrl || null,
              description: data.description || "",
              order: data.order !== undefined ? data.order : null,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
            });
          });
          _productIndex = Array.from(itemMap.values());
        }
      } catch (deltaErr) {
        console.warn("Delta products sync error:", deltaErr);
      }
    }

    if (typeof window !== "undefined") {
      safeLocalStorageSet(STORAGE_KEY_PRODUCT_SYNC, String(Date.now()));
    }
  } catch (err) {
    console.warn("Background product sync error:", err);
  } finally {
    _isSyncingProductIndex = false;
    _isProductIndexInitialized = true;
  }
}

export function invalidateProductsCache() {
  _productIndex = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_PRODUCT_INDEX);
    localStorage.removeItem(STORAGE_KEY_PRODUCT_SYNC);
  }
}

export function getProductIndexCount(): number {
  return _productIndex.length;
}

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh && _productIndex.length > 0) {
    if (!_isSyncingProductIndex) syncProductIndex();
    return _productIndex as Product[];
  }
  try {
    await syncProductIndex(forceRefresh);
    return _productIndex as Product[];
  } catch (err: any) {
    if (_productIndex.length > 0) return _productIndex as Product[];
    console.error("getProducts error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  // 1. Instant check in memory index (< 0.1ms)
  if (_productIndex.length === 0) {
    await syncProductIndex();
  }

  if (_productIndex.length > 0) {
    const cached = _productIndex.find((p) => p.id === id || p.model?.toUpperCase() === id.toUpperCase());
    if (cached) return cached as Product;
  }

  try {
    const snap = await fetchWithTimeout(getDoc(doc(db, "products", id)));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Product;
  } catch (err: any) {
    console.error("getProduct error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getPublicProducts(options?: {
  categoryId?: string;
  pageSize?: number;
  offset?: number;
  page?: number;
  lastDoc?: any;
  search?: string;
}): Promise<PaginatedResult<Product>> {
  if (_productIndex.length === 0) {
    await syncProductIndex();
  }

  const pageSize = options?.pageSize || 24;
  let offset = 0;
  if (options?.offset !== undefined) {
    offset = options.offset;
  } else if (typeof options?.lastDoc === "number") {
    offset = options.lastDoc;
  } else if (options?.page) {
    offset = (options.page - 1) * pageSize;
  }

  const categoryId = options?.categoryId && options.categoryId !== "all" ? options.categoryId : undefined;
  const searchRaw = (options?.search || "").trim().toLowerCase();
  const searchTokens = searchRaw ? searchRaw.split(/\s+/).filter(Boolean) : [];

  let pool = _productIndex.filter((p) => p.showOnWebsite !== false);

  if (categoryId) {
    pool = pool.filter((p) => p.categoryId === categoryId);
  }

  if (searchTokens.length > 0) {
    // Multi-token full-text search across all 6,048 products
    pool = pool.filter((p) => {
      const searchTarget = `${p.name} ${p.brand || ""} ${p.model || ""} ${p.category || ""} ${p.itemCode || ""} ${p.description || ""}`.toLowerCase();
      return searchTokens.every((token) => searchTarget.includes(token));
    });

    // Priority: In-Stock items FIRST, Out-of-Stock items AFTER in-stock items
    pool.sort((a, b) => {
      if (a.inStock !== b.inStock) {
        return a.inStock ? -1 : 1;
      }
      return (b.stockCount || 0) - (a.stockCount || 0);
    });
  } else {
    // Default browse mode (no search): ONLY show IN-STOCK items!
    pool = pool.filter((p) => p.inStock === true && (p.stockCount || 0) > 0);

    // Sort by featured, custom order, then stock count
    pool.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.order != null && b.order != null) return a.order - b.order;
      return (b.stockCount || 0) - (a.stockCount || 0);
    });
  }

  const total = pool.length;
  const items = pool.slice(offset, offset + pageSize) as Product[];
  const nextOffset = offset + pageSize;
  const hasMore = nextOffset < total;

  return {
    items,
    hasMore,
    totalCount: total,
    lastDoc: nextOffset as any,
  };
}

export async function getProductsPaginated(options?: {
  pageSize?: number;
  lastDoc?: DocumentSnapshot | QueryDocumentSnapshot;
  categoryId?: string;
  visibilityFilter?: "all" | "website" | "erp";
}): Promise<PaginatedResult<Product>> {
  const pageSize = options?.pageSize || 25;
  const categoryId = options?.categoryId && options.categoryId !== "all" ? options.categoryId : undefined;
  const visibility = options?.visibilityFilter || "all";

  try {
    const constraints: any[] = [];

    if (categoryId) {
      constraints.push(where("categoryId", "==", categoryId));
    }
    if (visibility === "website") {
      constraints.push(where("showOnWebsite", "==", true));
    } else if (visibility === "erp") {
      constraints.push(where("showOnWebsite", "==", false));
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize + 1));

    if (options?.lastDoc && typeof (options.lastDoc as any)?.data === "function") {
      constraints.push(startAfter(options.lastDoc));
    }

    const q = query(collection(db, "products"), ...constraints);
    const snap = await fetchWithTimeout(getDocs(q));

    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const newLastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined;

    const items = resultDocs.map((d) => ({ id: d.id, ...d.data() }) as Product);

    return {
      items,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err) {
    console.warn("getProductsPaginated indexed query fallback:", err);
    try {
      const q = query(collection(db, "products"), limit(pageSize + 1));
      const snap = await fetchWithTimeout(getDocs(q));
      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const items = resultDocs.map((d) => ({ id: d.id, ...d.data() }) as Product);
      return {
        items,
        lastDoc: resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined,
        hasMore,
      };
    } catch {
      return { items: [], hasMore: false };
    }
  }
}

/**
 * Instant in-memory search for 7,000+ catalog products (< 1ms, 0 Firestore reads).
 * Searches across name, model, brand, itemCode, and description without network lag.
 */
export async function searchProducts(
  queryText: string,
  categoryIdFilter?: string,
  limitCount = 30
): Promise<Product[]> {
  const clean = (queryText || "").trim().toLowerCase();

  // Trigger non-blocking delta sync if not initialized
  if (!_isProductIndexInitialized && !_isSyncingProductIndex) {
    syncProductIndex();
  }

  // Instant in-memory search if index is available
  if (_productIndex.length > 0) {
    let list = _productIndex;
    if (categoryIdFilter && categoryIdFilter !== "all") {
      const catLower = categoryIdFilter.toLowerCase();
      list = list.filter((p) => p.categoryId?.toLowerCase() === catLower);
    }
    if (!clean) {
      return list.slice(0, limitCount) as Product[];
    }

    const tokens = clean.split(/\s+/).filter(Boolean);
    const results = list.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const model = (p.model || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const itemCode = (p.itemCode || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();

      return tokens.every(
        (token) =>
          name.includes(token) ||
          model.includes(token) ||
          brand.includes(token) ||
          itemCode.includes(token) ||
          desc.includes(token)
      );
    });

    results.sort((a, b) => {
      if (a.inStock !== b.inStock) {
        return a.inStock ? -1 : 1;
      }
      return (b.stockCount || 0) - (a.stockCount || 0);
    });

    return results.slice(0, limitCount) as Product[];
  }

  // Fallback if index not populated yet
  try {
    const res = await getProductsPaginated({
      pageSize: limitCount,
      categoryId: categoryIdFilter,
    });
    return res.items;
  } catch {
    return [];
  }
}

export async function createProduct(
  data: Partial<Product> & { name?: string; title?: string }
): Promise<Product> {
  const normalized = normalizeProduct(data as any);
  const cleanDocId = normalized.id || (data.tallyGuid ? data.tallyGuid : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const docRef = doc(db, "products", cleanDocId);
  
  const existing = await getDoc(docRef);
  if (existing.exists() && !data.tallyGuid && !data.id) {
    throw new Error(`A product with ID "${cleanDocId}" already exists.`);
  }

  const now = Date.now();
  const productData: Product = {
    ...normalized,
    tallyGuid: normalized.tallyGuid ?? undefined,
    id: cleanDocId,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, cleanFirestoreData(productData), { merge: true });

  // Immediate local cache update for instant UI feedback
  const slimItem: ProductIndexItem = {
    id: productData.id,
    name: productData.name,
    brand: productData.brand,
    model: productData.model,
    itemCode: productData.itemCode,
    categoryId: productData.categoryId,
    category: productData.category,
    price: productData.price,
    stockCount: productData.stockCount,
    uom: productData.uom,
    inStock: productData.inStock,
    showOnWebsite: productData.showOnWebsite ?? true,
    showPriceOnWebsite: productData.showPriceOnWebsite,
    featured: productData.featured,
    photoUrl: productData.photoUrl,
    description: productData.description,
    order: productData.order,
    createdAt: now,
    updatedAt: now,
  };
  _productIndex.unshift(slimItem);
  if (typeof window !== "undefined") {
    safeLocalStorageSet(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
  }

  // Sync model number to service call models auto-suggest if present
  if (productData.categoryId && productData.model) {
    getCategories().then((cats) => {
      const cat = cats.find((c) => c.id === productData.categoryId);
      if (cat && productData.model) {
        saveDeviceModel(cat.name, productData.model).catch(() => {});
      }
    }).catch(() => {});
  }

  publishSyncSignal("products", { action: "create", resourceId: cleanDocId });

  return productData;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  try {
    const sanitized: any = { ...data };
    if (sanitized.name) sanitized.name = toTitleCase(sanitized.name);
    if (sanitized.brand) sanitized.brand = toTitleCase(sanitized.brand);
    if (sanitized.category) sanitized.category = toTitleCase(sanitized.category);
    if (sanitized.model !== undefined) sanitized.model = sanitized.model ? sanitized.model.trim() : "";
    if (sanitized.itemCode !== undefined) sanitized.itemCode = sanitized.itemCode.trim().toUpperCase();
    if (sanitized.warranty !== undefined) sanitized.warranty = sanitized.warranty.trim();
    if (sanitized.serviceCenter) sanitized.serviceCenter = toTitleCase(sanitized.serviceCenter);
    if (sanitized.description) sanitized.description = sanitized.description.trim();
    if (sanitized.showOnWebsite !== undefined) sanitized.showOnWebsite = Boolean(sanitized.showOnWebsite);
    if (sanitized.showPriceOnWebsite !== undefined) sanitized.showPriceOnWebsite = Boolean(sanitized.showPriceOnWebsite);

    const now = Date.now();
    await updateDoc(
      doc(db, "products", id),
      cleanFirestoreData({
        ...sanitized,
        updatedAt: now,
      })
    );

    // Immediate local cache update
    const idx = _productIndex.findIndex((p) => p.id === id);
    if (idx !== -1) {
      _productIndex[idx] = {
        ..._productIndex[idx],
        ...sanitized,
        updatedAt: now,
      };
      if (typeof window !== "undefined") {
        safeLocalStorageSet(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
      }
    }

    publishSyncSignal("products", { action: "update", resourceId: id });
  } catch (err: any) {
    console.error("updateProduct error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function toggleProductWebsiteVisibility(
  id: string,
  showOnWebsite: boolean
): Promise<void> {
  try {
    const now = Date.now();
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, {
      showOnWebsite,
      updatedAt: now,
    });

    const idx = _productIndex.findIndex((p) => p.id === id);
    if (idx !== -1) {
      _productIndex[idx] = {
        ..._productIndex[idx],
        showOnWebsite,
        updatedAt: now,
      };
      if (typeof window !== "undefined") {
        safeLocalStorageSet(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
      }
    }

    publishSyncSignal("products", { action: "update", resourceId: id });
  } catch (err: any) {
    console.error("toggleProductWebsiteVisibility error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "products", id));
    const idx = _productIndex.findIndex((p) => p.id === id);
    if (idx !== -1) {
      _productIndex.splice(idx, 1);
      if (typeof window !== "undefined") {
        safeLocalStorageSet(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
      }
    }
    publishSyncSignal("products", { action: "delete", resourceId: id });
  } catch (err: any) {
    console.error("deleteProduct error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

/**
 * Automatically resizes and converts images to WebP format in the browser via Canvas.
 * Reduces 5MB-10MB phone camera photos to ~60KB - 90KB with zero visible quality loss.
 */
export async function compressImageToWebP(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Blob> {
  const { maxWidth = 1000, maxHeight = 1000, quality = 0.82 } = options;

  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.FileReader) {
      resolve(file);
      return;
    }

    // Skip compression if already a tiny SVG or already small WebP (< 50KB)
    if (file.type === "image/svg+xml" || (file.type === "image/webp" && file.size < 50000)) {
      resolve(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadProductPhoto(
  file: File,
  productId: string
): Promise<string> {
  try {
    const compressedBlob = await compressImageToWebP(file, {
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.82,
    });

    const isWebP = compressedBlob.type === "image/webp";
    const ext = isWebP ? "webp" : file.name.split(".").pop() || "jpg";
    const storageRef = ref(storage, `products/${productId}.${ext}`);
    const snap = await uploadBytes(storageRef, compressedBlob, {
      contentType: isWebP ? "image/webp" : file.type,
      cacheControl: "public, max-age=31536000",
    });
    return await getDownloadURL(snap.ref);
  } catch (err: any) {
    console.error("uploadProductPhoto error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteProductPhoto(productId: string): Promise<void> {
  try {
    const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    for (const ext of extensions) {
      try {
        const storageRef = ref(storage, `products/${productId}.${ext}`);
        await deleteObject(storageRef);
        break;
      } catch {
        // continue
      }
    }
  } catch (err) {
    console.warn("Could not delete photo:", err);
  }
}

// ─── Dedicated Device Repair Hardware Categories (Decoupled from Sales Catalog) ──

export const DEFAULT_DEVICE_REPAIR_CATEGORIES: string[] = [
  "CCTV & Security",
  "Laptop",
  "Desktop & PC",
  "Printer & Scanner",
  "Motherboard & Chip-Level",
  "UPS & Power Inverter",
  "Monitor & Display",
  "Networking & Wi-Fi",
  "Server & Storage",
  "Other Peripheral",
];

export async function getDeviceCategories(): Promise<DeviceCategory[]> {
  try {
    const snap = await getDocs(collection(db, "device_categories"));
    if (!snap.empty) {
      return snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || d.id,
        description: d.data().description || "",
        createdAt: d.data().createdAt || Date.now(),
      }));
    }
  } catch (err) {
    console.warn("Could not read device_categories collection:", err);
  }

  // Default repair categories fallback
  return DEFAULT_DEVICE_REPAIR_CATEGORIES.map((catName) => ({
    id: catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: catName,
    description: "Standard hardware repair category",
    createdAt: Date.now(),
  }));
}

export async function createDeviceCategory(
  name: string,
  description?: string
): Promise<DeviceCategory> {
  const cleanName = toTitleCase(name.trim());
  const docRef = doc(collection(db, "device_categories"));
  const newCat: DeviceCategory = {
    id: docRef.id,
    name: cleanName,
    description: description || "",
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCat));
  return newCat;
}

// ─── Customers (Fast Slim Index & Non-Blocking Delta-Sync) ─────────────────────

export interface CustomerIndexItem {
  id: string;
  name: string;
  phone: string;
  additionalPhones?: string[];
  companyName?: string;
  email?: string;
  address?: string;
  city?: string;
  group?: string;
  createdAt?: string | number;
  updatedAt?: number;
}

/**
 * Deduplicate customer records by:
 * 1. Unique Firestore document ID
 * 2. Valid 10-digit mobile number (Indian mobile standards)
 * 3. Normalized Name + Company for records without a mobile number (common in Tally ledger syncs)
 * When duplicate records exist, merges fields prioritizing richer non-empty data and latest updatedAt.
 */
export function deduplicateCustomers<T extends {
  id: string;
  name: string;
  phone?: string;
  additionalPhones?: string[];
  companyName?: string;
  email?: string;
  address?: string;
  city?: string;
  group?: string;
  createdAt?: string | number;
  updatedAt?: number;
}>(items: T[]): T[] {
  if (!items || items.length <= 1) return items;

  const idMap = new Map<string, T>();
  const phoneToId = new Map<string, string>();
  const nameToId = new Map<string, string>();

  for (const item of items) {
    if (!item || !item.id) continue;

    const p10 = normalizePhone10(item.phone);
    const normName = (item.name || "").trim().toLowerCase();
    const normCompany = (item.companyName || "").trim().toLowerCase();
    const nameKey = normName ? `${normName}::${normCompany}` : "";

    // Check if this document already matched by ID, phone, or name
    let existingId: string | undefined;
    if (idMap.has(item.id)) {
      existingId = item.id;
    } else if (p10 && p10.length >= 10 && phoneToId.has(p10)) {
      existingId = phoneToId.get(p10);
    } else if (!p10 && nameKey && nameToId.has(nameKey)) {
      existingId = nameToId.get(nameKey);
    }

    if (existingId && idMap.has(existingId)) {
      // Merge duplicate record with existing
      const existing = idMap.get(existingId)!;
      const mergedAdditionalPhones = Array.from(
        new Set([
          ...(existing.additionalPhones || []),
          ...(item.additionalPhones || []),
          ...(item.phone && item.phone !== existing.phone ? [item.phone] : []),
        ])
      );

      const merged: T = {
        ...existing,
        name: existing.name || item.name,
        phone: existing.phone || item.phone,
        additionalPhones: mergedAdditionalPhones.length > 0 ? mergedAdditionalPhones : undefined,
        companyName: existing.companyName || item.companyName,
        email: existing.email || item.email,
        address: (existing.address && existing.address.length > (item.address?.length || 0)) ? existing.address : (item.address || existing.address),
        city: existing.city || item.city,
        group: existing.group || item.group,
        updatedAt: Math.max(
          typeof existing.updatedAt === "number" ? existing.updatedAt : 0,
          typeof item.updatedAt === "number" ? item.updatedAt : 0
        ),
      };

      idMap.set(existingId, merged);
      if (p10 && p10.length >= 10) phoneToId.set(p10, existingId);
      if (nameKey) nameToId.set(nameKey, existingId);
    } else {
      idMap.set(item.id, item);
      if (p10 && p10.length >= 10) {
        phoneToId.set(p10, item.id);
      }
      if (item.additionalPhones) {
        for (const extra of item.additionalPhones) {
          const extra10 = normalizePhone10(extra);
          if (extra10 && extra10.length >= 10) phoneToId.set(extra10, item.id);
        }
      }
      if (nameKey) {
        nameToId.set(nameKey, item.id);
      }
    }
  }

  return Array.from(idMap.values());
}

let _customerIndex: CustomerIndexItem[] = [];
let _isCustomerIndexInitialized = false;
let _isSyncingIndex = false;

type CustomerSubscriber = (customers: Customer[]) => void;
const _customerSubscribers = new Set<CustomerSubscriber>();

export function subscribeCustomers(callback: CustomerSubscriber): () => void {
  _customerSubscribers.add(callback);
  if (_customerIndex.length > 0) {
    try {
      callback(_customerIndex as Customer[]);
    } catch {}
  }
  return () => {
    _customerSubscribers.delete(callback);
  };
}

export function notifyCustomerSubscribers(): void {
  const current = (_customerIndex.length > 0 ? _customerIndex : []) as Customer[];
  _customerSubscribers.forEach((cb) => {
    try {
      cb(current);
    } catch (e) {
      console.warn("Error in customer subscriber:", e);
    }
  });
}

let _customerSnapshotUnsub: (() => void) | null = null;

export function initCustomerRealtimeSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (_customerSnapshotUnsub) return _customerSnapshotUnsub;

  try {
    const recentQ = query(
      collection(db, "customers"),
      orderBy("updatedAt", "desc"),
      limit(25)
    );
    _customerSnapshotUnsub = onSnapshot(recentQ, (snap) => {
      let changed = false;
      snap.docChanges().forEach((change) => {
        const data = change.doc.data();
        const item: CustomerIndexItem = {
          id: change.doc.id,
          name: data.name || "",
          phone: data.phone || "",
          additionalPhones: data.additionalPhones || [],
          companyName: data.companyName,
          email: data.email,
          address: data.address,
          city: data.city,
          group: data.group,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
        };
        const idx = _customerIndex.findIndex((c) => c.id === item.id);
        if (change.type === "added") {
          if (idx === -1) {
            _customerIndex.unshift(item);
            changed = true;
          }
        } else if (change.type === "modified") {
          if (idx !== -1) {
            _customerIndex[idx] = { ..._customerIndex[idx], ...item };
            changed = true;
          } else {
            _customerIndex.unshift(item);
            changed = true;
          }
        } else if (change.type === "removed") {
          if (idx !== -1) {
            _customerIndex.splice(idx, 1);
            changed = true;
          }
        }
      });

      if (changed) {
        _customerIndex = deduplicateCustomers(_customerIndex);
        notifyCustomerSubscribers();
      }
    }, (err) => {
      console.debug("Customer realtime listener standby:", err.message);
    });
  } catch (e) {
    console.debug("initCustomerRealtimeSync error:", e);
  }

  return () => {
    if (_customerSnapshotUnsub) {
      _customerSnapshotUnsub();
      _customerSnapshotUnsub = null;
    }
  };
}

// Purge legacy bulk customer index from localStorage to permanently free browser quota
function loadLocalCustomerIndex(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOMER_INDEX);
    localStorage.removeItem("zorba_cust_index_v4");
  } catch {}
}
loadLocalCustomerIndex();

/**
 * Non-blocking background delta-sync.
 * Downloads all or modified customer records since lastSync.
 * Keeps entire index in-memory with automatic deduplication.
 */
export async function syncCustomerIndex(forceFull = false): Promise<void> {
  if (_isSyncingIndex) return;
  _isSyncingIndex = true;

  try {
    let lastSync = 0;
    if (typeof window !== "undefined") {
      const syncStr = localStorage.getItem(STORAGE_KEY_CUSTOMER_SYNC);
      if (syncStr) lastSync = parseInt(syncStr, 10) || 0;
    }

    if (forceFull || _customerIndex.length < 500 || lastSync === 0) {
      // Full sync: fetch all customer docs (slim projection with all search fields)
      const snap = await fetchWithTimeout(getDocs(collection(db, "customers")));
      const items: CustomerIndexItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          phone: data.phone || "",
          additionalPhones: data.additionalPhones || [],
          companyName: data.companyName,
          email: data.email,
          address: data.address,
          city: data.city,
          group: data.group,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
        };
      });
      _customerIndex = deduplicateCustomers(items);
    } else {
      // Delta sync: fetch only updated docs since last sync with 60s overlap buffer
      const sinceTime = Math.max(0, lastSync - 60000);
      const deltaQ = query(
        collection(db, "customers"),
        where("updatedAt", ">", sinceTime)
      );
      const snap = await fetchWithTimeout(getDocs(deltaQ));
      if (!snap.empty) {
        const itemMap = new Map<string, CustomerIndexItem>(_customerIndex.map((c) => [c.id, c]));
        snap.docs.forEach((d) => {
          const data = d.data();
          itemMap.set(d.id, {
            id: d.id,
            name: data.name || "",
            phone: data.phone || "",
            additionalPhones: data.additionalPhones || [],
            companyName: data.companyName,
            email: data.email,
            address: data.address,
            city: data.city,
            group: data.group,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
          });
        });
        _customerIndex = deduplicateCustomers(Array.from(itemMap.values()));
      }
    }

    if (typeof window !== "undefined") {
      safeLocalStorageSet(STORAGE_KEY_CUSTOMER_SYNC, String(Date.now()));
    }
    notifyCustomerSubscribers();
  } catch (err) {
    console.warn("Background customer sync error:", err);
  } finally {
    _isSyncingIndex = false;
    _isCustomerIndexInitialized = true;
  }
}

export function invalidateCustomersCache() {
  _customerIndex = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_CUSTOMER_INDEX);
    localStorage.removeItem(STORAGE_KEY_CUSTOMER_SYNC);
  }
  notifyCustomerSubscribers();
}

export async function getCustomers(forceRefresh = false): Promise<Customer[]> {
  initCustomerRealtimeSync();
  if (!forceRefresh && _customerIndex.length >= 500) {
    return _customerIndex as Customer[];
  }
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "customers")));
    const list = snap.docs.map((d) => {
      const c = d.data();
      return {
        id: d.id,
        name: c.name || "",
        phone: c.phone || "",
        additionalPhones: c.additionalPhones || [],
        companyName: c.companyName,
        email: c.email,
        address: c.address,
        city: c.city,
        group: c.group,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || (typeof c.createdAt === "number" ? c.createdAt : 0),
      } as Customer;
    });
    _customerIndex = deduplicateCustomers(list);
    if (typeof window !== "undefined") {
      safeLocalStorageSet(STORAGE_KEY_CUSTOMER_SYNC, String(Date.now()));
    }
    notifyCustomerSubscribers();
    return _customerIndex as Customer[];
  } catch (err: any) {
    if (_customerIndex.length > 0) return _customerIndex as Customer[];
    console.error("getCustomers error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export function normalizePhone10(rawPhone?: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function findCustomerByPhoneNumber(
  rawPhone: string,
  excludeCustomerId?: string
): Promise<Customer | null> {
  const target10 = normalizePhone10(rawPhone);
  if (!target10 || target10.length < 10) return null;

  // 1. Instant check in memory index (< 0.1ms)
  if (_customerIndex.length > 0) {
    for (const c of _customerIndex) {
      if (excludeCustomerId && c.id === excludeCustomerId) continue;
      if (normalizePhone10(c.phone) === target10) return c as Customer;
      if (c.additionalPhones?.some((p) => normalizePhone10(p) === target10)) return c as Customer;
    }
  }

  const cleanIndian = formatIndianPhoneNumber(rawPhone) || rawPhone;

  // 2. Direct indexed queries on primary and alternate phones
  const phoneVariants = Array.from(new Set([
    rawPhone,
    cleanIndian,
    target10,
    `+91 ${target10}`,
    `+91${target10}`,
    `0${target10}`,
  ])).filter(Boolean);

  try {
    for (const phoneVal of phoneVariants) {
      const q = query(
        collection(db, "customers"),
        where("phone", "==", phoneVal),
        limit(2)
      );
      const snap = await fetchWithTimeout(getDocs(q)).catch(() => null);
      if (snap && !snap.empty) {
        for (const d of snap.docs) {
          if (!excludeCustomerId || d.id !== excludeCustomerId) {
            return { id: d.id, ...d.data() } as Customer;
          }
        }
      }
    }

    for (const phoneVal of [cleanIndian, target10, rawPhone]) {
      const qExtra = query(
        collection(db, "customers"),
        where("additionalPhones", "array-contains", phoneVal),
        limit(2)
      );
      const snapExtra = await fetchWithTimeout(getDocs(qExtra)).catch(() => null);
      if (snapExtra && !snapExtra.empty) {
        for (const d of snapExtra.docs) {
          if (!excludeCustomerId || d.id !== excludeCustomerId) {
            return { id: d.id, ...d.data() } as Customer;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Direct indexed phone lookup error:", err);
  }

  return null;
}

export async function createCustomer(data: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  const target10 = normalizePhone10(data.phone);
  if (!target10 || target10.length < 10) {
    throw new Error("Please provide a valid 10-digit mobile number.");
  }

  // Check for duplicate mobile number
  const duplicate = await findCustomerByPhoneNumber(data.phone);
  if (duplicate) {
    throw new Error(
      `A customer already exists with this mobile number (${data.phone}): "${duplicate.name}" (ID: ${duplicate.id}). Duplicate registration is disallowed.`
    );
  }

  if (data.additionalPhones && data.additionalPhones.length > 0) {
    for (const extra of data.additionalPhones) {
      const extraDup = await findCustomerByPhoneNumber(extra);
      if (extraDup) {
        throw new Error(
          `A customer already exists with alternate mobile number (${extra}): "${extraDup.name}".`
        );
      }
    }
  }

  const dataAny = data as any;
  const explicitId = dataAny.id || dataAny.tallyGuid || dataAny.guid;
  const docRef = explicitId ? doc(db, "customers", explicitId) : doc(collection(db, "customers"));
  const formattedName = toTitleCase(data.name);
  const formattedPhone = formatIndianPhoneNumber(data.phone);
  const formattedCompany = data.companyName ? toTitleCase(data.companyName) : undefined;
  const formattedAddress = data.address ? toTitleCase(data.address) : undefined;
  const formattedCity = data.city ? toTitleCase(data.city) : undefined;
  const additionalPhones = data.additionalPhones?.map(formatIndianPhoneNumber);
  const now = Date.now();

  const newCust: Customer = {
    id: docRef.id,
    ...data,
    tallyGuid: dataAny.tallyGuid || dataAny.guid || (explicitId ? explicitId : undefined),
    name: formattedName,
    phone: formattedPhone,
    additionalPhones,
    companyName: formattedCompany,
    address: formattedAddress,
    city: formattedCity,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, cleanFirestoreData(newCust), { merge: true });

  // Immediate local cache update for instant UI feedback
  const slimItem: CustomerIndexItem = {
    id: newCust.id,
    name: newCust.name,
    phone: newCust.phone,
    additionalPhones: newCust.additionalPhones,
    companyName: newCust.companyName,
    email: newCust.email,
    address: newCust.address,
    city: newCust.city,
    group: newCust.group,
    createdAt: now,
    updatedAt: now,
  };
  _customerIndex.unshift(slimItem);
  _customerIndex = deduplicateCustomers(_customerIndex);
  notifyCustomerSubscribers();
  publishSyncSignal("customers", { action: "create", resourceId: newCust.id });

  return newCust;
}

export interface BatchImportCustomerResult {
  importedCount: number;
  duplicateCount: number;
  errorsCount: number;
}

/**
 * Fast chunked batch customer importer using writeBatch(db) in chunks of 100 docs.
 * Prevents sequential network request freezes during large CSV imports.
 */
export async function batchCreateCustomers(
  items: (Omit<Customer, "id" | "createdAt"> & { id?: string; tallyGuid?: string; guid?: string })[],
  onProgress?: (processed: number, total: number) => void
): Promise<BatchImportCustomerResult> {
  let importedCount = 0;
  let duplicateCount = 0;
  let errorsCount = 0;

  // Sync slim index into memory first to do 0ms in-memory duplicate checks
  await syncCustomerIndex();

  const toInsert: Customer[] = [];
  const seenPhonesInBatch = new Set<string>();

  for (const item of items) {
    const target10 = normalizePhone10(item.phone);
    if (!target10 || target10.length < 10) {
      errorsCount++;
      continue;
    }

    if (seenPhonesInBatch.has(target10)) {
      duplicateCount++;
      continue;
    }

    const dup = _customerIndex.find((c) => normalizePhone10(c.phone) === target10);
    const itemAny = item as any;
    const explicitId = itemAny.id || itemAny.tallyGuid || itemAny.guid;

    if (dup && !explicitId) {
      duplicateCount++;
      continue;
    }

    seenPhonesInBatch.add(target10);

    const docId = explicitId || (dup ? dup.id : undefined);
    const docRef = docId ? doc(db, "customers", docId) : doc(collection(db, "customers"));
    const now = Date.now();
    const newCust: Customer = {
      id: docRef.id,
      ...item,
      tallyGuid: itemAny.tallyGuid || itemAny.guid || (docId ? docId : undefined),
      name: toTitleCase(item.name),
      phone: formatIndianPhoneNumber(item.phone),
      additionalPhones: item.additionalPhones?.map(formatIndianPhoneNumber),
      companyName: item.companyName ? toTitleCase(item.companyName) : undefined,
      address: item.address ? toTitleCase(item.address) : undefined,
      city: item.city ? toTitleCase(item.city) : undefined,
      createdAt: dup?.createdAt || now,
      updatedAt: now,
    };
    toInsert.push(newCust);
  }

  // Commit in chunks of 100 documents
  const CHUNK_SIZE = 100;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const cust of chunk) {
      const docRef = doc(db, "customers", cust.id);
      batch.set(docRef, cleanFirestoreData(cust), { merge: true });
    }

    await batch.commit();

    // Update in-memory slim index
    for (const cust of chunk) {
      _customerIndex.unshift({
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        additionalPhones: cust.additionalPhones,
        companyName: cust.companyName,
        email: cust.email,
        createdAt: cust.createdAt,
        updatedAt: cust.updatedAt,
      });
    }

    importedCount += chunk.length;
    onProgress?.(importedCount, toInsert.length);
  }

  if (importedCount > 0) {
    _customerIndex = deduplicateCustomers(_customerIndex);
    publishSyncSignal("customers", { action: "create" });
  }

  return {
    importedCount,
    duplicateCount,
    errorsCount,
  };
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  if (data.phone) {
    const duplicate = await findCustomerByPhoneNumber(data.phone, id);
    if (duplicate) {
      throw new Error(
        `Another customer already exists with this mobile number (${data.phone}): "${duplicate.name}".`
      );
    }
  }

  if (data.additionalPhones && data.additionalPhones.length > 0) {
    for (const extra of data.additionalPhones) {
      const extraDup = await findCustomerByPhoneNumber(extra, id);
      if (extraDup) {
        throw new Error(
          `Another customer already exists with alternate mobile number (${extra}): "${extraDup.name}".`
        );
      }
    }
  }

  const existingSnap = await getDoc(doc(db, "customers", id)).catch(() => null);
  const existing = existingSnap?.exists() ? (existingSnap.data() as Customer) : null;

  const formattedName = data.name ? toTitleCase(data.name) : existing?.name;
  const formattedPhone = data.phone ? formatIndianPhoneNumber(data.phone) : existing?.phone;
  const formattedCompany = data.companyName !== undefined ? (data.companyName ? toTitleCase(data.companyName) : undefined) : existing?.companyName;
  const formattedAddress = data.address !== undefined ? (data.address ? toTitleCase(data.address) : undefined) : existing?.address;
  const formattedCity = data.city !== undefined ? (data.city ? toTitleCase(data.city) : undefined) : existing?.city;
  const email = data.email !== undefined ? data.email : existing?.email;
  const additionalPhones = data.additionalPhones ? data.additionalPhones.map(formatIndianPhoneNumber) : existing?.additionalPhones;
  const now = Date.now();

  const formattedData: Partial<Customer> = {
    ...data,
    ...(formattedName ? { name: formattedName } : {}),
    ...(formattedPhone ? { phone: formattedPhone } : {}),
    ...(additionalPhones ? { additionalPhones } : {}),
    ...(data.companyName !== undefined ? { companyName: formattedCompany } : {}),
    ...(data.address !== undefined ? { address: formattedAddress } : {}),
    ...(data.city !== undefined ? { city: formattedCity } : {}),
    updatedAt: now,
  };
  await setDoc(doc(db, "customers", id), cleanFirestoreData(formattedData), { merge: true });

  // Immediate local cache update
  const idx = _customerIndex.findIndex((c) => c.id === id);
  if (idx !== -1) {
    _customerIndex[idx] = {
      ..._customerIndex[idx],
      ...formattedData,
      id,
      name: formattedName || _customerIndex[idx].name,
      phone: formattedPhone || _customerIndex[idx].phone,
      updatedAt: now,
    };
    notifyCustomerSubscribers();
  }

  publishSyncSignal("customers", { action: "update", resourceId: id });
}



/**
 * Instant in-memory search for 5,000+ customers (< 1ms).
 * Searches across name, phone, alternate numbers, company, and email with zero network delay.
 */
export async function searchCustomers(queryText: string, limitCount = 50): Promise<Customer[]> {
  const clean = (queryText || "").trim().toLowerCase();

  // Ensure customer index is populated with full catalog
  if (_customerIndex.length < 500) {
    await getCustomers().catch(() => {});
  }

  // Instant in-memory search if index is available
  if (_customerIndex.length > 0) {
    if (!clean) {
      return _customerIndex.slice(0, limitCount) as Customer[];
    }

    const qDigits = clean.replace(/\D/g, "");
    const tokens = clean.split(/\s+/).filter(Boolean);

    const matches = _customerIndex.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const phoneDigits = phone.replace(/\D/g, "");
      const company = (c.companyName || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const group = (c.group || "").toLowerCase();
      const address = (c.address || "").toLowerCase();
      const city = (c.city || "").toLowerCase();

      // Direct phone match
      if (qDigits && qDigits.length >= 3) {
        if (phoneDigits.includes(qDigits) || phone.includes(clean)) {
          return true;
        }
        if (c.additionalPhones && c.additionalPhones.some((p) => (p || "").replace(/\D/g, "").includes(qDigits))) {
          return true;
        }
      }

      // Exact substring match in primary fields (e.g. "Jain", "Ultratech")
      if (
        name.includes(clean) ||
        company.includes(clean) ||
        group.includes(clean) ||
        city.includes(clean) ||
        email.includes(clean) ||
        address.includes(clean)
      ) {
        return true;
      }

      // Check all query words match across name, company, group, address, or email
      return tokens.every((tok) =>
        name.includes(tok) ||
        company.includes(tok) ||
        group.includes(tok) ||
        city.includes(tok) ||
        address.includes(tok) ||
        email.includes(tok)
      );
    });

    return matches.slice(0, limitCount) as Customer[];
  }

  // Cold start fallback if cache is still downloading
  try {
    const q = query(collection(db, "customers"), limit(limitCount));
    const snap = await fetchWithTimeout(getDocs(q));
    return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as Customer);
  } catch {
    return [];
  }
}


export async function getCustomer(id: string): Promise<Customer | null> {
  if (!id || id === "import") return null;
  const cleanId = decodeURIComponent(id).trim();

  // Strategy 1: Direct Firestore Document ID lookup
  try {
    const snap = await fetchWithTimeout(getDoc(doc(db, "customers", cleanId)));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Customer;
    }
  } catch (err: any) {
    console.warn("getCustomer direct document lookup warning:", err);
  }

  // Strategy 2: Lookup by Mobile Phone Number
  try {
    const byPhone = await findCustomerByPhoneNumber(cleanId);
    if (byPhone) return byPhone;
  } catch (err) {
    console.warn("findCustomerByPhoneNumber fallback error:", err);
  }

  // Strategy 3: Lookup in in-memory / full customer list (by ID, Phone digits, or Name)
  try {
    const all = await getCustomers();
    const cleanLower = cleanId.toLowerCase();
    const cleanDigits = cleanId.replace(/\D/g, "");

    const found = all.find((c) => {
      if (c.id === cleanId || c.id?.toLowerCase() === cleanLower) return true;
      if (cleanDigits && cleanDigits.length >= 10) {
        const p1 = (c.phone || "").replace(/\D/g, "");
        if (p1 === cleanDigits || p1.endsWith(cleanDigits) || cleanDigits.endsWith(p1)) return true;
        if (c.additionalPhones?.some((ap) => (ap || "").replace(/\D/g, "") === cleanDigits)) return true;
      }
      if (c.name && c.name.toLowerCase() === cleanLower) return true;
      return false;
    });

    if (found) return found;
  } catch (err: any) {
    console.error("getCustomer fallback scan error:", err);
  }

  return null;
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, "customers", id));
  const idx = _customerIndex.findIndex((c) => c.id === id);
  if (idx !== -1) {
    _customerIndex.splice(idx, 1);
    notifyCustomerSubscribers();
  }
  publishSyncSignal("customers", { action: "delete", resourceId: id });
}

// ─── Service Centers ──────────────────────────────────────────────────────────

export async function getServiceCenters(): Promise<ServiceCenter[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "service_centers")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceCenter);
  } catch (err: any) {
    console.warn("getServiceCenters warning:", err);
    return [];
  }
}

export async function createServiceCenter(
  data: Omit<ServiceCenter, "id" | "createdAt">
): Promise<ServiceCenter> {
  const docRef = doc(collection(db, "service_centers"));
  const newSC: ServiceCenter = {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newSC));
  return newSC;
}

export async function updateServiceCenter(
  id: string,
  data: Partial<ServiceCenter>
): Promise<void> {
  await setDoc(doc(db, "service_centers", id), cleanFirestoreData(data), { merge: true });
}

export async function deleteServiceCenter(id: string): Promise<void> {
  await deleteDoc(doc(db, "service_centers", id));
}

// ─── Couriers (Logistics Partners) ────────────────────────────────────────────

export async function getCouriers(): Promise<Courier[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "couriers")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Courier);
  } catch (err: any) {
    console.warn("getCouriers warning:", err);
    return [];
  }
}

export async function createCourier(
  data: Omit<Courier, "id" | "createdAt">
): Promise<Courier> {
  const docRef = doc(collection(db, "couriers"));
  const newCourier: Courier = {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCourier));
  return newCourier;
}

export async function updateCourier(
  id: string,
  data: Partial<Courier>
): Promise<void> {
  await setDoc(doc(db, "couriers", id), cleanFirestoreData(data), { merge: true });
}

export async function deleteCourier(id: string): Promise<void> {
  await deleteDoc(doc(db, "couriers", id));
}

// ─── Team Members (Unified Personnel: Backoffice, Technician, Manager) ───────

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "team_members")));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        active: data.active !== false,
      } as TeamMember;
    });
  } catch (err: any) {
    console.warn("getTeamMembers warning:", err);
    return [];
  }
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  try {
    const snap = await fetchWithTimeout(getDoc(doc(db, "team_members", id)));
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...data,
        id: snap.id,
        active: data.active !== false,
      } as TeamMember;
    }
    const all = await getTeamMembers();
    return all.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase()) || null;
  } catch (err: any) {
    console.warn("getTeamMember warning:", err);
    const all = await getTeamMembers();
    return all.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase()) || null;
  }
}

export async function createTeamMember(
  data: Omit<TeamMember, "id" | "createdAt">
): Promise<TeamMember> {
  const docRef = doc(collection(db, "team_members"));
  const newMember: TeamMember = {
    id: docRef.id,
    ...data,
    name: toTitleCase(data.name),
    phone: formatIndianPhoneNumber(data.phone),
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newMember));
  publishSyncSignal("team", { action: "create", resourceId: newMember.id });
  return newMember;
}

export async function updateTeamMember(
  id: string,
  data: Partial<TeamMember>
): Promise<void> {
  const payload: Record<string, any> = {
    ...data,
    ...(data.name ? { name: toTitleCase(data.name) } : {}),
    ...(data.phone ? { phone: formatIndianPhoneNumber(data.phone) } : {}),
  };

  if ("email" in data) {
    const cleanEmail = typeof data.email === "string" ? data.email.trim() : "";
    payload.email = cleanEmail ? cleanEmail : deleteField();
  }

  if ("specialization" in data) {
    const cleanSpec = typeof data.specialization === "string" ? data.specialization.trim() : "";
    payload.specialization = cleanSpec ? cleanSpec : deleteField();
  }

  const cleanPayload = cleanFirestoreData(payload);
  try {
    await updateDoc(doc(db, "team_members", id), cleanPayload);
  } catch {
    await setDoc(doc(db, "team_members", id), cleanPayload, { merge: true });
  }

  // If the employee's active status changed, immediately sync/invalidate their assigned task links
  if (typeof data.active === "boolean") {
    try {
      const q = query(collection(db, "staff_tasks"), where("assignedToId", "==", id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((taskDoc) => {
          const updateTaskPayload: Record<string, any> = {
            assignedEmployeeActive: data.active,
            updatedAt: Date.now(),
          };
          if (!data.active) {
            // Immediately invalidate the WhatsApp task link token when employee becomes inactive
            updateTaskPayload.accessToken = `revoked_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          } else {
            const existingToken = String(taskDoc.data()?.accessToken || "");
            if (!existingToken || existingToken.startsWith("revoked_")) {
              updateTaskPayload.accessToken = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
            }
          }
          batch.update(taskDoc.ref, updateTaskPayload);
        });
        await batch.commit();
        publishSyncSignal("staff_tasks", { action: "update", resourceId: id });
      }
    } catch (err) {
      console.error("Failed to sync employee active status to staff_tasks:", err);
    }
  }

  publishSyncSignal("team", { action: "update", resourceId: id });
}

export async function deleteTeamMember(id: string): Promise<void> {
  try {
    const q = query(collection(db, "staff_tasks"), where("assignedToId", "==", id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((taskDoc) => {
        batch.update(taskDoc.ref, {
          assignedEmployeeActive: false,
          accessToken: `revoked_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          updatedAt: Date.now(),
        });
      });
      await batch.commit();
      publishSyncSignal("staff_tasks", { action: "update", resourceId: id });
    }
  } catch (err) {
    console.error("Failed to invalidate tasks on deleteTeamMember:", err);
  }
  await deleteDoc(doc(db, "team_members", id));
  publishSyncSignal("team", { action: "delete", resourceId: id });
}

// ─── Backward-Compatibility Aliases ──────────────────────────────────────────

export const getTeamMemberById = getTeamMember;

export async function getTechnicians(): Promise<Technician[]> {
  const team = await getTeamMembers();
  return team
    .filter((m) => m.role === "technician")
    .map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      email: m.email,
      specialization: m.specialization || "General Hardware & Networking",
      active: m.active,
      createdAt: m.createdAt,
    }));
}

export async function getStaffMembers(): Promise<TeamMember[]> {
  const team = await getTeamMembers();
  return team.filter((m) => m.role !== "technician");
}

// ─── Financial Years & Months (Hierarchy) ────────────────────────────────────

export interface FinancialYearMeta {
  fyId: string; // e.g. "FY2526"
  label: string; // e.g. "FY 2025-26"
  startYear: number;
  endYear: number;
  startDate: string;
  endDate: string;
  monthKey: string; // e.g. "2025-08"
  monthName: string; // e.g. "August 2025"
  monthNumber: number; // 8
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function getFinancialYear(dateInput: Date | string | number = new Date()): FinancialYearMeta {
  let date: Date;
  if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }
  if (isNaN(date.getTime())) date = new Date();

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // In India, FY starts in April (month 4).
  // Jan-Mar belongs to previous calendar year's FY.
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);
  const fyId = `FY${startYY}${endYY}`;
  const label = `FY ${startYear}-${endYY}`;

  const monthKey = `${date.getFullYear()}-${String(month).padStart(2, "0")}`;
  const monthName = `${MONTH_NAMES[month - 1]} ${date.getFullYear()}`;

  return {
    fyId,
    label,
    startYear,
    endYear,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
    monthKey,
    monthName,
    monthNumber: month,
  };
}

async function ensureFinancialYearDoc(fyId: string, monthKey: string): Promise<void> {
  try {
    const fyDocRef = doc(db, "financial_years", fyId);
    const startYY = parseInt(fyId.slice(2, 4), 10);
    const endYY = parseInt(fyId.slice(4, 6), 10);
    const startYear = 2000 + startYY;
    const endYear = 2000 + endYY;

    await setDoc(
      fyDocRef,
      {
        id: fyId,
        label: `FY ${startYear}-${String(endYY).padStart(2, "0")}`,
        startYear,
        endYear,
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const [mYear, mMonth] = monthKey.split("-").map((n) => parseInt(n, 10));
    const monthName = `${MONTH_NAMES[(mMonth || 1) - 1]} ${mYear}`;
    const monthDocRef = doc(db, "financial_years", fyId, "months", monthKey);

    await setDoc(
      monthDocRef,
      {
        id: monthKey,
        monthKey,
        monthName,
        monthNumber: mMonth,
        fyId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("ensureFinancialYearDoc warning:", err);
  }
}

export async function getFinancialYears(): Promise<FinancialYearDoc[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "financial_years")));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as FinancialYearDoc)
      .sort((a, b) => (b.startYear || 0) - (a.startYear || 0));
  } catch (err: unknown) {
    console.error("getFinancialYears error:", err);
    return [];
  }
}

// ─── Service Calls (Hierarchical FY/Months & Global CollectionGroup) ──────────

export async function getServiceCalls(): Promise<ServiceCall[]> {
  try {
    let callsDocs: any[] = [];
    try {
      const cgQuery = query(collectionGroup(db, "service_calls"), limit(500));
      const cgSnap = await fetchWithTimeout(getDocs(cgQuery));
      callsDocs = cgSnap.docs;
    } catch {
      const topSnap = await fetchWithTimeout(getDocs(query(collection(db, "service_calls"), limit(500))));
      callsDocs = topSnap.docs;
    }

    if (callsDocs.length === 0) {
      try {
        const topSnap = await fetchWithTimeout(getDocs(query(collection(db, "service_calls"), limit(500))));
        callsDocs = topSnap.docs;
      } catch {}
    }

    // Deduplicate by ticketNo or id
    const seen = new Set<string>();
    const uniqueDocs = callsDocs.filter((d) => {
      const id = (d.data().ticketNo || d.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return uniqueDocs.map((d) => {
      const callData = d.data() as ServiceCall;
      return {
        ...callData,
        id: d.id,
        customerName: callData.customerName || callData.customer?.name || "",
        customerPhone: callData.customerPhone || callData.customer?.phone || "",
        customerEmail: callData.customerEmail || callData.customer?.email || "",
        customerAddress: callData.customerAddress || callData.customer?.address || "",
      } as ServiceCall;
    });
  } catch (err: any) {
    console.error("getServiceCalls error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getServiceCallsForMonth(
  fyId: string,
  monthKey: string
): Promise<ServiceCall[]> {
  try {
    const q = query(collection(db, "financial_years", fyId, "months", monthKey, "service_calls"));
    const snap = await fetchWithTimeout(getDocs(q));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }) as ServiceCall);
  } catch (err) {
    console.warn("getServiceCallsForMonth error, attempting collectionGroup fallback:", err);
    try {
      const cgQuery = query(
        collectionGroup(db, "service_calls"),
        where("monthKey", "==", monthKey),
        limit(500)
      );
      const snap = await fetchWithTimeout(getDocs(cgQuery));
      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }) as ServiceCall);
    } catch {
      return [];
    }
  }
}



export async function getServiceCall(id: string): Promise<ServiceCall | null> {
  try {
    let callData: ServiceCall | null = null;
    const topSnap = await fetchWithTimeout(getDoc(doc(db, "service_calls", id))).catch(() => null);
    
    if (topSnap && topSnap.exists()) {
      callData = topSnap.data() as ServiceCall;
    } else {
      const cgQuery = query(collectionGroup(db, "service_calls"), where("ticketNo", "==", id));
      const cgSnap = await fetchWithTimeout(getDocs(cgQuery)).catch(() => null);
      if (cgSnap && !cgSnap.empty) {
        callData = cgSnap.docs[0].data() as ServiceCall;
      }
    }

    if (!callData) return null;

    let cust: Customer | undefined;
    if (callData.customerId && !callData.customerName) {
      const custSnap = await getDoc(doc(db, "customers", callData.customerId)).catch(() => null);
      if (custSnap && custSnap.exists()) {
        cust = { id: custSnap.id, ...custSnap.data() } as Customer;
      }
    }

    return {
      ...callData,
      id: callData.ticketNo || id,
      customer: cust,
      customerName: callData.customerName || cust?.name || "",
      customerPhone: callData.customerPhone || cust?.phone || "",
      customerEmail: callData.customerEmail || cust?.email || "",
      customerAddress: callData.customerAddress || cust?.address || "",
    } as ServiceCall;
  } catch (err: any) {
    console.error("getServiceCall error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getServiceCallsForCustomer(
  customerId: string,
  customerPhone?: string,
  customerName?: string
): Promise<ServiceCall[]> {
  try {
    const results: ServiceCall[] = [];
    const seenIds = new Set<string>();

    // 1. Direct indexed query by customerId (collectionGroup)
    if (customerId) {
      try {
        const q = query(
          collectionGroup(db, "service_calls"),
          where("customerId", "==", customerId),
          limit(100)
        );
        const snap = await fetchWithTimeout(getDocs(q));
        snap.docs.forEach((d) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() } as ServiceCall);
          }
        });
      } catch {
        const topQ = query(
          collection(db, "service_calls"),
          where("customerId", "==", customerId),
          limit(100)
        );
        const topSnap = await fetchWithTimeout(getDocs(topQ)).catch(() => null);
        topSnap?.docs.forEach((d) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() } as ServiceCall);
          }
        });
      }
    }

    // 2. Direct indexed query by phone for unlinked / legacy calls
    if (customerPhone && results.length < 50) {
      const cleanPhone = (customerPhone || "").replace(/\D/g, "");
      const formatted = formatIndianPhoneNumber(customerPhone);
      for (const p of [customerPhone, formatted, cleanPhone]) {
        if (!p) continue;
        try {
          const pq = query(
            collectionGroup(db, "service_calls"),
            where("customerPhone", "==", p),
            limit(25)
          );
          const snap = await fetchWithTimeout(getDocs(pq));
          snap.docs.forEach((d) => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              results.push({ id: d.id, ...d.data() } as ServiceCall);
            }
          });
        } catch {}
      }
    }

    return results.sort((a, b) => (new Date(b.dateTime || 0).getTime()) - (new Date(a.dateTime || 0).getTime()));
  } catch (err: any) {
    console.error("getServiceCallsForCustomer error:", err);
    return [];
  }
}

export async function getServiceCallsForTechnician(
  technicianId: string,
  technicianName?: string
): Promise<ServiceCall[]> {
  try {
    const results: ServiceCall[] = [];
    const seenIds = new Set<string>();

    if (technicianId) {
      try {
        const q = query(
          collectionGroup(db, "service_calls"),
          where("technicianId", "==", technicianId),
          limit(100)
        );
        const snap = await fetchWithTimeout(getDocs(q));
        snap.docs.forEach((d) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() } as ServiceCall);
          }
        });
      } catch {
        const topQ = query(
          collection(db, "service_calls"),
          where("technicianId", "==", technicianId),
          limit(100)
        );
        const topSnap = await fetchWithTimeout(getDocs(topQ)).catch(() => null);
        topSnap?.docs.forEach((d) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() } as ServiceCall);
          }
        });
      }
    }

    return results.sort((a, b) => (new Date(b.dateTime || 0).getTime()) - (new Date(a.dateTime || 0).getTime()));
  } catch (err: any) {
    console.error("getServiceCallsForTechnician error:", err);
    return [];
  }
}


export async function peekNextTicketNumber(fyId: string, monthKey: string): Promise<string> {
  const [cYear, cMonth] = monthKey.split("-");
  const prefix = `SC-${cYear}-${cMonth}-`;
  const counterRef = doc(db, "counters", `service_calls_${monthKey}`);

  try {
    const counterDoc = await getDoc(counterRef);
    let current = 0;
    if (counterDoc.exists()) {
      current = counterDoc.data().current || 0;
    } else {
      try {
        const q = query(collection(db, "financial_years", fyId, "months", monthKey, "service_calls"));
        const snap = await getDocs(q);
        const existingNums = snap.docs
          .map((d) => {
            const ticket = d.data().ticketNo || d.id || "";
            const match = ticket.match(new RegExp(`^SC-${cYear}-${cMonth}-(\\d+)`));
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => !isNaN(n) && n > 0);
        if (existingNums.length > 0) {
          current = Math.max(...existingNums);
        }
      } catch {
        // Ignore fallback query failure
      }
    }
    const next = current + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  } catch (err) {
    return `${prefix}0001`;
  }
}

export async function getNextTicketNumber(fyId: string, monthKey: string): Promise<string> {
  const [cYear, cMonth] = monthKey.split("-");
  const prefix = `SC-${cYear}-${cMonth}-`;
  const counterRef = doc(db, "counters", `service_calls_${monthKey}`);

  try {
    const nextCount = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let current = 0;
      if (counterDoc.exists()) {
        current = counterDoc.data().current || 0;
      } else {
        try {
          const q = query(collection(db, "financial_years", fyId, "months", monthKey, "service_calls"));
          const snap = await getDocs(q);
          const existingNums = snap.docs
            .map((d) => {
              const ticket = d.data().ticketNo || d.id || "";
              const match = ticket.match(new RegExp(`^SC-${cYear}-${cMonth}-(\\d+)`));
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n) => !isNaN(n) && n > 0);
          if (existingNums.length > 0) {
            current = Math.max(...existingNums);
          }
        } catch {
          // Ignore fallback query failure
        }
      }
      const next = current + 1;
      transaction.set(counterRef, { current: next, updatedAt: serverTimestamp() }, { merge: true });
      return next;
    });
    return `${prefix}${String(nextCount).padStart(4, "0")}`;
  } catch (err) {
    console.warn("Atomic counter transaction failed, using timestamp fallback:", err);
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
}

export async function createServiceCall(
  data: Omit<ServiceCall, "id" | "ticketNo" | "createdAt" | "updatedAt"> & { ticketNo?: string }
): Promise<ServiceCall> {
  // Ensure customer record exists
  let customerId = data.customerId;
  if (!customerId || customerId.startsWith("cust-")) {
    if (data.customerName && data.customerPhone) {
      const createdCust = await createCustomer({
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
        address: data.customerAddress,
      });
      customerId = createdCust.id;
    }
  } else if (customerId && (data.customerName || data.customerPhone)) {
    await updateCustomer(customerId, {
      ...(data.customerName ? { name: data.customerName } : {}),
      ...(data.customerPhone ? { phone: data.customerPhone } : {}),
      ...(data.customerEmail ? { email: data.customerEmail } : {}),
      ...(data.customerAddress ? { address: data.customerAddress } : {}),
    }).catch(() => {});
  }

  // 1. Calculate Financial Year and Month
  const fyMeta = getFinancialYear(data.dateTime || new Date());
  const fyId = fyMeta.fyId;
  const monthKey = fyMeta.monthKey;

  // 2. Generate Next Ticket Number atomically if not provided
  let ticketNo = (data.ticketNo || "").trim();
  if (!ticketNo) {
    ticketNo = await getNextTicketNumber(fyId, monthKey);
  }

  const now = Date.now();
  const initialTimeline: TimelineEvent[] = [
    {
      id: `evt-${now}`,
      timestamp: now,
      stage: "intake_created",
      title: "Service Call Intake Created",
      staffId: data.handledByStaffId || "staff-default",
      staffName: data.handledByStaffName || "Frontdesk Staff",
      status: data.status,
      comments: data.issueDescription,
    },
  ];

  // Exclude embedded customer details from document payload
  const {
    customerName: _cName,
    customerPhone: _cPhone,
    customerEmail: _cEmail,
    customerAddress: _cAddr,
    customer: _cust,
    ...cleanCallData
  } = data;

  const sanitizedParts = (data.parts || []).map((p) => ({
    ...p,
    name: toTitleCase(p.name),
    category: p.category ? toTitleCase(p.category) : undefined,
  }));

  const newCallDoc = {
    id: ticketNo,
    ticketNo,
    fyId,
    monthKey,
    ...cleanCallData,
    customerName: data.customerName ? toTitleCase(data.customerName) : "",
    customerPhone: data.customerPhone ? formatIndianPhoneNumber(data.customerPhone) : "",
    customerEmail: data.customerEmail ? data.customerEmail.trim().toLowerCase() : "",
    customerAddress: data.customerAddress ? toTitleCase(data.customerAddress) : "",
    deviceCategory: data.deviceCategory ? toTitleCase(data.deviceCategory) : "",
    modelNumber: data.modelNumber ? formatModelNumber(data.modelNumber) : "",
    handledByStaffName: data.handledByStaffName ? toTitleCase(data.handledByStaffName) : "",
    technicianName: data.technicianName ? toTitleCase(data.technicianName) : "",
    parts: sanitizedParts,
    customerId: customerId || "cust-unknown",
    timeline: data.timeline && data.timeline.length > 0 ? data.timeline : initialTimeline,
    createdAt: now,
    updatedAt: now,
  };

  const cleanData = cleanFirestoreData(newCallDoc);

  // 3. Ensure Financial Year and Month document hierarchy
  ensureFinancialYearDoc(fyId, monthKey).catch(() => {});

  // 4. Save into Hierarchical Subcollection and top-level mirror atomically
  const subDocRef = doc(db, "financial_years", fyId, "months", monthKey, "service_calls", ticketNo);
  const topDocRef = doc(db, "service_calls", ticketNo);

  const batch = writeBatch(db);
  batch.set(subDocRef, cleanData);
  batch.set(topDocRef, cleanData);
  await batch.commit();

  publishSyncSignal("service_calls", { action: "create", resourceId: ticketNo });

  // Auto-save model to catalog
  if (data.deviceCategory && data.modelNumber && data.modelNumber.trim()) {
    saveDeviceModel(data.deviceCategory, data.modelNumber).catch(() => {});
  }

  return {
    ...newCallDoc,
    customerName: data.customerName ? toTitleCase(data.customerName) : "",
    customerPhone: data.customerPhone || "",
    customerEmail: data.customerEmail || "",
    customerAddress: data.customerAddress ? toTitleCase(data.customerAddress) : "",
  } as ServiceCall;
}

export async function updateServiceCall(
  id: string,
  data: Partial<ServiceCall>
): Promise<void> {
  if (data.customerId) {
    if (data.customerName || data.customerPhone || data.customerEmail || data.customerAddress) {
      await updateCustomer(data.customerId, {
        ...(data.customerName ? { name: data.customerName } : {}),
        ...(data.customerPhone ? { phone: data.customerPhone } : {}),
        ...(data.customerEmail ? { email: data.customerEmail } : {}),
        ...(data.customerAddress ? { address: data.customerAddress } : {}),
      }).catch(() => {});
    }
  }

  const existing = await getServiceCall(id);
  const fyMeta = getFinancialYear(data.dateTime || existing?.dateTime || new Date());
  const fyId = data.fyId || existing?.fyId || fyMeta.fyId;
  const monthKey = data.monthKey || existing?.monthKey || fyMeta.monthKey;

  const {
    customerName: _cName,
    customerPhone: _cPhone,
    customerEmail: _cEmail,
    customerAddress: _cAddr,
    customer: _cust,
    ...cleanUpdateData
  } = data;

  const sanitizedUpdate: any = { ...cleanUpdateData };
  if (sanitizedUpdate.deviceCategory) sanitizedUpdate.deviceCategory = toTitleCase(sanitizedUpdate.deviceCategory);
  if (sanitizedUpdate.modelNumber) sanitizedUpdate.modelNumber = formatModelNumber(sanitizedUpdate.modelNumber);
  if (sanitizedUpdate.handledByStaffName) sanitizedUpdate.handledByStaffName = toTitleCase(sanitizedUpdate.handledByStaffName);
  if (sanitizedUpdate.assignedTechnicianName) sanitizedUpdate.assignedTechnicianName = toTitleCase(sanitizedUpdate.assignedTechnicianName);
  if (sanitizedUpdate.parts && Array.isArray(sanitizedUpdate.parts)) {
    sanitizedUpdate.parts = sanitizedUpdate.parts.map((p: any) => ({
      ...p,
      name: toTitleCase(p.name),
      category: p.category ? toTitleCase(p.category) : undefined,
    }));
  }

  const formattedData: Partial<ServiceCall> = {
    ...sanitizedUpdate,
    ...(data.customerName ? { customerName: toTitleCase(data.customerName) } : {}),
    ...(data.customerPhone ? { customerPhone: formatIndianPhoneNumber(data.customerPhone) } : {}),
    ...(data.customerEmail !== undefined ? { customerEmail: data.customerEmail.trim().toLowerCase() } : {}),
    ...(data.customerAddress !== undefined ? { customerAddress: toTitleCase(data.customerAddress) } : {}),
    fyId,
    monthKey,
    updatedAt: Date.now(),
  };

  const cleanData = cleanFirestoreData(formattedData);

  // Update in FY subcollection and top-level using atomic writeBatch
  const subDocRef = doc(db, "financial_years", fyId, "months", monthKey, "service_calls", id);
  const topDocRef = doc(db, "service_calls", id);

  const batch = writeBatch(db);
  batch.set(subDocRef, cleanData, { merge: true });
  batch.set(topDocRef, cleanData, { merge: true });
  await batch.commit();

  publishSyncSignal("service_calls", { action: "update", resourceId: id });

  if (data.deviceCategory && data.modelNumber && data.modelNumber.trim()) {
    saveDeviceModel(data.deviceCategory, data.modelNumber).catch(() => {});
  }
}

export async function deleteServiceCall(id: string): Promise<void> {
  try {
    const existing = await getServiceCall(id);
    const batch = writeBatch(db);
    const now = Date.now();
    const softDeleteData = cleanFirestoreData({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    if (existing?.fyId && existing?.monthKey) {
      const subDocRef = doc(db, "financial_years", existing.fyId, "months", existing.monthKey, "service_calls", id);
      batch.set(subDocRef, softDeleteData, { merge: true });
    }
    batch.set(doc(db, "service_calls", id), softDeleteData, { merge: true });
    await batch.commit();
    publishSyncSignal("service_calls", { action: "delete", resourceId: id });
  } catch (err: any) {
    console.error("deleteServiceCall error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function restoreServiceCall(id: string): Promise<void> {
  try {
    const existing = await getServiceCall(id);
    const batch = writeBatch(db);
    const now = Date.now();
    const restoreData = cleanFirestoreData({
      isDeleted: false,
      deletedAt: null,
      updatedAt: now,
    });

    if (existing?.fyId && existing?.monthKey) {
      const subDocRef = doc(db, "financial_years", existing.fyId, "months", existing.monthKey, "service_calls", id);
      batch.set(subDocRef, restoreData, { merge: true });
    }
    batch.set(doc(db, "service_calls", id), restoreData, { merge: true });
    await batch.commit();
    publishSyncSignal("service_calls", { action: "update", resourceId: id });
  } catch (err: any) {
    console.error("restoreServiceCall error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function addTimelineEvent(
  ticketNo: string,
  event: TimelineEvent
): Promise<void> {
  try {
    const call = await getServiceCall(ticketNo);
    const existingTimeline = call?.timeline || [];
    const updatedTimeline = [...existingTimeline, event];
    await updateServiceCall(ticketNo, { timeline: updatedTimeline });
  } catch (err: any) {
    console.error("addTimelineEvent error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

// ─── Device Models Catalog ───────────────────────────────────────────────────

export async function getDeviceModels(categoryName?: string): Promise<DeviceModel[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "device_models")));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeviceModel);
    if (categoryName) {
      return all.filter((m) => m.categoryName?.toLowerCase() === categoryName.toLowerCase());
    }
    return all;
  } catch (err: any) {
    console.error("getDeviceModels error:", err);
    return [];
  }
}

export async function saveDeviceModel(categoryName: string, modelName: string): Promise<DeviceModel> {
  const cleanCat = toTitleCase(categoryName);
  const cleanModel = formatModelNumber(modelName);
  if (!cleanCat || !cleanModel) throw new Error("Category and Model name required");

  const existing = await getDeviceModels(cleanCat);
  const found = existing.find((m) => m.modelName.toLowerCase() === cleanModel.toLowerCase());
  if (found) return found;

  const docRef = doc(collection(db, "device_models"));
  const newModel: DeviceModel = {
    id: docRef.id,
    categoryName: cleanCat,
    modelName: cleanModel,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newModel));
  return newModel;
}

export * from "./firestore/whatsapp";


export * from "./firestore/quotations";


// ==========================================
// Technician Payouts & Commission Payroll
// ==========================================

export async function getTechnicianPayouts(
  technicianId?: string,
  monthKey?: string
): Promise<TechnicianPayout[]> {
  try {
    const q = query(collection(db, "technician_payouts"), orderBy("createdAt", "desc"));
    const snap = await fetchWithTimeout(getDocs(q));
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TechnicianPayout);
    if (technicianId) {
      items = items.filter((p) => p.technicianId === technicianId);
    }
    if (monthKey) {
      items = items.filter((p) => p.monthKey === monthKey);
    }
    return items;
  } catch (err) {
    console.error("getTechnicianPayouts error:", err);
    return [];
  }
}

export async function recordTechnicianPayout(
  data: Omit<TechnicianPayout, "id" | "createdAt">
): Promise<TechnicianPayout> {
  try {
    const docRef = doc(collection(db, "technician_payouts"));
    const newPayout: TechnicianPayout = {
      id: docRef.id,
      ...data,
      createdAt: Date.now(),
    };
    await setDoc(docRef, cleanFirestoreData(newPayout));
    return newPayout;
  } catch (err) {
    console.error("recordTechnicianPayout error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteTechnicianPayout(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "technician_payouts", id));
  } catch (err) {
    console.error("deleteTechnicianPayout error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function updateServiceCallPaymentStatus(
  id: string,
  payment: {
    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;
    amountPaid?: number;
    paymentDate?: string;
    paymentNotes?: string;
  }
): Promise<void> {
  try {
    const existing = await getServiceCall(id);
    const fyMeta = getFinancialYear(existing?.dateTime || new Date());
    const fyId = existing?.fyId || fyMeta.fyId;
    const monthKey = existing?.monthKey || fyMeta.monthKey;

    const cleanPayload = cleanFirestoreData({
      ...payment,
      updatedAt: Date.now(),
    });

    const batch = writeBatch(db);
    batch.set(doc(db, "service_calls", id), cleanPayload, { merge: true });
    batch.set(
      doc(db, "financial_years", fyId, "months", monthKey, "service_calls", id),
      cleanPayload,
      { merge: true }
    );
    await batch.commit();
    publishSyncSignal("service_calls");
  } catch (err) {
    console.error("updateServiceCallPaymentStatus error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export * from "./firestore/inquiriesAndJobs";
export * from "./firestore/tasks";




