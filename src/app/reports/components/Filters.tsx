"use client";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { id as LocaleID } from 'date-fns/locale';
import type { TransactionTypeFilter } from '@/types';

interface ReportFiltersProps {
  dateRange: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  transactionType: TransactionTypeFilter;
  onTypeChange: (type: TransactionTypeFilter) => void;
}

export function ReportFilters({ dateRange, onDateChange, transactionType, onTypeChange }: ReportFiltersProps) {
  const selectedDateRangeLabel = () => {
    if (dateRange?.from && dateRange?.to) {
      if (format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
        return format(dateRange.from, 'dd MMMM yyyy', { locale: LocaleID });
      }
      return `${format(dateRange.from, 'dd MMM yyyy', { locale: LocaleID })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: LocaleID })}`;
    }
    return 'Pilih Rentang Tanggal';
  };
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center border p-4 rounded-lg bg-secondary/30">
      <Filter className="h-5 w-5 text-muted-foreground hidden sm:block"/>
      <Popover>
        <PopoverTrigger asChild>
          <Button id="date" variant="outline" className="w-full sm:w-[260px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDateRangeLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <div className="w-full sm:w-auto">
        <Select value={transactionType} onValueChange={(value) => onTypeChange(value as TransactionTypeFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipe Transaksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="sale">Penjualan</SelectItem>
            <SelectItem value="service">Servis</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}