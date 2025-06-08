
"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTransactions } from '@/context/transaction-context';
import { useInventory } from '@/context/inventory-context'; // Import useInventory
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const saleItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  pricePerItem: z.coerce.number().min(0, "Price must be non-negative"),
  inventoryItemId: z.string().optional(), // To link with inventory
});

const saleFormSchema = z.object({
  customerName: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function RecordSalePage() {
  const { addTransaction } = useTransactions();
  const { inventoryItems, decreaseStock, findItemByName } = useInventory(); // Get inventory functions
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerName: "",
      items: [{ name: "", quantity: 1, pricePerItem: 0, inventoryItemId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleItemNameChange = (index: number, name: string) => {
    const inventoryItem = findItemByName(name);
    if (inventoryItem) {
      form.setValue(`items.${index}.pricePerItem`, inventoryItem.sellingPrice);
      form.setValue(`items.${index}.inventoryItemId`, inventoryItem.id);
      // Optionally, check stock here and show a warning if low, but allow proceeding.
      if (inventoryItem.stockQuantity <= (inventoryItem.lowStockThreshold || 0) && inventoryItem.stockQuantity > 0) {
        toast({
          title: "Low Stock Warning",
          description: `Item "${inventoryItem.name}" has low stock (${inventoryItem.stockQuantity}).`,
          variant: "default",
        });
      } else if (inventoryItem.stockQuantity === 0) {
         toast({
          title: "Out of Stock",
          description: `Item "${inventoryItem.name}" is out of stock. Sale can still be recorded.`,
          variant: "destructive",
        });
      }
    } else {
      form.setValue(`items.${index}.inventoryItemId`, undefined); // Clear if no match
    }
  };

  const onSubmit = (data: SaleFormValues) => {
    setIsLoading(true);
    try {
      const saleItemsForTransaction = data.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        pricePerItem: item.pricePerItem,
        inventoryItemId: item.inventoryItemId, // Pass this along
      }));

      // Record the transaction first
      const newTransaction = addTransaction({
        type: 'sale',
        customerName: data.customerName,
        items: saleItemsForTransaction, // Uses the more detailed saleItemsForTransaction
      });

      // If transaction is successful, then decrease stock
      if (newTransaction) {
        data.items.forEach(item => {
          // Decrease stock uses item.name to find the item in inventory internally
          // This is fine as decreaseStock in context handles the lookup
          // No need to pass inventoryItemId directly to decreaseStock if it looks up by name
          decreaseStock(item.name, item.quantity);
        });

        toast({
          title: "Sale Recorded",
          description: "The sale has been successfully recorded and stock updated.",
        });
        form.reset();
        if (newTransaction.id) {
          router.push(`/transactions/${newTransaction.id}`);
        }
      } else {
        // This case should ideally not happen if addTransaction doesn't throw
        toast({
          title: "Error",
          description: "Failed to record sale transaction.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recording sale:", error);
      toast({
        title: "Error",
        description: "Failed to record sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = (index: number) => {
    const item = form.watch(`items.${index}`);
    return (item.quantity || 0) * (item.pricePerItem || 0);
  };
  
  const grandTotal = form.watch('items').reduce((acc, item) => acc + ((item.quantity || 0) * (item.pricePerItem || 0)), 0);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ShoppingCart className="mr-2 h-6 w-6" /> Record Sale
        </CardTitle>
        <CardDescription>Enter the details of the sale transaction. If item exists in inventory, price will auto-fill.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
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

            <div className="space-y-4">
              <Label className="text-md font-medium">Items</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`items.${index}.name`}
                    render={({ field: formField }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Phone Case (Type to search inventory)"
                            {...formField}
                            onChange={(e) => {
                              formField.onChange(e); // Propagate change to react-hook-form
                              handleItemNameChange(index, e.target.value); // Custom logic
                            }}
                            list={`inventory-items-datalist-${index}`}
                          />
                        </FormControl>
                        <datalist id={`inventory-items-datalist-${index}`}>
                            {inventoryItems.map(invItem => (
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
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.pricePerItem`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price/Item (IDR)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="text-sm md:col-span-3">
                      Item Total: IDR {calculateTotal(index).toLocaleString('id-ID')}
                    </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      className="md:col-span-1 md:justify-self-end h-9 w-9"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: "", quantity: 1, pricePerItem: 0, inventoryItemId: undefined })}
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
             {form.formState.errors.items && !form.formState.errors.items.root && 'message' in form.formState.errors.items && (
                <p className="text-sm font-medium text-destructive">{(form.formState.errors.items as any).message}</p>
             )}
            
            <div className="text-right text-xl font-bold">
              Grand Total: IDR {grandTotal.toLocaleString('id-ID')}
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Sale"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
