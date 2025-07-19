"use client";

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCustomers } from '@/context/customer-context';
import { useTransactions } from '@/context/transaction-context';
import type { Customer, Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserCircle, Phone, Mail, MapPin, FileText, ShoppingBag, Wrench, Loader2, ViewIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Helper Function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getCustomerById, isLoading: isLoadingCustomers } = useCustomers();
  // Ambil fungsi baru dan isLoading dari context
  const { getTransactionsByCustomerId, isLoading: isLoadingTransactions } = useTransactions();
  
  const customerId = params.id as string;
  const customer = getCustomerById(customerId);
  const customerTransactions = getTransactionsByCustomerId(customerId);

  const isLoading = isLoadingCustomers || isLoadingTransactions;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!customer) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Pelanggan Tidak Ditemukan</h2>
        <Button onClick={() => router.push('/admin/manage-customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Pelanggan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CustomerInfoCard customer={customer} />
      <TransactionHistoryCard transactions={customerTransactions} customerName={customer.name} />
    </div>
  );
}

// Sub-komponen untuk menampilkan informasi pelanggan
function CustomerInfoCard({ customer }: { customer: Customer }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircle className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">{customer.name}</CardTitle>
              <CardDescription>Pelanggan sejak {format(parseISO(customer.createdAt), 'dd MMMM yyyy', { locale: LocaleID })}</CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/manage-customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customer.phone && <InfoItem icon={Phone} label="Telepon" value={customer.phone} />}
          {customer.address && <InfoItem icon={MapPin} label="Alamat" value={customer.address} className="md:col-span-2" />}
          {customer.notes && <InfoItem icon={FileText} label="Catatan" value={customer.notes} className="md:col-span-2" />}
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-komponen untuk item informasi
function InfoItem({ icon: Icon, label, value, className = "" }: { icon: React.ElementType, label: string, value: string, className?: string }) {
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium whitespace-pre-wrap">{value}</p>
            </div>
        </div>
    );
}

// Sub-komponen untuk riwayat transaksi
function TransactionHistoryCard({ transactions, customerName }: { transactions: Transaction[], customerName: string }) {
  const getTransactionSummary = (tx: Transaction) => {
    if (tx.type === 'sale') return `Penjualan: ${tx.items.length} barang`;
    if (tx.type === 'service') return `Servis: ${tx.serviceName}`;
    return 'Tipe Tidak Dikenal';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-headline">Riwayat Transaksi</CardTitle>
        <CardDescription>Penjualan dan servis yang terhubung dengan {customerName}.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Tidak ada riwayat transaksi untuk pelanggan ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy HH:mm', { locale: LocaleID })}</TableCell>
                  <TableCell>
                    <Badge variant={tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">
                      {tx.type === 'sale' ? <ShoppingBag className="mr-1 h-3 w-3" /> : <Wrench className="mr-1 h-3 w-3" />}
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getTransactionSummary(tx)}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    +{formatCurrency(tx.type === 'sale' ? tx.grandTotal : (tx.type === 'service' ? tx.serviceFee : 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/transactions/${tx.id}`}>
                        <ViewIcon className="mr-1 h-4 w-4" /> Lihat
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}