import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  Category,
  Product,
  DeviceCategory,
  Customer,
  ServiceCall,
  ServiceCenter,
  Technician,
} from "./types";

const FIREBASE_TIMEOUT_MS = 10000;

export function formatFirebaseError(err: any): string {
  if (!err) return "Unknown Firebase error.";
  const msg = err?.message || String(err);
  const code = err?.code || "";

  if (code.includes("permission-denied") || msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
    return "Firestore Permission Denied: Update Firestore Security Rules in Firebase Console (e.g. allow read, write: if request.auth != null; or allow read, write: if true;).";
  }
  if (code.includes("not-found") || msg.includes("not-found") || msg.includes("does not exist")) {
    return "Firestore Database Not Found: Go to Firebase Console -> Firestore Database and click 'Create database'.";
  }
  if (code.includes("unavailable") || msg.includes("unavailable") || msg.includes("Could not reach Cloud Firestore backend")) {
    return "Firebase Connection Unavailable: Could not reach Cloud Firestore backend. Please check your internet connection or firewall.";
  }
  return msg;
}

export function cleanFirestoreData<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanFirestoreData) as unknown as T;
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned;
}

async function fetchWithTimeout<T>(
  promise: Promise<T>,
  customErrorMsg = "Unable to connect to Firebase. Please check your network connection or Firebase configuration."
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(customErrorMsg)), FIREBASE_TIMEOUT_MS)
    ),
  ]);
}

// ─── Categories ───────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: Omit<Category, "id" | "createdAt">[] = [
  { name: "Laptops, Desktops & Printers", iconName: "Monitor", color: "from-blue-500/10 to-blue-600/5", order: 1 },
  { name: "Accessories & Peripherals", iconName: "Keyboard", color: "from-purple-500/10 to-purple-600/5", order: 2 },
  { name: "Components", iconName: "Cpu", color: "from-red-500/10 to-red-600/5", order: 3 },
  { name: "Consumables & Billing Supplies", iconName: "Printer", color: "from-amber-500/10 to-amber-600/5", order: 4 },
  { name: "CCTV & Security Systems", iconName: "Camera", color: "from-emerald-500/10 to-emerald-600/5", order: 5 },
  { name: "Biometrics & Attendance", iconName: "Fingerprint", color: "from-cyan-500/10 to-cyan-600/5", order: 6 },
  { name: "School & Institutional Solutions", iconName: "School", color: "from-indigo-500/10 to-indigo-600/5", order: 7 },
  { name: "Networking & Fiber Optics", iconName: "Wifi", color: "from-teal-500/10 to-teal-600/5", order: 8 },
  { name: "Spare Parts", iconName: "Wrench", color: "from-orange-500/10 to-orange-600/5", order: 9 },
  { name: "Mounts & Stands", iconName: "Tv", color: "from-slate-500/10 to-slate-600/5", order: 10 },
  { name: "Software Solutions", iconName: "Shield", color: "from-green-500/10 to-green-600/5", order: 11 },
];

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
  const docRef = doc(collection(db, "categories"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
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

export async function seedDefaultCategories(): Promise<void> {
  try {
    const existing = await getDocs(collection(db, "categories"));
    if (!existing.empty) return;
    for (const cat of DEFAULT_CATEGORIES) {
      await createCategory(cat);
    }
  } catch (err) {
    console.warn("Could not seed categories:", err);
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

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
): Promise<string> {
  const docRef = doc(collection(db, "products"));
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "products", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export async function uploadProductPhoto(
  file: File,
  productId: string
): Promise<string> {
  const storageRef = ref(storage, `products/${productId}/photo`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteProductPhoto(productId: string): Promise<void> {
  try {
    await deleteObject(ref(storage, `products/${productId}/photo`));
  } catch {
    // ignore — file may not exist
  }
}

export async function checkIsAdmin(email: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "admins", email));
    return snap.exists();
  } catch {
    return false;
  }
}

// ─── Device Categories ────────────────────────────────────────────────────────

const DEFAULT_DEVICE_CATEGORIES = [
  { name: "Printer", description: "Inkjet, Laser, Thermal & Multifunction Printers" },
  { name: "Toner / Cartridge", description: "Toner refill, Drum replacement & Cartridges" },
  { name: "Laptop", description: "Laptops, MacBooks & Notebooks" },
  { name: "Desktop & PC", description: "Desktops, CPU Towers, All-in-One PCs" },
  { name: "CCTV & Security", description: "DVR, NVR, Cameras & Surveillance" },
  { name: "Router & Networking", description: "Routers, Switches, Access Points, Fiber ONTs" },
  { name: "UPS & Inverter", description: "UPS Units, Batteries & Power Supplies" },
  { name: "Scanner & Billing", description: "Barcode Scanners, Receipt Printers, POS Terminals" },
  { name: "Biometric & Attendance", description: "Fingerprint & Face Recognition Devices" },
  { name: "Monitor & Display", description: "LCD/LED Monitors, Touch Screens & Interactive Panels" },
];

export async function seedDefaultDeviceCategories(): Promise<void> {
  try {
    const existing = await getDocs(collection(db, "device_categories"));
    if (!existing.empty) return;
    for (const cat of DEFAULT_DEVICE_CATEGORIES) {
      await createDeviceCategory(cat.name, cat.description);
    }
  } catch (err) {
    console.warn("Could not seed device categories:", err);
  }
}

export async function getDeviceCategories(): Promise<DeviceCategory[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "device_categories")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeviceCategory);
    if (items.length === 0) {
      await seedDefaultDeviceCategories();
      const res = await getDocs(collection(db, "device_categories"));
      const seeded = res.docs.map((d) => ({ id: d.id, ...d.data() }) as DeviceCategory);
      if (seeded.length > 0) return seeded;
    } else {
      return items;
    }
  } catch (err: any) {
    console.warn("getDeviceCategories warning, using fallbacks:", err);
  }
  return DEFAULT_DEVICE_CATEGORIES.map((c, i) => ({
    id: `default-cat-${i}`,
    name: c.name,
    description: c.description,
    createdAt: Date.now(),
  }));
}

