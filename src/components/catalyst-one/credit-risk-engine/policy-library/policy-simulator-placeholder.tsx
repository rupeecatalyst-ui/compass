"use client";

import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PolicySimulatorPlaceholder() {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" />
          Policy Simulator
        </CardTitle>
        <CardDescription>
          Future functionality — select a customer profile, evaluate this policy against rule references, and display pass/fail per rule. No calculations in this sprint.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
          <FlaskConical className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">Simulator coming soon</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Select Customer → Evaluate Policy → Display Pass / Fail / Rule Results
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
