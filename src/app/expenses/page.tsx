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

const expenseFormSchema = z.object({
  description: z.string().min(1, "Expense description is required"),
  category: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function RecordExpensePage() {
  const { addTransaction } = useTransactions();
  const { toast } = useToast();
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
      // Simulating an async operation, if addTransaction were async
      // await new Promise(resolve => setTimeout(resolve, 1000)); 
      addTransaction({
        type: 'expense',
        description: data.description,
        category: data.category,
        amount: data.amount,
      });
      toast({
        title: "Expense Recorded",
        description: "The expense has been successfully recorded.",
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record expense. Please try again.",
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
          <BadgeDollarSign className="mr-2 h-6 w-6" /> Record Expense
        </CardTitle>
        <CardDescription>Enter the details of the expense.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Electricity Bill, Purchase Stock" {...field} />
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
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Utilities, Supplies" {...field} />
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
                  <FormLabel>Amount (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100000" {...field} />
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
                "Record Expense"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
