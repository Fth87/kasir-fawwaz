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

export interface AppUser {
  id: string;
  email?: string;
  role: "admin" | "cashier" | string; 
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password_input: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signUp: (email: string, password_input: string, role: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); 

  const formatAppUser = (authUser: AuthUser): AppUser => ({
    id: authUser.id,
    email: authUser.email,
    role: authUser.user_metadata?.role || "admin",
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? formatAppUser(session.user) : null);
      setIsLoading(false); 
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);


  const login = useCallback(
    async (email: string, password_input: string): Promise<boolean> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password_input,
      });

      if (error) {
        toast({
          title: "Login Gagal",
          description: error.message,
          variant: "destructive",
        });
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
      toast({
        title: "Logout Gagal",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Logout Berhasil", description: "Anda telah keluar." });
    router.push("/login");
  }, [supabase, router, toast]);

  const signUp = useCallback(
    async (email: string, password_input: string, role: string): Promise<boolean> => {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password_input,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (error) {
        toast({
          title: "Pendaftaran Gagal",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      toast({
        title: "Pendaftaran Berhasil",
        description: "Silakan cek email Anda untuk verifikasi.",
      });
      return true;
    },
    [supabase, toast]
  );

  const value = {
    user,
    isLoading,
    login,
    logout,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
};