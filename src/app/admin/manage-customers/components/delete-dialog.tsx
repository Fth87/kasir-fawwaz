'use client';

import React, { useState, useTransition } from 'react';
import type { Customer } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';

export interface DeleteDialogProps {
  item: Customer;
  onSuccess: () => void;
  deleteCustomer: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

export function DeleteDialog({ item, onSuccess, deleteCustomer }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const { success, error } = await deleteCustomer(item.id);
      if (success) {
        toast({ title: 'Sukses', description: `Pelanggan "${item.name}" berhasil dihapus.` });
        onSuccess();
      } else {
        toast({ title: 'Error', description: error?.message || 'Gagal menghapus pelanggan.', variant: 'destructive' });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus pelanggan <strong>{item.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
