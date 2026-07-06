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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/catalyst-one";

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
      theme="green"
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
            value === stage.id && "bg-emerald-500/10 dark:bg-emerald-500/15",
          )}
        >
          <Check
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400",
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
    return (
      <SubStageValueBadge label="Not applicable" muted open={false} disabled />
    );
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

interface LoanWorkflowStatusBarProps {
  stage: PipelineStage;
  subStageId?: string;
  daysInStage: number;
  saving?: boolean;
  onStageChange: (stage: PipelineStage) => void;
  onSubStageChange: (subStatusId: string) => void;
}

/** CRC-10.2C — Loan workflow cards for Command Bar workflow area. */
export function LoanWorkflowCards({
  stage,
  subStageId,
  daysInStage,
  saving,
  onStageChange,
  onSubStageChange,
}: LoanWorkflowStatusBarProps) {
  const subStatuses = searchSubStatusesForStage(stage, "");
  const subStageDisabled = saving || subStatuses.length === 0;

  return (
    <>
      <WorkflowStatusCard
        theme="blue"
        icon={CircleDot}
        title="Sub Stage"
        disabled={subStageDisabled}
      >
        <WorkflowSubStageSelect
          stage={stage}
          value={subStageId}
          onSelect={onSubStageChange}
          disabled={subStageDisabled}
        />
      </WorkflowStatusCard>

      <WorkflowStatusCard theme="green" icon={Flag} title="Current Stage" disabled={saving}>
        <div className="flex h-full flex-col gap-3">
          <WorkflowStageSelect
            value={stage}
            onSelect={onStageChange}
            disabled={saving}
          />

          <div className="text-xs text-muted-foreground">
            In Current Stage:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {daysInStage} {daysInStage === 1 ? "Day" : "Days"}
            </span>
          </div>

          <SlaIndicator days={daysInStage} />

          <div
            className="mt-auto min-h-[2rem] rounded-lg border border-dashed border-border/50 bg-muted/15"
            aria-hidden
          />
        </div>
      </WorkflowStatusCard>
    </>
  );
}

/** @deprecated Use LoanWorkflowCards inside CatalystCommandBar. */
export function LoanWorkflowStatusBar(props: LoanWorkflowStatusBarProps) {
  return (
    <section className="shrink-0 px-6 py-5 sm:py-6" aria-label="Loan workflow status">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <LoanWorkflowCards {...props} />
      </div>
    </section>
  );
}

function SlaIndicator({ days }: { days: number }) {
  const sla = getSlaStatus(days);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium w-fit",
        sla.chipClass,
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", sla.dotClass)} aria-hidden />
      {sla.label}
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
      chipClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
    };
  }
  if (days <= 5) {
    return {
      label: "Attention",
      dotClass: "bg-amber-500",
      chipClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25",
    };
  }
  return {
    label: "Delayed",
    dotClass: "bg-red-500",
    chipClass: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25",
  };
}

function WorkflowStatusCard({
  theme,
  icon: Icon,
  title,
  children,
  disabled,
}: {
  theme: "blue" | "green";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const styles =
    theme === "blue"
      ? {
          card: "border-blue-500/30 bg-blue-500/[0.07] dark:bg-blue-500/10 shadow-md shadow-blue-500/[0.06]",
          icon: "text-blue-600 dark:text-blue-400 bg-blue-500/15 ring-1 ring-blue-500/20",
          title: "text-blue-700 dark:text-blue-300",
        }
      : {
          card: "border-emerald-500/30 bg-emerald-500/[0.07] dark:bg-emerald-500/10 shadow-md shadow-emerald-500/[0.06]",
          icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/20",
          title: "text-emerald-700 dark:text-emerald-300",
        };

  return (
    <div
      className={cn(
        "flex min-h-[152px] flex-col rounded-xl border p-5 transition-opacity",
        styles.card,
        disabled && "opacity-60",
      )}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", styles.icon)}>
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
        "inline-flex min-h-[2.75rem] flex-1 items-center rounded-lg border px-4 py-2 text-base font-semibold",
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
        "inline-flex min-h-[2.75rem] flex-1 items-center rounded-lg border px-4 py-2 text-base font-semibold",
        muted
          ? "border-border/60 bg-muted/30 text-muted-foreground"
          : "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        disabled && "opacity-70",
      )}
    >
      {label}
      {!muted && (
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-blue-600/70 dark:text-blue-400/70 transition-transform",
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
  theme: "blue" | "green";
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
      : "focus-visible:ring-emerald-500/40";

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
              className="h-9 text-xs"
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
