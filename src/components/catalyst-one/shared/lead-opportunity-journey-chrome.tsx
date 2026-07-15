"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";
import {
  buildJourneyHref,
  getLeadJourneyModule,
  getNextLeadJourneyModule,
  journeyStageEyebrow,
  type LeadJourneyModuleId,
} from "@/constants/lead-opportunity-journey";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JourneyContextChips {
  opportunity?: string;
  customer?: string;
  product?: string;
  amount?: string;
  stage?: string;
  rm?: string;
  life?: string;
}

export interface LeadOpportunityJourneyChromeProps {
  moduleId: LeadJourneyModuleId;
  /** Override business stage eyebrow (e.g. Opportunity after LIFE finalize). */
  stageOverride?: "lead" | "opportunity";
  context?: JourneyContextChips;
  fileId?: string | null;
  opportunityId?: string | null;
  onSaveDraft?: () => void | Promise<void>;
  /** Extra validation before Save & Continue (return false to block). */
  onBeforeContinue?: () => boolean | Promise<boolean>;
  saving?: boolean;
  className?: string;
  children?: React.ReactNode;
  hideContinue?: boolean;
}

/**
 * Shared Lead / Opportunity journey chrome — enterprise header + Save Draft / Save & Continue.
 */
export function LeadOpportunityJourneyChrome({
  moduleId,
  stageOverride,
  context,
  fileId,
  opportunityId,
  onSaveDraft,
  onBeforeContinue,
  saving,
  className,
  children,
  hideContinue,
}: LeadOpportunityJourneyChromeProps) {
  const router = useRouter();
  const mod = getLeadJourneyModule(moduleId);
  const stage = stageOverride ?? mod.stage;
  const next = getNextLeadJourneyModule(moduleId);

  const handleContinue = async () => {
    if (onBeforeContinue) {
      const ok = await onBeforeContinue();
      if (!ok) return;
    }
    if (onSaveDraft) await onSaveDraft();
    if (!next) return;
    router.push(
      buildJourneyHref(next.href, {
        fileId,
        opportunityId,
      }),
    );
  };

  const chips: Array<{ label: string; value: string }> = [
    context?.opportunity ? { label: "Opportunity", value: context.opportunity } : null,
    context?.customer ? { label: "Customer", value: context.customer } : null,
    context?.product ? { label: "Product", value: context.product } : null,
    context?.amount ? { label: "Loan Amount", value: context.amount } : null,
    context?.life ? { label: "Selected LIFE", value: context.life } : null,
    context?.stage ? { label: "Stage", value: context.stage } : null,
    context?.rm ? { label: "RM", value: context.rm } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <header className="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1">
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.18em]",
                stage === "lead"
                  ? "text-teal-700/90 dark:text-teal-300/90"
                  : "text-violet-700/90 dark:text-violet-300/90",
              )}
            >
              {journeyStageEyebrow(stage)}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {mod.title}
            </h1>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex max-w-[200px] flex-col rounded-md border border-border/60 bg-muted/30 px-2 py-0.5"
                  >
                    <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="truncate text-[10px] font-semibold text-foreground">{c.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveDraft && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                disabled={saving}
                onClick={() => void onSaveDraft()}
              >
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </Button>
            )}
            {!hideContinue && next && (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={saving}
                onClick={() => void handleContinue()}
              >
                Save & Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {!hideContinue && next && (
              <Button asChild size="sm" variant="ghost" className="h-8 text-[11px] text-muted-foreground">
                <Link
                  href={buildJourneyHref(next.href, { fileId, opportunityId })}
                  className="gap-1"
                >
                  Skip to {next.label}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
