'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { InventoryItem, NewInventoryItemInput, UpdateInventoryItemInput } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  addInventoryItem: (itemData: NewInventoryItemInput) => Promise<boolean>;
  updateInventoryItem: (id: string, updates: UpdateInventoryItemInput) => Promise<boolean>;
  deleteInventoryItem: (id: string) => Promise<boolean>;
  findItemByName: (name: string) => InventoryItem | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const { toast } = useToast();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInventoryItems = useCallback(async () => {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Gagal memuat data inventaris.', variant: 'destructive' });
      setInventoryItems([]);
    } else {
      const formattedItems = data.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku || undefined,
        stockQuantity: item.stock_quantity,
        purchasePrice: item.purchase_price || 0,
        sellingPrice: item.selling_price,
        lowStockThreshold: item.low_stock_threshold || undefined,
        lastRestocked: item.last_restocked || undefined,
      }));
      setInventoryItems(formattedItems);
    }
    setIsLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]);

  const addInventoryItem = useCallback(
    async (itemData: NewInventoryItemInput): Promise<boolean> => {
      const orQuery = [`name.eq.${itemData.name}`];
      if (itemData.sku) {
        orQuery.push(`sku.eq.${itemData.sku}`);
      }
      const { data: existingItems } = await supabase.from('inventory_items').select('name, sku').or(orQuery.join(','));

      if (existingItems && existingItems.length > 0) {
        toast({ title: 'Error', description: 'Nama atau SKU barang sudah ada.', variant: 'destructive' });
        return false;
      }

      const { data: newItem, error: insertError } = await supabase
        .from('inventory_items')
        .insert({
          name: itemData.name,
          sku: itemData.sku,
          stock_quantity: itemData.stockQuantity,
          purchase_price: itemData.purchasePrice,
          selling_price: itemData.sellingPrice,
          low_stock_threshold: itemData.lowStockThreshold,
        })
        .select()
        .single();

      if (insertError || !newItem) {
        toast({ title: 'Error', description: 'Gagal menambahkan barang baru.', variant: 'destructive' });
        return false;
      }

      setInventoryItems((prev) =>
        [
          ...prev,
          {
            id: newItem.id,
            name: newItem.name,
            sku: newItem.sku || undefined,
            stockQuantity: newItem.stock_quantity,
            purchasePrice: newItem.purchase_price || 0,
            sellingPrice: newItem.selling_price,
            lowStockThreshold: newItem.low_stock_threshold || undefined,
            lastRestocked: newItem.last_restocked || undefined,
          },
        ].sort((a, b) => a.name.localeCompare(b.name))
      );

      toast({ title: 'Sukses', description: `Barang "${itemData.name}" berhasil ditambahkan.` });
      return true;
    },
    [supabase, toast]
  );

  const updateInventoryItem = useCallback(
    async (id: string, updates: UpdateInventoryItemInput): Promise<boolean> => {
      const updatesForDb: { [key: string]: any } = {};
      if (updates.name) updatesForDb.name = updates.name;
      if (updates.sku) updatesForDb.sku = updates.sku;
      if (updates.stockQuantity !== undefined) updatesForDb.stock_quantity = updates.stockQuantity;
      if (updates.purchasePrice !== undefined) updatesForDb.purchase_price = updates.purchasePrice;
      if (updates.sellingPrice !== undefined) updatesForDb.selling_price = updates.sellingPrice;
      if (updates.lowStockThreshold !== undefined) updatesForDb.low_stock_threshold = updates.lowStockThreshold;

      const { data: updatedItem, error } = await supabase.from('inventory_items').update(updatesForDb).eq('id', id).select().single();

      if (error || !updatedItem) {
        toast({ title: 'Error', description: 'Gagal memperbarui barang.', variant: 'destructive' });
        return false;
      }

      setInventoryItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                id: updatedItem.id,
                name: updatedItem.name,
                sku: updatedItem.sku || undefined,
                stockQuantity: updatedItem.stock_quantity,
                purchasePrice: updatedItem.purchase_price || 0,
                sellingPrice: updatedItem.selling_price,
                lowStockThreshold: updatedItem.low_stock_threshold || undefined,
                lastRestocked: updatedItem.last_restocked || undefined,
              }
            : item
        )
      );

      toast({ title: 'Sukses', description: 'Barang berhasil diperbarui.' });
      return true;
    },
    [supabase, toast]
  );

  const deleteInventoryItem = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: 'Gagal menghapus barang.', variant: 'destructive' });
        return false;
      }
      toast({ title: 'Sukses', description: 'Barang berhasil dihapus.' });
      setInventoryItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    },
    [supabase, toast]
  );

  const findItemByName = useCallback(
    (name: string) => {
      return inventoryItems.find((item) => item.name.toLowerCase() === name.toLowerCase());
    },
    [inventoryItems]
  );

  return <InventoryContext.Provider value={{ inventoryItems, isLoading, addInventoryItem, updateInventoryItem, deleteInventoryItem, findItemByName }}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
