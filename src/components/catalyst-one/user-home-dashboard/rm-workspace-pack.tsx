"use client";

/**
 * CO-BIZ-005 — RM Workspace pack (projection UI).
 * Mounted on User Home Dashboard — canonical RM morning desk.
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CheckSquare,
  FileUp,
  Phone,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RM_PRIORITY_LABELS, RM_WORKSPACE_NAME } from "@/constants/enterprise-rm-workspace";
import { composeRmWorkspaceSnapshot } from "@/lib/enterprise-rm-workspace";
import type { RmPriorityBand } from "@/types/enterprise-rm-workspace";
import { cn } from "@/lib/utils";

function bandClass(band: RmPriorityBand): string {
  switch (band) {
    case "critical":
      return "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200";
    case "high":
      return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    case "medium":
      return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function toneClass(tone: string): string {
  if (tone === "danger") return "text-rose-700 dark:text-rose-300";
  if (tone === "warning") return "text-amber-700 dark:text-amber-300";
  if (tone === "success") return "text-emerald-700 dark:text-emerald-300";
  return "text-foreground";
}

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
}

const QUICK_ICONS = {
  call_customer: Phone,
  open_opportunity: Target,
  open_deal: Briefcase,
  upload_document: FileUp,
  assign_task: CheckSquare,
  create_note: StickyNote,
} as const;

export function RmWorkspacePack() {
  const { user } = useAuthContext();
  const snap = useMemo(() => composeRmWorkspaceSnapshot(user), [user]);

  const { today, pipeline, priorities, briefing, customers, productivity, quickActions } = snap;

  return (
    <div className="space-y-6" data-rm-workspace="co-biz-005">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {RM_WORKSPACE_NAME}
          </p>
          <h2 className="text-base font-semibold tracking-tight">
            Your day · {snap.identity.displayName}
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Projection of ETE · EBI · Documents · Deals — no parallel engines
        </p>
      </div>

      {/* Phase 7 — Quick Actions */}
      <section aria-label="RM Quick Actions" className="space-y-2">
        <h3 className="text-sm font-semibold">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => {
            const Icon = QUICK_ICONS[a.id] ?? CheckSquare;
            return (
              <Button key={a.id} asChild variant="outline" size="sm" className="h-9 gap-2">
                <Link href={a.href} title={a.description}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {a.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </section>

      {/* Phase 4 — Chanakya Daily Briefing */}
      <section aria-label="Chanakya Daily Briefing">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-sm">CHANAKYA Daily Briefing</CardTitle>
              <CardDescription className="text-[12px]">
                Advisory only — never blocks workflow
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            {briefing.map((b) => (
              <div key={b.id} className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <p className={cn("text-sm font-medium", toneClass(b.tone))}>{b.text}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{b.recommendedAction}</p>
                {b.href ? (
                  <Link href={b.href} className="mt-2 inline-block text-[12px] font-medium text-primary hover:underline">
                    Take action →
                  </Link>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Phase 1 — Today's Work */}
      <section aria-label="Today's Work" className="space-y-3">
        <h3 className="text-sm font-semibold">Today&apos;s Work</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            today.followUps,
            today.overdue,
            today.upcomingMeetings,
            today.pendingDocumentRequests,
            today.pendingLenderActions,
          ].map((b) => (
            <Card key={b.id}>
              <CardHeader className="space-y-1 p-4">
                <CardDescription className="text-[11px] uppercase tracking-wide">
                  {b.label}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">{b.count}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Phase 3 — Priority Engine */}
      <section aria-label="Priority Engine" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Priorities
        </h3>
        {priorities.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No prioritised work right now.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {priorities.slice(0, 8).map((p) => (
              <Link
                key={p.id}
                href={p.href || "#"}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:opacity-95",
                  bandClass(p.band),
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-[11px] opacity-80">{p.reason}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide">
                  {RM_PRIORITY_LABELS[p.band]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Phase 2 — My Pipeline */}
      <section aria-label="My Pipeline" className="space-y-3">
        <h3 className="text-sm font-semibold">My Pipeline</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="My Opportunities" value={String(pipeline.myOpportunities)} />
          <MetricCard label="My Active Deals" value={String(pipeline.myActiveDeals)} />
          <MetricCard label="My Disbursals" value={String(pipeline.myDisbursals)} />
          <MetricCard label="My Lost Cases" value={String(pipeline.myLostCases)} />
          <MetricCard label="Pipeline Value" value={formatInr(pipeline.pipelineValue)} />
          <MetricCard label="Conversion Rate" value={`${pipeline.conversionRatePct.toFixed(1)}%`} />
          <MetricCard label="Average TAT" value={`${pipeline.averageTatDays.toFixed(1)} days`} />
          <MetricCard label="EBI Focus RM" value={pipeline.focusRm || snap.identity.displayName} />
        </div>
      </section>

      {/* Phase 6 — Productivity */}
      <section aria-label="Productivity Insights" className="space-y-3">
        <h3 className="text-sm font-semibold">Productivity Insights</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Tasks completed today" value={String(productivity.tasksCompletedToday)} />
          <MetricCard
            label="Average completion time"
            value={
              productivity.averageCompletionHours == null
                ? "—"
                : `${productivity.averageCompletionHours}h`
            }
          />
          <MetricCard label="Cases closed (disbursed + lost)" value={String(productivity.casesClosed)} />
        </div>
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p>{productivity.pipelineMovementLabel}</p>
            <p className="text-muted-foreground">{productivity.weeklyTrendLabel}</p>
          </CardContent>
        </Card>
      </section>

      {/* Phase 5 — Customer Snapshots */}
      <section aria-label="Customer Snapshots" className="space-y-3">
        <h3 className="text-sm font-semibold">Customer Snapshots</h3>
        {customers.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No assigned open work yet — snapshots appear from your ETE queue.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {customers.map((c) => (
              <Card key={c.id}>
                <CardHeader className="space-y-1 p-4 pb-2">
                  <CardTitle className="text-sm">{c.customerLabel}</CardTitle>
                  <CardDescription className="text-[12px]">
                    {c.currentStage} · {c.pendingActions} pending action
                    {c.pendingActions === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 p-4 pt-0 text-[12px] text-muted-foreground">
                  <p>Documents: {c.documentStatus}</p>
                  <p>Last interaction: {c.lastInteraction}</p>
                  <p>Risk: {c.riskIndicators.join(" · ")}</p>
                  {c.href ? (
                    <Link href={c.href} className="inline-block pt-1 font-medium text-primary hover:underline">
                      Open →
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="space-y-1 p-4">
        <CardDescription className="text-[11px] uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-lg tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
