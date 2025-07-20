'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { InventoryItem, NewInventoryItemInput, UpdateInventoryItemInput } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { DateRange } from 'react-day-picker';

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { name?: string; dateRange?: DateRange }) => void;
  addInventoryItem: (itemData: NewInventoryItemInput) => Promise<boolean>;
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
  const [pageCount, setPageCount] = useState(0);

  const fetchData = useCallback(
    async (pagination: PaginationState, sorting: SortingState, filters: { name?: string; dateRange?: DateRange }) => {
      setIsLoading(true);

      const { pageIndex, pageSize } = pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('inventory_items').select('*', { count: 'exact' }).range(from, to);

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }

      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      } else {
        query = query.order('name', { ascending: true });
      }

      if (filters.dateRange?.from && filters.dateRange?.to) {
        // 'created_at' adalah kolom tanggal di tabel Anda
        query = query.gte('created_at', filters.dateRange.from.toISOString());
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data, error, count } = await query;

      if (error) {
        toast({ title: 'Error', description: 'Gagal memuat data inventaris.', variant: 'destructive' });
        setInventoryItems([]);
      } else if (data) {
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
        setPageCount(Math.ceil((count ?? 0) / pageSize));
      }
      setIsLoading(false);
    },
    [supabase, toast]
  );

  const addInventoryItem = useCallback(
    async (itemData: NewInventoryItemInput): Promise<boolean> => {
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
        toast({ title: 'Error', description: insertError?.message || 'Gagal menambahkan barang baru.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: `Barang "${itemData.name}" berhasil ditambahkan.` });
      return true;
    },
    [supabase, toast]
  );

  const updateInventoryItem = useCallback(
    async (id: string, updates: UpdateInventoryItemInput): Promise<boolean> => {
      const updatesForDb: { [key: string]: string | number | undefined } = {};
      if (updates.name) updatesForDb.name = updates.name;
      if (updates.sku) updatesForDb.sku = updates.sku;
      if (updates.stockQuantity !== undefined) updatesForDb.stock_quantity = updates.stockQuantity;
      if (updates.purchasePrice !== undefined) updatesForDb.purchase_price = updates.purchasePrice;
      if (updates.sellingPrice !== undefined) updatesForDb.selling_price = updates.sellingPrice;
      if (updates.lowStockThreshold !== undefined) updatesForDb.low_stock_threshold = updates.lowStockThreshold;

      const { error } = await supabase.from('inventory_items').update(updatesForDb).eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message || 'Gagal memperbarui barang.', variant: 'destructive' });
        return false;
      }

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
      const item = inventoryItems.find((i) => i.id === itemId);
      if (!item) {
        toast({ title: 'Error', description: 'Barang tidak ditemukan.', variant: 'destructive' });
        return false;
      }

      const newStockQuantity = item.stockQuantity + quantityToAdd;

      const { error } = await supabase
        .from('inventory_items')
        .update({
          stock_quantity: newStockQuantity,
          last_restocked: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) {
        toast({ title: 'Error', description: 'Gagal melakukan restock.', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Sukses', description: `Stok untuk "${item.name}" berhasil ditambahkan.` });
      // Tidak perlu fetch ulang, biarkan tabel yang memicu refresh
      return true;
    },
    [supabase, toast, inventoryItems]
  );

  return <InventoryContext.Provider value={{ inventoryItems, isLoading, pageCount, fetchData, addInventoryItem, updateInventoryItem, deleteInventoryItem, findItemByName, restockItem }}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
