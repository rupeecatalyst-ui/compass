"use client";

import { useMemo, useState } from "react";
import {
  DEAL_CONSUMER_ENABLEMENT_ORDER,
  DEAL_CUTOVER_ACTIVATION_PHASES,
  DEAL_CUTOVER_MONITORING,
} from "@/constants/enterprise-deal-registry";
import { buildDealCutoverHealthSnapshot } from "@/lib/enterprise-deal/cutover-health";
import { runDealDalPerformanceBenchmark } from "@/lib/enterprise-deal/performance-benchmark";
import { buildDealReconciliationReport } from "@/lib/enterprise-deal/reconciliation-report";
import {
  buildDealIdleFlagEnvLines,
  runClientDealRollbackDiagnosticsCleanup,
} from "@/lib/enterprise-deal/rollback-automation";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function severityVariant(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "error" as const;
  if (severity === "warning") return "warning" as const;
  return "muted" as const;
}

export function DealCutoverHealthPanel() {
  const [tick, setTick] = useState(0);
  const health = useMemo(() => buildDealCutoverHealthSnapshot(), [tick]);
  const reconcile = useMemo(() => buildDealReconciliationReport(), [tick]);
  const [bench, setBench] = useState<ReturnType<typeof runDealDalPerformanceBenchmark> | null>(
    null,
  );

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Enterprise Deal Cutover Health</CardTitle>
            <CardDescription>
              CO-ARCH-002 Wave 6 — monitoring surface. Does not enable production flags.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setTick((n) => n + 1)}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={health.deliveryIdle ? "success" : "warning"}>
              {health.deliveryIdle ? "Idle (flags OFF)" : "Flags active"}
            </StatusPill>
            <StatusPill variant={reconcile.pass ? "success" : "error"}>
              Reconcile {reconcile.pass ? "PASS" : "GATE FAIL"}
            </StatusPill>
            <span className="text-[10px] text-muted-foreground">as of {health.at}</span>
          </div>

          <p className="text-sm text-muted-foreground">{health.readinessNote}</p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Mapped Deals" value={String(health.mappedDealCount)} />
            <Metric label="Reconcile failures" value={String(health.reconcileFailureCount)} />
            <Metric
              label="Shadow mismatch rate"
              value={
                health.shadowMismatchRate == null
                  ? "—"
                  : `${(health.shadowMismatchRate * 100).toFixed(1)}%`
              }
            />
            <Metric label="My Deals shadow" value={health.myDealsShadowStatus} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alerts
            </p>
            {health.alerts.map((a) => (
              <div
                key={a.code}
                className="flex items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{a.code}</p>
                  <p className="text-[11px] text-muted-foreground">{a.message}</p>
                </div>
                <StatusPill variant={severityVariant(a.severity)}>{a.severity}</StatusPill>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Flag matrix (runtime)
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              <FlagRow label="API" on={health.flags.api} />
              <FlagRow label="Dual-write" on={health.flags.dualWrite} />
              <FlagRow label="Shadow Read" on={health.flags.shadowRead} />
              <FlagRow label="Port runtime" on={health.flags.portRuntime} />
              <FlagRow label="Import" on={health.flags.importEnabled} />
              <FlagRow label="Block local write" on={health.flags.blockLocalWrite} />
              {DEAL_CONSUMER_ENABLEMENT_ORDER.map((m) => (
                <FlagRow key={m} label={m} on={health.flags.consumers[m]} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Activation phases (strategy)</CardTitle>
            <CardDescription>
              Ordered enablement after final ARB — not executed by Wave 6 delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEAL_CUTOVER_ACTIVATION_PHASES.map((phase) => (
              <div key={phase.id} className="rounded-lg border border-border/50 px-3 py-2">
                <p className="text-sm font-medium">{phase.title}</p>
                <p className="text-[11px] text-muted-foreground">{phase.description}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Gate: {phase.gate}</p>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              Consumer order: {DEAL_CONSUMER_ENABLEMENT_ORDER.join(" → ")}. Material mismatch
              threshold {(DEAL_CUTOVER_MONITORING.materialMismatchRate * 100).toFixed(0)}%.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Validation & rollback tools</CardTitle>
            <CardDescription>Client diagnostics only — env changes remain manual / Vercel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-[11px] text-muted-foreground">
              {reconcile.findings.map((f) => (
                <p key={f}>• {f}</p>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const result = runDealDalPerformanceBenchmark(40);
                  setBench(result);
                  toast.message(
                    result.withinBudget
                      ? `DAL overhead ${result.overheadMs}ms (within budget)`
                      : `DAL overhead ${result.overheadMs}ms (over budget ${result.budgetMs}ms)`,
                  );
                }}
              >
                Run DAL benchmark
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const text = buildDealIdleFlagEnvLines().join("\n");
                  void navigator.clipboard.writeText(text);
                  toast.success("Idle flag matrix copied");
                }}
              >
                Copy idle flag matrix
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  runClientDealRollbackDiagnosticsCleanup();
                  setTick((n) => n + 1);
                  toast.success("Reconcile diagnostics cleared");
                }}
              >
                Clear reconcile log
              </Button>
            </div>
            {bench ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                direct {bench.directLoadAvgMs}ms · dal {bench.dalLoadAvgMs}ms · overhead{" "}
                {bench.overheadMs}ms · budget {bench.budgetMs}ms ·{" "}
                {bench.withinBudget ? "PASS" : "REVIEW"}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FlagRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/40 px-2 py-1 text-xs">
      <span className="truncate font-mono">{label}</span>
      <StatusPill variant={on ? "warning" : "muted"}>{on ? "ON" : "OFF"}</StatusPill>
    </div>
  );
}
