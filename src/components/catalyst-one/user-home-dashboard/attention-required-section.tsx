"use client";

/**
 * CO-C1-DASH-001 — Attention Required (ETE / RM priority projection).
 */

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { RM_PRIORITY_LABELS } from "@/constants/enterprise-rm-workspace";
import { composeRmWorkspaceSnapshot } from "@/lib/enterprise-rm-workspace";
import type { RmPriorityBand } from "@/types/enterprise-rm-workspace";
import { cn } from "@/lib/utils";

function bandClass(band: RmPriorityBand): string {
  switch (band) {
    case "critical":
      return "border-rose-500/40 bg-rose-500/10";
    case "high":
      return "border-amber-500/40 bg-amber-500/10";
    case "medium":
      return "border-sky-500/30 bg-sky-500/10";
    default:
      return "border-border bg-muted/30";
  }
}

export function AttentionRequiredSection() {
  const { user } = useAuthContext();
  const snap = useMemo(() => composeRmWorkspaceSnapshot(user), [user]);
  const items = snap.priorities.slice(0, 12);

  return (
    <section
      aria-label="Attention Required"
      data-widget-slot="attention_required"
      data-sprint="CO-C1-DASH-001"
      className="space-y-3"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
            Attention Required
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Actionable items from Enterprise Task Engine priorities — your scope.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No attention items in your queue right now.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80">
          <div className="hidden grid-cols-[7rem_minmax(0,1.2fr)_minmax(0,1.4fr)_4rem_5.5rem] gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>Priority</span>
            <span>Customer / Deal</span>
            <span>Issue</span>
            <span>Score</span>
            <span>Action</span>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((p) => (
              <li key={p.id}>
                <Link
                  href={p.href || "#"}
                  className={cn(
                    "grid gap-1 px-3 py-2.5 text-sm transition-colors hover:bg-muted/30 md:grid-cols-[7rem_minmax(0,1.2fr)_minmax(0,1.4fr)_4rem_5.5rem] md:items-center md:gap-2",
                    bandClass(p.band),
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {RM_PRIORITY_LABELS[p.band]}
                  </span>
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="truncate text-[12px] text-muted-foreground md:text-foreground/80">
                    {p.reason}
                  </span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {p.score}
                  </span>
                  <span className="text-[12px] font-medium text-primary">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
