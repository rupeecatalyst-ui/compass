"use client";

import { COMPLIANCE_VERDICT_LABELS, COMPLIANCE_VERDICT_VARIANT } from "@/constants/enterprise-architecture";
import type { ComplianceVerdict } from "@/types/enterprise-architecture";
import { StatusPill } from "@/components/design-system/status-pill";

export function ComplianceVerdictBadge({ verdict }: { verdict: ComplianceVerdict }) {
  return (
    <StatusPill variant={COMPLIANCE_VERDICT_VARIANT[verdict]}>
      {COMPLIANCE_VERDICT_LABELS[verdict]}
    </StatusPill>
  );
}

export function ComplianceScoreBadge({ score }: { score: number }) {
  const variant = score >= 90 ? "success" : score >= 70 ? "warning" : "error";
  return <StatusPill variant={variant}>{score}%</StatusPill>;
}
