'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ReceiptData, SalesReceiptData, ServiceReceiptData } from '@/types/receipt';
import { usePrinter } from '@/hooks/usePrinter';
import { generateSalesDemoData, generateServiceDemoData } from '@/utils/demoData';
import { ESCPOSPrinter } from '@/utils/printer';

export default function HomePage() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptType, setReceiptType] = useState<'service' | 'sales'>('service');
  const { printReceipt, isLoading } = usePrinter();

  useEffect(() => {
    // Parse data from URL hash or use demo data
    const parseHashData = (): ReceiptData | null => {
      if (typeof window === 'undefined') return null;

      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const base64Data = params.get('data');

      if (!base64Data) return null;

      try {
        return JSON.parse(atob(base64Data)) as ReceiptData;
      } catch {
        return null;
      }
    };

    const hashData = parseHashData();
    if (hashData) {
      setReceiptData(hashData);
      // Auto-detect receipt type
      if ('service' in hashData) {
        setReceiptType('service');
      } else {
        setReceiptType('sales');
      }
    } else {
      // Load demo data based on current type
      loadDemoData(receiptType);
    }
  }, []);

  const loadDemoData = (type: 'service' | 'sales') => {
    const data = type === 'service' ? generateServiceDemoData() : generateSalesDemoData();
    setReceiptData(data); 
    setReceiptType(type);
  };

  const handlePrint = () => {
    if (receiptData) {
      printReceipt(receiptData);
    }
  };

  const handleTypeChange = (type: 'service' | 'sales') => {
    loadDemoData(type);
  };

  const generateFallbackIntent = (): string => {
    if (!receiptData) return '#';

    const bytes = ESCPOSPrinter.build(receiptData, 32);
    const base64Data = ESCPOSPrinter.toBase64(bytes);
    return `intent:${encodeURI(`data:application/octet-stream;base64,${base64Data}`)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  };

  if (!receiptData) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const isServiceReceipt = 'service' in receiptData;

  return (
    <>
      <Head>
        <title>Auto-Print Receipt System</title>
        <meta name="description" content="Service & Sales receipt printer with QR tracking" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Auto-Print Receipt System 58mm</h1>
            <p className="text-gray-600 text-sm mb-4">
              Sistem cetak struk otomatis untuk layanan service dan penjualan. Buka dengan <code className="bg-gray-100 px-2 py-1 rounded text-xs">#data=&lt;base64-json&gt;</code>
            </p>

            {/* Receipt Type Selector */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleTypeChange('service')} className={`px-3 py-2 rounded-lg text-sm font-medium ${receiptType === 'service' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                Struk Service
              </button>
              <button onClick={() => handleTypeChange('sales')} className={`px-3 py-2 rounded-lg text-sm font-medium ${receiptType === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                Struk Penjualan
              </button>
            </div>

            {/* Receipt Preview Info */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Tipe:</strong> {isServiceReceipt ? 'Service Receipt' : 'Sales Receipt'}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>ID:</strong> {receiptData.invoice.id}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Pelanggan:</strong> {receiptData.customer.name}
              </div>
              {isServiceReceipt && (
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Service:</strong> {(receiptData as ServiceReceiptData).service.name}
                </div>
              )}
              {!isServiceReceipt && (
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Items:</strong> {(receiptData as SalesReceiptData).items.length} item(s)
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex gap-3 flex-wrap">
              <button onClick={handlePrint} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? 'Mencetak...' : 'Cetak Struk'}
              </button>
              <a href={generateFallbackIntent()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-decoration-none">
                Fallback Intent
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <details className="p-6">
              <summary className="cursor-pointer font-medium text-gray-900 mb-4">Data Payload</summary>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto text-gray-800">{JSON.stringify(receiptData, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    </>
  );
}
