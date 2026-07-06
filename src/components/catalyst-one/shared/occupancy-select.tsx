"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  getOccupancyLabel,
  getOccupancyOptionsForProduct,
  groupOccupancyOptions,
  searchOccupancyOptions,
  type OccupancyMasterEntry,
} from "@/constants/occupancy-master";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OccupancySelectProps {
  loanProduct: string;
  value?: string;
  onSelect: (entry: OccupancyMasterEntry) => void;
  placeholder?: string;
  className?: string;
}

/** CRC-10.3 — Searchable occupancy picker (master-driven, product-aware). */
export function OccupancySelect({
  loanProduct,
  value,
  onSelect,
  placeholder = "Search property occupancy...",
  className,
}: OccupancySelectProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchOccupancyOptions(query, loanProduct),
    [query, loanProduct],
  );
  const grouped = useMemo(() => groupOccupancyOptions(results), [results]);
  const selectedLabel = getOccupancyLabel(value);
  const showList = query.length > 0 || !value;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        className="h-8 text-xs"
        placeholder={selectedLabel ?? placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showList && (
        <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-popover shadow-sm">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No occupancy type found.</p>
          ) : query.length > 0 ? (
            results.map((entry) => (
              <OccupancyOptionButton
                key={entry.id}
                entry={entry}
                selected={value === entry.id}
                onSelect={() => {
                  onSelect(entry);
                  setQuery("");
                }}
              />
            ))
          ) : (
            grouped.map((group) => (
              <div key={group.category.id}>
                <p className="sticky top-0 bg-muted/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                  {group.category.label}
                </p>
                {group.entries.map((entry) => (
                  <OccupancyOptionButton
                    key={entry.id}
                    entry={entry}
                    selected={value === entry.id}
                    onSelect={() => {
                      onSelect(entry);
                      setQuery("");
                    }}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}
      {selectedLabel && !query && (
        <p className="text-[10px] text-muted-foreground">Selected: {selectedLabel}</p>
      )}
    </div>
  );
}

function OccupancyOptionButton({
  entry,
  selected,
  onSelect,
}: {
  entry: OccupancyMasterEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
        selected && "bg-muted/40",
      )}
    >
      <Check className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <span className="flex-1">{entry.label}</span>
    </button>
  );
}

/** Resolve options count for empty-state messaging (optional). */
export function useOccupancyOptionCount(loanProduct: string): number {
  return getOccupancyOptionsForProduct(loanProduct).length;
}
