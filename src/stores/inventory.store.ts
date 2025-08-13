import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { InventoryItem, NewInventoryItemInput, UpdateInventoryItemInput } from '@/types';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { DateRange } from 'react-day-picker';

interface InventoryState {
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { name?: string; dateRange?: DateRange }) => Promise<{ error: Error | null }>;
  addInventoryItem: (itemData: NewInventoryItemInput) => Promise<{ success: boolean; error: Error | null }>;
  updateInventoryItem: (id: string, updates: UpdateInventoryItemInput) => Promise<{ success: boolean; error: Error | null }>;
  deleteInventoryItem: (id: string) => Promise<{ success: boolean; error: Error | null }>;
  findItemByName: (name: string) => InventoryItem | undefined;
  restockItem: (itemId: string, quantityToAdd: number) => Promise<{ success: boolean; error: Error | null }>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  inventoryItems: [],
  isLoading: true,
  pageCount: 0,

  fetchData: async (pagination, sorting, filters) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { pageIndex, pageSize } = pagination;
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('inventory_items').select('*', { count: 'exact' }).range(from, to);

    if (filters.name) query = query.ilike('name', `%${filters.name}%`);
    if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
    } else {
        query = query.order('name', { ascending: true });
    }
    if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
        query = query.lte('created_at', filters.dateRange.to.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
        set({ inventoryItems: [], isLoading: false });
        return { error };
    }

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
    set({ inventoryItems: formattedItems, pageCount: Math.ceil((count ?? 0) / pageSize), isLoading: false });
    return { error: null };
  },

  addInventoryItem: async (itemData) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('inventory_items')
      .insert({
        name: itemData.name,
        sku: itemData.sku,
        stock_quantity: itemData.stockQuantity,
        purchase_price: itemData.purchasePrice,
        selling_price: itemData.sellingPrice,
        low_stock_threshold: itemData.lowStockThreshold,
      });

    if (error) console.error('Error adding inventory item:', error);
    return { success: !error, error: error as Error | null };
  },

  updateInventoryItem: async (id, updates) => {
    const supabase = createClient();
    const updatesForDb: { [key: string]: any } = {};
    if (updates.name) updatesForDb.name = updates.name;
    if (updates.sku) updatesForDb.sku = updates.sku;
    if (updates.stockQuantity !== undefined) updatesForDb.stock_quantity = updates.stockQuantity;
    if (updates.purchasePrice !== undefined) updatesForDb.purchase_price = updates.purchasePrice;
    if (updates.sellingPrice !== undefined) updatesForDb.selling_price = updates.sellingPrice;
    if (updates.lowStockThreshold !== undefined) updatesForDb.low_stock_threshold = updates.lowStockThreshold;

    const { error } = await supabase.from('inventory_items').update(updatesForDb).eq('id', id);
    if (error) console.error('Error updating inventory item:', error);
    return { success: !error, error: error as Error | null };
  },

  deleteInventoryItem: async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) console.error('Error deleting inventory item:', error);
    return { success: !error, error: error as Error | null };
  },

  findItemByName: (name) => {
    return get().inventoryItems.find((item) => item.name.toLowerCase() === name.toLowerCase());
  },

  restockItem: async (itemId, quantityToAdd) => {
    const supabase = createClient();
    const item = get().inventoryItems.find((i) => i.id === itemId);
    if (!item) {
        return { success: false, error: new Error('Barang tidak ditemukan.') };
    }

    const newStockQuantity = item.stockQuantity + quantityToAdd;

    const { error } = await supabase
      .from('inventory_items')
      .update({
        stock_quantity: newStockQuantity,
        last_restocked: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) console.error('Error restocking item:', error);
    return { success: !error, error: error as Error | null };
  },
}));
