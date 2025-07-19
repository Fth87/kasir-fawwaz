'use client';

import React, { useTransition } from 'react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Hooks & Contexts
import { useTransactions } from '@/context/transaction-context';
import { useEffect } from 'react';

import { AppUser, useAuth } from '@/context/auth-context';

// Types
import type { Transaction } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ListOrdered, Eye, Edit3, Trash2, Loader2, ShieldAlert, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const getTransactionSummary = (tx: Transaction) => {
  if (tx.type === 'sale') return `Penjualan: ${tx.items.length} barang`;
  if (tx.type === 'service') return `Servis: ${tx.serviceName}`;
  if (tx.type === 'expense') return `Pengeluaran: ${tx.description}`;
  return 'Tipe Tidak Dikenal';
};

const getTransactionAmount = (tx: Transaction) => {
  if (tx.type === 'sale') return tx.grandTotal;
  if (tx.type === 'service') return tx.serviceFee;
  if (tx.type === 'expense') return tx.amount;
  return 0;
};

export default function ManageTransactionsPage() {
  // Ambil isLoading dari context untuk menampilkan status loading
  const { transactions, isLoading, deleteTransaction } = useTransactions();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Proteksi rute bisa lebih sederhana
  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  // Fungsi hapus sekarang async dan menggunakan useTransition
  const handleDelete = (transactionId: string) => {
    startTransition(async () => {
      await deleteTransaction(transactionId);
      // Toast sudah ditangani di dalam deleteTransaction
    });
  };

  const handleEdit = (transactionId: string) => {
    // Navigasi ke halaman edit (asumsi halaman ini akan Anda buat)
    router.push(`/admin/edit-transaction/${transactionId}`);
  };

  // State loading terpusat
  if (isLoadingAuth || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // State akses ditolak
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Akses Ditolak. Hanya untuk Admin.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ListOrdered className="mr-2 h-6 w-6" /> Kelola Semua Transaksi
        </CardTitle>
        <CardDescription>Lihat, ubah, dan hapus semua transaksi yang tercatat.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Belum ada transaksi yang tercatat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Deskripsi/ID</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy HH:mm', { locale: LocaleID })}</TableCell>
                  <TableCell>
                    <Badge variant={tx.type === 'expense' ? 'destructive' : tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getTransactionSummary(tx)}
                    <p className="text-xs text-muted-foreground">ID: {tx.id.substring(0, 8)}</p>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'expense' ? 'text-destructive' : 'text-green-600'}`}>
                    {tx.type === 'expense' ? '-' : '+'}
                    {formatCurrency(getTransactionAmount(tx))}
                  </TableCell>
                  <TableCell className="text-right space-x-1 sm:space-x-2 space-y-2">
                    <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
                      <Link href={`/transactions/${tx.id}`}>
                        <Eye className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Lihat</span>
                      </Link>
                    </Button>
                    {/* Placeholder untuk tombol Edit & Manage Service */}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(tx.id)} className="px-2 sm:px-3">
                      <Edit3 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="px-2 sm:px-3" disabled={isPending}>
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 sm:mr-1" />}
                          <span className="hidden sm:inline">Hapus</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                          <AlertDialogDescription>Aksi ini tidak dapat dibatalkan. Ini akan menghapus transaksi secara permanen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tx.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

