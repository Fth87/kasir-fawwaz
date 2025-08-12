"use client";

import React, { useEffect, useState } from 'react';
import { getAllTransactions } from '@/app/transactions/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import { useReports } from './hooks/useReports';
import { ReportFilters } from './components/Filters';
import { PeriodRecap } from './components/PeriodRecaps';
import { MonthlyBarChart } from './components/MonthlyBarChart';
import { ExpensePieChart } from './components/ExpensesPieCharts';
import { TransactionDetailTable } from './components/TransactionDetailTable';
import { ReportSectionCard } from './components/ReportSectionCard';
import type { Transaction } from '@/types';


export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getAllTransactions().then(({ data }) => {
      if (data) {
        setTransactions(data);
      }
      setIsLoading(false);
    });
  }, []);

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
      
      <ReportSectionCard title="Rekap Periode">
        <PeriodRecap recap={rangeRecap} />
      </ReportSectionCard>
      
      <ReportSectionCard title="Grafik 6 Bulan Terakhir" className="h-[350px]">
        <MonthlyBarChart data={monthlyChartData} />
      </ReportSectionCard>

      {(transactionType === 'all' || transactionType === 'expense') && (
        <ReportSectionCard title="Rincian Pengeluaran" className="h-[350px]">
          <ExpensePieChart data={expenseBreakdownData} />
        </ReportSectionCard>
      )}

      <ReportSectionCard title="Detail Transaksi">
        <TransactionDetailTable transactions={filteredTransactions} />
      </ReportSectionCard>
    </div>
  );
}