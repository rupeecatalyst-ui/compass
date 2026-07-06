"use client";

import { ArrowDown } from "lucide-react";
import {
  CREDIT_RISK_CONSUMER_SYSTEMS,
  POLICY_HIERARCHY_LEVELS,
} from "@/config/credit-risk-navigation";
import { POLICY_LIFECYCLE_ORDER, POLICY_LIFECYCLE_LABELS } from "@/constants/credit-risk-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";

export function PolicyHierarchyPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="glass-card border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Policy Hierarchy</CardTitle>
          <CardDescription>
            Reusable configuration tree — unlimited records at every level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {POLICY_HIERARCHY_LEVELS.map((level, index) => (
              <li key={level.key} className="flex items-center gap-2">
                <span className="flex h-7 min-w-[7rem] items-center rounded-md bg-muted/50 px-2 text-xs font-medium">
                  {level.label}
                </span>
                {index < POLICY_HIERARCHY_LEVELS.length - 1 && (
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Policy Lifecycle</CardTitle>
          <CardDescription>
            Only published policies become active for downstream engines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {POLICY_LIFECYCLE_ORDER.map((status, index) => (
              <div key={status} className="flex items-center gap-2">
                <StatusPill
                  variant={
                    status === "published"
                      ? "success"
                      : status === "draft"
                        ? "muted"
                        : "info"
                  }
                >
                  {POLICY_LIFECYCLE_LABELS[status]}
                </StatusPill>
                {index < POLICY_LIFECYCLE_ORDER.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Downstream Consumers</CardTitle>
          <CardDescription>
            Single Source of Truth — no independent copies of business rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CREDIT_RISK_CONSUMER_SYSTEMS.map((system) => (
              <span
                key={system}
                className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium"
              >
                {system}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
