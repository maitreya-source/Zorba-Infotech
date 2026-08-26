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
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { toTitleCase, formatModelNumber, formatIndianPhoneNumber } from "./utils";
import { publishSyncSignal, subscribeSyncSignal } from "./realtimeSync";
import type {
  Category,
  Product,
  DeviceCategory,
  DeviceModel,
  SparePartCatalogItem,
  StaffMember,
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
  MonthlyReportSummary,
  PaginatedResult,
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
  { name: "CCTV & Security", iconName: "Camera", color: "from-blue-500/10 to-blue-600/5", order: 1, description: "DVR, NVR, Cameras & Surveillance" },
  { name: "Printer", iconName: "Printer", color: "from-emerald-500/10 to-emerald-600/5", order: 2, description: "Inkjet, Laser, Thermal & Multifunction Printers" },
  { name: "Toner / Cartridge", iconName: "Layers", color: "from-cyan-500/10 to-cyan-600/5", order: 3, description: "Toner refill, Drum replacement & Cartridges" },
  { name: "Laptop", iconName: "Laptop", color: "from-purple-500/10 to-purple-600/5", order: 4, description: "Laptops, MacBooks & Notebooks" },
  { name: "Desktop & PC", iconName: "Monitor", color: "from-amber-500/10 to-amber-600/5", order: 5, description: "Desktops, CPU Towers, All-in-One PCs" },
  { name: "Router & Networking", iconName: "Wifi", color: "from-red-500/10 to-red-600/5", order: 6, description: "Routers, Switches, Access Points, Fiber ONTs" },
  { name: "UPS & Inverter", iconName: "Cpu", color: "from-indigo-500/10 to-indigo-600/5", order: 7, description: "UPS Units, Batteries & Power Supplies" },
  { name: "Scanner & Billing", iconName: "Barcode", color: "from-pink-500/10 to-pink-600/5", order: 8, description: "Barcode Scanners, Receipt Printers, POS Terminals" },
  { name: "Biometric & Attendance", iconName: "Fingerprint", color: "from-rose-500/10 to-rose-600/5", order: 9, description: "Fingerprint & Face Recognition Devices" },
  { name: "Monitor & Display", iconName: "Tv", color: "from-violet-500/10 to-violet-600/5", order: 10, description: "LCD/LED Monitors, Touch Screens & Interactive Panels" },
  { name: "Accessories", iconName: "Package", color: "from-slate-500/10 to-slate-600/5", order: 11, description: "Cables, Adapters, Keyboards & Mice" },
];

// ─── Master Categories ────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
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
      await seedDefaultCategories();
      const res = await getDocs(collection(db, "categories"));
      return res.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
    }
    return categories;
  } catch (err: any) {
    console.error("getCategories error:", err);
    throw new Error(formatFirebaseError(err));
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

export async function seedDefaultCategories(force: boolean = false): Promise<void> {
  try {
    const existing = await getDocs(collection(db, "categories"));
    if (!force && !existing.empty && existing.size >= DEFAULT_CATEGORIES.length) return;

    for (const cat of DEFAULT_CATEGORIES) {
      const docId = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const docRef = doc(db, "categories", docId);
      await setDoc(
        docRef,
        {
          id: docId,
          ...cat,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Could not seed categories:", err);
  }
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

const STORAGE_KEY_PRODUCT_INDEX = "zorba_prod_index_v2";
const STORAGE_KEY_PRODUCT_SYNC = "zorba_prod_sync_v2";

let _productIndex: ProductIndexItem[] = [];
let _isProductIndexInitialized = false;
let _isSyncingProductIndex = false;
let _lastProductSyncTimestamp = 0;

// Load local cache synchronously on startup (< 1ms)
function loadLocalProductIndex(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCT_INDEX);
    if (raw) {
      _productIndex = JSON.parse(raw);
    }
    const syncStr = localStorage.getItem(STORAGE_KEY_PRODUCT_SYNC);
    if (syncStr) {
      _lastProductSyncTimestamp = parseInt(syncStr, 10) || 0;
    }
  } catch (e) {
    console.warn("Failed to load product index from localStorage:", e);
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
      // Full sync: fetch all product docs (slim projection)
      const snap = await fetchWithTimeout(getDocs(collection(db, "products")));
      const items: ProductIndexItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          brand: data.brand || "",
          model: data.model || d.id,
          itemCode: data.itemCode || "",
          categoryId: data.categoryId || "",
          category: data.category || "",
          price: data.price !== undefined ? data.price : null,
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
    } else {
      // Delta sync: fetch only updated docs since last sync with 60s overlap buffer
      const sinceTime = Math.max(0, lastSync - 60000);
      const deltaQ = query(
        collection(db, "products"),
        where("updatedAt", ">", sinceTime)
      );
      const snap = await fetchWithTimeout(getDocs(deltaQ));
      if (!snap.empty) {
        const itemMap = new Map<string, ProductIndexItem>(_productIndex.map((p) => [p.id, p]));
        snap.docs.forEach((d) => {
          const data = d.data();
          itemMap.set(d.id, {
            id: d.id,
            name: data.name || "",
            brand: data.brand || "",
            model: data.model || d.id,
            itemCode: data.itemCode || "",
            categoryId: data.categoryId || "",
            category: data.category || "",
            price: data.price !== undefined ? data.price : null,
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
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
        localStorage.setItem(STORAGE_KEY_PRODUCT_SYNC, String(Date.now()));
      } catch (storageErr) {
        console.warn("Could not save product index to localStorage:", storageErr);
      }
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
  // Instant check in memory index (< 0.1ms)
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
  lastDoc?: DocumentSnapshot | QueryDocumentSnapshot;
  search?: string;
}): Promise<PaginatedResult<Product>> {
  const pageSize = options?.pageSize || 24;
  const categoryId = options?.categoryId && options.categoryId !== "all" ? options.categoryId : undefined;
  const search = (options?.search || "").trim().toLowerCase();

  try {
    const constraints: any[] = [
      where("showOnWebsite", "==", true),
    ];

    if (categoryId) {
      constraints.push(where("categoryId", "==", categoryId));
    }

    // Default sorting by order then createdAt
    constraints.push(orderBy("order", "asc"));
    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize + 1));

    if (options?.lastDoc) {
      constraints.push(startAfter(options.lastDoc));
    }

    const q = query(collection(db, "products"), ...constraints);
    const snap = await fetchWithTimeout(getDocs(q));

    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const newLastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined;

    let items = resultDocs.map((d) => ({ id: d.id, ...d.data() }) as Product);

    if (search) {
      items = items.filter((p) => {
        const nameMatch = p.name && p.name.toLowerCase().includes(search);
        const modelMatch = p.model && p.model.toLowerCase().includes(search);
        const brandMatch = p.brand && p.brand.toLowerCase().includes(search);
        const descMatch = p.description && p.description.toLowerCase().includes(search);
        return nameMatch || modelMatch || brandMatch || descMatch;
      });
    }

    return {
      items,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err: any) {
    // Fallback if composite index is being generated or order field is missing on some docs
    try {
      const simpleConstraints: any[] = [
        where("showOnWebsite", "==", true),
      ];
      if (categoryId) {
        simpleConstraints.push(where("categoryId", "==", categoryId));
      }
      simpleConstraints.push(limit(pageSize + 1));
      if (options?.lastDoc) {
        simpleConstraints.push(startAfter(options.lastDoc));
      }
      const simpleQ = query(collection(db, "products"), ...simpleConstraints);
      const snap = await fetchWithTimeout(getDocs(simpleQ));
      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const newLastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined;

      let items = resultDocs.map((d) => ({ id: d.id, ...d.data() }) as Product);
      if (search) {
        items = items.filter((p) => {
          const nameMatch = p.name && p.name.toLowerCase().includes(search);
          const modelMatch = p.model && p.model.toLowerCase().includes(search);
          const brandMatch = p.brand && p.brand.toLowerCase().includes(search);
          const descMatch = p.description && p.description.toLowerCase().includes(search);
          return nameMatch || modelMatch || brandMatch || descMatch;
        });
      }
      return {
        items,
        lastDoc: newLastDoc,
        hasMore,
      };
    } catch (fallbackErr) {
      console.error("getPublicProducts error:", fallbackErr);
      return { items: [], hasMore: false };
    }
  }
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
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  const modelNo = formatModelNumber(data.model);
  if (!modelNo) {
    throw new Error("Model number is required to create a product.");
  }
  const cleanDocId = modelNo;
  const docRef = doc(db, "products", cleanDocId);
  
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error(`A product with Model Number "${modelNo}" already exists.`);
  }

  const now = Date.now();
  const productData: Product = {
    id: cleanDocId,
    ...data,
    name: toTitleCase(data.name),
    brand: data.brand ? toTitleCase(data.brand) : "",
    category: data.category ? toTitleCase(data.category) : "",
    model: cleanDocId,
    itemCode: data.itemCode ? data.itemCode.trim().toUpperCase() : "",
    warranty: data.warranty ? data.warranty.trim() : "",
    serviceCenter: data.serviceCenter ? toTitleCase(data.serviceCenter) : "",
    description: data.description ? data.description.trim() : "",
    showOnWebsite: data.showOnWebsite !== undefined ? data.showOnWebsite : true,
    showPriceOnWebsite: data.showPriceOnWebsite !== undefined ? data.showPriceOnWebsite : true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, cleanFirestoreData(productData));

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
    inStock: productData.inStock,
    showOnWebsite: productData.showOnWebsite,
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
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
    } catch {}
  }

  // Sync model number to service call models auto-suggest
  if (data.categoryId) {
    getCategories().then((cats) => {
      const cat = cats.find((c) => c.id === data.categoryId);
      if (cat) {
        saveDeviceModel(cat.name, cleanDocId).catch(() => {});
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
    if (sanitized.model) sanitized.model = formatModelNumber(sanitized.model);
    if (sanitized.itemCode) sanitized.itemCode = sanitized.itemCode.trim().toUpperCase();
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
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
        } catch {}
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
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
        } catch {}
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
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCT_INDEX, JSON.stringify(_productIndex));
        } catch {}
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

// ─── Legacy Device Categories Forwarder ───────────────────────────────────────

export async function getDeviceCategories(): Promise<DeviceCategory[]> {
  try {
    const cats = await getCategories();
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      createdAt: Date.now(),
    }));
  } catch {
    return DEFAULT_CATEGORIES.map((c) => ({
      id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: c.name,
      description: c.description || "",
      createdAt: Date.now(),
    }));
  }
}

export async function createDeviceCategory(
  name: string,
  description?: string
): Promise<DeviceCategory> {
  await createCategory({
    name,
    description: description || "",
    iconName: "Package",
    color: "from-blue-500/10 to-blue-600/5",
    order: 99,
  });
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    description: description || "",
    createdAt: Date.now(),
  };
}

