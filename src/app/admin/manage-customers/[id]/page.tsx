'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Hooks & Server Actions
import { getTransactionsByCustomerId } from '@/app/transactions/actions';
import { getCustomerById } from '../actions';
import { useAuth } from '@/context/auth-context';

// Types
import type { Customer, Transaction } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserCircle, Phone, MapPin, FileText, ShoppingBag, Wrench, Loader2, ShieldAlert, Eye as ViewIcon } from 'lucide-react';

// Date & Formatting
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Helper Function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const customerId = params.id as string;

  useEffect(() => {
    if (customerId) {
        setIsLoading(true);
        Promise.all([
            getCustomerById(customerId),
            getTransactionsByCustomerId(customerId)
        ]).then(([customerResult, transactionResult]) => {
            if(customerResult.data) setCustomer(customerResult.data);
            if(transactionResult.data) setTransactions(transactionResult.data);
            setIsLoading(false);
        });
    }
  }, [customerId]);

  useEffect(() => {
    if (!isLoadingAuth && !isLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, isLoading, router]);

  if (isLoading || isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Akses Ditolak. Hanya untuk Admin.</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <Card className="max-w-md mx-auto text-center py-10">
        <CardHeader>
          <CardTitle>Pelanggan Tidak Ditemukan</CardTitle>
          <CardDescription>Data pelanggan yang Anda cari tidak ada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/admin/manage-customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Pelanggan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <CustomerInfoCard customer={customer} />
      <TransactionHistoryCard transactions={transactions} customerName={customer.name} />
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
          <div className="flex items-center gap-4">
            <UserCircle className="h-12 w-12 text-primary" />
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
      <CardContent className="space-y-6 pt-6 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customer.phone && <InfoItem icon={Phone} label="Telepon" value={customer.phone} />}
          {customer.address && <InfoItem icon={MapPin} label="Alamat" value={customer.address} className="md:col-span-2" />}
          {customer.notes && <InfoItem icon={FileText} label="Catatan" value={customer.notes} className="md:col-span-2" />}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value, className = '' }: { icon: React.ElementType; label: string; value: string; className?: string }) {
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

function TransactionHistoryCard({ transactions, customerName }: { transactions: Transaction[]; customerName: string }) {
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
          <div className="border rounded-md">
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
                    <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy, HH:mm', { locale: LocaleID })}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">
                        {tx.type === 'sale' ? <ShoppingBag className="mr-1 h-3 w-3" /> : <Wrench className="mr-1 h-3 w-3" />}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{getTransactionSummary(tx)}</p>
                      <p className="text-xs text-muted-foreground font-mono">ID: {tx.id.substring(0, 8)}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">+{formatCurrency(tx.type === 'sale' ? tx.grandTotal : tx.type === 'service' ? tx.serviceFee : 0)}</TableCell>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
