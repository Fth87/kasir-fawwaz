'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTransactions } from '@/context/transaction-context';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 1. Skema diperbarui dengan device dan issueDescription
const serviceFormSchema = z.object({
  serviceName: z.string().min(1, 'Nama layanan harus diisi'),
  device: z.string().min(1, 'Nama/tipe perangkat harus diisi'),
  issueDescription: z.string().min(1, 'Deskripsi masalah harus diisi'),
  customerName: z.string().optional(),
  price: z.coerce.number().min(0, 'Biaya servis tidak boleh negatif'),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function RecordServicePage() {
  const { addTransaction } = useTransactions();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceName: '',
      device: '',
      issueDescription: '',
      customerName: '',
      price: 0,
    },
  });

  // 2. Fungsi onSubmit diubah menjadi async
  const onSubmit = async (data: ServiceFormValues) => {
    setIsLoading(true);
    try {
      // 3. Panggil addTransaction dengan await dan kirim data yang sesuai
      const success = await addTransaction({
        type: 'service',
        serviceName: data.serviceName,
        customerName: data.customerName || 'Anonymous',
        device: data.device,
        issueDescription: data.issueDescription,
        price: data.price,
      });

      if (success) {
        toast({
          title: 'Servis Tercatat',
          description: 'Transaksi servis berhasil direkam.',
        });
        form.reset();
        // 4. Redirect ke halaman daftar transaksi
        router.push('/transactions');
      } else {
        toast({
          title: 'Error',
          description: 'Gagal merekam servis. Silakan coba lagi.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saat merekam servis:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan yang tidak terduga.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <Wrench className="mr-2 h-6 w-6" /> Rekam Transaksi Servis
        </CardTitle>
        <CardDescription>Masukkan detail dari layanan servis yang diberikan.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Layanan</FormLabel>
                  <FormControl>
                    <Input placeholder="cth: Ganti Layar iPhone 11" {...field} />
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
                    <Textarea placeholder="cth: Layar retak setelah jatuh, sebagian tidak bisa disentuh." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pelanggan (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama pelanggan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Rekam Servis'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
