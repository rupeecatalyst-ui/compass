"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileStack,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { CircularProgress } from "@/components/catalyst-one/phase-readiness-dashboard/circular-progress";
import { derivePhaseReadiness } from "@/lib/enterprise-phase-readiness";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  DocumentHealthBucket,
  PhaseReadinessDetail,
  PhaseReadinessPhaseId,
  PhaseReadinessSnapshot,
} from "@/types/enterprise-phase-readiness";
import { cn } from "@/lib/utils";

const TONE_RING: Record<
  PhaseReadinessDetail["tone"],
  { progress: string; chip: string; bar: string }
> = {
  blue: {
    progress: "stroke-blue-500",
    chip: "border-blue-500/30 bg-blue-500/[0.06]",
    bar: "bg-blue-500",
  },
  purple: {
    progress: "stroke-violet-500",
    chip: "border-violet-500/30 bg-violet-500/[0.06]",
    bar: "bg-violet-500",
  },
  green: {
    progress: "stroke-emerald-500",
    chip: "border-emerald-500/30 bg-emerald-500/[0.06]",
    bar: "bg-emerald-500",
  },
  orange: {
    progress: "stroke-orange-500",
    chip: "border-orange-500/30 bg-orange-500/[0.06]",
    bar: "bg-orange-500",
  },
};

