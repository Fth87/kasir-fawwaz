'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTransactions } from '@/context/transaction-context';
import { useInventory } from '@/context/inventory-context';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CustomerCombobox } from '@/components/ui/customer-combobox'; 
import { useCustomers } from '@/context/customer-context'; 


// Skema validasi untuk satu item penjualan
const saleItemSchema = z.object({
  name: z.string().min(1, 'Nama barang harus diisi'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  pricePerItem: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
});

// Skema validasi untuk keseluruhan form penjualan
const saleFormSchema = z.object({
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nama pelanggan harus diisi"),
  }),
  items: z.array(saleItemSchema).min(1, "Minimal ada satu barang"),
  paymentMethod: z.enum(['cash', 'transfer', 'qris']),
});


type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function RecordSalePage() {
  const { customers, isLoading: isLoadingCustomers } = useCustomers(); 
  const { addTransaction } = useTransactions();
  const { inventoryItems, findItemByName } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customer: { id: undefined, name: "" }, 
      items: [{ name: '', quantity: 1, pricePerItem: 0 }],
      paymentMethod: 'cash',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Fungsi untuk mengisi harga otomatis saat nama barang diubah
  const handleItemNameChange = (index: number, name: string) => {
    const inventoryItem = findItemByName(name);
    if (inventoryItem) {
      form.setValue(`items.${index}.pricePerItem`, inventoryItem.sellingPrice, { shouldValidate: true });
    }
  };

  // Fungsi untuk menangani submit form
  const onSubmit = async (data: SaleFormValues) => {
    setIsLoading(true);
    try {
      // Panggil addTransaction. Pengurangan stok terjadi otomatis di database via trigger.
      const success = await addTransaction({
        type: 'sale',
        customerName: data.customer.name,
        customerId: data.customer.id,
        paymentMethod: data.paymentMethod,
        items: data.items,
      });

      if (success) {
        toast({
          title: 'Penjualan Tercatat',
          description: 'Transaksi berhasil direkam & stok otomatis diperbarui.',
        });
        form.reset();
        router.push('/transactions');
      } else {
        toast({ title: 'Error', description: 'Gagal merekam transaksi.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saat merekam penjualan:', error);
      toast({ title: 'Error', description: 'Terjadi kesalahan.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const grandTotal = form.watch('items').reduce((acc, item) => acc + (item.quantity || 0) * (item.pricePerItem || 0), 0);

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
                  <CustomerCombobox
                    value={{ ...field.value, id: field.value.id || '' }}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bagian Daftar Barang */}
            <div className="space-y-4">
              <FormLabel>Barang yang Dijual</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field: formField }) => (
                      <FormItem className="col-span-12 md:col-span-5">
                        <FormLabel className="sr-only">Nama Barang</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nama Barang"
                            {...formField}
                            onChange={(e) => {
                              formField.onChange(e);
                              handleItemNameChange(index, e.target.value);
                            }}
                            list="inventory-items-datalist"
                          />
                        </FormControl>
                        <datalist id="inventory-items-datalist">
                          {inventoryItems.map((invItem) => (
                            <option key={invItem.id} value={invItem.name} />
                          ))}
                        </datalist>
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

            <div className="text-right text-2xl font-bold pt-4 border-t">Grand Total: IDR {grandTotal.toLocaleString('id-ID')}</div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Simpan Transaksi'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
