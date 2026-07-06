"use client";

import { AlertTriangle, Info } from "lucide-react";
import type { PolicyValidationWarning } from "@/types/credit-risk-engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PolicyValidationWarningsProps {
  warnings: PolicyValidationWarning[];
  className?: string;
}

export function PolicyValidationWarnings({ warnings, className }: PolicyValidationWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <Card className={cn("glass-card border-border/60", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Rule Composition Warnings
        </CardTitle>
        <CardDescription>
          Non-blocking validation — save is allowed. Review before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map((w, i) => (
          <div
            key={`${w.code}-${i}`}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
              w.severity === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-warning/30 bg-warning/5 text-foreground",
            )}
          >
            {w.severity === "warning" ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{w.message}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
