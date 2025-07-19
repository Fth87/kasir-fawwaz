import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function PeriodRecap({ recap }: { recap: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <RecapCard title="Total Pendapatan" value={recap.totalRevenue} icon={DollarSign} />
      <RecapCard title="Pendapatan (Jual)" value={recap.totalSales} icon={TrendingUp} iconColor="text-green-500" />
      <RecapCard title="Pendapatan (Servis)" value={recap.totalServices} icon={TrendingUp} iconColor="text-green-500" />
      <RecapCard title="Total Pengeluaran" value={recap.totalExpenses} icon={TrendingDown} iconColor="text-red-500" />
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Keuntungan Bersih</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${recap.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(recap.profit)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecapCard({ title, value, icon: Icon, iconColor = "text-muted-foreground" }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}