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
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { search?: string; type?: TransactionTypeFilter }) => Promise<{ error: Error | null }>;
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

    let query = supabase
      .from('transactions')
      .select('*, customer:customers(name, phone, address)', { count: 'exact' })
      .range(from, to);

    if (filters.search) {
      const term = filters.search.replace(/,/g, '');
      const orFilter =
        `customer_name.ilike.%${term}%,` +
        `details->>serviceName.ilike.%${term}%,` +
        `details->>device.ilike.%${term}%,` +
        `details->>issueDescription.ilike.%${term}%,` +
        `details->>description.ilike.%${term}%`;
      query = query.or(orFilter);
    }
    if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (sorting.length > 0) {
        const sort = sorting[0];
        const column = sort.id === 'date'
          ? 'created_at'
          : sort.id === 'amount'
            ? 'total_amount'
            : sort.id;
        query = query.order(column, { ascending: !sort.desc });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
        set({ transactions: [], isLoading: false });
        return { error };
    }

    const formattedTransactions = data?.map(mapDbRowToTransaction).filter(Boolean) as Transaction[] || [];
    set({ transactions: formattedTransactions, pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)), isLoading: false });
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
            type: 'sale',
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
          partsCost: transactionData.partsCost || 0,
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
    if (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error: error as Error };
    }
    set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== transactionId) }));
    return { success: true, error: null };
  },

  updateTransactionDetails: async (transactionId, updates) => {
    const supabase = createClient();
    const { data: currentTx, error: fetchError } = await supabase
        .from('transactions')
        .select('details, total_amount, customer_name, customer_id')
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
            customer_id: updates.customerId ?? currentTx.customer_id,
            total_amount: updates.total_amount ?? currentTx.total_amount,
         })
        .eq('id', transactionId);

    if (error) console.error('Error updating transaction:', error);
    return { success: !error, error: error as Error | null };
  },
}));
