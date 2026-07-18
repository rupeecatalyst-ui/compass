"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { ChanakyaMark } from "@/components/layout/chanakya-mark";
import type { LoanLenderExecution } from "@/types/catalyst-one";

/**
 * CO-SPRINT-089 — View Strategy drawer (stays on Lender Pipeline).
 */
export function LenderStrategyDrawer({
  open,
  onOpenChange,
  caseExecution,
  productFallback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseExecution: LoanLenderExecution | null;
  productFallback?: string;
}) {
  if (!caseExecution) return null;

  const rows: { label: string; value: string }[] = [
    {
      label: "Strategic Score",
      value:
        caseExecution.strategicScore != null
          ? `${caseExecution.strategicScore}`
          : "—",
    },
    {
      label: "Recommendation Rank",
      value: caseExecution.strategicRank != null ? `#${caseExecution.strategicRank}` : "—",
    },
    { label: "FOIR Assessment", value: caseExecution.foirAssessment ?? "—" },
    { label: "CIBIL Assessment", value: caseExecution.cibilAssessment ?? "—" },
    { label: "Income Fit", value: caseExecution.incomeFit ?? "—" },
    { label: "Policy Fit", value: caseExecution.policyFit ?? "—" },
    { label: "Expected Turnaround", value: caseExecution.expectedTurnaround ?? "—" },
    {
      label: "Expected ROI",
      value: caseExecution.expectedRoi != null ? `${caseExecution.expectedRoi}%` : "—",
    },
    {
      label: "Loan Product",
      value: caseExecution.product ?? productFallback ?? "—",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-center gap-2.5">
            <LenderLogo lender={caseExecution.lender} size="lg" className="rounded-md" />
            <div className="min-w-0">
              <SheetTitle className="text-base leading-snug">{caseExecution.lender}</SheetTitle>
              <SheetDescription className="text-xs">
                Strategic analysis · Rank{" "}
                {caseExecution.strategicRank != null ? `#${caseExecution.strategicRank}` : "—"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-5 py-4">
          <dl className="grid gap-2">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-muted/15 px-2.5 py-2 text-xs"
              >
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="max-w-[55%] text-right font-medium text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>

          <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recommendation Notes
            </h3>
            <p className="text-xs leading-relaxed text-foreground/90">
              {caseExecution.recommendationNotes ??
                caseExecution.reasonForRecommendation ??
                caseExecution.specialNotes ??
                "No recommendation notes captured."}
            </p>
          </section>

          <section className="flex gap-2.5 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
            <ChanakyaMark size="sm" status="insights" className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                CHANAKYA Recommendation
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">
                {caseExecution.chanakyaRecommendation ??
                  "Review strategic fit before starting login."}
              </p>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
