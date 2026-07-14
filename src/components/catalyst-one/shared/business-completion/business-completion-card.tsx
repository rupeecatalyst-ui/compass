"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useChanakyaGreeting } from "@/hooks/use-chanakya-greeting";
import { cn } from "@/lib/utils";
import type { BusinessCompletionGuide } from "@/types/business-completion";

/**
 * CHANAKYA link/guide card (CF-CHANAKYA-001 / CF-CHANAKYA-002 / CF-WF-001).
 * Use when the user must continue elsewhere (e.g. open Loan Files).
 * Prefer BusinessCompletionDialog when fields can be collected inline.
 */
export function BusinessCompletionCard({
  guide,
  className,
}: {
  guide: BusinessCompletionGuide;
  className?: string;
}) {
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "there";
  const greeting = useChanakyaGreeting({
    context: "guidance",
    firstName,
    surfaceKey: `bcc-guide:${guide.code}`,
  });

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-50/90 via-background to-background p-5 shadow-sm dark:border-violet-800/50 dark:from-violet-950/40",
        className,
      )}
      role="status"
    >
      <div className="flex gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-violet-400/35">
          <Image
            src="/images/chanakya-portrait.png"
            alt="CHANAKYA"
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
            CHANAKYA · Business Guidance
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            {greeting.text}
          </h2>
          <p className="mt-1 text-sm font-medium text-foreground/90">{guide.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{guide.message}</p>
          {(guide.actionHref || guide.onAction) && (
            <div className="mt-4">
              {guide.actionHref ? (
                <Button asChild className="rounded-lg bg-violet-600 hover:bg-violet-500" size="sm">
                  <Link href={guide.actionHref}>{guide.actionLabel}</Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-lg bg-violet-600 hover:bg-violet-500"
                  size="sm"
                  onClick={guide.onAction}
                >
                  {guide.actionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer BusinessCompletionCard — alias for CF-CHANAKYA-001 naming */
export const ChanakyaBusinessGuidanceCard = BusinessCompletionCard;
