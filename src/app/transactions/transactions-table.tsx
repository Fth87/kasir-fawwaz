'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction } from '@/types';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Settings } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

// Helper functions (can be moved to a utils file if needed)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

const getTransactionSummary = (tx: Transaction) => {
  if (tx.type === 'sale') return `Sale: ${tx.items.map(i => i.name).join(', ')} (${tx.items.reduce((sum, i) => sum + i.quantity, 0)} items)`;
  if (tx.type === 'service') return `Service: ${tx.serviceName}`;
  if (tx.type === 'expense') return `Expense: ${tx.description}`;
  return 'Unknown Transaction';
};

const getTransactionAmount = (tx: Transaction) => {
  if (tx.type === 'sale') return tx.grandTotal;
  if (tx.type === 'service') return tx.serviceFee;
  if (tx.type === 'expense') return tx.amount;
  return 0;
};

// Column Definitions
const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => createSortableHeader(column, 'Date'),
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString('id-ID'),
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
      return (
        <div className="text-right space-x-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/transactions/${tx.id}`}>
              <Eye className="mr-1 h-4 w-4" /> View
            </Link>
          </Button>
          {tx.type === 'service' && (
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
];

interface TransactionsTableProps {
  initialData: Transaction[];
  initialPageCount: number;
}

export function TransactionsTable({ initialData, initialPageCount }: TransactionsTableProps) {
  const { transactions, isLoading, pageCount, fetchData } = useTransactions();

  // Use context data if available, otherwise fall back to initial props
  const data = transactions.length > 0 ? transactions : initialData;
  const count = pageCount > 0 ? pageCount : initialPageCount;

  // Memoize the filters object to prevent re-creating it on every render,
  // which would cause an infinite loop in the DataTable's useEffect hook.
  const filters = useMemo(() => ({}), []);

  return (
    <DataTable
      columns={columns}
      data={data}
      pageCount={count}
      fetchData={fetchData}
      isLoading={isLoading}
      filters={filters}
      refreshTrigger={0} // Placeholder
    />
  );
}
