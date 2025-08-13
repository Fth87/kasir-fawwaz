'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Customer } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const customerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan harus diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;

export interface CustomerDialogProps {
  children: React.ReactNode;
  item?: Customer;
  onSuccess: () => void;
  addCustomer: (data: CustomerFormValues) => Promise<{ customer: Customer | null; error: Error | null }>;
  updateCustomer: (id: string, data: CustomerFormValues) => Promise<{ success: boolean; error: Error | null }>;
}

export function CustomerDialog({ children, item, onSuccess, addCustomer, updateCustomer }: CustomerDialogProps) {
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
