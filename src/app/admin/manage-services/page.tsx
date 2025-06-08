
"use client";

import React from 'react';
import Link from 'next/link';
import { useTransactions } from '@/context/transaction-context';
import type { ServiceTransaction } from '@/types';
import { getServiceStatusLabel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ClipboardList, Settings, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ManageServicesPage() {
  const { transactions } = useTransactions();
  const serviceTransactions = transactions.filter(tx => tx.type === 'service') as ServiceTransaction[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ClipboardList className="mr-2 h-6 w-6" /> Manage Services
        </CardTitle>
        <CardDescription>View and update progress for all service transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        {serviceTransactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No service transactions recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Service ID</TableHead>
                <TableHead>Service Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{tx.id.substring(0,8)}</TableCell>
                  <TableCell>{tx.serviceName}</TableCell>
                  <TableCell>{tx.customerName || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getServiceStatusLabel(tx.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button asChild variant="outline" size="sm">
                      <Link href={`/service-status/${tx.id}`}>
                        <Eye className="mr-1 h-4 w-4" /> View Status
                      </Link>
                    </Button>
                    <Button asChild variant="default" size="sm">
                      <Link href={`/admin/service-management/${tx.id}`}>
                        <Settings className="mr-1 h-4 w-4" /> Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
