"use client";

import { LenderMomentumIndex } from "@/components/catalyst-one/insights/lender-momentum-index";
import { MissionSection, IntelGrid, IntelCell } from "@/components/catalyst-one/mission-control/mission-section";
import type { ExecutionIntel } from "@/lib/insights/mission-control";

export function ExecutionIntelligenceSection({ execution }: { execution: ExecutionIntel }) {
  const slaLabel =
    execution.slaStatus === "within" ? "Within SLA" : execution.slaStatus === "watch" ? "Watch" : "SLA Breach";
  const slaAccent = execution.slaStatus === "within" ? "green" : execution.slaStatus === "watch" ? "amber" : "red";

  return (
    <MissionSection title="Execution Intelligence" subtitle="Momentum, TAT, bottlenecks, and follow-up performance">
      <IntelGrid cols={5}>
        <IntelCell label="Average TAT" value={`${execution.averageTat} days`} />
        <IntelCell label="Stage Bottleneck" value={execution.stageBottleneck} accent="amber" />
        <IntelCell label="SLA Status" value={slaLabel} accent={slaAccent as "green" | "amber" | "red"} />
        <IntelCell label="Follow-up Score" value={`${execution.followUpScore}%`} accent="blue" />
        <IntelCell label="Idle Lenders" value={`${execution.idleLenders.length}`} />
      </IntelGrid>

      <LenderMomentumIndex profiles={execution.momentumProfiles} />

      {execution.idleLenders.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            Idle Lender Analysis
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {execution.idleLenders.map((i) => (
              <span key={i.lender} className="text-xs text-foreground/90">
                {i.lender} — {i.idleDays}d idle
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border/60 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          ETA Comparison
        </p>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {execution.etaComparisons.map((e) => (
            <div key={e.lender} className="flex justify-between rounded-md bg-muted/30 px-2 py-1.5 text-xs">
              <span>{e.lender}</span>
              <span className="font-medium tabular-nums">{e.etaDays === 0 ? "Disbursed" : `${e.etaDays}d`}</span>
            </div>
          ))}
        </div>
      </div>
    </MissionSection>
  );
}
