import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type {
  Transaction,
  SaleTransaction,
  ServiceTransaction,
  ExpenseTransaction,
  TransactionTypeFilter,
  SaleItem,
} from '@/types';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { TablesInsert, Json } from '@/types/supabase';

// Redefine input types for clarity within the store
type AddSaleInput = Omit<SaleTransaction, 'id' | 'date' | 'grandTotal' | 'items'> & { items: Omit<SaleItem, 'id' | 'total'>[] };
type AddServiceInput = Omit<ServiceTransaction, 'id' | 'date' | 'status' | 'progressNotes'> & { status?: ServiceTransaction['status'] };
type AddExpenseInput = Omit<ExpenseTransaction, 'id' | 'date'>;
export type AddTransactionInput = AddSaleInput | AddServiceInput | AddExpenseInput;

export type UpdateTransactionInput = {
  details?: Record<string, Json>;
  customerName?: string;
  customerId?: string;
  total_amount?: number;
};

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { customerName?: string, type?: TransactionTypeFilter }) => Promise<{ error: Error | null }>;
  addTransaction: (transactionData: AddTransactionInput) => Promise<{ success: boolean; error: Error | null, data?: Transaction | null }>;
  deleteTransaction: (transactionId: string) => Promise<{ success: boolean; error: Error | null }>;
  updateTransactionDetails: (transactionId: string, updates: UpdateTransactionInput) => Promise<{ success: boolean; error: Error | null }>;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: true,
  pageCount: 0,

  fetchData: async (pagination, sorting, filters) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { pageIndex, pageSize } = pagination;
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('transactions').select('*', { count: 'exact' }).range(from, to);

    if (filters.customerName) query = query.ilike('customer_name', `%${filters.customerName}%`);
    if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
        set({ transactions: [], isLoading: false });
        return { error };
    }

    const formattedTransactions = data?.map(mapDbRowToTransaction).filter(Boolean) as Transaction[] || [];
    set({ transactions: formattedTransactions, pageCount: Math.ceil((count ?? 0) / pageSize), isLoading: false });
    return { error: null };
  },

  addTransaction: async (transactionData) => {
    const supabase = createClient();
    let recordToInsert: TablesInsert<'transactions'>;

    if (transactionData.type === 'sale') {
        const subtotal = transactionData.items.reduce((sum, item) => sum + (item.pricePerItem * item.quantity), 0);
        const discountAmount = transactionData.discountAmount ?? 0;
        const grandTotal = subtotal - discountAmount;
        const change = transactionData.cashTendered !== undefined
          ? (transactionData.cashTendered - grandTotal)
          : undefined;
        recordToInsert = {
            ...recordToInsert,
            customer_name: transactionData.customerName,
            customer_id: transactionData.customerId,
            payment_method: transactionData.paymentMethod,
            total_amount: grandTotal,
            discount_type: transactionData.discountType,
            discount_value: transactionData.discountValue,
            discount_amount: discountAmount,
            cash_tendered: transactionData.cashTendered,
            change,
            details: { items: transactionData.items }
        };
    } else if (transactionData.type === 'service') {
      recordToInsert = {
        type: 'service',
        customer_name: transactionData.customerName,
        customer_id: transactionData.customerId,
        total_amount: transactionData.serviceFee,
        details: {
          serviceName: transactionData.serviceName,
          device: transactionData.device,
          issueDescription: transactionData.issueDescription,
          status: transactionData.status || 'PENDING_CONFIRMATION',
          progressNotes: [],
        } as Json,
      };
    } else {
      recordToInsert = {
        type: 'expense',
        total_amount: transactionData.amount,
        details: {
          description: transactionData.description,
          category: transactionData.category,
        } as Json,
      };
    }

    const { error, data } = await supabase
      .from('transactions')
      .insert(recordToInsert)
      .select()
      .single();
    const mappedData = data ? mapDbRowToTransaction(data) : null;
    if (error) console.error('Error adding transaction:', error);
    return { success: !error, error: error as Error | null, data: mappedData };
  },

  deleteTransaction: async (transactionId) => {
    const supabase = createClient();
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) console.error('Error deleting transaction:', error);
    return { success: !error, error: error as Error | null };
  },

  updateTransactionDetails: async (transactionId, updates) => {
    const supabase = createClient();
    const { data: currentTx, error: fetchError } = await supabase
        .from('transactions')
        .select('details, total_amount, customer_name')
        .eq('id', transactionId)
        .single();

    if (fetchError) {
        return { success: false, error: new Error('Gagal mengambil data transaksi saat ini.') };
    }

    const currentDetails =
      (typeof currentTx.details === 'object' && currentTx.details !== null
        ? (currentTx.details as Record<string, Json>)
        : {});

    const newDetails: Record<string, Json> = {
      ...currentDetails,
      ...(updates.details ?? {}),
    };

    const { error } = await supabase
        .from('transactions')
        .update({
            details: newDetails as Json,
            customer_name: updates.customerName ?? currentTx.customer_name,
            total_amount: updates.total_amount ?? currentTx.total_amount,
         })
        .eq('id', transactionId);

    if (error) console.error('Error updating transaction:', error);
    return { success: !error, error: error as Error | null };
  },
}));
