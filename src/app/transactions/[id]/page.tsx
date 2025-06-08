"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Share2, Smartphone } from 'lucide-react';
import Image from 'next/image';

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { getTransactionById } = useTransactions();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined); // undefined for loading, null for not found

  useEffect(() => {
    if (params.id) {
      const tx = getTransactionById(params.id as string);
      setTransaction(tx);
    }
  }, [params.id, getTransactionById]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };
  
  const handleShare = async () => {
    if (navigator.share && transaction) {
      let shareText = `Receipt for Kasir Konter\nTransaction ID: ${transaction.id}\nDate: ${new Date(transaction.date).toLocaleString('id-ID')}\n\n`;
      if (transaction.type === 'sale') {
        shareText += `Customer: ${transaction.customerName || 'N/A'}\nItems:\n`;
        transaction.items.forEach(item => {
          shareText += `- ${item.name} (x${item.quantity}): ${formatCurrency(item.total)}\n`;
        });
        shareText += `\nGrand Total: ${formatCurrency(transaction.grandTotal)}`;
      } else if (transaction.type === 'service') {
        shareText += `Customer: ${transaction.customerName || 'N/A'}\nService: ${transaction.serviceName}\nFee: ${formatCurrency(transaction.serviceFee)}`;
      } else {
        shareText += `Expense: ${transaction.description}\nCategory: ${transaction.category || 'N/A'}\nAmount: ${formatCurrency(transaction.amount)}`;
      }

      try {
        await navigator.share({
          title: 'Transaction Receipt',
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert('Web Share API is not supported in your browser, or no transaction to share.');
    }
  };


  if (transaction === undefined) {
    return <div className="flex justify-center items-center h-64">Loading receipt...</div>;
  }

  if (!transaction) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Transaction Not Found</h2>
        <p className="text-muted-foreground mb-6">The transaction you are looking for does not exist or could not be loaded.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }
  
  // Common styles for receipt sections
  const sectionTitleClass = "text-sm font-semibold text-muted-foreground uppercase tracking-wider";
  const valueClass = "font-medium";

  return (
    <div className="max-w-md mx-auto bg-background p-0 print:p-0">
      <Card className="shadow-lg print:shadow-none print:border-none">
        <CardHeader className="bg-primary text-primary-foreground p-6 print:bg-transparent print:text-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Smartphone className="h-8 w-8" />
               <CardTitle className="text-2xl font-headline">Kasir Konter</CardTitle>
            </div>
            <div className="text-right">
                <p className="text-xs">Receipt</p>
                <p className="text-xs">ID: {transaction.id.substring(0,8)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <p className={sectionTitleClass}>Transaction Date</p>
            <p className={valueClass}>{new Date(transaction.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
          </div>

          <Separator />

          {transaction.type === 'sale' && (
            <>
              {(transaction as SaleTransaction).customerName && (
                <div>
                  <p className={sectionTitleClass}>Customer</p>
                  <p className={valueClass}>{(transaction as SaleTransaction).customerName}</p>
                </div>
              )}
              <div>
                <p className={sectionTitleClass}>Items</p>
                <ul className="space-y-1 mt-1">
                  {(transaction as SaleTransaction).items.map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.name} (x{item.quantity})</span>
                      <span className={valueClass}>{formatCurrency(item.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Grand Total</p>
                <p className="text-lg font-bold text-primary">{formatCurrency((transaction as SaleTransaction).grandTotal)}</p>
              </div>
            </>
          )}

          {transaction.type === 'service' && (
            <>
              {(transaction as ServiceTransaction).customerName && (
                <div>
                  <p className={sectionTitleClass}>Customer</p>
                  <p className={valueClass}>{(transaction as ServiceTransaction).customerName}</p>
                </div>
              )}
              <div>
                <p className={sectionTitleClass}>Service Rendered</p>
                <p className={valueClass}>{(transaction as ServiceTransaction).serviceName}</p>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Service Fee</p>
                <p className="text-lg font-bold text-primary">{formatCurrency((transaction as ServiceTransaction).serviceFee)}</p>
              </div>
            </>
          )}

          {transaction.type === 'expense' && (
            <>
              <div>
                <p className={sectionTitleClass}>Expense Description</p>
                <p className={valueClass}>{(transaction as ExpenseTransaction).description}</p>
              </div>
              {(transaction as ExpenseTransaction).category && (
                <div>
                  <p className={sectionTitleClass}>Category</p>
                  <p className={valueClass}>{(transaction as ExpenseTransaction).category}</p>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Amount</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency((transaction as ExpenseTransaction).amount)}</p>
              </div>
            </>
          )}
          
          <Separator />
          <p className="text-center text-xs text-muted-foreground pt-4">Thank you for your business!</p>

        </CardContent>
        <CardFooter className="p-6 flex flex-col sm:flex-row gap-2 print:hidden">
          <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-grow" />
          <Button variant="outline" onClick={handleShare} className="w-full sm:w-auto">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button onClick={handlePrint} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Basic print styles
const PrintStyles = () => (
  <style jsx global>{`
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background-color: white !important;
      }
      .print\\:p-0 { padding: 0 !important; }
      .print\\:shadow-none { box-shadow: none !important; }
      .print\\:border-none { border: none !important; }
      .print\\:bg-transparent { background-color: transparent !important; }
      .print\\:text-black { color: black !important; }
      .print\\:hidden { display: none !important; }
    }
  `}</style>
);

// To activate print styles, include <PrintStyles /> in the component,
// but it's generally better to handle this in a global CSS file if more widespread print styling is needed.
// For this specific page, it's okay to leave it out if basic browser print is sufficient or include it here.
// For now, basic browser print is assumed.
