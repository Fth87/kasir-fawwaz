'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { UserData } from '../actions';
import { UserRoles } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const accountSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  role: z.enum(UserRoles),
  password: z.string().min(6, 'Password minimal 6 karakter.').optional().or(z.literal('')),
});
export type AccountFormValues = z.infer<typeof accountSchema>;

export interface AccountDialogProps {
  children: React.ReactNode;
  item?: UserData;
  onSuccess: () => void;
  addUser: (data: FormData) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  updateUser: (id: string, data: FormData) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  disabled?: boolean;
}

export function AccountDialog({ children, item, onSuccess, addUser, updateUser, disabled }: AccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: item?.email || '', role: item?.role as 'admin' | 'cashier' || 'cashier', password: '' },
  });

  useEffect(() => {
    form.reset({ email: item?.email || '', role: item?.role as 'admin' | 'cashier' || 'cashier', password: '' });
  }, [item, open, form]);

  const onSubmit = (data: AccountFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('role', data.role);
      if (data.password) formData.append('password', data.password);

      const result = item ? await updateUser(item.id, formData) : await addUser(formData);

      if (result.success) {
        toast({ title: 'Sukses', description: result.successMessage });
        setOpen(false);
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Ubah Akun Pengguna' : 'Tambah Akun Baru'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" readOnly={!!item} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih role..." /></SelectTrigger></FormControl><SelectContent>{UserRoles.map(role => (<SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password {item ? '(Opsional)' : ''}</FormLabel><FormControl><Input {...field} type="password" placeholder={item ? "Isi untuk mengubah password" : "••••••••"} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
