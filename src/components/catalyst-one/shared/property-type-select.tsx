"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  PROPERTY_TYPES,
  searchPropertyTypes,
  type PropertyType,
} from "@/constants/loan-stage-master";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PropertyTypeSelectProps {
  value?: string;
  onSelect: (type: PropertyType) => void;
  placeholder?: string;
  className?: string;
}

/** CRC-10.2C — Searchable property type picker for secured loan qualification. */
export function PropertyTypeSelect({
  value,
  onSelect,
  placeholder = "Search property type...",
  className,
}: PropertyTypeSelectProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchPropertyTypes(query), [query]);
  const selected = value ? PROPERTY_TYPES.find((t) => t === value) ?? value : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        className="h-8 text-xs"
        placeholder={selected ? selected : placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {(query.length > 0 || !selected) && (
        <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-popover shadow-sm">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No property type found.</p>
          ) : (
            results.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onSelect(type);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
                  value === type && "bg-muted/40",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    value === type ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1">{type}</span>
              </button>
            ))
          )}
        </div>
      )}
      {selected && !query && (
        <p className="text-[10px] text-muted-foreground">Selected: {selected}</p>
      )}
    </div>
  );
}
