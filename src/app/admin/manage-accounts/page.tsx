'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
import type { PaginationState, SortingState } from '@tanstack/react-table';

// Stores & Types
import { useAccountStore } from '@/stores/account.store';
import { useAuthStore } from '@/stores/auth.store';
import type { UserData } from './actions';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Users, PlusCircle, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react';

// Local Components
import { AccountDialog } from './components/account-dialog';
import { DeleteDialog } from './components/delete-dialog';

// Main Page Component
export default function ManageAccountsPage() {
  const { users, isLoading, pageCount, fetchData, addUser, updateUser, deleteUser } = useAccountStore();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const { toast } = useToast();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const filters = useMemo(() => ({ name: debouncedNameFilter }), [debouncedNameFilter]);

  const columns: ColumnDef<UserData>[] = React.useMemo(
    () => getColumns({
        onSuccess: triggerRefresh,
        updateUser,
        deleteUser,
        currentUserId: currentUser?.id
    }),
    [triggerRefresh, updateUser, deleteUser, currentUser?.id]
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
            <CardTitle className="text-2xl font-headline flex items-center"><Users className="mr-3 h-7 w-7" /> Kelola Akun Pengguna</CardTitle>
            <CardDescription>Tambah, lihat, ubah, dan hapus akun pengguna.</CardDescription>
          </div>
          <AccountDialog onSuccess={triggerRefresh} addUser={addUser} updateUser={updateUser}>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Tambah Akun Baru</Button>
          </AccountDialog>
        </CardHeader>
        <CardContent className='max-w-full overflow-x-scroll'>
          <DataTable
            columns={columns}
            data={users}
            pageCount={pageCount}
            fetchData={fetchData}
            onFetchError={(error) => {
              toast({
                title: 'Error Memuat Data',
                description: error.message || 'Gagal memuat data pengguna.',
                variant: 'destructive',
              });
            }}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
            filters={filters}
          >
            <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan email..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
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
  updateUser: (id: string, data: FormData) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  currentUserId?: string;
}

const getColumns = ({ onSuccess, updateUser, deleteUser, currentUserId }: GetColumnsProps): ColumnDef<UserData>[] => [
  { accessorKey: 'email', header: ({ column }) => createSortableHeader(column, 'Email'), cell: ({ row }) => <div className="font-medium">{row.original.email}</div> },
  { accessorKey: 'role', header: ({ column }) => createSortableHeader(column, 'Role'), cell: ({ row }) => <div className="capitalize">{row.original.role}</div> },
  { accessorKey: 'createdAt', header: ({ column }) => createSortableHeader(column, 'Dibuat Tanggal'), cell: ({ row }) => (row.original.createdAt ? format(parseISO(row.original.createdAt), 'dd MMM yyyy', { locale: LocaleID }) : '-') },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      const isCurrentUser = user.id === currentUserId;
      return (
        <div className="text-right space-x-2">
          <AccountDialog item={user} onSuccess={onSuccess} updateUser={updateUser} addUser={async () => ({ success: false, error: "Not implemented" })} disabled={isCurrentUser}>
            <Button variant="outline" size="sm" disabled={isCurrentUser}><Edit className="h-4 w-4" /></Button>
          </AccountDialog>
          <DeleteDialog item={user} onSuccess={onSuccess} deleteUser={deleteUser} disabled={isCurrentUser} />
        </div>
      );
    },
  },
];
