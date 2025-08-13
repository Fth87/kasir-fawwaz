'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { InventoryItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Nama barang harus diisi'),
  sku: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  sellingPrice: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Batas stok tidak boleh negatif').optional(),
});
export type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

export interface ItemDialogProps {
  children: React.ReactNode;
  item?: InventoryItem;
  onSuccess: () => void;
  addInventoryItem: (data: InventoryFormValues) => Promise<{ success: boolean; error: Error | null }>;
  updateInventoryItem: (id: string, data: InventoryFormValues) => Promise<{ success: boolean; error: Error | null }>;
}

export function ItemDialog({ children, item, onSuccess, addInventoryItem, updateInventoryItem }: ItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const defaultValues = React.useMemo(() => ({ name: '', sku: '', stockQuantity: 0, purchasePrice: 0, sellingPrice: 0, lowStockThreshold: 10 }), []);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: item ? { ...item, purchasePrice: item.purchasePrice ?? 0 } : defaultValues,
  });

  useEffect(() => { form.reset(item ? { ...item, purchasePrice: item.purchasePrice ?? 0 } : defaultValues); }, [item, open, form, defaultValues]);

  const onSubmit = (data: InventoryFormValues) => {
    startTransition(async () => {
      const result = item ? await updateInventoryItem(item.id, data) : await addInventoryItem(data);
      if (result.success) {
        toast({ title: 'Sukses', description: `Barang "${data.name}" berhasil ${item ? 'diperbarui' : 'ditambahkan'}.` });
        setOpen(false);
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error?.message || 'Gagal menyimpan barang.', variant: 'destructive' });
      }
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
              <FormField control={form.control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel>Harga Beli</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="sellingPrice" render={({ field }) => (<FormItem><FormLabel>Harga Jual</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
