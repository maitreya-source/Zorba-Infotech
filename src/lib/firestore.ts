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
import type { Category, Product } from "./types";

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
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

export async function seedDefaultCategories(): Promise<void> {
  const existing = await getDocs(collection(db, "categories"));
  if (!existing.empty) return;
  for (const cat of DEFAULT_CATEGORIES) {
    await createCategory(cat);
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
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

// ─── Admin check ──────────────────────────────────────────────────────────────

export async function checkIsAdmin(email: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", email));
  return snap.exists();
}
