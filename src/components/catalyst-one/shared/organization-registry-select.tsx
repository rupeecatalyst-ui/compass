"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useEnterpriseCompanies } from "@/hooks/use-enterprise-registry";
import {
  findOperationalCompanyById,
  liveSearchOperationalCompanies,
} from "@/lib/enterprise-registry";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** BT institution / lending organization — ECM company SSOT. */
export interface OrganizationRegistryEntry {
  id: string;
  name: string;
  type: string;
}

interface OrganizationRegistrySelectProps {
  value?: string;
  onSelect: (org: OrganizationRegistryEntry) => void;
  placeholder?: string;
  className?: string;
}

/** Searchable institution picker — live Enterprise Company Registry (SSOT). */
export function OrganizationRegistrySelect({
  value,
  onSelect,
  placeholder = "Search institution...",
  className,
}: OrganizationRegistrySelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrganizationRegistryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { registryVersion } = useEnterpriseCompanies({ hydrateOnMount: true });

  const selected = useMemo(() => {
    void registryVersion;
    const row = value ? findOperationalCompanyById(value) : undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.companyName,
      type: row.constitution?.toUpperCase() ?? "COMPANY",
    };
  }, [value, registryVersion]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void (async () => {
        try {
          const rows = await liveSearchOperationalCompanies(q, { pageSize: 25 });
          if (cancelled) return;
          setResults(
            rows.map((c) => ({
              id: c.id,
              name: c.label,
              type: c.constitution ?? "COMPANY",
            })),
          );
        } catch (e) {
          if (!cancelled) {
            setResults([]);
            setSearchError(
              e instanceof Error ? e.message : "Company Registry search failed.",
            );
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, registryVersion]);

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
          {searchError ? (
            <p className="px-3 py-2 text-xs text-destructive">{searchError}</p>
          ) : searching ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Searching Enterprise Company Registry…
            </p>
          ) : results.length === 0 ? (
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
                {value === org.id ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <span className="w-3.5" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{org.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {org.type}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
