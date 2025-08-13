import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@supabase/supabase-js';

// NOTE: This type is duplicated from the original context.
// It should be moved to a central types file (`src/types/index.ts`) as part of the refactor.
interface AppUser {
  id: string;
  email?: string;
  role: string; // E.g., 'admin' or 'cashier'
}

const formatAppUser = (authUser: AuthUser): AppUser => ({
  id: authUser.id,
  email: authUser.email,
  role: authUser.user_metadata?.role || "cashier",
});

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password_input: string) => Promise<{ error: any | null }>;
  logout: () => Promise<{ error: any | null }>;
  signUp: (email: string, password_input: string, role: string) => Promise<{ error: any | null }>;
  // Internal function to set up the auth listener
  _initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Start loading until the first auth state is received

  login: async (email, password_input) => {
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password: password_input,
    });
    return { error };
  },

  logout: async () => {
    const { error } = await createClient().auth.signOut();
    return { error };
  },

  signUp: async (email, password_input, role) => {
    const { error } = await createClient().auth.signUp({
      email,
      password: password_input,
      options: {
        data: { role },
      },
    });
    return { error };
  },

  _initialize: () => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const appUser = session ? formatAppUser(session.user) : null;
        set({ user: appUser, isLoading: false });
      }
    );

    // Return the unsubscribe function for cleanup, though it won't be called in this setup
    return () => {
      subscription?.unsubscribe();
    };
  },
}));

// Initialize the auth listener as soon as the app loads the store.
// This is a key part of the setup.
useAuthStore.getState()._initialize();
