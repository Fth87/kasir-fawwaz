
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction, ServiceStatusValue, ProgressNote } from '@/types';
import { ServiceStatusOptions } from '@/types';

// Define more specific types for addTransaction input based on transaction type
type AddSaleTransactionInput = Omit<SaleTransaction, 'id'|'date'|'grandTotal'|'items'> & {items: Omit<SaleTransaction['items'][0],'id'|'total'>[]};
type AddServiceTransactionInput = Omit<ServiceTransaction, 'id'|'date'|'status'|'progressNotes'>;
type AddExpenseTransactionInput = Omit<ExpenseTransaction, 'id'|'date'>;

type AddTransactionInput = AddSaleTransactionInput | AddServiceTransactionInput | AddExpenseTransactionInput;


interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transactionData: AddTransactionInput) => Transaction;
  getTransactionById: (id: string) => Transaction | undefined;
  updateServiceProgress: (transactionId: string, status: ServiceStatusValue, newNoteText?: string) => ServiceTransaction | undefined;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (IS_BROWSER) {
      const storedTransactions = localStorage.getItem('transactions');
      try {
        return storedTransactions ? JSON.parse(storedTransactions) : [];
      } catch (e) {
        console.error("Failed to parse transactions from localStorage", e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (IS_BROWSER) {
      localStorage.setItem('transactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  const addTransaction = useCallback((transactionData: AddTransactionInput): Transaction => {
    let newTransaction: Transaction;
    const commonData = { id: crypto.randomUUID(), date: new Date().toISOString() };

    if (transactionData.type === 'sale') {
      const saleData = transactionData as AddSaleTransactionInput;
      const itemsWithTotals = saleData.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        total: item.quantity * item.pricePerItem
      }));
      const grandTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
      newTransaction = { ...commonData, ...saleData, items: itemsWithTotals, grandTotal } as SaleTransaction;
    } else if (transactionData.type === 'service') {
      const serviceData = transactionData as AddServiceTransactionInput;
      newTransaction = {
        ...commonData,
        ...serviceData,
        status: ServiceStatusOptions[0].value, // Default status
        progressNotes: []
      } as ServiceTransaction;
    } else { // expense
      const expenseData = transactionData as AddExpenseTransactionInput;
      newTransaction = { ...commonData, ...expenseData } as ExpenseTransaction;
    }

    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, []);

  const getTransactionById = useCallback((id: string) => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

 const updateServiceProgress = useCallback((transactionId: string, status: ServiceStatusValue, newNoteText?: string): ServiceTransaction | undefined => {
    let successfullyUpdatedTransaction: ServiceTransaction | undefined = undefined;

    setTransactions(prevTransactions => {
      const transactionIndex = prevTransactions.findIndex(tx => tx.id === transactionId && tx.type === 'service');

      if (transactionIndex === -1) {
        // Transaction not found or not a service, return previous state
        return prevTransactions;
      }

      const originalTransaction = prevTransactions[transactionIndex] as ServiceTransaction;

      const trimmedNewNoteText = newNoteText?.trim();
      const noteAdded = !!(trimmedNewNoteText && trimmedNewNoteText !== "");
      const statusChanged = status !== originalTransaction.status;

      if (!noteAdded && !statusChanged) {
        // Nothing actually changed, store original transaction for return, and return previous state
        successfullyUpdatedTransaction = originalTransaction;
        return prevTransactions;
      }

      const newProgressNotes = [...(originalTransaction.progressNotes || [])];
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
      
      successfullyUpdatedTransaction = updatedTransaction; // Store for return

      const newTransactions = [...prevTransactions];
      newTransactions[transactionIndex] = updatedTransaction;
      return newTransactions;
    });
    
    return successfullyUpdatedTransaction;
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
