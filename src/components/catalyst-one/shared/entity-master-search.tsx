"use client";

/**
 * Enterprise Search Autocomplete — platform SSOT for registry lookups.
 * Type → filtered results → select → dropdown closes → value populated.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS,
  ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS,
  ENTERPRISE_SEARCH_MAX_RESULTS,
} from "@/constants/enterprise-search-autocomplete";
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
  /**
   * When provided, parent owns live search (e.g. Prisma registry).
   * Local filter is skipped; options are treated as already filtered.
   */
  onQueryChange?: (query: string) => void;
  /** Show loading indicator in the field (live search). */
  loading?: boolean;
  /** Empty-state copy when typed query has no matches. */
  emptyLabel?: string;
}

/** Searchable master picker — Contact, Company, and other enterprise registries. */
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
  onQueryChange,
  loading = false,
  emptyLabel = "No matching Contact found.",
}: EntityMasterSearchProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (onQueryChange) {
      return options.slice(0, ENTERPRISE_SEARCH_MAX_RESULTS);
    }
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.sublabel?.toLowerCase().includes(q),
      )
      .slice(0, ENTERPRISE_SEARCH_MAX_RESULTS);
  }, [options, query, onQueryChange]);

  const trimmed = query.trim();
  const showList = open && trimmed.length > 0;
  const noMatch = showList && !loading && results.length === 0;
  const showCreate = Boolean(onCreateNew) && allowCreateNew && noMatch;

  const closeList = () => {
    setOpen(false);
    setQuery("");
  };

  const commitSelect = (option: EntityMasterOption) => {
    onSelect(option);
    closeList();
    // Keep keyboard in the form; list is closed so work continues without dismissal.
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!onQueryChange) return;
    onQueryChange(query);
  }, [query, onQueryChange]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeList();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeList();
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative space-y-1", className)}>
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-8 text-xs"
        placeholder={selectedLabel || placeholder}
        value={query}
        autoComplete="off"
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(next.trim().length > 0);
        }}
        onFocus={() => {
          if (query.trim().length > 0) setOpen(true);
        }}
      />
      {selectedLabel && !query ? (
        <p className="truncate text-[10px] text-muted-foreground">
          Selected: {selectedLabel}
        </p>
      ) : null}
      {showList ? (
        <div
          id={listId}
          role="listbox"
          className={ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS}
          data-surface="enterprise-search-autocomplete"
        >
          <div className={ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS}>
            {loading && results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground">{emptyLabel}</p>
                {showCreate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 h-8 w-full justify-start gap-1.5 px-1 text-xs font-semibold text-primary"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onCreateNew?.(trimmed);
                      closeList();
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
                  role="option"
                  aria-selected={selectedId === option.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSelect(option)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/60",
                    selectedId === option.id && "bg-muted/40",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selectedId === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.sublabel ? (
                    <span className="shrink-0 truncate text-muted-foreground">
                      {option.sublabel}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
