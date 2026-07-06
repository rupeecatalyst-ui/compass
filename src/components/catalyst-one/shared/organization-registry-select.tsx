"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  ORGANIZATION_REGISTRY,
  searchOrganizationRegistry,
  type OrganizationRegistryEntry,
} from "@/data/catalyst-one/organization-registry-seed";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OrganizationRegistrySelectProps {
  value?: string;
  onSelect: (org: OrganizationRegistryEntry) => void;
  placeholder?: string;
  className?: string;
}

/** CRC-019 — Searchable BT institution picker (Organization Registry). */
export function OrganizationRegistrySelect({
  value,
  onSelect,
  placeholder = "Search institution...",
  className,
}: OrganizationRegistrySelectProps) {
  const [query, setQuery] = useState("");

  const selected = ORGANIZATION_REGISTRY.find((o) => o.id === value);
  const results = useMemo(() => searchOrganizationRegistry(query), [query]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        className="h-8 text-xs"
        placeholder={selected ? selected.name : placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.length > 0 && (
        <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-popover shadow-sm">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No institution found.</p>
          ) : (
            results.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => {
                  onSelect(org);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
                  value === org.id && "bg-muted/40",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    value === org.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1">{org.name}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{org.type}</span>
              </button>
            ))
          )}
        </div>
      )}
      {selected && !query && (
        <p className="text-[10px] text-muted-foreground">
          Selected: {selected.name} ({selected.type})
        </p>
      )}
    </div>
  );
}
