'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShoppingCart, Wrench, BadgeDollarSign, ScrollText, Lightbulb, ArrowRight } from 'lucide-react';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction } from '@/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { transactions } = useTransactions();
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalServices: 0,
    totalExpenses: 0,
    transactionCount: 0,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let sales = 0;
    let services = 0;
    let expenses = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'sale') sales += tx.grandTotal;
      if (tx.type === 'service') services += tx.serviceFee;
      if (tx.type === 'expense') expenses += tx.amount;
    });
    setSummary({
      totalSales: sales,
      totalServices: services,
      totalExpenses: expenses,
      transactionCount: transactions.length,
    });
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Kasir Konter. Manage your sales, services, and expenses.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/sales">
            New Transaction <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Sales)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
            <p className="text-xs text-muted-foreground">From sales transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Services)</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalServices)}</div>
            <p className="text-xs text-muted-foreground">From service transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Total recorded expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.transactionCount}</div>
            <p className="text-xs text-muted-foreground">All recorded transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>Quickly access common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" asChild className="w-full">
              <Link href="/sales">
                <ShoppingCart className="mr-2 h-4 w-4" /> Record Sale
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/services">
                <Wrench className="mr-2 h-4 w-4" /> Record Service
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/expenses">
                <BadgeDollarSign className="mr-2 h-4 w-4" /> Record Expense
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/recommendations">
                <Lightbulb className="mr-2 h-4 w-4" /> Price AI
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>Showing last 5 transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isClient ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-secondary/50">
                    <div>
                      <span className="font-medium">
                        {tx.type === 'sale' && `Sale: ${tx.items.map((i) => i.name).join(', ')}`}
                        {tx.type === 'service' && `Service: ${tx.serviceName}`}
                        {tx.type === 'expense' && `Expense: ${tx.description}`}
                      </span>
                      <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span className={`font-semibold ${tx.type === 'expense' ? 'text-destructive' : 'text-green-600'}`}>
                      {tx.type === 'sale' && `+${formatCurrency(tx.grandTotal)}`}
                      {tx.type === 'service' && `+${formatCurrency(tx.serviceFee)}`}
                      {tx.type === 'expense' && `-${formatCurrency(tx.amount)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {isClient && transactions.length > 5 && (
              <Button variant="link" asChild className="mt-2 p-0 h-auto">
                <Link href="/transactions">View all transactions</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
