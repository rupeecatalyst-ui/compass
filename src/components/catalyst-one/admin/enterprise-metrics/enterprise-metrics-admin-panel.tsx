"use client";

/**
 * CO-PERF-001 / CO-ARCH-005 — Administration → System → Enterprise Metrics
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, RefreshCw, FlaskConical } from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { MISSION_CONTROL_REFRESH_INTERVALS } from "@/constants/mission-control-snapshot";
import type { EmeAdminStatus, EmeRunSummary } from "@/types/enterprise-metrics-engine";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function EnterpriseMetricsAdminPanel() {
  const [status, setStatus] = useState<EmeAdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [intervalId, setIntervalId] = useState("daily");
  const [nightHour, setNightHour] = useState("2");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/enterprise-metrics?view=status");
      const body = (await res.json()) as ApiEnvelope<EmeAdminStatus>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load EME status");
      }
      setStatus(body.data);
      if (body.data.missionControl?.scheduleIntervalId) {
        setIntervalId(body.data.missionControl.scheduleIntervalId);
      }
      if (body.data.chanakyaRadar?.nightHourLocal != null) {
        setNightHour(String(body.data.chanakyaRadar.nightHourLocal));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (action: string, dryRun = false) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/enterprise-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dryRun }),
      });
      const body = (await res.json()) as ApiEnvelope<{ run: EmeRunSummary }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Compute failed");
      }
      toast.success(
        dryRun
          ? `Dry run complete · ${body.data?.run.snapshotsWritten ?? 0} would write`
          : `Recalculate complete · ${body.data?.run.durationMs ?? 0} ms`,
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Compute failed");
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/enterprise-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_mission_control_schedule",
          intervalId,
          enabled: true,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Failed to save schedule");
      }
      toast.success("Mission Control Snapshot schedule saved");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setBusy(false);
    }
  };

  const saveNightSchedule = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/enterprise-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_chanakya_night_schedule",
          hourLocal: Number(nightHour),
          enabled: true,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Failed to save Night Mode hour");
      }
      toast.success("CHANAKYA Night Mode schedule saved");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Night Mode");
    } finally {
      setBusy(false);
    }
  };

  const healthTone =
    status?.healthStatus === "healthy"
      ? "text-emerald-700 dark:text-emerald-300"
      : status?.healthStatus === "degraded"
        ? "text-amber-700 dark:text-amber-300"
        : "text-muted-foreground";

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6"
      data-sprint="CO-PERF-001 CO-ARCH-005"
    >
      <header className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Administration · System
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Enterprise Metrics Engine</h1>
        <p className="text-sm text-muted-foreground">
          Computation layer for KPIs, health scores, and Mission Control Snapshots. Entities remain
          the source of truth. Manual refresh is Administrator-only.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          disabled={busy}
          onClick={() => void runAction("force_recalculate")}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Force Recalculate (includes Mission Control)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          disabled={busy}
          onClick={() => void runAction("dry_run", true)}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Dry Run
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 gap-1.5"
          disabled={loading || busy}
          onClick={() => void refresh()}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      {loading && !status ? (
        <ChanakyaLoadingExperience
          module="administration"
          statusLabel="Reviewing Enterprise Metrics..."
          density="inline"
          useEbiSignals={false}
        />
      ) : status ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mission Control Snapshot Schedule</CardTitle>
              <CardDescription>
                Executives view certified snapshots only. Configure refresh frequency here. Last
                snapshot:{" "}
                {status.missionControl?.lastSnapshotAt
                  ? new Date(status.missionControl.lastSnapshotAt).toLocaleString()
                  : "Never"}
                {status.missionControl?.snapshotVersion
                  ? ` · ${status.missionControl.snapshotVersion}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] space-y-1.5">
                <p className="text-xs text-muted-foreground">Refresh interval</p>
                <Select value={intervalId} onValueChange={setIntervalId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {MISSION_CONTROL_REFRESH_INTERVALS.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={busy}
                onClick={() => void saveSchedule()}
              >
                Save Schedule
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">CHANAKYA Night Mode</CardTitle>
              <CardDescription>
                Heavy scoring and Radar / Enterprise Intelligence snapshots run in Night Mode
                (default 02:00). Day Mode remains lightweight. Last Radar snapshot:{" "}
                {status.chanakyaRadar?.lastSnapshotAt
                  ? new Date(status.chanakyaRadar.lastSnapshotAt).toLocaleString()
                  : "Never"}
                {status.chanakyaRadar?.snapshotVersion
                  ? ` · ${status.chanakyaRadar.snapshotVersion}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] space-y-1.5">
                <p className="text-xs text-muted-foreground">Night hour (local preference)</p>
                <Select value={nightHour} onValueChange={setNightHour}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}:00
                        {h === 2 ? " (Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={busy}
                onClick={() => void saveNightSchedule()}
              >
                Save Night Mode
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Health Status", value: status.healthStatus, className: healthTone },
              {
                label: "Last Calculation",
                value: status.lastCalculationTime
                  ? new Date(status.lastCalculationTime).toLocaleString()
                  : "Never",
              },
              {
                label: "Duration",
                value: status.lastDurationMs != null ? `${status.lastDurationMs} ms` : "—",
              },
              {
                label: "Records Processed",
                value: status.lastRecordsProcessed ?? "—",
              },
              { label: "Failures", value: status.lastFailures ?? "—" },
              {
                label: "Next Scheduled Run",
                value: status.nextScheduledRun
                  ? new Date(status.nextScheduledRun).toLocaleString()
                  : "—",
              },
            ].map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className={`text-lg capitalize ${card.className ?? ""}`}>
                    {card.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snapshot Inventory</CardTitle>
              <CardDescription>{status.scheduleNote}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
              <p>
                Nightly:{" "}
                <span className="font-semibold tabular-nums">{status.snapshotCounts.nightly}</span>
              </p>
              <p>
                Event:{" "}
                <span className="font-semibold tabular-nums">{status.snapshotCounts.event}</span>
              </p>
              <p>
                Live cache:{" "}
                <span className="font-semibold tabular-nums">{status.snapshotCounts.live}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Runs</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-2 font-medium">Started</th>
                    <th className="py-1.5 pr-2 font-medium">Type</th>
                    <th className="py-1.5 pr-2 font-medium">Status</th>
                    <th className="py-1.5 pr-2 font-medium">Duration</th>
                    <th className="py-1.5 pr-2 font-medium">Records</th>
                    <th className="py-1.5 pr-2 font-medium">Written</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentRuns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-muted-foreground">
                        No runs yet — use Force Recalculate.
                      </td>
                    </tr>
                  ) : (
                    status.recentRuns.map((run) => (
                      <tr key={run.id} className="border-t border-border/50">
                        <td className="py-1.5 pr-2 tabular-nums">
                          {new Date(run.startedAt).toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-2">
                          {run.runType}
                          {run.dryRun ? " (dry)" : ""}
                        </td>
                        <td className="py-1.5 pr-2 capitalize">{run.status}</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {run.durationMs != null ? `${run.durationMs} ms` : "—"}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">{run.recordsProcessed}</td>
                        <td className="py-1.5 pr-2 tabular-nums">{run.snapshotsWritten}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
