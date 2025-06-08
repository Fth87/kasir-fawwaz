
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  BadgeDollarSign,
  ScrollText,
  Lightbulb,
  LogOut,
  Settings,
  Smartphone,
  ClipboardList,
  ShieldCheck,
  Loader2,
  Users,
  BarChart3, // Added BarChart3 icon for reports
  ListOrdered // Added ListOrdered for manage transactions
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Loading from '@/app/loading'; 

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales', label: 'Record Sale', icon: ShoppingCart },
  { href: '/services', label: 'Record Service', icon: Wrench },
  { href: '/expenses', label: 'Record Expense', icon: BadgeDollarSign },
  { href: '/transactions', label: 'Transactions', icon: ScrollText },
  { href: '/reports', label: 'Reports', icon: BarChart3 }, // Added Reports link
  { href: '/recommendations', label: 'Price AI', icon: Lightbulb },
];

const adminNavItems = [
 { href: '/admin/manage-services', label: 'Manage Services', icon: ClipboardList },
 { href: '/admin/manage-accounts', label: 'Manage Accounts', icon: Users },
 { href: '/admin/manage-transactions', label: 'Manage Transactions', icon: ListOrdered }, // Added Manage Transactions link
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoadingAuth, logout } = useAuth();

  useEffect(() => {
    if (isLoadingAuth) return; 

    if (!currentUser && pathname !== '/login') {
      router.push('/login');
    } else if (currentUser && pathname === '/login') {
      router.push('/'); 
    }
  }, [currentUser, isLoadingAuth, pathname, router]);

  if (pathname === '/login') {
    if (isLoadingAuth || !currentUser) { 
      return <>{children}</>;
    }
    return <Loading />;
  }

  if (isLoadingAuth) {
    return <Loading />;
  }

  if (!currentUser && pathname !== '/login') {
    // This case should ideally be caught by the useEffect redirect,
    // but as a fallback, show loading until redirect happens.
    return <Loading />;
  }
  
  // If after loading, still no current user (and not on login page),
  // it implies an issue or a state where user should be redirected.
  // Showing loading is a safe fallback before redirection logic in useEffect kicks in.
  if (!currentUser) {
      return <Loading />; // Or a more specific "Redirecting to login..." message
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger variant="ghost" size="icon" className="shrink-0 md:hidden" />
            <Link href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-lg font-semibold text-sidebar-foreground transition-colors group-data-[collapsible=icon]:hidden">
              <Smartphone className="h-6 w-6 text-sidebar-primary" />
              Kasir Konter
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Button
                  asChild
                  variant={(pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) ? 'secondary' : 'ghost'}
                  className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          {currentUser?.role === 'admin' && (
            <>
              <SidebarSeparator className="my-2" />
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center">
                    <ShieldCheck className="mr-2 h-4 w-4"/>
                    <span className="group-data-[collapsible=icon]:hidden">Admin Area</span>
                </SidebarGroupLabel>
                <SidebarMenu>
                    {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <Button
                        asChild
                        variant={(pathname === item.href || pathname.startsWith(item.href)) ? 'secondary' : 'ghost'}
                        className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                        >
                        <Link href={item.href} className="flex items-center gap-3">
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                        </Button>
                    </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}

        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
           <SidebarMenu>
             <SidebarMenuItem>
               <Button
                 variant="ghost"
                 className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                 onClick={logout}
               >
                 <LogOut className="h-5 w-5 shrink-0" />
                 <span className="group-data-[collapsible=icon]:hidden">Logout</span>
               </Button>
             </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 md:hidden">
           <SidebarTrigger variant="ghost" size="icon" className="shrink-0" />
           <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
             <Smartphone className="h-6 w-6 text-primary" />
             Kasir Konter
           </Link>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
