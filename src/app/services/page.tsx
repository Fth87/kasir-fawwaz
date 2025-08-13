'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CustomerCombobox } from '@/components/ui/customer-combobox';

// Stores & Hooks
import { useTransactionStore } from '@/stores/transaction.store';
import { useCustomerStore } from '@/stores/customer.store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Wrench, Loader2 } from 'lucide-react';

// Zod Schema
const serviceFormSchema = z.object({
  serviceName: z.string().min(1, 'Nama layanan harus diisi'),
  device: z.string().min(1, 'Nama/tipe perangkat harus diisi'),
  issueDescription: z.string().min(1, 'Deskripsi masalah harus diisi'),
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Nama pelanggan harus diisi'),
  }),
  serviceFee: z.coerce.number().min(0, 'Biaya servis tidak boleh negatif'),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function RecordServicePage() {
  const { addTransaction } = useTransactionStore();
  const { isLoading: isLoadingCustomers, fetchData: fetchCustomers } = useCustomerStore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceName: '',
      device: '',
      issueDescription: '',
      customer: { id: undefined, name: '' },
      serviceFee: 0,
    },
  });

  useEffect(() => {
    void fetchCustomers({ pageIndex: 0, pageSize: 100 }, [], {});
  }, [fetchCustomers]);

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    const { success, error } = await addTransaction({
      type: 'service',
      serviceName: data.serviceName,
      customerName: data.customer.name,
      customerId: data.customer.id,
      device: data.device,
      issueDescription: data.issueDescription,
      serviceFee: data.serviceFee,
    });

    if (success) {
      toast({ title: 'Servis Tercatat', description: 'Transaksi servis berhasil direkam.' });
      form.reset();
      router.push('/transactions');
    } else {
      toast({ title: 'Error', description: error?.message || 'Gagal merekam servis.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <Wrench className="mr-3 h-7 w-7" /> Rekam Transaksi Servis
        </CardTitle>
        <CardDescription>Masukkan detail dari layanan servis yang diberikan.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nama Pelanggan</FormLabel>
                  <CustomerCombobox value={{...field.value, id: field.value.id || ''}} onChange={field.onChange} isLoading={isLoadingCustomers} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Layanan</FormLabel>
                  <FormControl>
                    <Input placeholder="cth: Ganti Layar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="device"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perangkat</FormLabel>
                  <FormControl>
                    <Input placeholder="cth: iPhone 11 Pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issueDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Masalah</FormLabel>
                  <FormControl>
                    <Textarea placeholder="cth: Layar retak setelah jatuh." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biaya Servis (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="150000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Rekam Servis'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
