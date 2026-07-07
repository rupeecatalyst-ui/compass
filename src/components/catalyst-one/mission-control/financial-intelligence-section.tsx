"use client";

import { MissionSection, IntelGrid, IntelCell } from "@/components/catalyst-one/mission-control/mission-section";
import { formatINR } from "@/lib/format-currency";
import type { FinancialIntel } from "@/lib/insights/mission-control";

export function FinancialIntelligenceSection({ financial }: { financial: FinancialIntel }) {
  const profLabel =
    financial.profitability === "strong"
      ? "Strong"
      : financial.profitability === "moderate"
        ? "Moderate"
        : "Thin";

  return (
    <MissionSection title="Financial Intelligence" subtitle="Revenue, payout, margin, and receivables">
      <IntelGrid cols={4}>
        <IntelCell label="Expected Revenue" value={formatINR(financial.expectedRevenue)} accent="blue" />
        <IntelCell label="Booked Revenue" value={formatINR(financial.bookedRevenue)} />
        <IntelCell label="Expected Payout" value={formatINR(financial.expectedPayout)} accent="green" />
        <IntelCell label="Margin" value={`${financial.margin}%`} />
        <IntelCell label="Profitability" value={profLabel} accent={financial.profitability === "strong" ? "green" : "amber"} />
        <IntelCell label="Invoice Status" value={financial.invoiceStatus} />
        <IntelCell label="Receivable Status" value={financial.receivableStatus} />
      </IntelGrid>
    </MissionSection>
  );
}
