"use client";

import type { ReactNode } from "react";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Tipe data untuk pengguna di dalam aplikasi.
 */
export interface AppUser {
  id: string;
  email?: string;
  role: string; // Misal: 'admin' atau 'cashier'
}

/**
 * Tipe untuk nilai yang disediakan oleh AuthContext.
 */
interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password_input: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signUp: (email: string, password_input: string, role: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Helper function untuk mengubah data pengguna Supabase menjadi tipe AppUser.
 * @param authUser - Objek AuthUser dari Supabase.
 * @returns Objek AppUser.
 */
const formatAppUser = (authUser: AuthUser): AppUser => ({
  id: authUser.id,
  email: authUser.email,
  // Default role 'cashier' lebih aman daripada 'admin'
  role: authUser.user_metadata?.role || "cashier",
});

/**
 * Provider untuk mengelola state dan fungsi otentikasi di seluruh aplikasi.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listener ini akan berjalan saat awal dan setiap kali status otentikasi berubah
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? formatAppUser(session.user) : null);
      setIsLoading(false);
    });

    // Hentikan listener saat komponen tidak lagi digunakan
    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const login = useCallback(
    async (email: string, password_input: string): Promise<boolean> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: password_input,
      });

      if (error) {
        toast({ title: "Login Gagal", description: error.message, variant: "destructive" });
        return false;
      }

      toast({ title: "Login Berhasil", description: `Selamat datang kembali!` });
      return true;
    },
    [supabase, toast]
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Logout Gagal", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Logout Berhasil", description: "Anda telah berhasil keluar." });
    // Mengarahkan ke halaman login setelah state diupdate
    router.push("/login");
  }, [supabase, router, toast]);

  const signUp = useCallback(
    async (email: string, password_input: string, role: string): Promise<boolean> => {
      const { error } = await supabase.auth.signUp({
        email,
        password: password_input,
        options: {
          data: { role }, // Simpan role di metadata
        },
      });

      if (error) {
        toast({ title: "Pendaftaran Gagal", description: error.message, variant: "destructive" });
        return false;
      }
      
      toast({ title: "Pendaftaran Berhasil", description: "Silakan cek email Anda untuk verifikasi." });
      return true;
    },
    [supabase, toast]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook kustom untuk mengakses AuthContext dengan mudah dan aman.
 * @returns Nilai dari AuthContext.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
};