export async function deleteDeviceCategory(id: string): Promise<void> {
  await deleteCategory(id);
}

// ─── Customers (Fast Slim Index & Non-Blocking Delta-Sync) ─────────────────────

export interface CustomerIndexItem {
  id: string;
  name: string;
  phone: string;
  additionalPhones?: string[];
  companyName?: string;
  email?: string;
  createdAt?: string | number;
  updatedAt?: number;
}

const STORAGE_KEY_CUSTOMER_INDEX = "zorba_cust_index_v4";
const STORAGE_KEY_CUSTOMER_SYNC = "zorba_cust_sync_v4";

let _customerIndex: CustomerIndexItem[] = [];
let _isCustomerIndexInitialized = false;
let _isSyncingIndex = false;

// Load local cache synchronously on startup (< 1ms)
function loadLocalCustomerIndex(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMER_INDEX);
    if (raw) {
      _customerIndex = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load customer index from localStorage:", e);
  }
}
loadLocalCustomerIndex();

/**
 * Non-blocking background delta-sync.
 * Downloads only modified customer records since lastSync without blocking UI.
 * Payload is ultra-slim (~50 bytes/record, ~250 KB for 5,000 customers).
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

    if (forceFull || _customerIndex.length === 0 || lastSync === 0) {
      // Full sync: fetch all customer docs (slim projection)
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
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
        };
      });
      _customerIndex = items;
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
            createdAt: data.createdAt,
            updatedAt: data.updatedAt || (typeof data.createdAt === "number" ? data.createdAt : 0),
          });
        });
        _customerIndex = Array.from(itemMap.values());
      }
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOMER_INDEX, JSON.stringify(_customerIndex));
        localStorage.setItem(STORAGE_KEY_CUSTOMER_SYNC, String(Date.now()));
      } catch (storageErr) {
        console.warn("Could not save customer index to localStorage:", storageErr);
      }
    }
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
}

export async function getCustomers(forceRefresh = false): Promise<Customer[]> {
  if (!forceRefresh && _customerIndex.length > 0) {
    return _customerIndex as Customer[];
  }
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "customers")));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
    _customerIndex = list.map((c) => ({
      id: c.id,
      name: c.name || "",
      phone: c.phone || "",
      additionalPhones: c.additionalPhones || [],
      companyName: c.companyName,
      email: c.email,
      address: c.address,
      city: c.city,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return list;
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

  const docRef = doc(collection(db, "customers"));
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
    name: formattedName,
    phone: formattedPhone,
    additionalPhones,
    companyName: formattedCompany,
    address: formattedAddress,
    city: formattedCity,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, cleanFirestoreData(newCust));

  // Immediate local cache update for instant UI feedback
  const slimItem: CustomerIndexItem = {
    id: newCust.id,
    name: newCust.name,
    phone: newCust.phone,
    additionalPhones: newCust.additionalPhones,
    companyName: newCust.companyName,
    email: newCust.email,
    createdAt: now,
    updatedAt: now,
  };
  _customerIndex.unshift(slimItem);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMER_INDEX, JSON.stringify(_customerIndex));
    } catch {}
  }

  publishSyncSignal("customers", { action: "create", resourceId: newCust.id });

  return newCust;
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
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOMER_INDEX, JSON.stringify(_customerIndex));
      } catch {}
    }
  }

  publishSyncSignal("customers", { action: "update", resourceId: id });
}

export async function getCustomersPaginated(options?: {
  pageSize?: number;
  lastDoc?: DocumentSnapshot | QueryDocumentSnapshot;
  search?: string;
}): Promise<PaginatedResult<Customer>> {
  const pageSize = options?.pageSize || 25;
  const search = (options?.search || "").trim().toLowerCase();

  try {
    const constraints: any[] = [
      orderBy("createdAt", "desc"),
      limit(pageSize + 1),
    ];

    if (options?.lastDoc) {
      constraints.push(startAfter(options.lastDoc));
    }

    const q = query(collection(db, "customers"), ...constraints);
    const snap = await fetchWithTimeout(getDocs(q));

    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const newLastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined;

    let items = resultDocs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as Customer);

    if (search) {
      items = items.filter((c) => {
        const qDigits = search.replace(/\D/g, "");
        const nameMatch = c.name && c.name.toLowerCase().includes(search);
        const phoneMatch = (c.phone && c.phone.includes(search)) || (qDigits && (c.phone || "").replace(/\D/g, "").includes(qDigits));
        const companyMatch = c.companyName && c.companyName.toLowerCase().includes(search);
        return nameMatch || phoneMatch || companyMatch;
      });
    }

    return {
      items,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err: any) {
    console.warn("getCustomersPaginated error, fallback to memory index:", err);
    try {
      const all = await getCustomers();
      const clean = search;
      const filtered = clean
        ? all.filter((c) => (c.name || "").toLowerCase().includes(clean) || (c.phone || "").includes(clean))
        : all;
      return {
        items: filtered.slice(0, pageSize),
        hasMore: filtered.length > pageSize,
      };
    } catch {
      return { items: [], hasMore: false };
    }
  }
}

/**
 * Instant in-memory search for 5,000+ customers (< 1ms).
 * Searches across name, phone, alternate numbers, company, and email with zero network delay.
 */
