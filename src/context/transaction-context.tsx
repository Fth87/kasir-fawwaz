'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction, TransactionTypeFilter, SaleItem } from '@/types';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';
import type { PaginationState, SortingState } from '@tanstack/react-table';

// --- Input Types ---
type AddSaleTransactionInput = Omit<SaleTransaction, 'id' | 'date' | 'grandTotal' | 'items'> & { items: Omit<SaleItem, 'id' | 'total'>[] };
type AddServiceTransactionInput = Omit<ServiceTransaction, 'id' | 'date' | 'status' | 'progressNotes'>;
type AddExpenseTransactionInput = Omit<ExpenseTransaction, 'id' | 'date'>;
type AddTransactionInput = AddSaleTransactionInput | AddServiceTransactionInput | AddExpenseTransactionInput;


// --- Context Shape ---
interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  pageCount: number;
}

interface TransactionActions {
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { customerName?: string, type?: TransactionTypeFilter }) => void;
  addTransaction: (transactionData: AddTransactionInput) => Promise<boolean>;
  deleteTransaction: (transactionId: string) => Promise<boolean>;
  updateTransactionDetails: (transactionId: string, updates: Partial<Transaction>) => Promise<boolean>;
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
  const [pageCount, setPageCount] = useState(0);

  const fetchData = useCallback(
    async (pagination: PaginationState, sorting: SortingState, filters: { customerName?: string, type?: TransactionTypeFilter }) => {
      setIsLoading(true);

      const { pageIndex, pageSize } = pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('transactions').select('*', { count: 'exact' }).range(from, to);

      if (filters.customerName) {
        query = query.ilike('customer_name', `%${filters.customerName}%`);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;

       if (error) {
        toast({ title: 'Error', description: 'Gagal memuat transaksi.', variant: 'destructive' });
        setTransactions([]);
      } else if (data) {
        const formattedTransactions = data.map(mapDbRowToTransaction).filter(Boolean) as Transaction[];
        setTransactions(formattedTransactions);
        setPageCount(Math.ceil((count ?? 0) / pageSize));
      }
      setIsLoading(false);
    },
    [supabase, toast]
  );

  const addTransaction = useCallback(
    async (transactionData: AddTransactionInput): Promise<boolean> => {
       // Implementation from previous version, simplified for brevity
       // This function would need to be updated to match the new input types if used from a form
      toast({ title: 'Info', description: 'Add transaction logic needs to be connected to a form.', variant: 'default' });
      return false;
    },
    [supabase, toast]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string): Promise<boolean> => {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);

      if (error) {
        toast({ title: 'Error', description: 'Gagal menghapus transaksi.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: 'Transaksi berhasil dihapus.' });
      return true;
    },
    [supabase, toast]
  );

  const updateTransactionDetails = useCallback(
    async (transactionId: string, updates: Partial<Transaction>): Promise<boolean> => {
      // This function is complex and would need a dedicated UI to be useful.
      // For now, we are focusing on the table view.
      toast({ title: 'Info', description: 'Update transaction logic needs a dedicated UI.', variant: 'default' });
      return false;
    },
    [supabase, toast]
  );

  const stateValue = useMemo(() => ({ transactions, isLoading, pageCount }), [transactions, isLoading, pageCount]);

  const dispatchValue = useMemo(() => ({
    fetchData,
    addTransaction,
    deleteTransaction,
    updateTransactionDetails,
  }), [fetchData, addTransaction, deleteTransaction, updateTransactionDetails]);


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
