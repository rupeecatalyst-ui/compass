"use client";

import { getCreditRiskAuditTrail } from "@/lib/credit-risk-engine/audit-store";
import { getRuleLibraryDashboardMetrics } from "@/lib/credit-risk-engine/rule-store";
import { ROUTES } from "@/constants/routes";
import { CreditRiskOverviewKpiGrid } from "@/components/catalyst-one/credit-risk-engine/credit-risk-overview-kpi-grid";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { FutureEnginesGrid } from "@/components/catalyst-one/credit-risk-engine/future-engines-grid";
import { PolicyHierarchyPanel } from "@/components/catalyst-one/credit-risk-engine/policy-hierarchy-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookMarked } from "lucide-react";

export function CreditRiskOverviewDashboard() {
  const recentAudit = getCreditRiskAuditTrail().slice(0, 4);
  const ruleMetrics = getRuleLibraryDashboardMetrics();

  return (
    <CreditRiskEngineShell
      title="Overview"
      description="Enterprise policy administration console — Single Source of Truth for lending policies."
    >
      <div className="space-y-6">
        <CreditRiskOverviewKpiGrid />
        <PolicyHierarchyPanel />
        <Card className="glass-card border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Rule Library</CardTitle>
              <CardDescription>
                {ruleMetrics.totalRules} reusable rules · {ruleMetrics.publishedRules} published
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href={ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}>
                <BookMarked className="h-3.5 w-3.5" />
                Open Rule Library
              </Link>
            </Button>
          </CardHeader>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest policy changes from the audit trail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAudit.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2"
                >
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.policyName} · {entry.versionLabel} · {entry.actor}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <FutureEnginesGrid />
        </div>
      </div>
    </CreditRiskEngineShell>
  );
}
