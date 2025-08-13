'use client';

import React, { useState, useTransition } from 'react';
import type { UserData } from '../actions';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';

export interface DeleteDialogProps {
  item: UserData;
  onSuccess: () => void;
  deleteUser: (id: string) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  disabled?: boolean;
}

export function DeleteDialog({ item, onSuccess, deleteUser, disabled }: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUser(item.id);
      if (result.success) {
        toast({ title: 'Sukses', description: result.successMessage });
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={disabled}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Ini akan menghapus akun <strong>{item.email}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
