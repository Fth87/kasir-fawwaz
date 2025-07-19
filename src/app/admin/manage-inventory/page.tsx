'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInventory } from '@/context/inventory-context';
import type { InventoryItem } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PackageSearch, PackagePlus, Edit3, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
import { RestockDialog } from '@/components/ui/restock-dialog';

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Nama barang harus diisi'),
  sku: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  sellingPrice: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Batas stok tidak boleh negatif').optional(),
});

type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

const defaultFormValues: InventoryFormValues = {
  name: '',
  sku: '',
  stockQuantity: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  lowStockThreshold: 10,
};

export default function ManageInventoryPage() {
  const { inventoryItems, isLoading, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          sku: editingItem.sku || '',
          stockQuantity: editingItem.stockQuantity,
          purchasePrice: editingItem.purchasePrice,
          sellingPrice: editingItem.sellingPrice,
          lowStockThreshold: editingItem.lowStockThreshold || 10,
        });
      } else {
        form.reset(defaultFormValues);
      }
    }
  }, [editingItem, isDialogOpen, form]);

  const handleOpenDialog = (item?: InventoryItem) => {
    setEditingItem(item || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => setIsDialogOpen(false);

  const onSubmit = (data: InventoryFormValues) => {
    startTransition(async () => {
      const success = editingItem ? await updateInventoryItem(editingItem.id, data) : await addInventoryItem(data);
      if (success) handleCloseDialog();
    });
  };

  const handleDelete = (itemId: string) => {
    startTransition(async () => {
      await deleteInventoryItem(itemId);
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const combinedIsLoading = isLoadingAuth || isLoading;

  if (combinedIsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Akses Ditolak. Hanya untuk Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline flex items-center">
              <PackageSearch className="mr-3 h-7 w-7" /> Kelola Inventaris
            </CardTitle>
            <CardDescription>Lihat, tambah, ubah, dan hapus barang inventaris.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PackagePlus className="mr-2 h-5 w-5" /> Tambah Barang Baru
          </Button>
        </CardHeader>
        <CardContent>
          {!inventoryItems || inventoryItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Belum ada barang di inventaris.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead>Terakhir Restock</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id} className={item.stockQuantity <= (item.lowStockThreshold || 0) ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.stockQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                    <TableCell>{item.lastRestocked ? format(parseISO(item.lastRestocked), 'dd MMM yyyy', { locale: LocaleID }) : '-'}</TableCell>
                    <TableCell className="text-right space-x-2 space-y-2">
                      <RestockDialog item={item} />
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                        <Edit3 className="mr-1 h-4 w-4" /> Ubah
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isPending}>
                            <Trash2 className="mr-1 h-4 w-4" /> Hapus
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ini akan menghapus barang <strong>{item.name}</strong> secara permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {editingItem ? <Edit3 className="mr-2 h-5 w-5" /> : <PackagePlus className="mr-2 h-5 w-5" />}
              {editingItem ? 'Ubah Barang Inventaris' : 'Tambah Barang Baru'}
            </DialogTitle>
            <DialogDescription>{editingItem ? `Ubah detail untuk ${editingItem.name}.` : 'Isi detail untuk barang inventaris baru.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Barang</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: Kaca Pelindung Premium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="cth: TG-IPX-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Stok</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batas Stok Rendah</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Beli (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="25000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Jual (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
