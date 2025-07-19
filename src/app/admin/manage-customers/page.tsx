'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCustomers } from '@/context/customer-context';
import type { Customer } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users2, PlusCircle, Edit3, Trash2, Loader2, ShieldAlert, Eye, EyeIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Skema validasi Zod (tidak ada perubahan signifikan)
const customerFormSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan harus diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function ManageCustomersPage() {
  // Ambil isLoading dari context pelanggan dan auth
  const { customers, isLoading: isLoadingCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const [isPending, startTransition] = useTransition(); // Hook untuk loading aksi
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: '', phone: '', address: '', notes: '' },
  });

  // Proteksi rute (sudah benar)
  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  // Mengisi form saat dialog edit dibuka
  useEffect(() => {
    if (isDialogOpen && editingCustomer) {
      form.reset({
        name: editingCustomer.name,
        phone: editingCustomer.phone || '',
        address: editingCustomer.address || '',
        notes: editingCustomer.notes || '',
      });
    } else {
      form.reset({ name: '', phone: '', address: '', notes: '' });
    }
  }, [editingCustomer, isDialogOpen, form]);

  const handleOpenDialog = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => setIsDialogOpen(false);

  // Fungsi onSubmit yang sudah async
  const onSubmit = (data: CustomerFormValues) => {
    startTransition(async () => {
      const success = editingCustomer ? await updateCustomer(editingCustomer.id, data) : await addCustomer(data);

      if (success) {
        handleCloseDialog();
      }
      // Toast sudah ditangani di dalam context
    });
  };

  // Fungsi handleDelete yang menggunakan useTransition
  const handleDelete = (customerId: string) => {
    startTransition(async () => {
      await deleteCustomer(customerId);
    });
  };

  // Gabungkan semua state loading
  const isLoading = isLoadingAuth || isLoadingCustomers;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Akses Ditolak. Hanya untuk Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline flex items-center">
              <Users2 className="mr-3 h-7 w-7" /> Kelola Pelanggan
            </CardTitle>
            <CardDescription>Lihat, tambah, ubah, dan hapus profil pelanggan.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-5 w-5" /> Tambah Pelanggan
          </Button>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Belum ada pelanggan. Tambah pelanggan baru untuk memulai.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{format(parseISO(customer.createdAt), 'dd MMM yyyy', { locale: LocaleID })}</TableCell>
                    <TableCell className="text-right space-x-2 space-y-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(customer)}>
                        <Edit3 className="mr-1 h-4 w-4" /> Ubah
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/manage-customers/${customer.id}`}>
                          <Eye className="mr-1 h-4 w-4" /> Lihat
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isPending}>
                            <Trash2 className="mr-1 h-4 w-4" /> Hapus
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Aksi ini akan menghapus pelanggan <strong>{customer.name}</strong> secara permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(customer.id)}>Hapus</AlertDialogAction>
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
              {editingCustomer ? <Edit3 className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              {editingCustomer ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {/* FormField untuk 'name', 'phone', 'email', 'address', 'notes' */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pelanggan</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
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
                    <FormLabel>No. Telepon (Opsional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="cth: 081234567890" {...field} />
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
                    <FormLabel>Alamat (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat pelanggan" {...field} />
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
                    <FormLabel>Catatan (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Catatan untuk pelanggan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* ... tambahkan field lain jika perlu ... */}
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
