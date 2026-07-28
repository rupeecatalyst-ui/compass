"use client";

/**
 * CO-WP-001 — Enterprise Wealth Partner Registry (list + filters).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  WEALTH_PARTNER_REGISTRY_FILTERS,
  buildWealthPartnerWorkspaceHref,
  wealthPartnerTypeLabel,
} from "@/constants/enterprise-wealth-partner-registry";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import type { EnterpriseWealthPartnerRecord } from "@/types/enterprise-wealth-partner-registry";
import { CreateWealthPartnerWizard } from "./create-wealth-partner-wizard";
import { cn } from "@/lib/utils";

export function WealthPartnerRegistryView() {
  const [items, setItems] = useState<EnterpriseWealthPartnerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partnerType, setPartnerType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await wealthPartnerApiClient.queryPartners({
        page: 1,
        pageSize: 100,
        search: search.trim() || undefined,
        partnerType,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, partnerType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Search partners…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => void refresh()}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button type="button" size="sm" className="h-9 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create Wealth Partner
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {WEALTH_PARTNER_REGISTRY_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setPartnerType(f.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              partnerType === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {loading ? "Loading…" : `${total} Wealth Partner${total === 1 ? "" : "s"}`}
      </p>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Identity</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No Wealth Partners yet. Create one from an existing Contact or Company.
                </td>
              </tr>
            ) : null}
            {items.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link
                    href={buildWealthPartnerWorkspaceHref(row.id)}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {row.code}
                  </Link>
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link href={buildWealthPartnerWorkspaceHref(row.id)} className="hover:underline">
                    {row.displayName}
                  </Link>
                </td>
                <td className="px-3 py-2">{wealthPartnerTypeLabel(row.partnerType)}</td>
                <td className="px-3 py-2 capitalize text-muted-foreground">
                  {row.identityKind}
                  {row.identityLabel ? ` · ${row.identityLabel}` : ""}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className="capitalize">
                    {row.lifecycleStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateWealthPartnerWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void refresh()}
      />
    </div>
  );
}
