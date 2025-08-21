'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Transaction, TransactionTypeFilter, ServiceTransaction } from '@/types';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Settings, MessageCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTransactionStore } from '@/stores/transaction.store';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toWhatsAppLink } from '@/utils/whatsapp';

// Helper functions (can be moved to a utils file if needed)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

const getTransactionSummary = (tx: Transaction) => {
  if (tx.type === 'sale') return `${tx.items.map(i => i.name).join(', ')} (${tx.items.reduce((sum, i) => sum + i.quantity, 0)} items)`;
  if (tx.type === 'service') return tx.serviceName;
  if (tx.type === 'expense') return tx.description;
  return 'Unknown Transaction';
};

const getTransactionAmount = (tx: Transaction) => {
  if (tx.type === 'sale') return tx.grandTotal;
  if (tx.type === 'service') return tx.serviceFee;
  if (tx.type === 'expense') return tx.amount;
  return 0;
};

interface TransactionsTableProps {
  initialData: Transaction[];
  initialPageCount: number;
}

export function TransactionsTable({ initialData, initialPageCount }: TransactionsTableProps) {
  const { transactions, isLoading, pageCount: storePageCount, fetchData } = useTransactionStore();
  const currentUser = useAuthStore((s) => s.user);

  // filter states
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');

  const handleSearch = () => setSearch(searchInput);

  // Data from store or initial
  const data = !isLoading || transactions.length > 0 ? transactions : initialData;
  const count = !isLoading && storePageCount > 0 ? storePageCount : initialPageCount;

  // Filters passed to table fetcher
  const filters = useMemo(() => ({
    search: search || undefined,
    type: typeFilter,
  }), [search, typeFilter]);

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'date',
      header: ({ column }) => createSortableHeader(column, 'Date'),
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString('id-ID'),
    },
    {
      accessorKey: 'customerName',
      header: 'Pelanggan',
      cell: ({ row }) => row.original.customerName || '-',
    },
    {
      id: 'device',
      header: 'Device',
      cell: ({ row }) => row.original.type === 'service' ? (row.original as ServiceTransaction).device : '-',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <Badge variant={tx.type === 'expense' ? 'destructive' : tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">
            {tx.type}
          </Badge>
        );
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => getTransactionSummary(row.original),
    },
    {
      id: 'amount',
      header: ({ column }) => createSortableHeader(column, 'Amount (IDR)'),
      cell: ({ row }) => {
        const tx = row.original;
        const amount = getTransactionAmount(tx);
        return (
          <div className={`text-right font-medium ${tx.type === 'expense' ? 'text-destructive' : 'text-green-600'}`}>
            {tx.type === 'expense' ? '-' : '+'}
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const tx = row.original;
        const phone = tx.type === 'service' ? (tx as ServiceTransaction).customerPhone : undefined;
        return (
          <div className="text-right space-x-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/transactions/${tx.id}`}>
                <Eye className="mr-1 h-4 w-4" /> View
              </Link>
            </Button>
            {tx.type === 'service' && phone && (
              <Button asChild variant="outline" size="sm">
                <Link href={toWhatsAppLink(phone)} target="_blank">
                  <MessageCircle className="mr-1 h-4 w-4" /> Chat
                </Link>
              </Button>
            )}
            {tx.type === 'service' && currentUser?.role === 'admin' && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/service-management/${tx.id}`}>
                  <Settings className="mr-1 h-4 w-4" /> Manage
                </Link>
              </Button>
            )}
          </div>
        );
      },
    },
  ], [currentUser]);

  return (
    <DataTable
      columns={columns}
      data={data}
      pageCount={count}
      fetchData={fetchData}
      isLoading={isLoading}
      filters={filters}
      refreshTrigger={0}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex w-full gap-2 sm:max-w-xs">
          <Input
            placeholder="Cari pelanggan, device, deskripsi, layanan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} className="px-3">
            Cari
          </Button>
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionTypeFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="sale">Penjualan</SelectItem>
            <SelectItem value="service">Servis</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </DataTable>
  );
}
