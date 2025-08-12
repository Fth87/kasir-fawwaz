'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Konteks & Tipe Data
import { useServices, NewServiceTransactionInput } from '@/context/service-context';
import { useAuth } from '@/context/auth-context';
import type { ServiceTransaction, ServiceStatusValue } from '@/types';
import { getServiceStatusLabel, ServiceStatusOptions } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

// Komponen UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { Settings, PlusCircle, Edit, Trash2, Loader2, ShieldAlert } from 'lucide-react';

// Skema Zod untuk validasi form
const serviceSchema = z.object({
  customerName: z.string().min(1, 'Nama pelanggan harus diisi'),
  serviceName: z.string().min(1, 'Nama layanan harus diisi'),
  device: z.string().min(1, 'Nama perangkat harus diisi'),
  issueDescription: z.string().min(1, 'Deskripsi masalah harus diisi'),
  serviceFee: z.coerce.number().min(0, 'Biaya servis tidak boleh negatif'),
  status: z.enum(ServiceStatusOptions.map(opt => opt.value) as [ServiceStatusValue, ...ServiceStatusValue[]]),
  customerId: z.string().optional(),
});
type ServiceFormValues = z.infer<typeof serviceSchema>;

// Helper untuk format mata uang
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Komponen Halaman Utama
export default function ManageServicesPage() {
  const { services, isLoading, pageCount, fetchData, addService, updateService, deleteService } = useServices();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const filters = useMemo(() => ({ customerName: debouncedNameFilter }), [debouncedNameFilter]);

  const columns: ColumnDef<ServiceTransaction>[] = React.useMemo(
    () => getColumns({ onSuccess: triggerRefresh, updateService, deleteService }),
    [triggerRefresh, updateService, deleteService]
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
          <ServiceDialog onSuccess={triggerRefresh} addService={addService} updateService={updateService}>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Tambah Servis Baru</Button>
          </ServiceDialog>
        </CardHeader>
        <CardContent className='max-w-full overflow-x-scroll'>
          <DataTable columns={columns} data={services} pageCount={pageCount} fetchData={fetchData} isLoading={isLoading} refreshTrigger={refreshTrigger} filters={filters}>
             <div className="flex items-center gap-4">
              <Input placeholder="Filter berdasarkan nama pelanggan..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
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
  updateService: (id: string, data: ServiceFormValues) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
}

const getColumns = ({ onSuccess, updateService, deleteService }: GetColumnsProps): ColumnDef<ServiceTransaction>[] => [
  { accessorKey: 'created_at', header: ({ column }) => createSortableHeader(column, 'Tanggal'), cell: ({ row }) => format(parseISO(row.original.date), 'dd MMM yyyy', { locale: LocaleID }) },
  { accessorKey: 'customer_name', header: ({ column }) => createSortableHeader(column, 'Pelanggan'), cell: ({ row }) => <div className="font-medium">{row.original.customerName}</div> },
  { accessorKey: 'serviceName', header: 'Layanan', cell: ({ row }) => row.original.serviceName },
  { accessorKey: 'status', header: ({ column }) => createSortableHeader(column, 'Status'), cell: ({ row }) => getServiceStatusLabel(row.original.status) },
  { accessorKey: 'total_amount', header: ({ column }) => createSortableHeader(column, 'Biaya'), cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.serviceFee)}</div> },
  {
    id: 'actions',
    cell: ({ row }) => {
      const service = row.original;
      return (
        <div className="text-right space-x-2">
          <ServiceDialog item={service} onSuccess={onSuccess} updateService={updateService} addService={async () => false}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
          </ServiceDialog>
          <DeleteDialog item={service} onSuccess={onSuccess} deleteService={deleteService} />
        </div>
      );
    },
  },
];

// --- Sub-komponen untuk Dialog Add/Edit ---
interface ServiceDialogProps {
  children: React.ReactNode;
  item?: ServiceTransaction;
  onSuccess: () => void;
  addService: (data: NewServiceTransactionInput) => Promise<boolean>;
  updateService: (id: string, data: ServiceFormValues) => Promise<boolean>;
}

function ServiceDialog({ children, item, onSuccess, addService, updateService }: ServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaultValues = React.useMemo(() => ({
    customerName: item?.customerName || '',
    serviceName: item?.serviceName || '',
    device: item?.device || '',
    issueDescription: item?.issueDescription || '',
    serviceFee: item?.serviceFee || 0,
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
      const success = item ? await updateService(item.id, data) : await addService({ ...data, type: 'service' });
      if (success) { setOpen(false); onSuccess(); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Ubah Detail Servis' : 'Tambah Servis Baru'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Nama Pelanggan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="serviceName" render={({ field }) => (<FormItem><FormLabel>Nama Layanan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="device" render={({ field }) => (<FormItem><FormLabel>Perangkat</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issueDescription" render={({ field }) => (<FormItem><FormLabel>Deskripsi Masalah</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="serviceFee" render={({ field }) => (<FormItem><FormLabel>Biaya Servis</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status Servis</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih status..." /></SelectTrigger></FormControl><SelectContent>{ServiceStatusOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Sub-komponen untuk AlertDialog Delete ---
interface DeleteDialogProps {
  item: ServiceTransaction;
  onSuccess: () => void;
  deleteService: (id: string) => Promise<boolean>;
}

function DeleteDialog({ item, onSuccess, deleteService }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const success = await deleteService(item.id);
      if (success) onSuccess();
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
