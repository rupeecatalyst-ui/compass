"use client";

import { RoiIntelligenceChart } from "@/components/catalyst-one/insights/roi-intelligence-chart";
import { MissionSection, IntelGrid, IntelCell } from "@/components/catalyst-one/mission-control/mission-section";
import { formatINR } from "@/lib/format-currency";
import type { CommercialIntel } from "@/lib/insights/mission-control";

export function CommercialIntelligenceSection({ commercial }: { commercial: CommercialIntel }) {
  const lowestEmi = commercial.emiComparisons.reduce(
    (min, c) => (c.emi < min.emi ? c : min),
    commercial.emiComparisons[0] ?? { lender: "—", emi: 0, roi: 0 },
  );

  return (
    <MissionSection title="Commercial Intelligence" subtitle="Enterprise ROI comparison by lender">
      <RoiIntelligenceChart
        scale={commercial.scale}
        profiles={commercial.roiProfiles}
        savings={commercial.savings}
      />

      <IntelGrid cols={3}>
        <IntelCell label="Best Offer" value={commercial.bestOfferLender} accent="green" />
        <IntelCell
          label="Lowest EMI"
          value={lowestEmi.emi > 0 ? formatINR(lowestEmi.emi) : "—"}
          sub={lowestEmi.lender}
          accent="blue"
        />
        <IntelCell
          label="Customer Savings"
          value={commercial.savings ? formatINR(commercial.savings.amount) : "—"}
          sub={commercial.savings ? `vs ${commercial.savings.compareLender}` : undefined}
          accent="green"
        />
      </IntelGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border/60 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            EMI Comparison
          </p>
          <div className="space-y-1.5">
            {commercial.emiComparisons.map((c) => (
              <div key={c.lender} className="flex justify-between text-xs">
                <span>{c.lender}</span>
                <span className="font-medium tabular-nums">
                  {formatINR(c.emi)} <span className="text-muted-foreground">@ {c.roi.toFixed(2)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Processing Fee Comparison
          </p>
          <div className="space-y-1.5">
            {commercial.processingFees.map((c) => (
              <div key={c.lender} className="flex justify-between text-xs">
                <span>{c.lender}</span>
                <span className="font-medium tabular-nums">
                  {formatINR(c.fee)} <span className="text-muted-foreground">({c.feeLabel})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MissionSection>
  );
}
