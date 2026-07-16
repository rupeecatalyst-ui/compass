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
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
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
  /** Override module title (e.g. customer name as workspace identity). */
  title?: string;
  /** Single-line meta under title — prefer over chip rows. */
  identityLine?: string;
  context?: JourneyContextChips;
  /** Hide context chip row (use identityLine instead). */
  hideContextChips?: boolean;
  /** Compact Enterprise Workspace Header (~40–50% shorter). */
  density?: "default" | "compact";
  /** Primary contextual actions (Action Center) — before Save. */
  headerActions?: React.ReactNode;
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
 * Shared Lead / Opportunity journey chrome — single Enterprise Workspace Header.
 */
export function LeadOpportunityJourneyChrome({
  moduleId,
  stageOverride,
  title,
  identityLine,
  context,
  hideContextChips = false,
  density = "default",
  headerActions,
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
  const compact = density === "compact";

  const handleContinue = async () => {
    if (onBeforeContinue) {
      const ok = await onBeforeContinue();
      if (!ok) return;
    }
    if (onSaveDraft) await onSaveDraft();
    if (!next) return;
    if (fileId) {
      setActiveOpportunityContext({
        fileId,
        opportunityId: opportunityId ?? undefined,
        customerName: context?.customer,
        product: context?.product,
        label: context?.opportunity,
      });
    }
    router.push(
      buildJourneyHref(next.href, {
        fileId,
        opportunityId,
      }),
    );
  };

  const chips: Array<{ label: string; value: string }> = hideContextChips
    ? []
    : ([
        context?.opportunity ? { label: "Opportunity", value: context.opportunity } : null,
        context?.customer ? { label: "Customer", value: context.customer } : null,
        context?.product ? { label: "Product", value: context.product } : null,
        context?.amount ? { label: "Loan Amount", value: context.amount } : null,
        context?.life ? { label: "Selected LIFE", value: context.life } : null,
        context?.stage ? { label: "Stage", value: context.stage } : null,
        context?.rm ? { label: "RM", value: context.rm } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>);

  const displayTitle = title?.trim() || mod.title;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <header className="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 sm:px-5",
            compact ? "py-1.5" : "py-2",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p
                className={cn(
                  "shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em]",
                  stage === "lead"
                    ? "text-teal-700/90 dark:text-teal-300/90"
                    : "text-violet-700/90 dark:text-violet-300/90",
                )}
              >
                {journeyStageEyebrow(stage)}
              </p>
              <h1
                className={cn(
                  "truncate font-semibold tracking-tight text-foreground",
                  compact ? "text-sm sm:text-base" : "text-base sm:text-lg",
                )}
              >
                {displayTitle}
              </h1>
            </div>
            {identityLine ? (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{identityLine}</p>
            ) : null}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex max-w-[180px] items-center gap-1 rounded border border-border/50 bg-muted/20 px-1.5 py-px text-[10px]"
                  >
                    <span className="font-medium text-muted-foreground">{c.label}</span>
                    <span className="truncate font-semibold text-foreground">{c.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {headerActions}
            {onSaveDraft && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={saving}
                onClick={() => void onSaveDraft()}
              >
                <Save className="h-3 w-3" />
                Save Draft
              </Button>
            )}
            {!hideContinue && next && (
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={saving}
                onClick={() => void handleContinue()}
              >
                Save & Continue
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            {!hideContinue && next && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] text-muted-foreground"
              >
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
