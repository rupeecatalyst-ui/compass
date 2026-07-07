"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EntityMasterOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface EntityMasterSearchProps {
  placeholder?: string;
  selectedId?: string;
  selectedLabel?: string;
  options: EntityMasterOption[];
  onSelect: (option: EntityMasterOption) => void;
  className?: string;
}

/** UX-03 — Searchable master picker for contacts and companies. */
export function EntityMasterSearch({
  placeholder = "Search…",
  selectedId,
  selectedLabel,
  options,
  onSelect,
  className,
}: EntityMasterSearchProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.sublabel?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [options, query]);
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
        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-sm">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No match found.</p>
          ) : (
            results.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
                  selectedId === option.id && "bg-muted/40",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    selectedId === option.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1">{option.label}</span>
                {option.sublabel && (
                  <span className="text-muted-foreground">{option.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
