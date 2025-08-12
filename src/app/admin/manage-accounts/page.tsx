'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Konteks & Tipe Data
import { useAccounts } from '@/context/account-context';
import { useAuth } from '@/context/auth-context';
import type { UserData } from './actions';
import { UserRoles } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

// Komponen UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Users, PlusCircle, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react';

// Skema Zod untuk validasi form
const accountSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  role: z.enum(UserRoles),
  password: z.string().min(6, 'Password minimal 6 karakter.').optional().or(z.literal('')),
});
type AccountFormValues = z.infer<typeof accountSchema>;


// Komponen Halaman Utama
export default function ManageAccountsPage() {
  const { users, isLoading, pageCount, fetchData, addUser, updateUser, deleteUser } = useAccounts();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

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
          <DataTable columns={columns} data={users} pageCount={pageCount} fetchData={fetchData} isLoading={isLoading} refreshTrigger={refreshTrigger} filters={filters}>
            <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan email..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
            </div>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Definisi Kolom untuk DataTable ---
interface GetColumnsProps {
  onSuccess: () => void;
  updateUser: (id: string, data: FormData) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
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
          <AccountDialog item={user} onSuccess={onSuccess} updateUser={updateUser} addUser={async () => false} disabled={isCurrentUser}>
            <Button variant="outline" size="sm" disabled={isCurrentUser}><Edit className="h-4 w-4" /></Button>
          </AccountDialog>
          <DeleteDialog item={user} onSuccess={onSuccess} deleteUser={deleteUser} disabled={isCurrentUser} />
        </div>
      );
    },
  },
];

// --- Sub-komponen untuk Dialog Add/Edit ---
interface AccountDialogProps {
  children: React.ReactNode;
  item?: UserData;
  onSuccess: () => void;
  addUser: (data: FormData) => Promise<boolean>;
  updateUser: (id: string, data: FormData) => Promise<boolean>;
  disabled?: boolean;
}

function AccountDialog({ children, item, onSuccess, addUser, updateUser, disabled }: AccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: item?.email || '', role: item?.role as 'admin' | 'cashier' || 'cashier', password: '' },
  });

  useEffect(() => {
    form.reset({ email: item?.email || '', role: item?.role as 'admin' | 'cashier' || 'cashier', password: '' });
  }, [item, open, form]);

  const onSubmit = (data: AccountFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('role', data.role);
      if (data.password) formData.append('password', data.password);
      const success = item ? await updateUser(item.id, formData) : await addUser(formData);
      if (success) { setOpen(false); onSuccess(); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Ubah Akun Pengguna' : 'Tambah Akun Baru'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" readOnly={!!item} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih role..." /></SelectTrigger></FormControl><SelectContent>{UserRoles.map(role => (<SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password {item ? '(Opsional)' : ''}</FormLabel><FormControl><Input {...field} type="password" placeholder={item ? "Isi untuk mengubah password" : "••••••••"} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Sub-komponen untuk AlertDialog Delete ---
interface DeleteDialogProps {
  item: UserData;
  onSuccess: () => void;
  deleteUser: (id: string) => Promise<boolean>;
  disabled?: boolean;
}

function DeleteDialog({ item, onSuccess, deleteUser, disabled }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const success = await deleteUser(item.id);
      if (success) onSuccess();
    });
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={disabled}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus akun <strong>{item.email}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
