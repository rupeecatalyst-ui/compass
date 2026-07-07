"use client";

import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChanakyaBriefing } from "@/lib/insights/mission-control";

export function ChanakyaBriefingPanel({ briefing }: { briefing: ChanakyaBriefing }) {
  return (
    <div className="rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/8 via-background to-violet-500/5 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-900 dark:text-indigo-100">
          Chanakya Executive Briefing
        </h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <dl className="grid grid-cols-2 gap-3 text-[11px]">
          <BriefItem label="Mission Status" value={briefing.missionStatus} accent />
          <BriefItem label="Lead Lender" value={briefing.leadLender} />
          <BriefItem label="Confidence" value={`${briefing.confidence}%`} hint="Recommendation confidence" />
          <BriefItem label="Approval Probability" value={`${briefing.approvalProbability}%`} hint="Lender case probability" />
          <BriefItem label="Commercial Winner" value={briefing.commercialWinner} />
          <BriefItem label="Est. Disbursement" value={briefing.estimatedDisbursement} />
        </dl>

        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attention Required
            </p>
            <ul className="mt-1.5 space-y-1">
              {briefing.attentionItems.map((item, i) => (
                <li key={i} className="text-xs text-foreground/90">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-indigo-500/20 bg-background/60 px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
              Recommendation
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">{briefing.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefItem({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold", accent && "text-emerald-700 dark:text-emerald-300")}>{value}</dd>
      {hint && <dd className="text-[8px] text-muted-foreground">{hint}</dd>}
    </div>
  );
}
