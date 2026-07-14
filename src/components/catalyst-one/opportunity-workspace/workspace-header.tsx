"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpportunityHealthBand } from "@/types/enterprise-opportunity-intelligence";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { OwGlassPanel, OwInfoChip, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

const BAND_STYLES: Record<OpportunityHealthBand, string> = {
  excellent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  good: "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  needs_attention: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function WorkspaceHeader() {
  const {
    opportunity,
    contact,
    stageCode,
    progressRatio,
    productLabel,
    loanAmountLabel,
    selectedLender,
    intelligence,
    documentStats,
  } = useOpportunityWorkspace();

  const band = intelligence?.health.band ?? "needs_attention";
  const progressPct = Math.round(progressRatio * 100);
  const successPct = selectedLender?.successProbability;
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (successPct == null) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 1400);
    return () => window.clearTimeout(t);
  }, [successPct, selectedLender?.lenderName]);

  const loanHref = opportunity?.id
    ? `${ROUTES.LOAN_FILES}?from=opportunity_workspace&opportunityId=${encodeURIComponent(opportunity.id)}`
    : ROUTES.LOAN_FILES;

  return (
    <OwGlassPanel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <OwSectionLabel>Opportunity Workspace · Planning</OwSectionLabel>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {opportunity?.opportunityCode ?? "Opportunity"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Planning and opportunity management — execution continues in Loan Workflow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
              BAND_STYLES[band],
            )}
          >
            {band.replace(/_/g, " ")}
          </span>
          <Button asChild size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
            <Link href={loanHref}>
              Go To Loan Workflow
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <OwInfoChip label="Opportunity No." value={opportunity?.opportunityCode ?? "—"} />
        <OwInfoChip label="Product" value={productLabel} className="capitalize" />
        <OwInfoChip label="Loan Amount" value={loanAmountLabel} />
        <OwInfoChip label="Customer" value={contact?.name ?? "—"} />
        <OwInfoChip label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
        <span
          className={cn(
            "inline-flex transition-all duration-500",
            flash && "scale-[1.04] ring-2 ring-teal-400/50 rounded-full",
          )}
        >
          <OwInfoChip
            label="Success Probability"
            value={successPct != null ? `${successPct}%` : "—"}
          />
        </span>
        <OwInfoChip label="Relationship Manager" value="RM-001" />
        <OwInfoChip label="Current Stage" value={stageCode.replace(/_/g, " ")} className="capitalize" />
        <OwInfoChip label="Progress" value={`${progressPct}%`} />
        <OwInfoChip label="Doc Completion" value={`${documentStats.completionPct}%`} />
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
    </OwGlassPanel>
  );
}
