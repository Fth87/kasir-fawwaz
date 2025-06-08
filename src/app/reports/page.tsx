
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction, MonthlySummary, TransactionTypeFilter } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react';
import { format, parseISO, getMonth, getYear, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const { transactions } = useTransactions();
  const [isClient, setIsClient] = useState(false);

  const availableMonths = useMemo(() => {
    if (transactions.length === 0) {
      const now = new Date();
      return [{ value: format(now, 'yyyy-MM'), label: format(now, 'MMMM yyyy', { locale: LocaleID }) }];
    }
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldestDate = parseISO(sortedTransactions[0].date);
    const newestDate = new Date(); // Use current date as newest for month options
    
    const months = eachMonthOfInterval({
      start: oldestDate,
      end: newestDate,
    });

    return months
      .map(monthStart => ({
        value: format(monthStart, 'yyyy-MM'),
        label: format(monthStart, 'MMMM yyyy', { locale: LocaleID }),
      }))
      .reverse(); // Newest first
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]?.value || format(new Date(), 'yyyy-MM'));
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>('all');

  useEffect(() => {
    setIsClient(true);
    // Ensure selectedMonth is updated if availableMonths changes and current selectedMonth is not in new list
    if (availableMonths.length > 0 && !availableMonths.find(m => m.value === selectedMonth)) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableMonths, selectedMonth]);


  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = parseISO(tx.date);
      const [year, month] = selectedMonth.split('-').map(Number);
      const isSameMonth = getYear(txDate) === year && (getMonth(txDate) + 1) === month;
      const isCorrectType = transactionType === 'all' || tx.type === transactionType;
      return isSameMonth && isCorrectType;
    });
  }, [transactions, selectedMonth, transactionType]);

  const monthlyRecap = useMemo(() => {
    let totalSales = 0;
    let totalServices = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'sale') totalSales += tx.grandTotal;
      if (tx.type === 'service') totalServices += tx.serviceFee;
      if (tx.type === 'expense') totalExpenses += tx.amount;
    });
    const totalRevenue = totalSales + totalServices;
    const profit = totalRevenue - totalExpenses;
    return { totalRevenue, totalSales, totalServices, totalExpenses, profit };
  }, [filteredTransactions]);

  const monthlyChartData: MonthlySummary[] = useMemo(() => {
    const lastNMonths = 6; // Show data for the last 6 months including current
    const end = new Date();
    const start = subMonths(end, lastNMonths -1);
    
    const monthsInterval = eachMonthOfInterval({ start, end });

    return monthsInterval.map(monthStart => {
        const monthKey = format(monthStart, 'yyyy-MM');
        const monthLabel = format(monthStart, 'MMM yy', { locale: LocaleID });
        
        let sales = 0;
        let services = 0;
        let expenses = 0;

        transactions.forEach(tx => {
            if (format(parseISO(tx.date), 'yyyy-MM') === monthKey) {
                if (tx.type === 'sale') sales += tx.grandTotal;
                if (tx.type === 'service') services += tx.serviceFee;
                if (tx.type === 'expense') expenses += tx.amount;
            }
        });
        return { month: monthLabel, sales, services, expenses, profit: sales + services - expenses };
    }).reverse(); // Newest first for chart display
  }, [transactions]);
  
  const expenseBreakdownData = useMemo(() => {
    const expenseMap: { [key: string]: number } = {};
    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        const category = tx.category || 'Uncategorized';
        expenseMap[category] = (expenseMap[category] || 0) + tx.amount;
      }
    });
    return Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);


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

  if (!isClient) {
    return (
        <div className="flex flex-col gap-6">
            <div className="animate-pulse bg-muted h-10 w-48 rounded-md"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse"><CardHeader><div className="h-4 bg-muted rounded w-3/4"></div></CardHeader><CardContent><div className="h-8 bg-muted rounded w-1/2"></div></CardContent></Card>)}
            </div>
            <Card className="animate-pulse"><CardHeader><div className="h-6 bg-muted rounded w-1/4 mb-2"></div></CardHeader><CardContent><div className="h-64 bg-muted rounded"></div></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BarChart3 className="mr-2 h-6 w-6" /> Laporan Transaksi
          </CardTitle>
          <CardDescription>Analisis transaksi penjualan, servis, dan pengeluaran Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center border p-4 rounded-lg bg-secondary/30">
            <Filter className="h-5 w-5 text-muted-foreground hidden sm:block"/>
            <div className="w-full sm:w-auto">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionTypeFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipe Transaksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="sale">Penjualan</SelectItem>
                  <SelectItem value="service">Servis</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Unduh Laporan (CSV)
            </Button> */}
          </div>

          <CardTitle className="text-xl font-headline pt-4">Rekap Bulan: {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: LocaleID })}</CardTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthlyRecap.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendapatan (Penjualan)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthlyRecap.totalSales)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendapatan (Servis)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthlyRecap.totalServices)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthlyRecap.totalExpenses)}</div>
              </CardContent>
            </Card>
             <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Keuntungan Bersih</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${monthlyRecap.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(monthlyRecap.profit)}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Grafik Pendapatan vs Pengeluaran (6 Bulan Terakhir)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData.slice().reverse()}> {/* reverse for chronological order on chart */}
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="sales" stackId="revenue" fill="hsl(var(--chart-1))" name="Penjualan" />
              <Bar dataKey="services" stackId="revenue" fill="hsl(var(--chart-2))" name="Servis" />
              <Bar dataKey="expenses" fill="hsl(var(--chart-4))" name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {transactionType === 'all' || transactionType === 'expense' ? (
        <Card>
            <CardHeader>
            <CardTitle className="text-xl font-headline">Rincian Pengeluaran Bulan: {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: LocaleID })}</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
            {expenseBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={expenseBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    >
                    {expenseBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-muted-foreground text-center py-8">Tidak ada data pengeluaran untuk bulan ini.</p>
            )}
            </CardContent>
        </Card>
      ) : null}


      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Detail Transaksi: {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: LocaleID })} {transactionType !== 'all' ? `(${transactionType})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Tidak ada transaksi untuk periode dan tipe yang dipilih.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy HH:mm', { locale: LocaleID })}</TableCell>
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
