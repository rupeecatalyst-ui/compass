"use client";

import Link from "next/link";
import { GitBranch, Link2, Network } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  getRuleDependsOn,
  getRuleDependents,
  getRuleImpactSummary,
  getRulePolicyBindings,
} from "@/lib/credit-risk-engine/rule-store";
import { RuleScopeBadge, RuleTypeBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-category-badge";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RuleCompositionPanelProps {
  ruleId: string;
}

export function RuleCompositionPanel({ ruleId }: RuleCompositionPanelProps) {
  const dependsOn = getRuleDependsOn(ruleId);
  const dependents = getRuleDependents(ruleId);
  const policies = getRulePolicyBindings(ruleId);
  const impact = getRuleImpactSummary(ruleId);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ImpactStat label="Depends On" value={dependsOn.length} />
        <ImpactStat label="Used By Rules" value={impact.dependentRuleCount} />
        <ImpactStat label="Used By Policies" value={impact.policyBindingCount} />
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Depends On
          </CardTitle>
          <CardDescription>Upstream rules required before this rule can evaluate.</CardDescription>
        </CardHeader>
        <CardContent>
          {dependsOn.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upstream rule dependencies.</p>
          ) : (
            <RuleNodeList nodes={dependsOn} />
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Used By (Rules)
          </CardTitle>
          <CardDescription>Downstream rules that depend on this rule — impact analysis foundation.</CardDescription>
        </CardHeader>
        <CardContent>
          {dependents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No downstream rule dependents.</p>
          ) : (
            <RuleNodeList nodes={dependents} />
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4" />
            Used By (Policies)
          </CardTitle>
          <CardDescription>Lending policies that reference this rule.</CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not referenced by any policy yet.</p>
          ) : (
            <ul className="space-y-2">
              {policies.map((dep) => (
                <li
                  key={dep.id}
                  className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5"
                >
                  <p className="text-sm font-medium">{dep.policyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {dep.lenderName} · {dep.productName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RuleDependencyGraphPlaceholder ruleId={ruleId} />
    </div>
  );
}

function ImpactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function RuleNodeList({
  nodes,
}: {
  nodes: ReturnType<typeof getRuleDependsOn>;
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <li key={node.ruleId}>
          <Link
            href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${node.ruleId}`}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/20"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {node.ruleName}
                <span className="ml-1.5 inline-flex align-middle">
                  <RuleSeverityBadge severity={node.ruleSeverity} />
                </span>
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">{node.ruleCode}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1">
              <RuleScopeBadge scope={node.ruleScope} />
              <RuleTypeBadge ruleType={node.ruleType} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Reserved slot for interactive dependency graph — future sprint. */
function RuleDependencyGraphPlaceholder({ ruleId }: { ruleId: string }) {
  return (
    <Card className="border-dashed border-border/60 bg-muted/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Dependency Graph</CardTitle>
        <CardDescription>
          Interactive visualization and impact analysis for rule {ruleId} — coming in a future sprint.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">Graph visualization placeholder</p>
        </div>
      </CardContent>
    </Card>
  );
}
