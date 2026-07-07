"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  LENDER_CASE_STAGES,
  LENDER_CASE_STAGE_LABELS,
  LENDER_PROBABILITY_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import { formatINR } from "@/lib/format-currency";
import type { LenderCaseStage, LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

/** Main-line progression followed by branch terminals (hold / lost). */
const RACE_STAGE_ORDER: LenderCaseStage[] = [
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
  "hold",
  "lost",
];

const MAIN_LINE_COUNT = 6;

const PROB_RANK: Record<string, number> = {
  very_high: 6,
  high: 5,
  medium: 4,
  low: 3,
  very_low: 2,
  rejected: 1,
  withdrawn: 0,
};

function daysSince(iso: string) {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
}

function stageIndex(stage: LenderCaseStage): number {
  const idx = RACE_STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

function formatUpdated(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildRaceInsightsMessages(loan: LoanFile, cases: LoanLenderExecution[]): string[] {
  const active = cases.filter((c) => c.status !== "closed");
  const messages: string[] = [];

  const ranked = [...active].sort((a, b) => {
    const sa = stageIndex(normalizeLenderCaseStage(a.caseStage));
    const sb = stageIndex(normalizeLenderCaseStage(b.caseStage));
    if (sb !== sa) return sb - sa;
    return (PROB_RANK[b.probability ?? ""] ?? 0) - (PROB_RANK[a.probability ?? ""] ?? 0);
  });

  const leader = ranked[0];
  if (leader) {
    const ls = normalizeLenderCaseStage(leader.caseStage);
    if (ls === "disbursed") {
      messages.push(`${leader.lender} has completed disbursement.`);
    } else if (ls !== "lost" && ls !== "hold") {
      messages.push(`${leader.lender} is leading the race.`);
    }
  }

  active.forEach((c) => {
    const idle = daysSince(c.updatedAt);
    if (idle >= 4) {
      messages.push(`${c.lender} has been idle for ${idle} days.`);
    }
  });

  active.forEach((c) => {
    const ls = normalizeLenderCaseStage(c.caseStage);
    if (ls === "final_approved") {
      messages.push(`${c.lender} has reached Final Approval.`);
    }
    if (ls === "soft_approved") {
      messages.push(`${c.lender} cleared Soft Approval.`);
    }
  });

  const bestProb = [...active]
    .filter((c) => c.probability && c.probability !== "rejected" && c.probability !== "withdrawn")
    .sort((a, b) => (PROB_RANK[b.probability ?? ""] ?? 0) - (PROB_RANK[a.probability ?? ""] ?? 0))[0];

  if (bestProb && !bestProb.isPrimary) {
    messages.push(`Recommend promoting ${bestProb.lender} as Primary.`);
  }

  const holdCount = active.filter((c) => normalizeLenderCaseStage(c.caseStage) === "hold").length;
  if (holdCount > 0) {
    messages.push(`${holdCount} lender case${holdCount === 1 ? "" : "s"} on hold — intervention required.`);
  }

  if (messages.length === 0) {
    messages.push(`Loan ${loan.fileNumber} — add lender cases to begin the race.`);
  }

  return messages;
}

type SignalState = "proceed" | "attention" | "blocked" | "off";

function resolveSignal(
  stationIdx: number,
  currentIdx: number,
  stage: LenderCaseStage,
  idleDays: number,
): SignalState {
  if (stationIdx > currentIdx) return "off";
  if (stage === "lost" && stationIdx === currentIdx) return "blocked";
  if (stage === "hold" && stationIdx === currentIdx) return "attention";
  if (stationIdx < currentIdx) return "proceed";
  if (stationIdx === currentIdx) {
    if (stage === "lost") return "blocked";
    if (stage === "hold") return "attention";
    if (idleDays >= 3) return "attention";
    return "proceed";
  }
  return "off";
}

function RailwaySignal({ state }: { state: SignalState }) {
  return (
    <div
      className="flex flex-col items-center gap-[2px] rounded-sm border border-border/50 bg-slate-900/90 px-[3px] py-[3px] shadow-sm"
      aria-hidden
    >
      <span
        className={cn(
          "h-[5px] w-[5px] rounded-full transition-colors",
          state === "blocked" ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]" : "bg-red-950/40",
        )}
      />
      <span
        className={cn(
          "h-[5px] w-[5px] rounded-full transition-colors",
          state === "attention" ? "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]" : "bg-amber-950/30",
        )}
      />
      <span
        className={cn(
          "h-[5px] w-[5px] rounded-full transition-colors",
          state === "proceed" ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" : "bg-emerald-950/30",
        )}
      />
    </div>
  );
}

function LocomotiveMarker({
  primary,
  stage,
  id,
}: {
  primary?: boolean;
  stage: LenderCaseStage;
  id: string;
}) {
  const fill =
    stage === "lost"
      ? "#EF4444"
      : stage === "hold"
        ? "#F59E0B"
        : stage === "disbursed"
          ? "#059669"
          : "#2563EB";
  const gradId = `loco-body-${id}`;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        primary && "rounded-md p-[2px] ring-2 ring-amber-400/90 ring-offset-1 ring-offset-background shadow-[0_0_12px_rgba(251,191,36,0.35)]",
      )}
    >
      <svg
        viewBox="0 0 32 18"
        className="h-[18px] w-8 drop-shadow-md"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={fill} stopOpacity="1" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <path
          d="M2 10 L8 5 L22 5 C26 5 30 8 30 10 L30 13 C30 14.5 28.5 15.5 27 15.5 L9 15.5 L4 15.5 L2 13 Z"
          fill={`url(#${gradId})`}
        />
        <path d="M8 5 L10 3 L20 3 L22 5" fill={fill} opacity="0.9" />
        <rect x="20" y="7" width="5" height="4" rx="0.8" fill="white" fillOpacity="0.35" />
        <circle cx="10" cy="15.5" r="2" fill="#1e293b" />
        <circle cx="10" cy="15.5" r="1" fill="#64748b" />
        <circle cx="24" cy="15.5" r="2" fill="#1e293b" />
        <circle cx="24" cy="15.5" r="1" fill="#64748b" />
        <rect x="2" y="11" width="3" height="1.5" rx="0.3" fill="white" fillOpacity="0.5" />
      </svg>
    </div>
  );
}

