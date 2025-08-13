import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { StoreSettings } from '@/types';
import { useAuthStore } from './auth.store';

interface SettingsState {
  settings: StoreSettings | null;
  isLoadingSettings: boolean;
  fetchSettings: (userId: string) => Promise<{ error: Error | null }>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoadingSettings: true,

  fetchSettings: async (userId) => {
    set({ isLoadingSettings: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('store_settings')
      .select('store_name, store_address, store_phone, store_email')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore "0 rows" error
      console.error("Error fetching settings:", error);
      set({ settings: null, isLoadingSettings: false });
      return { error };
    }

    if (data) {
      set({
        settings: {
          storeName: data.store_name,
          storeAddress: data.store_address || undefined,
          storePhone: data.store_phone || undefined,
          storeEmail: data.store_email || undefined,
        },
        isLoadingSettings: false,
      });
    } else {
      set({ settings: null, isLoadingSettings: false }); // No settings found for this user
    }
    return { error: null };
  },

  updateSettings: async (newSettings) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      return { success: false, error: "Anda harus login untuk mengubah pengaturan." };
    }

    const currentSettings = get().settings;
    const finalSettings = { ...currentSettings, ...newSettings };
    if (!finalSettings.storeName) {
      return { success: false, error: "Nama toko harus diisi." };
    }

    const settingsForDb = {
      id: user.id,
      store_name: finalSettings.storeName,
      store_address: finalSettings.storeAddress || null,
      store_phone: finalSettings.storePhone || null,
      store_email: finalSettings.storeEmail || null,
    };

    const supabase = createClient();
    const { error } = await supabase.from('store_settings').upsert(settingsForDb);

    if (error) {
      console.error("Error updating settings:", error);
      return { success: false, error: "Gagal menyimpan pengaturan." };
    }

    set({ settings: finalSettings as StoreSettings });
    return { success: true, successMessage: "Pengaturan toko berhasil diperbarui.", error: null };
  },
}));

// Subscribe to auth changes to automatically fetch settings
useAuthStore.subscribe(
  (state, prevState) => {
    // Fetch settings only when the user ID changes (login/logout)
    if (state.user?.id !== prevState.user?.id) {
      if (state.user) {
        useSettingsStore.getState().fetchSettings(state.user.id);
      } else {
        // Clear settings on logout
        useSettingsStore.setState({ settings: null, isLoadingSettings: false });
      }
    }
  }
);
