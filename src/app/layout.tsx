
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { ProgressBar } from '@/components/layout/progress-bar';
import { SidebarProvider } from '@/components/ui/sidebar';

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
        <ProgressBar />
        <SidebarProvider defaultOpen>
          <AppLayout>
            {children}
          </AppLayout>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
