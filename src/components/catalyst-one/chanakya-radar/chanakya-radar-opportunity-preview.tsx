"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Phone,
  CalendarPlus,
  History,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS, getSubStatusLabel } from "@/constants/loan-stage-master";
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
import { formatINR } from "@/lib/format-currency";
import type { ChanakyaRadarCard } from "@/lib/chanakya-radar";
import { mapHealthToQuadrant, quadrantLabel } from "@/lib/chanakya-radar";
import type { ChanakyaOperationalQuadrantId } from "@/constants/chanakya-radar";
import type { LoanFile } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

export interface RadarOpportunityPreviewModel {
  card: ChanakyaRadarCard;
  file: LoanFile;
  /** Portfolio Operational Health Score (shared vector engine). */
  portfolioHealthScore?: number;
}

interface ChanakyaRadarOpportunityPreviewProps {
  preview: RadarOpportunityPreviewModel;
  onClear: () => void;
  onOpenWorkspace: () => void;
  onOpenTimeline: () => void;
  onAddFollowUp: () => void;
  onCallCustomer: () => void;
  onViewDocuments: () => void;
  /** Drawer chrome — hide outer border/animation when hosted in Sheet. */
  variant?: "panel" | "drawer";
}

const INSIGHT_ALERT_STYLES: Record<
  ChanakyaOperationalQuadrantId,
  { box: string; badge: string; muted: string; action: string }
> = {
  at_risk: {
    box: "border-rose-500/40 bg-rose-500/12",
    badge: "border-rose-500/45 bg-rose-500/20 text-rose-100",
    muted: "text-rose-100/75",
    action: "text-rose-50",
  },
  follow_up_required: {
    box: "border-amber-500/40 bg-amber-500/12",
    badge: "border-amber-500/45 bg-amber-500/20 text-amber-100",
    muted: "text-amber-100/75",
    action: "text-amber-50",
  },
  needs_attention: {
    box: "border-orange-500/40 bg-orange-500/12",
    badge: "border-orange-500/45 bg-orange-500/20 text-orange-100",
    muted: "text-orange-100/75",
    action: "text-orange-50",
  },
  on_track: {
    box: "border-emerald-500/40 bg-emerald-500/12",
    badge: "border-emerald-500/45 bg-emerald-500/20 text-emerald-100",
    muted: "text-emerald-100/75",
    action: "text-emerald-50",
  },
};

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 break-words text-[12px] font-medium text-foreground">{value}</p>
    </div>
  );
}

function OpportunityInsightAlert({
  card,
  file,
}: {
  card: ChanakyaRadarCard;
  file: LoanFile;
}) {
  const quadrant =
    mapHealthToQuadrant(card.health, file) ?? ("needs_attention" as ChanakyaOperationalQuadrantId);
  const styles = INSIGHT_ALERT_STYLES[quadrant];
  const statusLabel = quadrantLabel(quadrant);
  const why = card.why[0]?.trim();
  const action =
    card.recommends[0]?.trim() ||
    (card.nextWorkspace.label ? `Open ${card.nextWorkspace.label}` : undefined);

  return (
    <div
      role="status"
      aria-label={`Opportunity insight · ${statusLabel}`}
      className={cn("rounded-lg border px-3 py-3 shadow-sm", styles.box)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
            styles.badge,
          )}
        >
          {statusLabel}
        </span>
        <span className={cn("text-[9px] font-semibold uppercase tracking-[0.12em]", styles.muted)}>
          Opportunity Insight
        </span>
      </div>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-foreground">
        {card.executiveInsight}
      </p>
      {why ? (
        <p className={cn("mt-2 text-[11px] leading-snug", styles.muted)}>
          <span className="font-semibold uppercase tracking-wide">Why · </span>
          {why}
        </p>
      ) : null}
      {action ? (
        <p className={cn("mt-1.5 text-[12px] font-semibold leading-snug", styles.action)}>
          <span className="font-semibold uppercase tracking-wide opacity-80">Action · </span>
          {action}
        </p>
      ) : null}
    </div>
  );
}

/**
 * CO-SPRINT-103 — Opportunity Preview (slide-over drawer content).
 */
