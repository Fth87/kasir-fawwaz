
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransactions } from '@/context/transaction-context';
import type { ServiceTransaction, ServiceStatusValue, ProgressNote } from '@/types';
import { ServiceStatusOptions, getServiceStatusLabel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Settings, MessageSquare, CheckCircle, Info, Clock, CircleSlash, Loader2 } from 'lucide-react';

const updateServiceSchema = z.object({
  status: z.string().min(1, "Status is required"), // Will validate against ServiceStatusValue values
  newNote: z.string().optional(),
});

type UpdateServiceFormValues = z.infer<typeof updateServiceSchema>;

export default function ManageServiceProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getTransactionById, updateServiceProgress, transactions } = useTransactions();
  const [service, setService] = useState<ServiceTransaction | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateServiceFormValues>({
    resolver: zodResolver(updateServiceSchema),
    defaultValues: {
      status: '',
      newNote: '',
    },
  });

  useEffect(() => {
    if (params.id) {
      const tx = getTransactionById(params.id as string);
      if (tx && tx.type === 'service') {
        setService(tx);
        form.reset({ status: tx.status, newNote: '' });
      } else {
        setService(null);
      }
    }
  }, [params.id, getTransactionById, transactions, form]);

  const onSubmit = async (data: UpdateServiceFormValues) => {
    if (!service) return;
    setIsLoading(true);
    try {
      const updatedService = updateServiceProgress(service.id, data.status as ServiceStatusValue, data.newNote);
      if (updatedService) {
        setService(updatedService); // Re-sync local state if needed, though context should update
        form.setValue('newNote', ''); // Clear new note field
        toast({
          title: "Service Progress Updated",
          description: `Status set to ${getServiceStatusLabel(data.status as ServiceStatusValue)}. Note added if provided.`,
        });
      } else {
        throw new Error("Failed to update service progress in context.");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service progress. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating service:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusIcon = (statusInput: ServiceTransaction['status'] | undefined) => {
    // Guard against undefined or non-string status
    if (typeof statusInput !== 'string') {
      return <Info className="h-5 w-5 text-blue-500" />; // Default icon
    }
    if (statusInput.startsWith('COMPLETED')) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (statusInput === 'CANCELLED') return <CircleSlash className="h-5 w-5 text-red-500" />;
    if (statusInput === 'AWAITING_PARTS' || statusInput.includes('DIAGNOSIS') || statusInput.includes('REPAIR')) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  }


  if (service === undefined) {
    return <div className="flex justify-center items-center h-64">Loading service details...</div>;
  }

  if (!service) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-4">Service Not Found</h2>
        <p className="text-muted-foreground mb-6">The service record you are trying to manage does not exist or is invalid.</p>
        <Button onClick={() => router.push('/transactions')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Transactions
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              <div>
                <CardTitle className="text-2xl font-headline">Manage Service Progress</CardTitle>
                <CardDescription>Update status and add notes for Service ID: {service.id.substring(0, 8)}</CardDescription>
              </div>
            </div>
             <Button variant="outline" size="sm" onClick={() => router.push(`/service-status/${service.id}`)} className="print:hidden">
                View Customer Page
            </Button>
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Service Name</p>
                  <p className="font-semibold">{service.serviceName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">{service.customerName || 'N/A'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-md font-semibold flex items-center">
                  {getStatusIcon(service.status)} <span className="ml-2">Current Status: {getServiceStatusLabel(service.status)}</span>
                </p>
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Update Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a new status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ServiceStatusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add New Progress Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Sparepart arrived, starting repair." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                Update Progress
              </Button>
            </CardFooter>
          </form>
        </Form>

        {service.progressNotes && service.progressNotes.length > 0 && (
          <CardContent className="mt-6 border-t pt-6">
            <h3 className="text-md font-semibold mb-3 text-muted-foreground">Progress History</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {service.progressNotes.slice().reverse().map((note) => (
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
          </CardContent>
        )}
      </Card>
    </div>
  );
}
