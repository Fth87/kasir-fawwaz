'use server';

import { createClient } from '@/lib/supabase/server';
import { mapDbRowToTransaction } from '@/utils/mapDBRowToTransaction';
import type { Transaction } from '@/types';

export async function getTransactionById(id: string): Promise<{ data: Transaction | null; error: string | null; }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.from('transactions').select('*').eq('id', id).single();

        if (error) throw error;
        if (!data) return { data: null, error: 'Transaksi tidak ditemukan.' };

        const formattedTransaction = mapDbRowToTransaction(data);
        if (!formattedTransaction) {
             return { data: null, error: 'Gagal memformat data transaksi.' };
        }

        return { data: formattedTransaction, error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        return { data: null, error: errorMessage };
    }
}

export async function getTransactionsByCustomerId(customerId: string): Promise<{ data: Transaction[] | null; error: string | null; }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedTransactions = data.map(mapDbRowToTransaction).filter(Boolean) as Transaction[];
        return { data: formattedTransactions, error: null };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        return { data: null, error: errorMessage };
    }
}


export async function getAllTransactions(): Promise<{ data: Transaction[] | null; error: string | null; }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });

        if (error) throw error;

        const formattedTransactions = data.map(mapDbRowToTransaction).filter(Boolean) as Transaction[];
        return { data: formattedTransactions, error: null };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        return { data: null, error: errorMessage };
    }
}
