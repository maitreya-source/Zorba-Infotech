import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description?: string;
  order: number;
  createdAt: Timestamp;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  itemCode: string;
  warranty: string;
  serviceCenter: string;
  productUrl: string;
  price: number | null;
  description: string;
  photoUrl: string | null;
  categoryId: string;
  inStock: boolean;
  featured: boolean;
  order: number | null;
  customFields: CustomField[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ServiceCallType =
  | "company_service_center" // Company service center replacement (warranty / out of warranty)
  | "in_house_repair"        // Items repairing/working on in-house
  | "onsite_visit";          // Onsite visit for repair/installation

export type ServiceCallStatus =
  | "received"
  | "in_progress"
  | "sent_to_service_center"
  | "waiting_for_parts"
  | "completed"
  | "delivered"
  | "cancelled";

export type WarrantyStatus =
  | "in_warranty"
  | "out_of_warranty"
  | "not_applicable";

export interface ServicePart {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  additionalPhones?: string[];
  email?: string;
  address?: string;
  companyName?: string;
  notes?: string;
  createdAt: string | number;
}

export interface FinancialYearDoc {
  id: string; // e.g. "FY2526"
  label: string; // e.g. "FY 2025-26"
  startYear: number;
  endYear: number;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface FYMonthDoc {
  id: string; // e.g. "2025-08"
  monthKey: string;
  monthName: string; // e.g. "August 2025"
  monthNumber: number; // 8
  fyId: string; // "FY2526"
}

export interface DeviceCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string | number;
}

export interface DeviceModel {
  id: string;
  categoryName: string;
  modelName: string;
  createdAt: number;
}

export interface SparePartCatalogItem {
  id: string;
  name: string;
  unitPrice: number;
  category?: string;
  createdAt: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  active: boolean;
  createdAt: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  stage:
    | "intake_created"
    | "replacement_sent_service_center"
    | "replacement_received_service_center"
    | "replacement_given_customer"
    | "replacement_received_customer"
    | "status_change"
    | "comment_added";
  title: string;
  staffId: string;
  staffName: string;
  status: ServiceCallStatus;
  courierName?: string;
  courierDocketNumber?: string;
  comments?: string;
}

export interface ServiceCenterAddress {
  id: string;
  address: string;
  city?: string;
  isDefault?: boolean;
}

export interface ServiceCenterPOC {
  id: string;
  name: string;
  designation?: string;
  phone: string;
  isWhatsApp?: boolean;
}

export interface ServiceCenter {
  id: string;
  name: string;
  phone?: string;
  whatsappPhone?: string; // Default WhatsApp number for follow-up
  email?: string;
  addresses: ServiceCenterAddress[];
  defaultAddressId?: string;
  pocs?: ServiceCenterPOC[];
  active?: boolean;
  createdAt: string | number;
}

export interface Courier {
  id: string;
  name: string;
  phone?: string; // Contact phone / WhatsApp number for follow-up
  contactPerson?: string;
  trackingUrlTemplate?: string;
  active?: boolean;
  createdAt: string | number;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  email?: string;
  specialization?: string;
  active: boolean;
  createdAt: string | number;
}

export interface ServiceCall {
  id: string;
  ticketNo: string; // Service Call Number
  fyId?: string; // e.g. "FY2526"
  monthKey?: string; // e.g. "2025-08"
  type: ServiceCallType;
  dateTime: string; // ISO or YYYY-MM-DD format
  customerId: string; // Reference to Customer document
  
  // Resolved / populated customer details for UI convenience
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customer?: Customer;
  
  // Device details
  deviceCategory: string;
  modelNumber?: string;
  serialNumber?: string;
  quantity: number;
  issueDescription: string;
  warrantyStatus: WarrantyStatus;
  status: ServiceCallStatus;

  // Internal Tracking Fields (Internal Only - Excluded from WhatsApp)
  dateOfPurchase?: string;
  billNumber?: string;

  // Back-office handled staff (Mandatory for auditing)
  handledByStaffId?: string;
  handledByStaffName?: string;
  
  // Service Center details
  serviceCenterId?: string;
  serviceCenterName?: string;  
  serviceCenterAddressId?: string;
  serviceCenterAddress?: string;
  rmaNumber?: string;          // tracking / RMA / Courier number
  courierName?: string;        // Courier service name (e.g. Reliance, Trackon)
  courierCharges?: number;     // optional courier/transport charges for service center
  
  // Onsite details
  onsiteAddress?: string;

  // Technician Assignee (Technical staff)
  technicianId?: string;
  technicianName?: string;

  // Billing (supports 0 parts without errors)
  parts: ServicePart[];
  partsTotal: number;
  serviceCharges: number;
  grandTotal: number;
  
  // Internal notes / miscellaneous comments
  notes?: string;
  internalComments?: string;

  // Lifecycle Timeline
  timeline?: TimelineEvent[];

  createdAt: string | number;
  updatedAt: string | number;
}
