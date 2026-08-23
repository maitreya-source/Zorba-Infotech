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
  serverTimestamp,
  runTransaction,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { toTitleCase, formatModelNumber, formatIndianPhoneNumber, generateSearchTokens } from "./utils";
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

// ─── Products (Unique Model Number Document ID) ───────────────────────────────

let _cachedProducts: Product[] | null = null;
let _cachedProductsTimestamp = 0;
const PRODUCTS_CACHE_TTL = 30000; // 30 seconds

export function invalidateProductsCache() {
  _cachedProducts = null;
  _cachedProductsTimestamp = 0;
}

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  const now = Date.now();
  if (!forceRefresh && _cachedProducts && now - _cachedProductsTimestamp < PRODUCTS_CACHE_TTL) {
    return _cachedProducts;
  }
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "products")));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    _cachedProducts = list;
    _cachedProductsTimestamp = now;
    return list;
  } catch (err: any) {
    if (_cachedProducts) return _cachedProducts;
    console.error("getProducts error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const snap = await fetchWithTimeout(getDoc(doc(db, "products", id)));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Product;
  } catch (err: any) {
    console.error("getProduct error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function searchProducts(queryText: string, categoryIdFilter?: string, limitCount = 30): Promise<Product[]> {
  const clean = (queryText || "").trim().toLowerCase();
  try {
    const all = await getProducts();
    return all
      .filter((p) => {
        if (categoryIdFilter && categoryIdFilter !== "all" && p.categoryId?.toLowerCase() !== categoryIdFilter.toLowerCase()) {
          return false;
        }
        if (!clean) return true;
        const nameMatch = p.name && p.name.toLowerCase().includes(clean);
        const modelMatch = p.model && p.model.toLowerCase().includes(clean);
        const brandMatch = p.brand && p.brand.toLowerCase().includes(clean);
        const itemCodeMatch = p.itemCode && p.itemCode.toLowerCase().includes(clean);
        const descMatch = p.description && p.description.toLowerCase().includes(clean);
        const catMatch = p.categoryId && p.categoryId.toLowerCase().includes(clean);
        const idMatch = p.id && p.id.toLowerCase().includes(clean);
        return nameMatch || modelMatch || brandMatch || itemCodeMatch || descMatch || catMatch || idMatch;
      })
      .slice(0, limitCount);
  } catch (err: any) {
    console.error("searchProducts error:", err);
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

  const productData: Product = {
    id: cleanDocId,
    ...data,
    name: toTitleCase(data.name),
    brand: data.brand ? toTitleCase(data.brand) : "",
    category: data.category ? toTitleCase(data.category) : "",
    model: cleanDocId,
    itemCode: data.itemCode ? data.itemCode.trim().toUpperCase() : "",
    warranty: data.warranty ? toTitleCase(data.warranty) : "",
    serviceCenter: data.serviceCenter ? toTitleCase(data.serviceCenter) : "",
    description: data.description ? data.description.trim() : "",
    showOnWebsite: data.showOnWebsite !== undefined ? data.showOnWebsite : true,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(docRef, cleanFirestoreData(productData));
  invalidateProductsCache();

  // Sync model number to service call models auto-suggest
  if (data.categoryId) {
    getCategories().then((cats) => {
      const cat = cats.find((c) => c.id === data.categoryId);
      if (cat) {
        saveDeviceModel(cat.name, cleanDocId).catch(() => {});
      }
    }).catch(() => {});
  }

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
    if (sanitized.warranty) sanitized.warranty = toTitleCase(sanitized.warranty);
    if (sanitized.serviceCenter) sanitized.serviceCenter = toTitleCase(sanitized.serviceCenter);
    if (sanitized.description) sanitized.description = sanitized.description.trim();
    if (sanitized.showOnWebsite !== undefined) sanitized.showOnWebsite = Boolean(sanitized.showOnWebsite);

    await updateDoc(
      doc(db, "products", id),
      cleanFirestoreData({
        ...sanitized,
        updatedAt: serverTimestamp(),
      })
    );
    invalidateProductsCache();
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
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, {
      showOnWebsite,
      updatedAt: serverTimestamp(),
    });
    invalidateProductsCache();
  } catch (err: any) {
    console.error("toggleProductWebsiteVisibility error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "products", id));
    invalidateProductsCache();
  } catch (err: any) {
    console.error("deleteProduct error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function uploadProductPhoto(
  file: File,
  productId: string
): Promise<string> {
  try {
    const ext = file.name.split(".").pop();
    const storageRef = ref(storage, `products/${productId}.${ext}`);
    const snap = await uploadBytes(storageRef, file);
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

// ─── Customers ────────────────────────────────────────────────────────────────

let _cachedCustomers: Customer[] | null = null;
let _cachedCustomersTimestamp = 0;
const CUSTOMERS_CACHE_TTL = 30000; // 30 seconds

export function invalidateCustomersCache() {
  _cachedCustomers = null;
  _cachedCustomersTimestamp = 0;
}

export async function getCustomers(forceRefresh = false): Promise<Customer[]> {
  const now = Date.now();
  if (!forceRefresh && _cachedCustomers && now - _cachedCustomersTimestamp < CUSTOMERS_CACHE_TTL) {
    return _cachedCustomers;
  }
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "customers")));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
    _cachedCustomers = list;
    _cachedCustomersTimestamp = now;
    return list;
  } catch (err: any) {
    if (_cachedCustomers) return _cachedCustomers;
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

  try {
    const all = await getCustomers();
    for (const c of all) {
      if (excludeCustomerId && c.id === excludeCustomerId) continue;

      const primary10 = normalizePhone10(c.phone);
      if (primary10 === target10) return c;

      if (c.additionalPhones && c.additionalPhones.length > 0) {
        for (const p of c.additionalPhones) {
          if (normalizePhone10(p) === target10) return c;
        }
      }
    }
    return null;
  } catch (err) {
    console.error("findCustomerByPhoneNumber error:", err);
    return null;
  }
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

  const searchTokens = generateSearchTokens({
    name: formattedName,
    phone: formattedPhone,
    companyName: formattedCompany,
    email: data.email,
    id: docRef.id,
  });

  const newCust: Customer = {
    id: docRef.id,
    ...data,
    name: formattedName,
    phone: formattedPhone,
    additionalPhones,
    companyName: formattedCompany,
    address: formattedAddress,
    city: formattedCity,
    searchTokens,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCust));
  invalidateCustomersCache();
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

  const searchTokens = generateSearchTokens({
    name: formattedName,
    phone: formattedPhone,
    companyName: formattedCompany,
    email,
    id,
  });

  const formattedData: Partial<Customer> = {
    ...data,
    ...(formattedName ? { name: formattedName } : {}),
    ...(formattedPhone ? { phone: formattedPhone } : {}),
    ...(additionalPhones ? { additionalPhones } : {}),
    ...(data.companyName !== undefined ? { companyName: formattedCompany } : {}),
    ...(data.address !== undefined ? { address: formattedAddress } : {}),
    ...(data.city !== undefined ? { city: formattedCity } : {}),
    searchTokens,
  };
  await setDoc(doc(db, "customers", id), cleanFirestoreData(formattedData), { merge: true });
  invalidateCustomersCache();
}

export async function searchCustomers(queryText: string, limitCount = 30): Promise<Customer[]> {
  const clean = (queryText || "").trim().toLowerCase();
  try {
    const all = await getCustomers();
    if (!clean) {
      return all.slice(0, limitCount);
    }

    const qDigits = clean.replace(/\D/g, "");
    return all
      .filter((c) => {
        const nameMatch = c.name && c.name.toLowerCase().includes(clean);
        const phoneDigits = (c.phone || "").replace(/\D/g, "");
        const phoneMatch = Boolean(
          (qDigits && phoneDigits.includes(qDigits)) ||
          (c.phone && c.phone.toLowerCase().includes(clean)) ||
          (c.additionalPhones &&
            c.additionalPhones.some((p) => {
              const pDigits = (p || "").replace(/\D/g, "");
              return (qDigits && pDigits.includes(qDigits)) || (p && p.toLowerCase().includes(clean));
            }))
        );
        const companyMatch = c.companyName && c.companyName.toLowerCase().includes(clean);
        const emailMatch = c.email && c.email.toLowerCase().includes(clean);
        const addressMatch = c.address && c.address.toLowerCase().includes(clean);
        const idMatch = c.id && c.id.toLowerCase().includes(clean);
        return nameMatch || phoneMatch || companyMatch || emailMatch || addressMatch || idMatch;
      })
      .slice(0, limitCount);
  } catch (err: any) {
    console.error("searchCustomers error:", err);
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
      // CollectionGroup searches across all subcollections named "service_calls"
      const cgQuery = query(collectionGroup(db, "service_calls"));
      const cgSnap = await fetchWithTimeout(getDocs(cgQuery));
      callsDocs = cgSnap.docs;
    } catch {
      // Fallback to top-level collection
      const topSnap = await fetchWithTimeout(getDocs(collection(db, "service_calls")));
      callsDocs = topSnap.docs;
    }

    if (callsDocs.length === 0) {
      try {
        const topSnap = await fetchWithTimeout(getDocs(collection(db, "service_calls")));
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

    const customersSnap = await fetchWithTimeout(getDocs(collection(db, "customers"))).catch(() => null);
    const customerMap = new Map<string, Customer>();
    if (customersSnap) {
      customersSnap.docs.forEach((d) => {
        customerMap.set(d.id, { id: d.id, ...d.data() } as Customer);
      });
    }

    return uniqueDocs.map((d) => {
      const callData = d.data() as ServiceCall;
      const cust = callData.customerId ? customerMap.get(callData.customerId) : undefined;
      return {
        id: d.id,
        ...callData,
        customer: cust,
        customerName: cust?.name || callData.customerName || "",
        customerPhone: cust?.phone || callData.customerPhone || "",
        customerEmail: cust?.email || callData.customerEmail || "",
        customerAddress: cust?.address || callData.customerAddress || "",
      } as ServiceCall;
    });
  } catch (err: any) {
    console.error("getServiceCalls error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getServiceCall(id: string): Promise<ServiceCall | null> {
  try {
    let callData: ServiceCall | null = null;
    const topSnap = await fetchWithTimeout(getDoc(doc(db, "service_calls", id))).catch(() => null);
    
    if (topSnap && topSnap.exists()) {
      callData = topSnap.data() as ServiceCall;
    } else {
      // Search via collectionGroup
      const cgQuery = query(collectionGroup(db, "service_calls"), where("ticketNo", "==", id));
      const cgSnap = await fetchWithTimeout(getDocs(cgQuery)).catch(() => null);
      if (cgSnap && !cgSnap.empty) {
        callData = cgSnap.docs[0].data() as ServiceCall;
      }
    }

    if (!callData) return null;

    let cust: Customer | undefined;
    if (callData.customerId) {
      const custSnap = await getDoc(doc(db, "customers", callData.customerId)).catch(() => null);
      if (custSnap && custSnap.exists()) {
        cust = { id: custSnap.id, ...custSnap.data() } as Customer;
      }
    }

    return {
      id: callData.ticketNo || id,
      ...callData,
      customer: cust,
      customerName: cust?.name || callData.customerName || "",
      customerPhone: cust?.phone || callData.customerPhone || "",
      customerEmail: cust?.email || callData.customerEmail || "",
      customerAddress: cust?.address || callData.customerAddress || "",
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
    const allCalls = await getServiceCalls();
    const cleanPhone = (customerPhone || "").replace(/\D/g, "");
    const cleanName = (customerName || "").trim().toLowerCase();

    return allCalls.filter((c) => {
      if (c.customerId && c.customerId === customerId) return true;
      if (cleanPhone) {
        const callPhone = (c.customerPhone || "").replace(/\D/g, "");
        if (callPhone && (callPhone === cleanPhone || callPhone.endsWith(cleanPhone) || cleanPhone.endsWith(callPhone))) {
          return true;
        }
      }
      if (cleanName && c.customerName && c.customerName.trim().toLowerCase() === cleanName) {
        return true;
      }
      return false;
    });
  } catch (err: any) {
    console.error("getServiceCallsForCustomer error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getServiceCallsForTechnician(
  technicianId: string,
  technicianName?: string
): Promise<ServiceCall[]> {
  try {
    const allCalls = await getServiceCalls();
    const cleanName = (technicianName || "").trim().toLowerCase();

    return allCalls.filter((c) => {
      if (c.technicianId && c.technicianId === technicianId) return true;
      if (cleanName && c.technicianName && c.technicianName.trim().toLowerCase() === cleanName) {
        return true;
      }
      return false;
    });
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

export async function getQuotations(filters?: {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  dateFilter?: "today" | "month" | "all";
}): Promise<Quotation[]> {
  try {
    const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"));
    const snap = await fetchWithTimeout(getDocs(q));
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quotation);

    if (filters?.customerId) {
      items = items.filter((q) => q.customerId === filters.customerId);
    }

    if (filters?.dateFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      items = items.filter((q) => (q.date || "").startsWith(todayStr));
    } else if (filters?.dateFilter === "month") {
      const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
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

export async function getQuotationsForCustomer(
  customerId: string,
  customerPhone?: string,
  customerName?: string
): Promise<Quotation[]> {
  try {
    const allQuotes = await getQuotations();
    const cleanPhone = (customerPhone || "").replace(/\D/g, "");
    const cleanName = (customerName || "").trim().toLowerCase();

    return allQuotes.filter((q) => {
      if (q.customerId && q.customerId === customerId) return true;
      if (cleanPhone) {
        const quotePhone = (q.customerPhone || "").replace(/\D/g, "");
        if (quotePhone && (quotePhone === cleanPhone || quotePhone.endsWith(cleanPhone) || cleanPhone.endsWith(quotePhone))) {
          return true;
        }
      }
      if (cleanName && q.customerName && q.customerName.trim().toLowerCase() === cleanName) {
        return true;
      }
      return false;
    });
  } catch (err: any) {
    console.error("getQuotationsForCustomer error:", err);
    throw new Error(formatFirebaseError(err));
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
  } catch (err) {
    console.error("updateQuotation error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteQuotation(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "quotations", id));
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
  } catch (err: any) {
    console.error("updateInquiryStatus error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteInquiry(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "inquiries", id));
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
  } catch (err) {
    console.error("updateJobApplicationStatus error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteJobApplication(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "job_applications", id));
  } catch (err) {
    console.error("deleteJobApplication error:", err);
    throw new Error(formatFirebaseError(err));
  }
}


