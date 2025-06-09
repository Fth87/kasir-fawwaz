
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';
import type { StoreSettings } from '@/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, ShieldAlert, Settings as SettingsIcon } from 'lucide-react';

const settingsFormSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
  storeEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function StoreSettingsPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const { settings, updateSettings, isLoadingSettings } = useSettings();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settings, // Initialize with current settings
  });

  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  useEffect(() => {
    // Reset form with latest settings once they are loaded or changed
    if (!isLoadingSettings) {
      form.reset(settings);
    }
  }, [settings, isLoadingSettings, form]);


  const onSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true);
    updateSettings(data);
    setIsSubmitting(false);
    // Toast is handled within updateSettings
  };

  if (isLoadingAuth || isLoadingSettings || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {isLoadingAuth || isLoadingSettings ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <ShieldAlert className="h-12 w-12 text-destructive" />}
        <p className="text-muted-foreground">
          {isLoadingAuth || isLoadingSettings ? 'Loading settings...' : 'Access Denied. Admins only.'}
        </p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <SettingsIcon className="mr-2 h-6 w-6" /> Store Settings
        </CardTitle>
        <CardDescription>Manage your store's information. This will be used on receipts and other documents.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kasir Konter Jaya" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Jl. Pahlawan No. 1, Kota Konter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="e.g., 021-1234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storeEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g., contact@konterjaya.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || isLoadingSettings}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
