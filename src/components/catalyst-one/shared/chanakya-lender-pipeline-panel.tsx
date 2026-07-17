"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LENDER_CASE_STAGE_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

const PROB_RANK: Record<string, number> = {
  very_high: 6,
  high: 5,
  medium: 4,
  low: 3,
  very_low: 2,
  rejected: 1,
  withdrawn: 0,
};

const PROB_PCT: Record<string, number> = {
  very_high: 92,
  high: 78,
  medium: 55,
  low: 35,
  very_low: 18,
};

function daysSince(iso: string) {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
}

export function buildLenderPipelineFeedMessages(loan: LoanFile, cases: LoanLenderExecution[]): string[] {
  const active = cases.filter((c) => c.status !== "closed");
  const messages: string[] = [];

  const best = [...active]
    .filter((c) => c.probability && c.probability !== "rejected" && c.probability !== "withdrawn")
    .sort((a, b) => (PROB_RANK[b.probability ?? ""] ?? 0) - (PROB_RANK[a.probability ?? ""] ?? 0))[0];

  if (best) {
    const pct = PROB_PCT[best.probability ?? "medium"] ?? 55;
    messages.push(`${best.lender} has the highest success probability (${pct}%)`);
  }

  const holdCases = active.filter((c) => normalizeLenderCaseStage(c.caseStage) === "hold");
  holdCases.forEach((c) => {
    if (c.caseSubStage?.toLowerCase().includes("valuation")) {
      messages.push(`${c.lender} file pending valuation report`);
    }
  });

  const idle = active.filter((c) => daysSince(c.updatedAt) >= 3);
  idle.forEach((c) => {
    messages.push(`${c.lender} has not been updated for ${daysSince(c.updatedAt)} days`);
  });

  if (best && !best.isPrimary) {
    messages.push(`Recommend making ${best.lender} Primary`);
  }

  const followUp = active.filter((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return stage === "logged_in_wip" || stage === "closure_wip" || stage === "soft_approved";
  });
  if (followUp.length > 0) {
    messages.push(`${followUp.length} lender case${followUp.length === 1 ? "" : "s"} require follow-up`);
  }

  const slaRisk = active.filter((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return stage === "final_approved" || stage === "closure_wip";
  });
  if (slaRisk.length > 0) {
    messages.push(`${slaRisk.length} lender case${slaRisk.length === 1 ? "" : "s"} approaching SLA breach`);
  }

  active.forEach((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    if (stage === "logged_in_wip" && c.caseSubStage) {
      messages.push(`${c.lender}: ${c.caseSubStage} pending at ${LENDER_CASE_STAGE_LABELS[stage]}`);
    }
  });

  if (messages.length === 0) {
    messages.push("Add a lender case to begin execution tracking");
    messages.push(`Loan ${loan.fileNumber} · ${active.length} active lender case(s)`);
  }

  return messages;
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

  return (
    <div
      className={cn(
        "flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-emerald-600/25",
        "bg-gradient-to-r from-emerald-500/8 via-background/80 to-emerald-500/5 px-2.5 shadow-sm",
        className,
      )}
    >
      <Brain className="h-3 w-3 shrink-0 text-emerald-700 dark:text-emerald-300" />
      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        Chanakya Live
      </span>
      <Sparkles className="h-2.5 w-2.5 shrink-0 text-emerald-600/60" />
      <div className="relative h-4 min-w-0 flex-1 overflow-hidden">
        <div
          className="transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(-${index * 16}px)` }}
        >
          {messages.map((msg, i) => (
            <p key={`${msg}-${i}`} className="h-4 truncate text-[11px] text-foreground/90">
              {msg}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
