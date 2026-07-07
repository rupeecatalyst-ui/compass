"use client";

import { useMemo, useState } from "react";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { cn } from "@/lib/utils";
import { LENDER_CASE_STAGE_LABELS } from "@/constants/lender-pipeline";
import { EXPRESS_STAGES } from "@/lib/insights/lender-intelligence";
import {
  sortExpressRows,
  type ExpressSortKey,
  type LenderExpressRow,
  type StrategicPreference,
  type TerminalOutcome,
} from "@/lib/insights/mission-control";

const SORT_OPTIONS: { key: ExpressSortKey; label: string }[] = [
  { key: "confidence", label: "Confidence" },
  { key: "roi", label: "ROI" },
  { key: "momentum", label: "Momentum" },
  { key: "eta", label: "ETA" },
  { key: "revenue", label: "Revenue" },
  { key: "probability", label: "Probability" },
];

function PreferenceBadge({ pref }: { pref: StrategicPreference }) {
  const cls = {
    primary: "bg-amber-500/12 text-amber-800 border-amber-500/30 dark:text-amber-200",
    secondary: "bg-blue-500/10 text-blue-800 border-blue-500/25 dark:text-blue-200",
    exploratory: "bg-muted/50 text-muted-foreground border-border",
  }[pref];
  const label = pref === "primary" ? "Primary" : pref === "secondary" ? "Secondary" : "Exploratory";
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide", cls)}>
      {label}
    </span>
  );
}

function ProgressMarker({ leading }: { leading?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-4 w-10 items-center",
        leading && "drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]",
      )}
    >
      <div className="h-2.5 flex-1 rounded-l-sm bg-gradient-to-r from-slate-700 to-blue-600 dark:from-slate-300 dark:to-blue-500" />
      <div
        className="h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-blue-600 dark:border-l-blue-500"
        aria-hidden
      />
    </div>
  );
}

function ExpressRow({ row, rank }: { row: LenderExpressRow; rank: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-r from-card/80 to-card/40 p-3 shadow-sm",
        row.isPrimary && "ring-1 ring-amber-400/40",
        rank === 1 && "border-blue-500/25",
      )}
    >
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div className="flex min-w-[160px] items-center gap-2">
          <LenderLogo lender={row.lender} size="md" />
          <div>
            <p className="text-xs font-semibold">{row.lender}</p>
            <PreferenceBadge pref={row.strategicPreference} />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-[10px] sm:grid-cols-4 lg:grid-cols-7">
          <Metric label="Confidence" value={`${row.confidenceScore}%`} highlight />
          <Metric label="Approval Prob." value={`${row.approvalProbability}%`} />
          <Metric label="Stage" value={row.stageLabel} />
          <Metric label="Sub Stage" value={row.subStage ?? "—"} />
          <Metric label="ETA" value={row.etaLabel} />
          <Metric label="ROI" value={`${row.roi.toFixed(2)}%`} />
          <Metric label="Momentum" value={`${row.momentumScore}`} sub={row.momentumLabel} />
        </div>
      </div>

      <div className="relative px-1 pb-1 pt-6">
        <div className="absolute inset-x-0 top-1/2 flex h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500/90 to-blue-500 transition-all duration-700"
            style={{ width: `${row.progressPct}%` }}
          />
        </div>

        <div className="relative flex justify-between">
          {EXPRESS_STAGES.map((stageId, i) => (
            <div key={stageId} className="flex flex-col items-center">
              <div
                className={cn(
                  "mb-5 h-2 w-2 rounded-full border transition-colors",
                  i <= Math.round((row.progressPct / 100) * (EXPRESS_STAGES.length - 1))
                    ? "border-blue-500 bg-blue-500"
                    : "border-border bg-background",
                )}
              />
              <span className="hidden max-w-[52px] text-center text-[8px] leading-tight text-muted-foreground lg:block">
                {LENDER_CASE_STAGE_LABELS[stageId]}
              </span>
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-[calc(50%-4px)] transition-[left] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ left: `${row.progressPct}%` }}
        >
          <ProgressMarker leading={rank === 1} />
        </div>

        <div className="pointer-events-none absolute right-0 top-1/2 z-[1] flex -translate-y-1/2 flex-col items-center">
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-amber-500/70 to-transparent" />
          <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-amber-600/80">Finish</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-semibold tabular-nums", highlight ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>
        {value}
      </p>
      {sub && <p className="text-[8px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TerminalStrip({ outcomes }: { outcomes: TerminalOutcome[] }) {
  if (outcomes.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2">
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Terminal Outcomes
      </p>
      <div className="flex flex-wrap gap-2">
        {outcomes.map((o) => (
          <span
            key={o.lenderCaseId}
            className={cn(
              "rounded border px-2 py-1 text-[10px] font-medium",
              o.outcome === "hold"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200",
            )}
          >
            {o.lender} — {o.outcome === "hold" ? "Hold" : "Lost"}
            {o.reason ? ` · ${o.reason}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LenderExpress({
  rows,
  terminalOutcomes,
}: {
  rows: LenderExpressRow[];
  terminalOutcomes: TerminalOutcome[];
}) {
  const [sort, setSort] = useState<ExpressSortKey>("confidence");
  const sorted = useMemo(() => sortExpressRows(rows, sort), [rows, sort]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-slate-950/[0.02] via-background to-blue-500/[0.03] p-4 shadow-lg dark:from-slate-950/40">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600/80 dark:text-blue-400">
            Lender Express™
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Every Lender. One Journey. One Destination.
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Leading lender, lagging execution, and disbursement proximity — at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className={cn(
                "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                sort === opt.key
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No active lender journeys. Add cases from Lender Pipeline.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((row, i) => (
            <ExpressRow key={row.lenderCaseId} row={row} rank={i + 1} />
          ))}
        </div>
      )}

      <TerminalStrip outcomes={terminalOutcomes} />
    </div>
  );
}
