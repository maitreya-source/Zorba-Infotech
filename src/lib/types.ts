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
