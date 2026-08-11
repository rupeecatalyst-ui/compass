"use client";

/**
 * CO-C1-DASH-001 — My Assigned Deals (Deal Registry projection).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENTERPRISE_JOURNEY_SEGMENTS,
  deriveJourneyProgressSegments,
} from "@/constants/enterprise-deal-journey-progress";
import {
  filterDealRegistryRows,
  uniqueDealValues,
} from "@/lib/my-deals/deal-registry";
import {
  loadMyDealsDealRegistryRows,
  enrichMyDealsDealRegistryRows,
} from "@/lib/enterprise-deal/deal-registry-port";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { cn } from "@/lib/utils";
import type { DealRegistryFilters, DealRegistryRow } from "@/types/deal-registry";
import { EMPTY_DEAL_REGISTRY_FILTERS } from "@/types/deal-registry";

function JourneyDots({ row }: { row: DealRegistryRow }) {
  const progress = deriveJourneyProgressSegments({
    pipelineStage: row.grossStage,
    status: String(row.status),
  });
  return (
    <div className="flex items-center gap-0.5" aria-label={progress.segmentLabel}>
      {ENTERPRISE_JOURNEY_SEGMENTS.map((seg, i) => {
        const filled = i < progress.filled;
        const current = i === progress.filled - 1;
        const overlayLost = progress.overlay === "lost" && current;
        const overlayHold = progress.overlay === "hold" && current;
        return (
          <span
            key={seg.id}
            className={cn(
              "h-2 w-2 rounded-full",
              overlayLost && "bg-rose-500",
              overlayHold && "bg-orange-500",
              !overlayLost && !overlayHold && filled && !current && "bg-teal-500",
              !overlayLost && !overlayHold && current && "bg-amber-400 ring-2 ring-amber-400/40",
              !filled && "bg-muted-foreground/30",
            )}
            title={seg.label}
          />
        );
      })}
    </div>
  );
}

function slaLabel(row: DealRegistryRow): string {
  if (row.tatDays > 0) return `${row.tatDays}d TAT`;
  if (row.nextFollowUp && row.nextFollowUp !== "—") return row.nextFollowUp;
  return "—";
}

export function MyAssignedDealsSection() {
  const { user } = useAuthContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "";
  const [allRows, setAllRows] = useState<DealRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lender, setLender] = useState("all");
  const [stage, setStage] = useState("all");
  const [product, setProduct] = useState("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await loadMyDealsDealRegistryRows();
      setAllRows(summary.rows);
      void enrichMyDealsDealRegistryRows().then((full) => {
        if (full.rows.length) setAllRows(full.rows);
      });
    } catch {
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeLoanFilesUpdated(() => {
      void refresh();
    });
  }, [refresh]);

  const filters: DealRegistryFilters = useMemo(
    () => ({
      ...EMPTY_DEAL_REGISTRY_FILTERS,
      scope: "my_deals",
      search,
      lender,
      grossStage: stage,
      product,
    }),
    [search, lender, stage, product],
  );

  const rows = useMemo(
    () => filterDealRegistryRows(allRows, filters, displayName || undefined),
    [allRows, filters, displayName],
  );

  const lenders = useMemo(() => uniqueDealValues(allRows, "selectedLender"), [allRows]);
  const products = useMemo(() => uniqueDealValues(allRows, "product"), [allRows]);
  const stages = useMemo(() => uniqueDealValues(allRows, "grossStageLabel"), [allRows]);

  return (
    <section
      aria-label="My Assigned Deals"
      data-widget-slot="my_assigned_deals"
      data-sprint="CO-C1-DASH-001"
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">My Assigned Deals</h2>
          <p className="text-[12px] text-muted-foreground">
            Live Deal Registry rows assigned to you — open existing Deal Workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, opp, lender…"
            className="h-9 w-[min(100%,14rem)] text-xs"
            aria-label="Search assigned deals"
          />
          <Select value={lender} onValueChange={setLender}>
            <SelectTrigger className="h-9 w-[9.5rem] text-xs" aria-label="Filter lender">
              <SelectValue placeholder="Lender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Lenders
              </SelectItem>
              {lenders.map((l) => (
                <SelectItem key={l} value={l} className="text-xs">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-[9.5rem] text-xs" aria-label="Filter stage">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Stages
              </SelectItem>
              {stages.map((s) => {
                const row = allRows.find((r) => r.grossStageLabel === s);
                return (
                  <SelectItem key={s} value={row?.grossStage ?? s} className="text-xs">
                    {s}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="h-9 w-[9.5rem] text-xs" aria-label="Filter product">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Products
              </SelectItem>
              {products.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Customer</th>
              <th className="px-3 py-2 font-semibold">Opportunity</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Lender</th>
              <th className="px-3 py-2 font-semibold">Assigned</th>
              <th className="px-3 py-2 font-semibold">Stage</th>
              <th className="px-3 py-2 font-semibold">Journey</th>
              <th className="px-3 py-2 font-semibold">SLA</th>
              <th className="px-3 py-2 font-semibold">Last Activity</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-muted-foreground">
                  Loading assigned deals…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-muted-foreground">
                  No deals assigned to you in the current book.
                </td>
              </tr>
            ) : (
              rows.slice(0, 40).map((row) => {
                const href = buildDealWorkspaceHref({
                  dealId: row.enterpriseDealId || row.id,
                  opportunityId: row.opportunityId,
                  tab: "lenders",
                });
                return (
                  <tr key={row.id} className="hover:bg-muted/25">
                    <td className="px-3 py-2 font-medium">{row.borrowerName}</td>
                    <td className="px-3 py-2 text-[12px] text-muted-foreground">
                      {row.opportunityNumber}
                    </td>
                    <td className="px-3 py-2">{row.product}</td>
                    <td className="px-3 py-2">{row.selectedLender}</td>
                    <td className="px-3 py-2">{row.assignedRm}</td>
                    <td className="px-3 py-2">{row.grossStageLabel}</td>
                    <td className="px-3 py-2">
                      <JourneyDots row={row} />
                    </td>
                    <td className="px-3 py-2 text-[12px] tabular-nums text-muted-foreground">
                      {slaLabel(row)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-muted-foreground">
                      {row.lastActivityLabel}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={href} className="text-[12px] font-medium text-primary hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
