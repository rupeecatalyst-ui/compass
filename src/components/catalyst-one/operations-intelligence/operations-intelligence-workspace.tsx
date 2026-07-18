"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LoanFilesProvider } from "@/components/catalyst-one/loan-files/loan-files-context";
import { LoanFilesAnalyticsView } from "@/components/catalyst-one/loan-files/loan-files-analytics-view";
import { AiInsightsSidebar } from "@/components/catalyst-one/loan-files/ai-insights-sidebar";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * Operations Intelligence — relocated from Loan Workspace.
 * Funnel · Treemap · Radar · AI Insights (executive / ops analytics).
 * Loan Workspace remains an execution hub only.
 */
function OperationsIntelligenceBody() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300/90">
            Mission Control · Analytics
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
            Operations Intelligence
          </h1>
          <p className="mt-1 max-w-xl text-[12px] text-zinc-400">
            Pipeline Funnel · Product Mix Treemap · Risk Radar · AI Insights. Relocated from Loan
            Workspace so execution stays operational.
          </p>
        </div>
        <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
          <Link href={ROUTES.REPORTS}>
            Open Executive Intelligence
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="min-w-0 flex-1 overflow-auto p-4 scrollbar-thin">
          <LoanFilesAnalyticsView />
        </div>
        <AiInsightsSidebar />
      </div>
    </div>
  );
}

export function OperationsIntelligenceWorkspace() {
  return (
    <LoanFilesProvider>
      <OperationsIntelligenceBody />
    </LoanFilesProvider>
  );
}
