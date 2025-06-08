export type SaleItem = {
  id: string;
  name: string;
  quantity: number;
  pricePerItem: number;
  total: number;
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

export function getServiceStatusLabel(statusValue: ServiceStatusValue): string {
  const option = ServiceStatusOptions.find(opt => opt.value === statusValue);
  return option ? option.label : statusValue;
}
