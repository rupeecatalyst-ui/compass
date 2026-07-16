"use client";

import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  /**
   * Progressive Contact Creation — shown when search has no match.
   * Receives the current query so the create modal can prefill the name.
   */
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
  /** Restrict create CTA to individuals (hide for company search). */
  allowCreateNew?: boolean;
}

/** UX-03 — Searchable master picker for contacts and companies. */
export function EntityMasterSearch({
  placeholder = "Search…",
  selectedId,
  selectedLabel,
  options,
  onSelect,
  className,
  onCreateNew,
  createNewLabel = "Create New Contact",
  allowCreateNew = true,
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
  const noMatch = showList && results.length === 0;
  const showCreate = Boolean(onCreateNew) && allowCreateNew && noMatch;

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
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">No matching Contact found.</p>
              {showCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 h-8 w-full justify-start gap-1.5 px-1 text-xs font-semibold text-primary"
                  onClick={() => {
                    onCreateNew?.(query.trim());
                    setQuery("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {createNewLabel}
                </Button>
              ) : null}
            </div>
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