export async function searchCustomers(queryText: string, limitCount = 30): Promise<Customer[]> {
  const clean = (queryText || "").trim().toLowerCase();

  // Trigger background delta sync non-blockingly if not initialized
  if (!_isCustomerIndexInitialized && !_isSyncingIndex) {
    syncCustomerIndex();
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
      const phoneDigits = (c.phone || "").replace(/\D/g, "");
      const company = (c.companyName || "").toLowerCase();
      const email = (c.email || "").toLowerCase();

      // Direct phone match
      if (qDigits && (phoneDigits.includes(qDigits) || (c.phone && c.phone.includes(clean)))) {
        return true;
      }
      if (qDigits && c.additionalPhones && c.additionalPhones.some((p) => (p || "").replace(/\D/g, "").includes(qDigits))) {
        return true;
      }

      // Check all query words match name, company, or email
      return tokens.every((tok) =>
        name.includes(tok) || company.includes(tok) || email.includes(tok)
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
  invalidateCustomersCache();
  publishSyncSignal("customers", { action: "delete", resourceId: id });
}

// ─── Service Centers ──────────────────────────────────────────────────────────

const DEFAULT_SERVICE_CENTERS: Omit<ServiceCenter, "id" | "createdAt">[] = [
  {
    name: "HP Authorized Service Center",
    phone: "+91 98210 11223",
    email: "hp.service@hp.com",
    addresses: [
      { id: "addr-1", address: "Plot 45, Tech Zone, Sector 18, Gurugram", city: "Gurugram", isDefault: true },
      { id: "addr-2", address: "Shop 12, Station Road, Indore", city: "Indore", isDefault: false },
    ],
    defaultAddressId: "addr-1",
  },
  {
    name: "Dell Care Center",
    phone: "+91 94220 55443",
    email: "support@dellcare.in",
    addresses: [
      { id: "addr-3", address: "Suite 302, MG Road Commercial Hub, Pune", city: "Pune", isDefault: true },
    ],
    defaultAddressId: "addr-3",
  },
];

export async function getServiceCenters(): Promise<ServiceCenter[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "service_centers")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceCenter);
    if (items.length === 0) {
      for (const sc of DEFAULT_SERVICE_CENTERS) {
        await createServiceCenter(sc).catch(() => {});
      }
      const res = await getDocs(collection(db, "service_centers"));
      const seeded = res.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceCenter);
      if (seeded.length > 0) return seeded;
    } else {
      return items;
    }
  } catch (err: any) {
    console.warn("getServiceCenters warning, using fallbacks:", err);
  }
  return DEFAULT_SERVICE_CENTERS.map((sc, i) => ({
    id: `default-sc-${i}`,
    ...sc,
    createdAt: Date.now(),
  }));
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

const DEFAULT_COURIERS: Omit<Courier, "id" | "createdAt">[] = [
  { name: "Trackon Courier", phone: "+91 98110 55667", contactPerson: "Ramesh Sharma", active: true },
  { name: "Reliance Logistics", phone: "+91 98220 33445", contactPerson: "Suresh Gupta", active: true },
  { name: "Blue Dart Express", phone: "+91 99330 11223", contactPerson: "Helpdesk", active: true },
  { name: "DTDC Express", phone: "+91 98110 99887", contactPerson: "Frontdesk", active: true },
  { name: "Speed Post (India Post)", phone: "+91 94110 77665", contactPerson: "Post Master", active: true },
  { name: "Delhivery", phone: "+91 98770 44332", contactPerson: "Operations", active: true },
];

export async function getCouriers(): Promise<Courier[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "couriers")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Courier);
    if (items.length === 0) {
      for (const c of DEFAULT_COURIERS) {
        await createCourier(c).catch(() => {});
      }
      const res = await getDocs(collection(db, "couriers"));
      const seeded = res.docs.map((d) => ({ id: d.id, ...d.data() }) as Courier);
      if (seeded.length > 0) return seeded;
    } else {
      return items;
    }
  } catch (err: any) {
    console.warn("getCouriers warning, using fallbacks:", err);
  }
  return DEFAULT_COURIERS.map((c, i) => ({
    id: `courier-${i}`,
    ...c,
    createdAt: Date.now(),
  }));
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

const DEFAULT_TEAM_MEMBERS: Omit<TeamMember, "id" | "createdAt">[] = [
  { name: "Rajesh Sharma", role: "backoffice", phone: "+91 98230 11223", email: "rajesh@zorba.in", avatar: "penguin", active: true },
  { name: "Sunita Verma", role: "backoffice", phone: "+91 98900 77889", email: "sunita@zorba.in", avatar: "watermelon", active: true },
  { name: "Amit Patel", role: "manager", phone: "+91 94220 44556", email: "amit@zorba.in", avatar: "lion", active: true },
  { name: "Manoj Kumar", role: "technician", phone: "+91 98230 55441", email: "manoj@zorba.in", specialization: "CCTV & Security", avatar: "fox", active: true },
  { name: "Vikas Sharma", role: "technician", phone: "+91 94220 88776", email: "vikas@zorba.in", specialization: "Printers & Toners", avatar: "rocket", active: true },
  { name: "Deepak Soni", role: "technician", phone: "+91 98900 33221", email: "deepak@zorba.in", specialization: "Laptops & Networking", avatar: "coffee", active: true },
];

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "team_members")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamMember);
    if (items.length === 0) {
      for (const tm of DEFAULT_TEAM_MEMBERS) {
        await createTeamMember(tm).catch(() => {});
      }
      const res = await getDocs(collection(db, "team_members"));
      const seeded = res.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamMember);
      if (seeded.length > 0) return seeded;
    } else {
      return items;
    }
  } catch (err: any) {
    console.warn("getTeamMembers warning, using fallbacks:", err);
  }
  return DEFAULT_TEAM_MEMBERS.map((tm, i) => ({
    id: `team-${i}`,
    ...tm,
    createdAt: Date.now(),
  }));
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  try {
    const snap = await fetchWithTimeout(getDoc(doc(db, "team_members", id)));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as TeamMember;
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
}

export async function deleteTeamMember(id: string): Promise<void> {
  await deleteDoc(doc(db, "team_members", id));
}

// ─── Backward-Compatibility Aliases ──────────────────────────────────────────

export async function getStaff(): Promise<StaffMember[]> {
  const team = await getTeamMembers();
  return team
    .filter((m) => m.role !== "technician")
    .map((m) => ({
      id: m.id,
      name: m.name,
      role:
        m.role === "proprietor"
          ? "Proprietor"
          : m.role === "developer"
          ? "Lead Developer"
          : m.role === "manager"
          ? "Service Operations Manager"
          : "Frontdesk / Backoffice Coordinator",
      phone: m.phone,
      avatar: m.avatar || "penguin",
      active: m.active,
      createdAt: m.createdAt,
    }));
}

export const getStaffMembers = getStaff;

export async function createStaff(data: Omit<StaffMember, "id" | "createdAt">): Promise<StaffMember> {
  const tm = await createTeamMember({
    name: data.name,
    role: data.role?.toLowerCase().includes("manager") ? "manager" : "backoffice",
    phone: data.phone || "",
    active: data.active !== false,
  });
  return {
    id: tm.id,
    name: tm.name,
    role: data.role,
    phone: tm.phone,
    active: tm.active,
    createdAt: tm.createdAt,
  };
}

export const createStaffMember = createStaff;

