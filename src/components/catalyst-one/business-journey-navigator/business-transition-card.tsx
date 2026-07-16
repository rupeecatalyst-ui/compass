"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BusinessTransitionCardProps {
  continueLabel?: string | null;
  continuePurpose?: string | null;
  onContinue?: () => void;
  backLabel?: string | null;
  onBack?: () => void;
  hideContinue?: boolean;
  hideBack?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Compact Business Transition Card — next step + purpose + subtle Back.
 * Always preserves transaction context (caller supplies context-aware handlers).
 */
export function BusinessTransitionCard({
  continueLabel,
  continuePurpose,
  onContinue,
  backLabel,
  onBack,
  hideContinue,
  hideBack,
  disabled,
  className,
}: BusinessTransitionCardProps) {
  const showContinue = !hideContinue && Boolean(continueLabel && onContinue);
  const showBack = !hideBack && Boolean(backLabel && onBack);
  if (!showContinue && !showBack) return null;

  return (
    <div
      className={cn(
        "flex max-w-[16.5rem] flex-col gap-1 rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2 shadow-sm",
        className,
      )}
    >
      {showContinue ? (
        <>
          <Button
            type="button"
            size="sm"
            className="h-8 w-full justify-between gap-2 px-2.5 text-[11px] font-semibold shadow-sm"
            disabled={disabled}
            onClick={onContinue}
          >
            <span className="truncate">{continueLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Button>
          {continuePurpose ? (
            <p className="px-0.5 text-[9px] leading-snug text-muted-foreground">
              {continuePurpose}
            </p>
          ) : null}
        </>
      ) : null}
      {showBack ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 justify-start gap-1 px-1 text-[10px] text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={onBack}
        >
          <ArrowLeft className="h-3 w-3 shrink-0" />
          <span className="truncate">{backLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}
