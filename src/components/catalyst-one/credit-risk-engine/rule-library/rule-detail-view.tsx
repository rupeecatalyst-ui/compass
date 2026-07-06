"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  formatRuleVersion,
  RULE_DATA_TYPE_LABELS,
  RULE_INHERITANCE_LABELS,
  RULE_OPERATOR_LABELS,
  RULE_SCOPE_LABELS,
  RULE_TYPE_LABELS,
} from "@/constants/rule-library";
import type { RuleLibraryVersion } from "@/types/rule-library";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { RuleCategoryBadge, RuleScopeBadge, RuleStatusBadge, RuleTypeBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-category-badge";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { RuleCompositionPanel } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-composition-panel";
import { RuleGovernancePanel } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-governance-panel";
import { RuleInheritancePanel } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-inheritance-panel";
import { RuleReviewAuditPanel } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-review-audit-panel";
import { RuleSeverityAuditPanel } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-audit-panel";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";
import { RuleSimulator } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-simulator";
import { RuleVersionHistoryTable } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-version-history-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RuleDetailViewProps {
  rule: RuleLibraryVersion;
}

export function RuleDetailView({ rule }: RuleDetailViewProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  return (
    <CreditRiskEngineShell
      workspaceName="Rule Library"
      closeTo={WORKSPACE_CLOSE.RULE_LIBRARY}
      title={rule.ruleName}
      description={`${rule.ruleCode} · ${formatRuleVersion(rule.majorVersion, rule.minorVersion)}`}
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_BUILDER}?ruleId=${rule.ruleId}`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Rule
          </Link>
        </Button>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Version History</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-card border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div className="space-y-2">
                <CardTitle className="text-base">{rule.ruleName}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <RuleSeverityBadge severity={rule.ruleSeverity} />
                  <RuleScopeBadge scope={rule.ruleScope} />
                  <RuleTypeBadge ruleType={rule.ruleType} />
                  <RuleCategoryBadge categoryId={rule.categoryId} />
                  <RuleStatusBadge status={rule.status} />
                </div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{rule.ruleCode}</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Rule Scope" value={RULE_SCOPE_LABELS[rule.ruleScope]} />
              <Meta label="Rule Type" value={RULE_TYPE_LABELS[rule.ruleType]} />
              <Meta label="Inheritance Level" value={RULE_INHERITANCE_LABELS[rule.inheritanceLevel]} />
              <Meta label="Sub Category" value={rule.subCategory || "—"} />
              <Meta label="Data Type" value={RULE_DATA_TYPE_LABELS[rule.dataType]} />
              <Meta label="Operator" value={RULE_OPERATOR_LABELS[rule.operator]} />
              <Meta label="Value" value={rule.value} mono />
              <Meta label="Version" value={formatRuleVersion(rule.majorVersion, rule.minorVersion)} mono />
              <Meta label="Effective From" value={rule.effectiveFrom ?? "—"} />
              <Meta label="Effective To" value={rule.effectiveTo ?? "—"} />
              <Meta label="Created By" value={rule.createdBy} />
              <Meta label="Published By" value={rule.publishedBy ?? "—"} />
              <Meta label="Description" value={rule.description} className="sm:col-span-2 lg:col-span-3" />
              <Meta label="Applicable Products" value={rule.applicableProducts.join(", ") || "All"} className="sm:col-span-2" />
              <Meta label="Customer Categories" value={rule.applicableCustomerCategories.join(", ") || "All"} />
              <Meta label="Property Types" value={rule.applicablePropertyTypes.join(", ") || "—"} />
              <Meta label="Occupancy" value={rule.applicableOccupancy.join(", ") || "—"} />
            </CardContent>
          </Card>
          <div className="mt-4 space-y-4">
            <RuleGovernancePanel rule={rule} />
            <RuleReviewAuditPanel ruleId={rule.ruleId} />
            <RuleSeverityAuditPanel ruleId={rule.ruleId} />
            <RuleInheritancePanel activeLevel={rule.inheritanceLevel} />
          </div>
        </TabsContent>

        <TabsContent value="dependencies">
          <RuleCompositionPanel ruleId={rule.ruleId} />
        </TabsContent>

        <TabsContent value="versions">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Immutable version lineage — published versions are never overwritten.
            </p>
            <RuleVersionHistoryTable ruleId={rule.ruleId} />
          </div>
        </TabsContent>

        <TabsContent value="simulator">
          <RuleSimulator rule={rule} />
        </TabsContent>
      </Tabs>
    </CreditRiskEngineShell>
  );
}

function Meta({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
