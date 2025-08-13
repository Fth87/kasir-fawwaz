'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ChevronsUpDown, PlusCircle, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/stores/inventory.store';

// UI Components
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Tipe untuk props komponen
interface InventoryComboboxProps {
  value: string;
  onSelect: (item: { name: string; price: number }) => void;
  isLoading?: boolean;
}

// Skema validasi untuk form tambah barang baru di dalam dialog
const newItemSchema = z.object({
  name: z.string().min(1, 'Nama barang harus diisi'),
  sellingPrice: z.coerce.number().min(0, 'Harga jual harus diisi'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli harus diisi'),
  stockQuantity: z.coerce.number().int().min(0, 'Stok awal harus diisi'),
  sku: z.string().optional(),
});
type NewItemFormValues = z.infer<typeof newItemSchema>;

export function InventoryCombobox({ value, onSelect, isLoading = false }: InventoryComboboxProps) {
  const { inventoryItems, addInventoryItem } = useInventoryStore();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const form = useForm<NewItemFormValues>({
    resolver: zodResolver(newItemSchema),
    defaultValues: { name: '', sellingPrice: 0, purchasePrice: 0, stockQuantity: 0, sku: '' },
  });

  // Isi form dialog dengan nama dari hasil pencarian
  React.useEffect(() => {
    if (dialogOpen) {
      form.setValue('name', searchQuery);
    }
  }, [dialogOpen, searchQuery, form]);

  // Handler untuk menambah barang baru dari dalam dialog
  const handleAddNewItem = async (data: NewItemFormValues) => {
    const { success, error } = await addInventoryItem(data);
    if (success) {
      toast({
        title: 'Barang Ditambahkan',
        description: `Barang "${data.name}" berhasil ditambahkan ke inventaris.`,
      });
      // Otomatis pilih barang yang baru dibuat menggunakan data dari form
      onSelect({ name: data.name, price: data.sellingPrice });
      setDialogOpen(false);
      setOpen(false);
      form.reset();
      setSearchQuery('');
    } else {
      toast({
        title: 'Gagal Menambahkan Barang',
        description: error?.message || 'Terjadi kesalahan.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <div className="flex items-center truncate">
              <Package className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{value || 'Pilih atau tambah barang...'}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder="Ketik nama barang..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              {isLoading ? (
                <div className="p-2 flex justify-center items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
                </div>
              ) : (
                <>
                  <CommandEmpty className="p-1">
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-left h-auto py-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <div>
                          <p>Tambah Barang Baru:</p>
                          <p className="font-semibold">{searchQuery}</p>
                        </div>
                      </Button>
                    </DialogTrigger>
                  </CommandEmpty>
                  <CommandGroup>
                    {inventoryItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.name}
                        onSelect={() => {
                          onSelect({ name: item.name, price: item.sellingPrice });
                          setOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', value === item.name ? 'opacity-100' : 'opacity-0')} />
                        {item.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog untuk menambah barang baru */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Barang Baru ke Inventaris</DialogTitle>
          <DialogDescription>Isi detail lengkap untuk barang baru.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddNewItem)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Barang</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stockQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stok Awal</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Jual (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Opsional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">
                {' '}
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah ke Inventaris{' '}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
