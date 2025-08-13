'use client';

import React, { useState, useTransition } from 'react';
import type { InventoryItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';

export interface DeleteDialogProps {
  item: InventoryItem;
  onSuccess: () => void;
  deleteInventoryItem: (id: string) => Promise<{ success: boolean; error: Error | null }>;
}

export function DeleteDialog({ item, onSuccess, deleteInventoryItem }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const { success, error } = await deleteInventoryItem(item.id);
      if (success) {
        toast({ title: 'Sukses', description: `Barang "${item.name}" berhasil dihapus.` });
        onSuccess();
      } else {
        toast({ title: 'Error', description: error?.message || 'Gagal menghapus barang.', variant: 'destructive' });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus <strong>{item.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
