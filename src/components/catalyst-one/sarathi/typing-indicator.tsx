"use client";

import { cn } from "@/lib/utils";

/**
 * Natural thinking / typing state (CO-SARATHI-UX-002).
 */
export function TypingIndicator({
  className,
  label = "SARATHI is thinking…",
}: {
  className?: string;
  /** Progressive or default thinking label */
  label?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-[min(36rem,88%)] items-center gap-2 rounded-2xl rounded-bl-md bg-background px-3.5 py-2.5 text-muted-foreground shadow-sm ring-1 ring-border/50",
        className,
      )}
      aria-label={label}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600/70" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600/70 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600/70 [animation-delay:300ms]" />
      </span>
      <span className="text-xs leading-snug text-foreground/70">{label}</span>
    </div>
  );
}
