export type SyncStatus = "synced" | "pending" | "syncing" | "failed" | "offline";

export interface MobileProduct {
  id: string;
  name: string;
  brand?: string | null;
  sellingPrice: number;
  costPrice?: number;
  stockLevel: number;
  lowStockAlert: number;
  barcode?: string | null;
  volumeMl?: number | null;
  genderCategory?: string | null;
  concentration?: string | null;
  updatedAt?: string;
}

export interface MobileCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  totalDebt?: number;
  totalSpent?: number;
  lastPurchaseDate?: string | null;
  updatedAt?: string;
}

export interface PendingDebtPayment {
  offlineId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  errorMessage?: string;
}

export interface PendingCustomer {
  offlineId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  errorMessage?: string;
}

export interface PendingSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface PendingSale {
  offlineId: string;
  customerId?: string;
  customerName?: string;
  items: PendingSaleItem[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "PARTIAL" | "CREDIT";
  discount?: number;
  notes?: string;
  saleDate: string;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
  errorMessage?: string;
}

export interface MobileSaleSummary {
  id: string;
  receiptNumber?: string;
  saleDate: string;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: string;
  paymentMethod: string;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  items: Array<{
    id: string;
    product: {
      name: string;
    };
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}
