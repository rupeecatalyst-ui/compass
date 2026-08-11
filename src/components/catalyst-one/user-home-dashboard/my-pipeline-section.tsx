"use client";

/**
 * CO-C1-DASH-001 — My Pipeline (Deal journey counts from assigned Deal Registry).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import {
  ENTERPRISE_JOURNEY_SEGMENTS,
  deriveJourneyProgressSegments,
} from "@/constants/enterprise-deal-journey-progress";
import { formatINRCompact } from "@/lib/format-currency";
import {
  filterDealRegistryRows,
} from "@/lib/my-deals/deal-registry";
import {
  loadMyDealsDealRegistryRows,
} from "@/lib/enterprise-deal/deal-registry-port";
import { composeRmWorkspaceSnapshot } from "@/lib/enterprise-rm-workspace";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { EMPTY_DEAL_REGISTRY_FILTERS, type DealRegistryRow } from "@/types/deal-registry";
import { cn } from "@/lib/utils";

export function MyPipelineSection() {
  const { user } = useAuthContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "";
  const snap = useMemo(() => composeRmWorkspaceSnapshot(user), [user]);
  const [rows, setRows] = useState<DealRegistryRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await loadMyDealsDealRegistryRows();
      const mine = filterDealRegistryRows(
        result.rows,
        { ...EMPTY_DEAL_REGISTRY_FILTERS, scope: "my_deals" },
        displayName || undefined,
      );
      setRows(mine);
    } catch {
      setRows([]);
    }
  }, [displayName]);

  useEffect(() => {
    void refresh();
    return subscribeLoanFilesUpdated(() => {
      void refresh();
    });
  }, [refresh]);

  const buckets = useMemo(() => {
    const counts = Object.fromEntries(
      ENTERPRISE_JOURNEY_SEGMENTS.map((s) => [s.id, { count: 0, value: 0 }]),
    ) as Record<string, { count: number; value: number }>;
    let hold = 0;
    let lost = 0;
    for (const row of rows) {
      const progress = deriveJourneyProgressSegments({
        pipelineStage: row.grossStage,
        status: String(row.status),
      });
      if (progress.overlay === "hold") {
        hold += 1;
        continue;
      }
      if (progress.overlay === "lost") {
        lost += 1;
        continue;
      }
      const bucket = counts[progress.segmentId];
      if (bucket) {
        bucket.count += 1;
        bucket.value += row.loanAmount || 0;
      }
    }
    return { counts, hold, lost };
  }, [rows]);

  return (
    <section
      aria-label="My Pipeline"
      data-widget-slot="my_pipeline"
      data-sprint="CO-C1-DASH-001"
      className="space-y-3"
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight">My Pipeline</h2>
        <p className="text-[12px] text-muted-foreground">
          Assigned Deal journey stages — existing enterprise pipeline (no new stages).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">My Opportunities</p>
            <p className="text-2xl font-semibold tabular-nums">
              {snap.pipeline.myOpportunities}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Active Deals</p>
            <p className="text-2xl font-semibold tabular-nums">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Pipeline Value</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatINRCompact(snap.pipeline.pipelineValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Conversion</p>
            <p className="text-2xl font-semibold tabular-nums">
              {snap.pipeline.conversionRatePct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 p-3">
        <div className="flex min-w-[48rem] gap-2">
          {ENTERPRISE_JOURNEY_SEGMENTS.map((seg, idx) => {
            const bucket = buckets.counts[seg.id] ?? { count: 0, value: 0 };
            return (
              <div key={seg.id} className="flex min-w-0 flex-1 items-stretch gap-2">
                <div className="min-w-0 flex-1 rounded-lg border border-border/70 bg-card/50 p-2.5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden
                    />
                    <p className="truncate text-[11px] font-medium">{seg.label}</p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{bucket.count}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatINRCompact(bucket.value)}
                  </p>
                </div>
                {idx < ENTERPRISE_JOURNEY_SEGMENTS.length - 1 ? (
                  <span
                    className={cn(
                      "mt-6 hidden shrink-0 text-muted-foreground/50 sm:inline",
                    )}
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          <span>
            Hold: <strong className="text-orange-700 dark:text-orange-300">{buckets.hold}</strong>
          </span>
          <span>
            Lost: <strong className="text-rose-700 dark:text-rose-300">{buckets.lost}</strong>
          </span>
          <span>
            Disbursals (EBI):{" "}
            <strong className="text-foreground">{snap.pipeline.myDisbursals}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}
