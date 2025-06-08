
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { ListOrdered, Eye, Edit3, Trash2, Loader2, ShieldAlert, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

export default function ManageTransactionsPage() {
  const { transactions, deleteTransaction } = useTransactions();
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getTransactionSummary = (tx: Transaction) => {
    if (tx.type === 'sale') return `Sale: ${tx.items.map(i => i.name).join(', ')}`;
    if (tx.type === 'service') return `Service: ${tx.serviceName}`;
    if (tx.type === 'expense') return `Expense: ${tx.description}`;
    return 'Unknown';
  };

  const getTransactionAmount = (tx: Transaction) => {
    if (tx.type === 'sale') return tx.grandTotal;
    if (tx.type === 'service') return tx.serviceFee;
    if (tx.type === 'expense') return tx.amount;
    return 0;
  };

  const handleDelete = (transactionId: string) => {
    deleteTransaction(transactionId);
    // Toast is handled within deleteTransaction now
  };

  const handleEdit = (transactionId: string) => {
    router.push(`/admin/edit-transaction/${transactionId}`);
  };

  if (isLoadingAuth || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {isLoadingAuth ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <ShieldAlert className="h-12 w-12 text-destructive" />}
        <p className="text-muted-foreground">
          {isLoadingAuth ? 'Loading...' : 'Access Denied. Admins only.'}
        </p>
      </div>
    );
  }

  if (!isClient) {
    // Basic skeleton while client mounts
    return <div className="flex justify-center items-center h-64">Loading transactions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ListOrdered className="mr-2 h-6 w-6" /> Manage All Transactions
        </CardTitle>
        <CardDescription>View, edit, and delete all recorded transactions.</CardDescription>
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
                <TableHead>Description/ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Actions</TableHead>
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
                    <p className="text-xs text-muted-foreground">ID: {tx.id.substring(0,8)}</p>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'expense' ? 'text-destructive' : 'text-green-600'}`}>
                    {tx.type === 'expense' ? '-' : '+'}
                    {formatCurrency(getTransactionAmount(tx))}
                  </TableCell>
                  <TableCell className="text-right space-x-1 sm:space-x-2">
                    <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
                      <Link href={`/transactions/${tx.id}`}>
                        <Eye className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">View</span>
                      </Link>
                    </Button>
                    {tx.type === 'service' && (
                      <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
                        <Link href={`/admin/service-management/${tx.id}`} className="flex items-center justify-center">
                          <Settings className="h-4 w-4 sm:mr-1 shrink-0" /> 
                          <span className="hidden sm:inline">Manage</span>
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(tx.id)} className="px-2 sm:px-3">
                      <Edit3 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="px-2 sm:px-3">
                          <Trash2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the transaction:
                            <br /><strong>{getTransactionSummary(tx)}</strong>
                            <br />Amount: <strong>{formatCurrency(getTransactionAmount(tx))}</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tx.id)}>
                            Delete
                          </AlertDialogAction>
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
