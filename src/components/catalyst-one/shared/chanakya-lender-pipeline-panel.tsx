"use client";

import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LENDER_CASE_STAGE_LABELS,
  LENDER_PROBABILITY_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

const PROB_RANK: Record<string, number> = {
  very_high: 6,
  high: 5,
  medium: 4,
  low: 3,
  very_low: 2,
  rejected: 1,
  withdrawn: 0,
};

function buildLenderPipelineSignals(loan: LoanFile, cases: LoanLenderExecution[]) {
  const active = cases.filter((c) => c.status !== "closed");
  const now = Date.now();
  const idle = active.filter((c) => {
    const updated = new Date(c.updatedAt).getTime();
    return now - updated > 3 * 24 * 60 * 60 * 1000;
  });

  const best = [...active]
    .filter((c) => c.probability && c.probability !== "rejected" && c.probability !== "withdrawn")
    .sort((a, b) => (PROB_RANK[b.probability ?? ""] ?? 0) - (PROB_RANK[a.probability ?? ""] ?? 0))[0];

  const pendingFollowUp = active.filter((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return stage === "logged_in_wip" || stage === "closure_wip";
  });

  const slaRisk = active.filter((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return stage === "final_approved" || stage === "closure_wip";
  });

  let nextAction = "Add a lender case to begin execution.";
  if (active.length === 0) {
    nextAction = "No active lender cases — add a lender case.";
  } else if (!active.some((c) => c.isPrimary)) {
    nextAction = "Set a primary lender for this loan.";
  } else if (pendingFollowUp.length > 0) {
    nextAction = `Follow up on ${pendingFollowUp[0]?.lender ?? "active lender"} (${LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(pendingFollowUp[0]?.caseStage)]}).`;
  } else if (best) {
    nextAction = `Advance ${best.lender} — highest success probability (${LENDER_PROBABILITY_LABELS[best.probability!]}).`;
  }

  return [
    { label: "Recommended Next Action", value: nextAction },
    {
      label: "Idle Lender Alerts",
      value: idle.length > 0 ? `${idle.length} lender case(s) idle > 3 days` : "No idle lenders",
    },
    {
      label: "Best Success Probability",
      value: best ? `${best.lender} · ${LENDER_PROBABILITY_LABELS[best.probability!]}` : "—",
    },
    {
      label: "Pending Follow-up",
      value: pendingFollowUp.length > 0 ? `${pendingFollowUp.length} case(s) need follow-up` : "None",
    },
    {
      label: "SLA Alerts",
      value: slaRisk.length > 0 ? `${slaRisk.length} case(s) in approval/closure` : "No SLA risks",
    },
  ];
}

/** UX-04D — Compact Chanakya assistant for lender execution (rule-based placeholders). */
export function ChanakyaLenderPipelinePanel({
  loan,
  cases,
  className,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
  className?: string;
}) {
  const signals = buildLenderPipelineSignals(loan, cases);

  return (
    <div
      className={cn(
        "w-full max-w-[320px] rounded-lg border border-emerald-600/20 bg-background/95 shadow-md backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-emerald-600/15 px-3 py-2">
        <Brain className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
        <p className="text-xs font-semibold text-foreground">Chanakya</p>
        <Sparkles className="ml-auto h-3 w-3 text-emerald-600/70" />
      </div>
      <div className="max-h-[220px] space-y-1.5 overflow-y-auto p-2 scrollbar-thin">
        {signals.map((s) => (
          <div key={s.label} className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-foreground/90">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
