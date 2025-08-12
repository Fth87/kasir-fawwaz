'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Customer, NewCustomerInput, UpdateCustomerInput } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { PaginationState, SortingState } from '@tanstack/react-table';

interface CustomerContextType {
  customers: Customer[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { name?: string }) => void;
  addCustomer: (customerData: NewCustomerInput) => Promise<Customer | null>;
  getCustomerById: (id: string) => Customer | undefined;
  updateCustomer: (id: string, updates: UpdateCustomerInput) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  const fetchData = useCallback(
    async (pagination: PaginationState, sorting: SortingState, filters: { name?: string }) => {
      setIsLoading(true);

      const { pageIndex, pageSize } = pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('customers').select('*', { count: 'exact' }).range(from, to);

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }

      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      } else {
        query = query.order('name', { ascending: true });
      }

      const { data, error, count } = await query;

      if (error) {
        toast({ title: 'Error', description: 'Gagal memuat data pelanggan.', variant: 'destructive' });
        setCustomers([]);
      } else if (data) {
        const formattedCustomers = data.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone ?? undefined,
            address: c.address ?? undefined,
            notes: c.notes ?? undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
        }));
        setCustomers(formattedCustomers);
        setPageCount(Math.ceil((count ?? 0) / pageSize));
      }
      setIsLoading(false);
    },
    [supabase, toast]
  );
 
  const addCustomer = useCallback(
    async (customerData: NewCustomerInput): Promise<Customer | null> => {
      if (customerData.phone) {
        const { data: existing } = await supabase.from('customers').select('id').eq('phone', customerData.phone).single();
        if (existing) {
          toast({ title: 'Error', description: 'Nomor telepon sudah digunakan pelanggan lain.', variant: 'destructive' });
          return null;
        }
      }

      const { data: newCustomerData, error } = await supabase.from('customers').insert(customerData).select().single();

      if (error) {
        console.error('Error adding customer:', error);
        toast({ title: 'Error', description: 'Gagal menambahkan pelanggan.', variant: 'destructive' });
        return null;
      }

      toast({ title: 'Sukses', description: `Pelanggan "${customerData.name}" berhasil ditambahkan.` });

       const formattedCustomer: Customer = {
        id: newCustomerData.id,
        name: newCustomerData.name,
        phone: newCustomerData.phone || undefined, 
        address: newCustomerData.address || undefined, 
        notes: newCustomerData.notes || undefined, 
        createdAt: newCustomerData.created_at,
        updatedAt: newCustomerData.updated_at,
      };

      return formattedCustomer;
    },
    [supabase, toast]
  );

  const getCustomerById = useCallback(
    (id: string) => {
      // This will only find customers on the current page.
      // For a robust solution, this might need to fetch from DB if not found.
      return customers.find((c) => c.id === id);
    },
    [customers]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: UpdateCustomerInput): Promise<boolean> => {
      const { error } = await supabase.from('customers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);

      if (error) {
        console.error('Error updating customer:', error);
        toast({ title: 'Error', description: 'Gagal memperbarui data pelanggan.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: 'Data pelanggan berhasil diperbarui.' });
      return true;
    },
    [supabase, toast]
  );

  const deleteCustomer = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) {
        console.error('Error deleting customer:', error);
        toast({ title: 'Error', description: 'Gagal menghapus pelanggan.', variant: 'destructive' });
        return false;
      }
      toast({ title: 'Sukses', description: 'Pelanggan berhasil dihapus.' });
      return true;
    },
    [supabase, toast]
  );

  return (
    <CustomerContext.Provider value={{ customers, isLoading, pageCount, fetchData, addCustomer, getCustomerById, updateCustomer, deleteCustomer }}>
        {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