export async function updateStaff(id: string, data: Partial<StaffMember>): Promise<void> {
  await updateTeamMember(id, {
    ...(data.name ? { name: data.name } : {}),
    ...(data.phone ? { phone: data.phone } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
    ...(data.role ? { role: data.role.toLowerCase().includes("manager") ? "manager" : "backoffice" } : {}),
  });
}

export const updateStaffMember = updateStaff;
export const deleteStaff = deleteTeamMember;
export const deleteStaffMember = deleteTeamMember;

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

export async function createTechnician(data: Omit<Technician, "id" | "createdAt">): Promise<Technician> {
  const tm = await createTeamMember({
    name: data.name,
    role: "technician",
    phone: data.phone,
    email: data.email,
    specialization: data.specialization,
    active: data.active !== false,
  });
  return {
    id: tm.id,
    name: tm.name,
    phone: tm.phone,
    email: tm.email,
    specialization: tm.specialization,
    active: tm.active,
    createdAt: tm.createdAt,
  };
}

export async function updateTechnician(id: string, data: Partial<Technician>): Promise<void> {
  const { createdAt: _ca, ...rest } = data;
  await updateTeamMember(id, {
    ...rest,
    role: "technician",
  });
}

export const deleteTechnician = deleteTeamMember;

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

export async function ensureFinancialYearDoc(fyId: string, monthKey: string): Promise<void> {
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

export async function seedFinancialYears(): Promise<void> {
  // 2 backdated FYs: FY2324 (2023-24), FY2425 (2024-25)
  // Current: FY2526 (2025-26), FY2627 (2026-27)
  // 5 upcoming FYs: FY2728, FY2829, FY2930, FY3031, FY3132
  const fyList = [
    { startYear: 2023, endYear: 2024, fyId: "FY2324" },
    { startYear: 2024, endYear: 2025, fyId: "FY2425" },
    { startYear: 2025, endYear: 2026, fyId: "FY2526" },
    { startYear: 2026, endYear: 2027, fyId: "FY2627" },
    { startYear: 2027, endYear: 2028, fyId: "FY2728" },
    { startYear: 2028, endYear: 2029, fyId: "FY2829" },
    { startYear: 2029, endYear: 2030, fyId: "FY2930" },
    { startYear: 2030, endYear: 2031, fyId: "FY3031" },
    { startYear: 2031, endYear: 2032, fyId: "FY3132" },
  ];

  for (const fy of fyList) {
    const fyDocRef = doc(db, "financial_years", fy.fyId);
    await setDoc(
      fyDocRef,
      {
        id: fy.fyId,
        label: `FY ${fy.startYear}-${String(fy.endYear).slice(-2)}`,
        startYear: fy.startYear,
        endYear: fy.endYear,
        startDate: `${fy.startYear}-04-01`,
        endDate: `${fy.endYear}-03-31`,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 12 months for Indian FY (April of startYear to March of endYear)
    for (let m = 4; m <= 12; m++) {
      const monthKey = `${fy.startYear}-${String(m).padStart(2, "0")}`;
      const monthDocRef = doc(db, "financial_years", fy.fyId, "months", monthKey);
      await setDoc(
        monthDocRef,
        {
          id: monthKey,
          monthKey,
          monthName: `${MONTH_NAMES[m - 1]} ${fy.startYear}`,
          monthNumber: m,
          fyId: fy.fyId,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    for (let m = 1; m <= 3; m++) {
      const monthKey = `${fy.endYear}-${String(m).padStart(2, "0")}`;
      const monthDocRef = doc(db, "financial_years", fy.fyId, "months", monthKey);
      await setDoc(
        monthDocRef,
        {
          id: monthKey,
          monthKey,
          monthName: `${MONTH_NAMES[m - 1]} ${fy.endYear}`,
          monthNumber: m,
          fyId: fy.fyId,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
}

export async function getFinancialYears(): Promise<FinancialYearDoc[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "financial_years")));
    if (snap.empty) {
      await seedFinancialYears();
      const res = await getDocs(collection(db, "financial_years"));
      return res.docs.map((d) => ({ id: d.id, ...d.data() }) as FinancialYearDoc);
    }
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as FinancialYearDoc)
      .sort((a, b) => (b.startYear || 0) - (a.startYear || 0));
  } catch (err: any) {
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
        id: d.id,
        ...callData,
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

export async function getServiceCallsPaginated(options?: {
  pageSize?: number;
  lastDoc?: DocumentSnapshot | QueryDocumentSnapshot;
  fyId?: string;
  monthKey?: string;
  statusFilter?: string;
  typeFilter?: string;
  search?: string;
}): Promise<PaginatedResult<ServiceCall>> {
  const pageSize = options?.pageSize || 25;
  const fyId = options?.fyId && options.fyId !== "all" ? options.fyId : undefined;
  const monthKey = options?.monthKey && options.monthKey !== "all" ? options.monthKey : undefined;
  const search = (options?.search || "").trim().toLowerCase();

  try {
    let q: any;
    if (fyId && monthKey) {
      // Scoped direct subcollection query
      const constraints: any[] = [limit(pageSize + 1)];
      if (options?.lastDoc) {
        constraints.push(startAfter(options.lastDoc));
      }
      q = query(
        collection(db, "financial_years", fyId, "months", monthKey, "service_calls"),
        ...constraints
      );
    } else {
      // Global query
      const constraints: any[] = [limit(pageSize + 1)];
      if (options?.lastDoc) {
        constraints.push(startAfter(options.lastDoc));
      }
      try {
        q = query(collectionGroup(db, "service_calls"), ...constraints);
      } catch {
        q = query(collection(db, "service_calls"), ...constraints);
      }
    }

    const snap = await fetchWithTimeout(getDocs(q));
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const newLastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined;

    let items = resultDocs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as ServiceCall);

    if (search) {
      items = items.filter((c) => {
        const qDigits = search.replace(/\D/g, "");
        const tMatch = (c.ticketNo || "").toLowerCase().includes(search);
        const nameMatch = (c.customerName || "").toLowerCase().includes(search);
        const phoneMatch = (c.customerPhone || "").includes(search) || (qDigits && (c.customerPhone || "").replace(/\D/g, "").includes(qDigits));
        const devMatch = (c.deviceCategory || "").toLowerCase().includes(search) || (c.modelNumber || "").toLowerCase().includes(search);
        return tMatch || nameMatch || phoneMatch || devMatch;
      });
    }

    return {
      items,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err) {
    console.warn("getServiceCallsPaginated error, returning fallback:", err);
    try {
      const all = await getServiceCalls();
      return {
        items: all.slice(0, pageSize),
        hasMore: all.length > pageSize,
      };
    } catch {
      return { items: [], hasMore: false };
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
      id: callData.ticketNo || id,
      ...callData,
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

export async function hardDeleteServiceCall(id: string): Promise<void> {
  try {
    const existing = await getServiceCall(id);
    const batch = writeBatch(db);
    if (existing?.fyId && existing?.monthKey) {
      const subDocRef = doc(db, "financial_years", existing.fyId, "months", existing.monthKey, "service_calls", id);
      batch.delete(subDocRef);
    }
    batch.delete(doc(db, "service_calls", id));
    await batch.commit();
  } catch (err: any) {
    console.error("hardDeleteServiceCall error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

/**
 * Permanently deletes soft-deleted trash items older than retentionDays (default: 90 days).
 * Prevents database clutter and minimizes long-term storage consumption.
 */
export async function purgeExpiredTrash(retentionDays = 90): Promise<{ purgedCount: number }> {
  try {
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    
    // Find expired trash in service calls
    const trashQuery = query(
      collectionGroup(db, "service_calls"),
      where("isDeleted", "==", true),
      where("deletedAt", "<=", cutoffTimestamp),
      limit(100)
    );

    const snap = await fetchWithTimeout(getDocs(trashQuery));
    if (snap.empty) {
      return { purgedCount: 0 };
    }

    const batch = writeBatch(db);
    let count = 0;

    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
    }

    await batch.commit();
    return { purgedCount: count };
  } catch (err: any) {
    console.error("purgeExpiredTrash error:", err);
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

// ─── Spare Parts Catalog ──────────────────────────────────────────────────────

export async function getSparePartsCatalog(category?: string): Promise<SparePartCatalogItem[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "spare_parts")));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SparePartCatalogItem);
    if (category) {
      return all.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
    }
    return all;
  } catch (err: any) {
    console.error("getSparePartsCatalog error:", err);
    return [];
  }
}

export async function saveSparePartToCatalog(
  name: string,
  unitPrice: number,
  category?: string
): Promise<SparePartCatalogItem> {
  const cleanName = toTitleCase(name);
  if (!cleanName) throw new Error("Part name required");

  const existing = await getSparePartsCatalog();
  const found = existing.find((p) => p.name.toLowerCase() === cleanName.toLowerCase());
  if (found) return found;

  const docRef = doc(collection(db, "spare_parts"));
  const newPart: SparePartCatalogItem = {
    id: docRef.id,
    name: cleanName,
    unitPrice,
    category: category ? toTitleCase(category) : undefined,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newPart));
  return newPart;
}

// ─── WhatsApp Message Templates ──────────────────────────────────────────────

export const DEFAULT_WHATSAPP_TEMPLATES: Omit<WhatsAppTemplateDoc, "createdAt" | "updatedAt">[] = [
  {
    id: "zorba_payment_received",
    name: "zorba_payment_received",
    displayName: "Customer Payment Received Receipt",
    category: "utility",
    targetModule: "service_calls",
    language: "en_US",
    headerType: "none",
    bodyText:
      "*ZORBA INFOTECH - PAYMENT RECEIVED RECEIPT*\n\n" +
      "Dear *{{1}}*,\n" +
      "We have received your payment of *₹{{2}}* for ticket *{{3}}*.\n\n" +
      "🎫 *Ticket No:* {{3}}\n" +
      "💰 *Amount Received:* ₹{{2}}\n" +
      "💳 *Payment Mode:* {{4}}\n" +
      "📅 *Date:* {{5}}\n" +
      "💻 *Device:* {{6}}\n\n" +
      "Thank you for choosing Zorba Infotech!\n" +
      "📞 Support: +91 95891 99738 | Main: +91 91798 90150 | 🌐 www.zorbainfotech.in",
    variables: [
      { index: 1, label: "Customer Name", fallbackValue: "Customer", erpKey: "customer.name" },
      { index: 2, label: "Amount Received", fallbackValue: "0", erpKey: "paidAmount" },
      { index: 3, label: "Ticket No", fallbackValue: "SC-XXXX", erpKey: "ticketNo" },
      { index: 4, label: "Payment Mode", fallbackValue: "UPI / Cash", erpKey: "paymentMode" },
      { index: 5, label: "Payment Date", fallbackValue: "Today", erpKey: "paymentDate" },
      { index: 6, label: "Device Details", fallbackValue: "Device Unit", erpKey: "deviceCategory" },
    ],
    buttons: [
      { type: "phone_number", text: "Call Support", urlOrPhone: "+919589199738" },
    ],
    active: true,
    metaStatus: "approved",
  },
  {
    id: "zorba_customer_service_update",
    name: "zorba_customer_service_update",
    displayName: "Customer Service Call Update & Job Card Summary",
    category: "utility",
    targetModule: "service_calls",
    language: "en_US",
    headerType: "none",
    bodyText:
      "*ZORBA INFOTECH - {{1}}*\n\n" +
      "Dear *{{2}}*,\n" +
      "Your service request has been updated. Here are the ticket details:\n\n" +
      "🎫 *Ticket No:* {{3}}\n" +
      "📅 *Date:* {{4}}\n" +
      "💻 *Device:* {{5}}\n" +
      "🔍 *Reported Issue:* {{6}}\n" +
      "⚡ *Current Status:* {{7}}\n" +
      "💰 *Estimated Total:* ₹{{8}}\n\n" +
      "*Terms & Conditions:*\n" +
      "1. *Courier & Service Charges:* Courier charges will be borne by the customer along with any charges levied by the authorized service center.\n" +
      "2. *Collection Policy:* Please collect your device within 30 days of completion notification.\n" +
      "3. *Data Responsibility:* Zorba Infotech is not liable for data loss. Customers are advised to maintain prior backups.\n" +
      "4. *Warranty & Inspection:* Physical/liquid damage is not covered under warranty. Diagnostic charges apply if estimate is declined.\n\n" +
      "*Thank you for choosing Zorba Infotech!*\n" +
      "📞 Support: +91 93021 99730 | Main: +91 99935 99730 | 🌐 www.zorbainfotech.in",
    variables: [
      { index: 1, label: "Notice Header", fallbackValue: "SERVICE INTAKE CONFIRMATION", erpKey: "noticeHeader" },
      { index: 2, label: "Customer Name", fallbackValue: "Customer", erpKey: "customer.name" },
      { index: 3, label: "Ticket No", fallbackValue: "SC-XXXX", erpKey: "ticketNo" },
      { index: 4, label: "Date & Time", fallbackValue: "Today", erpKey: "dateTime" },
      { index: 5, label: "Device & Model", fallbackValue: "Device Unit", erpKey: "deviceCategory" },
      { index: 6, label: "Reported Issue", fallbackValue: "Service Intake", erpKey: "issueDescription" },
      { index: 7, label: "Status Stage", fallbackValue: "RECEIVED", erpKey: "status" },
      { index: 8, label: "Estimated Total", fallbackValue: "0", erpKey: "grandTotal" },
    ],
    buttons: [
      { type: "url", text: "Visit Website", urlOrPhone: "https://www.zorbainfotech.in" },
      { type: "phone_number", text: "Call Support", urlOrPhone: "+919302199730" },
    ],
    active: true,
    metaStatus: "approved",
  },
  {
    id: "zorba_service_center_followup",
    name: "zorba_service_center_followup",
    displayName: "OEM Service Center RMA & Repair Inquiry",
    category: "utility",
    targetModule: "service_centers",
    language: "en_US",
    headerType: "none",
    bodyText:
      "*ZORBA INFOTECH - SERVICE CENTER RMA / REPAIR STATUS INQUIRY*\n\n" +
      "Dear *{{1}}* Support Team,\n" +
      "We would like to request an update on the repair/replacement status for the following unit sent to your center:\n\n" +
      "🎫 *Our Job Card / Ticket:* {{2}}\n" +
      "🏷️ *Service Center RMA / Ref No:* {{3}}\n" +
      "📅 *Dispatched On:* {{4}}\n" +
      "💻 *Device:* {{5}}\n" +
      "🔢 *Serial / IMEI:* {{6}}\n" +
      "🔍 *Reported Defect:* {{7}}\n\n" +
      "Kindly let us know if the unit is diagnosed / under repair / replaced / ready for dispatch.\n\n" +
      "Thank you,\n" +
      "*Zorba Infotech Service Desk*\n" +
      "📞 Support: +91 93021 99730 / +91 99935 99730",
    variables: [
      { index: 1, label: "Service Center Name", fallbackValue: "Authorized Service Center", erpKey: "serviceCenterName" },
      { index: 2, label: "Ticket Number", fallbackValue: "SC-XXXX", erpKey: "ticketNo" },
      { index: 3, label: "RMA / Ref No", fallbackValue: "N/A", erpKey: "rmaNumber" },
      { index: 4, label: "Dispatched Date", fallbackValue: "Recent", erpKey: "dateTime" },
      { index: 5, label: "Device & Model", fallbackValue: "IT Hardware", erpKey: "deviceCategory" },
      { index: 6, label: "Serial Number", fallbackValue: "N/A", erpKey: "serialNumber" },
      { index: 7, label: "Reported Defect", fallbackValue: "Hardware Fault", erpKey: "issueDescription" },
    ],
    buttons: [
      { type: "phone_number", text: "Call Service Desk", urlOrPhone: "+919302199730" },
    ],
    active: true,
    metaStatus: "approved",
  },
  {
    id: "zorba_courier_pickup_request",
    name: "zorba_courier_pickup_request",
    displayName: "Courier Parcel Pickup Request",
    category: "utility",
    targetModule: "couriers",
    language: "en_US",
    headerType: "none",
    bodyText:
      "*ZORBA INFOTECH - PARCEL PICKUP REQUEST*\n\n" +
      "Hello *{{1}}* Team,\n" +
      "Kindly arrange a parcel pickup from our shop/office for the following shipment:\n\n" +
      "🎫 *Ticket / Ref No:* {{2}}\n" +
      "🏢 *Consignee / Service Center:* {{3}}\n" +
      "📍 *Delivery Address:* {{4}}\n" +
      "🏷️ *RMA / Ref Number:* {{5}}\n" +
      "📅 *Request Date:* {{6}}\n" +
      "📦 *Shop Pickup Location:* Zorba Infotech, Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch - 458441 (M.P.)\n\n" +
      "Please assign a pickup executive at the earliest.\n\n" +
      "Thank you,\n" +
      "*Zorba Infotech Logistics Desk*\n" +
      "📞 Support: +91 93021 99730 / +91 99935 99730",
    variables: [
      { index: 1, label: "Courier Partner Name", fallbackValue: "Courier", erpKey: "courierName" },
      { index: 2, label: "Ticket / Ref No", fallbackValue: "SC-XXXX", erpKey: "ticketNo" },
      { index: 3, label: "Consignee Center", fallbackValue: "OEM Service Center", erpKey: "serviceCenterName" },
      { index: 4, label: "Delivery Address", fallbackValue: "Destination City", erpKey: "destinationAddress" },
      { index: 5, label: "RMA / Ref Number", fallbackValue: "N/A", erpKey: "rmaNumber" },
      { index: 6, label: "Request Date", fallbackValue: "Today", erpKey: "dateTime" },
    ],
    buttons: [
      { type: "phone_number", text: "Call Logistics Desk", urlOrPhone: "+919302199730" },
    ],
    active: true,
    metaStatus: "approved",
  },
  {
    id: "zorba_courier_delivery_inquiry",
    name: "zorba_courier_delivery_inquiry",
    displayName: "Courier Shipment Delivery Inquiry",
    category: "utility",
    targetModule: "couriers",
    language: "en_US",
    headerType: "none",
    bodyText:
      "*ZORBA INFOTECH - SHIPMENT DELIVERY INQUIRY*\n\n" +
      "Hello *{{1}}* Team,\n" +
      "We would like to check the delivery status for our dispatched shipment:\n\n" +
      "📦 *Docket / AWB No:* {{2}}\n" +
      "🎫 *Internal Ticket Ref:* {{3}}\n" +
      "🏢 *Consignee:* {{4}}\n" +
      "📍 *Destination:* {{5}}\n" +
      "📅 *Dispatch Date:* {{6}}\n\n" +
      "Kindly confirm if this parcel has reached the destination or provide the expected delivery timestamp.\n\n" +
      "Thank you,\n" +
      "*Zorba Infotech Logistics Desk*\n" +
      "📞 Support: +91 93021 99730 / +91 99935 99730",
    variables: [
      { index: 1, label: "Courier Partner Name", fallbackValue: "Courier", erpKey: "courierName" },
      { index: 2, label: "Docket / AWB No", fallbackValue: "Pending Docket", erpKey: "rmaNumber" },
      { index: 3, label: "Ticket Number", fallbackValue: "SC-XXXX", erpKey: "ticketNo" },
      { index: 4, label: "Consignee", fallbackValue: "OEM Service Center", erpKey: "serviceCenterName" },
      { index: 5, label: "Destination", fallbackValue: "Destination City", erpKey: "destinationAddress" },
      { index: 6, label: "Dispatch Date", fallbackValue: "Today", erpKey: "dateTime" },
    ],
    buttons: [
      { type: "phone_number", text: "Call Logistics Desk", urlOrPhone: "+919302199730" },
    ],
    active: true,
    metaStatus: "approved",
  },
];

export async function getWhatsAppTemplates(moduleFilter?: string): Promise<WhatsAppTemplateDoc[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "whatsapp_templates")));
    let templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WhatsAppTemplateDoc);

    if (templates.length === 0) {
      await seedDefaultWhatsAppTemplates();
      const refetch = await fetchWithTimeout(getDocs(collection(db, "whatsapp_templates")));
      templates = refetch.docs.map((d) => ({ id: d.id, ...d.data() }) as WhatsAppTemplateDoc);
    }

    if (moduleFilter && moduleFilter !== "all") {
      return templates.filter((t) => t.targetModule === moduleFilter);
    }
    return templates;
  } catch (err: any) {
    console.error("getWhatsAppTemplates error:", err);
    return DEFAULT_WHATSAPP_TEMPLATES.map((t) => ({
      ...t,
      createdAt: Date.now(),
    }));
  }
}

export async function createWhatsAppTemplate(
  data: Omit<WhatsAppTemplateDoc, "id" | "createdAt" | "updatedAt">
): Promise<WhatsAppTemplateDoc> {
  const docId = data.name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_") || `tpl_${Date.now()}`;
  const docRef = doc(db, "whatsapp_templates", docId);
  const newTemplate: WhatsAppTemplateDoc = {
    id: docId,
    ...data,
    name: docId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newTemplate), { merge: true });
  return newTemplate;
}

export async function updateWhatsAppTemplate(
  id: string,
  data: Partial<WhatsAppTemplateDoc>
): Promise<void> {
  const docRef = doc(db, "whatsapp_templates", id);
  await setDoc(docRef, cleanFirestoreData({ ...data, updatedAt: Date.now() }), { merge: true });
}

export async function deleteWhatsAppTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, "whatsapp_templates", id));
}

