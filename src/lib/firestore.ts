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
  const formattedName = toTitleCase(data.name);
  const formattedPhone = formatIndianPhoneNumber(data.phone);
  const formattedCompany = data.companyName ? toTitleCase(data.companyName) : undefined;
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
    additionalPhones: data.additionalPhones?.map(formatIndianPhoneNumber),
    companyName: formattedCompany,
    searchTokens,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newCust));
  return newCust;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  const formattedName = data.name ? toTitleCase(data.name) : undefined;
  const formattedPhone = data.phone ? formatIndianPhoneNumber(data.phone) : undefined;
  const formattedCompany = data.companyName ? toTitleCase(data.companyName) : undefined;
  const searchTokens = generateSearchTokens({
    name: formattedName,
    phone: formattedPhone,
    companyName: formattedCompany,
    email: data.email,
    id,
  });

  const formattedData: Partial<Customer> = {
    ...data,
    ...(formattedName ? { name: formattedName } : {}),
    ...(formattedPhone ? { phone: formattedPhone } : {}),
    ...(data.additionalPhones ? { additionalPhones: data.additionalPhones.map(formatIndianPhoneNumber) } : {}),
    ...(formattedCompany ? { companyName: formattedCompany } : {}),
    searchTokens,
  };
  await setDoc(doc(db, "customers", id), cleanFirestoreData(formattedData), { merge: true });
}

