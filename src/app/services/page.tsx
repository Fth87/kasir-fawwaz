
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
import { Wrench, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const serviceFormSchema = z.object({
  serviceName: z.string().min(1, "Service name is required"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional().refine(val => !val || /^[0-9\s+-]+$/.test(val), {
    message: "Invalid phone number format",
  }),
  customerAddress: z.string().optional(),
  serviceFee: z.coerce.number().min(0, "Service fee must be non-negative"),
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
      serviceName: "",
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      serviceFee: 0,
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    setIsLoading(true);
    try {
      const newTransaction = addTransaction({
        type: 'service',
        serviceName: data.serviceName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        serviceFee: data.serviceFee,
      });
      toast({
        title: "Service Recorded",
        description: "The service income has been successfully recorded.",
      });
      form.reset();
      if (newTransaction && newTransaction.id) {
        router.push(`/transactions/${newTransaction.id}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record service. Please try again.",
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
          <Wrench className="mr-2 h-6 w-6" /> Record Service Income
        </CardTitle>
        <CardDescription>Enter the details of the service transaction.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Screen Replacement" {...field} />
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
                  <FormLabel>Customer Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="e.g., 08123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter customer address" {...field} />
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
                  <FormLabel>Service Fee (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="150000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Service Income"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
