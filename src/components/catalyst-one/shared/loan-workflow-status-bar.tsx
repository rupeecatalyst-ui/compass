"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, CircleDot, Flag } from "lucide-react";
import {
  getSubStatusLabel,
  searchPipelineStages,
  searchSubStatusesForStage,
  STAGE_COLORS,
  STAGE_LABELS,
} from "@/constants/loan-pipeline";
import {
  formatWorkflowTimestamp,
  getCurrentStageSince,
  getSubStageDisplayLabel,
  getSubStageLastUpdated,
} from "@/lib/loan-workflow-metadata";
import { FinalApprovedTermsCard } from "@/components/catalyst-one/shared/final-approved-terms-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoanFile, LoanFileStatus, LoanFileTimelineEvent, PipelineStage } from "@/types/catalyst-one";

interface WorkflowStageSelectProps {
  value: PipelineStage;
  onSelect: (stage: PipelineStage) => void;
  disabled?: boolean;
}

export function WorkflowStageSelect({ value, onSelect, disabled }: WorkflowStageSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchPipelineStages(query), [query]);
  const selectedLabel = STAGE_LABELS[value];
  const stageColor = STAGE_COLORS[value];

  return (
    <SearchableWorkflowDropdown
      theme="amber"
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      placeholder="Search stage..."
      trigger={
        <StageValueBadge label={selectedLabel} color={stageColor} open={open} disabled={disabled} />
      }
    >
      {results.map((stage) => (
        <button
          key={stage.id}
          type="button"
          onClick={() => {
            onSelect(stage.id);
            setQuery("");
            setOpen(false);
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60",
            value === stage.id && "bg-amber-500/10 dark:bg-amber-500/15",
          )}
        >
          <Check
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400",
              value === stage.id ? "opacity-100" : "opacity-0",
            )}
          />
          <span className="flex-1 font-medium">{stage.label}</span>
        </button>
      ))}
    </SearchableWorkflowDropdown>
  );
}

interface WorkflowSubStageSelectProps {
  stage: PipelineStage;
  value?: string;
  onSelect: (subStatusId: string) => void;
  disabled?: boolean;
}

export function WorkflowSubStageSelect({
  stage,
  value,
  onSelect,
  disabled,
}: WorkflowSubStageSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchSubStatusesForStage(stage, query), [stage, query]);
  const selectedLabel = getSubStatusLabel(stage, value);
  const hasOptions = searchSubStatusesForStage(stage, "").length > 0;

  if (!hasOptions) {
    return <SubStageValueBadge label="Not applicable" muted open={false} disabled />;
  }

  return (
    <SearchableWorkflowDropdown
      theme="blue"
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      placeholder="Search sub stage..."
      trigger={
        <SubStageValueBadge
          label={selectedLabel ?? "Select sub stage"}
          open={open}
          disabled={disabled}
          muted={!selectedLabel}
        />
      }
    >
      {results.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No sub stage found.</p>
      ) : (
        results.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => {
              onSelect(sub.id);
              setQuery("");
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60",
              value === sub.id && "bg-blue-500/10 dark:bg-blue-500/15",
            )}
          >
            <Check
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400",
                value === sub.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="flex-1 font-medium">{sub.label}</span>
          </button>
        ))
      )}
    </SearchableWorkflowDropdown>
  );
}

export interface LoanWorkflowStatusBarProps {
  fileId: string;
  stage: PipelineStage;
  subStageId?: string;
  daysInStage: number;
  timeline: LoanFileTimelineEvent[];
  updatedBy: string;
  currentStatus?: LoanFileStatus;
  saving?: boolean;
  finalLoanAmount?: number;
  finalRoi?: number;
  finalTenure?: number;
  finalApprovalDate?: string;
  layout?: "row" | "panel";
  onStageChange: (stage: PipelineStage) => void;
  onSubStageChange: (subStatusId: string) => void;
  onFinalTermsChange: (patch: Pick<LoanFile, "finalLoanAmount" | "finalRoi" | "finalTenure">) => void;
}

