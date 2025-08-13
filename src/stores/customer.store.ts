import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { Customer, NewCustomerInput, UpdateCustomerInput } from '@/types';
import type { PaginationState, SortingState } from '@tanstack/react-table';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  pageCount: number;
  isSearching: boolean; // For search-specific loading state
  searchResults: Customer[]; // To hold search results
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { name?: string }) => Promise<{ error: Error | null }>;
  searchCustomers: (query: string) => Promise<void>; // New search action
  addCustomer: (customerData: NewCustomerInput) => Promise<{ customer: Customer | null; error: Error | null }>;
  getCustomerById: (id: string) => Customer | undefined;
  updateCustomer: (id: string, updates: UpdateCustomerInput) => Promise<{ success: boolean; error: Error | null }>;
  deleteCustomer: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: true,
  pageCount: 0,
  isSearching: false,
  searchResults: [],

  fetchData: async (pagination, sorting, filters) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { pageIndex, pageSize } = pagination;
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('customers').select('*', { count: 'exact' }).range(from, to);
    if (filters.name) query = query.ilike('name', `%${filters.name}%`);
    if (sorting.length > 0) {
      const sort = sorting[0];
      query = query.order(sort.id, { ascending: !sort.desc });
    } else {
      query = query.order('name', { ascending: true });
    }

    const { data, error, count } = await query;

    if (error) {
      set({ customers: [], isLoading: false });
      return { error };
    }

    const formattedCustomers = data.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? undefined,
      address: c.address ?? undefined,
      notes: c.notes ?? undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
    set({ customers: formattedCustomers, pageCount: Math.ceil((count ?? 0) / pageSize), isLoading: false });
    return { error: null };
  },

  searchCustomers: async (query) => {
    if (!query) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, address, notes, created_at, updatedAt')
      .ilike('name', `%${query}%`)
      .limit(10); // Limit results for performance

    if (error) {
      console.error('Error searching customers:', error);
      set({ searchResults: [], isSearching: false });
      return;
    }

    const formattedCustomers = data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? undefined,
        address: c.address ?? undefined,
        notes: c.notes ?? undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    set({ searchResults: formattedCustomers, isSearching: false });
  },

  addCustomer: async (customerData) => {
    const supabase = createClient();
    if (customerData.phone) {
      const { data: existing } = await supabase.from('customers').select('id').eq('phone', customerData.phone).single();
      if (existing) {
        return { customer: null, error: new Error('Nomor telepon sudah digunakan pelanggan lain.') };
      }
    }

    const { data: newCustomerData, error } = await supabase.from('customers').insert(customerData).select().single();

    if (error) {
      console.error('Error adding customer:', error);
      return { customer: null, error };
    }

    const formattedCustomer: Customer = {
      id: newCustomerData.id,
      name: newCustomerData.name,
      phone: newCustomerData.phone || undefined,
      address: newCustomerData.address || undefined,
      notes: newCustomerData.notes || undefined,
      createdAt: newCustomerData.created_at,
      updatedAt: newCustomerData.updated_at,
    };

    return { customer: formattedCustomer, error: null };
  },

  getCustomerById: (id: string) => {
    return get().customers.find((c) => c.id === id);
  },

  updateCustomer: async (id, updates) => {
    const supabase = createClient();
    const { error } = await supabase.from('customers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('Error updating customer:', error);
    }
    return { success: !error, error: error as Error | null };
  },

  deleteCustomer: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting customer:', error);
    }
    return { success: !error, error: error as Error | null };
  },
}));
