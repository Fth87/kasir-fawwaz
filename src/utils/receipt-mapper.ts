// file: utils/receipt-mapper.ts

import type { StoreSettings, SaleTransaction, ServiceTransaction } from '@/types';
import { SalesReceiptData, ServiceReceiptData } from '@/types/receipt';

// Fungsi ini mengubah data SaleTransaction menjadi SalesReceiptData
export function mapSaleToReceiptData(
  tx: SaleTransaction,
  settings: StoreSettings | null
): SalesReceiptData {
  return {
    store: {
      name: settings?.storeName || 'Toko Anda',
      addr: settings?.storeAddress || 'Alamat Toko Anda',
      phone: settings?.storePhone || 'Nomor Telepon Toko Anda',
    },
    invoice: {
      id: tx.id.substring(0, 8),
      datetime: new Date(tx.date).toLocaleString('id-ID'),
    },
    customer: {
      name: tx.customerName || 'Pelanggan',
    },
    items: tx.items.map(item => ({
      name: item.name,
      qty: item.quantity,
      price: item.pricePerItem || item.total / item.quantity,
    })),
    totals: {
      subtotal: tx.grandTotal, // Sesuaikan jika ada subtotal terpisah
      total: tx.grandTotal,
    },
    footer: 'Terima kasih atas kepercayaan Anda!',
  };
}

// Fungsi ini mengubah data ServiceTransaction menjadi ServiceReceiptData
export function mapServiceToReceiptData(
  tx: ServiceTransaction,
  settings: StoreSettings | null
): ServiceReceiptData {
  const trackingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/service-status/${tx.id}` 
    : '';

  return {
    store: {
      name: settings?.storeName || 'Toko Anda',
      addr: settings?.storeAddress || 'Alamat Toko Anda',
      phone: settings?.storePhone || 'Nomor Telepon Toko Anda',
    },
    invoice: {
      id: tx.id.substring(0, 8),
      datetime: new Date(tx.date).toLocaleString('id-ID'),
    },
    customer: {
      name: tx.customerName || 'Pelanggan',
    },
    service: {
      name: `${tx.serviceName}  ( ${tx.device} )`,
      description: tx.issueDescription,
      cost: tx.serviceFee,
    },
    tracking: {
      url: trackingUrl,
    },
    qr: {
      size: 6,
      ec: 'M',
    },
    footer: 'Lacak status servis via QR Code di atas.',
  };
}