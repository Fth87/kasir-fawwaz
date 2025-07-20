
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { TransactionProvider } from '@/context/transaction-context';
import { AuthProvider } from '@/context/auth-context';
import { InventoryProvider } from '@/context/inventory-context';
import { CustomerProvider } from '@/context/customer-context';
import { SettingsProvider } from '@/context/settings-context'; // Import SettingsProvider
import { Toaster } from '@/components/ui/toaster';

const ptSans = PT_Sans({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'Kasir Konter',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
      </head>
      <body className={`${ptSans.variable} font-body antialiased`} suppressHydrationWarning={true}>
        <AuthProvider>
          <SettingsProvider>
            <InventoryProvider>
              <CustomerProvider>
                <TransactionProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                  <Toaster />
                </TransactionProvider>
              </CustomerProvider>
            </InventoryProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
