"use client";

import { cn } from "@/lib/utils";
import type { ExecutiveKpis } from "@/lib/insights/mission-control";
import { formatINR } from "@/lib/format-currency";

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const border = {
    default: "border-border/60",
    success: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
  }[tone ?? "default"];

  return (
    <div className={cn("rounded-lg border px-3 py-2.5 shadow-sm", border)}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ExecutiveKpiStrip({ kpis }: { kpis: ExecutiveKpis }) {
  const statusTone =
    kpis.missionStatus === "completed" || kpis.missionStatus === "on_track"
      ? "success"
      : kpis.missionStatus === "at_risk"
        ? "warning"
        : "danger";

  return (
    <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-border/70 bg-background/95 p-2 shadow-sm backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Executive KPI Strip
        </span>
        <span className="text-[10px] text-muted-foreground">Mission Control</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
        <KpiCard label="Mission Status" value={kpis.missionStatusLabel} tone={statusTone} />
        <KpiCard label="Loan Health" value={`${kpis.loanHealth}%`} tone={kpis.loanHealth >= 70 ? "success" : "warning"} />
        <KpiCard label="Rec. Confidence" value={`${kpis.recommendationConfidence}%`} sub="Chanakya" tone="info" />
        <KpiCard
          label="Expected Revenue"
          value={kpis.revenueReady ? formatINR(kpis.expectedRevenue) : "Awaiting Payout Configuration"}
          tone={kpis.revenueReady ? "default" : "warning"}
        />
        <KpiCard
          label="Expected Payout"
          value={kpis.revenueReady ? formatINR(kpis.expectedPayout) : "Not Yet Calculated"}
          tone={kpis.revenueReady ? "default" : "warning"}
        />
        <KpiCard
          label="Best ROI"
          value={kpis.revenueReady ? `${kpis.bestRoi.toFixed(2)}%` : "Not Yet Calculated"}
          sub={kpis.revenueReady ? kpis.bestRoiLender : "Awaiting Payout Configuration"}
          tone={kpis.revenueReady ? "success" : "warning"}
        />
        <KpiCard label="Average TAT" value={`${kpis.averageTat}d`} tone={kpis.averageTat > 5 ? "warning" : "default"} />
        <KpiCard label="Documents" value={`${kpis.documentsCompletion}%`} />
        <KpiCard label="Tasks" value={`${kpis.tasksCompletion}%`} />
        <KpiCard label="Risk Score" value={`${kpis.riskScore}`} tone={kpis.riskScore > 40 ? "danger" : "default"} />
      </div>
    </div>
  );
}
