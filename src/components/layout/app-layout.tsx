
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
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import Loading from '@/app/loading'; // Import global loading component

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales', label: 'Record Sale', icon: ShoppingCart },
  { href: '/services', label: 'Record Service', icon: Wrench },
  { href: '/expenses', label: 'Record Expense', icon: BadgeDollarSign },
  { href: '/transactions', label: 'Transactions', icon: ScrollText },
  { href: '/recommendations', label: 'Price AI', icon: Lightbulb },
];

const adminNavItems = [
 { href: '/admin/manage-services', label: 'Manage Services', icon: ClipboardList },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoadingAuth, logout } = useAuth();

  useEffect(() => {
    if (isLoadingAuth) return; // Wait until auth state is determined

    if (!currentUser && pathname !== '/login') {
      router.push('/login');
    } else if (currentUser && pathname === '/login') {
      router.push('/'); // If logged in and on login page, redirect to home
    }
  }, [currentUser, isLoadingAuth, pathname, router]);

  // If on login page, and not yet authenticated (or still loading auth), render children directly
  // This prevents the AppLayout shell from appearing on the login page itself.
  if (pathname === '/login') {
    if (isLoadingAuth || !currentUser) { // Check !currentUser to ensure redirect to / if logged in
      return <>{children}</>;
    }
    // If somehow currentUser is true AND pathname is /login, useEffect will redirect,
    // but good to have a fallback or return children until redirect happens.
    return <Loading />;
  }

  // If still loading auth status for non-login pages, show a global loader
  if (isLoadingAuth) {
    return <Loading />;
  }

  // If not authenticated and not on login page (redirect should be in progress), show loader
  if (!currentUser && pathname !== '/login') {
    return <Loading />;
  }
  
  // If currentUser is null but we passed the above checks (shouldn't happen often due to redirect),
  // it's safer to return a loader or an empty fragment. This indicates an edge case.
  if (!currentUser) {
      return <Loading />;
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
