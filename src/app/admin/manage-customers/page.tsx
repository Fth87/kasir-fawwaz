
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCustomers } from '@/context/customer-context';
import type { Customer, NewCustomerInput } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Users2, PlusCircle, Edit3, Trash2, Loader2, ShieldAlert, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

const customerFormSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional().refine(val => !val || /^[0-9\s+-]+$/.test(val) || val === "", {
    message: "Invalid phone number format",
  }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function ManageCustomersPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  useEffect(() => {
    if (editingCustomer) {
      form.reset({
        name: editingCustomer.name,
        phone: editingCustomer.phone || "",
        email: editingCustomer.email || "",
        address: editingCustomer.address || "",
        notes: editingCustomer.notes || "",
      });
    } else {
      form.reset(); // Reset to default when adding new or closing dialog
    }
  }, [editingCustomer, form, isDialogOpen]);


  const handleOpenDialog = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingCustomer(null);
    setIsDialogOpen(false);
    form.reset(); 
  };

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    let success;
    if (editingCustomer) {
      success = updateCustomer(editingCustomer.id, data);
    } else {
      success = addCustomer(data);
    }

    if (success) {
      handleCloseDialog();
    }
    setIsSubmitting(false);
  };

  const handleDelete = (customerId: string) => {
    deleteCustomer(customerId);
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
              <Users2 className="mr-3 h-7 w-7" /> Manage Customers
            </CardTitle>
            <CardDescription>View, add, edit, and delete customer profiles.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Customer
          </Button>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No customers found. Add customers to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || 'N/A'}</TableCell>
                    <TableCell>{customer.email || 'N/A'}</TableCell>
                    <TableCell>
                      {format(parseISO(customer.createdAt), 'dd MMM yyyy', { locale: LocaleID })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/manage-customers/${customer.id}`}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(customer)}>
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
                              This action cannot be undone. This will permanently delete the customer: <strong>{customer.name}</strong>.
                              Associated transactions will NOT be deleted but will lose direct link if any.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(customer.id)}>
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
                {editingCustomer ? <Edit3 className="mr-2 h-5 w-5"/> : <PlusCircle className="mr-2 h-5 w-5"/>}
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? `Update details for ${editingCustomer.name}.` : 'Fill in the details for the new customer.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., 081234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter customer address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any relevant notes about the customer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingCustomer ? <Edit3 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
                  {editingCustomer ? 'Save Changes' : 'Add Customer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
