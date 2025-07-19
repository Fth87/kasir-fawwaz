"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { StoreSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './auth-context';

interface SettingsContextType {
  settings: StoreSettings | null;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<boolean>;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const { user } = useAuth(); // Dapatkan pengguna yang sedang login
  const { toast } = useToast();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Fungsi untuk mengambil data pengaturan dari Supabase
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoadingSettings(false);
      return;
    }

    setIsLoadingSettings(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('store_name, store_address, store_phone, store_email')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Abaikan error jika baris tidak ditemukan
      console.error("Error fetching settings:", error);
      toast({ title: "Error", description: "Gagal memuat pengaturan.", variant: "destructive" });
    } else if (data) {
      // Map dari snake_case (database) ke camelCase (aplikasi)
      setSettings({
        storeName: data.store_name,
        storeAddress: data.store_address || undefined,
        storePhone: data.store_phone || undefined,
        storeEmail: data.store_email || undefined,
      });
    } else {
      // Jika tidak ada data, berarti pengguna belum menyimpan pengaturan
      setSettings(null);
    }
    setIsLoadingSettings(false);
  }, [supabase, user, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Fungsi untuk memperbarui atau membuat pengaturan baru
  const updateSettings = useCallback(async (newSettings: Partial<StoreSettings>): Promise<boolean> => {
    if (!user) {
      toast({ title: "Error", description: "Anda harus login untuk mengubah pengaturan.", variant: "destructive" });
      return false;
    }
    
    // Pastikan store_name tidak undefined karena wajib diisi
    if (!newSettings.storeName) {
      toast({ title: "Error", description: "Nama toko harus diisi.", variant: "destructive" });
      return false;
    }
    
    // Map dari camelCase (aplikasi) ke snake_case (database)
    const settingsForDb = {
      id: user.id, // Kunci utama adalah user id
      store_name: newSettings.storeName,
      store_address: newSettings.storeAddress || null,
      store_phone: newSettings.storePhone || null,
      store_email: newSettings.storeEmail || null,
    };

    // upsert akan UPDATE jika data sudah ada, atau INSERT jika belum ada
    const { error } = await supabase.from('store_settings').upsert(settingsForDb);

    if (error) {
      console.error("Error updating settings:", error);
      toast({ title: "Error", description: "Gagal menyimpan pengaturan.", variant: "destructive" });
      return false;
    }

    // Update state lokal secara optimis
    setSettings(prev => {
      const current = prev || { storeName: '', storeAddress: undefined, storePhone: undefined, storeEmail: undefined };
      return { ...current, ...newSettings } as StoreSettings;
    });
    toast({ title: "Pengaturan Disimpan", description: "Pengaturan toko berhasil diperbarui." });
    return true;

  }, [supabase, user, toast]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoadingSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};