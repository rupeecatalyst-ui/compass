"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { EiFunnelChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-funnel-chart";
import { EiTreemapChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-treemap-chart";
import { EiRadarChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-radar-chart";
import { deriveExecutiveIntelligenceStory } from "@/lib/executive-intelligence-platform";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";

/**
 * Loan Files Analytics — rule-mapped visuals (Pipeline→Funnel, Mix→Treemap, Risk→Radar).
 */
export function LoanFilesAnalyticsView() {
  const { files } = useLoanFiles();
  const story = useMemo(() => deriveExecutiveIntelligenceStory(files), [files]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-r from-slate-950 to-teal-950 px-5 py-4 text-slate-50">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/90">
            Visualization rules
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Operations Intelligence</h2>
          <p className="mt-1 max-w-xl text-[12px] text-slate-300">
            Pipeline → Funnel · Product Mix → Treemap · Risk → Radar. Hosted under Mission Control →
            Operations Intelligence. Full rule set on Executive Intelligence.
          </p>
        </div>
        <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
          <Link href={ROUTES.REPORTS}>
            Open Executive Intelligence
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline → Funnel
          </p>
          <EiFunnelChart stages={story.funnel} />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Product Mix → Treemap
          </p>
          <EiTreemapChart cells={story.treemap} />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 lg:col-span-2">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Risk Distribution → Radar
          </p>
          <EiRadarChart axes={story.radar} />
        </div>
      </div>
    </div>
  );
}
