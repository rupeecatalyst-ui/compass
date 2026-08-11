"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Soft suggestion chips — show at most two (one preferred). */
export function SuggestedQuestionsBar({
  questions,
  disabled,
  onSelect,
  className,
  maxVisible = 2,
}: {
  questions: string[];
  disabled?: boolean;
  onSelect: (question: string) => void;
  className?: string;
  maxVisible?: number;
}) {
  const visible = questions.slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)} aria-label="Suggested replies">
      {visible.map((q) => (
        <Button
          key={q}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-auto max-w-full whitespace-normal rounded-full border-border/60 bg-background/80 px-4 py-2 text-left text-xs font-normal text-foreground/90 hover:border-teal-600/40 hover:bg-teal-500/5"
          onClick={() => onSelect(q)}
        >
          {q}
        </Button>
      ))}
    </div>
  );
}
