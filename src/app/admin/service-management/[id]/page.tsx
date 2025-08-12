"use client";

import React,  {  useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Hooks & Server Actions
import { useTransactionDispatch } from '@/context/transaction-context';
import { getTransactionById } from '@/app/transactions/actions';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

// Types & Utils
import type { ServiceTransaction, ServiceStatusValue } from '@/types';
import { ServiceStatusOptions, getServiceStatusLabel } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Settings, MessageSquare, CheckCircle, Clock, CircleSlash, Loader2, Phone, MessageCircle, ShieldAlert } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

const updateServiceSchema = z.object({
  status: z.string().min(1, "Status harus dipilih"), 
  newNote: z.string().optional(),
});

type UpdateServiceFormValues = z.infer<typeof updateServiceSchema>;

export default function ManageServiceProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { updateTransactionDetails } = useTransactionDispatch();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  
  const [isPending, startTransition] = useTransition();
  const [service, setService] = useState<ServiceTransaction | null | undefined>(undefined);

  const form = useForm<UpdateServiceFormValues>({
    resolver: zodResolver(updateServiceSchema),
    defaultValues: { status: '', newNote: '' },
  });

  const transactionId = params.id as string;

  useEffect(() => {
    if (transactionId) {
        getTransactionById(transactionId).then(({ data: tx, error }) => {
            if (tx && tx.type === 'service') {
                setService(tx);
                form.reset({ status: tx.status, newNote: '' });
            } else {
                setService(null);
                if (error) toast({ title: "Error", description: error, variant: "destructive" });
            }
        });
    }
  }, [transactionId, form, toast]);

  const onSubmit = (data: UpdateServiceFormValues) => {
    if (!service) return;

    startTransition(async () => {
      const updatedProgressNotes = [...(service.progressNotes || [])];
      if (data.newNote?.trim()) {
        updatedProgressNotes.push({
          id: crypto.randomUUID(),
          note: data.newNote.trim(),
          timestamp: new Date().toISOString(),
        });
      }

      const success = await updateTransactionDetails(service.id, {
        status: data.status as ServiceStatusValue,
        progressNotes: updatedProgressNotes,
      });

      if (success) {
        toast({ title: "Sukses", description: "Progres servis berhasil diperbarui." });
        form.setValue('newNote', '');
        // Refetch data to show updated state
        getTransactionById(transactionId).then(({ data: tx }) => {
            if (tx && tx.type === 'service') setService(tx);
        });
      }
    });
  };
  
  const getStatusIcon = (status: ServiceTransaction['status']) => {
    if (status.startsWith('COMPLETED')) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'CANCELLED') return <CircleSlash className="h-5 w-5 text-red-500" />;
    if (['AWAITING_PARTS', 'DIAGNOSIS_IN_PROGRESS', 'REPAIR_IN_PROGRESS'].includes(status)) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-blue-500" />;
  };

  const handleWhatsAppNotification = () => {
    if (!service || !service.customerPhone) {
      toast({ title: "Error", description: "Nomor telepon pelanggan tidak tersedia.", variant: "destructive" });
      return;
    }
    let cleaned = service.customerPhone.replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
    const message = `Halo ${service.customerName || 'Pelanggan'}, servis untuk ${service.serviceName} (ID: ${service.id.substring(0, 8)}) Anda telah diperbarui. Status saat ini: ${getServiceStatusLabel(form.getValues('status') as ServiceStatusValue)}.`;
    const whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const isLoading = isLoadingAuth || service === undefined;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Akses Ditolak. Hanya untuk Admin.</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Transaksi Servis Tidak Ditemukan</h2>
        <Button onClick={() => router.push('/admin/manage-services')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Settings className="mr-3 h-7 w-7" /> Kelola Progres Servis
          </CardTitle>
          <CardDescription>Perbarui status dan tambah catatan untuk ID Servis: {service.id.substring(0, 8)}</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
            <div><p className="text-sm text-muted-foreground">Layanan</p><p className="font-semibold">{service.serviceName}</p></div>
            <div><p className="text-sm text-muted-foreground">Perangkat</p><p className="font-semibold">{service.device}</p></div>
            <div className="md:col-span-2"><p className="text-sm text-muted-foreground">Deskripsi Masalah</p><p className="font-semibold whitespace-pre-wrap">{service.issueDescription}</p></div>
            <div><p className="text-sm text-muted-foreground">Pelanggan</p><p className="font-semibold">{service.customerName || '-'}</p></div>
            {service.customerPhone && (<div><p className="text-sm text-muted-foreground flex items-center"><Phone className="h-4 w-4 mr-1"/> Telepon</p><p className="font-semibold">{service.customerPhone}</p></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-xl">Perbarui Status</CardTitle></CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="p-3 bg-secondary/50 rounded-md"><p className="text-sm font-semibold flex items-center">{getStatusIcon(service.status)} <span className="ml-2">Status Saat Ini: {getServiceStatusLabel(service.status)}</span></p></div>
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Ubah Status Menjadi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih status baru" /></SelectTrigger></FormControl><SelectContent>{ServiceStatusOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="newNote" render={({ field }) => (<FormItem><FormLabel>Tambah Catatan Progres (Opsional)</FormLabel><FormControl><Textarea placeholder="cth: Suku cadang sudah datang, mulai perbaikan." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleWhatsAppNotification} disabled={!service.customerPhone}><MessageCircle className="mr-2 h-4 w-4" /> Notifikasi WhatsApp</Button>
              <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Perbarui Progres'}</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {service.progressNotes && service.progressNotes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-xl">Riwayat Progres</CardTitle></CardHeader>
          <CardContent className="space-y-4 max-h-80 overflow-y-auto">
            {service.progressNotes.slice().reverse().map((note) => (
              <div key={note.id} className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-md">
                <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{note.note}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(note.timestamp), "dd MMM yyyy, HH:mm", { locale: LocaleID })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}