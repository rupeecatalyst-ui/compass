"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildMinimalLenderPipelineInsight } from "@/lib/strategic-lender-pipeline";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

/** CO-SPRINT-089 — Minimal CHANAKYA guidance for Lender Pipeline. */
export function buildLenderPipelineFeedMessages(_loan: LoanFile, cases: LoanLenderExecution[]): string[] {
  return buildMinimalLenderPipelineInsight(cases);
}

/** UX-04E — Horizontal Chanakya live feed (presentation layer, rule-based). */
export function ChanakyaLenderPipelinePanel({
  loan,
  cases,
  className,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
  className?: string;
}) {
  const messages = useMemo(() => buildLenderPipelineFeedMessages(loan, cases), [loan, cases]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [messages.length]);

  const current = messages[index] ?? messages[0] ?? "";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5",
        className,
      )}
    >
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <Brain className="h-3.5 w-3.5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
        <span className="mr-1 font-semibold text-foreground/80">CHANAKYA</span>
        {current}
      </p>
      <Sparkles className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
    </div>
  );
}
