'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTransactionStore } from '@/stores/transaction.store';
import { useInventoryStore } from '@/stores/inventory.store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CustomerCombobox } from '@/components/ui/customer-combobox';
import { useCustomerStore } from '@/stores/customer.store';
import { InventoryCombobox } from '@/components/ui/inventory-combobox';

const saleItemSchema = z.object({
  name: z.string().min(1, 'Nama barang harus diisi'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  pricePerItem: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
});

const saleFormSchema = z.object({
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Nama pelanggan harus diisi'),
  }),
  items: z.array(saleItemSchema).min(1, 'Minimal ada satu barang'),
  paymentMethod: z.enum(['cash', 'transfer', 'qris']),
  discountType: z.enum(['percent', 'nominal']),
  discountValue: z.coerce.number().min(0).default(0),
  discountAmount: z.number().nonnegative().optional(),
  cashTendered: z.coerce.number().optional(),
  change: z.number().optional(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function RecordSalePage() {
  const {  isLoading: isLoadingCustomers, fetchData: fetchCustomers } = useCustomerStore();
  const { addTransaction } = useTransactionStore();
  const {  isLoading: isLoadingInventory, fetchData: fetchInventory } = useInventoryStore();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    void fetchCustomers({ pageIndex: 0, pageSize: 100 }, [], {});
    void fetchInventory({ pageIndex: 0, pageSize: 100 }, [], {});
  }, [fetchCustomers, fetchInventory]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customer: { id: undefined, name: '' },
      items: [{ name: '', quantity: 1, pricePerItem: 0 }],
      paymentMethod: 'cash',
      discountType: 'percent',
      discountValue: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = async (data: SaleFormValues) => {
    setIsLoading(true);
    const subtotal = data.items.reduce((acc, item) => acc + item.quantity * item.pricePerItem, 0);
    const discountAmount = data.discountType === 'percent'
      ? (subtotal * (data.discountValue || 0)) / 100
      : (data.discountValue || 0);
    const totalAfterDiscount = subtotal - discountAmount;
    const change = data.paymentMethod === 'cash' && data.cashTendered !== undefined
      ? data.cashTendered - totalAfterDiscount
      : undefined;

    const { success, error } = await addTransaction({
      type: 'sale',
      customerName: data.customer.name,
      customerId: data.customer.id,
      paymentMethod: data.paymentMethod,
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount,
      cashTendered: data.cashTendered,
      change,
      items: data.items.map(item => ({
        ...item,
        // The `total` property is not part of the form, so we calculate it here
        total: item.quantity * item.pricePerItem,
      })),
    });

    if (success) {
      toast({
        title: 'Penjualan Tercatat',
        description: 'Transaksi berhasil direkam & stok otomatis diperbarui.',
      });
      form.reset();
      router.push('/transactions');
    } else {
      toast({ title: 'Error', description: error?.message || 'Gagal merekam transaksi.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const subtotal = form.watch('items').reduce((acc, item) => acc + (item.quantity || 0) * (item.pricePerItem || 0), 0);
  const discountType = form.watch('discountType');
  const discountValue = form.watch('discountValue');
  const discountAmount = discountType === 'percent'
    ? (subtotal * (discountValue || 0)) / 100
    : (discountValue || 0);
  const totalAfterDiscount = subtotal - discountAmount;
  const cashTendered = form.watch('cashTendered');
  const change = cashTendered !== undefined ? cashTendered - totalAfterDiscount : undefined;
  const isCash = form.watch('paymentMethod') === 'cash';
  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const canSubmit = !isCash || (cashTendered !== undefined && cashTendered >= totalAfterDiscount);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ShoppingCart className="mr-3 h-7 w-7" /> Rekam Transaksi Penjualan
        </CardTitle>
        <CardDescription>Masukkan detail penjualan. Stok barang akan otomatis berkurang setelah transaksi disimpan.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nama Pelanggan</FormLabel>
                  <CustomerCombobox isLoading={isLoadingCustomers} value={{ ...field.value, id: field.value.id || '' }} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Barang yang Dijual</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-5">
                        <FormLabel className="sr-only">Nama Barang</FormLabel>
                        <FormControl>
                          <InventoryCombobox
                            value={field.value}
                            onSelect={(selectedItem) => {
                              form.setValue(`items.${index}.name`, selectedItem.name);
                              form.setValue(`items.${index}.pricePerItem`, selectedItem.price);
                            }}
                            isLoading={isLoadingInventory}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-4 md:col-span-2">
                        <FormLabel className="sr-only">Jumlah</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Jml" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.pricePerItem`}
                    render={({ field }) => (
                      <FormItem className="col-span-8 md:col-span-4">
                        <FormLabel className="sr-only">Harga/Item</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Harga" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="col-span-2 md:col-span-1 justify-self-end text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Hapus item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, pricePerItem: 0 })} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Barang
              </Button>
              {form.formState.errors.items?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.root.message}</p>}
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Metode Pembayaran</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="cash" />
                        </FormControl>
                        <FormLabel className="font-normal">Cash</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="transfer" />
                        </FormControl>
                        <FormLabel className="font-normal">Transfer</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="qris" />
                        </FormControl>
                        <FormLabel className="font-normal">QRIS</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Diskon</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="percent" />
                        </FormControl>
                        <FormLabel className="font-normal">Persen</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="nominal" />
                        </FormControl>
                        <FormLabel className="font-normal">Nominal</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{discountType === 'percent' ? 'Nilai Diskon (%)' : 'Nilai Diskon (Rp)'}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {discountAmount > 0 && (
              <div className="text-right text-sm text-muted-foreground">
                {discountType === 'percent'
                  ? `Potongan: IDR ${discountAmount.toLocaleString('id-ID')}`
                  : `Potongan: IDR ${discountAmount.toLocaleString('id-ID')} (${discountPercent.toFixed(2)}%)`}
              </div>
            )}

            {isCash && (
              <FormField
                control={form.control}
                name="cashTendered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominal Cash</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {isCash && (
              <div className="text-right text-sm text-muted-foreground">
                Kembalian: IDR {change !== undefined ? Math.max(change, 0).toLocaleString('id-ID') : '0'}
              </div>
            )}
            <div className="text-right pt-4 border-t space-y-1">
              <div>Subtotal: IDR {subtotal.toLocaleString('id-ID')}</div>
              <div>Diskon: IDR {discountAmount.toLocaleString('id-ID')}</div>
              <div className="text-2xl font-bold">Grand Total: IDR {totalAfterDiscount.toLocaleString('id-ID')}</div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || !canSubmit}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Simpan Transaksi'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
