'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

// Hooks & Server Actions
import { getTransactionById } from '../actions';
import { useSettingsStore } from '@/stores/settings.store';

// Types
import type { StoreSettings, Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Settings, Building, Loader2} from 'lucide-react';

// Helper Function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { settings } = useSettingsStore();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const transactionId = params.id as string;

  useEffect(() => {
    if (transactionId) {
      setIsLoading(true);
      getTransactionById(transactionId).then(({ data }) => {
        setTransaction(data);
        setIsLoading(false);
      });
    }
  }, [transactionId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  return (
    <div className="max-w-md mx-auto bg-background p-4 print:p-0 print:max-w-none print:w-full">
      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: 80mm auto; margin: 0; padding: 0; }
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; margin: 0; padding: 0; }
          .print-receipt { width: 80mm; max-width: 80mm; margin: 0; padding: 8mm; box-sizing: border-box; background: white; }
          .print-hide { display: none !important; }
          .print-show { display: block !important; }
          .print-center { text-align: center; }
          .print-bold { font-weight: bold; }
          .print-small { font-size: 10px; }
          .print-large { font-size: 14px; }
          .print-separator { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
          .print-table { width: 100%; margin: 4px 0; }
          .print-table td { padding: 1px 0; vertical-align: top; }
          .print-right { text-align: right; }
          .print-left { text-align: left; }
          .qr-code { margin: 8px auto; }
        }
      `}</style>

      <Card className="shadow-lg print:shadow-none print:border-none print-receipt">
        <ReceiptHeader settings={settings} transaction={transaction} />
        <CardContent className="p-6 print:p-0 space-y-4 print:space-y-2">
          <TransactionDetails transaction={transaction} />
        </CardContent>
        <ReceiptFooter transaction={transaction} />
      </Card>
    </div>
  );
}

function ReceiptHeader({ settings, transaction }: { settings: StoreSettings | null; transaction: Transaction }) {
    return (
        <CardHeader className="bg-primary text-primary-foreground p-6 print:bg-white print:text-black print:p-0 print:pb-2">
            <div className="print:hidden">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Building className="h-8 w-8" /><CardTitle className="text-2xl font-headline">{settings?.storeName || 'Toko Anda'}</CardTitle></div>
                    <div className="text-right"><p className="text-xs">Struk</p><p className="text-xs">ID: {transaction.id.substring(0, 8)}</p></div>
                </div>
                <p className="text-xs text-primary-foreground/80">{settings?.storeAddress || 'Alamat Toko Anda'}</p>
            </div>
            <div className="hidden print:block print-center">
                <div className="print-bold print-large mb-2">{settings?.storeName || 'TOKO ANDA'}</div>
                <div className="print-small mb-1">{settings?.storeAddress || 'Alamat Toko Anda'}</div>
                {settings?.storePhone && (<div className="print-small mb-1">Tel: {settings.storePhone}</div>)}
                {settings?.storeEmail && (<div className="print-small mb-2">Email: {settings.storeEmail}</div>)}
                <div className="print-separator"></div>
                <div className="print-small"><strong>STRUK PEMBAYARAN</strong></div>
                <div className="print-separator"></div>
            </div>
        </CardHeader>
    );
}

function TransactionDetails({ transaction }: { transaction: Transaction }) {
  const qrCodeUrl = transaction.type === 'service' && typeof window !== 'undefined' ? `${window.location.origin}/service-status/${transaction.id}` : '';
  return (
    <>
      <div className="print:hidden space-y-4">
        <div><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tanggal Transaksi</p><p className="font-medium">{new Date(transaction.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p></div>
        <Separator />
        {transaction.type === 'sale' && <SaleDetails tx={transaction} isPrint={false} />}
        {transaction.type === 'service' && <ServiceDetails tx={transaction} qrCodeUrl={qrCodeUrl} isPrint={false} />}
        {transaction.type === 'expense' && <ExpenseDetails tx={transaction} isPrint={false} />}
        <Separator />
        <p className="text-center text-xs text-muted-foreground pt-4">Terima kasih atas kepercayaan Anda!</p>
      </div>
      <div className="hidden print:block">
        <table className="print-table print-small">
          <tbody>
            <tr><td className="print-left">No. Transaksi</td><td className="print-right">#{transaction.id.substring(0, 12)}</td></tr>
            <tr><td className="print-left">Tanggal</td><td className="print-right">{new Date(transaction.date).toLocaleDateString('id-ID')}</td></tr>
            <tr><td className="print-left">Waktu</td><td className="print-right">{new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td></tr>
            {transaction.type === 'sale' && (transaction as SaleTransaction).customerName && (<tr><td className="print-left">Kasir</td><td className="print-right">{(transaction as SaleTransaction).customerName}</td></tr>)}
          </tbody>
        </table>
        <div className="print-separator"></div>
        {transaction.type === 'sale' && <SaleDetails tx={transaction} isPrint={true} />}
        {transaction.type === 'service' && <ServiceDetails tx={transaction} qrCodeUrl={qrCodeUrl} isPrint={true} />}
        {transaction.type === 'expense' && <ExpenseDetails tx={transaction} isPrint={true} />}
        <div className="print-separator"></div>
        <div className="print-center print-small" style={{ marginTop: '12px' }}>
          <div>*** TERIMA KASIH ***</div>
          <div>Barang yang sudah dibeli</div>
          <div>tidak dapat dikembalikan</div>
          <div style={{ marginTop: '8px' }}>{new Date().toLocaleString('id-ID')}</div>
        </div>
      </div>
    </>
  );
}

function SaleDetails({ tx, isPrint }: { tx: SaleTransaction; isPrint: boolean }) {
  if (isPrint) {
    return (
      <>
        <table className="print-table print-small"><thead><tr><td className="print-left print-bold">Item</td><td className="print-center print-bold">Qty</td><td className="print-right print-bold">Harga</td><td className="print-right print-bold">Total</td></tr></thead></table>
        <div className="print-separator" style={{ margin: '2px 0' }}></div>
        {tx.items.map((item, index) => (<div key={index} style={{ marginBottom: '4px' }}><table className="print-table print-small"><tbody><tr><td className="print-left" style={{ width: '40%' }}>{item.name}</td><td className="print-center" style={{ width: '15%' }}>{item.quantity}</td><td className="print-right" style={{ width: '22%' }}>{formatCurrency(item.pricePerItem || (item.total / item.quantity))}</td><td className="print-right" style={{ width: '23%' }}>{formatCurrency(item.total)}</td></tr></tbody></table></div>))}
        <div className="print-separator"></div>
        <table className="print-table"><tbody><tr><td className="print-left print-bold">TOTAL PEMBAYARAN</td><td className="print-right print-bold print-large">{formatCurrency(tx.grandTotal)}</td></tr></tbody></table>
      </>
    );
  }
  return (
    <>
      {tx.customerName && (<div><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pelanggan</p><p className="font-medium">{tx.customerName}</p></div>)}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Barang</p>
        <ul className="space-y-1 mt-1">{tx.items.map((item, index) => (<li key={index} className="flex justify-between"><span>{item.name} (x{item.quantity})</span><span className="font-medium">{formatCurrency(item.total)}</span></li>))}</ul>
      </div>
      <Separator />
      <div className="flex justify-between items-center"><p className="text-lg font-bold">Grand Total</p><p className="text-lg font-bold text-primary">{formatCurrency(tx.grandTotal)}</p></div>
    </>
  );
}

function ServiceDetails({ tx, qrCodeUrl, isPrint }: { tx: ServiceTransaction; qrCodeUrl: string; isPrint: boolean }) {
  if (isPrint) {
    return (
      <>
        <table className="print-table print-small">
            <tbody>
                {tx.customerName && (<tr><td className="print-left">Pelanggan:</td><td className="print-right">{tx.customerName}</td></tr>)}
                <tr><td className="print-left">Layanan:</td><td className="print-right">{tx.serviceName}</td></tr>
                <tr><td className="print-left">Perangkat:</td><td className="print-right">{tx.device}</td></tr>
            </tbody>
        </table>
        <div style={{ margin: '4px 0' }} className="print-small"><strong>Keluhan:</strong><br />{tx.issueDescription}</div>
        <div className="print-separator"></div>
        <table className="print-table"><tbody><tr><td className="print-left print-bold">BIAYA SERVIS</td><td className="print-right print-bold print-large">{formatCurrency(tx.serviceFee)}</td></tr></tbody></table>
        {qrCodeUrl && (<><div className="print-separator"></div><div className="print-center print-small"><div className="print-bold">Lacak Status Servis</div><div className="qr-code"><QRCodeCanvas value={qrCodeUrl} size={96} bgColor="#FFFFFF" fgColor="#000000" /></div><div style={{ fontSize: '8px', wordBreak: 'break-all' }}>{qrCodeUrl}</div></div></>)}
      </>
    );
  }
  return (
    <>
      {tx.customerName && (<div><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pelanggan</p><p className="font-medium">{tx.customerName}</p></div>)}
      <div><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Layanan Servis</p><p className="font-medium">{tx.serviceName} ({tx.device})</p><p className="text-sm text-muted-foreground">{tx.issueDescription}</p></div>
      <Separator />
      <div className="flex justify-between items-center"><p className="text-lg font-bold">Biaya Servis</p><p className="text-lg font-bold text-primary">{formatCurrency(tx.serviceFee)}</p></div>
      <Separator />
      {qrCodeUrl && (<div className="text-center"><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lacak Status Servis</p><div className="flex flex-col items-center gap-2 my-4"><QRCodeCanvas value={qrCodeUrl} size={128} bgColor="#FFFFFF" fgColor="#000000" /><a href={qrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{qrCodeUrl}</a></div></div>)}
    </>
  );
}

function ExpenseDetails({ tx, isPrint }: { tx: ExpenseTransaction; isPrint: boolean }) {
  if (isPrint) {
    return (
      <>
        <table className="print-table print-small"><tbody><tr><td className="print-left">Deskripsi:</td><td className="print-right">{tx.description}</td></tr>{tx.category && (<tr><td className="print-left">Kategori:</td><td className="print-right">{tx.category}</td></tr>)}</tbody></table>
        <div className="print-separator"></div>
        <table className="print-table"><tbody><tr><td className="print-left print-bold">TOTAL PENGELUARAN</td><td className="print-right print-bold print-large">{formatCurrency(tx.amount)}</td></tr></tbody></table>
      </>
    );
  }
  return (
    <>
      <div><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Deskripsi Pengeluaran</p><p className="font-medium">{tx.description}</p></div>
      {tx.category && (<div><p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kategori</p><p className="font-medium">{tx.category}</p></div>)}
      <Separator />
      <div className="flex justify-between items-center"><p className="text-lg font-bold">Jumlah</p><p className="text-lg font-bold text-destructive">{formatCurrency(tx.amount)}</p></div>
    </>
  );
}

function ReceiptFooter({ transaction }: { transaction: Transaction }) {
  const handlePrint = () => { window.focus(); window.print(); };
  return (
    <CardFooter className="p-6 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
      <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
      <div className="flex gap-2 w-full sm:w-auto">
        {transaction.type === 'service' && (<Button asChild variant="outline" className="flex-1"><Link href={`/admin/service-management/${transaction.id}`}><Settings className="mr-1 h-4 w-4" /> Kelola</Link></Button>)}
        <Button onClick={handlePrint} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
      </div>
    </CardFooter>
  );
}