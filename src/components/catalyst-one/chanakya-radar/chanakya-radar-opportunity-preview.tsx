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
import type { LoanFile } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

export interface RadarOpportunityPreviewModel {
  card: ChanakyaRadarCard;
  file: LoanFile;
}

interface ChanakyaRadarOpportunityPreviewProps {
  preview: RadarOpportunityPreviewModel | null;
  onClear: () => void;
  onOpenWorkspace: () => void;
  onOpenTimeline: () => void;
  onAddFollowUp: () => void;
  onCallCustomer: () => void;
  onViewDocuments: () => void;
}

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

/**
 * CO-SPRINT-100C — Right-side Opportunity Preview Panel (Radar selection).
 * Reuses Kanban card design language; does not open workspace on select.
 */
export function ChanakyaRadarOpportunityPreview({
  preview,
  onClear,
  onOpenWorkspace,
  onOpenTimeline,
  onAddFollowUp,
  onCallCustomer,
  onViewDocuments,
}: ChanakyaRadarOpportunityPreviewProps) {
  if (!preview) {
    return (
      <aside className="flex min-h-[200px] flex-col rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Opportunity Preview
        </p>
        <div className="flex flex-1 items-center justify-center px-4 py-10 text-center">
          <p className="max-w-[220px] text-[13px] text-muted-foreground">
            Select an opportunity from the Radar to view details.
          </p>
        </div>
      </aside>
    );
  }

  const { card, file } = preview;
  const stageLabel = STAGE_LABELS[file.stage] ?? String(file.stage).replace(/_/g, " ");
  const subStage = getSubStatusLabel(file.stage, file.stageSubStatus) || "—";
  const lender =
    card.activeLenders[0]?.lender || file.lender?.trim() || "—";
  const openTasks = (file.tasks ?? []).filter(
    (t) => !t.completed && t.status !== "completed",
  );
  const upcoming = openTasks
    .filter((t) => t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const riskFlags = [
    ...(file.isDelayed || file.status === "delayed" ? ["Delayed"] : []),
    ...(file.isUrgent || file.priority === "urgent" ? ["Urgent"] : []),
    ...(file.status === "at_risk" ? ["At risk"] : []),
    ...card.why.slice(0, 3),
  ].filter(Boolean);

  const priorityClass =
    LOAN_FILE_PRIORITY_STYLES[file.priority]?.className ??
    "border-border bg-muted/50 text-muted-foreground";

  return (
    <aside
      className={cn(
        "flex w-full flex-col rounded-lg border border-border/70 bg-card shadow-sm",
        "animate-in fade-in-0 slide-in-from-right-4 duration-300",
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Opportunity Preview
          </p>
          <p className="mt-1 break-words text-[14px] font-semibold tracking-tight">
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
        </div>
      </header>

      {/* Natural height — no nested scroll / no clip; page scrolls */}
      <div className="space-y-3 p-3">
        {/* Kanban-style summary strip */}
        <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
          <p className="text-[11px] font-semibold tabular-nums text-foreground/90">
            {card.loanAmountLabel}
          </p>
          <p className="mt-0.5 break-words text-[10px] text-muted-foreground">{card.product}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
            <span className="tabular-nums text-muted-foreground">
              {card.daysSinceActivityLabel}
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-muted-foreground">{card.momentumLabel}</span>
          </div>
          <div className="mt-1.5 rounded border border-border/60 bg-muted/25 px-1.5 py-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {card.waitingOn.preamble}
            </p>
            <p className="break-words text-[11px] font-semibold leading-tight">
              <span className="mr-1" aria-hidden>
                {card.waitingOn.emoji}
              </span>
              {card.waitingOn.party}
            </p>
            <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
              Pending Item · {card.waitingOn.pendingItem}
            </p>
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-foreground/75">
            {card.executiveInsight}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Borrower Name" value={card.borrower} />
          <Field label="Loan Product" value={card.product} />
          <Field label="Loan Amount" value={card.loanAmountLabel} />
          <Field label="Current Stage" value={stageLabel} />
          <Field label="Current Sub Stage" value={subStage} />
          <Field label="Assigned RM" value={card.relationshipManager} />
          <Field label="Lender" value={lender} />
          <Field label="Priority" value={file.priority} />
          <Field label="Last Activity" value={card.lastActivityLabel} />
          <Field
            label="Days in Current Stage"
            value={`${file.daysInStage ?? 0} days`}
          />
          <Field
            label="Expected Revenue"
            value={formatINR(file.expectedRevenue ?? 0)}
          />
          <Field
            label="Current Status"
            value={String(file.status ?? "—").replace(/_/g, " ")}
          />
        </div>

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Outstanding Tasks
          </p>
          {openTasks.length === 0 ? (
            <p className="mt-1 text-[12px] text-muted-foreground">None</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {openTasks.slice(0, 4).map((t) => (
                <li
                  key={t.id}
                  className="break-words rounded border border-border/50 bg-muted/20 px-2 py-1 text-[11px]"
                >
                  {t.title}
                </li>
              ))}
              {openTasks.length > 4 ? (
                <li className="text-[10px] text-muted-foreground">
                  +{openTasks.length - 4} more
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <Field
          label="Upcoming Follow-up"
          value={
            upcoming
              ? `${upcoming.title} · ${new Date(upcoming.dueDate).toLocaleDateString("en-IN")}`
              : "—"
          }
        />

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Risk Flags
          </p>
          {riskFlags.length === 0 ? (
            <p className="mt-1 text-[12px] text-muted-foreground">None</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {riskFlags.map((flag) => (
                <span
                  key={flag}
                  className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-200"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="space-y-1.5 border-t border-border/60 bg-muted/15 p-2.5">
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
            Open Timeline
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onAddFollowUp}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Add Follow-up
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onCallCustomer}
          >
            <Phone className="h-3.5 w-3.5" />
            Call Customer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={onViewDocuments}
          >
            <FileText className="h-3.5 w-3.5" />
            View Documents
          </Button>
        </div>
      </footer>
    </aside>
  );
}
