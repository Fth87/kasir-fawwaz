
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInventory } from '@/context/inventory-context';
import type { InventoryItem, NewInventoryItemInput } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, PlusCircle, Edit3, Trash2, Loader2, ShieldAlert, PackagePlus, PackageSearch } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

const inventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().optional(),
  stockQuantity: z.coerce.number().int().min(0, "Stock quantity must be non-negative"),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be non-negative"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be non-negative"),
  lowStockThreshold: z.coerce.number().int().min(0, "Low stock threshold must be non-negative").optional(),
});

type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

export default function ManageInventoryPage() {
  const { inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, getInventoryItemById } = useInventory();
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      sku: "",
      stockQuantity: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      lowStockThreshold: 0,
    },
  });

  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        sku: editingItem.sku || "",
        stockQuantity: editingItem.stockQuantity,
        purchasePrice: editingItem.purchasePrice,
        sellingPrice: editingItem.sellingPrice,
        lowStockThreshold: editingItem.lowStockThreshold || 0,
      });
    } else {
      form.reset({ // Reset to default when adding new or closing dialog
        name: "",
        sku: "",
        stockQuantity: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        lowStockThreshold: 0,
      });
    }
  }, [editingItem, form, isDialogOpen]);


  const handleOpenDialog = (item?: InventoryItem) => {
    setEditingItem(item || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(false);
    form.reset(); // Ensure form is cleared
  };

  const onSubmit = async (data: InventoryFormValues) => {
    setIsSubmitting(true);
    let success;
    if (editingItem) {
      success = updateInventoryItem(editingItem.id, data);
    } else {
      success = addInventoryItem(data);
    }

    if (success) {
      handleCloseDialog();
    }
    setIsSubmitting(false);
  };

  const handleDelete = (itemId: string) => {
    deleteInventoryItem(itemId);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  if (isLoadingAuth || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {isLoadingAuth ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <ShieldAlert className="h-12 w-12 text-destructive" />}
        <p className="text-muted-foreground">
          {isLoadingAuth ? 'Loading authentication...' : 'Access Denied. Admins only.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline flex items-center">
              <PackageSearch className="mr-3 h-7 w-7" /> Manage Inventory
            </CardTitle>
            <CardDescription>View, add, edit, and delete inventory items.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PackagePlus className="mr-2 h-5 w-5" /> Add New Item
          </Button>
        </CardHeader>
        <CardContent>
          {inventoryItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No inventory items found. Add items to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Last Restocked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id} className={item.stockQuantity <= (item.lowStockThreshold || 0) ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.stockQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                    <TableCell>
                      {item.lastRestocked ? format(parseISO(item.lastRestocked), 'dd MMM yyyy', { locale: LocaleID }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                        <Edit3 className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-1 h-4 w-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the item: <strong>{item.name}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
                {editingItem ? <Edit3 className="mr-2 h-5 w-5"/> : <PackagePlus className="mr-2 h-5 w-5"/>}
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? `Update details for ${editingItem.name}.` : 'Fill in the details for the new inventory item.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Premium Tempered Glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., TG-IPX-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Low Stock Threshold</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="25000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingItem ? <Edit3 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