/** CRC-10.2C / UX-01A / UX-01C — Workflow intelligence cards. */
export function LoanWorkflowCards({
  fileId,
  stage,
  subStageId,
  daysInStage,
  timeline,
  updatedBy,
  currentStatus,
  saving,
  finalLoanAmount,
  finalRoi,
  finalTenure,
  finalApprovalDate,
  layout = "row",
  onStageChange,
  onSubStageChange,
  onFinalTermsChange,
}: LoanWorkflowStatusBarProps) {
  const subStatuses = searchSubStatusesForStage(stage, "");
  const subStageDisabled = saving || subStatuses.length === 0;
  const stageSince = getCurrentStageSince(timeline, stage);
  const subStageUpdated = getSubStageLastUpdated(timeline);
  const sla = getSlaStatus(daysInStage);
  const statusLabel = formatLoanStatus(currentStatus);

  const cards = (
    <>
      <WorkflowStatusCard theme="blue" icon={CircleDot} title="Sub Stage" disabled={subStageDisabled} layout={layout}>
        <div className="space-y-2.5">
          <WorkflowSubStageSelect
            stage={stage}
            value={subStageId}
            onSelect={onSubStageChange}
            disabled={subStageDisabled}
          />
          <MetaRow label="Last Updated" value={formatWorkflowTimestamp(subStageUpdated)} />
          <MetaRow label="Updated By" value={updatedBy || "—"} />
        </div>
      </WorkflowStatusCard>

      <WorkflowStatusCard theme="amber" icon={Flag} title="Current Stage" disabled={saving} layout={layout}>
        <div className="space-y-2.5">
          <WorkflowStageSelect value={stage} onSelect={onStageChange} disabled={saving} />
          <MetaRow label="Stage Since" value={formatWorkflowTimestamp(stageSince)} />
          <MetaRow
            label="Days in Stage"
            value={`${daysInStage} ${daysInStage === 1 ? "Day" : "Days"}`}
            emphasis
          />
          <MetaRow label="SLA Status" value={sla.label} emphasis />
          <MetaRow label="Current Status" value={statusLabel} />
          <div className="space-y-1.5" aria-label="SLA and risk placeholders">
            <FuturePlaceholder label="SLA Countdown" />
            <FuturePlaceholder label="Risk Indicator" />
          </div>
        </div>
      </WorkflowStatusCard>

      <FinalApprovedTermsCard
        fileId={fileId}
        stage={stage}
        finalLoanAmount={finalLoanAmount}
        finalRoi={finalRoi}
        finalTenure={finalTenure}
        finalApprovalDate={finalApprovalDate}
        disabled={saving}
        layout={layout}
        onChange={onFinalTermsChange}
      />
    </>
  );

  if (layout === "panel") {
    return <div className="flex flex-col gap-4">{cards}</div>;
  }

  return cards;
}

/** @deprecated Use LoanWorkflowCards inside CatalystCommandBar. */
export function LoanWorkflowStatusBar(props: LoanWorkflowStatusBarProps) {
  return (
    <section className="shrink-0 px-6 py-5 sm:py-6" aria-label="Loan workflow status">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
        <LoanWorkflowCards {...props} />
      </div>
    </section>
  );
}

function formatLoanStatus(status?: LoanFileStatus): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FuturePlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/50 bg-muted/15 px-2.5 py-1.5 text-[10px] text-muted-foreground/70">
      {label}
    </div>
  );
}

function MetaRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", emphasis && "font-semibold text-foreground")}>{value}</span>
    </div>
  );
}

