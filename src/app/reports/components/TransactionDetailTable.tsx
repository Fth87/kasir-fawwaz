import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/types';
import { format, parseISO } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function TransactionDetailTable({ transactions }: { transactions: Transaction[] }) {
  const getTransactionSummary = (tx: Transaction) => {
    if (tx.type === 'sale') return `Penjualan: ${tx.items.length} barang`;
    if (tx.type === 'service') {
      const partsInfo = tx.partsCost ? ` (Biaya Barang: ${formatCurrency(tx.partsCost)})` : '';
      return `Servis: ${tx.serviceName}${partsInfo}`;
    }
    if (tx.type === 'expense') return `Pengeluaran: ${tx.description}`;
    return 'Unknown';
  };

  const getTransactionAmount = (tx: Transaction) => {
    if (tx.type === 'sale') return tx.grandTotal;
    if (tx.type === 'service') return tx.serviceFee - (tx.partsCost || 0);
    if (tx.type === 'expense') return -tx.amount;
    return 0;
  };

  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Tidak ada transaksi yang cocok dengan filter Anda.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal</TableHead>
          <TableHead>Tipe</TableHead>
          <TableHead>Deskripsi</TableHead>
          <TableHead className="text-right">Jumlah</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map(tx => (
          <TableRow key={tx.id}>
            <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy HH:mm', { locale: LocaleID })}</TableCell>
            <TableCell>
               <Badge variant={tx.type === 'expense' ? 'destructive' : tx.type === 'sale' ? 'default' : 'secondary'} className="capitalize">{tx.type}</Badge>
            </TableCell>
            <TableCell>{getTransactionSummary(tx)}</TableCell>
            {(() => {
              const amount = getTransactionAmount(tx);
              const isNegative = amount < 0;
              return (
                <TableCell className={`text-right font-medium ${isNegative ? 'text-destructive' : 'text-green-600'}`}>
                  {isNegative ? '-' : '+'}
                  {formatCurrency(Math.abs(amount))}
                </TableCell>
              );
            })()}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}