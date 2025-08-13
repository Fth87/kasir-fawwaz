"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettingsStore } from '@/stores/settings.store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, ShieldAlert, Settings as SettingsIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/hooks/use-toast';

const settingsFormSchema = z.object({
  storeName: z.string().min(1, "Nama toko harus diisi"),
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
  storeEmail: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const defaultFormValues: SettingsFormValues = {
  storeName: '',
  storeAddress: '',
  storePhone: '',
  storeEmail: '',
};

export default function StoreSettingsPage() {
  const { user, isLoading: isLoadingAuth } = useAuthStore();
  const { settings, updateSettings, isLoadingSettings } = useSettingsStore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!isLoadingAuth && (!user || user.role !== 'admin')) {
      router.replace('/');
    }
  }, [user, isLoadingAuth, router]);

  useEffect(() => {
    if (!isLoadingSettings && settings) {
      form.reset(settings);
    } else if (!isLoadingSettings && !settings) {
      form.reset(defaultFormValues);
    }
  }, [settings, isLoadingSettings, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    const { success, error, successMessage } = await updateSettings(data);
    if (success) {
      toast({
        title: "Sukses",
        description: successMessage,
      });
    } else {
      toast({
        title: "Error",
        description: error || "Terjadi kesalahan yang tidak diketahui.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  if (isLoadingAuth || isLoadingSettings) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Akses Ditolak. Hanya untuk Admin.</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <SettingsIcon className="mr-2 h-6 w-6" /> Pengaturan Toko
        </CardTitle>
        <CardDescription>
          Kelola informasi toko Anda. Info ini akan digunakan pada struk dan dokumen lainnya.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Toko</FormLabel>
                  <FormControl><Input placeholder="cth: Konter Jaya" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="storeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat Toko (Opsional)</FormLabel>
                  <FormControl><Textarea placeholder="cth: Jl. Pahlawan No. 1" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="storePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telepon Toko (Opsional)</FormLabel>
                  <FormControl><Input type="tel" placeholder="cth: 08123456789" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="storeEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Toko (Opsional)</FormLabel>
                  <FormControl><Input type="email" placeholder="cth: info@konterjaya.com" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Pengaturan
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}