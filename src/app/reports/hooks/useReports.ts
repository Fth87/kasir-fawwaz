// hooks/useReports.ts
import { useMemo, useState } from 'react';
import type { Transaction, MonthlySummary, TransactionTypeFilter } from '@/types';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, addDays, subMonths, eachMonthOfInterval, format } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

/**
 * Custom hook untuk mengelola semua logika kalkulasi dan filter untuk halaman laporan.
 * @param transactions - Array data transaksi mentah.
 * @returns State dan data yang sudah diproses untuk ditampilkan di UI.
 */
export function useReports(transactions: Transaction[]) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = parseISO(tx.date);
      const { from, to } = dateRange || {};
      
      if (!from || !to) return false; // Pastikan rentang tanggal valid
      
      const isDateInRange = isWithinInterval(txDate, { start: from, end: addDays(to, 1) });
      const isCorrectType = transactionType === 'all' || tx.type === transactionType;
      
      return isDateInRange && isCorrectType;
    });
  }, [transactions, dateRange, transactionType]);

  const rangeRecap = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.type === 'sale') acc.totalSales += tx.grandTotal;
      if (tx.type === 'service') acc.totalServices += tx.serviceFee;
      if (tx.type === 'expense') acc.totalExpenses += tx.amount;
      return acc;
    }, { totalSales: 0, totalServices: 0, totalExpenses: 0 });
  }, [filteredTransactions]);

  const { totalSales, totalServices, totalExpenses } = rangeRecap;
  const totalRevenue = totalSales + totalServices;
  const profit = totalRevenue - totalExpenses;

  const monthlyChartData = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5); // 6 bulan termasuk bulan ini
    
    return eachMonthOfInterval({ start, end }).map(monthStart => {
      const monthLabel = format(monthStart, 'MMM yy', { locale: LocaleID });
      
      const monthlyTotals = transactions.reduce((acc, tx) => {
        if (format(parseISO(tx.date), 'yyyy-MM') === format(monthStart, 'yyyy-MM')) {
          if (tx.type === 'sale') acc.sales += tx.grandTotal;
          if (tx.type === 'service') acc.services += tx.serviceFee;
          if (tx.type === 'expense') acc.expenses += tx.amount;
        }
        return acc;
      }, { sales: 0, services: 0, expenses: 0 });

      return { 
        month: monthLabel, 
        ...monthlyTotals,
        profit: monthlyTotals.sales + monthlyTotals.services - monthlyTotals.expenses,
      };
    });
  }, [transactions]);

  const expenseBreakdownData = useMemo(() => {
    const expenseMap = filteredTransactions.reduce((acc, tx) => {
      if (tx.type === 'expense') {
        const category = tx.category || 'Lain-lain';
        acc[category] = (acc[category] || 0) + tx.amount;
      }
      return acc;
    }, {} as { [key: string]: number });
    
    return Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  return {
    dateRange,
    setDateRange,
    transactionType,
    setTransactionType,
    filteredTransactions,
    rangeRecap: { totalRevenue, totalSales, totalServices, totalExpenses, profit },
    monthlyChartData,
    expenseBreakdownData,
  };
}