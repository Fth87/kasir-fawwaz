'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
import type { PaginationState, SortingState } from '@tanstack/react-table';

// Stores & Types
import { useTransactionStore, type UpdateTransactionInput } from '@/stores/transaction.store';
import { useAuthStore } from '@/stores/auth.store';
import type { ServiceTransaction, ServiceStatusValue, TransactionTypeFilter } from '@/types';
import { getServiceStatusLabel, ServiceStatusOptions } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Settings, PlusCircle, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react';

// Zod Schema
const serviceSchema = z.object({
  customerName: z.string().min(1, 'Nama pelanggan harus diisi'),
  serviceName: z.string().min(1, 'Nama layanan harus diisi'),
  device: z.string().min(1, 'Nama perangkat harus diisi'),
  issueDescription: z.string().min(1, 'Deskripsi masalah harus diisi'),
  serviceFee: z.coerce.number().min(0, 'Biaya servis tidak boleh negatif'),
  partsCost: z.coerce.number().min(0, 'Biaya barang tidak boleh negatif'),
  status: z.enum(ServiceStatusOptions.map(opt => opt.value) as [ServiceStatusValue, ...ServiceStatusValue[]]),
  customerId: z.string().optional(),
});
type ServiceFormValues = z.infer<typeof serviceSchema>;

// Helper
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Main Page Component
export default function ManageServicesPage() {
  const { transactions, isLoading, pageCount, fetchData, addTransaction, updateTransactionDetails, deleteTransaction } = useTransactionStore();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const { toast } = useToast();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const filters = useMemo(() => ({ customerName: debouncedNameFilter, type: 'service' as TransactionTypeFilter }), [debouncedNameFilter]);

  const services = useMemo(() => transactions.filter(tx => tx.type === 'service') as ServiceTransaction[], [transactions]);

  const fetchDataWithToast = useCallback(async (pagination: PaginationState, sorting: SortingState, currentFilters: { customerName?: string, type?: TransactionTypeFilter }) => {
    const { error } = await fetchData(pagination, sorting, currentFilters);
    if (error) {
      toast({
        title: 'Error Memuat Data',
        description: 'Gagal memuat data servis. Silakan coba lagi.',
        variant: 'destructive',
      });
    }
  }, [fetchData, toast]);

  const columns: ColumnDef<ServiceTransaction>[] = React.useMemo(
    () => getColumns({ onSuccess: triggerRefresh, updateService: updateTransactionDetails, deleteService: deleteTransaction }),
    [triggerRefresh, updateTransactionDetails, deleteTransaction]
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
            <CardTitle className="text-2xl font-headline flex items-center"><Settings className="mr-3 h-7 w-7" /> Kelola Servis</CardTitle>
            <CardDescription>Tambah, lihat, dan kelola semua transaksi servis.</CardDescription>
          </div>
          <ServiceDialog onSuccess={triggerRefresh} addService={addTransaction} updateService={updateTransactionDetails}>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Tambah Servis Baru</Button>
          </ServiceDialog>
        </CardHeader>
        <CardContent className='max-w-full overflow-x-scroll'>
          <DataTable columns={columns} data={services} pageCount={pageCount} fetchData={fetchDataWithToast} isLoading={isLoading} refreshTrigger={refreshTrigger} filters={filters}>
             <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan nama pelanggan..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
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
  updateService: (id: string, data: UpdateTransactionInput) => Promise<{ success: boolean; error: Error | null; }>;
  deleteService: (id: string) => Promise<{ success: boolean; error: Error | null; }>;
}

const getColumns = ({ onSuccess, updateService, deleteService }: GetColumnsProps): ColumnDef<ServiceTransaction>[] => [
  { accessorKey: 'date', header: ({ column }) => createSortableHeader(column, 'Tanggal'), cell: ({ row }) => format(parseISO(row.original.date), 'dd MMM yyyy', { locale: LocaleID }) },
  { accessorKey: 'customerName', header: ({ column }) => createSortableHeader(column, 'Pelanggan'), cell: ({ row }) => <div className="font-medium">{row.original.customerName}</div> },
  { accessorKey: 'serviceName', header: 'Layanan', cell: ({ row }) => row.original.serviceName },
  { accessorKey: 'status', header: ({ column }) => createSortableHeader(column, 'Status'), cell: ({ row }) => getServiceStatusLabel(row.original.status) },
  { accessorKey: 'serviceFee', header: ({ column }) => createSortableHeader(column, 'Biaya'), cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.serviceFee)}</div> },
  {
    id: 'actions',
    cell: ({ row }) => {
      const service = row.original;
      return (
        <div className="text-right space-x-2">
          <ServiceDialog item={service} onSuccess={onSuccess} updateService={updateService} addService={async () => ({ success: false, error: new Error("Not implemented") })}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
          </ServiceDialog>
          <DeleteDialog item={service} onSuccess={onSuccess} deleteService={deleteService} />
        </div>
      );
    },
  },
];

