'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transaction-context';
import type { ServiceTransaction } from '@/types';
import { getServiceStatusLabel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ClipboardList, Settings, Eye, Loader2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

export default function ManageServicesPage() {
  // 1. Ambil isLoading dari kedua context
  const { transactions, isLoading: isLoadingTransactions } = useTransactions();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  // 2. Gunakan useMemo untuk memfilter transaksi servis secara efisien
  //    Ini hanya akan dihitung ulang jika `transactions` berubah.
  const serviceTransactions = useMemo(() => {
    return transactions.filter((tx): tx is ServiceTransaction => tx.type === 'service');
  }, [transactions]);

  // 3. Proteksi rute (tetap sama, sudah benar)
  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  // 4. Gabungkan state loading dari kedua context
  const isLoading = isLoadingAuth || isLoadingTransactions;

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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ClipboardList className="mr-2 h-6 w-6" /> Kelola Servis
        </CardTitle>
        <CardDescription>Lihat dan perbarui progres untuk semua transaksi servis.</CardDescription>
      </CardHeader>
      <CardContent>
        {serviceTransactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Belum ada transaksi servis yang tercatat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>ID Servis</TableHead>
                <TableHead>Nama Layanan</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-mono">{tx.id.substring(0, 8)}</TableCell>
                  <TableCell>{tx.serviceName}</TableCell>
                  <TableCell>{tx.customerName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getServiceStatusLabel(tx.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/service-status/${tx.id}`}>
                        <Eye className="mr-1 h-4 w-4" /> Lihat Status
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/admin/service-management/${tx.id}`}>
                        <Settings className="mr-1 h-4 w-4" />
                        <span>Kelola</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
