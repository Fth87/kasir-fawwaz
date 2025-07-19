'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';

type AddSaleTransactionInput = {
  type: 'sale';
  customerName: string;
  paymentMethod: 'cash' | 'transfer' | 'qris';
  items: Omit<SaleTransaction['items'][0], 'id' | 'total'>[];
};

type AddServiceTransactionInput = {
  type: 'service';
  customerName: string;
  serviceName: string;
  device: string;
  issueDescription: string;
  price: number;
};

type AddExpenseTransactionInput = {
  type: 'expense';
  description: string;
  category: string;
  amount: number;
};

type AddTransactionInput = AddSaleTransactionInput | AddServiceTransactionInput | AddExpenseTransactionInput;

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (transactionData: AddTransactionInput) => Promise<boolean>;
  getTransactionById: (id: string) => Transaction | undefined;
  deleteTransaction: (transactionId: string) => Promise<boolean>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Gagal memuat transaksi.', variant: 'destructive' });
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } else {
      const formattedTransactions = data
        .map(mapDbRowToTransaction)
        .filter(Boolean) as Transaction[];

      setTransactions(formattedTransactions);
    }
    setIsLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(
    async (transactionData: AddTransactionInput): Promise<boolean> => {
      let transactionToInsert;

      if (transactionData.type === 'sale') {
        const saleData = transactionData; 
        const itemsWithTotals = saleData.items.map((item) => ({
          ...item,
          total: item.quantity * item.pricePerItem,
        }));
        const grandTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);

        transactionToInsert = {
          type: 'sale',
          customer_name: saleData.customerName,
          total_amount: grandTotal,
          details: {
            paymentMethod: saleData.paymentMethod, 
            items: itemsWithTotals,
          },
        };
      } else if (transactionData.type === 'service') {
        const serviceData = transactionData; 
        transactionToInsert = {
          type: 'service',
          customer_name: serviceData.customerName,
          total_amount: serviceData.price,
          details: {
            serviceName: serviceData.serviceName,
            device: serviceData.device,
            issueDescription: serviceData.issueDescription,
            status: 'pending',
            progressNotes: [],
          },
        };
      } else {
        // expense
        const expenseData = transactionData;
        transactionToInsert = {
          type: 'expense',
          customer_name: 'Internal',
          total_amount: expenseData.amount,
          details: {
            description: expenseData.description,
            category: expenseData.category,
          },
        };
      }
      const { data, error } = await supabase
      .from('transactions')
      .insert(transactionToInsert)
      .select()
      .single(); 

      if (error  || !data) {
        toast({ title: 'Error', description: 'Gagal menambahkan transaksi.', variant: 'destructive' });
        console.error('Error adding transaction:', error);
        return false;
      }


    const finalTx = mapDbRowToTransaction(data);
    if (finalTx) {
      setTransactions((prev) => [finalTx, ...prev]);
    }

      toast({ title: 'Sukses', description: 'Transaksi baru berhasil ditambahkan.' });
      return true;
    },
    [supabase, toast]
  );

  const getTransactionById = useCallback(
    (id: string) => {
      return transactions.find((tx) => tx.id === id);
    },
    [transactions]
  );
  const deleteTransaction = useCallback(
    async (transactionId: string): Promise<boolean> => {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);

      if (error) {
        toast({ title: 'Error', description: 'Gagal menghapus transaksi.', variant: 'destructive' });
        console.error('Error deleting transaction:', error);
        return false;
      }

      setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));
      toast({ title: 'Sukses', description: 'Transaksi berhasil dihapus.' });
      
      return true;
    },
    [supabase, toast]
  );

  return <TransactionContext.Provider value={{ transactions, isLoading, addTransaction, getTransactionById, deleteTransaction }}>{children}</TransactionContext.Provider>;
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
