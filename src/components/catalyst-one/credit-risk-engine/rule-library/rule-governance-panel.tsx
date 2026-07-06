"use client";

import { RULE_SEVERITY_DEFINITIONS, RULE_SEVERITY_FUTURE_BEHAVIOR, RULE_SEVERITY_LABELS } from "@/constants/rule-severity";
import {
  computeReviewStatus,
  RULE_OWNER_LABELS,
  RULE_REVIEW_CYCLE_LABELS,
} from "@/constants/rule-governance";
import type { RuleLibraryVersion } from "@/types/rule-library";
import { RuleReviewStatusBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-review-status-badge";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";

interface RuleGovernancePanelProps {
  rule: RuleLibraryVersion;
}

export function RuleGovernancePanel({ rule }: RuleGovernancePanelProps) {
  const futureBehavior = RULE_SEVERITY_FUTURE_BEHAVIOR[rule.ruleSeverity];
  const reviewStatus = computeReviewStatus(rule);

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Severity & Governance</CardTitle>
            <RuleSeverityBadge severity={rule.ruleSeverity} />
          </div>
          <CardDescription>{RULE_SEVERITY_DEFINITIONS[rule.ruleSeverity]}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GovField label="Business Impact" value={rule.businessImpact} className="sm:col-span-2 lg:col-span-3" />
          <GovField label="Affected Systems" value={rule.affectedSystems.join(", ") || "—"} className="sm:col-span-2" />
          <GovField label="Owner" value={RULE_OWNER_LABELS[rule.ruleOwnerId]} />
          <GovField label="Review Cycle" value={RULE_REVIEW_CYCLE_LABELS[rule.reviewCycleId]} />
          <GovField
            label="Next Review Date"
            value={new Date(rule.nextReviewDate).toLocaleDateString("en-IN")}
          />
          <GovField
            label="Last Reviewed On"
            value={rule.lastReviewedOn ? new Date(rule.lastReviewedOn).toLocaleDateString("en-IN") : "—"}
          />
          <GovField label="Last Reviewed By" value={rule.lastReviewedBy ?? "—"} />
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Review Status</p>
            <div className="mt-1">
              <RuleReviewStatusBadge status={reviewStatus} />
            </div>
          </div>
          <GovField label="Approval Authority" value={rule.approvalAuthority} />
          <GovField label="Business Justification" value={rule.businessJustification || "—"} className="sm:col-span-2 lg:col-span-3" />
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/60 bg-muted/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Reserved Future Behaviour</CardTitle>
          <CardDescription>
            Assign Reviewer · Escalation · Review Comments · Approval Workflow · Review History
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {RULE_SEVERITY_LABELS[rule.ruleSeverity]} severity workflow — not active in this sprint.
          </p>
          <div className="flex flex-wrap gap-2">
            {futureBehavior.map((behaviour) => (
              <StatusPill key={behaviour} variant="muted" dot={false}>
                {behaviour}
              </StatusPill>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GovField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
