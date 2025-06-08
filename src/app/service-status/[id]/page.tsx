
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTransactions } from '@/context/transaction-context';
import type { ServiceTransaction, ProgressNote } from '@/types';
import { getServiceStatusLabel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Smartphone, CheckCircle, Info, Clock, MessageSquare, CircleSlash } from 'lucide-react';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody } from '@/components/ui/timeline'; // Assuming a Timeline component exists or will be created

export default function ServiceStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { getTransactionById, transactions } = useTransactions(); // Watch transactions for updates
  const [service, setService] = useState<ServiceTransaction | null | undefined>(undefined);

  useEffect(() => {
    if (params.id) {
      const tx = getTransactionById(params.id as string);
      if (tx && tx.type === 'service') {
        setService(tx);
      } else {
        setService(null); // Not found or not a service
      }
    }
  }, [params.id, getTransactionById, transactions]); // Add transactions to dependency array

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusIcon = (status: ServiceTransaction['status']) => {
    if (status.startsWith('COMPLETED')) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'CANCELLED') return <CircleSlash className="h-5 w-5 text-red-500" />;
    if (status === 'AWAITING_PARTS' || status.includes('DIAGNOSIS') || status.includes('REPAIR')) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  }

  if (service === undefined) {
    return <div className="flex justify-center items-center h-64">Loading service status...</div>;
  }

  if (!service) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Service Not Found</h2>
        <p className="text-muted-foreground mb-6">The service record you are looking for does not exist or is invalid.</p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <Smartphone className="h-8 w-8" />
            <div>
              <CardTitle className="text-2xl font-headline">Service Status</CardTitle>
              <CardDescription className="text-primary-foreground/80">Track the progress of your device service.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">SERVICE ID</h3>
            <p className="font-medium text-lg">{service.id.substring(0, 8)}</p>
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Service Name</h3>
              <p className="font-medium">{service.serviceName}</p>
            </div>
            {service.customerName && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Customer Name</h3>
                <p className="font-medium">{service.customerName}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Date Submitted</h3>
              <p className="font-medium">{new Date(service.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Service Fee</h3>
              <p className="font-medium">{formatCurrency(service.serviceFee)}</p>
            </div>
          </div>
          
          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              {getStatusIcon(service.status)}
              <span className="ml-2">Current Status: {getServiceStatusLabel(service.status)}</span>
            </h3>
          </div>

          {service.progressNotes && service.progressNotes.length > 0 && (
            <div>
              <h3 className="text-md font-semibold mb-3 text-muted-foreground">Progress History</h3>
              <div className="space-y-4">
                {service.progressNotes.slice().reverse().map((note, index) => (
                  <div key={note.id} className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-md">
                    <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{note.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
           {(!service.progressNotes || service.progressNotes.length === 0) && (
             <p className="text-sm text-muted-foreground">No progress notes available yet.</p>
           )}

          <Separator />
          <div className="text-center mt-6">
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
