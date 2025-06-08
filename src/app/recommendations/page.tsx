"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, BrainCircuit, Sparkles } from 'lucide-react';
import { getPriceRecommendations } from './actions';
import type { RecommendPriceAdjustmentsOutput } from '@/ai/flows/recommend-price-adjustments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const recommendationsSchema = z.object({
  expenses: z.coerce.number().min(0, "Total expenses must be non-negative"),
  salesData: z.string().min(10, "Sales data description is too short. Please provide more details."),
  currentPrices: z.string().min(10, "Current prices description is too short. Please list services and prices."),
});

type RecommendationsFormValues = z.infer<typeof recommendationsSchema>;

export default function PriceRecommendationsPage() {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<RecommendPriceAdjustmentsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RecommendationsFormValues>({
    resolver: zodResolver(recommendationsSchema),
    defaultValues: {
      expenses: 0,
      salesData: "",
      currentPrices: "",
    },
  });

  const onSubmit = async (data: RecommendationsFormValues) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    const result = await getPriceRecommendations(data);

    if ('error' in result) {
      setError(result.error);
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setRecommendations(result);
      toast({
        title: "Recommendations Generated",
        description: "AI has provided price adjustment suggestions.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Lightbulb className="mr-2 h-6 w-6" /> AI Price Recommendations
          </CardTitle>
          <CardDescription>
            Get AI-powered suggestions to optimize your service prices based on your expenses and sales data.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Expenses (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5000000" {...field} />
                    </FormControl>
                    <FormDescription>Enter total expenses for the period you want to analyze.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salesData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Data</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your sales data for the period. e.g., 'Sold 20 phone cases at IDR 50,000 each. Provided 5 screen repair services at IDR 250,000 each.'"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>Include service types, quantities sold, and revenue generated.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentPrices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Service Prices</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List your current services and their prices. e.g., 'Screen Repair: IDR 250,000. Battery Replacement: IDR 150,000. Software Update: IDR 50,000.'"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <BrainCircuit className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Get Recommendations
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-accent" /> AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">Suggested Price Adjustments:</h3>
              <p className="text-sm whitespace-pre-wrap bg-secondary p-3 rounded-md">{recommendations.recommendations}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Reasoning:</h3>
              <p className="text-sm whitespace-pre-wrap bg-secondary p-3 rounded-md">{recommendations.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
