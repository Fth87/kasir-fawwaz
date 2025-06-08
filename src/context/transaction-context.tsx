
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction, ServiceStatusValue, ProgressNote } from '@/types';
import { ServiceStatusOptions } from '@/types';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transactionData: Omit<SaleTransaction, 'id'|'date'|'grandTotal'|'items'> & {items: Omit<SaleTransaction['items'][0],'id'|'total'>[]} | Omit<ServiceTransaction, 'id'|'date'|'status'|'progressNotes'> | Omit<ExpenseTransaction, 'id'|'date'>) => Transaction;
  getTransactionById: (id: string) => Transaction | undefined;
  updateServiceProgress: (transactionId: string, status: ServiceStatusValue, newNoteText?: string) => ServiceTransaction | undefined;
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

  const addTransaction = useCallback((transactionData: Omit<SaleTransaction, 'id'|'date'|'grandTotal'|'items'> & {items: Omit<SaleTransaction['items'][0],'id'|'total'>[]} | Omit<ServiceTransaction, 'id'|'date'|'status'|'progressNotes'> | Omit<ExpenseTransaction, 'id'|'date'>) => {
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
      newTransaction = {
        ...commonData,
        ...transactionData,
        status: ServiceStatusOptions[0].value, // Default status
        progressNotes: []
      } as ServiceTransaction;
    } else { // expense
      newTransaction = { ...commonData, ...transactionData } as ExpenseTransaction;
    }

    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, []);

  const getTransactionById = useCallback((id: string) => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

  const updateServiceProgress = useCallback((transactionId: string, status: ServiceStatusValue, newNoteText?: string): ServiceTransaction | undefined => {
    if (!transactionId) {
      return undefined;
    }

    const currentTransactions = transactions;
    const transactionIndex = currentTransactions.findIndex(tx => tx.id === transactionId && tx.type === 'service');

    if (transactionIndex === -1) {
      // Transaction not found or not a service
      return undefined;
    }

    const originalTransaction = currentTransactions[transactionIndex] as ServiceTransaction;

    const trimmedNewNoteText = newNoteText?.trim();
    const noteAdded = !!(trimmedNewNoteText && trimmedNewNoteText !== "");
    const statusChanged = status !== originalTransaction.status;

    // If nothing actually changed, return the original transaction
    if (!noteAdded && !statusChanged) {
      return originalTransaction;
    }

    const newProgressNotes = [...originalTransaction.progressNotes];
    if (noteAdded) {
      newProgressNotes.push({
        id: crypto.randomUUID(),
        note: trimmedNewNoteText!,
        timestamp: new Date().toISOString(),
      });
    }

    const updatedTransaction: ServiceTransaction = {
      ...originalTransaction,
      status,
      progressNotes: newProgressNotes,
    };
    
    setTransactions(prev => 
      prev.map(tx => (tx.id === transactionId ? updatedTransaction : tx))
    );

    return updatedTransaction;
  }, [transactions, setTransactions]);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, getTransactionById, updateServiceProgress }}>
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