export async function createDeviceCategory(
  name: string,
  description?: string
): Promise<DeviceCategory> {
  const docRef = doc(collection(db, "device_categories"));
  const newCat: DeviceCategory = {
    id: docRef.id,
    name,
    description: description || "",
    createdAt: Date.now(),
  };
  await setDoc(docRef, newCat);
  return newCat;
}

export async function deleteDeviceCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "device_categories", id));
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
  const newCust: Customer = {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCust));
  return newCust;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  await setDoc(doc(db, "customers", id), cleanFirestoreData(data), { merge: true });
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

// ─── Technicians / Assignees ──────────────────────────────────────────────────

const DEFAULT_TECHNICIANS: Omit<Technician, "id" | "createdAt">[] = [
  { name: "Technician 1", phone: "+91 98230 11111", specialization: "Printer & Toner Refill Specialist", active: true },
  { name: "Technician 2", phone: "+91 98230 22222", specialization: "Laptop & Chip Level Repair", active: true },
  { name: "Technician 3", phone: "+91 98230 33333", specialization: "CCTV, Biometrics & Networking", active: true },
];

export async function getTechnicians(): Promise<Technician[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "technicians")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Technician);
    if (items.length === 0) {
      for (const tech of DEFAULT_TECHNICIANS) {
        await createTechnician(tech).catch(() => {});
      }
      const res = await getDocs(collection(db, "technicians"));
      const seeded = res.docs.map((d) => ({ id: d.id, ...d.data() }) as Technician);
      if (seeded.length > 0) return seeded;
    } else {
      return items;
    }
  } catch (err: any) {
    console.warn("getTechnicians warning, using fallbacks:", err);
  }
  return DEFAULT_TECHNICIANS.map((tech, i) => ({
    id: `default-tech-${i}`,
    ...tech,
    createdAt: Date.now(),
  }));
}

export async function createTechnician(
  data: Omit<Technician, "id" | "createdAt">
): Promise<Technician> {
  const docRef = doc(collection(db, "technicians"));
  const newTech: Technician = {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
  };
  try {
    await setDoc(docRef, cleanFirestoreData(newTech));
    return newTech;
  } catch (err: any) {
    console.error("createTechnician error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function updateTechnician(
  id: string,
  data: Partial<Technician>
): Promise<void> {
  try {
    await setDoc(doc(db, "technicians", id), cleanFirestoreData(data), { merge: true });
  } catch (err: any) {
    console.error("updateTechnician error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function deleteTechnician(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "technicians", id));
  } catch (err: any) {
    console.error("deleteTechnician error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

// ─── Service Calls ────────────────────────────────────────────────────────────

export async function getServiceCalls(): Promise<ServiceCall[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "service_calls")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceCall);
  } catch (err: any) {
    console.error("getServiceCalls error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function getServiceCall(id: string): Promise<ServiceCall | null> {
  try {
    const snap = await fetchWithTimeout(getDoc(doc(db, "service_calls", id)));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ServiceCall;
  } catch (err: any) {
    console.error("getServiceCall error:", err);
    throw new Error(formatFirebaseError(err));
  }
}

export async function createServiceCall(
  data: Omit<ServiceCall, "id" | "ticketNo" | "createdAt" | "updatedAt">
): Promise<ServiceCall> {
  let existingCalls: ServiceCall[] = [];
  try {
    existingCalls = await getServiceCalls();
  } catch {
    existingCalls = [];
  }
  const nextNum = existingCalls.length + 1;
  const ticketNo = `SC-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
  const docRef = doc(collection(db, "service_calls"));
  const newCall: ServiceCall = {
    id: docRef.id,
    ticketNo,
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCall));
  return newCall;
}

export async function updateServiceCall(
  id: string,
  data: Partial<ServiceCall>
): Promise<void> {
  await updateDoc(doc(db, "service_calls", id), cleanFirestoreData({
    ...data,
    updatedAt: Date.now(),
  }));
}

export async function deleteServiceCall(id: string): Promise<void> {
  await deleteDoc(doc(db, "service_calls", id));
}
