"use client";

import { LoanWorkflowCards } from "@/components/catalyst-one/shared/loan-workflow-status-bar";
import type { LoanFile, LoanFileStatus, LoanFileTimelineEvent, PipelineStage } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

export interface LoanIntelligencePanelProps {
  fileId: string;
  stage: PipelineStage;
  subStageId?: string;
  daysInStage: number;
  timeline: LoanFileTimelineEvent[];
  updatedBy: string;
  currentStatus: LoanFileStatus;
  /** GL-03 — execution workspace signals (rule-based, no AI). */
  executionMessages?: string[];
  saving?: boolean;
  finalLoanAmount?: number;
  finalRoi?: number;
  finalTenure?: number;
  finalApprovalDate?: string;
  onStageChange: (stage: PipelineStage) => void;
  onSubStageChange: (subStatusId: string) => void;
  onFinalTermsChange: (patch: Pick<LoanFile, "finalLoanAmount" | "finalRoi" | "finalTenure">) => void;
  className?: string;
}

/** UX-01C — Right-rail Loan Intelligence Panel (Phase 1 of ADR-010 foundation). */
export function LoanIntelligencePanel({
  className,
  ...workflowProps
}: LoanIntelligencePanelProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="shrink-0 border-b border-border/50 px-4 py-3.5 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Loan Intelligence
        </p>
        <h2 className="mt-0.5 text-sm font-semibold text-foreground">Workflow &amp; Approval</h2>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <LoanWorkflowCards layout="panel" {...workflowProps} />
      </div>

      <div
        className="mt-auto shrink-0 border-t border-dashed border-border/50 px-4 py-3 sm:px-5"
        aria-label="Chanakya execution signals"
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Chanakya · Execution Signals
        </p>
        {workflowProps.executionMessages && workflowProps.executionMessages.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground/80">
            {workflowProps.executionMessages.map((msg) => (
              <li key={msg} className="flex gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/70" />
                <span className="min-w-0">{msg}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">
            No execution alerts. Lender, documents, and tasks look healthy.
          </p>
        )}
      </div>
    </div>
  );
}
