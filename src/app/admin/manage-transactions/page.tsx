'use client';

import React, { useState, useTransition, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Konteks & Tipe Data
import { useTransactions } from '@/context/transaction-context';
import { useAuth } from '@/context/auth-context';
import type { Transaction, TransactionTypeFilter } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

// Komponen UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { ListOrdered, Eye, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Komponen Halaman Utama
export default function ManageTransactionsPage() {
  const { transactions, isLoading, pageCount, fetchData, deleteTransaction } = useTransactions();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const filters = useMemo(() => ({ customerName: debouncedNameFilter, type: typeFilter }), [debouncedNameFilter, typeFilter]);

  const columns: ColumnDef<Transaction>[] = React.useMemo(
    () => getColumns({ onSuccess: triggerRefresh, deleteTransaction }),
    [triggerRefresh, deleteTransaction]
  );

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" /><p>Akses Ditolak.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center"><ListOrdered className="mr-3 h-7 w-7" /> Kelola Transaksi</CardTitle>
            <CardDescription>Lihat dan kelola semua jenis transaksi yang tercatat dalam sistem.</CardDescription>
        </CardHeader>
        <CardContent className='max-w-full overflow-x-scroll'>
          <DataTable columns={columns} data={transactions} pageCount={pageCount} fetchData={fetchData} isLoading={isLoading} refreshTrigger={refreshTrigger} filters={filters}>
            <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan nama pelanggan..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TransactionTypeFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="sale">Penjualan</SelectItem>
                  <SelectItem value="service">Servis</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Definisi Kolom untuk DataTable ---
interface GetColumnsProps {
  onSuccess: () => void;
  deleteTransaction: (id: string) => Promise<boolean>;
}

const getColumns = ({ onSuccess, deleteTransaction }: GetColumnsProps): ColumnDef<Transaction>[] => [
  { accessorKey: 'created_at', header: ({ column }) => createSortableHeader(column, 'Tanggal'), cell: ({ row }) => format(parseISO(row.original.date), 'dd MMM yyyy HH:mm', { locale: LocaleID }) },
  { accessorKey: 'type', header: ({ column }) => createSortableHeader(column, 'Tipe'), cell: ({ row }) => (<Badge variant={row.original.type === 'expense' ? 'destructive' : row.original.type === 'sale' ? 'default' : 'secondary'} className="capitalize">{row.original.type}</Badge>) },
  { accessorKey: 'customer_name', header: ({ column }) => createSortableHeader(column, 'Pelanggan/Deskripsi'), cell: ({ row }) => {
        const tx = row.original;
        if (tx.type === 'sale') return tx.customerName || 'N/A';
        if (tx.type === 'service') return tx.customerName || 'N/A';
        if (tx.type === 'expense') return tx.description;
        return 'N/A';
    }
  },
  { accessorKey: 'total_amount', header: ({ column }) => createSortableHeader(column, 'Jumlah'), cell: ({ row }) => {
        const tx = row.original;
        const amount = (tx.type === 'sale' ? tx.grandTotal : tx.type === 'service' ? tx.serviceFee : tx.type === 'expense' ? tx.amount : 0);
        const isExpense = tx.type === 'expense';
        return (<div className={`text-right font-medium ${isExpense ? 'text-destructive' : 'text-green-600'}`}>{isExpense ? '-' : '+'}{formatCurrency(amount)}</div>);
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const transaction = row.original;
      return (
        <div className="text-right space-x-2">
          <ViewDetailsDialog transaction={transaction} />
          <DeleteDialog item={transaction} onSuccess={onSuccess} deleteTransaction={deleteTransaction} />
        </div>
      );
    },
  },
];

// --- Sub-komponen untuk Dialog View Details ---
function ViewDetailsDialog({ transaction }: { transaction: Transaction }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detail Transaksi</DialogTitle>
                    <DialogDescription>ID: {transaction.id}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-96 overflow-y-auto rounded-md bg-muted p-4"><pre><code>{JSON.stringify(transaction, null, 2)}</code></pre></div>
                 <DialogFooter><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Tutup</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Sub-komponen untuk AlertDialog Delete ---
interface DeleteDialogProps {
  item: Transaction;
  onSuccess: () => void;
  deleteTransaction: (id: string) => Promise<boolean>;
}

function DeleteDialog({ item, onSuccess, deleteTransaction }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const success = await deleteTransaction(item.id);
      if (success) onSuccess();
    });
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus transaksi ini secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
