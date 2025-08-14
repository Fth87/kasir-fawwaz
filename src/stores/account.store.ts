import { create } from 'zustand';
import type { UserData } from '@/app/admin/manage-accounts/actions';
import { getUsers, createNewUser, updateUser, deleteUser } from '@/app/admin/manage-accounts/actions';
import type { PaginationState, SortingState } from '@tanstack/react-table';

export type NewUserInput = FormData;
export type UpdateUserInput = FormData;

interface AccountState {
  users: UserData[];
  isLoading: boolean;
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState) => Promise<{ error: string | null }>;
  addUser: (userData: NewUserInput) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  updateUser: (id: string, userData: UpdateUserInput) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error: string | null; successMessage?: string; }>;
}

export const useAccountStore = create<AccountState>((set) => ({
  users: [],
  isLoading: true,
  pageCount: 0,

  fetchData: async (pagination) => {
    set({ isLoading: true });
    // Sorting is ignored by the API in the original context, so we do the same.
    const { pageIndex, pageSize } = pagination;
    const { data, error } = await getUsers(pageIndex, pageSize);

    if (error) {
      set({ users: [], isLoading: false });
      return { error };
    }

    if (data) {
        set({ users: data.users, pageCount: Math.ceil((data.count ?? 0) / pageSize), isLoading: false });
    } else {
        set({ isLoading: false });
    }
    return { error: null };
  },

  addUser: async (userData) => {
    const { success, error } = await createNewUser(userData);
    return { success: !!success, error: error || null, successMessage: success };
  },

  updateUser: async (id, userData) => {
    const { success, error } = await updateUser(id, userData);
    return { success: !!success, error: error || null, successMessage: success };
  },

  deleteUser: async (id) => {
    const { success, error } = await deleteUser(id);
    return { success: !!success, error: error || null, successMessage: success };
  },
}));
