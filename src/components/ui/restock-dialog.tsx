'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInventory } from '@/context/inventory-context';
import type { InventoryItem } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Loader2 } from 'lucide-react';

const restockSchema = z.object({
  quantityToAdd: z.coerce.number().int().min(1, 'Jumlah harus minimal 1'),
});
type RestockFormValues = z.infer<typeof restockSchema>;

interface RestockDialogProps {
  item: InventoryItem;
  onSuccess: () => void; // Callback untuk refresh
}

export function RestockDialog({ item, onSuccess }: RestockDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { restockItem } = useInventory();

  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockSchema),
    defaultValues: { quantityToAdd: 1 },
  });

  const onSubmit = (data: RestockFormValues) => {
    startTransition(async () => {
      const success = await restockItem(item.id, data.quantityToAdd);
      if (success) {
        setOpen(false);
        form.reset();
        onSuccess(); // Panggil refresh
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restock Barang</DialogTitle>
          <DialogDescription>
            Tambah jumlah stok untuk <span className="font-semibold">{item.name}</span>. Stok saat ini: {item.stockQuantity}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="quantityToAdd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah yang Ditambahkan</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="cth: 50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tambah Stok
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
