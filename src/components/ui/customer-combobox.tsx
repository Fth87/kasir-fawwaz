'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ChevronsUpDown, PlusCircle, Loader2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerStore } from '@/stores/customer.store';

// UI Components
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

// Tipe untuk props komponen
interface CustomerComboboxProps {
  value: { id?: string; name: string };
  onChange: (value: { id: string; name: string }) => void;
  isLoading?: boolean;
}

// Skema validasi untuk form tambah pelanggan baru di dalam dialog
const newCustomerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan harus diisi'),
  phone: z.string().optional(),
});
type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export function CustomerCombobox({ value, onChange, isLoading = false }: CustomerComboboxProps) {
  const { customers, addCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // State untuk input pencarian langsung
  const [searchQuery, setSearchQuery] = React.useState('');
  // State untuk nilai yang sudah di-debounce
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const form = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { name: '', phone: '' },
  });

  // Isi form dialog dengan nama dari hasil pencarian
  React.useEffect(() => {
    if (dialogOpen) {
      form.setValue('name', searchQuery);
    }
  }, [dialogOpen, searchQuery, form]);

  // Handler untuk menambah pelanggan baru dari dalam dialog
  const handleAddNewCustomer = async (data: NewCustomerFormValues) => {
    const { customer: newCustomer, error } = await addCustomer(data);
    if (newCustomer && !error) {
      toast({
        title: 'Pelanggan Ditambahkan',
        description: `Pelanggan "${newCustomer.name}" berhasil dibuat.`,
      });
      // Otomatis pilih pelanggan yang baru dibuat
      onChange({ id: newCustomer.id, name: newCustomer.name });
      setDialogOpen(false);
      setOpen(false);
      form.reset();
      form.clearErrors();
      setSearchQuery('');
    } else {
      toast({
        title: 'Gagal Menambahkan Pelanggan',
        description: error?.message || 'Terjadi kesalahan.',
        variant: 'destructive',
      });
    }
  };

  const selectedCustomerName = customers.find((c) => c.id === value?.id)?.name || value?.name;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
            <div className="flex items-center truncate">
              <UserCircle className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{selectedCustomerName || 'Pilih atau tambah pelanggan...'}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Ketik nama pelanggan..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              {isLoading ? (
                <div className="p-2 flex justify-center items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
                </div>
              ) : (
                <>
                  <CommandEmpty className="p-1">
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" className="w-full justify-start text-left h-auto py-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <div>
                          <p>Tambah Pelanggan Baru </p>
                          <p className="font-semibold">{searchQuery}</p>
                        </div>
                      </Button>
                    </DialogTrigger>
                  </CommandEmpty>

                  {/* Tampilkan daftar HANYA jika pengguna sudah mengetik */}
                  {debouncedSearchQuery && (
                    <CommandGroup>
                      {customers
                        .filter((c) => c.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
                        .map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              onChange({ id: customer.id, name: customer.name });
                              setOpen(false);
                              setSearchQuery('');
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', value?.id === customer.id ? 'opacity-100' : 'opacity-0')} />
                            {customer.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog untuk menambah pelanggan baru */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
          <DialogDescription>Isi detail untuk pelanggan baru. Detail lain bisa diubah nanti.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddNewCustomer)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pelanggan</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No. Telepon (Opsional)</FormLabel>
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
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
