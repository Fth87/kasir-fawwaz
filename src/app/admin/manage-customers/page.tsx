'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
import type { PaginationState, SortingState } from '@tanstack/react-table';

// Stores & Types
import { useCustomerStore } from '@/stores/customer.store';
import { useAuthStore } from '@/stores/auth.store';
import { shallow } from 'zustand/shallow';
import type { Customer } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Users2, PlusCircle, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react';

// Local Components
import { CustomerDialog, type CustomerFormValues } from './components/customer-dialog';
import { DeleteDialog } from './components/delete-dialog';

// Main Page Component
export default function ManageCustomersPage() {
  const { customers, isLoading, pageCount } = useCustomerStore(
    (state) => ({ customers: state.customers, isLoading: state.isLoading, pageCount: state.pageCount }),
    shallow
  );
  const fetchData = useCustomerStore((state) => state.fetchData);
  const addCustomer = useCustomerStore((state) => state.addCustomer);
  const updateCustomer = useCustomerStore((state) => state.updateCustomer);
  const deleteCustomer = useCustomerStore((state) => state.deleteCustomer);

  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const { toast } = useToast();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const filters = useMemo(() => ({ name: debouncedNameFilter }), [debouncedNameFilter]);

  const columns: ColumnDef<Customer>[] = React.useMemo(
    () => getColumns({ onSuccess: triggerRefresh, addCustomer, updateCustomer, deleteCustomer }),
    [triggerRefresh, addCustomer, updateCustomer, deleteCustomer]
  );

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" /><p>Akses Ditolak.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline flex items-center"><Users2 className="mr-3 h-7 w-7" /> Kelola Pelanggan</CardTitle>
            <CardDescription>Tambah, lihat, ubah, dan hapus profil pelanggan.</CardDescription>
          </div>
          <CustomerDialog onSuccess={triggerRefresh} addCustomer={addCustomer} updateCustomer={updateCustomer}>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Tambah Pelanggan Baru</Button>
          </CustomerDialog>
        </CardHeader>
        <CardContent className='max-w-full overflow-x-scroll'>
          <DataTable
            columns={columns}
            data={customers}
            pageCount={pageCount}
            fetchData={fetchData}
            onFetchError={(error) => {
              toast({
                title: 'Error Memuat Data',
                description: error.message || 'Gagal memuat data pelanggan.',
                variant: 'destructive',
              });
            }}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            filters={filters}
          >
            <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan nama..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
            </div>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

// Columns Definition
interface GetColumnsProps {
  onSuccess: () => void;
  addCustomer: (data: CustomerFormValues) => Promise<{ customer: Customer | null; error: Error | null }>;
  updateCustomer: (id: string, data: CustomerFormValues) => Promise<{ success: boolean; error: Error | null }>;
  deleteCustomer: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

const getColumns = ({ onSuccess, addCustomer, updateCustomer, deleteCustomer }: GetColumnsProps): ColumnDef<Customer>[] => [
  { accessorKey: 'name', header: ({ column }) => createSortableHeader(column, 'Nama'), cell: ({ row }) => <div className="font-medium">{row.original.name}</div> },
  { accessorKey: 'phone', header: ({ column }) => createSortableHeader(column, 'Telepon'), cell: ({ row }) => row.original.phone || '-' },
  { accessorKey: 'createdAt', header: ({ column }) => createSortableHeader(column, 'Bergabung'), cell: ({ row }) => format(parseISO(row.original.createdAt), 'dd MMM yyyy', { locale: LocaleID }) },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="text-right space-x-2">
          <CustomerDialog item={customer} onSuccess={onSuccess} updateCustomer={updateCustomer} addCustomer={addCustomer}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
          </CustomerDialog>
          <DeleteDialog item={customer} onSuccess={onSuccess} deleteCustomer={deleteCustomer} />
        </div>
      );
    },
  },
];
