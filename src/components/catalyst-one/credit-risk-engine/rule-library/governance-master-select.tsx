"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface GovernanceMasterSelectProps<T extends string> {
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

/** Searchable governance master dropdown — Rule Owner, Review Cycle, etc. */
export function GovernanceMasterSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No match found.",
}: GovernanceMasterSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () => (Object.entries(options) as [T, string][]).sort((a, b) => a[1].localeCompare(b[1])),
    [options],
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="h-8 w-full justify-between px-2 text-xs font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{options[value] ?? placeholder}</span>
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            <Command className="bg-popover">
              <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty className="py-3 text-xs">{emptyLabel}</CommandEmpty>
                <CommandGroup>
                  {entries.map(([id, label]) => (
                    <CommandItem
                      key={id}
                      value={label}
                      className="text-xs"
                      onSelect={() => {
                        onChange(id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-3.5 w-3.5", value === id ? "opacity-100" : "opacity-0")} />
                      {label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </>
      )}
    </div>
  );
}
