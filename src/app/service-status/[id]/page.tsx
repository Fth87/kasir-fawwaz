'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

// Tipe Data & Utils
import type { ServiceTransaction } from '@/types';
import { getServiceStatusLabel } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction'; // Pastikan path utilitas ini benar

// Komponen UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Smartphone, CheckCircle, Clock, CircleSlash, Info, MessageSquare } from 'lucide-react';

export default function ServiceStatusPage() {
  const params = useParams();
  const router = useRouter();

  const [service, setService] = useState<ServiceTransaction | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
console.log({isLoading})

  useEffect(() => {
    const fetchServiceStatus = async () => {
      const serviceId = params.id as string;
      if (!serviceId) {
        setService(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.from('transactions').select('*').eq('id', serviceId).eq('type', 'service').single();

      if (error || !data) {
        console.error('Gagal mengambil status servis:', error);
        setService(null);
      } else {
        const formattedTx = mapDbRowToTransaction(data);
        if (formattedTx && formattedTx.type === 'service') {
          setService(formattedTx);
        } else {
          setService(null);
        }
      }
      setIsLoading(false);
    };

    fetchServiceStatus();
  }, [params.id]);

  const getStatusIcon = (status: ServiceTransaction['status']) => {
    if (status.startsWith('COMPLETED')) return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (['CANCELLED', 'PARTS_UNAVAILABLE', 'UNABLE_TO_REPAIR'].includes(status)) return <CircleSlash className="h-6 w-6 text-red-500" />;
    if (['AWAITING_PARTS', 'IN_DIAGNOSIS', 'IN_REPAIR_QUEUE', 'REPAIR_IN_PROGRESS'].includes(status)) return <Clock className="h-6 w-6 text-yellow-500" />;
    return <Info className="h-6 w-6 text-blue-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Card className="max-w-md w-full text-center p-6">
          <CardHeader>
            <CardTitle>Servis Tidak Ditemukan</CardTitle>
            <CardDescription>ID Servis tidak valid atau transaksi bukan merupakan servis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Halaman Utama
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground text-center p-6">
            <div className="mx-auto bg-primary-foreground/20 rounded-full p-3 w-fit mb-2">
              <Smartphone className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-headline">Status Servis</CardTitle>
            <CardDescription className="text-primary-foreground/80">Lacak progres perbaikan perangkat Anda.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">ID SERVIS</p>
              <p className="font-mono text-lg tracking-widest">{service.id.substring(0, 8)}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Pelanggan</p>
                <p className="font-medium">{service.customerName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Masuk</p>
                <p className="font-medium">{format(parseISO(service.date), 'dd MMMM yyyy', { locale: LocaleID })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Layanan</p>
                <p className="font-medium">{service.serviceName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perangkat</p>
                <p className="font-medium">{service.device}</p>
              </div>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-sm font-semibold text-muted-foreground mb-2">STATUS SAAT INI</p>
              <div className="flex items-center justify-center text-lg font-bold gap-2">
                {getStatusIcon(service.status)}
                <span>{getServiceStatusLabel(service.status)}</span>
              </div>
            </div>

            {service.progressNotes && service.progressNotes.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-4 text-center text-muted-foreground">Riwayat Progres</h3>
                <div className="space-y-4">
                  {service.progressNotes
                    .slice()
                    .reverse()
                    .map((note) => (
                      <div key={note.id} className="flex items-start space-x-3">
                        <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{note.note}</p>
                          <p className="text-xs text-muted-foreground">{format(parseISO(note.timestamp), 'dd MMM yyyy, HH:mm', { locale: LocaleID })}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Separator />
            <div className="flex justify-between items-baseline font-bold text-lg">
              <p>Estimasi Biaya</p>
              <p>{formatCurrency(service.serviceFee)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
