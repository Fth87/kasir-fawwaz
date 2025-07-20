
import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { TransactionProvider } from '@/context/transaction-context';
import { AuthProvider } from '@/context/auth-context';
import { InventoryProvider } from '@/context/inventory-context';
import { CustomerProvider } from '@/context/customer-context';
import { SettingsProvider } from '@/context/settings-context'; // Import SettingsProvider
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Kasir Konter',
  description: 'Aplikasi kasir untuk konter HP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
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
