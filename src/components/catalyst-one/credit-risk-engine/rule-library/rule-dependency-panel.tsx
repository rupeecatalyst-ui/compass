"use client";

import { Link2 } from "lucide-react";
import { getRuleDependencies } from "@/lib/credit-risk-engine/rule-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RuleDependencyPanelProps {
  ruleId: string;
}

export function RuleDependencyPanel({ ruleId }: RuleDependencyPanelProps) {
  const dependencies = getRuleDependencies(ruleId);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Used By
        </CardTitle>
        <CardDescription>
          Policies that reference this rule — no duplicated business logic across lenders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This rule is not referenced by any policy yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {dependencies.map((dep) => (
              <li
                key={dep.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{dep.policyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {dep.lenderName} · {dep.productName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
