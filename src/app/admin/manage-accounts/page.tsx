'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserRoles } from '@/types';
import { Users, PlusCircle, Loader2, ShieldAlert, Edit3, Trash2 } from 'lucide-react';

// Import Server Actions dan tipe data
import { getUsers, createNewUser, deleteUser, type UserData } from './actions';
import { useAuth } from '@/context/auth-context';
import { EditUserDialog } from './EditUserDialog';

// Skema diubah untuk menggunakan email
const addUserFormSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
  role: z.enum(UserRoles, { required_error: 'Role harus dipilih.' }),
});

type AddUserFormValues = z.infer<typeof addUserFormSchema>;

export default function ManageAccountsPage() {
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isPending, startTransition] = useTransition(); // Hook untuk menangani state loading dari Server Action
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    getUsers().then((result) => {
      // Periksa apakah ada error dan data-nya valid
      if (result.data) {
        setUsers(result.data);
      }
      // Jika ada error, bisa ditangani di sini
      if (result.error) {
        console.error('Gagal mengambil data pengguna:', result.error);
        // toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  }, []);

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: { email: '', password: '', role: 'cashier' },
  });

  // Proteksi rute di sisi klien (sebagai fallback)
  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  const onSubmitAddUser = (data: AddUserFormValues) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('role', data.role);

    startTransition(async () => {
      const result = await createNewUser(formData);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Sukses', description: result.success as string });
        form.reset();

        // Ambil data terbaru dan update state dengan benar
        getUsers().then((fetchResult) => {
          if (fetchResult.data) {
            setUsers(fetchResult.data);
          }
        });
      }
    });
  };

  // Handler untuk tombol hapus
  const handleDeleteUser = (userId: string) => {
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Sukses', description: result.success });
        // Optimistic UI update
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    });
  };

  if (isLoadingAuth || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {isLoadingAuth ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <ShieldAlert className="h-12 w-12 text-destructive" />}
        <p className="text-muted-foreground">{isLoadingAuth ? 'Memuat autentikasi...' : 'Akses Ditolak. Hanya untuk Admin.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tabel Daftar Pengguna */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> Kelola Akun
          </CardTitle>
          <CardDescription>Lihat, tambah, atau hapus akun pengguna sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <EditUserDialog disabled={isPending || user.id === currentUser.id} user={user} />
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)} disabled={isPending || user.id === currentUser.id}>
                      <Trash2 className="mr-1 h-4 w-4" /> Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Tambah Pengguna */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <PlusCircle className="mr-2 h-5 w-5" /> Tambah Pengguna Baru
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitAddUser)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="pengguna@contoh.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UserRoles.map((role) => (
                          <SelectItem key={role} value={role} className="capitalize">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Tambah Pengguna
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
