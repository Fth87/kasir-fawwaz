'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';

// --- Input Types ---
type AddSaleTransactionInput = {
  type: 'sale';
  customerName: string;
  customerId?: string;
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
  customerId?: string;
};

type AddExpenseTransactionInput = {
  type: 'expense';
  description: string;
  category: string;
  amount: number;
};

type AddTransactionInput = AddSaleTransactionInput | AddServiceTransactionInput | AddExpenseTransactionInput;


// --- Context Shape ---
interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
}

interface TransactionActions {
  addTransaction: (transactionData: AddTransactionInput) => Promise<boolean>;
  fetchTransactions: () => void;
  getTransactionById: (id: string) => Transaction | undefined;
  deleteTransaction: (transactionId: string) => Promise<boolean>;
  updateTransactionDetails: (transactionId: string, updates: Partial<Transaction>) => Promise<boolean>;
  getTransactionsByCustomerId: (customerId: string) => Transaction[];
}

// --- Context Creation ---
const TransactionStateContext = createContext<TransactionState | undefined>(undefined);
const TransactionDispatchContext = createContext<TransactionActions | undefined>(undefined);

// --- Provider Component ---
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
      const formattedTransactions = data.map(mapDbRowToTransaction).filter(Boolean) as Transaction[];
      setTransactions(formattedTransactions);
    }
    setIsLoading(false);
  }, [supabase, toast]);

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
          customer_id: transactionData.customerId,
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
          customer_id: serviceData.customerId,
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
      const { data, error } = await supabase.from('transactions').insert(transactionToInsert).select().single();

      if (error || !data) {
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

  const updateTransactionDetails = useCallback(
    async (transactionId: string, updates: Partial<Transaction>): Promise<boolean> => {
      const currentTx = transactions.find((tx) => tx.id === transactionId);
      if (!currentTx) {
        toast({ title: 'Error', description: 'Transaksi tidak ditemukan.', variant: 'destructive' });
        return false;
      }

      const updatesForDb: {
        customer_name?: string;
        total_amount?: number;
        details?: {
          paymentMethod?: string;
          items?: SaleTransaction['items'];
          serviceName?: string;
          device?: string;
          issueDescription?: string;
          status?: string;
          progressNotes?: ServiceTransaction['progressNotes'];
          description?: string;
          category?: string;
        };
      } = {};

      switch (currentTx.type) {
        case 'sale': {
          const saleUpdates = updates as Partial<SaleTransaction>;
          const newDetails = { ...currentTx, ...saleUpdates };
          updatesForDb.details = { paymentMethod: newDetails.paymentMethod, items: newDetails.items };
          updatesForDb.customer_name = newDetails.customerName;
          updatesForDb.total_amount = newDetails.items.reduce((sum, item) => sum + item.quantity * item.pricePerItem, 0);
          break;
        }
        case 'service': {
          const serviceUpdates = updates as Partial<ServiceTransaction>;
          const newDetails = { ...currentTx, ...serviceUpdates };
          updatesForDb.details = {
            serviceName: newDetails.serviceName,
            device: newDetails.device,
            issueDescription: newDetails.issueDescription,
            status: newDetails.status,
            progressNotes: newDetails.progressNotes,
          };
          updatesForDb.customer_name = newDetails.customerName;
          updatesForDb.total_amount = newDetails.serviceFee;
          break;
        }
        case 'expense': {
          const expenseUpdates = updates as Partial<ExpenseTransaction>;
          const newDetails = { ...currentTx, ...expenseUpdates };
          updatesForDb.details = { description: newDetails.description, category: newDetails.category };
          updatesForDb.total_amount = newDetails.amount;
          break;
        }
      }

      const { error } = await supabase.from('transactions').update(updatesForDb).eq('id', transactionId);

      if (error) {
        toast({ title: 'Error', description: 'Gagal memperbarui transaksi.', variant: 'destructive' });
        console.error('Error updating transaction:', error);
        return false;
      }

      toast({ title: 'Sukses', description: 'Transaksi berhasil diperbarui.' });
      fetchTransactions();
      return true;
    },
    [supabase, toast, fetchTransactions, transactions]
  );

  const getTransactionsByCustomerId = useCallback(
    (customerId: string): Transaction[] => {
      if (!customerId) return [];
      return transactions.filter((tx) => 'customerId' in tx && tx.customerId === customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [transactions]
  );

  const stateValue = useMemo(() => ({ transactions, isLoading }), [transactions, isLoading]);

  const dispatchValue = useMemo(() => ({
    fetchTransactions,
    addTransaction,
    getTransactionById,
    deleteTransaction,
    updateTransactionDetails,
    getTransactionsByCustomerId,
  }), [fetchTransactions, addTransaction, getTransactionById, deleteTransaction, updateTransactionDetails, getTransactionsByCustomerId]);


  return (
    <TransactionStateContext.Provider value={stateValue}>
      <TransactionDispatchContext.Provider value={dispatchValue}>
        {children}
      </TransactionDispatchContext.Provider>
    </TransactionStateContext.Provider>
  );
};

// --- Custom Hooks ---
export const useTransactionState = () => {
  const context = useContext(TransactionStateContext);
  if (context === undefined) {
    throw new Error('useTransactionState must be used within a TransactionProvider');
  }
  return context;
};

export const useTransactionDispatch = () => {
  const context = useContext(TransactionDispatchContext);
  if (context === undefined) {
    throw new Error('useTransactionDispatch must be used within a TransactionProvider');
  }
  return context;
};

export const useTransactions = () => {
  return { ...useTransactionState(), ...useTransactionDispatch() };
};
