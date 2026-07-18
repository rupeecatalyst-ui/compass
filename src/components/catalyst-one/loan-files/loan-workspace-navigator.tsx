"use client";

import Link from "next/link";
import {
  FileStack,
  Landmark,
  Scale,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  LOAN_WORKSPACE_HUB_CARDS,
  LOAN_WORKSPACE_HUB_OFFICIAL_NAME,
  LOAN_WORKSPACE_HUB_STATUS_LINE,
  type LoanWorkspaceHubCardId,
} from "@/constants/loan-workspace-navigator";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import {
  getActiveOpportunityContext,
  type ActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const ICONS: Record<LoanWorkspaceHubCardId, LucideIcon> = {
  strategic_bench: Target,
  credit_bench: Scale,
  loan_workspace: Landmark,
  documents: FileStack,
};

function resolveCardHref(href: string, ctx: ActiveOpportunityContext | null): string {
  if (!ctx?.fileId) return href;
  const path = href.split("?")[0] ?? href;
  if (path === ROUTES.LOAN_FILES) {
    return buildJourneyHref(ROUTES.LOAN_FILES, {
      fileId: ctx.fileId,
      opportunityId: ctx.opportunityId,
    });
  }
  return buildJourneyHref(path, {
    fileId: ctx.fileId,
    opportunityId: ctx.opportunityId,
  });
}

/** Operational hub — four benches. Not an analytics dashboard. */
export function LoanWorkspaceNavigator() {
  const [ctx, setCtx] = useState<ActiveOpportunityContext | null>(null);

  useEffect(() => {
    setCtx(getActiveOpportunityContext());
  }, []);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-5xl flex-col justify-center px-4 py-8 md:px-6">
      <div className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Execution hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{LOAN_WORKSPACE_HUB_OFFICIAL_NAME}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{LOAN_WORKSPACE_HUB_STATUS_LINE}</p>
        {ctx?.label || ctx?.customerName ? (
          <p className="mt-3 inline-flex rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-900 dark:text-teal-100">
            Active opportunity
            {ctx.label ? `: ${ctx.label}` : ""}
            {ctx.customerName ? ` · ${ctx.customerName}` : ""}
            {ctx.product ? ` · ${ctx.product}` : ""}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {LOAN_WORKSPACE_HUB_CARDS.map((card) => {
          const Icon = ICONS[card.id];
          const href = resolveCardHref(card.href, ctx);
          return (
            <Link
              key={card.id}
              href={href}
              className={cn(
                "group flex min-h-[132px] flex-col rounded-xl border bg-card p-5 shadow-sm transition-colors",
                card.accentClass,
              )}
            >
              <div
                className={cn(
                  "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                  card.iconTone,
                )}
              >
                <Icon className="h-4.5 w-4.5 h-4 w-4" aria-hidden />
              </div>
              <p className="text-base font-semibold tracking-tight">{card.label}</p>
              <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <p className="mt-3 text-[11px] font-medium text-teal-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-teal-200">
                Open workspace →
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
