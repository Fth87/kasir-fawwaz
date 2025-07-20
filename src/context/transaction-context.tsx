'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';

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

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (transactionData: AddTransactionInput) => Promise<boolean>;
  fetchTransactions: () => void; 
  getTransactionById: (id: string) => Transaction | undefined;
  deleteTransaction: (transactionId: string) => Promise<boolean>;
  updateTransactionDetails: (transactionId: string, updates: Partial<Transaction>) => Promise<boolean>;
  getTransactionsByCustomerId: (customerId: string) => Transaction[];
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
      // 1. Cari transaksi yang ada di state untuk mendapatkan data asli & tipenya
      const currentTx = transactions.find((tx) => tx.id === transactionId);
      if (!currentTx) {
        toast({ title: 'Error', description: 'Transaksi tidak ditemukan.', variant: 'destructive' });
        return false;
      }

      // Objek kosong untuk menampung data yang akan dikirim ke Supabase
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

      // 2. Gunakan switch pada TIPE ASLI untuk type narrowing yang aman
      switch (currentTx.type) {
        case 'sale': {
          // Di sini, TypeScript tahu `currentTx` adalah SaleTransaction
          // dan `updates` kemungkinan adalah Partial<SaleTransaction>
          const saleUpdates = updates as Partial<SaleTransaction>;

          // 3. Gabungkan 'details' lama dan baru secara aman
          const newDetails = {
            paymentMethod: saleUpdates.paymentMethod || currentTx.paymentMethod,
            items: saleUpdates.items || currentTx.items,
          };
          updatesForDb.details = newDetails;

          // Siapkan update untuk kolom level atas
          updatesForDb.customer_name = saleUpdates.customerName || currentTx.customerName;

          // 4. Lakukan kalkulasi ulang jika data yang relevan berubah
          if (saleUpdates.items) {
            updatesForDb.total_amount = newDetails.items.reduce((sum, item) => sum + item.quantity * item.pricePerItem, 0);
          } else {
            updatesForDb.total_amount = saleUpdates.grandTotal || currentTx.grandTotal;
          }
          break;
        }

        case 'service': {
          const serviceUpdates = updates as Partial<ServiceTransaction>;
          const newDetails = {
            serviceName: serviceUpdates.serviceName || currentTx.serviceName,
            device: serviceUpdates.device || currentTx.device,
            issueDescription: serviceUpdates.issueDescription || currentTx.issueDescription,
            status: serviceUpdates.status || currentTx.status,
            progressNotes: serviceUpdates.progressNotes || currentTx.progressNotes,
          };
          updatesForDb.details = newDetails;
          updatesForDb.customer_name = serviceUpdates.customerName || currentTx.customerName;
          updatesForDb.total_amount = serviceUpdates.serviceFee || currentTx.serviceFee;
          break;
        }

        case 'expense': {
          const expenseUpdates = updates as Partial<ExpenseTransaction>;
          const newDetails = {
            description: expenseUpdates.description || currentTx.description,
            category: expenseUpdates.category || currentTx.category,
          };
          updatesForDb.details = newDetails;
          updatesForDb.total_amount = expenseUpdates.amount || currentTx.amount;
          break;
        }
      }

      // 5. Kirim data yang sudah bersih dan aman ke Supabase
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
      return transactions
        .filter((tx) => {
          // Mencocokkan berdasarkan properti customerId yang mungkin ada
          if ('customerId' in tx && tx.customerId === customerId) {
            return true;
          }
          return false;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [transactions]
  );

  return (
    <TransactionContext.Provider value={{ transactions, isLoading, addTransaction, getTransactionById, deleteTransaction, updateTransactionDetails, getTransactionsByCustomerId, fetchTransactions }}>
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