export function ChanakyaRadarOpportunityPreview({
  preview,
  onClear,
  onOpenWorkspace,
  onOpenTimeline,
  onAddFollowUp,
  onCallCustomer,
  onViewDocuments,
  variant = "drawer",
}: ChanakyaRadarOpportunityPreviewProps) {
  const { card, file, portfolioHealthScore } = preview;
  const stageLabel = STAGE_LABELS[file.stage] ?? String(file.stage).replace(/_/g, " ");
  const subStage = getSubStatusLabel(file.stage, file.stageSubStatus) || "—";
  const lender = card.activeLenders[0]?.lender || file.lender?.trim() || "—";
  const openTasks = (file.tasks ?? []).filter(
    (t) => !t.completed && t.status !== "completed",
  );
  const pendingDocs = (file.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested" || d.status === "rejected",
  );
  const quadrant =
    mapHealthToQuadrant(card.health, file) ?? ("needs_attention" as ChanakyaOperationalQuadrantId);
  const riskLabel = quadrantLabel(quadrant);
  const nextAction =
    card.recommends[0]?.trim() ||
    `${card.nextWorkspace.emoji} ${card.nextWorkspace.label}`;
  const healthDisplay =
    portfolioHealthScore != null
      ? `${portfolioHealthScore}/100`
      : `${card.confidence}% conf.`;

  const priorityClass =
    LOAN_FILE_PRIORITY_STYLES[file.priority]?.className ??
    "border-border bg-muted/50 text-muted-foreground";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-card",
        variant === "panel" && "rounded-lg border border-border/70 shadow-sm",
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 px-4 py-3 pr-12">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Opportunity Preview
          </p>
          <p className="mt-1 break-words text-[15px] font-semibold tracking-tight">
            {card.borrower}
          </p>
          <p className="mt-0.5 break-all text-[11px] tabular-nums text-muted-foreground">
            {card.opportunityNumber}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              priorityClass,
            )}
          >
            {file.priority}
          </span>
          {variant === "panel" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onClear}
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <OpportunityInsightAlert card={card} file={file} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Borrower" value={card.borrower} />
          <Field label="Loan Amount" value={card.loanAmountLabel} />
          <Field label="Product" value={card.product} />
          <Field label="Stage" value={stageLabel} />
          <Field label="Sub-stage" value={subStage} />
          <Field label="RM" value={card.relationshipManager} />
          <Field label="Lender" value={lender} />
          <Field label="Priority" value={file.priority} />
          <Field label="Health Score" value={healthDisplay} />
          <Field label="Risk Indicator" value={riskLabel} />
          <Field label="Last Activity" value={card.lastActivityLabel} />
          <Field label="Expected Revenue" value={formatINR(file.expectedRevenue ?? 0)} />
        </div>

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Pending Tasks
          </p>
          {openTasks.length === 0 ? (
            <p className="mt-1 text-[12px] text-muted-foreground">None</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {openTasks.slice(0, 5).map((t) => (
                <li
                  key={t.id}
                  className="break-words rounded border border-border/50 bg-muted/20 px-2 py-1 text-[11px]"
                >
                  {t.title}
                </li>
              ))}
              {openTasks.length > 5 ? (
                <li className="text-[10px] text-muted-foreground">
                  +{openTasks.length - 5} more
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Pending Documents
          </p>
          {pendingDocs.length === 0 ? (
            <p className="mt-1 text-[12px] text-muted-foreground">None</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {pendingDocs.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="break-words rounded border border-border/50 bg-muted/20 px-2 py-1 text-[11px]"
                >
                  {d.name || d.category || d.id}
                </li>
              ))}
              {pendingDocs.length > 5 ? (
                <li className="text-[10px] text-muted-foreground">
                  +{pendingDocs.length - 5} more
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300/80">
            Next Recommended Action
          </p>
          <p className="mt-1 break-words text-[13px] font-medium leading-snug text-foreground">
            {nextAction}
          </p>
        </div>
      </div>

      <footer className="shrink-0 space-y-1.5 border-t border-border/60 bg-muted/15 p-3">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full gap-1.5 text-[12px]"
          onClick={onOpenWorkspace}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Opportunity Workspace
        </Button>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onOpenTimeline}
          >
            <History className="h-3.5 w-3.5" />
            Timeline
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onAddFollowUp}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Follow-up
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onCallCustomer}
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onViewDocuments}
          >
            <FileText className="h-3.5 w-3.5" />
            Documents
          </Button>
        </div>
      </footer>
    </aside>
  );
}
