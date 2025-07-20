"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  sales: number;
  services: number;
  expenses: number;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function MonthlyBarChart({ data }: { data: MonthlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}> 
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="sales" stackId="revenue" fill="hsl(var(--chart-1))" name="Penjualan" />
        <Bar dataKey="services" stackId="revenue" fill="hsl(var(--chart-2))" name="Servis" />
        <Bar dataKey="expenses" fill="hsl(var(--chart-4))" name="Pengeluaran" />
      </BarChart>
    </ResponsiveContainer>
  );
}