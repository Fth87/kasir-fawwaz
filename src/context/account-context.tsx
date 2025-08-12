'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UserData } from '@/app/admin/manage-accounts/actions';
import { getUsers, createNewUser, updateUser, deleteUser } from '@/app/admin/manage-accounts/actions';
import { useToast } from '@/hooks/use-toast';
import type { PaginationState, SortingState } from '@tanstack/react-table';

// --- Input Types ---
// These will be based on FormData for server actions
export type NewUserInput = FormData;
export type UpdateUserInput = FormData;

// --- Context Shape ---
interface AccountContextType {
  users: UserData[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState) => void;
  addUser: (userData: NewUserInput) => Promise<boolean>;
  updateUser: (id: string, userData: UpdateUserInput) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  const fetchData = useCallback(
    async (pagination: PaginationState, sorting: SortingState) => {
      setIsLoading(true);
      const { pageIndex, pageSize } = pagination;

      // Sorting is not supported by the admin API, so we ignore the sorting state for the API call.
      // We could implement client-side sorting if needed after fetching.
      const { data, error } = await getUsers(pageIndex, pageSize);

      if (error) {
        toast({ title: 'Error', description: 'Gagal memuat data pengguna.', variant: 'destructive' });
        setUsers([]);
      } else if (data) {
        setUsers(data.users);
        setPageCount(Math.ceil((data.count ?? 0) / pageSize));
      }
      setIsLoading(false);
    },
    [toast]
  );

  const addUser = useCallback(
    async (userData: NewUserInput): Promise<boolean> => {
      const result = await createNewUser(userData);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return false;
      }
      toast({ title: 'Sukses', description: result.success });
      return true;
    },
    [toast]
  );

  const updateUserAccount = useCallback(
    async (id: string, userData: UpdateUserInput): Promise<boolean> => {
      const result = await updateUser(id, userData);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return false;
      }
      toast({ title: 'Sukses', description: result.success });
      return true;
    },
    [toast]
  );

  const deleteUserAccount = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await deleteUser(id);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return false;
      }
      toast({ title: 'Sukses', description: result.success });
      return true;
    },
    [toast]
  );

  return (
    <AccountContext.Provider value={{ users, isLoading, pageCount, fetchData, addUser, updateUser: updateUserAccount, deleteUser: deleteUserAccount }}>
        {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};
