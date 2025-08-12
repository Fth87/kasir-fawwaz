'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ServiceTransaction, ServiceStatusValue } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';

// --- Input Types ---
// For the "Add Service" form
export type NewServiceTransactionInput = Omit<ServiceTransaction, 'id' | 'date' | 'status' | 'progressNotes'> & {
  status?: ServiceStatusValue;
};

// For the "Edit Service" form
export type UpdateServiceTransactionInput = Partial<Omit<ServiceTransaction, 'id' | 'type' | 'date'>>;


// --- Context Shape ---
interface ServiceContextType {
  services: ServiceTransaction[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { customerName?: string }) => void;
  addService: (itemData: NewServiceTransactionInput) => Promise<boolean>;
  updateService: (id: string, updates: UpdateServiceTransactionInput) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  const fetchData = useCallback(
    async (pagination: PaginationState, sorting: SortingState, filters: { customerName?: string }) => {
      setIsLoading(true);

      const { pageIndex, pageSize } = pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('type', 'service')
        .range(from, to);

      if (filters.customerName) {
        query = query.ilike('customer_name', `%${filters.customerName}%`);
      }

      if (sorting.length > 0) {
        const sort = sorting[0];
        // Note: We can't sort by details fields directly (e.g. serviceName) with this setup.
        // We can sort by top-level columns like 'created_at', 'customer_name', 'total_amount'.
        const sortableColumns = ['created_at', 'customer_name', 'total_amount'];
        if (sortableColumns.includes(sort.id)) {
            query = query.order(sort.id, { ascending: !sort.desc });
        } else {
            // Default sort if column is not sortable
            query = query.order('created_at', { ascending: false });
        }
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) {
        toast({ title: 'Error', description: 'Gagal memuat data servis.', variant: 'destructive' });
        setServices([]);
      } else if (data) {
        const formattedServices = data.map(mapDbRowToTransaction).filter(Boolean) as ServiceTransaction[];
        setServices(formattedServices);
        setPageCount(Math.ceil((count ?? 0) / pageSize));
      }
      setIsLoading(false);
    },
    [supabase, toast]
  );

  const addService = useCallback(
    async (serviceData: NewServiceTransactionInput): Promise<boolean> => {
      const { data: newService, error } = await supabase
        .from('transactions')
        .insert({
          type: 'service',
          customer_name: serviceData.customerName,
          customer_id: serviceData.customerId,
          total_amount: serviceData.serviceFee,
          details: {
            serviceName: serviceData.serviceName,
            device: serviceData.device,
            issueDescription: serviceData.issueDescription,
            status: serviceData.status || 'PENDING_CONFIRMATION',
            progressNotes: [],
          },
        })
        .select()
        .single();

      if (error || !newService) {
        toast({ title: 'Error', description: error?.message || 'Gagal menambahkan servis baru.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: `Servis untuk "${serviceData.customerName}" berhasil ditambahkan.` });
      return true;
    },
    [supabase, toast]
  );

  const updateService = useCallback(
    async (id: string, updates: UpdateServiceTransactionInput): Promise<boolean> => {
        // First, get the current transaction details
        const { data: currentTx, error: fetchError } = await supabase
            .from('transactions')
            .select('details, total_amount, customer_name')
            .eq('id', id)
            .single();

        if (fetchError || !currentTx) {
            toast({ title: 'Error', description: 'Gagal mengambil data servis saat ini.', variant: 'destructive' });
            return false;
        }

        const currentDetails = (typeof currentTx.details === 'object' && currentTx.details !== null ? currentTx.details : {}) as any;
        const newDetails = {
            ...currentDetails,
            serviceName: updates.serviceName ?? currentDetails?.serviceName,
            device: updates.device ?? currentDetails?.device,
            issueDescription: updates.issueDescription ?? currentDetails?.issueDescription,
            status: updates.status ?? currentDetails?.status,
            progressNotes: updates.progressNotes ?? currentDetails?.progressNotes,
        };

        const { error } = await supabase
            .from('transactions')
            .update({
                details: newDetails,
                customer_name: updates.customerName || currentTx.customer_name,
                total_amount: updates.serviceFee || currentTx.total_amount,
             })
            .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message || 'Gagal memperbarui servis.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: 'Servis berhasil diperbarui.' });
      return true;
    },
    [supabase, toast]
  );

  const deleteService = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: 'Gagal menghapus servis.', variant: 'destructive' });
        return false;
      }
      toast({ title: 'Sukses', description: 'Servis berhasil dihapus.' });
      return true;
    },
    [supabase, toast]
  );

  return (
    <ServiceContext.Provider value={{ services, isLoading, pageCount, fetchData, addService, updateService, deleteService }}>
        {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};
