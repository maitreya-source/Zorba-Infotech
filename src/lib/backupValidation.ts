import { z } from "zod";
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { FullDatabaseBackup } from "./backup";

// ─── Zod Schemas for Strict Data Integrity Validation ────────────────────────

export const CategoryValidationSchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Category name is required"),
  order: z.number().optional().default(0),
  iconName: z.string().optional().default("Folder"),
  color: z.string().optional().default("from-blue-500/10 to-blue-600/5"),
  description: z.string().optional(),
});

export const ProductValidationSchema = z.object({
  id: z.string().min(1, "Product ID (Model Number) is required"),
  name: z.string().min(1, "Product name is required"),
  model: z.string().min(1, "Model number is required"),
  brand: z.string().optional().default(""),
  categoryId: z.string().optional().default(""),
  price: z.number().nullable().optional(),
  inStock: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  customFields: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
});

export const CustomerValidationSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(6, "Valid phone number is required"),
  additionalPhones: z.array(z.string()).optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
});

export const TeamMemberValidationSchema = z.object({
  id: z.string().min(1, "Team Member ID is required"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["backoffice", "technician", "manager"]),
  phone: z.string().min(6, "Phone number is required"),
  email: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const ServiceCenterValidationSchema = z.object({
  id: z.string().min(1, "Service Center ID is required"),
  name: z.string().min(1, "Service Center name is required"),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  addresses: z.array(z.object({ id: z.string(), address: z.string(), city: z.string().optional(), isDefault: z.boolean().optional() })).optional().default([]),
  pocs: z.array(z.object({ id: z.string(), name: z.string(), phone: z.string(), designation: z.string().optional() })).optional().default([]),
});

export const CourierValidationSchema = z.object({
  id: z.string().min(1, "Courier ID is required"),
  name: z.string().min(1, "Courier name is required"),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const ServiceCallValidationSchema = z.object({
  id: z.string().min(1, "Ticket ID is required"),
  ticketNo: z.string().min(1, "Ticket number is required"),
  type: z.enum(["company_service_center", "in_house_repair", "onsite_visit"]),
  dateTime: z.string().min(1, "Date/time is required"),
  customerId: z.string().min(1, "Customer ID reference is required"),
  deviceCategory: z.string().min(1, "Device category is required"),
  modelNumber: z.string().optional(),
  issueDescription: z.string().min(1, "Issue description is required"),
  status: z.enum([
    "received",
    "in_progress",
    "sent_to_service_center",
    "waiting_for_parts",
    "completed",
    "delivered",
    "cancelled",
  ]),
  warrantyStatus: z.enum(["in_warranty", "out_of_warranty", "not_applicable"]).optional().default("out_of_warranty"),
  parts: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number(), unitPrice: z.number(), totalPrice: z.number() })).optional().default([]),
  timeline: z.array(z.object({ id: z.string(), timestamp: z.number(), stage: z.string(), title: z.string(), status: z.string() })).optional().default([]),
});

// ─── Validation Result Interface ─────────────────────────────────────────────

export interface CollectionValidationReport {
  total: number;
  valid: number;
  invalid: number;
  errors: Array<{ id: string; row: number; error: string }>;
}

export interface PreFlightValidationReport {
  isValid: boolean;
  totalRecordsChecked: number;
  validCount: number;
  invalidCount: number;
  breakdown: Record<string, CollectionValidationReport>;
  allErrors: Array<{ collection: string; id: string; error: string }>;
}

// ─── Pre-Flight Validator Runner ─────────────────────────────────────────────

export function validateBackupPayload(backup: FullDatabaseBackup): PreFlightValidationReport {
  const breakdown: Record<string, CollectionValidationReport> = {};
  const allErrors: Array<{ collection: string; id: string; error: string }> = [];

  const validateCollection = <T>(
    items: T[] | undefined,
    colName: string,
    schema: z.ZodType<any>
  ) => {
    const list = items || [];
    let valid = 0;
    let invalid = 0;
    const errors: Array<{ id: string; row: number; error: string }> = [];

    list.forEach((item: any, idx) => {
      const parseResult = schema.safeParse(item);
      if (parseResult.success) {
        valid++;
      } else {
        invalid++;
        const issues = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
        const docId = item?.id || item?.ticketNo || `row-${idx + 1}`;
        const errObj = { id: docId, row: idx + 1, error: issues };
        errors.push(errObj);
        allErrors.push({ collection: colName, id: docId, error: issues });
      }
    });

    breakdown[colName] = {
      total: list.length,
      valid,
      invalid,
      errors,
    };
  };

  const data = backup.data || ({} as any);

  validateCollection(data.categories, "categories", CategoryValidationSchema);
  validateCollection(data.products, "products", ProductValidationSchema);
  validateCollection(data.customers, "customers", CustomerValidationSchema);
  validateCollection(data.team_members, "team_members", TeamMemberValidationSchema);
  validateCollection(data.service_centers, "service_centers", ServiceCenterValidationSchema);
  validateCollection(data.couriers, "couriers", CourierValidationSchema);
  validateCollection(data.service_calls, "service_calls", ServiceCallValidationSchema);

  // Validate hierarchical subcollection calls if present
  if (data.hierarchicalServiceCalls && data.hierarchicalServiceCalls.length > 0) {
    const subList = data.hierarchicalServiceCalls.map((h: any) => ({
      id: h.id,
      fyId: h.fyId,
      monthKey: h.monthKey,
      ...(h.data || {}),
    }));
    validateCollection(subList, "hierarchical_service_calls", ServiceCallValidationSchema);
  }

  const totalRecordsChecked = Object.values(breakdown).reduce((acc, curr) => acc + curr.total, 0);
  const validCount = Object.values(breakdown).reduce((acc, curr) => acc + curr.valid, 0);
  const invalidCount = Object.values(breakdown).reduce((acc, curr) => acc + curr.invalid, 0);

  return {
    isValid: invalidCount === 0,
    totalRecordsChecked,
    validCount,
    invalidCount,
    breakdown,
    allErrors,
  };
}