export async function searchCustomers(queryText: string, limitCount = 30): Promise<Customer[]> {
  const clean = queryText.trim().toLowerCase();
  try {
    const all = await getCustomers();
    if (!clean) return all.slice(0, limitCount);
    
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
    const [callsSnap, customersSnap] = await Promise.all([
      fetchWithTimeout(getDocs(collection(db, "service_calls"))),
      fetchWithTimeout(getDocs(collection(db, "customers"))).catch(() => null),
    ]);

    const customerMap = new Map<string, Customer>();
    if (customersSnap) {
      customersSnap.docs.forEach((d) => {
        customerMap.set(d.id, { id: d.id, ...d.data() } as Customer);
      });
    }

    return callsSnap.docs.map((d) => {
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
    const snap = await fetchWithTimeout(getDoc(doc(db, "service_calls", id)));
    if (!snap.exists()) return null;
    const callData = snap.data() as ServiceCall;
    let cust: Customer | undefined;
    if (callData.customerId) {
      const custSnap = await getDoc(doc(db, "customers", callData.customerId)).catch(() => null);
      if (custSnap && custSnap.exists()) {
        cust = { id: custSnap.id, ...custSnap.data() } as Customer;
      }
    }
    return {
      id: snap.id,
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

export async function createServiceCall(
  data: Omit<ServiceCall, "id" | "ticketNo" | "createdAt" | "updatedAt"> & { ticketNo?: string }
): Promise<ServiceCall> {
  // Ensure customer document exists and get canonical customerId
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
    // Keep customer record updated if modified
    await updateCustomer(customerId, {
      ...(data.customerName ? { name: data.customerName } : {}),
      ...(data.customerPhone ? { phone: data.customerPhone } : {}),
      ...(data.customerEmail ? { email: data.customerEmail } : {}),
      ...(data.customerAddress ? { address: data.customerAddress } : {}),
    }).catch(() => {});
  }

  let ticketNo = (data.ticketNo || "").trim();

  if (!ticketNo) {
    let existingCalls: ServiceCall[] = [];
    try {
      existingCalls = await getServiceCalls();
    } catch {
      existingCalls = [];
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `SC-${currentYear}-${currentMonth}-`;

    const numbers = existingCalls
      .map((c) => {
        const str = (c.ticketNo || c.id || "").trim();
        const match = str.match(new RegExp(`^SC-${currentYear}-${currentMonth}-(\\d+)`));
        if (match) return parseInt(match[1], 10);
        return 0;
      })
      .filter((n) => !isNaN(n) && n > 0);

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    ticketNo = `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  const docRef = doc(db, "service_calls", ticketNo);
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

  // Exclude embedded customer details from the service_calls firestore document
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
    ...cleanCallData,
    customerId: customerId || "cust-unknown",
    timeline: data.timeline && data.timeline.length > 0 ? data.timeline : initialTimeline,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, cleanFirestoreData(newCallDoc));

  // Save initial timeline in subcollection as well
  try {
    const subcolRef = doc(collection(db, "service_calls", ticketNo, "timeline"), `evt-${now}`);
    await setDoc(subcolRef, cleanFirestoreData(initialTimeline[0]));
  } catch (err) {
    console.warn("Could not write subcollection timeline event:", err);
  }

  // Also auto-save model to catalog if entered
  if (data.deviceCategory && data.modelNumber && data.modelNumber.trim()) {
    saveDeviceModel(data.deviceCategory, data.modelNumber.trim()).catch(() => {});
  }

  // Also auto-save spare parts to catalog if entered
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
  // If customer info is modified and customerId is present, update the customer document
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

  // Exclude embedded customer fields from service_calls doc payload
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
    updatedAt: Date.now(),
  };
  await updateDoc(doc(db, "service_calls", id), cleanFirestoreData(formattedData));

  // Auto-save model to catalog
  if (data.deviceCategory && data.modelNumber && data.modelNumber.trim()) {
    saveDeviceModel(data.deviceCategory, data.modelNumber.trim()).catch(() => {});
  }

  // Auto-save spare parts to catalog
  if (data.parts && data.parts.length > 0) {
    for (const part of data.parts) {
      if (part.name && part.name.trim()) {
        saveSparePartToCatalog(part.name.trim(), part.unitPrice || 0, data.deviceCategory).catch(() => {});
      }
    }
  }
}

export async function deleteServiceCall(id: string): Promise<void> {
  await deleteDoc(doc(db, "service_calls", id));
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

// ─── Spare Parts Catalog ─────────────────────────────────────────────────────

export async function getSparePartsCatalog(): Promise<SparePartCatalogItem[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "spare_parts_catalog")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SparePartCatalogItem);
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
  if (found) {
    if (unitPrice > 0 && found.unitPrice !== unitPrice) {
      await updateDoc(doc(db, "spare_parts_catalog", found.id), { unitPrice });
      return { ...found, unitPrice };
    }
    return found;
  }

  const docRef = doc(collection(db, "spare_parts_catalog"));
  const newItem: SparePartCatalogItem = {
    id: docRef.id,
    name: cleanName,
    unitPrice: Number(unitPrice) || 0,
    category,
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newItem));
  return newItem;
}

// ─── Staff Members (Mandatory Handled By assignment) ──────────────────────────

const DEFAULT_STAFF: Omit<StaffMember, "id" | "createdAt">[] = [
  { name: "Maitreya Mulchandani", role: "Manager / Backoffice Operations", active: true },
  { name: "Manish Mulchandani", role: "Director / Senior Staff", active: true },
  { name: "Frontdesk Staff", role: "Service Coordinator", active: true },
  { name: "Backoffice Staff", role: "Dispatch & Logistics", active: true },
];

export async function getStaffMembers(): Promise<StaffMember[]> {
  try {
    const snap = await fetchWithTimeout(getDocs(collection(db, "staff_members")));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffMember);
    if (items.length === 0) {
      for (const s of DEFAULT_STAFF) {
        await createStaffMember(s).catch(() => {});
      }
      const res = await getDocs(collection(db, "staff_members"));
      const seeded = res.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffMember);
      if (seeded.length > 0) return seeded;
    } else {
      return items;
    }
  } catch (err: any) {
    console.warn("getStaffMembers warning, using fallbacks:", err);
  }
  return DEFAULT_STAFF.map((s, i) => ({
    id: `default-staff-${i}`,
    ...s,
    createdAt: Date.now(),
  }));
}

export async function createStaffMember(
  data: Omit<StaffMember, "id" | "createdAt">
): Promise<StaffMember> {
  const docRef = doc(collection(db, "staff_members"));
  const newStaff: StaffMember = {
    id: docRef.id,
    ...data,
    name: toTitleCase(data.name),
    createdAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newStaff));
  return newStaff;
}

export async function updateStaffMember(
  id: string,
  data: Partial<StaffMember>
): Promise<void> {
  const formattedData: Partial<StaffMember> = {
    ...data,
    ...(data.name ? { name: toTitleCase(data.name) } : {}),
  };
  await setDoc(doc(db, "staff_members", id), cleanFirestoreData(formattedData), { merge: true });
}

export async function deleteStaffMember(id: string): Promise<void> {
  await deleteDoc(doc(db, "staff_members", id));
}

// ─── Timeline Events Subcollection ───────────────────────────────────────────

export async function addTimelineEvent(
  ticketId: string,
  eventData: Omit<TimelineEvent, "id" | "timestamp">
): Promise<TimelineEvent> {
  const cleanTicket = ticketId.trim();
  const now = Date.now();
  const newEvent: TimelineEvent = {
    id: `evt-${now}`,
    timestamp: now,
    ...eventData,
  };

  try {
    const subcolDocRef = doc(collection(db, "service_calls", cleanTicket, "timeline"), newEvent.id);
    await setDoc(subcolDocRef, cleanFirestoreData(newEvent));
  } catch (err) {
    console.warn("Failed to write subcollection event:", err);
  }

  // Update parent service call timeline & status
  try {
    const parentDoc = await getDoc(doc(db, "service_calls", cleanTicket));
    if (parentDoc.exists()) {
      const existingTimeline: TimelineEvent[] = parentDoc.data()?.timeline || [];
      await updateDoc(doc(db, "service_calls", cleanTicket), {
        timeline: [...existingTimeline, newEvent],
        status: eventData.status,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn("Failed to update parent document timeline:", err);
  }

  return newEvent;
}

export async function getTimelineEvents(ticketId: string): Promise<TimelineEvent[]> {
  try {
    const subcolRef = collection(db, "service_calls", ticketId, "timeline");
    const snap = await fetchWithTimeout(getDocs(query(subcolRef, orderBy("timestamp", "asc"))));
    if (snap.docs.length > 0) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TimelineEvent);
    }
    const parent = await getDoc(doc(db, "service_calls", ticketId));
    if (parent.exists() && parent.data()?.timeline) {
      return parent.data().timeline as TimelineEvent[];
    }
    return [];
  } catch (err: any) {
    console.error("getTimelineEvents error:", err);
    return [];
  }
}
