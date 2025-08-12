'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Konteks & Tipe Data
import { useInventory } from '@/context/inventory-context';
import { useAuth } from '@/context/auth-context';
import type { InventoryItem} from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

// Komponen UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DataTable, createSortableHeader } from '@/components/ui/data-table';
import { PackageSearch, PackagePlus, Edit3, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { RestockDialog } from '@/components/ui/restock-dialog';

// Skema Zod untuk validasi form
const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Nama barang harus diisi'),
  sku: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  sellingPrice: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Batas stok tidak boleh negatif').optional(),
});
type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

// Helper untuk format mata uang
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Komponen Halaman Utama
export default function ManageInventoryPage() {
  const { inventoryItems, isLoading, pageCount, fetchData, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const filters = useMemo(() => ({ name: debouncedNameFilter }), [debouncedNameFilter]);

  const columns: ColumnDef<InventoryItem>[] = React.useMemo(
    () => getColumns({ onSuccess: triggerRefresh, updateInventoryItem, deleteInventoryItem }),
    [triggerRefresh, updateInventoryItem, deleteInventoryItem]
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
            <CardTitle className="text-2xl font-headline flex items-center"><PackageSearch className="mr-3 h-7 w-7" /> Kelola Inventaris</CardTitle>
            <CardDescription>Lihat, tambah, ubah, dan hapus barang inventaris.</CardDescription>
          </div>
          <ItemDialog onSuccess={triggerRefresh} addInventoryItem={addInventoryItem} updateInventoryItem={updateInventoryItem}>
            <Button><PackagePlus className="mr-2 h-5 w-5" /> Tambah Barang Baru</Button>
          </ItemDialog>
        </CardHeader>
        <CardContent className='max-w-full overflow-x-scroll'>
          <DataTable columns={columns} data={inventoryItems} pageCount={pageCount} fetchData={fetchData} isLoading={isLoading} refreshTrigger={refreshTrigger} filters={filters}>
            <div className="flex items-center gap-4">
                <Input placeholder="Filter berdasarkan nama..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
            </div>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

// Definisi kolom (tetap sama)
interface GetColumnsProps {
  onSuccess: () => void;
  updateInventoryItem: (id: string, data: InventoryFormValues) => Promise<boolean>;
  deleteInventoryItem: (id: string) => Promise<boolean>;
}

const getColumns = ({ onSuccess, updateInventoryItem, deleteInventoryItem }: GetColumnsProps): ColumnDef<InventoryItem>[] => [
  { accessorKey: 'name', header: ({ column }) => createSortableHeader(column, 'Nama Barang'), cell: ({ row }) => <div className="font-medium">{row.original.name}</div> },
  { accessorKey: 'stock_quantity', header: ({ column }) => createSortableHeader(column, 'Stok'), cell: ({ row }) => <div className="text-center">{row.original.stockQuantity}</div> },
  { accessorKey: 'selling_price', header: ({ column }) => createSortableHeader(column, 'Harga Jual'), cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.sellingPrice)}</div> },
  { accessorKey: 'last_restocked', header: ({ column }) => createSortableHeader(column, 'Terakhir Restock'), cell: ({ row }) => (row.original.lastRestocked ? format(parseISO(row.original.lastRestocked), 'dd MMM yyyy', { locale: LocaleID }) : '-') },
  {
    id: 'actions',
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="text-right space-x-2">
          <RestockDialog item={item} onSuccess={onSuccess} />
          <ItemDialog item={item} onSuccess={onSuccess} updateInventoryItem={updateInventoryItem} addInventoryItem={async () => false}>
            <Button variant="outline" size="sm"><Edit3 className="h-4 w-4" /></Button>
          </ItemDialog>
          <DeleteDialog item={item} onSuccess={onSuccess} deleteInventoryItem={deleteInventoryItem} />
        </div>
      );
    },
  },
];

// --- Sub-komponen untuk Dialog Add/Edit ---
interface ItemDialogProps {
  children: React.ReactNode;
  item?: InventoryItem;
  onSuccess: () => void;
  addInventoryItem: (data: InventoryFormValues) => Promise<boolean>;
  updateInventoryItem: (id: string, data: InventoryFormValues) => Promise<boolean>;
}

function ItemDialog({ children, item, onSuccess, addInventoryItem, updateInventoryItem }: ItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultValues = React.useMemo(() => ({ name: '', sku: '', stockQuantity: 0, purchasePrice: 0, sellingPrice: 0, lowStockThreshold: 10 }), []);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: item || defaultValues,
  });

  useEffect(() => { form.reset(item || defaultValues); }, [item, open, form, defaultValues]);

  const onSubmit = (data: InventoryFormValues) => {
    startTransition(async () => {
      const success = item ? await updateInventoryItem(item.id, data) : await addInventoryItem(data);
      if (success) { setOpen(false); onSuccess(); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Ubah Barang' : 'Tambah Barang Baru'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama Barang</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>SKU (Opsional)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="stockQuantity" render={({ field }) => (<FormItem><FormLabel>Jumlah Stok</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (<FormItem><FormLabel>Batas Stok Rendah</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel>Harga Beli</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="sellingPrice" render={({ field }) => (<FormItem><FormLabel>Harga Jual</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
  item: InventoryItem;
  onSuccess: () => void;
  deleteInventoryItem: (id: string) => Promise<boolean>;
}

function DeleteDialog({ item, onSuccess, deleteInventoryItem }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const success = await deleteInventoryItem(item.id);
      if (success) onSuccess();
    });
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus <strong>{item.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
