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
 * Compact Business Transition — next / back only.
 * CO-SPRINT-106 — no helper purpose captions under the CTA.
 */
export function BusinessTransitionCard({
  continueLabel,
  continuePurpose: _continuePurpose,
  onContinue,
  backLabel,
  onBack,
  hideContinue,
  hideBack,
  disabled,
  className,
}: BusinessTransitionCardProps) {
  void _continuePurpose;
  const showContinue = !hideContinue && Boolean(continueLabel && onContinue);
  const showBack = !hideBack && Boolean(backLabel && onBack);
  if (!showContinue && !showBack) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        className,
      )}
    >
      {showBack ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={onBack}
        >
          <ArrowLeft className="h-3 w-3 shrink-0" />
          <span className="max-w-[7rem] truncate">{backLabel}</span>
        </Button>
      ) : null}
      {showContinue ? (
        <Button
          type="button"
          size="sm"
          className="h-8 max-w-[11rem] justify-between gap-2 px-2.5 text-[11px] font-semibold shadow-sm"
          disabled={disabled}
          onClick={onContinue}
        >
          <span className="truncate">{continueLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Button>
      ) : null}
    </div>
  );
}
