'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

// Hooks & Server Actions
import { getTransactionById } from '../actions'; // Pastikan path ini benar
import { useSettingsStore } from '@/stores/settings.store'; // Pastikan path ini benar
import { usePrinter } from '@/hooks/usePrinter'; // Hook baru untuk cetak RawBT

// Mappers & Types
import { mapSaleToReceiptData, mapServiceToReceiptData } from '@/utils/receipt-mapper'; // Mapper data baru
import type { StoreSettings, Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types'; // Pastikan path ini benar

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Settings, Building, Loader2 } from 'lucide-react';

// Helper Function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { settings } = useSettingsStore();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [isFetching, setIsFetching] = useState(true);

  // Gunakan hook usePrinter untuk mendapatkan fungsi cetak dan status loading-nya
  const { printReceipt, isLoading: isPrinting } = usePrinter();

  const transactionId = params.id as string;

  useEffect(() => {
    if (transactionId) {
      setIsFetching(true);
      getTransactionById(transactionId)
        .then(({ data }) => {
          setTransaction(data);
          setIsFetching(false);
        })
        .catch(() => {
          setIsFetching(false);
          setTransaction(null);
        });
    }
  }, [transactionId]);

  // Fungsi baru untuk menangani pencetakan via RawBT
  const handleRawBtPrint = () => {
    if (!transaction) return;

    let receiptData;

    // Gunakan mapper untuk mengubah data transaksi ke format yang dibutuhkan ESCPOSPrinter
    if (transaction.type === 'sale') {
      receiptData = mapSaleToReceiptData(transaction as SaleTransaction, settings);
    } else if (transaction.type === 'service') {
      receiptData = mapServiceToReceiptData(transaction as ServiceTransaction, settings);
    } else {
      alert('Tipe transaksi ini tidak dapat dicetak sebagai struk.');
      return;
    }

    if (receiptData) {
      printReceipt(receiptData);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Memuat data transaksi...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <Card className="max-w-md mx-auto text-center py-10">
        <CardHeader>
          <CardTitle>Transaksi Tidak Ditemukan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Transaksi yang Anda cari tidak ada atau gagal dimuat.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background p-4 sm:p-6 md:p-8">
      <Card className="shadow-lg">
        <ReceiptHeader settings={settings} />
        <CardContent className="p-6 space-y-4">
          <TransactionDetails transaction={transaction} />
        </CardContent>
        <ReceiptFooter transaction={transaction} onPrintClick={handleRawBtPrint} isPrinting={isPrinting} />
      </Card>
    </div>
  );
}

function ReceiptHeader({ settings }: { settings: StoreSettings | null }) {
  return (
    // <CardHeader className="bg-primary text-primary-foreground p-6">
    //     <div className="flex items-center justify-between mb-2">
    //         <div className="flex items-center gap-3">
    //           <Building className="h-8 w-8" />
    //           <CardTitle className="text-2xl font-headline">{settings?.storeName || 'Toko Anda'}</CardTitle>
    //         </div>
    //         <div className="text-right">
    //           <p className="text-xs">Struk</p>
    //           <p className="font-mono text-xs">ID: {transaction.id.substring(0, 8)}</p>
    //         </div>
    //     </div>
    //     <p className="text-xs text-primary-foreground/80">{settings?.storeAddress || 'Alamat Toko Anda'}</p>
    // </CardHeader>
    <CardHeader className="bg-primary text-primary-foreground p-6 text-center">
      {/* Ikon dan Nama Toko dibuat rata tengah */}
      <div className="flex justify-center items-center gap-3 mb-2">
        <Building className="h-8 w-8" />
        <CardTitle className="text-2xl font-headline">{settings?.storeName || 'Toko Anda'}</CardTitle>
      </div>

      {/* Alamat Toko */}
      <p className="text-sm text-primary-foreground/80">{settings?.storeAddress || 'Alamat Toko Anda'}</p>

      {/* Menambahkan nomor telepon jika tersedia di settings */}
      {settings?.storePhone && <p className="text-xs text-primary-foreground/70 mt-1">{settings.storePhone}</p>}
    </CardHeader>
  );
}

