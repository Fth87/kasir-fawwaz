'use server';

import { createClient } from '@/lib/supabase/server';
import type { Customer } from '@/types';

export async function getCustomerById(id: string): Promise<{ data: Customer | null; error: string | null; }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();

        if (error) throw error;
        if (!data) return { data: null, error: 'Pelanggan tidak ditemukan.' };

        const formattedCustomer: Customer = {
            id: data.id,
            name: data.name,
            phone: data.phone ?? undefined,
            address: data.address ?? undefined,
            notes: data.notes ?? undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        return { data: formattedCustomer, error: null };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
        return { data: null, error: errorMessage };
    }
}
