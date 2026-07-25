"use client";

/**
 * Enterprise Lender Registry select — active lenders only.
 * SSOT: lenderRegistryClient /api/lender-registry (no hardcoded names).
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import {
  ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS,
  ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS,
  ENTERPRISE_SEARCH_MAX_RESULTS,
} from "@/constants/enterprise-search-autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

export type EnterpriseLenderRegistryOption = {
  id: string;
  name: string;
};

function lenderDisplayName(lender: EnterpriseLenderRecord): string {
  return (
    lender.displayName?.trim() ||
    lender.legalName?.trim() ||
    lender.label?.trim() ||
    lender.shortName?.trim() ||
    lender.code
  );
}

interface EnterpriseLenderRegistrySelectProps {
  value?: string;
  /** Fallback label when value is set but lenders list has not resolved yet. */
  selectedName?: string;
  onSelect: (lender: EnterpriseLenderRegistryOption) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Optional override for result list height (default: enterprise max-h-40). */
  listMaxHeightClassName?: string;
}

export function EnterpriseLenderRegistrySelect({
  value,
  selectedName,
  onSelect,
  placeholder = "Search existing lender…",
  className,
  inputClassName,
  listMaxHeightClassName,
}: EnterpriseLenderRegistrySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await lenderRegistryClient.queryLenders({
          page: 1,
          pageSize: 200,
          status: "active",
          enabled: true,
          lifecycleStatus: "active",
        });
        if (cancelled) return;
        setLenders(result.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load lenders");
          setLenders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFromList = useMemo(
    () => (value ? lenders.find((l) => l.id === value) : undefined),
    [lenders, value],
  );
  const selectedLabel =
    (selectedFromList ? lenderDisplayName(selectedFromList) : undefined) ||
    selectedName?.trim() ||
    undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = lenders.filter((l) => !l.isDeleted && l.enabled && l.status === "active");
    if (!q) return active.slice(0, ENTERPRISE_SEARCH_MAX_RESULTS * 3);
    return active
      .filter((l) => {
        const hay = [
          l.label,
          l.displayName,
          l.legalName,
          l.shortName,
          l.code,
          ...(l.aliases ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, ENTERPRISE_SEARCH_MAX_RESULTS);
  }, [lenders, query]);

  const searching = open || query.trim().length > 0;
  /** Open on focus so changing an existing selection needs minimal typing/mouse travel. */
  const showList = open;
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
          aria-expanded={showList}
          aria-controls={listId}
          className={cn("h-8 pr-8 text-xs", inputClassName)}
          placeholder={loading ? "Loading lenders…" : placeholder}
          value={displayValue}
          autoComplete="off"
          disabled={loading && lenders.length === 0}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
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
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      {showList ? (
        <div
          id={listId}
          role="listbox"
          className={cn(ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS, "z-[80]")}
          data-surface="enterprise-search-autocomplete"
        >
          <div
            className={cn(
              ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS,
              listMaxHeightClassName,
            )}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {loading ? "Loading active lenders…" : "No active lender found."}
              </p>
            ) : (
              filtered.map((lender) => {
                const name = lenderDisplayName(lender);
                return (
                  <button
                    key={lender.id}
                    type="button"
                    role="option"
                    aria-selected={value === lender.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect({ id: lender.id, name });
                      closeList();
                      window.requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60",
                      value === lender.id && "bg-muted/40",
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        value === lender.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 break-words leading-snug">{name}</span>
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {lender.code}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
