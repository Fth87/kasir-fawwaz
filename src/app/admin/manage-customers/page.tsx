'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Konteks & Tipe Data
import { useCustomerStore } from '@/stores/customer.store';
import { useAuthStore } from '@/stores/auth.store';
import type { Customer } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

// Komponen UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Users2, PlusCircle, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import type { PaginationState, SortingState } from '@tanstack/react-table';

// Skema Zod untuk validasi form
const customerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan harus diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type CustomerFormValues = z.infer<typeof customerSchema>;


// Komponen Halaman Utama
export default function ManageCustomersPage() {
  const { customers, isLoading, pageCount, fetchData, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const { toast } = useToast();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const filters = useMemo(() => ({ name: debouncedNameFilter }), [debouncedNameFilter]);

  const fetchDataWithToast = useCallback(async (pagination: PaginationState, sorting: SortingState, filters: { name?: string; }) => {
    const { error } = await fetchData(pagination, sorting, filters);
    if (error) {
      toast({
        title: 'Error Memuat Data',
        description: 'Gagal memuat data pelanggan. Silakan coba lagi.',
        variant: 'destructive',
      });
    }
  }, [fetchData, toast]);

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
          <DataTable columns={columns} data={customers} pageCount={pageCount} fetchData={fetchDataWithToast} isLoading={isLoading} refreshTrigger={refreshTrigger} filters={filters}>
            <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan nama..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
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

// --- Sub-komponen untuk Dialog Add/Edit ---
interface CustomerDialogProps {
  children: React.ReactNode;
  item?: Customer;
  onSuccess: () => void;
  addCustomer: (data: CustomerFormValues) => Promise<{ customer: Customer | null; error: Error | null }>;
  updateCustomer: (id: string, data: CustomerFormValues) => Promise<{ success: boolean; error: Error | null }>;
}

function CustomerDialog({ children, item, onSuccess, addCustomer, updateCustomer }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const defaultValues = React.useMemo(() => ({ name: item?.name || '', phone: item?.phone || '', address: item?.address || '', notes: item?.notes || '' }), [item]);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  useEffect(() => { form.reset(defaultValues); }, [item, open, form, defaultValues]);

  const onSubmit = (data: CustomerFormValues) => {
    startTransition(async () => {
      const result = item ? await updateCustomer(item.id, data) : await addCustomer(data);
      if (!result.error) {
        toast({ title: 'Sukses', description: `Data pelanggan "${data.name}" berhasil ${item ? 'diperbarui' : 'ditambahkan'}.` });
        setOpen(false);
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telepon</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Alamat</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Catatan</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Sub-komponen untuk AlertDialog Delete ---
interface DeleteDialogProps {
  item: Customer;
  onSuccess: () => void;
  deleteCustomer: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

function DeleteDialog({ item, onSuccess, deleteCustomer }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const handleDelete = () => {
    startTransition(async () => {
      const { success, error } = await deleteCustomer(item.id);
      if (success) {
        toast({ title: 'Sukses', description: `Pelanggan "${item.name}" berhasil dihapus.` });
        onSuccess();
      } else {
        toast({ title: 'Error', description: error?.message || 'Gagal menghapus pelanggan.', variant: 'destructive' });
      }
    });
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus pelanggan <strong>{item.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
