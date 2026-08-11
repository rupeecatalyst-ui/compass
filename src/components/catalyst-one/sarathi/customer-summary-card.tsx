"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SarathiSummaryFact } from "@/lib/enterprise-ai-platform/conversation-experience";
import { EAI_SARATHI_SUMMARY_PREFACE } from "@/constants/enterprise-ai-platform/conversation-experience";

/**
 * Customer confirmation summary — shown before recommendations / next steps.
 */
export function CustomerSummaryCard({
  facts,
  onConfirm,
  onEdit,
  disabled,
  className,
}: {
  facts: SarathiSummaryFact[];
  onConfirm: () => void;
  onEdit?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  if (facts.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] px-5 py-5 shadow-sm",
        className,
      )}
      role="region"
      aria-label="Conversation summary"
    >
      <p className="font-display text-base text-foreground">{EAI_SARATHI_SUMMARY_PREFACE}</p>
      <dl className="mt-4 space-y-2.5">
        {facts.map((f) => (
          <div
            key={`${f.label}:${f.value}`}
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd className="text-sm font-medium text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled} onClick={onConfirm}>
          Yes, that looks right
        </Button>
        {onEdit ? (
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onEdit}>
            Let me correct something
          </Button>
        ) : null}
      </div>
    </div>
  );
}
