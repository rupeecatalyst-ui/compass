"use client";

import { MissionSection, IntelGrid, IntelCell } from "@/components/catalyst-one/mission-control/mission-section";
import { cn } from "@/lib/utils";
import type { RiskIntel } from "@/lib/insights/mission-control";

export function RiskIntelligenceSection({ risk }: { risk: RiskIntel }) {
  return (
    <MissionSection title="Risk Intelligence" subtitle="Credit & Risk Engine — policy, bureau, and compliance signals">
      <IntelGrid cols={4}>
        <IntelCell label="FOIR" value={`${risk.foir}%`} accent={risk.foir > 55 ? "amber" : "green"} />
        <IntelCell label="DBR" value={`${risk.dbr}%`} accent={risk.dbr > 50 ? "amber" : "green"} />
        <IntelCell label="CIBIL" value={`${risk.cibil}`} accent={risk.cibil >= 750 ? "green" : "amber"} />
        <IntelCell label="Eligibility Score" value={`${risk.eligibilityScore}`} accent="blue" />
        <IntelCell label="Financial Health" value={`${risk.financialHealthScore}`} accent="blue" />
        <IntelCell label="Policy Compliance" value={`${risk.policyCompliance}%`} accent="green" />
        <IntelCell label="Exceptions" value={`${risk.exceptionCount}`} accent={risk.exceptionCount > 0 ? "amber" : "slate"} />
        <IntelCell label="Rule Violations" value={`${risk.ruleViolations.length}`} accent={risk.ruleViolations.length > 0 ? "red" : "green"} />
      </IntelGrid>

      {risk.ruleViolations.length > 0 && (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rule Violations
          </p>
          <div className="space-y-1.5">
            {risk.ruleViolations.map((v) => (
              <div key={v.code} className="flex items-center justify-between text-xs">
                <span>
                  <span className="font-mono text-[10px] text-muted-foreground">{v.code}</span> — {v.label}
                </span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                    v.severity === "high"
                      ? "border-red-500/30 text-red-700"
                      : v.severity === "medium"
                        ? "border-amber-500/30 text-amber-700"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {v.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MissionSection>
  );
}
