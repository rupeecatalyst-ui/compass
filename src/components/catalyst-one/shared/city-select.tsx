"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { searchCities, getCityLabel, type CityMasterEntry } from "@/constants/city-master";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CitySelectProps {
  city?: string;
  state?: string;
  onSelect: (entry: CityMasterEntry) => void;
  placeholder?: string;
  className?: string;
}

/** UX-02 — Searchable city picker with automatic state population. */
export function CitySelect({
  city,
  state,
  onSelect,
  placeholder = "Search city...",
  className,
}: CitySelectProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCities(query), [query]);
  const selectedLabel = getCityLabel(city, state);
  const showList = query.length > 0;

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
            <p className="px-3 py-2 text-xs text-muted-foreground">No city found.</p>
          ) : (
            results.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  onSelect(entry);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
                  city === entry.city && state === entry.state && "bg-muted/40",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    city === entry.city && state === entry.state ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1">{entry.city}</span>
                <span className="text-muted-foreground">{entry.state}</span>
              </button>
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
