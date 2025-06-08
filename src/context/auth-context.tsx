
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';

// IMPORTANT: Hardcoding users like this is NOT secure for production.
// Passwords should be hashed and stored in a secure backend database.
const hardcodedUsers: User[] = [
  { id: 'user-admin-001', username: 'admin', password: 'adminpassword', role: 'admin' },
  { id: 'user-cashier-002', username: 'kasir', password: 'kasirpassword', role: 'cashier' },
];

interface AuthContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  login: (username: string, password_input: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (IS_BROWSER) {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoadingAuth(false);
      }
    } else {
      setIsLoadingAuth(false); // On server, finish loading immediately
    }
  }, []);

  const login = useCallback(async (username: string, password_input: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    const user = hardcodedUsers.find(u => u.username === username && u.password === password_input);

    if (user) {
      // In a real app, don't store the password in the user object that goes to localStorage/state
      const { password, ...userToStore } = user;
      setCurrentUser(userToStore);
      if (IS_BROWSER) {
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
      }
      toast({ title: "Login Successful", description: `Welcome, ${user.username}!` });
      setIsLoadingAuth(false);
      return true;
    } else {
      toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
      setIsLoadingAuth(false);
      return false;
    }
  }, [toast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (IS_BROWSER) {
      localStorage.removeItem('currentUser');
    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login'); // Redirect to login page after logout
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
