"use client";

import { Brain, Sparkles } from "lucide-react";
import { LoanOriginationSection } from "@/components/catalyst-one/shared/loan-origination-section";
import { cn } from "@/lib/utils";

const PLACEHOLDER_ITEMS = [
  { label: "Financial Health", value: "Awaiting participant and loan data…" },
  { label: "Suggested Product", value: "Will recommend after product selection" },
  { label: "Suggested Lender", value: "Will recommend after amount review" },
  { label: "Missing Information", value: "None identified yet" },
  { label: "Risk Indicators", value: "Preliminary scan pending" },
  { label: "Next Best Action", value: "Complete loan details to proceed" },
] as const;

/** UX-03 — Chanakya assistance panel for loan origination (AI-ready placeholders). */
export function ChanakyaOriginationPanel({ className }: { className?: string }) {
  return (
    <LoanOriginationSection
      theme="emerald"
      title="Chanakya"
      description="AI-assisted origination guidance"
      icon={<Brain className="h-4 w-4" />}
      className={cn("h-full", className)}
    >
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-500/5 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
        <p className="text-[11px] text-emerald-900/90 dark:text-emerald-100/90">
          Intelligence activates as you complete the origination form.
        </p>
      </div>
      <div className="space-y-2.5">
        {PLACEHOLDER_ITEMS.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-emerald-600/15 bg-background/60 px-3 py-2.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-foreground/90">{item.value}</p>
          </div>
        ))}
      </div>
    </LoanOriginationSection>
  );
}
