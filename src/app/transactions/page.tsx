import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';
import { getPaginatedTransactions } from './actions';
import { TransactionProvider } from '@/context/transaction-context';
import { TransactionsTable } from './transactions-table';
import type { Transaction } from '@/types';

export default async function TransactionsPage() {
  // Fetch the initial data on the server.
  const { data, pageCount, error } = await getPaginatedTransactions({
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
  });

  // Handle potential errors during server-side fetch
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <ScrollText className="mr-2 h-6 w-6" /> All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-8">Error loading transactions: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <ScrollText className="mr-2 h-6 w-6" /> All Transactions
        </CardTitle>
        <CardDescription>
          View all recorded sales, services, and expenses. You can manage service progress from here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionProvider>
          <TransactionsTable
            initialData={data ?? []}
            initialPageCount={pageCount}
          />
        </TransactionProvider>
      </CardContent>
    </Card>
  );
}
