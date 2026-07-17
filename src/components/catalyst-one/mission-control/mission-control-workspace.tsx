"use client";

import { useMemo } from "react";
import { buildMissionControlSnapshot } from "@/lib/insights/mission-control";
import { ExecutiveKpiStrip } from "@/components/catalyst-one/mission-control/executive-kpi-strip";
import { LenderExpress } from "@/components/catalyst-one/mission-control/lender-express";
import { CommercialIntelligenceSection } from "@/components/catalyst-one/mission-control/commercial-intelligence-section";
import { ExecutionIntelligenceSection } from "@/components/catalyst-one/mission-control/execution-intelligence-section";
import { RiskIntelligenceSection } from "@/components/catalyst-one/mission-control/risk-intelligence-section";
import { FinancialIntelligenceSection } from "@/components/catalyst-one/mission-control/financial-intelligence-section";
import { ProcessIntelligenceSection } from "@/components/catalyst-one/mission-control/process-intelligence-section";
import { ChanakyaBriefingPanel } from "@/components/catalyst-one/mission-control/chanakya-briefing";
import { SdeOperationsPanel } from "@/components/catalyst-one/system-driven-enterprise";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

/** MC-01 — Mission Control executive command centre (read-only). */
export function MissionControlWorkspace({
  loan,
  cases,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
}) {
  const snapshot = useMemo(() => buildMissionControlSnapshot(loan, cases), [loan, cases]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 shrink-0 space-y-1 px-0.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Mission Control</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Executive Command Centre · {loan.customerName} · {loan.fileNumber}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overflow-x-hidden pb-6 pr-1 scrollbar-thin">
        <ExecutiveKpiStrip kpis={snapshot.kpis} />

        <SdeOperationsPanel transactionId={loan.id} compact />

        <LenderExpress rows={snapshot.expressRows} terminalOutcomes={snapshot.terminalOutcomes} />

        <CommercialIntelligenceSection commercial={snapshot.commercial} />

        <ExecutionIntelligenceSection execution={snapshot.execution} />

        <RiskIntelligenceSection risk={snapshot.risk} />

        <FinancialIntelligenceSection financial={snapshot.financial} />

        <ProcessIntelligenceSection process={snapshot.process} loan={loan} />

        <ChanakyaBriefingPanel briefing={snapshot.briefing} />
      </div>
    </div>
  );
}
