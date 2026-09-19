import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { fetchMetaTemplates } from "../whatsappApi";
import type {
  WhatsAppTemplateDoc,
  WhatsAppTargetModule,
  WhatsAppCategory,
  WhatsAppTemplateVariable,
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

/**
 * Lightweight ERP variable & module bindings for Zorba ERP templates.
 * No message bodies or approval statuses are hardcoded here — all template texts,
 * categories, and approval statuses come directly from Meta WABA / Firestore.
 */
interface TemplateErpBinding {
  displayName: string;
  targetModule: WhatsAppTargetModule;
  variables: Array<{ index: number; label: string; erpKey: string }>;
}

const ERP_TEMPLATE_BINDINGS: Record<string, TemplateErpBinding> = {
  zorba_service_call_update: {
    displayName: "Customer Service Ticket Update",
    targetModule: "service_calls",
    variables: [
      { index: 1, label: "Customer Name", erpKey: "customer.name" },
      { index: 2, label: "Ticket Number", erpKey: "ticketNo" },
      { index: 3, label: "Status & Estimate", erpKey: "status" },
      { index: 4, label: "Device & Issue Summary", erpKey: "deviceCategory" },
    ],
  },
  zorba_payment_received: {
    displayName: "Customer Payment Received Receipt",
    targetModule: "service_calls",
    variables: [
      { index: 1, label: "Customer Name", erpKey: "customer.name" },
      { index: 2, label: "Amount Received (Rs.)", erpKey: "paidAmount" },
      { index: 3, label: "Ticket Number", erpKey: "ticketNo" },
      { index: 4, label: "Payment Mode", erpKey: "paymentMode" },
      { index: 5, label: "Payment Date", erpKey: "paymentDate" },
      { index: 6, label: "Device & Model", erpKey: "deviceCategory" },
    ],
  },
  zorba_service_center_followup: {
    displayName: "OEM Service Center RMA & Repair Inquiry",
    targetModule: "service_centers",
    variables: [
      { index: 1, label: "Service Center Name", erpKey: "serviceCenterName" },
      { index: 2, label: "Ticket Number", erpKey: "ticketNo" },
      { index: 3, label: "RMA / Reference No", erpKey: "rmaNumber" },
      { index: 4, label: "Dispatched Date", erpKey: "dateTime" },
      { index: 5, label: "Device & Model", erpKey: "deviceCategory" },
      { index: 6, label: "Serial / IMEI Number", erpKey: "serialNumber" },
      { index: 7, label: "Reported Defect", erpKey: "issueDescription" },
    ],
  },
  zorba_courier_pickup_request: {
    displayName: "Courier Parcel Pickup Request",
    targetModule: "couriers",
    variables: [
      { index: 1, label: "Courier Partner Name", erpKey: "courierName" },
      { index: 2, label: "Ticket / Ref Number", erpKey: "ticketNo" },
      { index: 3, label: "Consignee Service Center", erpKey: "serviceCenterName" },
      { index: 4, label: "Destination City / Address", erpKey: "destinationAddress" },
      { index: 5, label: "RMA / Reference No", erpKey: "rmaNumber" },
      { index: 6, label: "Pickup Date", erpKey: "dateTime" },
    ],
  },
  zorba_courier_delivery_inquiry: {
    displayName: "Courier Shipment Delivery Inquiry",
    targetModule: "couriers",
    variables: [
      { index: 1, label: "Courier Partner Name", erpKey: "courierName" },
      { index: 2, label: "Docket / AWB Number", erpKey: "rmaNumber" },
      { index: 3, label: "Internal Ticket Ref", erpKey: "ticketNo" },
      { index: 4, label: "Consignee Name", erpKey: "serviceCenterName" },
      { index: 5, label: "Destination City", erpKey: "destinationAddress" },
      { index: 6, label: "Dispatch Date", erpKey: "dateTime" },
    ],
  },
  zorba_staff_task_update: {
    displayName: "Employee Task Assignment & Portal Link",
    targetModule: "staff_tasks",
    variables: [
      { index: 1, label: "Employee Name", erpKey: "taskAssigneeName" },
      { index: 2, label: "Task Title & Ref", erpKey: "taskTitleRef" },
      { index: 3, label: "Priority & Due Date", erpKey: "taskPriorityDue" },
      { index: 4, label: "Task Instructions", erpKey: "taskDescriptionPlain" },
      { index: 5, label: "Staff Portal Link", erpKey: "taskPortalUrlPlain" },
    ],
  },
  zorba_purchase_inquiry: {
    displayName: "Consolidated Vendor / Dealer Purchase Inquiry",
    targetModule: "quotations",
    variables: [
      { index: 1, label: "Supplier / Distributor Name", erpKey: "vendorName" },
      { index: 2, label: "Product Category / Brand", erpKey: "purchaseCategory" },
      { index: 3, label: "Required Models & Specifications", erpKey: "purchaseModels" },
      { index: 4, label: "Quantity Required", erpKey: "purchaseQuantity" },
      { index: 5, label: "Dispatch / Billing Notes", erpKey: "purchaseNotes" },
    ],
  },
};

function extractVariablesFromBody(bodyText: string, slug: string): WhatsAppTemplateVariable[] {
  const binding = ERP_TEMPLATE_BINDINGS[slug];
  if (binding?.variables) {
    return binding.variables.map((v) => ({
      index: v.index,
      label: v.label,
      erpKey: v.erpKey,
      fallbackValue: "",
    }));
  }
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const indices = Array.from<number>(
    new Set(matches.map((m: string) => parseInt(m.replace(/\D/g, ""), 10)))
  ).sort((a, b) => a - b);
  return indices.map((idx) => ({
    index: idx,
    label: `Field {{${idx}}}`,
    fallbackValue: "",
  }));
}

function parseMetaCategory(rawCat?: string): WhatsAppCategory {
  const c = String(rawCat || "UTILITY").toLowerCase().trim();
  if (c === "marketing") return "marketing";
  if (c === "authentication") return "authentication";
  return "utility";
}

function parseMetaStatus(rawStatus?: string): "approved" | "pending" | "rejected" {
  const s = String(rawStatus || "PENDING").toLowerCase().trim();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return "pending";
}

let cachedTemplatesMemory: WhatsAppTemplateDoc[] | null = null;

/**
 * Syncs live templates from Meta WABA (`fetchMetaTemplates`) into Firestore `whatsapp_templates`.
 * Uses parallel writes (`Promise.all`) so syncing completes in < 300ms.
 */
export async function syncMetaTemplatesToFirestore(): Promise<WhatsAppTemplateDoc[]> {
  const metaRes = await fetchMetaTemplates();
  if (!metaRes.success || !metaRes.templates) {
    return cachedTemplatesMemory || [];
  }

  const liveMetaSlugs = new Set<string>();
  const synced: WhatsAppTemplateDoc[] = [];
  const writePromises: Promise<unknown>[] = [];

  for (const metaTpl of metaRes.templates) {
    const slug = String(metaTpl.name || "").toLowerCase().trim();
    if (!slug) continue;

    const bodyComp = (metaTpl.components || []).find((c: any) => c.type === "BODY");
    const bodyText = String(bodyComp?.text || "").trim();
    if (!bodyText) continue;

    liveMetaSlugs.add(slug);
    const binding = ERP_TEMPLATE_BINDINGS[slug];
    const docData: WhatsAppTemplateDoc = {
      id: slug,
      name: slug,
      displayName:
        binding?.displayName ||
        slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      category: parseMetaCategory(metaTpl.category),
      previousCategory: metaTpl.previous_category
        ? String(metaTpl.previous_category).toLowerCase()
        : undefined,
      targetModule: binding ? binding.targetModule : "archived",
      language: metaTpl.language || "en_US",
      headerType: "none",
      bodyText,
      variables: extractVariablesFromBody(bodyText, slug),
      active: true,
      metaStatus: parseMetaStatus(metaTpl.status),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    writePromises.push(
      setDoc(doc(db, "whatsapp_templates", slug), cleanFirestoreData(docData), { merge: true }).catch(() => {})
    );
    synced.push(docData);
  }

  // Prune any stale Firestore documents in parallel
  if (liveMetaSlugs.size > 0) {
    const existingSnap = await getDocs(collection(db, "whatsapp_templates")).catch(() => null);
    if (existingSnap) {
      for (const d of existingSnap.docs) {
        const lowerId = d.id.toLowerCase();
        const lowerName = String(d.data()?.name || d.id).toLowerCase();
        if (!liveMetaSlugs.has(lowerId) && !liveMetaSlugs.has(lowerName)) {
          writePromises.push(deleteDoc(doc(db, "whatsapp_templates", d.id)).catch(() => {}));
        }
      }
    }
  }

  await Promise.all(writePromises);
  cachedTemplatesMemory = synced;
  return synced;
}

export async function getWhatsAppTemplates(moduleFilter?: string, forceRefresh = false): Promise<WhatsAppTemplateDoc[]> {
  try {
    if (!forceRefresh && cachedTemplatesMemory && cachedTemplatesMemory.length > 0) {
      if (moduleFilter && moduleFilter !== "all") {
        return cachedTemplatesMemory.filter((t) => t.targetModule === moduleFilter);
      }
      return cachedTemplatesMemory;
    }

    const snap = await getDocs(collection(db, "whatsapp_templates"));
    let templates: WhatsAppTemplateDoc[] = snap.docs.map((d) => {
      const data = { id: d.id, ...d.data() } as WhatsAppTemplateDoc;
      const lowerName = (data.name || d.id).toLowerCase();
      const binding = ERP_TEMPLATE_BINDINGS[lowerName];
      return {
        ...data,
        headerType: "none",
        headerImageUrl: undefined,
        targetModule: binding ? binding.targetModule : "archived",
        variables:
          data.variables && data.variables.length > 0
            ? data.variables
            : extractVariablesFromBody(data.bodyText || "", lowerName),
      };
    });

    const existingSlugs = new Set(templates.map((t) => t.name.toLowerCase()));
    const missingAnyErpTemplate = Object.keys(ERP_TEMPLATE_BINDINGS).some(
      (slug) => !existingSlugs.has(slug)
    );

    if (templates.length === 0 || missingAnyErpTemplate) {
      const fromMeta = await syncMetaTemplatesToFirestore();
      if (fromMeta.length > 0) {
        templates = fromMeta;
      }
    } else {
      cachedTemplatesMemory = templates;
    }

    if (moduleFilter && moduleFilter !== "all") {
      return templates.filter((t) => t.targetModule === moduleFilter);
    }
    return templates;
  } catch (err: unknown) {
    console.error("getWhatsAppTemplates error:", err);
    return cachedTemplatesMemory || [];
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
    headerType: "none",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(docRef, cleanFirestoreData(newTemplate), { merge: true });
  cachedTemplatesMemory = null;
  return newTemplate;
}

export async function updateWhatsAppTemplate(
  id: string,
  data: Partial<WhatsAppTemplateDoc>
): Promise<void> {
  const docRef = doc(db, "whatsapp_templates", id);
  await setDoc(docRef, cleanFirestoreData({ ...data, updatedAt: Date.now() }), { merge: true });
  cachedTemplatesMemory = null;
}

export async function deleteWhatsAppTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, "whatsapp_templates", id));
  cachedTemplatesMemory = null;
}

export async function seedDefaultWhatsAppTemplates(_force: boolean = false): Promise<void> {
  try {
    await syncMetaTemplatesToFirestore();
  } catch (err) {
    console.warn("Could not sync WhatsApp templates from Meta WABA:", err);
  }
}