// Add/Edit Dialog
interface ServiceDialogProps {
  children: React.ReactNode;
  item?: ServiceTransaction;
  onSuccess: () => void;
  addService: (data: ServiceFormValues & { type: 'service' }) => Promise<{ success: boolean; error: Error | null; }>;
  updateService: (id: string, data: UpdateTransactionInput) => Promise<{ success: boolean; error: Error | null; }>;
}

function ServiceDialog({ children, item, onSuccess, addService, updateService }: ServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const defaultValues = React.useMemo(() => ({
    customerName: item?.customerName || '',
    serviceName: item?.serviceName || '',
    device: item?.device || '',
    issueDescription: item?.issueDescription || '',
    serviceFee: item?.serviceFee || 0,
    partsCost: item?.partsCost || 0,
    status: item?.status || 'PENDING_CONFIRMATION',
    customerId: item?.customerId || undefined,
  }), [item]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues,
  });

  useEffect(() => { form.reset(defaultValues); }, [item, open, form, defaultValues]);

  const onSubmit = (data: ServiceFormValues) => {
    startTransition(async () => {
      const result = item
        ? await updateService(item.id, {
            details: {
              serviceName: data.serviceName,
              device: data.device,
              issueDescription: data.issueDescription,
              status: data.status,
              partsCost: data.partsCost,
            },
            customerName: data.customerName,
            customerId: data.customerId,
            total_amount: data.serviceFee,
          })
        : await addService({ ...data, type: 'service' });

      if (result.success) {
        toast({ title: 'Sukses', description: `Servis berhasil ${item ? 'diperbarui' : 'ditambahkan'}.` });
        setOpen(false);
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error?.message || 'Gagal menyimpan data servis.', variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Ubah Detail Servis' : 'Tambah Servis Baru'}</DialogTitle>
          <DialogDescription>Form untuk {item ? 'mengubah' : 'menambah'} data servis.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Nama Pelanggan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="serviceName" render={({ field }) => (<FormItem><FormLabel>Nama Layanan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="device" render={({ field }) => (<FormItem><FormLabel>Perangkat</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issueDescription" render={({ field }) => (<FormItem><FormLabel>Deskripsi Masalah</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="serviceFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Biaya Servis</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="partsCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Biaya Barang</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Servis</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ServiceStatusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Dialog
interface DeleteDialogProps {
  item: ServiceTransaction;
  onSuccess: () => void;
  deleteService: (id: string) => Promise<{ success: boolean; error: Error | null; }>;
}

function DeleteDialog({ item, onSuccess, deleteService }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const { success, error } = await deleteService(item.id);
      if (success) {
        toast({ title: 'Sukses', description: `Servis untuk ${item.customerName} berhasil dihapus.` });
        onSuccess();
      } else {
        toast({ title: 'Error', description: error?.message || 'Gagal menghapus servis.', variant: 'destructive' });
      }
    });
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus servis untuk <strong>{item.customerName}</strong> ({item.serviceName}) secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
