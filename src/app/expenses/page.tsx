"use client";

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
import { BadgeDollarSign, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const expenseFormSchema = z.object({
  description: z.string().min(1, "Deskripsi pengeluaran harus diisi"),
  category: z.string().optional(),
  amount: z.coerce.number().min(1, "Jumlah harus lebih besar dari 0"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function RecordExpensePage() {
  const { addTransaction } = useTransactions();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      category: "",
      amount: 0,
    },
  });

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsLoading(true);
    try {
      // Panggil addTransaction dengan await karena ini adalah operasi database
      const success = await addTransaction({
        type: 'expense',
        description: data.description,
        category: data.category || "",
        amount: data.amount,
      });

      if (success) {
        toast({
          title: "Pengeluaran Tercatat",
          description: "Data pengeluaran berhasil disimpan.",
        });
        form.reset();
        // Arahkan ke halaman utama transaksi setelah berhasil
        router.push('/transactions'); 
      } else {
        toast({
          title: "Error",
          description: "Gagal merekam pengeluaran. Silakan coba lagi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saat merekam pengeluaran:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <BadgeDollarSign className="mr-2 h-6 w-6" /> Rekam Pengeluaran
        </CardTitle>
        <CardDescription>Masukkan detail pengeluaran yang terjadi.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea placeholder="cth: Bayar Listrik, Beli Stok Casing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="cth: Utilitas, Perlengkapan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Rekam Pengeluaran"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}