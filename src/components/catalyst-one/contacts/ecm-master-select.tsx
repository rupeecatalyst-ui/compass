"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  getEcmMasterLabel,
  listEcmMasterOptions,
  type EcmMasterDomain,
  type EcmMasterOption,
} from "@/constants/enterprise-contact-master";
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

interface EcmMasterSelectProps {
  domain: EcmMasterDomain;
  value: string;
  onChange: (id: string, option?: EcmMasterOption) => void;
  parentId?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Searchable master-data dropdown — no free text for enterprise catalogs. */
export function EcmMasterSelect({
  domain,
  value,
  onChange,
  parentId,
  placeholder = "Select…",
  searchPlaceholder = "Search master list…",
  disabled,
  className,
}: EcmMasterSelectProps) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => listEcmMasterOptions(domain, parentId), [domain, parentId]);
  const label = value ? getEcmMasterLabel(domain, value) || value : "";
  const needsParent = domain === "occupation" && !parentId;
  const emptyHint =
    needsParent
      ? "Select Employment Type first."
      : "No match in master list.";

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled || needsParent}
        className="h-10 w-full justify-between rounded-xl px-3 text-sm font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>
          {label || (needsParent ? "Select Employment Type first" : placeholder)}
        </span>
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open && !needsParent && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            <Command className="bg-popover">
              <CommandInput placeholder={searchPlaceholder} className="h-9 text-sm" />
              <CommandList>
                <CommandEmpty className="py-3 text-xs">{emptyHint}</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={opt.label}
                      className="text-sm"
                      onSelect={() => {
                        onChange(opt.id, opt);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          value === opt.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {opt.label}
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
