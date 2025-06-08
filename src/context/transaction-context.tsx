
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transactionData: Omit<SaleTransaction, 'id'|'date'|'grandTotal'|'items'> & {items: Omit<SaleTransaction['items'][0],'id'|'total'>[]} | Omit<ServiceTransaction, 'id'|'date'> | Omit<ExpenseTransaction, 'id'|'date'>) => Transaction;
  getTransactionById: (id: string) => Transaction | undefined;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (IS_BROWSER) {
      const storedTransactions = localStorage.getItem('transactions');
      return storedTransactions ? JSON.parse(storedTransactions) : [];
    }
    return [];
  });

  useEffect(() => {
    if (IS_BROWSER) {
      localStorage.setItem('transactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  const addTransaction = useCallback((transactionData: Omit<SaleTransaction, 'id'|'date'|'grandTotal'|'items'> & {items: Omit<SaleTransaction['items'][0],'id'|'total'>[]} | Omit<ServiceTransaction, 'id'|'date'> | Omit<ExpenseTransaction, 'id'|'date'>) => {
    let newTransaction: Transaction;
    const commonData = { id: crypto.randomUUID(), date: new Date().toISOString() };

    if (transactionData.type === 'sale') {
      const itemsWithTotals = transactionData.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        total: item.quantity * item.pricePerItem
      }));
      const grandTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
      newTransaction = { ...commonData, ...transactionData, items: itemsWithTotals, grandTotal } as SaleTransaction;
    } else if (transactionData.type === 'service') {
      newTransaction = { ...commonData, ...transactionData } as ServiceTransaction;
    } else { // expense
      newTransaction = { ...commonData, ...transactionData } as ExpenseTransaction;
    }
    
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, []);

  const getTransactionById = useCallback((id: string) => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, getTransactionById }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
