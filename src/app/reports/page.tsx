"use client";

import React from 'react';
import { useTransactions } from '@/context/transaction-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import { useReports } from './hooks/useReports';
import { ReportFilters } from './components/Filters';
import { PeriodRecap } from './components/PeriodRecaps';
import { MonthlyBarChart } from './components/MonthlyBarChart';
import { ExpensePieChart } from './components/ExpensesPieCharts';
import { TransactionDetailTable } from './components/TransactionDetailTable';


export default function ReportsPage() {
  const { transactions, isLoading } = useTransactions();
  const {
    dateRange,
    setDateRange,
    transactionType,
    setTransactionType,
    filteredTransactions,
    rangeRecap,
    monthlyChartData,
    expenseBreakdownData,
  } = useReports(transactions);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <CardContent>
          <ReportFilters
            dateRange={dateRange}
            onDateChange={setDateRange}
            transactionType={transactionType}
            onTypeChange={setTransactionType}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Rekap Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodRecap recap={rangeRecap} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Grafik 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <MonthlyBarChart data={monthlyChartData} />
        </CardContent>
      </Card>

      {(transactionType === 'all' || transactionType === 'expense') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline">Rincian Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ExpensePieChart data={expenseBreakdownData} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">Detail Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionDetailTable transactions={filteredTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}