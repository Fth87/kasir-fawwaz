// components/ui/data-table.tsx

'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type PaginationState, type Column } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  fetchData: (pagination: PaginationState, sorting: SortingState, filters: Record<string, any>) => void;
  isLoading: boolean;
  refreshTrigger: number;
  filters: Record<string, any>;
  children?: React.ReactNode; // To allow passing filter components
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  fetchData,
  isLoading,
  refreshTrigger,
  filters,
  children
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Panggil fetchData setiap kali ada perubahan
  useEffect(() => {
    fetchData(pagination, sorting, filters);
  }, [pagination, sorting, fetchData, refreshTrigger, filters]);

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
  }, [filters, pagination.pageIndex]);


  return (
    <div className="space-y-4">
        {/* Filter Section */}
        {children && <div className="space-y-4">{children}</div>}

      {/* Table Container */}
      <div className="relative">
        <div className="rounded-md border bg-white">
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
                        Tidak ada data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <div className="text-sm text-muted-foreground">
            Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount() || 1}
          </div>
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
        <div className="flex items-center justify-center md:justify-end space-x-1">
          <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage() || isLoading} className="hidden md:flex">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || isLoading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || isLoading}>
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

// Helper untuk membuat header kolom yang bisa di-sort
export const createSortableHeader = <TData,>(column: Column<TData, unknown>, title: string) => {
  return (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-auto p-0 font-medium text-left justify-start hover:bg-transparent">
      <span className="truncate">{title}</span>
      <ArrowUpDown className="ml-1 h-3 w-3 md:h-4 md:w-4 shrink-0" />
    </Button>
  );
};
