import { getAllTransactions } from '@/app/transactions/actions';
import { ReportsClientBoundary } from './components/reports-client-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default async function ReportsPage() {
  // Fetch data on the server
  const { data: transactions, error } = await getAllTransactions();

  // Handle potential errors during server-side fetch
  if (error || !transactions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BarChart3 className="mr-2 h-6 w-6" /> Laporan Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-8">
            Error loading report data: {error || 'No transactions found.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render the client component with the initial data
  return <ReportsClientBoundary initialTransactions={transactions} />;
}