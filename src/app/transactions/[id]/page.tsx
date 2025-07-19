'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

// Hooks & Contexts
import { useTransactions } from '@/context/transaction-context';
import { useSettings } from '@/context/settings-context';

// Types
import type { StoreSettings, Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Settings, Building, Loader2 } from 'lucide-react';

// Helper Function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { getTransactionById, isLoading: isLoadingTransactions } = useTransactions();
  const { settings, isLoadingSettings } = useSettings();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);

  useEffect(() => {
    if (params.id && !isLoadingTransactions) {
      const tx = getTransactionById(params.id as string);
      setTransaction(tx);
    }
  }, [params.id, getTransactionById, isLoadingTransactions]);

  const isLoading = isLoadingTransactions || isLoadingSettings;

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Not Found State ---
  if (!transaction) {
    return (
      <Card className="max-w-md mx-auto text-center py-10">
        <CardHeader>
          <CardTitle>Transaksi Tidak Ditemukan</CardTitle>
          <CardDescription>Transaksi yang Anda cari tidak ada atau gagal dimuat.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Main Render ---
  return (
    <div className="max-w-md mx-auto bg-background p-0 print:p-0">
      <Card className="shadow-lg print:shadow-none print:border-none">
        <ReceiptHeader settings={settings} transaction={transaction} />
        <CardContent className="p-6 space-y-6">
          <TransactionDetails transaction={transaction} />
        </CardContent>
        <ReceiptFooter transaction={transaction} />
      </Card>
    </div>
  );
}

// --- Sub-Komponen untuk Kebersihan Kode ---

function ReceiptHeader({ settings, transaction }: { settings: StoreSettings | null; transaction: Transaction }) {
  return (
    <CardHeader className="bg-primary text-primary-foreground p-6 print:bg-transparent print:text-black">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building className="h-8 w-8" />
          <CardTitle className="text-2xl font-headline">{settings?.storeName || 'Toko Anda'}</CardTitle>
        </div>
        <div className="text-right">
          <p className="text-xs">Struk</p>
          <p className="text-xs">ID: {transaction.id.substring(0, 8)}</p>
        </div>
      </div>
      <p className="text-xs text-primary-foreground/80 print:text-black/80">{settings?.storeAddress || 'Alamat Toko Anda'}</p>
    </CardHeader>
  );
}

function TransactionDetails({ transaction }: { transaction: Transaction }) {
  const sectionTitleClass = 'text-sm font-semibold text-muted-foreground uppercase tracking-wider';
  const valueClass = 'font-medium';
  const qrCodeUrl = transaction.type === 'service' && typeof window !== 'undefined' ? `${window.location.origin}/service-status/${transaction.id}` : '';

  return (
    <>
      <div>
        <p className={sectionTitleClass}>Tanggal Transaksi</p>
        <p className={valueClass}>{new Date(transaction.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
      </div>
      <Separator />

      {transaction.type === 'sale' && <SaleDetails tx={transaction} sectionTitleClass={sectionTitleClass} valueClass={valueClass} />}
      {transaction.type === 'service' && <ServiceDetails tx={transaction} qrCodeUrl={qrCodeUrl} sectionTitleClass={sectionTitleClass} valueClass={valueClass} />}
      {transaction.type === 'expense' && <ExpenseDetails tx={transaction} sectionTitleClass={sectionTitleClass} valueClass={valueClass} />}

      <Separator />
      <p className="text-center text-xs text-muted-foreground pt-4">Terima kasih atas kepercayaan Anda!</p>
    </>
  );
}

// Komponen spesifik untuk setiap tipe transaksi
function SaleDetails({ tx, sectionTitleClass, valueClass }: { tx: SaleTransaction; sectionTitleClass: string; valueClass: string }) {
  return (
    <>
      {tx.customerName && (
        <div>
          <p className={sectionTitleClass}>Pelanggan</p>
          <p className={valueClass}>{tx.customerName}</p>
        </div>
      )}
      <div>
        <p className={sectionTitleClass}>Barang</p>
        <ul className="space-y-1 mt-1">
          {tx.items.map((item,index) => (
            <li key={index} className="flex justify-between">
              <span>
                {item.name} (x{item.quantity})
              </span>
              <span className={valueClass}>{formatCurrency(item.total)}</span>
            </li>
          ))}
        </ul>
      </div>
      <Separator />
      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">Grand Total</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(tx.grandTotal)}</p>
      </div>
    </>
  );
}

function ServiceDetails({ tx, qrCodeUrl, sectionTitleClass, valueClass }: { tx: ServiceTransaction; qrCodeUrl: string; sectionTitleClass: string; valueClass: string }) {
  return (
    <>
      {tx.customerName && (
        <div>
          <p className={sectionTitleClass}>Pelanggan</p>
          <p className={valueClass}>{tx.customerName}</p>
        </div>
      )}
      <div>
        <p className={sectionTitleClass}>Layanan Servis</p>
        <p className={valueClass}>{tx.serviceName} ({tx.device})</p>
        <p className="text-sm text-muted-foreground">{tx.issueDescription}</p>
      </div>
      <Separator />
      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">Biaya Servis</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(tx.serviceFee)}</p>
      </div>
      <Separator />
      {qrCodeUrl && (
        <div className="text-center">
          <p className={sectionTitleClass}>Lacak Status Servis</p>
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

function ExpenseDetails({ tx, sectionTitleClass, valueClass }: { tx: ExpenseTransaction; sectionTitleClass: string; valueClass: string }) {
  return (
    <>
      <div>
        <p className={sectionTitleClass}>Deskripsi Pengeluaran</p>
        <p className={valueClass}>{tx.description}</p>
      </div>
      {tx.category && (
        <div>
          <p className={sectionTitleClass}>Kategori</p>
          <p className={valueClass}>{tx.category}</p>
        </div>
      )}
      <Separator />
      <div className="flex justify-between items-center">
        <p className="text-lg font-bold">Jumlah</p>
        <p className="text-lg font-bold text-destructive">{formatCurrency(tx.amount)}</p>
      </div>
    </>
  );
}

function ReceiptFooter({ transaction }: { transaction: Transaction }) {
  const handlePrint = () => window.print();

  return (
    <CardFooter className="p-6 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
      <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto">
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
        <Button onClick={handlePrint} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
          <Printer className="mr-2 h-4 w-4" /> Cetak
        </Button>
      </div>
    </CardFooter>
  );
}
