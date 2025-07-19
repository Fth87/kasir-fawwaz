'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { InventoryItem, NewInventoryItemInput, UpdateInventoryItemInput } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  addInventoryItem: (itemData: NewInventoryItemInput) => Promise<InventoryItem | null>;
  updateInventoryItem: (id: string, updates: UpdateInventoryItemInput) => Promise<boolean>;
  deleteInventoryItem: (id: string) => Promise<boolean>;
  findItemByName: (name: string) => InventoryItem | undefined;
  restockItem: (itemId: string, quantityToAdd: number) => Promise<boolean>;
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
  async (itemData: NewInventoryItemInput): Promise<InventoryItem | null> => {
    // 1. Validasi duplikat nama dan SKU langsung ke database
    const orQuery = [`name.eq.${itemData.name}`];
    // Hanya tambahkan pengecekan SKU jika SKU diisi
    if (itemData.sku && itemData.sku.trim() !== '') {
      orQuery.push(`sku.eq.${itemData.sku}`);
    }
    const { data: existingItems } = await supabase
      .from('inventory_items')
      .select('name, sku')
      .or(orQuery.join(','));

    if (existingItems && existingItems.length > 0) {
      toast({ title: 'Error', description: 'Nama atau SKU barang sudah ada.', variant: 'destructive' });
      return null;
    }

    // 2. Masukkan data baru dan minta data yang baru dibuat kembali
    const { data: newItemData, error: insertError } = await supabase
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

    if (insertError || !newItemData) {
      toast({ title: 'Error', description: 'Gagal menambahkan barang baru.', variant: 'destructive' });
      console.error("Insert Error:", insertError);
      return null;
    }
    
    // 3. Format data dari database agar sesuai dengan tipe 'InventoryItem' di aplikasi
    const formattedItem: InventoryItem = {
      id: newItemData.id,
      name: newItemData.name,
      sku: newItemData.sku || undefined,
      stockQuantity: newItemData.stock_quantity,
      purchasePrice: newItemData.purchase_price || 0,
      sellingPrice: newItemData.selling_price,
      lowStockThreshold: newItemData.low_stock_threshold || undefined,
      lastRestocked: newItemData.last_restocked || undefined,
    };
    
    // 4. Update state lokal secara optimis (tanpa perlu fetch ulang)
    setInventoryItems(prev => 
      [...prev, formattedItem].sort((a, b) => a.name.localeCompare(b.name))
    );
    
    toast({ title: 'Sukses', description: `Barang "${formattedItem.name}" berhasil ditambahkan.` });
    
    // 5. Kembalikan objek barang baru agar bisa langsung digunakan
    return formattedItem;
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

    const restockItem = useCallback(
    async (itemId: string, quantityToAdd: number): Promise<boolean> => {
      // Ambil stok saat ini untuk kalkulasi yang aman
      const item = inventoryItems.find(i => i.id === itemId);
      if (!item) {
        toast({ title: 'Error', description: 'Barang tidak ditemukan.', variant: 'destructive' });
        return false;
      }

      const newStockQuantity = item.stockQuantity + quantityToAdd;

      const { data: updatedItem, error } = await supabase
        .from('inventory_items')
        .update({
          stock_quantity: newStockQuantity,
          last_restocked: new Date().toISOString(), // Perbarui tanggal restock
        })
        .eq('id', itemId)
        .select()
        .single();
      
      if (error || !updatedItem) {
        toast({ title: 'Error', description: 'Gagal melakukan restock.', variant: 'destructive' });
        return false;
      }
      
      // Update UI secara optimis
      setInventoryItems(prev => prev.map(i => i.id === itemId ? {
        ...i,
        stockQuantity: updatedItem.stock_quantity,
        lastRestocked: updatedItem.last_restocked || undefined,
      } : i));

      toast({ title: 'Sukses', description: `Stok untuk "${item.name}" berhasil ditambahkan.` });
      return true;
    },
    [supabase, toast, inventoryItems]
  );

  return <InventoryContext.Provider value={{ inventoryItems, isLoading, addInventoryItem, updateInventoryItem, deleteInventoryItem, findItemByName, restockItem }}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
