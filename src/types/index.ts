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

export type ServiceTransaction = {
  id: string;
  type: 'service';
  date: string; // ISO string
  serviceName: string;
  customerName?: string;
  serviceFee: number;
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
