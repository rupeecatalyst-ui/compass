"use client";

import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import { countPipelineBuckets } from "@/lib/strategic-lender-pipeline";
import type { LoanLenderExecution } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

type BucketId = "identified" | "awaitingLogin" | "loggedIn" | "approvals" | "disbursements";

const BUCKETS: { id: BucketId; label: string; stages: string[] }[] = [
  { id: "identified", label: "Identified Lenders", stages: ["identified"] },
  { id: "awaitingLogin", label: "Awaiting Login", stages: ["prelogin"] },
  { id: "loggedIn", label: "Logged-in Lenders", stages: ["logged_in_wip"] },
  { id: "approvals", label: "Approvals", stages: ["soft_approved", "final_approved"] },
  { id: "disbursements", label: "Disbursements", stages: ["closure_wip", "disbursed"] },
];

/**
 * Action Center companion — one-click navigation into Lender Pipeline buckets.
 */
export function LenderPipelineActionNav({
  cases,
  onNavigate,
  className,
}: {
  cases: LoanLenderExecution[];
  onNavigate: (stageHint: string) => void;
  className?: string;
}) {
  const counts = countPipelineBuckets(cases);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2 py-1.5",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pr-1">
        Pipeline
      </span>
      {BUCKETS.map((b) => {
        const count = counts[b.id];
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onNavigate(b.stages[0]!)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-colors",
              count > 0
                ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                : "border-border/60 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {b.label}
            <span className="tabular-nums font-semibold">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function firstCaseIdForStage(
  cases: LoanLenderExecution[],
  stageHint: string,
): string | undefined {
  return cases.find((c) => normalizeLenderCaseStage(c.caseStage) === stageHint)?.id;
}
