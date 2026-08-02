import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
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

export interface DeviceCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string | number;
}

export interface ServiceCenterAddress {
  id: string;
  address: string;
  city?: string;
  isDefault?: boolean;
}

export interface ServiceCenter {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  addresses: ServiceCenterAddress[];
  defaultAddressId?: string;
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
  type: ServiceCallType;
  dateTime: string; // ISO or YYYY-MM-DDTHH:mm format, auto-populated, modifiable
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  deviceCategory: string; // e.g. Printer, Toner, Laptop, Desktop, CCTV, Router
  modelNumber?: string;   // optional
  serialNumber?: string;  // optional
  quantity: number;
  issueDescription: string; // e.g. Toner refill, Antivirus installation
  warrantyStatus: WarrantyStatus;
  status: ServiceCallStatus;
  
  // Service Center details
  serviceCenterId?: string;
  serviceCenterName?: string;  
  serviceCenterAddressId?: string;
  serviceCenterAddress?: string;
  rmaNumber?: string;          // tracking / RMA number
  courierCharges?: number;     // optional courier/transport charges for service center returns
  
  // Onsite details
  onsiteAddress?: string;      // for onsite visits

  // Technician Assignee
  technicianId?: string;
  technicianName?: string;

  // Billing
  parts: ServicePart[];
  partsTotal: number;
  serviceCharges: number;
  grandTotal: number;
  notes?: string;
  createdAt: string | number;
  updatedAt: string | number;
}
