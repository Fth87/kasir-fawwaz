import { SalesReceiptData, ServiceReceiptData } from "@/types/receipt";

export function generateServiceDemoData(): ServiceReceiptData {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const uuid = 'dd1f681a';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return {
    store: {
      name: 'Toko Anda',
      addr: 'Alamat Toko Anda'
    },
    invoice: {
      id: uuid,
      datetime: `${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()} pukul ${pad(now.getHours())}.${pad(now.getMinutes())}`
    },
    customer: {
      name: 'Yanto'
    },
    service: {
      name: 'Ganti layar (Iphone Mahal)',
      description: 'Layarnya pengen nambah',
      cost: 200000
    },
    tracking: {
      url: `http://localhost:3000/service-status/${uuid}-4591-41ef-a117-94896cf1da53`
    },
    qr: {
      size: 5,
      ec: 'M'
    },
    footer: 'Terima kasih atas kepercayaan Anda!'
  };
}

export function generateSalesDemoData(): SalesReceiptData {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const uuid = 'ef5226cd';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return {
    store: {
      name: 'Toko Anda',
      addr: 'Alamat Toko Anda'
    },
    invoice: {
      id: uuid,
      datetime: `${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()} pukul ${pad(now.getHours())}.${pad(now.getMinutes())}`
    },
    customer: {
      name: 'Yanto'
    },
    items: [
      {
        name: 'Kaca tanpa kaca',
        qty: 1,
        price: 25000
      }
    ],
    totals: {
      subtotal: 25000,
      total: 25000
    },
    footer: 'Terima kasih atas kepercayaan Anda!'
  };
}
