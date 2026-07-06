"use client";

import { ArrowDown } from "lucide-react";
import { RULE_INHERITANCE_LABELS, RULE_INHERITANCE_ORDER } from "@/constants/rule-inheritance";
import type { RuleInheritanceLevel } from "@/types/rule-library";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RuleInheritancePanelProps {
  activeLevel?: RuleInheritanceLevel;
  className?: string;
}

/** Visualizes override hierarchy — lower levels override higher when configured. */
export function RuleInheritancePanel({ activeLevel, className }: RuleInheritancePanelProps) {
  return (
    <Card className={cn("glass-card border-border/60", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Inheritance Priority</CardTitle>
        <CardDescription>
          Global → Organization → Lender → Product → Customer → Loan. Lower levels override higher levels when explicitly configured.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1">
          {RULE_INHERITANCE_ORDER.map((level, index) => (
            <li key={level} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 min-w-[7.5rem] items-center rounded-md px-2 text-xs font-medium",
                  activeLevel === level
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/50 text-foreground",
                )}
              >
                {RULE_INHERITANCE_LABELS[level]}
              </span>
              {index < RULE_INHERITANCE_ORDER.length - 1 && (
                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
