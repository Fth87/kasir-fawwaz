
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
  customerName?: string;
  grandTotal: number;
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

export type ServiceStatusValue = typeof ServiceStatusOptions[number]['value'];

export type ProgressNote = {
  id: string;
  note: string;
  timestamp: string; // ISO string
};

export type ServiceTransaction = {
  id: string;
  type: 'service';
  date: string; // ISO string
  serviceName: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
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
  const option = ServiceStatusOptions.find(opt => opt.value === statusValue);
  return option ? option.label : statusValue;
}

// --- Auth Types ---
export type UserRole = 'admin' | 'cashier';

export const UserRoles: UserRole[] = ['admin', 'cashier'];

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
  month: string; // YYYY-MM
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

export type NewInventoryItemInput = Omit<InventoryItem, 'id'>;
export type UpdateInventoryItemInput = Partial<Omit<InventoryItem, 'id'>>;
