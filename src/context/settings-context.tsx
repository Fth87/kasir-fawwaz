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

  /**
   * Mengambil data pengaturan dari Supabase untuk pengguna yang sedang login.
   */
  const fetchSettings = useCallback(async (userId: string) => {
    setIsLoadingSettings(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('store_name, store_address, store_phone, store_email')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Abaikan error "0 rows"
      console.error("Error fetching settings:", error);
      toast({ title: "Error", description: "Gagal memuat pengaturan.", variant: "destructive" });
      setSettings(null);
    } else if (data) {
      setSettings({
        storeName: data.store_name,
        storeAddress: data.store_address || undefined,
        storePhone: data.store_phone || undefined,
        storeEmail: data.store_email || undefined,
      });
    } else {
      setSettings(null); // Belum ada pengaturan
    }
    setIsLoadingSettings(false);
  }, [supabase, toast]);

  /**
   * useEffect ini sekarang hanya berjalan ketika ID pengguna berubah (saat login/logout),
   * bukan setiap kali objek 'user' diperbarui karena fokus tab.
   */
  useEffect(() => {
    if (user?.id) {
      fetchSettings(user.id);
    } else {
      // Jika tidak ada user (misal: setelah logout), kosongkan state dan berhenti loading
      setSettings(null);
      setIsLoadingSettings(false);
    }
  }, [user?.id, fetchSettings]); // <-- KUNCI PERBAIKAN ADA DI SINI

  /**
   * Memperbarui atau membuat pengaturan baru di database.
   */
  const updateSettings = useCallback(async (newSettings: Partial<StoreSettings>): Promise<boolean> => {
    if (!user) {
      toast({ title: "Error", description: "Anda harus login untuk mengubah pengaturan.", variant: "destructive" });
      return false;
    }
    
    // Gabungkan dengan pengaturan sebelumnya untuk memastikan storeName ada saat update parsial
    const finalSettings = { ...settings, ...newSettings };
    if (!finalSettings.storeName) {
      toast({ title: "Error", description: "Nama toko harus diisi.", variant: "destructive" });
      return false;
    }
    
    const settingsForDb = {
      id: user.id,
      store_name: finalSettings.storeName,
      store_address: finalSettings.storeAddress || null,
      store_phone: finalSettings.storePhone || null,
      store_email: finalSettings.storeEmail || null,
    };

    const { error } = await supabase.from('store_settings').upsert(settingsForDb);

    if (error) {
      console.error("Error updating settings:", error);
      toast({ title: "Error", description: "Gagal menyimpan pengaturan.", variant: "destructive" });
      return false;
    }

    setSettings(finalSettings as StoreSettings);
    toast({ title: "Pengaturan Disimpan", description: "Pengaturan toko berhasil diperbarui." });
    return true;
  }, [supabase, user, settings, toast]);

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