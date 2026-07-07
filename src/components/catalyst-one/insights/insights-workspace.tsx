"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LenderRaceBoard } from "@/components/catalyst-one/execution/lender-race-board";
import { RoiIntelligenceChart } from "@/components/catalyst-one/insights/roi-intelligence-chart";
import { LenderMomentumIndex } from "@/components/catalyst-one/insights/lender-momentum-index";
import {
  buildExecutiveSummary,
  buildLenderMomentumProfiles,
  buildLenderRoiProfiles,
  computeInterestSavings,
  resolveProductRoiScale,
} from "@/lib/insights/lender-intelligence";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

function ChanakyaExecutiveSummary({ summary }: { summary: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-indigo-500/20 bg-gradient-to-r from-indigo-500/8 via-background/95 to-violet-500/5 px-4 py-3 shadow-sm",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Brain className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
          Chanakya Executive Summary
        </span>
        <Sparkles className="h-3 w-3 text-indigo-500/50" />
      </div>
      <p className="text-xs leading-relaxed text-foreground/90">{summary}</p>
    </div>
  );
}

function InsightsSectionNav({
  active,
  onChange,
}: {
  active: "intelligence" | "race";
  onChange: (v: "intelligence" | "race") => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      <button
        type="button"
        onClick={() => onChange("intelligence")}
        className={cn(
          "rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors",
          active === "intelligence"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Decision Intelligence
      </button>
      <button
        type="button"
        onClick={() => onChange("race")}
        className={cn(
          "rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors",
          active === "race"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Race to Disbursement
      </button>
    </div>
  );
}

/** INS-02 — Read-only executive insights inside canonical Loan Workspace. */
export function InsightsWorkspace({
  loan,
  cases,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
}) {
  const [view, setView] = useState<"intelligence" | "race">("intelligence");

  const scale = useMemo(() => resolveProductRoiScale(loan), [loan]);
  const roiProfiles = useMemo(
    () => buildLenderRoiProfiles(loan, cases, scale),
    [loan, cases, scale],
  );
  const momentumProfiles = useMemo(() => buildLenderMomentumProfiles(loan, cases), [loan, cases]);
  const savings = useMemo(
    () => computeInterestSavings(loan, roiProfiles),
    [loan, roiProfiles],
  );
  const executiveSummary = useMemo(
    () => buildExecutiveSummary(loan, roiProfiles, momentumProfiles),
    [loan, roiProfiles, momentumProfiles],
  );

  useEffect(() => {
    setView("intelligence");
  }, [loan.id]);

  if (view === "race") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <InsightsSectionNav active="race" onChange={setView} />
        <LenderRaceBoard loan={loan} cases={cases} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Executive Insights</h2>
          <p className="text-xs text-muted-foreground">
            ROI intelligence and lender momentum for management decisions
          </p>
        </div>
        <InsightsSectionNav active="intelligence" onChange={setView} />
      </div>

      <ChanakyaExecutiveSummary summary={executiveSummary} />

      <div className="h-[calc(100vh-280px)] min-h-[520px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
        <div className="grid gap-6 lg:grid-cols-1 xl:gap-8">
          <RoiIntelligenceChart scale={scale} profiles={roiProfiles} savings={savings} />
          <LenderMomentumIndex profiles={momentumProfiles} />
        </div>
      </div>
    </div>
  );
}
