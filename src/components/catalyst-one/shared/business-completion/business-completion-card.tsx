"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BusinessCompletionGuide } from "@/types/business-completion";

/**
 * Link / guide variant of Business Completion Card (CF-WF-001).
 * Use when the user must navigate elsewhere to complete context
 * (e.g. open Loan Files). Prefer BusinessCompletionDialog when fields
 * can be collected inline without leaving the process.
 */
export function BusinessCompletionCard({
  guide,
  className,
}: {
  guide: BusinessCompletionGuide;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-300/70 bg-amber-50/90 p-5 dark:border-amber-900 dark:bg-amber-950/40",
        className,
      )}
      role="status"
    >
      <h2 className="text-base font-semibold tracking-tight text-amber-950 dark:text-amber-50">
        {guide.title}
      </h2>
      <p className="mt-1.5 text-sm text-amber-900/90 dark:text-amber-100/90">{guide.message}</p>
      {(guide.actionHref || guide.onAction) && (
        <div className="mt-4">
          {guide.actionHref ? (
            <Button asChild className="rounded-lg" size="sm">
              <Link href={guide.actionHref}>{guide.actionLabel}</Link>
            </Button>
          ) : (
            <Button type="button" className="rounded-lg" size="sm" onClick={guide.onAction}>
              {guide.actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
