"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  formatPolicyVersion,
  POLICY_LIFECYCLE_LABELS,
  POLICY_STATUS_PILL_VARIANT,
} from "@/constants/credit-risk-engine";
import type { CreditRiskPolicySummary } from "@/types/credit-risk-engine";
import {
  getPolicyRuleReferences,
  transitionPolicyStatus,
  validatePolicyRules,
} from "@/lib/credit-risk-engine/policy-store";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { PolicyAuditPanel } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-audit-panel";
import { PolicyRuleDependencyPanel } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-rule-dependency-panel";
import { PolicyRuleSectionsPanel } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-rule-sections-panel";
import { PolicySimulatorPlaceholder } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-simulator-placeholder";
import { PolicyValidationWarnings } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-validation-warnings";
import { PolicyVersionHistoryTable } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-version-history-table";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PolicyDetailViewProps {
  policy: CreditRiskPolicySummary;
}

export function PolicyDetailView({ policy }: PolicyDetailViewProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";
  const ruleRefs = getPolicyRuleReferences(policy.policyId);
  const warnings = validatePolicyRules(policy.policyId);

  return (
    <CreditRiskEngineShell
      workspaceName="Policy Library"
      closeTo={WORKSPACE_CLOSE.POLICY_LIBRARY}
      title={policy.policyName}
      description={`${policy.policyCode} · ${formatPolicyVersion(policy.majorVersion, policy.minorVersion)}`}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
            <Link href={`${ROUTES.ADMIN_CREDIT_RISK_POLICY_BUILDER}?policyId=${policy.policyId}`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Policy
            </Link>
          </Button>
        </div>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Rule Composition</TabsTrigger>
          <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Version History</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs">Simulator</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-card border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div className="space-y-2">
                <CardTitle className="text-base">{policy.policyName}</CardTitle>
                <StatusPill variant={POLICY_STATUS_PILL_VARIANT[policy.status]}>
                  {POLICY_LIFECYCLE_LABELS[policy.status]}
                </StatusPill>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{policy.policyCode}</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Meta label="Lender" value={policy.lenderName} />
              <Meta label="Product" value={policy.productName} />
              <Meta label="Customer Category" value={policy.customerCategoryName ?? "—"} />
              <Meta label="Version" value={formatPolicyVersion(policy.majorVersion, policy.minorVersion)} mono />
              <Meta label="Priority" value={String(policy.priority)} />
              <Meta label="Approval Authority" value={policy.approvalAuthority} />
              <Meta label="Effective From" value={policy.effectiveFrom ?? "—"} />
              <Meta label="Effective To" value={policy.effectiveTo ?? "—"} />
              <Meta label="Created By" value={policy.createdBy} />
              <Meta label="Approved By" value={policy.approvedBy ?? "—"} />
              <Meta label="Published By" value={policy.publishedBy ?? "—"} />
              <Meta label="Published Date" value={policy.publishedDate ? new Date(policy.publishedDate).toLocaleDateString("en-IN") : "—"} />
              <Meta label="Last Modified" value={new Date(policy.lastModified).toLocaleString("en-IN")} />
              <Meta label="Description" value={policy.description} className="sm:col-span-2 lg:col-span-3" />
              <Meta label="Rule References" value={`${ruleRefs.length} rules from Rule Library`} />
            </CardContent>
          </Card>
          <div className="mt-4 space-y-4">
            <PolicyValidationWarnings warnings={warnings} />
            <LifecycleActions policy={policy} />
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <PolicyRuleSectionsPanel refs={ruleRefs} />
        </TabsContent>

        <TabsContent value="dependencies">
          <PolicyRuleDependencyPanel policyId={policy.policyId} />
        </TabsContent>

        <TabsContent value="versions">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Immutable version lineage — published versions are never overwritten.
            </p>
            <PolicyVersionHistoryTable policyId={policy.policyId} />
          </div>
        </TabsContent>

        <TabsContent value="simulator">
          <PolicySimulatorPlaceholder />
        </TabsContent>

        <TabsContent value="audit">
          <PolicyAuditPanel policyId={policy.policyId} />
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
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function LifecycleActions({ policy }: { policy: CreditRiskPolicySummary }) {
  const actions: Array<{ label: string; status: CreditRiskPolicySummary["status"] }> = [
    { label: "Validate", status: "validated" },
    { label: "Test", status: "testing" },
    { label: "Approve", status: "approved" },
    { label: "Publish", status: "published" },
    { label: "Archive", status: "archived" },
  ];

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lifecycle Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map(({ label, status }) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={policy.status === status}
            onClick={() => transitionPolicyStatus(policy.policyId, status, "Policy Admin")}
          >
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
