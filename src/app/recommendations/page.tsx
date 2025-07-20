'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, BrainCircuit, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generatePriceRecommendations } from './actions'; // Import action yang baru

interface Recommendation {
  recommendations: string;
  reasoning: string;
}

export default function PriceRecommendationsPage() {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useState('last30days');

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('period', period);

    startTransition(async () => {
      setError(null);
      setRecommendations(null);
      const result = await generatePriceRecommendations(formData);

      if (result.error) {
        setError(result.error);
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else if (result.data) {
        setRecommendations(result.data);
        toast({ title: 'Rekomendasi Dihasilkan', description: 'AI telah memberikan saran penyesuaian harga.' });
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Lightbulb className="mr-3 h-7 w-7" /> Rekomendasi Harga AI
          </CardTitle>
          <CardDescription>Dapatkan saran cerdas untuk mengoptimalkan harga jual berdasarkan data transaksi dan inventaris Anda secara otomatis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label htmlFor="period-select" className="text-sm font-medium">
              Analisis Data dari Periode
            </label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period-select">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">7 Hari Terakhir</SelectItem>
                <SelectItem value="last30days">30 Hari Terakhir</SelectItem>
                <SelectItem value="last90days">90 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} className="w-full" disabled={isPending}>
            {isPending ? <BrainCircuit className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Dapatkan Rekomendasi
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-headline flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-accent" /> Hasil Analisis AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Saran Penyesuaian Harga:</h3>
              <div className="text-sm whitespace-pre-wrap bg-secondary p-4 rounded-md font-mono">{recommendations.recommendations}</div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Alasan:</h3>
              <div className="text-sm whitespace-pre-wrap bg-secondary p-4 rounded-md">{recommendations.reasoning}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
