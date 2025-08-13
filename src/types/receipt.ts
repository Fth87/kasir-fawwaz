export interface StoreInfo {
  name: string;
  addr: string;
  phone?: string;
}

export interface InvoiceInfo {
  id: string;
  datetime: string;
}

export interface Customer {
  name: string;
}

export interface Service {
  name: string;
  description?: string;
  cost: number;
}

export interface SaleItem {
  name: string;
  qty: number;
  price: number;
}

export interface Totals {
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
}

export interface Payment {
  cash?: number;
  change?: number;
}

export interface Tracking {
  url: string;
}

export interface QRConfig {
  size?: number;
  ec?: 'L' | 'M' | 'Q' | 'H';
}

export interface ServiceReceiptData {
  store: StoreInfo;
  invoice: InvoiceInfo;
  customer: Customer;
  service: Service;
  tracking?: Tracking;
  qr?: QRConfig;
  footer?: string;
}

export interface SalesReceiptData {
  store: StoreInfo;
  invoice: InvoiceInfo;
  customer: Customer;
  items: SaleItem[];
  totals: Totals;
  payment?: Payment;
  footer?: string;
}
export type ReceiptData = ServiceReceiptData | SalesReceiptData;
