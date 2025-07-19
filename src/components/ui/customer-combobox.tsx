// components/ui/customer-combobox.tsx

"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCustomers } from "@/context/customer-context"; // Asumsi Anda sudah punya ini

interface CustomerComboboxProps {
  value: { id: string; name: string };
  onChange: (value: { id: string; name: string }) => void;
}

export function CustomerCombobox({ value, onChange }: CustomerComboboxProps) {
  const { customers, addCustomer } = useCustomers();
  const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

  const handleAddNewCustomer = async () => {
    if (!search.trim()) return;
    
    // Panggil addCustomer dan tunggu hasilnya (objek Customer baru atau null)
    const newCustomer = await addCustomer({ name: search.trim() });
    
    // Jika berhasil (newCustomer bukan null)
    if (newCustomer) {
      // Langsung panggil onChange dengan ID dan nama dari pelanggan baru
      onChange({ id: newCustomer.id, name: newCustomer.name });
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value.id ? customers.find((c) => c.id === value.id)?.name : value.name || "Pilih atau tambah pelanggan..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Cari atau ketik nama baru..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
                <Button variant="ghost" className="w-full justify-start p-2 h-auto" onClick={handleAddNewCustomer}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah <span className="font-semibold ml-1">"{search}"</span> sebagai pelanggan baru
                </Button>
            </CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.name}
                  onSelect={() => {
                    onChange({ id: customer.id, name: customer.name });
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value?.id === customer.id ? "opacity-100" : "opacity-0")} />
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}