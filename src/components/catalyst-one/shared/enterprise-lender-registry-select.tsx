"use client";

/**
 * Enterprise Lender Registry select — server-side search over full ELR.
 * CO-LENDER-SSOT-REMEDIATE-001: no Soft Go-Live, no pageSize-200 / max-8 caps.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import {
  ELR_SELECTION_DROPDOWN_LIST_CLASS,
} from "@/constants/enterprise-lender-registry/selection";
import {
  ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS,
} from "@/constants/enterprise-search-autocomplete";
import {
  getEnterpriseLenderForSelection,
  lenderDisplayName,
  searchEnterpriseLendersForSelection,
} from "@/lib/enterprise-lender-registry/selection-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

export type EnterpriseLenderRegistryOption = {
  id: string;
  name: string;
};

interface EnterpriseLenderRegistrySelectProps {
  value?: string;
  /** Fallback label when value is set but lenders list has not resolved yet. */
  selectedName?: string;
  onSelect: (lender: EnterpriseLenderRegistryOption) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Optional override for result list height. */
  listMaxHeightClassName?: string;
}

export function EnterpriseLenderRegistrySelect({
  value,
  selectedName,
  onSelect,
  placeholder = "Search Enterprise Lender Registry…",
  className,
  inputClassName,
  listMaxHeightClassName,
}: EnterpriseLenderRegistrySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);
  const [resolvedLabel, setResolvedLabel] = useState<string | undefined>(selectedName);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setResolvedLabel(selectedName);
  }, [selectedName, value]);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getEnterpriseLenderForSelection(value);
        if (cancelled || !row) return;
        setResolvedLabel(lenderDisplayName(row));
      } catch {
        /* keep selectedName fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const result = await searchEnterpriseLendersForSelection({
            search: query.trim() || undefined,
          });
          if (cancelled) return;
          setLenders(result.items);
          setError(null);
        } catch (err) {
          if (cancelled) return;
          setLenders([]);
          setError(
            err instanceof Error
              ? err.message
              : "Enterprise Lender Registry unavailable.",
          );
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, query.trim() ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, reloadKey]);

  const selectedFromList = useMemo(
    () => (value ? lenders.find((l) => l.id === value) : undefined),
    [lenders, value],
  );
  const selectedLabel =
    (selectedFromList ? lenderDisplayName(selectedFromList) : undefined) ||
    resolvedLabel?.trim() ||
    undefined;

  const searching = open || query.trim().length > 0;
  const displayValue = searching ? query : selectedLabel ?? "";

  const closeList = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeList();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeList();
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
    <div ref={rootRef} className={cn("relative z-10 space-y-1", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn("h-8 pr-8 text-xs", inputClassName)}
          placeholder={loading ? "Loading lenders…" : placeholder}
          value={displayValue}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className={cn(ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS, "z-[60]")}
        >
          {error ? (
            <div className="space-y-2 p-3 text-xs">
              <p className="text-destructive">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : (
            <ul
              className={cn(
                listMaxHeightClassName ?? ELR_SELECTION_DROPDOWN_LIST_CLASS,
                "py-1",
              )}
            >
              {loading && lenders.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  Searching Enterprise Lender Registry…
                </li>
              ) : null}
              {!loading && lenders.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  {query.trim()
                    ? "No matching lender in Enterprise Lender Registry."
                    : "No active lenders in Enterprise Lender Registry."}
                </li>
              ) : null}
              {lenders.map((lender) => {
                const name = lenderDisplayName(lender);
                const selected = value === lender.id;
                return (
                  <li key={lender.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent/60 text-accent-foreground",
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelect({ id: lender.id, name });
                        setResolvedLabel(name);
                        closeList();
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                      {lender.code ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {lender.code}
                        </span>
                      ) : null}
                      {selected ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!error && lenders.length > 0 ? (
            <p className="border-t border-border px-3 py-1 text-[10px] text-muted-foreground">
              {lenders.length} lender{lenders.length === 1 ? "" : "s"} · Enterprise Lender Registry
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
