"use client";

/**
 * CO-WP-001 / CO-WP-006 — Enterprise Wealth Partner Registry (list + filters).
 * CO-UX-016 — dense fill layout inside EnterpriseRegistryWorkspaceShell.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  WEALTH_PARTNER_REGISTRY_FILTERS,
  buildWealthPartnerWorkspaceHref,
  wealthPartnerTypeLabel,
} from "@/constants/enterprise-wealth-partner-registry";
import { WEALTH_PARTNER_ONBOARD_COPY } from "@/constants/enterprise-identity-model";
import { formatEnterpriseRegistryCounter } from "@/constants/enterprise-registry-workspace";
import { ENTERPRISE_REGISTRY_ACTION_BTN_CLASS } from "@/constants/enterprise-registry-workspace";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import type {
  EnterpriseWealthPartnerRecord,
  ExistingWealthPartnerSummary,
} from "@/types/enterprise-wealth-partner-registry";
import { CreateWealthPartnerWizard } from "./create-wealth-partner-wizard";
import { cn } from "@/lib/utils";

export function WealthPartnerRegistryView() {
  const [items, setItems] = useState<EnterpriseWealthPartnerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partnerType, setPartnerType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

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
      setListError(null);
    } catch (err) {
      setItems([]);
      setTotal(0);
      const message =
        err instanceof Error ? err.message : "Unable to load Wealth Partner Registry.";
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search, partnerType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleCreated() {
    setPartnerType("all");
    setSearch("");
    setHighlightId(null);
  }

  function handleOpenExisting(partner: ExistingWealthPartnerSummary) {
    setPartnerType("all");
    setSearch(partner.code);
    setHighlightId(partner.partnerId);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="sticky top-0 z-20 shrink-0 space-y-1.5 bg-background/95 py-0.5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="relative min-w-[180px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 pl-7 text-[11px]"
              placeholder="Search partners…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={ENTERPRISE_REGISTRY_ACTION_BTN_CLASS}
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Reload
            </Button>
            <Button
              type="button"
              size="sm"
              className={ENTERPRISE_REGISTRY_ACTION_BTN_CLASS}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {WEALTH_PARTNER_ONBOARD_COPY.registryCta}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {WEALTH_PARTNER_REGISTRY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setPartnerType(f.value)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                partnerType === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
          <p className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {loading
              ? "Loading…"
              : formatEnterpriseRegistryCounter("Wealth Partners", total)}
            {listError ? " · Refresh failed" : ""}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-sm border border-slate-300 bg-card dark:border-zinc-700">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900">
            <tr>
              <th className="px-2 py-1 font-medium text-muted-foreground">Code</th>
              <th className="px-2 py-1 font-medium text-muted-foreground">Name</th>
              <th className="px-2 py-1 font-medium text-muted-foreground">Type</th>
              <th className="px-2 py-1 font-medium text-muted-foreground">Identity</th>
              <th className="px-2 py-1 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">
                  {listError
                    ? "Registry could not be loaded. Use Reload to try again."
                    : "No Wealth Partners yet. Create one from an existing Contact or Company."}
                </td>
              </tr>
            ) : null}
            {items.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/50 hover:bg-muted/30",
                  highlightId === row.id && "bg-amber-500/10",
                )}
              >
                <td className="px-2 py-0.5 font-mono text-[11px]">
                  <Link
                    href={buildWealthPartnerWorkspaceHref(row.id)}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {row.code}
                  </Link>
                </td>
                <td className="px-2 py-0.5 font-medium">
                  <Link href={buildWealthPartnerWorkspaceHref(row.id)} className="hover:underline">
                    {row.displayName}
                  </Link>
                </td>
                <td className="px-2 py-0.5">{wealthPartnerTypeLabel(row.partnerType)}</td>
                <td className="px-2 py-0.5 capitalize text-muted-foreground">
                  {row.identityKind}
                  {row.identityLabel ? ` · ${row.identityLabel}` : ""}
                </td>
                <td className="px-2 py-0.5">
                  <Badge variant="secondary" className="capitalize text-[10px]">
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
        onCreated={() => {
          handleCreated();
          void refresh();
        }}
        onOpenExisting={(partner) => {
          handleOpenExisting(partner);
          void refresh();
        }}
      />
    </div>
  );
}
