"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { EiFunnelChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-funnel-chart";
import { EiTreemapChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-treemap-chart";
import { EiRadarChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-radar-chart";
import { ROUTES } from "@/constants/routes";
import { MISSION_CONTROL_ANALYTICS_REFRESH_LABEL } from "@/constants/mission-control-enterprise-intelligence";
import { deriveOperationsIntelligenceFromEbi } from "@/lib/mission-control-enterprise-intelligence/derive-operations-from-ebi";
import { loadMissionControlCertifiedSnapshot } from "@/mission-control/shared/load-mission-control-snapshot";
import { McAnalyticsExpandCard } from "@/mission-control/shared/ui/McAnalyticsExpandCard";
import { WorkspaceLoadingState } from "@/mission-control/shared/ui";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";

function McEbiInsightsSidebar({ ebi }: { ebi: EbiSnapshot }) {
  const metrics = [
    {
      label: "Active Deals",
      value: String(ebi.executive.activeDeals),
    },
    {
      label: "Pipeline",
      value: `${ebi.executive.pipelineValue > 0 ? "₹" : ""}${Math.round(ebi.executive.pipelineValue).toLocaleString("en-IN")}`,
    },
    {
      label: "Overdue tasks",
      value: String(ebi.operational.overdueTasks),
    },
    {
      label: "Docs delayed",
      value: String(ebi.operational.dealsAwaitingDocuments),
    },
    {
      label: "Health score",
      value: `${ebi.health.overallScore}/100`,
    },
  ];

  return (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/40">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-400">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">CHANAKYA Insights</h3>
            <p className="text-[10px] text-zinc-500">Certified EBI snapshot</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <ul className="grid gap-2">
            {metrics.map((m) => (
              <li
                key={m.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
              >
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                  {m.value}
                </p>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Executive signals
            </p>
            {ebi.insights.length === 0 ? (
              <p className="text-[11px] text-zinc-500">No advisory signals in the current snapshot.</p>
            ) : (
              ebi.insights.slice(0, 6).map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
                >
                  <p className="text-[12px] font-medium text-zinc-200">{insight.text}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{insight.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function OperationsAnalyticsBody({ ebi }: { ebi: EbiSnapshot }) {
  const analytics = useMemo(() => deriveOperationsIntelligenceFromEbi(ebi), [ebi]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 to-teal-950/40 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/90">
            Mission Control · Operations Intelligence
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
            Pipeline · Product mix · Business health
          </h2>
          <p className="mt-1 max-w-xl text-[12px] text-zinc-400">
            Derived from certified Enterprise Business Intelligence snapshot ·{" "}
            {MISSION_CONTROL_ANALYTICS_REFRESH_LABEL}
          </p>
        </div>
        <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
          <Link href={ROUTES.MISSION_CONTROL_ENTERPRISE_INTELLIGENCE}>
            Open Enterprise Intelligence
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {!analytics.hasData ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-200">No operational analytics yet</p>
          <p className="mt-1 text-[12px] text-zinc-500">
            When Deals and Opportunities exist, an Administrator can Force Recalculate under
            Administration → Enterprise Metrics to populate this view.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <McAnalyticsExpandCard
            title="Pipeline → Funnel"
            subtitle="Deal count by lender pipeline stage (EBI SSOT)"
            meta={{
              id: "ops-funnel",
              title: "Pipeline → Funnel",
              measurementDefinition: "Deal count by lender pipeline stage from the certified EBI snapshot.",
              reportingPeriod: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
              unit: "deals",
              unitLabel: "Deals (count)",
              lastUpdated: ebi.asOf,
              dataSource: "Certified EBI snapshot",
              kind: "funnel",
            }}
          >
            <EiFunnelChart stages={analytics.funnel} />
          </McAnalyticsExpandCard>

          <McAnalyticsExpandCard
            title="Product Mix → Treemap"
            subtitle="Active Deals grouped by product"
            meta={{
              id: "ops-treemap",
              title: "Product Mix → Treemap",
              measurementDefinition: "Active Deals grouped by product from the certified EBI snapshot.",
              reportingPeriod: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
              unit: "deals",
              unitLabel: "Deals (count)",
              lastUpdated: ebi.asOf,
              dataSource: "Certified EBI snapshot",
              kind: "treemap",
            }}
          >
            <EiTreemapChart cells={analytics.treemap} />
          </McAnalyticsExpandCard>

          <McAnalyticsExpandCard
            title="Business Health → Radar"
            subtitle="Enterprise health dimensions from certified snapshot"
            meta={{
              id: "ops-radar",
              title: "Business Health → Radar",
              measurementDefinition: "Enterprise health dimensions from the certified EBI snapshot.",
              reportingPeriod: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
              unit: "score",
              unitLabel: "Score (0–100)",
              lastUpdated: ebi.asOf,
              dataSource: "Certified EBI snapshot",
              kind: "radar",
            }}
          >
            <EiRadarChart axes={analytics.radar} />
          </McAnalyticsExpandCard>
        </div>
      )}
    </div>
  );
}

/**
 * Operations Intelligence — certified EBI snapshot (CO-REFINEMENT-004).
 * No local LoanFile fixtures.
 */
export function OperationsIntelligenceWorkspace() {
  const [ebi, setEbi] = useState<EbiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadMissionControlCertifiedSnapshot()
      .then((snap) => {
        if (!cancelled) {
          setEbi(snap?.ebi ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEbi(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <WorkspaceLoadingState label="Loading Operations Intelligence…" />;
  }

  if (!ebi) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
        <p className="text-sm font-medium text-zinc-200">Mission Control Snapshot pending</p>
        <p className="mt-1 text-[12px] text-zinc-500">
          Ask an Administrator to Force Recalculate under Administration → Enterprise Metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="min-w-0 flex-1 overflow-auto p-4 scrollbar-thin">
          <OperationsAnalyticsBody ebi={ebi} />
        </div>
        <McEbiInsightsSidebar ebi={ebi} />
      </div>
    </div>
  );
}
