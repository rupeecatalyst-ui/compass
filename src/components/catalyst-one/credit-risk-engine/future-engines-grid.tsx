"use client";

import { Construction } from "lucide-react";
import { FUTURE_RISK_ENGINE_PLACEHOLDERS } from "@/constants/credit-risk-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import { cn } from "@/lib/utils";

const statusVariant = {
  planned: "muted",
  in_design: "warning",
  foundation_ready: "info",
} as const;

const statusLabel = {
  planned: "Planned",
  in_design: "In Design",
  foundation_ready: "Foundation Ready",
} as const;

export function FutureEnginesGrid() {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Future Rule Engines</CardTitle>
        <CardDescription>
          Reserved placeholders — calculations implemented in later sprints.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FUTURE_RISK_ENGINE_PLACEHOLDERS.map((engine) => (
            <div
              key={engine.id}
              className={cn(
                "rounded-xl border border-dashed border-border/60 bg-muted/10 p-4",
                "transition-colors hover:border-primary/30 hover:bg-muted/20",
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Construction className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">{engine.name}</p>
                </div>
                <StatusPill variant={statusVariant[engine.status]} dot={false}>
                  {statusLabel[engine.status]}
                </StatusPill>
              </div>
              <p className="text-xs text-muted-foreground">{engine.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
