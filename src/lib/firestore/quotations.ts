import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { publishSyncSignal } from "../realtimeSync";
import { formatIndianPhoneNumber, formatModelNumber, toTitleCase } from "../utils";
import type { Quotation, QuotationTemplate } from "../types";

function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v !== undefined) {
      cleaned[k] = cleanFirestoreData(v);
    }
  }
  return cleaned as T;
}

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
    const counterDoc = await getDoc(counterRef);
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
        // Ignore fallback scan error
      }
    }
    const next = current + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  } catch {
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
  const q = query(
    collection(db, "quotations"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
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
        const snap = await getDocs(q);
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
          const snap = await getDocs(qPhone);
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
  } catch (err) {
    console.error("getQuotationsForCustomer error:", err);
    return [];
  }
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const docRef = doc(db, "quotations", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Quotation;
}

export async function createQuotation(
  data: Omit<Quotation, "id" | "createdAt" | "quotationNo"> & { quotationNo?: string }
): Promise<Quotation> {
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
}

export async function updateQuotation(
  id: string,
  data: Partial<Quotation>
): Promise<void> {
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
}

export async function deleteQuotation(id: string): Promise<void> {
  await deleteDoc(doc(db, "quotations", id));
  publishSyncSignal("quotations", { action: "delete", resourceId: id });
}

export async function getQuotationTemplates(): Promise<QuotationTemplate[]> {
  try {
    const q = query(collection(db, "quotation_templates"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuotationTemplate);
  } catch (err) {
    console.error("getQuotationTemplates error:", err);
    return [];
  }
}

export async function createQuotationTemplate(
  data: Omit<QuotationTemplate, "id" | "createdAt">
): Promise<QuotationTemplate> {
  const docRef = doc(collection(db, "quotation_templates"));
  const newTemplate: QuotationTemplate = {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newTemplate));
  return newTemplate;
}

export async function deleteQuotationTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, "quotation_templates", id));
}