function getSlaStatus(days: number): {
  label: string;
  dotClass: string;
  chipClass: string;
} {
  if (days <= 2) {
    return {
      label: "On Track",
      dotClass: "bg-emerald-500",
      chipClass: "text-emerald-700 dark:text-emerald-400",
    };
  }
  if (days <= 5) {
    return {
      label: "Attention",
      dotClass: "bg-amber-500",
      chipClass: "text-amber-700 dark:text-amber-400",
    };
  }
  return {
    label: "Delayed",
    dotClass: "bg-red-500",
    chipClass: "text-red-700 dark:text-red-400",
  };
}

function WorkflowStatusCard({
  theme,
  icon: Icon,
  title,
  children,
  disabled,
  layout,
}: {
  theme: "blue" | "amber";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  layout?: "row" | "panel";
}) {
  const styles =
    theme === "blue"
      ? {
          card: cn(
            "border-blue-700/35 bg-gradient-to-br from-blue-700/[0.16] via-blue-600/[0.10] to-indigo-500/[0.05]",
            "shadow-lg shadow-blue-900/[0.08] ring-1 ring-blue-600/15",
          ),
          icon: "text-blue-100 bg-blue-600/30 ring-1 ring-blue-400/30 shadow-inner shadow-blue-900/20",
          title: "text-blue-950 dark:text-blue-100",
        }
      : {
          card: cn(
            "border-amber-600/40 bg-gradient-to-br from-amber-500/[0.18] via-amber-400/[0.10] to-yellow-300/[0.05]",
            "shadow-lg shadow-amber-900/[0.08] ring-1 ring-amber-500/20",
          ),
          icon: "text-amber-950 bg-amber-400/35 ring-1 ring-amber-300/40 shadow-inner shadow-amber-900/15",
          title: "text-amber-950 dark:text-amber-50",
        };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-opacity",
        layout === "panel" ? "min-h-0 w-full" : "min-h-[118px]",
        styles.card,
        disabled && "opacity-60",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", styles.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className={cn("text-sm font-semibold tracking-wide", styles.title)}>{title}</h3>
      </div>
      <div className="flex flex-1 w-full flex-col">{children}</div>
    </div>
  );
}

function StageValueBadge({
  label,
  color,
  open,
  disabled,
}: {
  label: string;
  color: string;
  open: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[2.25rem] w-full items-center rounded-lg border px-3 py-1.5 text-sm font-semibold",
        disabled && "opacity-70",
      )}
      style={{
        borderColor: color,
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {label}
      <ChevronDown
        className={cn(
          "ml-auto h-4 w-4 shrink-0 opacity-70 transition-transform",
          open && "rotate-180",
        )}
      />
    </span>
  );
}

function SubStageValueBadge({
  label,
  open,
  disabled,
  muted,
}: {
  label: string;
  open: boolean;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[2.25rem] w-full items-center rounded-lg border px-3 py-1.5 text-sm font-semibold",
        muted
          ? "border-border/60 bg-muted/30 text-muted-foreground"
          : "border-blue-600/35 bg-blue-600/10 text-blue-800 dark:text-blue-200",
        disabled && "opacity-70",
      )}
    >
      {label}
      {!muted && (
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 opacity-70 transition-transform",
            open && "rotate-180",
          )}
        />
      )}
    </span>
  );
}

function SearchableWorkflowDropdown({
  theme,
  disabled,
  open,
  onOpenChange,
  query,
  onQueryChange,
  placeholder,
  trigger,
  children,
}: {
  theme: "blue" | "amber";
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const ring =
    theme === "blue"
      ? "focus-visible:ring-blue-500/40"
      : "focus-visible:ring-amber-500/40";

  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onOpenChange(!open)}
        className={cn(
          "flex w-full items-stretch rounded-lg text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          ring,
          disabled ? "cursor-not-allowed" : "hover:opacity-95",
        )}
      >
        {trigger}
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border bg-popover shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-border p-2">
            <Input
              className="h-8 text-xs"
              placeholder={placeholder}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

// Exported for tests / display helpers
export { getSubStageDisplayLabel };