export async function seedDefaultWhatsAppTemplates(force: boolean = false): Promise<void> {
  try {
    const existing = await getDocs(collection(db, "whatsapp_templates"));
    
    // If not forced and already has the correct number of updated templates with terms, return
    if (!force && !existing.empty) {
      const hasTerms = existing.docs.some((d) => d.data().bodyText?.includes("Terms & Conditions"));
      if (hasTerms) return;
    }

    for (const tpl of DEFAULT_WHATSAPP_TEMPLATES) {
      const docRef = doc(db, "whatsapp_templates", tpl.id);
      await setDoc(
        docRef,
        cleanFirestoreData({
          ...tpl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Could not seed default WhatsApp templates:", err);
  }
}

// ==========================================
// Quotations & Quotation Templates
// ==========================================

export function getQuotationMonthKey(dateOrStr?: string | Date): { year: string; month: string; monthKey: string } {
  let d: Date;
  if (!dateOrStr) {
    d = new Date();
  } else if (dateOrStr instanceof Date) {
    d = dateOrStr;
  } else {
    d = new Date(dateOrStr);
    if (isNaN(d.getTime())) d = new Date();
  }
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return { year, month, monthKey: `${year}-${month}` };
}

export async function peekNextQuotationNumber(dateOrStr?: string | Date): Promise<string> {
  const { year, month, monthKey } = getQuotationMonthKey(dateOrStr);
  const prefix = `QT-${year}-${month}-`;
  const counterRef = doc(db, "counters", `quotations_${monthKey}`);

  try {
    const counterDoc = await fetchWithTimeout(getDoc(counterRef));
    let current = 0;
    if (counterDoc.exists()) {
      current = counterDoc.data().current || 0;
    } else {
      try {
        const q = query(
          collection(db, "quotations"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const snap = await fetchWithTimeout(getDocs(q));
        const existingNums = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const qNo = data.quotationNo || "";
            const match = qNo.match(new RegExp(`^QT-${year}-${month}-(\\d+)`)) || qNo.match(new RegExp(`^QT-${year}${month}-(\\d+)`));
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => !isNaN(n) && n > 0);
        if (existingNums.length > 0) {
          current = Math.max(...existingNums);
        }
      } catch {
        // Ignore fallback scan error
      }
    }
    const next = current + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  } catch (err) {
    return `${prefix}0001`;
  }
}

export async function getNextQuotationNumber(dateOrStr?: string | Date): Promise<string> {
  const { year, month, monthKey } = getQuotationMonthKey(dateOrStr);
  const prefix = `QT-${year}-${month}-`;
  const counterRef = doc(db, "counters", `quotations_${monthKey}`);

  try {
    const nextCount = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let current = 0;
      if (counterDoc.exists()) {
        current = counterDoc.data().current || 0;
      } else {
        try {
          const q = query(
            collection(db, "quotations"),
            orderBy("createdAt", "desc"),
            limit(50)
          );
          const snap = await getDocs(q);
          const existingNums = snap.docs
            .map((docSnap) => {
              const data = docSnap.data();
              const qNo = data.quotationNo || "";
              const match = qNo.match(new RegExp(`^QT-${year}-${month}-(\\d+)`)) || qNo.match(new RegExp(`^QT-${year}${month}-(\\d+)`));
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
    console.warn("Atomic quotation counter transaction failed, using fallback:", err);
    return `${prefix}${String(Date.now()).slice(-4)}`;
  }
}

export async function getMonthlyReportSummary(
  monthKey: string,
  fyIdInput?: string
): Promise<MonthlyReportSummary> {
  const fyId = fyIdInput || getFinancialYear(monthKey + "-01").fyId;
  const docRef = doc(db, "reports_summary", monthKey);

  try {
    const snap = await fetchWithTimeout(getDoc(docRef)).catch(() => null);
    if (snap && snap.exists()) {
      return { id: snap.id, ...snap.data() } as MonthlyReportSummary;
    }
  } catch (err) {
    console.warn("getMonthlyReportSummary read warning:", err);
  }

  // Calculate summary directly from month's subcollection (~150 docs)
  const calls = await getServiceCallsForMonth(fyId, monthKey);
  const totalCalls = calls.length;
  const totalRevenue = calls.reduce((acc, c) => acc + (c.grandTotal || 0), 0);
  const partsTotal = calls.reduce((acc, c) => acc + (c.partsTotal || 0), 0);
  const serviceCharges = calls.reduce((acc, c) => acc + (c.serviceCharges || 0), 0);
  const completedCalls = calls.filter((c) => c.status === "completed" || c.status === "delivered").length;
  const activeCalls = calls.filter((c) =>
    ["received", "in_progress", "sent_to_service_center", "waiting_for_parts"].includes(c.status)
  ).length;

  const inHouseCount = calls.filter((c) => c.type === "in_house_repair").length;
  const serviceCenterCount = calls.filter((c) => c.type === "company_service_center").length;
  const onsiteCount = calls.filter((c) => c.type === "onsite_visit").length;

  const dailyGroups = calls.reduce((acc, call) => {
    const dateStr = call.dateTime ? call.dateTime.slice(0, 10) : "Unknown";
    if (!acc[dateStr]) {
      acc[dateStr] = { count: 0, revenue: 0 };
    }
    acc[dateStr].count += 1;
    acc[dateStr].revenue += call.grandTotal || 0;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const summaryData: MonthlyReportSummary = {
    id: monthKey,
    monthKey,
    fyId,
    totalCalls,
    totalRevenue,
    partsTotal,
    serviceCharges,
    completedCalls,
    activeCalls,
    inHouseCount,
    serviceCenterCount,
    onsiteCount,
    dailyBreakdown: dailyGroups,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(docRef, cleanFirestoreData(summaryData), { merge: true });
  } catch (saveErr) {
    console.warn("Could not persist reports_summary doc:", saveErr);
  }

  return summaryData;
}

export async function updateMonthlyReportSummary(
  monthKey: string,
  data: Partial<MonthlyReportSummary>
): Promise<void> {
  try {
    const docRef = doc(db, "reports_summary", monthKey);
    await setDoc(
      docRef,
      cleanFirestoreData({
        ...data,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn("updateMonthlyReportSummary error:", err);
  }
}

export async function getQuotations(filters?: {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  dateFilter?: "today" | "month" | "all";
}): Promise<Quotation[]> {
  try {
    const q = query(
      collection(db, "quotations"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const snap = await fetchWithTimeout(getDocs(q));
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quotation);

    if (filters?.customerId) {
      items = items.filter((q) => q.customerId === filters.customerId);
    }

    if (filters?.dateFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      items = items.filter((q) => (q.date || "").startsWith(todayStr));
    } else if (filters?.dateFilter === "month") {
      const currentYearMonth = new Date().toISOString().slice(0, 7);
      items = items.filter((q) => (q.date || "").startsWith(currentYearMonth));
    } else if (filters?.startDate && filters?.endDate) {
      items = items.filter((q) => {
        const d = q.date || "";
        return d >= (filters.startDate || "") && d <= (filters.endDate || "");
      });
    }

    return items;
  } catch (err) {
    console.error("getQuotations error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getQuotationsPaginated(options?: {
  pageSize?: number;
  lastDoc?: DocumentSnapshot | QueryDocumentSnapshot;
  customerId?: string;
  dateFilter?: "today" | "month" | "all" | "custom";
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<PaginatedResult<Quotation>> {
  const pageSize = options?.pageSize || 25;
  const search = (options?.search || "").trim().toLowerCase();

  try {
    const constraints: any[] = [
      orderBy("createdAt", "desc"),
      limit(pageSize + 1),
    ];

    if (options?.customerId) {
      constraints.unshift(where("customerId", "==", options.customerId));
    }

    if (options?.lastDoc) {
      constraints.push(startAfter(options.lastDoc));
    }

    const q = query(collection(db, "quotations"), ...constraints);
    const snap = await fetchWithTimeout(getDocs(q));

    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const newLastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined;

    let items = resultDocs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as Quotation);

    if (search) {
      const qDigits = search.replace(/\D/g, "");
      items = items.filter((q) => {
        const noMatch = (q.quotationNo || "").toLowerCase().includes(search);
        const nameMatch = (q.customerName || "").toLowerCase().includes(search);
        const phoneMatch = (q.customerPhone || "").includes(search) || (qDigits && (q.customerPhone || "").replace(/\D/g, "").includes(qDigits));
        return noMatch || nameMatch || phoneMatch;
      });
    }

    return {
      items,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err) {
    console.warn("getQuotationsPaginated error, fallback:", err);
    try {
      const all = await getQuotations();
      return {
        items: all.slice(0, pageSize),
        hasMore: all.length > pageSize,
      };
    } catch {
      return { items: [], hasMore: false };
    }
  }
}

export async function getQuotationsForCustomer(
  customerId: string,
  customerPhone?: string,
  customerName?: string
): Promise<Quotation[]> {
  try {
    const results: Quotation[] = [];
    const seenIds = new Set<string>();

    if (customerId) {
      try {
        const q = query(
          collection(db, "quotations"),
          where("customerId", "==", customerId),
          limit(100)
        );
        const snap = await fetchWithTimeout(getDocs(q));
        snap.docs.forEach((d) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() } as Quotation);
          }
        });
      } catch (err) {
        console.warn("getQuotationsForCustomer by customerId query error:", err);
      }
    }

    if (customerPhone && results.length < 50) {
      const cleanPhone = (customerPhone || "").replace(/\D/g, "");
      const formatted = formatIndianPhoneNumber(customerPhone);
      for (const p of [customerPhone, formatted, cleanPhone]) {
        if (!p) continue;
        try {
          const qPhone = query(
            collection(db, "quotations"),
            where("customerPhone", "==", p),
            limit(25)
          );
          const snap = await fetchWithTimeout(getDocs(qPhone));
          snap.docs.forEach((d) => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              results.push({ id: d.id, ...d.data() } as Quotation);
            }
          });
        } catch {}
      }
    }

    return results.sort((a, b) => (Number((b as any).createdAt) || 0) - (Number((a as any).createdAt) || 0));
  } catch (err: any) {
    console.error("getQuotationsForCustomer error:", err);
    return [];
  }
}


export async function getQuotation(id: string): Promise<Quotation | null> {
  try {
    const docRef = doc(db, "quotations", id);
    const snap = await fetchWithTimeout(getDoc(docRef));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Quotation;
  } catch (err) {
    console.error("getQuotation error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function createQuotation(
  data: Omit<Quotation, "id" | "createdAt" | "quotationNo"> & { quotationNo?: string }
): Promise<Quotation> {
  try {
    let quotationNo = (data.quotationNo || "").trim();
    if (!quotationNo || quotationNo.startsWith("QUOT-DRAFT") || quotationNo.startsWith("QT-DRAFT")) {
      quotationNo = await getNextQuotationNumber(data.date || new Date());
    }

    const sanitizedItems = (data.items || []).map((it) => ({
      ...it,
      productName: toTitleCase(it?.productName || ""),
      category: it?.category ? toTitleCase(it.category) : "",
      modelNumber: it?.modelNumber ? formatModelNumber(it.modelNumber) : "",
      description: typeof it?.description === "string" ? it.description.trim() : "",
    }));

    const docRef = doc(collection(db, "quotations"));
    const newQuotation: Quotation = {
      id: docRef.id,
      ...data,
      customerName: toTitleCase(data.customerName || ""),
      customerAddress: data.customerAddress ? toTitleCase(data.customerAddress) : "",
      templateName: data.templateName ? toTitleCase(data.templateName) : "",
      items: sanitizedItems,
      quotationNo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(docRef, cleanFirestoreData(newQuotation));
    publishSyncSignal("quotations", { action: "create", resourceId: newQuotation.id });
    return newQuotation;
  } catch (err) {
    console.error("createQuotation error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function updateQuotation(
  id: string,
  data: Partial<Quotation>
): Promise<void> {
  try {
    const sanitized: any = { ...data };
    if (sanitized.customerName) sanitized.customerName = toTitleCase(sanitized.customerName);
    if (sanitized.customerAddress) sanitized.customerAddress = toTitleCase(sanitized.customerAddress);
    if (sanitized.templateName) sanitized.templateName = toTitleCase(sanitized.templateName);
    if (sanitized.items && Array.isArray(sanitized.items)) {
      sanitized.items = sanitized.items.map((it: any) => ({
        ...it,
        productName: toTitleCase(it?.productName || ""),
        category: it?.category ? toTitleCase(it.category) : "",
        modelNumber: it?.modelNumber ? formatModelNumber(it.modelNumber) : "",
        description: typeof it?.description === "string" ? it.description.trim() : "",
      }));
    }

    const docRef = doc(db, "quotations", id);
    await setDoc(docRef, cleanFirestoreData({ ...sanitized, updatedAt: Date.now() }), { merge: true });
    publishSyncSignal("quotations", { action: "update", resourceId: id });
  } catch (err) {
    console.error("updateQuotation error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteQuotation(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "quotations", id));
    publishSyncSignal("quotations", { action: "delete", resourceId: id });
  } catch (err) {
    console.error("deleteQuotation error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getQuotationTemplates(): Promise<QuotationTemplate[]> {
  try {
    const q = query(collection(db, "quotation_templates"), orderBy("createdAt", "desc"));
    const snap = await fetchWithTimeout(getDocs(q));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuotationTemplate);
  } catch (err) {
    console.error("getQuotationTemplates error:", err);
    return [];
  }
}

export async function createQuotationTemplate(
  data: Omit<QuotationTemplate, "id" | "createdAt">
): Promise<QuotationTemplate> {
  try {
    const docRef = doc(collection(db, "quotation_templates"));
    const newTemplate: QuotationTemplate = {
      id: docRef.id,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(docRef, cleanFirestoreData(newTemplate));
    return newTemplate;
  } catch (err) {
    console.error("createQuotationTemplate error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function updateQuotationTemplate(
  id: string,
  data: Partial<QuotationTemplate>
): Promise<void> {
  try {
    const docRef = doc(db, "quotation_templates", id);
    await setDoc(docRef, cleanFirestoreData({ ...data, updatedAt: Date.now() }), { merge: true });
  } catch (err) {
    console.error("updateQuotationTemplate error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteQuotationTemplate(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "quotation_templates", id));
  } catch (err) {
    console.error("deleteQuotationTemplate error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

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
    const docRef = doc(db, "service_calls", id);
    await setDoc(
      docRef,
      cleanFirestoreData({
        ...payment,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error("updateServiceCallPaymentStatus error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

// ==========================================
// Inquiries (Website Contact & Leads)
// ==========================================

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
    const snap = await fetchWithTimeout(getDocs(q));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inquiry));
  } catch (err) {
    console.error("getInquiries error:", err);
    try {
      const snap = await fetchWithTimeout(getDocs(collection(db, "inquiries")));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inquiry));
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch {
      return [];
    }
  }
}

export async function createInquiry(
  data: Omit<Inquiry, "id" | "createdAt" | "updatedAt" | "status"> & { status?: InquiryStatus }
): Promise<Inquiry> {
  const rawPhone = (data.phone || "").trim();
  const cleanDigits = rawPhone.replace(/\D/g, "");
  if (!rawPhone || cleanDigits.length < 10) {
    throw new Error("A valid 10-digit mobile phone number is mandatory to submit an inquiry.");
  }

  try {
    const docRef = doc(collection(db, "inquiries"));
    const formattedPhone = formatIndianPhoneNumber(rawPhone) || rawPhone;
    const newInq: Inquiry = {
      id: docRef.id,
      name: toTitleCase(data.name || ""),
      phone: formattedPhone,
      email: (data.email || "").trim().toLowerCase() || undefined,
      subject: data.subject ? toTitleCase(data.subject) : undefined,
      message: (data.message || "").trim(),
      source: data.source || "contact_page",
      status: data.status || "pending",
      notes: data.notes?.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(docRef, cleanFirestoreData(newInq));
    publishSyncSignal("inquiries", { action: "create", resourceId: newInq.id });
    return newInq;
  } catch (err: any) {
    console.error("createInquiry error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  notes?: string,
  staffId?: string,
  staffName?: string
): Promise<void> {
  try {
    const docRef = doc(db, "inquiries", id);
    const updateData: any = {
      status,
      updatedAt: Date.now(),
    };
    if (notes !== undefined) updateData.notes = notes.trim();
    if (staffId) updateData.resolvedByStaffId = staffId;
    if (staffName) updateData.resolvedByStaffName = staffName;
    if (status === "completed" || status === "dismissed") updateData.resolvedAt = Date.now();
    await setDoc(docRef, cleanFirestoreData(updateData), { merge: true });
    publishSyncSignal("inquiries", { action: "update", resourceId: id });
  } catch (err: any) {
    console.error("updateInquiryStatus error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteInquiry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "inquiries", id));
    publishSyncSignal("inquiries", { action: "delete", resourceId: id });
  } catch (err: any) {
    console.error("deleteInquiry error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

// ==========================================
// Job Applications (Careers Page)
// ==========================================

export async function getJobApplications(): Promise<JobApplication[]> {
  try {
    const q = query(collection(db, "job_applications"), orderBy("createdAt", "desc"));
    const snap = await fetchWithTimeout(getDocs(q));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobApplication));
  } catch (err) {
    console.error("getJobApplications error:", err);
    try {
      const snap = await fetchWithTimeout(getDocs(collection(db, "job_applications")));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobApplication));
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch {
      return [];
    }
  }
}

export async function createJobApplication(
  data: Omit<JobApplication, "id" | "createdAt" | "updatedAt" | "status"> & { status?: JobApplicationStatus }
): Promise<JobApplication> {
  const rawPhone = (data.phone || "").trim();
  const cleanDigits = rawPhone.replace(/\D/g, "");
  if (!rawPhone || cleanDigits.length < 10) {
    throw new Error("A valid 10-digit mobile phone number is mandatory to apply.");
  }

  try {
    const docRef = doc(collection(db, "job_applications"));
    const formattedPhone = formatIndianPhoneNumber(rawPhone) || rawPhone;
    const newApp: JobApplication = {
      id: docRef.id,
      fullName: toTitleCase(data.fullName || ""),
      phone: formattedPhone,
      email: (data.email || "").trim().toLowerCase() || undefined,
      positionApplied: toTitleCase(data.positionApplied || "General Technician"),
      experience: data.experience?.trim() || undefined,
      resumeLink: data.resumeLink?.trim() || undefined,
      message: data.message?.trim() || undefined,
      status: data.status || "pending",
      notes: data.notes?.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(docRef, cleanFirestoreData(newApp));
    publishSyncSignal("job_applications", { action: "create", resourceId: newApp.id });
    return newApp;
  } catch (err: any) {
    console.error("createJobApplication error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function updateJobApplicationStatus(
  id: string,
  status: JobApplicationStatus,
  notes?: string,
  staffId?: string,
  staffName?: string
): Promise<void> {
  try {
    const docRef = doc(db, "job_applications", id);
    const updateData: any = {
      status,
      updatedAt: Date.now(),
    };
    if (notes !== undefined) updateData.notes = notes.trim();
    if (staffId) updateData.reviewedByStaffId = staffId;
    if (staffName) updateData.reviewedByStaffName = staffName;
    await setDoc(docRef, cleanFirestoreData(updateData), { merge: true });
    publishSyncSignal("job_applications", { action: "update", resourceId: id });
  } catch (err) {
    console.error("updateJobApplicationStatus error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteJobApplication(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "job_applications", id));
    publishSyncSignal("job_applications", { action: "delete", resourceId: id });
  } catch (err) {
    console.error("deleteJobApplication error:", err);
    throw new Error(formatFirebaseError(err));
  }
}


