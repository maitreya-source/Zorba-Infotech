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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { toTitleCase, formatIndianPhoneNumber, generateSearchTokens } from "./utils";
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
  TeamRole,
  FinancialYearDoc,
  FYMonthDoc,
} from "./types";

const FIREBASE_TIMEOUT_MS = 10000;

export function formatFirebaseError(err: any): string {
  if (!err) return "Unknown Firebase error.";
  const msg = err?.message || String(err);
  const code = err?.code || "";

  if (code.includes("permission-denied") || msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
    return "Firestore Permission Denied: You do not have sufficient permissions to perform this operation. Please verify your admin account credentials.";
  }
  if (code.includes("unavailable") || msg.includes("unavailable") || msg.includes("Failed to get document because the client is offline")) {
    return "Firestore Unavailable: Check internet connection or Firebase service status.";
  }
  if (msg.includes("Operation timed out")) {
    return "Firestore Request Timed Out (10s): Slow network or unreachable Firebase backend.";
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
    // Preserve Firestore FieldValue and Timestamp instances
    if (typeof (data as any).toMillis === "function" || (data as any)._methodName) {
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

export async function getProducts(): Promise<Product[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "products")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  } catch (err: any) {
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

export async function createProduct(
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  const modelNo = (data.model || "").trim();
  if (!modelNo) {
    throw new Error("Model number is required to create a product.");
  }
  const cleanDocId = modelNo.replace(/[/\\#?%]/g, "-").toUpperCase();
  const docRef = doc(db, "products", cleanDocId);
  
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error(`A product with Model Number "${modelNo}" already exists.`);
  }

  const productData: Product = {
    id: cleanDocId,
    ...data,
    model: cleanDocId,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(docRef, cleanFirestoreData(productData));

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
    await updateDoc(
      doc(db, "products", id),
      cleanFirestoreData({
        ...data,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (err: any) {
    console.error("updateProduct error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "products", id));
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

export async function getCustomers(): Promise<Customer[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "customers")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
  } catch (err: any) {
    console.error("getCustomers error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function createCustomer(data: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  const docRef = doc(collection(db, "customers"));
  const formattedName = toTitleCase(data.name);
  const formattedPhone = formatIndianPhoneNumber(data.phone);
  const formattedCompany = data.companyName ? toTitleCase(data.companyName) : undefined;
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
    searchTokens,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCust));
  return newCust;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  const existingSnap = await getDoc(doc(db, "customers", id)).catch(() => null);
  const existing = existingSnap?.exists() ? (existingSnap.data() as Customer) : null;

  const formattedName = data.name ? toTitleCase(data.name) : existing?.name;
  const formattedPhone = data.phone ? formatIndianPhoneNumber(data.phone) : existing?.phone;
  const formattedCompany = data.companyName !== undefined ? (data.companyName ? toTitleCase(data.companyName) : undefined) : existing?.companyName;
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
    searchTokens,
  };
  await setDoc(doc(db, "customers", id), cleanFirestoreData(formattedData), { merge: true });
}

export async function searchCustomers(queryText: string, limitCount = 30): Promise<Customer[]> {
  const clean = queryText.trim().toLowerCase();
  try {
    if (!clean) {
      const q = query(collection(db, "customers"), orderBy("createdAt", "desc"), limit(limitCount));
      const snap = await fetchWithTimeout(getDocs(q));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
    }

    // Try tokenized Firestore query first
    try {
      const q = query(
        collection(db, "customers"),
        where("searchTokens", "array-contains", clean),
        limit(limitCount)
      );
      const snap = await fetchWithTimeout(getDocs(q));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
      }
    } catch {
      // Fallback to in-memory filter if tokens are missing/unindexed
    }

    const all = await getCustomers();
    const qDigits = clean.replace(/\D/g, "");
    return all
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(clean);
        const phoneDigits = (c.phone || "").replace(/\D/g, "");
        const phoneMatch = qDigits && (phoneDigits.includes(qDigits) || phoneDigits.endsWith(qDigits));
        const companyMatch = c.companyName?.toLowerCase().includes(clean);
        const emailMatch = c.email?.toLowerCase().includes(clean);
        const idMatch = c.id?.toLowerCase().includes(clean);
        return nameMatch || phoneMatch || companyMatch || emailMatch || idMatch;
      })
      .slice(0, limitCount);
  } catch (err: any) {
    console.error("searchCustomers error:", err);
    return [];
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, "customers", id));
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
  const payload: Partial<TeamMember> = {
    ...data,
    ...(data.name ? { name: toTitleCase(data.name) } : {}),
    ...(data.phone ? { phone: formatIndianPhoneNumber(data.phone) } : {}),
  };
  await setDoc(doc(db, "team_members", id), cleanFirestoreData(payload), { merge: true });
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

  const newCallDoc = {
    id: ticketNo,
    ticketNo,
    fyId,
    monthKey,
    ...cleanCallData,
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

  // Auto-save model and spare parts to catalog
  if (data.deviceCategory && data.modelNumber && data.modelNumber.trim()) {
    saveDeviceModel(data.deviceCategory, data.modelNumber.trim()).catch(() => {});
  }
  if (data.parts && data.parts.length > 0) {
    for (const part of data.parts) {
      if (part.name && part.name.trim()) {
        saveSparePartToCatalog(part.name.trim(), part.unitPrice || 0, data.deviceCategory).catch(() => {});
      }
    }
  }

  return {
    ...newCallDoc,
    customerName: data.customerName || "",
    customerPhone: data.customerPhone || "",
    customerEmail: data.customerEmail || "",
    customerAddress: data.customerAddress || "",
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

  const formattedData: Partial<ServiceCall> = {
    ...cleanUpdateData,
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
    saveDeviceModel(data.deviceCategory, data.modelNumber.trim()).catch(() => {});
  }
  if (data.parts && data.parts.length > 0) {
    for (const part of data.parts) {
      if (part.name && part.name.trim()) {
        saveSparePartToCatalog(part.name.trim(), part.unitPrice || 0, data.deviceCategory).catch(() => {});
      }
    }
  }
}

export async function deleteServiceCall(id: string): Promise<void> {
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
    console.error("deleteServiceCall error:", err);
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
  const cleanCat = categoryName.trim();
  const cleanModel = modelName.trim();
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
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Part name required");

  const existing = await getSparePartsCatalog();
  const found = existing.find((p) => p.name.toLowerCase() === cleanName.toLowerCase());
  if (found) return found;

  const docRef = doc(collection(db, "spare_parts"));
  const newPart: SparePartCatalogItem = {
    id: docRef.id,
    name: cleanName,
    unitPrice,
    category,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newPart));
  return newPart;
}
