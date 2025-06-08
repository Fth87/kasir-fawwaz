
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTransactions } from '@/context/transaction-context';
import type { Transaction, SaleTransaction, ServiceTransaction, ExpenseTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Share2, Smartphone, Settings, Home, Phone } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Link from 'next/link';


export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { getTransactionById } = useTransactions();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (params.id) {
      const txId = params.id as string;
      const tx = getTransactionById(txId);
      setTransaction(tx);
      if (tx && tx.type === 'service' && typeof window !== 'undefined') {
        setQrCodeUrl(`${window.location.origin}/service-status/${tx.id}`);
      }
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
      let shareText = `Receipt for Kasir Konter\nTransaction ID: ${transaction.id.substring(0,8)}\nDate: ${new Date(transaction.date).toLocaleString('id-ID')}\n\n`;
      if (transaction.type === 'sale') {
        const saleTx = transaction as SaleTransaction;
        shareText += `Customer: ${saleTx.customerName || 'N/A'}\nItems:\n`;
        saleTx.items.forEach(item => {
          shareText += `- ${item.name} (x${item.quantity}): ${formatCurrency(item.total)}\n`;
        });
        shareText += `\nGrand Total: ${formatCurrency(saleTx.grandTotal)}`;
      } else if (transaction.type === 'service') {
        const serviceTx = transaction as ServiceTransaction;
        shareText += `Customer: ${serviceTx.customerName || 'N/A'}\n`;
        if (serviceTx.customerPhone) shareText += `Phone: ${serviceTx.customerPhone}\n`;
        if (serviceTx.customerAddress) shareText += `Address: ${serviceTx.customerAddress}\n`;
        shareText += `Service: ${serviceTx.serviceName}\nFee: ${formatCurrency(serviceTx.serviceFee)}`;
        if(qrCodeUrl) {
          shareText += `\nTrack Progress: ${qrCodeUrl}`;
        }
      } else { // expense
        const expenseTx = transaction as ExpenseTransaction;
        shareText += `Expense: ${expenseTx.description}\nCategory: ${expenseTx.category || 'N/A'}\nAmount: ${formatCurrency(expenseTx.amount)}`;
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
              {(transaction as ServiceTransaction).customerPhone && (
                <div>
                  <p className={sectionTitleClass}>Phone</p>
                  <p className={valueClass}>{(transaction as ServiceTransaction).customerPhone}</p>
                </div>
              )}
              {(transaction as ServiceTransaction).customerAddress && (
                <div>
                  <p className={sectionTitleClass}>Address</p>
                  <p className={valueClass + " whitespace-pre-wrap"}>{(transaction as ServiceTransaction).customerAddress}</p>
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
              <Separator />
              {qrCodeUrl && (
                <>
                  <div className="text-center">
                    <p className={sectionTitleClass}>Track Service Progress</p>
                    <div className="flex flex-col items-center gap-2 my-4">
                      <QRCodeCanvas value={qrCodeUrl} size={128} bgColor="#FFFFFF" fgColor="#000000"/>
                      <a href={qrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                        {qrCodeUrl}
                      </a>
                      <p className="text-xs text-muted-foreground">Scan QR or click link to track service progress.</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
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
        <CardFooter className="p-6 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
          <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto order-last sm:order-first mt-2 sm:mt-0">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto order-first sm:order-last">
            {transaction.type === 'service' && (
               <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={`/admin/service-management/${transaction.id}`} className="flex items-center justify-center">
                      <Settings className="mr-2 h-4 w-4 shrink-0" /> 
                      <span>Manage</span>
                  </Link>
               </Button>
            )}
            <Button variant="outline" onClick={handleShare} className="w-full sm:w-auto">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button onClick={handlePrint} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

