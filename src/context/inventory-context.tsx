
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { InventoryItem, NewInventoryItemInput, UpdateInventoryItemInput } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  addInventoryItem: (itemData: NewInventoryItemInput) => InventoryItem | null;
  getInventoryItemById: (id: string) => InventoryItem | undefined;
  updateInventoryItem: (id: string, updates: UpdateInventoryItemInput) => InventoryItem | null;
  deleteInventoryItem: (id: string) => boolean;
  decreaseStock: (itemName: string, quantityToDecrease: number) => boolean;
  increaseStock: (itemName: string, quantityToIncrease: number) => boolean;
  findItemByName: (name: string) => InventoryItem | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    if (IS_BROWSER) {
      const storedItems = localStorage.getItem('inventoryItems');
      try {
        return storedItems ? JSON.parse(storedItems) : [];
      } catch (e) {
        console.error("Failed to parse inventory items from localStorage", e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (IS_BROWSER) {
      localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    }
  }, [inventoryItems]);

  const addInventoryItem = useCallback((itemData: NewInventoryItemInput): InventoryItem | null => {
    if (inventoryItems.some(item => item.name.toLowerCase() === itemData.name.toLowerCase())) {
      toast({
        title: "Error Adding Item",
        description: `An item with the name "${itemData.name}" already exists.`,
        variant: "destructive",
      });
      return null;
    }
    if (itemData.sku && inventoryItems.some(item => item.sku === itemData.sku)) {
        toast({
          title: "Error Adding Item",
          description: `An item with the SKU "${itemData.sku}" already exists.`,
          variant: "destructive",
        });
        return null;
    }

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      ...itemData,
      lastRestocked: itemData.stockQuantity > 0 ? new Date().toISOString() : undefined,
    };
    setInventoryItems(prev => [newItem, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
    toast({
      title: "Item Added",
      description: `"${newItem.name}" has been added to inventory.`,
    });
    return newItem;
  }, [inventoryItems, toast]);

  const getInventoryItemById = useCallback((id: string) => {
    return inventoryItems.find(item => item.id === id);
  }, [inventoryItems]);

  const findItemByName = useCallback((name: string) => {
    return inventoryItems.find(item => item.name.toLowerCase() === name.toLowerCase());
  }, [inventoryItems]);

  const updateInventoryItem = useCallback((id: string, updates: UpdateInventoryItemInput): InventoryItem | null => {
    const itemIndex = inventoryItems.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      toast({ title: "Error", description: "Item not found for update.", variant: "destructive" });
      return null;
    }

    // Check for name uniqueness if name is being changed
    if (updates.name && updates.name.toLowerCase() !== inventoryItems[itemIndex].name.toLowerCase()) {
      if (inventoryItems.some(item => item.id !== id && item.name.toLowerCase() === updates.name?.toLowerCase())) {
        toast({
          title: "Error Updating Item",
          description: `An item with the name "${updates.name}" already exists.`,
          variant: "destructive",
        });
        return null;
      }
    }
    // Check for SKU uniqueness if SKU is being changed
    if (updates.sku && updates.sku !== inventoryItems[itemIndex].sku) {
        if (inventoryItems.some(item => item.id !== id && item.sku === updates.sku && item.sku !== "")) {
          toast({
            title: "Error Updating Item",
            description: `An item with the SKU "${updates.sku}" already exists.`,
            variant: "destructive",
          });
          return null;
        }
    }


    const updatedItem = { ...inventoryItems[itemIndex], ...updates };
    const newItems = [...inventoryItems];
    newItems[itemIndex] = updatedItem;
    setInventoryItems(newItems.sort((a,b) => a.name.localeCompare(b.name)));
    toast({ title: "Item Updated", description: `"${updatedItem.name}" has been updated.` });
    return updatedItem;
  }, [inventoryItems, toast]);

  const deleteInventoryItem = useCallback((id: string): boolean => {
    const itemExists = inventoryItems.some(item => item.id === id);
    if (!itemExists) {
      toast({ title: "Error", description: "Item not found for deletion.", variant: "destructive" });
      return false;
    }
    setInventoryItems(prev => prev.filter(item => item.id !== id));
    toast({ title: "Item Deleted", description: "The item has been removed from inventory." });
    return true;
  }, [inventoryItems, toast]);

  const decreaseStock = useCallback((itemName: string, quantityToDecrease: number): boolean => {
    const itemIndex = inventoryItems.findIndex(item => item.name.toLowerCase() === itemName.toLowerCase());
    if (itemIndex === -1) {
      // Item not found in inventory, possibly an ad-hoc sale item. Don't show error.
      return false; 
    }
    
    const item = inventoryItems[itemIndex];
    if (item.stockQuantity < quantityToDecrease) {
      toast({
        title: "Low Stock Warning",
        description: `Not enough stock for "${item.name}". Only ${item.stockQuantity} available. Sale recorded, but stock is now 0 or negative.`,
        variant: "destructive",
      });
      // Allow stock to go negative as per user's previous allowance of selling things not in inventory
    }

    const updatedItem = { ...item, stockQuantity: item.stockQuantity - quantityToDecrease };
    const newItems = [...inventoryItems];
    newItems[itemIndex] = updatedItem;
    setInventoryItems(newItems);
    
    if (updatedItem.stockQuantity < (updatedItem.lowStockThreshold || 0) && item.stockQuantity >= (updatedItem.lowStockThreshold || 0) ) {
        toast({
            title: "Low Stock Alert",
            description: `Stock for "${updatedItem.name}" is low (${updatedItem.stockQuantity}).`,
            variant: "default"
        })
    }
    return true;
  }, [inventoryItems, toast]);

  const increaseStock = useCallback((itemName: string, quantityToIncrease: number): boolean => {
    const itemIndex = inventoryItems.findIndex(item => item.name.toLowerCase() === itemName.toLowerCase());
    if (itemIndex === -1) {
      toast({ title: "Error", description: `Item "${itemName}" not found in inventory to increase stock.`, variant: "destructive" });
      return false;
    }
    const item = inventoryItems[itemIndex];
    const updatedItem = { ...item, stockQuantity: item.stockQuantity + quantityToIncrease, lastRestocked: new Date().toISOString() };
    const newItems = [...inventoryItems];
    newItems[itemIndex] = updatedItem;
    setInventoryItems(newItems);
    toast({ title: "Stock Increased", description: `Stock for "${item.name}" increased by ${quantityToIncrease}.` });
    return true;
  }, [inventoryItems, toast]);

  return (
    <InventoryContext.Provider value={{ inventoryItems, addInventoryItem, getInventoryItemById, updateInventoryItem, deleteInventoryItem, decreaseStock, increaseStock, findItemByName }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
