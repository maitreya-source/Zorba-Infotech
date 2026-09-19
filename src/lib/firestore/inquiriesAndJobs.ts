import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { publishSyncSignal } from "../realtimeSync";
import { formatIndianPhoneNumber, toTitleCase } from "../utils";
import type {
  Inquiry,
  InquiryStatus,
  JobApplication,
  JobApplicationStatus,
} from "../types";

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

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inquiry));
  } catch (err) {
    console.error("getInquiries error:", err);
    try {
      const snap = await getDocs(collection(db, "inquiries"));
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
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  notes?: string,
  staffId?: string,
  staffName?: string
): Promise<void> {
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
}

export async function deleteInquiry(id: string): Promise<void> {
  await deleteDoc(doc(db, "inquiries", id));
  publishSyncSignal("inquiries", { action: "delete", resourceId: id });
}

export async function getJobApplications(): Promise<JobApplication[]> {
  try {
    const q = query(collection(db, "job_applications"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobApplication));
  } catch (err) {
    console.error("getJobApplications error:", err);
    try {
      const snap = await getDocs(collection(db, "job_applications"));
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
}

export async function updateJobApplicationStatus(
  id: string,
  status: JobApplicationStatus,
  notes?: string,
  staffId?: string,
  staffName?: string
): Promise<void> {
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
}

export async function deleteJobApplication(id: string): Promise<void> {
  await deleteDoc(doc(db, "job_applications", id));
  publishSyncSignal("job_applications", { action: "delete", resourceId: id });
}
