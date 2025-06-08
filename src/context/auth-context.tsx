
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole, NewUserInput } from '@/types';
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
  users: User[]; // Expose users for admin display
  login: (username: string, password_input: string) => Promise<boolean>;
  logout: () => void;
  addUser: (userData: NewUserInput) => Promise<boolean>; // Conceptual add user
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IS_BROWSER = typeof window !== 'undefined';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // For prototype, manage a mutable list of users in state if we want "add" to reflect immediately.
  // However, this won't persist beyond session or truly modify `hardcodedUsers`.
  // For simplicity and clarity of prototype limitations, `addUser` will be conceptual.
  const [displayUsers, setDisplayUsers] = useState<User[]>([...hardcodedUsers]);

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
    // In a real app, this check would be against a database
    const user = displayUsers.find(u => u.username === username && u.password === password_input);

    if (user) {
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
  }, [toast, displayUsers]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (IS_BROWSER) {
      localStorage.removeItem('currentUser');
    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login');
  }, [router, toast]);

  const addUser = useCallback(async (userData: NewUserInput): Promise<boolean> => {
    // Conceptual: In a real app, this would interact with a backend API.
    // For this prototype, we'll simulate success and demonstrate UI capability.
    // We could add to `displayUsers` state for immediate UI feedback if needed,
    // but it won't persist or modify the original `hardcodedUsers`.
    
    // Check if username already exists
    if (displayUsers.some(u => u.username === userData.username)) {
        toast({
            title: "Failed to Add User",
            description: `Username "${userData.username}" already exists.`,
            variant: "destructive",
        });
        return false;
    }
    
    // Simulate adding the user for immediate display in this session (won't persist)
    // This part is purely for local demonstration if you want the list to update visually.
    // const newUser = { ...userData, id: `user-${crypto.randomUUID().substring(0,8)}` };
    // setDisplayUsers(prev => [...prev, newUser]);

    toast({
      title: "User Action",
      description: `User "${userData.username}" would be added with role "${userData.role}". (This is a UI demo - no data is permanently saved).`,
    });
    // console.log("New user data (conceptual):", userData);
    // In a real app, return true/false based on backend response.
    return true;
  }, [toast, displayUsers]);


  return (
    <AuthContext.Provider value={{ currentUser, isLoadingAuth, users: displayUsers, login, logout, addUser }}>
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
