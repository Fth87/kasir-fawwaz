
"use client";

import React from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollText, Eye, Settings, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TransactionsPage() {
  const { transactions,isLoading } = useTransactions();

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

    if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ScrollText className="mr-2 h-6 w-6" /> All Transactions
        </CardTitle>
        <CardDescription>View all recorded sales, services, and expenses. You can also manage service progress from here.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No transactions recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (IDR)</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <Badge variant={tx.type === 'expense' ? 'destructive' : tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getTransactionSummary(tx)}</TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'expense' ? 'text-destructive' : 'text-green-600'}`}>
                    {tx.type === 'expense' ? '-' : '+'}
                    {formatCurrency(getTransactionAmount(tx))}
                  </TableCell>
                  <TableCell className="text-right space-x-2 space-y-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/transactions/${tx.id}`}>
                        <Eye className="mr-1 h-4 w-4" /> View Receipt
                      </Link>
                    </Button>
                    {tx.type === 'service' && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/service-management/${tx.id}`} className="flex items-center justify-center">
                          <Settings className="mr-1 h-4 w-4 shrink-0" /> 
                          <span>Manage</span>
                        </Link>
                      </Button>
                    )}
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
