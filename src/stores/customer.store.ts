import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { Customer, NewCustomerInput, UpdateCustomerInput } from '@/types';
import type { PaginationState, SortingState } from '@tanstack/react-table';

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { name?: string }) => Promise<{ error: Error | null }>;
  addCustomer: (customerData: NewCustomerInput) => Promise<{ customer: Customer | null; error: Error | null }>;
  getCustomerById: (id: string) => Customer | undefined;
  updateCustomer: (id: string, updates: UpdateCustomerInput) => Promise<{ success: boolean; error: Error | null }>;
  deleteCustomer: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: true,
  pageCount: 0,

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
      // The UI component will be responsible for showing a toast
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

  addCustomer: async (customerData) => {
    const supabase = createClient();
    const { data: newCustomerData, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) {
      // Handle duplicate phone numbers gracefully by returning the existing
      // customer instead of logging an error. This avoids noisy console
      // output while allowing the UI to continue with the existing record.
      if (error.code === '23505' && customerData.phone) {
        const state = get();
        let existing = state.customers.find((c) => c.phone === customerData.phone);

        if (!existing) {
          const { data: existingCustomer, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', customerData.phone)
            .single();

          if (!fetchError && existingCustomer) {
            existing = {
              id: existingCustomer.id,
              name: existingCustomer.name,
              phone: existingCustomer.phone || undefined,
              address: existingCustomer.address || undefined,
              notes: existingCustomer.notes || undefined,
              createdAt: existingCustomer.created_at,
              updatedAt: existingCustomer.updated_at,
            };

            set((state) => ({
              customers: state.customers.some((c) => c.id === existing!.id)
                ? state.customers
                : [...state.customers, existing!],
            }));
          }
        }

        if (existing) {
          return { customer: existing, error: null };
        }
      }

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

    set((state) => ({ customers: [...state.customers, formattedCustomer] }));
    return { customer: formattedCustomer, error: null };
  },

  getCustomerById: (id: string) => {
    // This will only find customers on the current page.
    return get().customers.find((c) => c.id === id);
  },

  updateCustomer: async (id, updates) => {
    const supabase = createClient();
    const { error } = await supabase.from('customers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('Error updating customer:', error);
    }
    return { success: !error, error };
  },

  deleteCustomer: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting customer:', error);
    }
    return { success: !error, error };
  },
}));
