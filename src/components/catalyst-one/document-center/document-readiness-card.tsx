"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentCompletionScore } from "@/lib/document-completion/score";
import type { EdieChecklistItem, EdieResolvedChecklist } from "@/types/edie-certified-rules";
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";

export type DocumentKpiFilter = "all" | "uploaded" | "pending" | "critical" | "optional" | "readiness";

function scoringItems(checklist: EdieResolvedChecklist): EdieChecklistItem[] {
  return checklist.items.filter(
    (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
  );
}

export function DocumentReadinessCard({
  checklist,
  score,
  onOpenReadiness,
  onKpiClick,
  activeFilter,
}: {
  checklist: EdieResolvedChecklist;
  score: DocumentCompletionScore;
  onOpenReadiness: () => void;
  onKpiClick: (filter: DocumentKpiFilter) => void;
  activeFilter: DocumentKpiFilter;
}) {
  const items = scoringItems(checklist);
  const uploaded = items.filter((i) => i.complete).length;
  const pending = items.filter((i) => !i.complete).length;
  const critical = items.filter((i) => i.critical && !i.complete).length;
  const required = items.filter((i) => i.mandatory || i.critical).length;
  const topGaps = items.filter((i) => !i.complete).slice(0, 4);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <button
        type="button"
        onClick={onOpenReadiness}
        className="flex w-full items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-teal-500/[0.07] via-background to-background px-4 py-3.5 text-left transition-colors hover:from-teal-500/10"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Document Readiness
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {score.overallPct}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Click to see why this score is not 100%
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      <div className="grid grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
        <KpiButton
          label="Required"
          value={String(required)}
          active={activeFilter === "all"}
          onClick={() => onKpiClick("all")}
        />
        <KpiButton
          label="Uploaded"
          value={String(uploaded)}
          accent
          active={activeFilter === "uploaded"}
          onClick={() => onKpiClick("uploaded")}
        />
        <KpiButton
          label="Pending"
          value={String(pending)}
          warn={pending > 0}
          active={activeFilter === "pending"}
          onClick={() => onKpiClick("pending")}
        />
        <KpiButton
          label="Critical"
          value={critical > 0 ? String(critical) : "0"}
          danger={critical > 0}
          active={activeFilter === "critical"}
          onClick={() => onKpiClick("critical")}
        />
      </div>

      {topGaps.length > 0 ? (
        <div className="space-y-2 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Upload the following documents to reach 100%
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {topGaps.map((g) => (
              <li
                key={g.typeRef}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                  g.critical
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100"
                    : "border-border/70 bg-muted/40 text-foreground/85",
                )}
              >
                {g.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onOpenReadiness}
            className="inline-flex h-8 items-center rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 text-[11px] font-semibold text-teal-900 transition-colors hover:bg-teal-500/15 dark:text-teal-100"
          >
            Complete Remaining Documents
          </button>
        </div>
      ) : (
        <p className="px-4 py-3 text-[11px] text-emerald-800 dark:text-emerald-200">
          All scored documents are complete for the current EDIE checklist.
        </p>
      )}
    </section>
  );
}

function KpiButton({
  label,
  value,
  onClick,
  active,
  accent,
  warn,
  danger,
}: {
  label: string;
  value: string;
  onClick: () => void;
  active?: boolean;
  accent?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-card px-3 py-3 text-left transition-colors hover:bg-muted/40",
        active && "bg-teal-500/10 ring-1 ring-inset ring-teal-500/30",
        accent && !active && "bg-teal-500/[0.04]",
        warn && !active && "bg-amber-500/[0.04]",
        danger && !active && "bg-rose-500/[0.04]",
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          danger ? "text-rose-700 dark:text-rose-300" : "text-foreground",
        )}
      >
        {value}
      </p>
    </button>
  );
}
