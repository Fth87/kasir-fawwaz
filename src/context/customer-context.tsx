'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Customer, NewCustomerInput, UpdateCustomerInput } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface CustomerContextType {
  customers: Customer[];
  isLoading: boolean;
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

  // Fungsi terpusat untuk mengambil data dari Supabase
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Gagal memuat data pelanggan.', variant: 'destructive' });
      setCustomers([]);
    } else {
      // Map data dari snake_case (DB) ke camelCase (JS)
      const formattedCustomers = data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? undefined,
        address: c.address ?? undefined,
        notes: c.notes ?? undefined,
        user_id: c.user_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      setCustomers(formattedCustomers);
    }
    setIsLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fungsi async untuk menambah pelanggan baru
  const addCustomer = useCallback(
    async (customerData: NewCustomerInput): Promise<Customer | null> => {
      // Validasi duplikat nomor telepon langsung ke database
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

      setCustomers((prev) => [...prev, formattedCustomer].sort((a, b) => a.name.localeCompare(b.name)));

      return formattedCustomer;
    },
    [supabase, toast]
  );

  const getCustomerById = useCallback(
    (id: string) => {
      return customers.find((c) => c.id === id);
    },
    [customers]
  );

  // Fungsi async untuk update pelanggan
  const updateCustomer = useCallback(
    async (id: string, updates: UpdateCustomerInput): Promise<boolean> => {
      const { error } = await supabase.from('customers').update(updates).eq('id', id);

      if (error) {
        console.error('Error updating customer:', error);
        toast({ title: 'Error', description: 'Gagal memperbarui data pelanggan.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: 'Data pelanggan berhasil diperbarui.' });
      fetchCustomers();
      return true;
    },
    [supabase, toast, fetchCustomers]
  );

  // Fungsi async untuk hapus pelanggan
  const deleteCustomer = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) {
        console.error('Error deleting customer:', error);
        toast({ title: 'Error', description: 'Gagal menghapus pelanggan.', variant: 'destructive' });
        return false;
      }

      // Pembaruan UI optimis: Hapus dari state lokal tanpa perlu fetch ulang
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Sukses', description: 'Pelanggan berhasil dihapus.' });
      return true;
    },
    [supabase, toast]
  );

  return <CustomerContext.Provider value={{ customers, isLoading, addCustomer, getCustomerById, updateCustomer, deleteCustomer }}>{children}</CustomerContext.Provider>;
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
