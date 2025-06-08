
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction, ServiceStatusValue, ProgressNote } from '@/types';
import { ServiceStatusOptions } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
  deleteTransaction: (transactionId: string) => boolean;
  // Conceptual edit transaction - for full implementation, this would be more complex
  updateTransactionDetails: (transactionId: string, updates: Partial<Transaction>) => Transaction | undefined;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
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

    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return newTransaction;
  }, []);

  const getTransactionById = useCallback((id: string) => {
    return transactions.find(tx => tx.id === id);
  }, [transactions]);

  const updateServiceProgress = useCallback((transactionId: string, status: ServiceStatusValue, newNoteText?: string): ServiceTransaction | undefined => {
    const transactionIndex = transactions.findIndex(tx => tx.id === transactionId && tx.type === 'service');

    if (transactionIndex === -1) {
      return undefined;
    }

    const originalTransaction = transactions[transactionIndex] as ServiceTransaction;

    const trimmedNewNoteText = newNoteText?.trim();
    const noteAdded = !!(trimmedNewNoteText && trimmedNewNoteText !== "");
    const statusChanged = status !== originalTransaction.status;

    if (!noteAdded && !statusChanged) {
      return originalTransaction; // Nothing actually changed
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
    
    const newTransactions = [...transactions];
    newTransactions[transactionIndex] = updatedTransaction;
    setTransactions(newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return updatedTransaction;
  }, [transactions, setTransactions]);

  const deleteTransaction = useCallback((transactionId: string): boolean => {
    const initialLength = transactions.length;
    setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
    if (transactions.length < initialLength) {
        toast({ title: "Transaction Deleted", description: "The transaction has been successfully deleted." });
        return true;
    }
    toast({ title: "Error", description: "Failed to delete transaction or transaction not found.", variant: "destructive" });
    return false;
  }, [transactions, setTransactions, toast]);

  // Conceptual: Update transaction details.
  // A full implementation would require forms and validation for each transaction type.
  const updateTransactionDetails = useCallback((transactionId: string, updates: Partial<Transaction>): Transaction | undefined => {
    const transactionIndex = transactions.findIndex(tx => tx.id === transactionId);

    if (transactionIndex === -1) {
      toast({ title: "Error", description: "Transaction not found for editing.", variant: "destructive" });
      return undefined;
    }

    const originalTransaction = transactions[transactionIndex];
    // Simple merge for conceptual update. Real edit would be more nuanced.
    const updatedTransaction = { ...originalTransaction, ...updates, date: originalTransaction.date }; // Keep original date unless explicitly changed

    // Perform type-specific updates if necessary, e.g., recalculating grandTotal for sales
    if (updatedTransaction.type === 'sale' && (updates.items || updates.grandTotal === undefined)) {
        const saleTx = updatedTransaction as SaleTransaction;
        saleTx.items = saleTx.items.map(item => ({
            ...item,
            total: item.quantity * item.pricePerItem
        }));
        saleTx.grandTotal = saleTx.items.reduce((sum, item) => sum + item.total, 0);
    }


    const newTransactions = [...transactions];
    newTransactions[transactionIndex] = updatedTransaction;
    setTransactions(newTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    toast({ title: "Transaction Updated", description: "Transaction details have been (conceptually) updated." });
    return updatedTransaction;
  }, [transactions, setTransactions, toast]);


  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, getTransactionById, updateServiceProgress, deleteTransaction, updateTransactionDetails }}>
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
