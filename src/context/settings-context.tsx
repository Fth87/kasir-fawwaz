
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { StoreSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface SettingsContextType {
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  isLoadingSettings: boolean;
}

const defaultSettings: StoreSettings = {
  storeName: 'Kasir Konter Anda',
  storeAddress: 'Jl. Konter No. 123, Kota Anda',
  storePhone: '0812-3456-7890',
  storeEmail: 'info@kasirkonter.com',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    if (IS_BROWSER) {
      try {
        const storedSettings = localStorage.getItem('storeSettings');
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        } else {
          // If no settings in localStorage, set default and save them
          localStorage.setItem('storeSettings', JSON.stringify(defaultSettings));
          setSettings(defaultSettings);
        }
      } catch (e) {
        console.error("Failed to parse store settings from localStorage", e);
        // Fallback to default if parsing fails
        localStorage.setItem('storeSettings', JSON.stringify(defaultSettings));
        setSettings(defaultSettings);
      } finally {
        setIsLoadingSettings(false);
      }
    } else {
        setIsLoadingSettings(false); // On server, finish loading immediately
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings(prevSettings => {
      const updated = { ...prevSettings, ...newSettings };
      if (IS_BROWSER) {
        localStorage.setItem('storeSettings', JSON.stringify(updated));
      }
      toast({
        title: "Settings Updated",
        description: "Store settings have been successfully updated.",
      });
      return updated;
    });
  }, [toast]);

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