const HEALTH_META: {
  id: DocumentHealthBucket;
  label: string;
  className: string;
  key: keyof PhaseReadinessSnapshot["documentHealth"];
}[] = [
  { id: "received", label: "Received", className: "bg-sky-500/15 text-sky-800 dark:text-sky-200", key: "received" },
  { id: "pending", label: "Pending", className: "bg-amber-500/15 text-amber-900 dark:text-amber-200", key: "pending" },
  { id: "rejected", label: "Rejected", className: "bg-red-500/15 text-red-800 dark:text-red-200", key: "rejected" },
  { id: "expired", label: "Expired", className: "bg-stone-500/15 text-stone-800 dark:text-stone-200", key: "expired" },
  {
    id: "under_verification",
    label: "Under Verification",
    className: "bg-indigo-500/15 text-indigo-900 dark:text-indigo-200",
    key: "underVerification",
  },
  { id: "verified", label: "Verified", className: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200", key: "verified" },
];

export interface PhaseReadinessDashboardProps {
  file?: LoanFile | null;
  fileId?: string | null;
  lifeFinalized?: boolean;
  hasContact?: boolean;
  hasOpportunity?: boolean;
  customerName?: string | null;
  productLabel?: string | null;
  className?: string;
}

function PhaseCard({
  phase,
  expanded,
  onToggle,
}: {
  phase: PhaseReadinessDetail;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = TONE_RING[phase.tone];
  return (
    <div className={cn("rounded-xl border transition-shadow duration-300", tone.chip, expanded && "shadow-sm")}>
      <button
        type="button"
        onClick={onToggle}
        title={phase.tooltip}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left"
        aria-expanded={expanded}
      >
        <CircularProgress
          pct={phase.pct}
          size={44}
          strokeWidth={3.5}
          progressClassName={tone.progress}
        >
          <span className="text-[10px] font-bold tabular-nums text-foreground">{phase.pct}%</span>
        </CircularProgress>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold tracking-tight text-foreground">
            {phase.label}
          </p>
          <p className="truncate text-[9px] text-muted-foreground">Status</p>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className="space-y-2.5 border-t border-border/50 px-2.5 py-2.5">
          {phase.documentCollection ? (
            <div className="rounded-lg border border-border/50 bg-background/60 p-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-foreground">Document Collection</p>
                <span className="ml-auto text-[10px] font-bold tabular-nums text-foreground">
                  {phase.documentCollection.pct}%
                </span>
              </div>
              <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", tone.bar)}
                  style={{ width: `${phase.documentCollection.pct}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground">
                {phase.documentCollection.receivedCount} / {phase.documentCollection.totalCount}{" "}
                documents · Mandatory {phase.documentCollection.mandatoryReceived}/
                {phase.documentCollection.mandatoryTotal} · Optional{" "}
                {phase.documentCollection.optionalReceived}/
                {phase.documentCollection.optionalTotal}
              </p>
            </div>
          ) : null}

          {phase.metrics
            .filter((m) => {
              if (phase.documentCollection && m.id === "doc_collection") return false;
              if (phase.creditScore && m.id === "credit_score") return false;
              return true;
            })
            .map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              {m.id.includes("verif") ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              ) : m.id.includes("credit") || m.id.includes("score") ? (
                <FileStack className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Sparkles className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold text-foreground">{m.label}</p>
                  {typeof m.pct === "number" ? (
                    <span className="text-[9px] font-bold tabular-nums text-muted-foreground">
                      {m.pct}%
                    </span>
                  ) : null}
                </div>
                <p className="text-[9px] text-muted-foreground">{m.valueLabel}</p>
                {typeof m.pct === "number" && m.id !== "doc_verification" ? (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", tone.bar)}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {phase.creditScore ? (
            <p className="text-[10px] text-muted-foreground">
              Credit Readiness Score{" "}
              <span className="font-semibold text-foreground">
                {phase.creditScore.score} / {phase.creditScore.max}
              </span>
            </p>
          ) : null}

          {phase.documentHealth ? (
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Document Health · Mandatory Documents
              </p>
              <div className="flex flex-wrap gap-1">
                {HEALTH_META.map((h) => (
                  <span
                    key={h.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                      h.className,
                    )}
                  >
                    {h.label}
                    <span className="tabular-nums font-bold">{phase.documentHealth![h.key]}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {phase.criticalMissing.length > 0 ? (
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Missing Critical Documents
              </p>
              <ul className="space-y-0.5">
                {phase.criticalMissing.map((doc) => (
                  <li key={doc} className="text-[10px] text-foreground">
                    · {doc}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5">
            <p className="mb-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
              Chanakya Recommendation
            </p>
            <p className="text-[10px] leading-snug text-foreground/90">“{phase.chanakyaTip}”</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Enterprise Readiness Dashboard — sits below Business Journey Navigator.
 * Manager-grade transaction health in ~5 seconds.
 */
export function PhaseReadinessDashboard({
  file: fileProp,
  fileId,
  lifeFinalized,
  hasContact,
  hasOpportunity,
  customerName,
  productLabel,
  className,
}: PhaseReadinessDashboardProps) {
  const [resolvedFile, setResolvedFile] = useState<LoanFile | null>(fileProp ?? null);
  const [expanded, setExpanded] = useState<PhaseReadinessPhaseId | null>(null);

  useEffect(() => {
    if (fileProp) {
      setResolvedFile(fileProp);
      return;
    }
    if (!fileId) {
      setResolvedFile(null);
      return;
    }
    const hit = getAllLoanFiles().find((f) => f.id === fileId) ?? null;
    setResolvedFile(hit);
  }, [fileProp, fileId]);

  const snapshot = useMemo(
    () =>
      derivePhaseReadiness({
        file: resolvedFile,
        lifeFinalized,
        hasContact: hasContact ?? Boolean(customerName || resolvedFile?.customerName),
        hasOpportunity: hasOpportunity ?? Boolean(fileId || resolvedFile),
        customerName: customerName ?? resolvedFile?.customerName,
        productLabel: productLabel ?? resolvedFile?.loanProduct,
      }),
    [
      resolvedFile,
      lifeFinalized,
      hasContact,
      hasOpportunity,
      customerName,
      productLabel,
      fileId,
    ],
  );

  if (!fileId && !fileProp && !resolvedFile) {
    return null;
  }

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border/60 bg-background/90 px-3 py-2.5 sm:px-5",
        className,
      )}
      aria-label="Enterprise Readiness Dashboard"
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:gap-4">
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/50 bg-muted/15 px-3 py-2">
          <CircularProgress
            pct={snapshot.overallPct}
            size={64}
            strokeWidth={5}
            progressClassName="stroke-teal-600 dark:stroke-teal-400"
          >
            <span className="text-sm font-bold tabular-nums text-foreground">
              {snapshot.overallPct}%
            </span>
          </CircularProgress>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Overall Transaction Readiness
            </p>
            <p className="text-[11px] font-semibold text-foreground">Headline KPI</p>
            <p className="mt-0.5 line-clamp-2 text-[9px] text-muted-foreground">
              Next: {snapshot.nextBusinessAction}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 xl:grid-cols-4">
          {snapshot.phases.map((phase) => (
            <PhaseCard
              key={phase.phaseId}
              phase={phase}
              expanded={expanded === phase.phaseId}
              onToggle={() =>
                setExpanded((prev) => (prev === phase.phaseId ? null : phase.phaseId))
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-border/50 bg-muted/10 px-2.5 py-2">
        <ChanakyaAvatar size="xs" className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <ChanakyaIdentityLabel className="text-[9px]" />
          <p className="mt-0.5 text-[11px] leading-snug text-foreground/90">
            {snapshot.chanakyaMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