function segmentColor(
  segIdx: number,
  currentIdx: number,
  stage: LenderCaseStage,
): string {
  if (stage === "lost" && segIdx >= currentIdx - 1) return "bg-red-500/70";
  if (stage === "hold" && segIdx >= MAIN_LINE_COUNT - 1) return "bg-amber-400/60";
  if (segIdx < currentIdx) return "bg-emerald-500/80";
  if (segIdx === currentIdx) {
    if (stage === "disbursed") return "bg-emerald-600";
    if (stage === "hold") return "bg-amber-400/70";
    return "bg-blue-500";
  }
  return "bg-slate-200/80 dark:bg-slate-700/50";
}

function LenderRaceRow({ lenderCase }: { lenderCase: LoanLenderExecution }) {
  const stage = normalizeLenderCaseStage(lenderCase.caseStage);
  const currentIdx = stageIndex(stage);
  const idleDays = daysSince(lenderCase.updatedAt);
  const positionPct = (currentIdx / (RACE_STAGE_ORDER.length - 1)) * 100;

  const tooltipRows = [
    { label: "Lender", value: lenderCase.lender },
    { label: "Current Stage", value: LENDER_CASE_STAGE_LABELS[stage] },
    { label: "Sub Stage", value: lenderCase.caseSubStage || "—" },
    {
      label: "Success Probability",
      value: lenderCase.probability
        ? LENDER_PROBABILITY_LABELS[lenderCase.probability]
        : "—",
    },
    { label: "Assigned RM", value: lenderCase.relationshipManager || "—" },
    {
      label: "Expected Amount",
      value: lenderCase.expectedLoanAmount
        ? formatINR(lenderCase.expectedLoanAmount)
        : "—",
    },
    { label: "Last Updated", value: formatUpdated(lenderCase.updatedAt) },
  ];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group flex min-h-[52px] items-stretch gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2",
            "transition-shadow hover:border-border hover:bg-card hover:shadow-sm",
            lenderCase.isPrimary && "ring-1 ring-amber-400/40",
          )}
        >
          <div className="flex w-[132px] shrink-0 items-center gap-2">
            <LenderLogo lender={lenderCase.lender} size="md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{lenderCase.lender}</p>
              {lenderCase.isPrimary && (
                <span className="text-[9px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Primary
                </span>
              )}
            </div>
          </div>

          <div className="relative min-w-0 flex-1">
            <div className="absolute inset-x-0 top-1/2 flex h-[3px] -translate-y-1/2 items-center">
              {RACE_STAGE_ORDER.slice(0, -1).map((_, segIdx) => (
                <div
                  key={segIdx}
                  className={cn(
                    "h-full flex-1 first:rounded-l-full last:rounded-r-full transition-colors duration-500",
                    segmentColor(segIdx, currentIdx, stage),
                  )}
                />
              ))}
            </div>

            <div className="relative flex h-full items-center justify-between px-0">
              {RACE_STAGE_ORDER.map((stationId, stationIdx) => {
                const signal = resolveSignal(stationIdx, currentIdx, stage, idleDays);
                const isCurrent = stationIdx === currentIdx;
                const isBranch = stationIdx >= MAIN_LINE_COUNT;

                return (
                  <div
                    key={stationId}
                    className={cn(
                      "relative z-[1] flex flex-col items-center",
                      isBranch && "opacity-90",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-6 flex h-[22px] w-[22px] items-center justify-center rounded-sm border transition-all duration-300",
                        isCurrent
                          ? stage === "disbursed"
                            ? "border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/40"
                            : stage === "lost"
                              ? "border-red-500 bg-red-50 dark:bg-red-950/40"
                              : stage === "hold"
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
                                : "border-blue-500 bg-blue-50 shadow-md dark:bg-blue-950/40"
                          : stationIdx < currentIdx
                            ? "border-emerald-600/50 bg-emerald-50/80 dark:bg-emerald-950/20"
                            : "border-border/70 bg-muted/30",
                      )}
                    >
                      <RailwaySignal state={signal} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="pointer-events-none absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-[calc(50%+2px)] transition-[left] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ left: `${positionPct}%` }}
            >
              <LocomotiveMarker primary={lenderCase.isPrimary} stage={stage} id={lenderCase.id} />
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border border-border/80 bg-popover px-3 py-2.5 text-popover-foreground shadow-lg"
      >
        <div className="space-y-1.5">
          {tooltipRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-[11px]">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ChanakyaRaceStrip({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [messages.length]);

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border border-indigo-500/20",
        "bg-gradient-to-r from-indigo-500/8 via-background/90 to-violet-500/5 px-3 shadow-sm",
      )}
    >
      <Brain className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
        Chanakya Race Analysis
      </span>
      <Sparkles className="h-3 w-3 shrink-0 text-indigo-500/50" />
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        <div
          className="transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(-${index * 20}px)` }}
        >
          {messages.map((msg, i) => (
            <p key={`${msg}-${i}`} className="h-5 truncate text-xs text-foreground/90">
              {msg}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** UX-05 — Enterprise lender race visualization (read-only). */
export function LenderRaceBoard({
  loan,
  cases,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
}) {
  const activeCases = useMemo(
    () =>
      [...cases]
        .filter((c) => c.status !== "closed")
        .sort((a, b) => {
          const sa = stageIndex(normalizeLenderCaseStage(a.caseStage));
          const sb = stageIndex(normalizeLenderCaseStage(b.caseStage));
          if (sb !== sa) return sb - sa;
          return (PROB_RANK[b.probability ?? ""] ?? 0) - (PROB_RANK[a.probability ?? ""] ?? 0);
        }),
    [cases],
  );

  const insights = useMemo(() => buildRaceInsightsMessages(loan, cases), [loan, cases]);

  const stageLabels = useMemo(
    () =>
      RACE_STAGE_ORDER.map((id) => ({
        id,
        label: LENDER_CASE_STAGE_LABELS[id],
        meta: LENDER_CASE_STAGES.find((s) => s.id === id),
      })),
    [],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Race to Disbursement
          </h2>
          <p className="text-xs text-muted-foreground">
            Enterprise Lender Progress Visualization
          </p>
        </div>

        <ChanakyaRaceStrip messages={insights} />

        <div className="h-[calc(100vh-240px)] min-h-[480px] min-w-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-gradient-to-b from-muted/20 to-background shadow-inner">
          <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur-sm">
            <div className="flex gap-3">
              <div className="w-[132px] shrink-0 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lender Express
              </div>
              <div className="flex min-w-[640px] flex-1 justify-between">
                {stageLabels.map(({ id, label }, idx) => (
                  <div
                    key={id}
                    className={cn(
                      "flex max-w-[72px] flex-col items-center text-center",
                      idx >= MAIN_LINE_COUNT && "opacity-75",
                    )}
                  >
                    <span className="text-[9px] font-medium leading-tight text-foreground/90">
                      {label}
                    </span>
                    {idx >= MAIN_LINE_COUNT && (
                      <span className="mt-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">
                        Branch
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3">
            {activeCases.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 text-sm text-muted-foreground">
                No active lender cases. Add lenders from the Lender Pipeline to start the race.
              </div>
            ) : (
              activeCases.map((c) => <LenderRaceRow key={c.id} lenderCase={c} />)
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-6 rounded-full bg-emerald-500/80" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-6 rounded-full bg-blue-500" />
            Current Stage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-6 rounded-full bg-slate-200 dark:bg-slate-700" />
            Upcoming
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-6 rounded-full bg-amber-400/70" />
            Hold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-6 rounded-full bg-red-500/70" />
            Lost
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm ring-2 ring-amber-400/90" />
            Primary Lender
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
