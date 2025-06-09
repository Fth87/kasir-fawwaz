
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomers } from '@/context/customer-context';
import { useTransactions } from '@/context/transaction-context';
import type { Customer, Transaction, SaleTransaction, ServiceTransaction } from '@/types';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, UserCircle, Phone, Mail, MapPin, FileText, ShoppingBag, Wrench, Loader2, ShieldAlert, Edit3, Eye as ViewIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getCustomerById } = useCustomers();
  const { transactions: allTransactions } = useTransactions();
  const { currentUser, isLoadingAuth } = useAuth();

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);

  const customerId = params.id as string;

  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  useEffect(() => {
    if (customerId) {
      const foundCustomer = getCustomerById(customerId);
      setCustomer(foundCustomer);
    }
  }, [customerId, getCustomerById]);

  const customerTransactions = useMemo(() => {
    if (!customer) return [];
    return allTransactions.filter(tx => {
      if (tx.type === 'sale') {
        return tx.customerName?.toLowerCase() === customer.name.toLowerCase() || tx.customerId === customer.id;
      }
      if (tx.type === 'service') {
        const serviceTx = tx as ServiceTransaction;
        const nameMatch = serviceTx.customerName?.toLowerCase() === customer.name.toLowerCase();
        const phoneMatch = customer.phone && serviceTx.customerPhone === customer.phone;
        return serviceTx.customerId === customer.id || (nameMatch && (phoneMatch || !customer.phone)); // Match if ID or Name and Phone (if customer has phone)
      }
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customer, allTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getTransactionSummary = (tx: Transaction) => {
    if (tx.type === 'sale') return `Sale: ${tx.items.map(i => i.name).join(', ')}`;
    if (tx.type === 'service') return `Service: ${tx.serviceName}`;
    if (tx.type === 'expense') return `Expense: ${tx.description}`; // Should not appear here
    return 'Unknown';
  };
  
  const getTransactionAmount = (tx: Transaction) => {
    if (tx.type === 'sale') return tx.grandTotal;
    if (tx.type === 'service') return tx.serviceFee;
    return 0;
  };


  if (isLoadingAuth || customer === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {isLoadingAuth ? 'Loading authentication...' : 'Loading customer details...'}
        </p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
     return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Access Denied. Admins only.</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Customer Not Found</h2>
        <Button onClick={() => router.push('/admin/manage-customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customer List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCircle className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl font-headline">{customer.name}</CardTitle>
                <CardDescription>Customer since {format(parseISO(customer.createdAt), 'dd MMMM yyyy', { locale: LocaleID })}</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/admin/manage-customers')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium whitespace-pre-wrap">{customer.address}</p>
                </div>
              </div>
            )}
            {customer.notes && (
              <div className="flex items-start gap-3 md:col-span-2">
                <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {format(parseISO(customer.updatedAt), 'dd MMM yyyy, HH:mm', { locale: LocaleID })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Transaction History</CardTitle>
          <CardDescription>Sales and services associated with {customer.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {customerTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions found for this customer.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description/ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy HH:mm', { locale: LocaleID })}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">
                        {tx.type === 'sale' ? <ShoppingBag className="mr-1 h-3 w-3"/> : <Wrench className="mr-1 h-3 w-3"/>}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getTransactionSummary(tx)}
                      <p className="text-xs text-muted-foreground">ID: {tx.id.substring(0,8)}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      +{formatCurrency(getTransactionAmount(tx))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/transactions/${tx.id}`}>
                          <ViewIcon className="mr-1 h-4 w-4" /> View
                        </Link>
                      </Button>
                       <Button asChild variant="outline" size="sm" className="ml-2">
                        <Link href={`/admin/edit-transaction/${tx.id}`}>
                          <Edit3 className="mr-1 h-4 w-4" /> Edit
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
    </div>
  );
}
