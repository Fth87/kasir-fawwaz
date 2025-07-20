// components/ui/data-table.tsx

'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type PaginationState } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Filter } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from './date-range-picker';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: { name?: string; dateRange?: DateRange }) => void;
  isLoading: boolean;
  refreshTrigger: number;
}

export function DataTable<TData, TValue>({ columns, data, pageCount, fetchData, isLoading, refreshTrigger }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [nameFilter, setNameFilter] = useState('');
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Panggil fetchData setiap kali ada perubahan
  useEffect(() => {
    fetchData(pagination, sorting, { name: debouncedNameFilter, dateRange: dateRange });
  }, [pagination, sorting, debouncedNameFilter, fetchData, dateRange, refreshTrigger]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
    },
  });

  // Reset ke halaman pertama saat filter berubah
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [debouncedNameFilter, dateRange]);

  // Clear filters
  const clearFilters = () => {
    setNameFilter('');
    setDateRange(undefined);
  };

  const hasActiveFilters = nameFilter || dateRange;

  return (
    <div className="space-y-4">
      {/* Filter Section - Mobile Responsive */}
      <div className="space-y-4">
        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between md:hidden">
          <h3 className="text-lg font-medium">Filter Data</h3>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
            {hasActiveFilters && <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">{[nameFilter, dateRange].filter(Boolean).length}</span>}
          </Button>
        </div>

        {/* Filter Controls */}
        <div
          className={cn(
            'space-y-3 md:space-y-0 md:flex md:items-center md:space-x-4',
            'md:block', // Always show on desktop
            showFilters ? 'block' : 'hidden md:block' // Toggle on mobile
          )}
        >
          <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
            <Input placeholder="Filter berdasarkan nama..." value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} className="w-full md:max-w-sm" />
            <div className="w-full md:w-auto">
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full" />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground">
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container - Fully Responsive */}
      <div className="relative">
        <div className="rounded-md border bg-white">
          {/* Horizontal scroll container */}
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap px-2 py-3 text-xs md:px-4 md:text-sm">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: pagination.pageSize }).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        {columns.map((_, cellIndex) => (
                          <TableCell key={`loading-cell-${cellIndex}`} className="px-2 py-3 md:px-4">
                            <div className="h-4 bg-muted animate-pulse rounded"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-2 py-3 text-xs md:px-4 md:text-sm whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground px-2 md:px-4">
                        {hasActiveFilters ? 'Tidak ada data yang cocok dengan filter.' : 'Tidak ada data.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Scroll hint for mobile */}
          <div className="md:hidden">
            <div className="flex justify-center py-2 text-xs text-muted-foreground">← Geser untuk melihat lebih banyak →</div>
          </div>
        </div>
      </div>

      {/* Pagination Controls - Mobile Responsive */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        {/* Info and Page Size Selector */}
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <div className="text-sm text-muted-foreground">
            Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount() || 1}
            {data.length > 0 && (
              <span className="ml-2">
                (Total: {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}
                dari banyak item)
              </span>
            )}
          </div>

          {/* Page Size Selector */}
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="text-sm border border-input bg-background px-3 py-1 rounded-md"
          >
            {[10, 20, 30, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center justify-center md:justify-end space-x-1">
          <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage() || isLoading} className="hidden md:flex">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || isLoading}>
            <ChevronLeft className="h-4 w-4" />
            {/* <span className="ml-1 hidden md:inline">Previous</span> */}
          </Button>

          {/* Page Numbers - Mobile: Show current, Desktop: Show range */}
          <div className="flex items-center space-x-1">
            {/* Mobile: Just show current page */}
            <div className="md:hidden bg-primary text-primary-foreground px-3 py-1 text-sm rounded">{table.getState().pagination.pageIndex + 1}</div>

            {/* Desktop: Show page numbers */}
            <div className="hidden md:flex items-center space-x-1">
              {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                const pageIndex = Math.max(0, Math.min(table.getState().pagination.pageIndex - 2 + i, table.getPageCount() - 5)) + Math.max(0, 5 - table.getPageCount());

                if (pageIndex >= table.getPageCount()) return null;

                return (
                  <Button key={pageIndex} variant={pageIndex === table.getState().pagination.pageIndex ? 'default' : 'outline'} size="sm" onClick={() => table.setPageIndex(pageIndex)} disabled={isLoading} className="w-8 h-8 p-0">
                    {pageIndex + 1}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || isLoading}>
            {/* <span className="mr-1 hidden md:inline">Next</span> */}
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage() || isLoading} className="hidden md:flex">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper untuk membuat header kolom yang bisa di-sort - Responsive
export const createSortableHeader = (column: any, title: string) => {
  return (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-auto p-0 font-medium text-left justify-start hover:bg-transparent">
      <span className="truncate">{title}</span>
      <ArrowUpDown className="ml-1 h-3 w-3 md:h-4 md:w-4 shrink-0" />
    </Button>
  );
};
