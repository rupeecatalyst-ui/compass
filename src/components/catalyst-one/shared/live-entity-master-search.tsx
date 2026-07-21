"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  EntityMasterSearch,
  type EntityMasterOption,
} from "@/components/catalyst-one/shared/entity-master-search";
import {
  liveSearchOperationalCompanies,
  liveSearchOperationalContacts,
} from "@/lib/enterprise-registry/live-search";
import { isEnterprisePersistencePrisma } from "@/lib/enterprise-persistence";
import { cn } from "@/lib/utils";

type EntityKind = "contact" | "company";

interface LiveEntityMasterSearchProps {
  kind: EntityKind;
  placeholder?: string;
  selectedId?: string;
  selectedLabel?: string;
  /** Fallback options (memory mode / while warming). */
  fallbackOptions?: EntityMasterOption[];
  onSelect: (option: EntityMasterOption) => void;
  className?: string;
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
  allowCreateNew?: boolean;
  /** When true, re-warm from API (e.g. parent dialog opened). */
  warmOnMount?: boolean;
}

/**
 * CO-BLOCKER-001 — Picker that searches PostgreSQL directly in prisma mode.
 * Fixes Loan Journey empty pickers when session cache is stale.
 */
export function LiveEntityMasterSearch({
  kind,
  placeholder,
  selectedId,
  selectedLabel,
  fallbackOptions = [],
  onSelect,
  className,
  onCreateNew,
  createNewLabel,
  allowCreateNew = true,
  warmOnMount = false,
}: LiveEntityMasterSearchProps) {
  const registryVersion = useEcmContactRegistryVersion();
  const [query, setQuery] = useState("");
  const [liveOptions, setLiveOptions] = useState<EntityMasterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [warmed, setWarmed] = useState(!isEnterprisePersistencePrisma());
  const [searchError, setSearchError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!isEnterprisePersistencePrisma()) return;
      setLoading(true);
      setSearchError(null);
      try {
        const rows =
          kind === "contact"
            ? await liveSearchOperationalContacts(q)
            : await liveSearchOperationalCompanies(q);
        setLiveOptions(rows);
        setWarmed(true);
      } catch (err) {
        setLiveOptions([]);
        setSearchError(err instanceof Error ? err.message : "Registry search failed");
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    if (!warmOnMount || !isEnterprisePersistencePrisma()) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const rows =
          kind === "contact"
            ? await liveSearchOperationalContacts("")
            : await liveSearchOperationalCompanies("");
        if (!cancelled) {
          setLiveOptions(rows);
          setWarmed(true);
        }
      } catch (err) {
        if (!cancelled) {
          setLiveOptions([]);
          setSearchError(err instanceof Error ? err.message : "Failed to load registry");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warmOnMount, kind, registryVersion]);

  useEffect(() => {
    if (!isEnterprisePersistencePrisma()) return;
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, runSearch]);

  const options = useMemo(() => {
    if (isEnterprisePersistencePrisma()) {
      return liveOptions.length ? liveOptions : warmed ? liveOptions : fallbackOptions;
    }
    return fallbackOptions;
  }, [fallbackOptions, liveOptions, warmed]);

  if (!isEnterprisePersistencePrisma()) {
    return (
      <EntityMasterSearch
        placeholder={placeholder}
        selectedId={selectedId}
        selectedLabel={selectedLabel}
        options={fallbackOptions}
        onSelect={onSelect}
        className={className}
        onCreateNew={onCreateNew}
        createNewLabel={createNewLabel}
        allowCreateNew={allowCreateNew}
      />
    );
  }

  const showList = query.length > 0 || (warmed && options.length > 0);
  const noMatch = query.length > 0 && !loading && options.length === 0;
  const showCreate = Boolean(onCreateNew) && allowCreateNew && noMatch;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <input
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={selectedLabel ?? placeholder ?? "Search…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (!warmed) void runSearch(query);
          }}
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {!query && !warmed && !loading ? (
        <p className="text-[10px] text-muted-foreground">Loading registry…</p>
      ) : null}
      {searchError ? (
        <p className="text-[10px] text-destructive">{searchError}</p>
      ) : null}
      {showList ? (
        <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-popover shadow-sm">
          {options.length === 0 ? (
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {loading ? "Searching…" : "No matching record found."}
              </p>
              {showCreate ? (
                <button
                  type="button"
                  className="mt-1.5 flex h-8 w-full items-center gap-1.5 px-1 text-xs font-semibold text-primary"
                  onClick={() => {
                    onCreateNew?.(query.trim());
                    setQuery("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {createNewLabel ?? "Create New Contact"}
                </button>
              ) : null}
            </div>
          ) : (
            options.slice(0, 8).map((option) => (
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
                {option.sublabel ? (
                  <span className="text-muted-foreground">{option.sublabel}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
