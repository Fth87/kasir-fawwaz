'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldError, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransactionStore, type UpdateTransactionInput } from '@/stores/transaction.store';
import { getTransactionById } from '@/app/transactions/actions';
import type { Transaction, SaleItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit3, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Schemas for each transaction type
const saleItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  pricePerItem: z.coerce.number().min(0, 'Price must be non-negative'),
  total: z.coerce.number(),
});

const saleEditSchema = z.object({
  type: z.literal('sale'),
  customerName: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
});

const serviceEditSchema = z.object({
  type: z.literal('service'),
  serviceName: z.string().min(1, 'Service name is required'),
  customerName: z.string().optional(),
  customerPhone: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9\s+-]+$/.test(val), { message: 'Invalid phone number format' }),
  customerAddress: z.string().optional(),
  serviceFee: z.coerce.number().min(0, 'Service fee must be non-negative'),
});

const expenseEditSchema = z.object({
  type: z.literal('expense'),
  description: z.string().min(1, 'Expense description is required'),
  category: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
});

const editTransactionSchema = z.discriminatedUnion('type', [saleEditSchema, serviceEditSchema, expenseEditSchema]);
type EditTransactionFormValues = z.infer<typeof editTransactionSchema>;

export default function EditTransactionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { updateTransactionDetails } = useTransactionStore();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const transactionId = params.id as string;

  const form = useForm<EditTransactionFormValues>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    // This needs to be cast as `items` is not on all types
    name: 'items' as const,
  });

  useEffect(() => {
    if (transactionId) {
      setIsLoading(true);
      getTransactionById(transactionId).then(({ data: tx, error }) => {
        if (error || !tx) {
          toast({ title: 'Error', description: 'Failed to fetch transaction.', variant: 'destructive' });
          setTransaction(null);
        } else {
          setTransaction(tx);
          if (tx.type === 'sale') {
            form.reset({ type: 'sale', customerName: tx.customerName || '', items: tx.items.map((item) => ({ ...item })) });
          } else if (tx.type === 'service') {
            form.reset({ type: 'service', serviceName: tx.serviceName, customerName: tx.customerName || '', customerPhone: tx.customerPhone || '', customerAddress: tx.customerAddress || '', serviceFee: tx.serviceFee });
          } else if (tx.type === 'expense') {
            form.reset({ type: 'expense', description: tx.description, category: tx.category || '', amount: tx.amount });
          }
        }
        setIsLoading(false);
      });
    }
  }, [transactionId, form, toast]);

  const onSubmit = async (data: EditTransactionFormValues) => {
    if (!transaction) return;
    setIsLoading(true);

    // let updatePayload: Partial<Transaction> = {};
    let updatePayload: UpdateTransactionInput = {};

    if (data.type === 'sale' && transaction.type === 'sale') {
      const saleData = data as Extract<EditTransactionFormValues, { type: 'sale' }>;
      const itemsWithTotals = saleData.items.map((item) => {
        return { ...item, id: item.id || crypto.randomUUID(), total: item.quantity * item.pricePerItem };
      });
      const grandTotal = itemsWithTotals.reduce((sum, i) => sum + i.total, 0);
      updatePayload = { customerName: saleData.customerName, details: { items: itemsWithTotals }, total_amount: grandTotal };
    } else if (data.type === 'service') {
      updatePayload = { customerName: data.customerName, total_amount: data.serviceFee, details: { serviceName: data.serviceName, device: 'N/A', issueDescription: 'N/A' } };
    } else if (data.type === 'expense') {
      updatePayload = {
        total_amount: data.amount,
        details: {
          description: data.description,
          ...(data.category ? { category: data.category } : {}),
        },
      };
    }

    const { success, error } = await updateTransactionDetails(transaction.id, updatePayload);

    if (success) {
      toast({ title: 'Transaction Updated', description: 'The transaction has been successfully updated.' });
      router.push(`/admin/manage-transactions`);
    } else {
      toast({ title: 'Error', description: error?.message || 'Failed to update transaction.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  if (transaction === undefined || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" /> Loading transaction...
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Transaction Not Found</h2>
        <Button onClick={() => router.push('/admin/manage-transactions')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Manage Transactions
        </Button>
      </div>
    );
  }

  const calculateSaleItemTotal = (itemIndex: number) => {
    const items = form.watch('items' as const) as SaleItem[] | undefined;
    if (!items || !items[itemIndex]) return 0;
    const item = items[itemIndex];
    return (item.quantity || 0) * (item.pricePerItem || 0);
  };

  const calculateSaleGrandTotal = () => {
    const items = form.watch('items' as const) as SaleItem[] | undefined;
    if (!items) return 0;
    return items.reduce((acc, item) => acc + (item.quantity || 0) * (item.pricePerItem || 0), 0);
  };

  const itemsError = (
    form.formState.errors as FieldErrors<{ items?: unknown }>
  ).items as FieldError | undefined;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <Edit3 className="mr-2 h-6 w-6" /> Edit Transaction
        </CardTitle>
        <CardDescription>Modify the details for transaction ID: {transaction.id.substring(0, 8)}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="type" render={({ field }) => <input type="hidden" {...field} />} />
            {transaction.type === 'sale' && (
              <>
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Customer Name (Optional)</FormLabel>{' '}
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <Separator />
                <FormLabel className="text-md font-medium">Items</FormLabel>
                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start p-4 border rounded-md relative">
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          {' '}
                          <FormLabel>Item Name</FormLabel>{' '}
                          <FormControl>
                            <Input placeholder="e.g., Phone Case" {...field} />
                          </FormControl>{' '}
                          <FormMessage />{' '}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          {' '}
                          <FormLabel>Quantity</FormLabel>{' '}
                          <FormControl>
                            <Input type="number" placeholder="1" {...field} />
                          </FormControl>{' '}
                          <FormMessage />{' '}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.pricePerItem`}
                      render={({ field }) => (
                        <FormItem>
                          {' '}
                          <FormLabel>Price/Item (IDR)</FormLabel>{' '}
                          <FormControl>
                            <Input type="number" placeholder="50000" {...field} />
                          </FormControl>{' '}
                          <FormMessage />{' '}
                        </FormItem>
                      )}
                    />
                    <div className="text-sm md:col-span-3 mt-1">Item Total: IDR {calculateSaleItemTotal(index).toLocaleString('id-ID')}</div>
                    {fields.length > 1 && (
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="h-8 w-8 md:absolute md:top-3 md:right-3" aria-label="Remove item">
                        {' '}
                        <Trash2 className="h-4 w-4" />{' '}
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ name: '', quantity: 1, pricePerItem: 0, total: 0, id: '' })} className="mt-2">
                  {' '}
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item{' '}
                </Button>
                {itemsError?.message && (
                  <p className="text-sm font-medium text-destructive">{itemsError.message}</p>
                )}
                <div className="text-right text-lg font-bold">Grand Total: IDR {calculateSaleGrandTotal().toLocaleString('id-ID')}</div>
              </>
            )}
            {transaction.type === 'service' && (
              <>
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Service Name</FormLabel>{' '}
                      <FormControl>
                        <Input placeholder="e.g., Screen Replacement" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Customer Name (Optional)</FormLabel>{' '}
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Customer Phone (Optional)</FormLabel>{' '}
                      <FormControl>
                        <Input type="tel" placeholder="e.g., 08123456789" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Customer Address (Optional)</FormLabel>{' '}
                      <FormControl>
                        <Textarea placeholder="Enter customer address" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceFee"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Service Fee (IDR)</FormLabel>{' '}
                      <FormControl>
                        <Input type="number" placeholder="150000" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
              </>
            )}
            {transaction.type === 'expense' && (
              <>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Description</FormLabel>{' '}
                      <FormControl>
                        <Textarea placeholder="e.g., Electricity Bill" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Category (Optional)</FormLabel>{' '}
                      <FormControl>
                        <Input placeholder="e.g., Utilities" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      <FormLabel>Amount (IDR)</FormLabel>{' '}
                      <FormControl>
                        <Input type="number" placeholder="100000" {...field} />
                      </FormControl>{' '}
                      <FormMessage />{' '}
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {' '}
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel{' '}
            </Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {' '}
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />} Save Changes{' '}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
