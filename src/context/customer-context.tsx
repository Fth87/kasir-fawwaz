
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Customer, NewCustomerInput, UpdateCustomerInput } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customerData: NewCustomerInput) => Customer | null;
  getCustomerById: (id: string) => Customer | undefined;
  updateCustomer: (id: string, updates: UpdateCustomerInput) => Customer | null;
  deleteCustomer: (id: string) => boolean;
  // getCustomerTransactions: (customerId: string) => Transaction[]; // This would require TransactionContext
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (IS_BROWSER) {
      const storedCustomers = localStorage.getItem('customers');
      try {
        return storedCustomers ? JSON.parse(storedCustomers) : [];
      } catch (e) {
        console.error("Failed to parse customers from localStorage", e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (IS_BROWSER) {
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  }, [customers]);

  const addCustomer = useCallback((customerData: NewCustomerInput): Customer | null => {
    if (customerData.phone && customers.some(c => c.phone === customerData.phone && c.phone !== "")) {
      toast({
        title: "Error Adding Customer",
        description: `A customer with the phone number "${customerData.phone}" already exists.`,
        variant: "destructive",
      });
      return null;
    }
    // Optional: check for duplicate names if desired
    // if (customers.some(c => c.name.toLowerCase() === customerData.name.toLowerCase())) {
    //   toast({ title: "Warning", description: `A customer named "${customerData.name}" already exists. Consider differentiating.`, variant: "default" });
    // }

    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      ...customerData,
      createdAt: now,
      updatedAt: now,
    };
    setCustomers(prev => [...prev, newCustomer].sort((a,b) => a.name.localeCompare(b.name)));
    toast({
      title: "Customer Added",
      description: `"${newCustomer.name}" has been added to your customer list.`,
    });
    return newCustomer;
  }, [customers, toast]);

  const getCustomerById = useCallback((id: string) => {
    return customers.find(c => c.id === id);
  }, [customers]);

  const updateCustomer = useCallback((id: string, updates: UpdateCustomerInput): Customer | null => {
    const customerIndex = customers.findIndex(c => c.id === id);
    if (customerIndex === -1) {
      toast({ title: "Error", description: "Customer not found for update.", variant: "destructive" });
      return null;
    }

    const originalCustomer = customers[customerIndex];

    // Check for phone uniqueness if phone is being changed and is not empty
    if (updates.phone && updates.phone !== originalCustomer.phone && updates.phone !== "") {
      if (customers.some(c => c.id !== id && c.phone === updates.phone)) {
        toast({
          title: "Error Updating Customer",
          description: `Another customer with the phone number "${updates.phone}" already exists.`,
          variant: "destructive",
        });
        return null;
      }
    }

    const updatedCustomer: Customer = {
      ...originalCustomer,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    const newCustomers = [...customers];
    newCustomers[customerIndex] = updatedCustomer;
    setCustomers(newCustomers.sort((a,b) => a.name.localeCompare(b.name)));
    toast({ title: "Customer Updated", description: `"${updatedCustomer.name}"'s details have been updated.` });
    return updatedCustomer;
  }, [customers, toast]);

  const deleteCustomer = useCallback((id: string): boolean => {
    const customerExists = customers.some(c => c.id === id);
    if (!customerExists) {
      toast({ title: "Error", description: "Customer not found for deletion.", variant: "destructive" });
      return false;
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
    toast({ title: "Customer Deleted", description: "The customer has been removed from your list." });
    return true;
  }, [customers, toast]);

  return (
    <CustomerContext.Provider value={{ customers, addCustomer, getCustomerById, updateCustomer, deleteCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};
