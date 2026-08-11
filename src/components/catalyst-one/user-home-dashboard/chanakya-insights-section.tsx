"use client";

/**
 * CO-C1-DASH-001 — CHANAKYA Insights (advisory projection from RM briefing SSOT).
 */

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { composeRmWorkspaceSnapshot } from "@/lib/enterprise-rm-workspace";
import { cn } from "@/lib/utils";

function toneClass(tone: string): string {
  if (tone === "danger") return "text-rose-700 dark:text-rose-300";
  if (tone === "warning") return "text-amber-700 dark:text-amber-300";
  if (tone === "success") return "text-emerald-700 dark:text-emerald-300";
  return "text-foreground";
}

export function ChanakyaInsightsSection() {
  const { user } = useAuthContext();
  const snap = useMemo(() => composeRmWorkspaceSnapshot(user), [user]);

  return (
    <section
      aria-label="CHANAKYA Insights"
      data-widget-slot="chanakya_insights"
      data-sprint="CO-C1-DASH-001"
      className="space-y-3"
    >
      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-sm">CHANAKYA Insights</CardTitle>
            <CardDescription className="text-[12px]">
              Advisory only — derived from ETE / EBI / workload intelligence. Never blocks workflow.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2">
          {snap.briefing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No insights for your desk right now.</p>
          ) : (
            snap.briefing.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <p className={cn("text-sm font-medium", toneClass(b.tone))}>{b.text}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{b.recommendedAction}</p>
                {b.href ? (
                  <Link
                    href={b.href}
                    className="mt-2 inline-block text-[12px] font-medium text-primary hover:underline"
                  >
                    Take action →
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