function TransactionDetails({ transaction }: { transaction: Transaction }) {
  const qrCodeUrl = transaction.type === 'service' && typeof window !== 'undefined' ? `${window.location.origin}/service-status/${transaction.id}` : '';

  return (
    <>
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tanggal Transaksi</p>
        <p className="font-medium">{new Date(transaction.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
      </div>
      <div className="col-span-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">ID Transaksi</p>
        <p className="font-medium font-mono">{transaction.id.substring(0, 8)}</p>
      </div>
      <Separator />

      {transaction.type === 'sale' && <SaleDetails tx={transaction} />}
      {transaction.type === 'service' && <ServiceDetails tx={transaction} qrCodeUrl={qrCodeUrl} />}
      {transaction.type === 'expense' && <ExpenseDetails tx={transaction} />}

      <Separator />
      <p className="text-center text-xs text-muted-foreground pt-4">Terima kasih atas kepercayaan Anda!</p>
    </>
  );
}

function SaleDetails({ tx }: { tx: SaleTransaction }) {
  const subtotal = tx.grandTotal + (tx.discountAmount ?? 0);
  const discountLabel =
    tx.discountType === 'percent'
      ? `${tx.discountValue ?? 0}%`
      : formatCurrency(tx.discountValue ?? 0);

  return (
    <>
      {tx.customerName && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pelanggan</p>
          <p className="font-medium">{tx.customerName}</p>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Barang</p>
        <ul className="space-y-1 mt-1">
          {tx.items.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span>
                {item.name} (x{item.quantity})
              </span>
              <span className="font-medium font-mono">{formatCurrency(item.total)}</span>
            </li>
          ))}
        </ul>
      </div>
      <Separator />
      <div className="space-y-1">
        <div className="flex justify-between">
          <p>Subtotal</p>
          <p className="font-mono">{formatCurrency(subtotal)}</p>
        </div>
        {tx.discountAmount ? (
          <div className="flex justify-between">
            <p>Diskon ({discountLabel})</p>
            <p className="font-mono">- {formatCurrency(tx.discountAmount)}</p>
          </div>
        ) : null}
        <div className="flex justify-between items-center pt-1">
          <p className="text-lg font-bold">Grand Total</p>
          <p className="text-lg font-bold text-primary font-mono">{formatCurrency(tx.grandTotal)}</p>
        </div>
        <div className="flex justify-between">
          <p>Metode</p>
          <p className="capitalize">{tx.paymentMethod}</p>
        </div>
        {tx.paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between">
              <p>Tunai</p>
              <p className="font-mono">{formatCurrency(tx.cashTendered || 0)}</p>
            </div>
            <div className="flex justify-between">
              <p>Kembali</p>
              <p className="font-mono">{formatCurrency(tx.change || 0)}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ServiceDetails({ tx, qrCodeUrl }: { tx: ServiceTransaction; qrCodeUrl: string }) {
  return (
    <>
      {tx.customerName && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pelanggan</p>
          <p className="font-medium">{tx.customerName}</p>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Layanan Servis</p>
        <p className="font-medium">
          {tx.serviceName} ({tx.device})
        </p>
        <p className="text-sm text-muted-foreground">{tx.issueDescription}</p>
      </div>
      <Separator />
      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">Biaya Servis</p>
        <p className="text-lg font-bold text-primary font-mono">{formatCurrency(tx.serviceFee)}</p>
      </div>
      <Separator />
      {qrCodeUrl && (
        <div className="text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lacak Status Servis</p>
          <div className="flex flex-col items-center gap-2 my-4">
            <QRCodeCanvas value={qrCodeUrl} size={128} bgColor="#FFFFFF" fgColor="#000000" />
            <a href={qrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
              {qrCodeUrl}
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function ExpenseDetails({ tx }: { tx: ExpenseTransaction }) {
  return (
    <>
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Deskripsi Pengeluaran</p>
        <p className="font-medium">{tx.description}</p>
      </div>
      {tx.category && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kategori</p>
          <p className="font-medium">{tx.category}</p>
        </div>
      )}
      <Separator />
      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">Jumlah</p>
        <p className="text-lg font-bold text-destructive font-mono">{formatCurrency(tx.amount)}</p>
      </div>
    </>
  );
}

function ReceiptFooter({ transaction, onPrintClick, isPrinting }: { transaction: Transaction; onPrintClick: () => void; isPrinting: boolean }) {
  const router = useRouter();

  return (
    <CardContent className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          {transaction.type === 'service' && (
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/admin/service-management/${transaction.id}`}>
                <Settings className="mr-1 h-4 w-4" /> Kelola
              </Link>
            </Button>
          )}
          <Button onClick={onPrintClick} disabled={isPrinting || transaction.type === 'expense'} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            {isPrinting ? 'Mencetak...' : 'Cetak Struk'}
          </Button>
        </div>
      </div>
    </CardContent>
  );
}
