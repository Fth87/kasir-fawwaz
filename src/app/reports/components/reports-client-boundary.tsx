'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { useReports } from '../hooks/useReports';
import { ReportFilters } from './Filters';
import { PeriodRecap } from './PeriodRecaps';
import { MonthlyBarChart } from './MonthlyBarChart';
import { ExpensePieChart } from './ExpensesPieCharts';
import { TransactionDetailTable } from './TransactionDetailTable';
import { ReportSectionCard } from './ReportSectionCard';
import type { Transaction } from '@/types';

interface ReportsClientBoundaryProps {
  initialTransactions: Transaction[];
}

export function ReportsClientBoundary({ initialTransactions }: ReportsClientBoundaryProps) {
  const {
    dateRange,
    setDateRange,
    transactionType,
    setTransactionType,
    filteredTransactions,
    rangeRecap,
    monthlyChartData,
    expenseBreakdownData,
  } = useReports(initialTransactions);

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
