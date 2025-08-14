export type SaleItem = {
  id: string;
  name: string;
  quantity: number;
  pricePerItem: number;
  total: number;
  inventoryItemId?: string; // Optional: to link sale item to inventory item
};

export type SaleTransaction = {
  id: string;
  type: 'sale';
  date: string; // ISO string
  items: SaleItem[];
  paymentMethod: 'cash' | 'transfer' | 'qris';
  customerName?: string; // This will be used to link to Customer if customerId is not present
  customerId?: string; // Optional: to link to a specific customer in CRM
  grandTotal: number;
  discountType?: 'percent' | 'nominal';
  discountValue?: number;
  discountAmount?: number;
  cashTendered?: number;
  change?: number;
};

export const ServiceStatusOptions = [
  { value: 'PENDING_CONFIRMATION', label: 'Pending Confirmation' },
  { value: 'CONFIRMED_QUEUED', label: 'Confirmed & Queued' },
  { value: 'TECHNICIAN_ASSIGNED', label: 'Technician Assigned' },
  { value: 'DIAGNOSIS_IN_PROGRESS', label: 'Diagnosis in Progress' },
  { value: 'AWAITING_PARTS', label: 'Awaiting Parts' },
  { value: 'REPAIR_IN_PROGRESS', label: 'Repair in Progress' },
  { value: 'QUALITY_CHECK', label: 'Quality Check' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'COMPLETED_COLLECTED', label: 'Completed & Collected' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export type ServiceStatusValue = (typeof ServiceStatusOptions)[number]['value'];

export type ProgressNote = {
  id: string;
  note: string;
  timestamp: string; // ISO string
};

export type ServiceTransaction = {
  id: string;
  type: 'service';
  date: string; // ISO string
  device: string;
  issueDescription: string;
  serviceName: string;
  customerName?: string; // Used for display and linking if customerId not present
  customerPhone?: string; // Used for display and linking if customerId not present
  customerAddress?: string;
  customerId?: string; // Optional: to link to a specific customer in CRM
  serviceFee: number;
  status: ServiceStatusValue;
  progressNotes: ProgressNote[];
};

export type ExpenseTransaction = {
  id: string;
  type: 'expense';
  date: string; // ISO string
  description: string;
  category?: string;
  amount: number;
};

export type Transaction = SaleTransaction | ServiceTransaction | ExpenseTransaction;

export function getServiceStatusLabel(statusValue?: ServiceStatusValue): string {
  if (!statusValue) return 'N/A';
  const option = ServiceStatusOptions.find((opt) => opt.value === statusValue);
  return option ? option.label : statusValue;
}

// --- Auth Types ---
export type UserRole = 'admin' | 'cashier';

// types/index.ts
export const UserRoles = ['admin', 'cashier'] as const;

export type User = {
  id: string;
  username: string;
  password?: string; // Password should not be stored like this in production
  role: UserRole;
};

// For Add User Form
export type NewUserInput = Omit<User, 'id'>;

// For Reports
export type MonthlySummary = {
  month: string; // YYYY-MM or label like "Aug 24"
  sales: number;
  services: number;
  expenses: number;
  profit: number;
};

export type TransactionTypeFilter = 'all' | 'sale' | 'service' | 'expense';

// --- Inventory Types ---
export type InventoryItem = {
  id: string;
  name: string;
  sku?: string; // Stock Keeping Unit (optional)
  stockQuantity: number;
  purchasePrice: number; // Harga beli
  sellingPrice: number; // Harga jual
  lastRestocked?: string; // ISO date string
  lowStockThreshold?: number; // Optional threshold for low stock warning
};

export type NewInventoryItemInput = Omit<InventoryItem, 'id' | 'lastRestocked'> & { lastRestocked?: string };
export type UpdateInventoryItemInput = Partial<Omit<InventoryItem, 'id'>>;

// --- Customer (CRM) Types ---
export type Customer = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};

export type NewCustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCustomerInput = Partial<NewCustomerInput>;

// --- Store Settings ---
export type StoreSettings = {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  // storeLogoUrl?: string; // Future enhancement
};
