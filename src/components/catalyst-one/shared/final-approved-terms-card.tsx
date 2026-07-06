"use client";

import { Lock, Sparkles } from "lucide-react";
import {
  CHANAKYA_PERFORMANCE_BADGE_PLACEHOLDERS,
  pickChanakyaInsight,
} from "@/constants/chanakya-insights";
import { shouldShowFinalLoanAmount } from "@/constants/loan-pipeline";
import { calculateMonthlyEmi } from "@/lib/loan-emi-utils";
import { formatINR } from "@/lib/format-currency";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { formatWorkflowTimestamp } from "@/lib/loan-workflow-metadata";
import type { PipelineStage } from "@/types/catalyst-one";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FinalApprovedTermsCardProps {
  fileId: string;
  stage: PipelineStage;
  finalLoanAmount?: number;
  finalRoi?: number;
  finalTenure?: number;
  finalApprovalDate?: string;
  disabled?: boolean;
  layout?: "row" | "panel";
  onChange: (patch: {
    finalLoanAmount?: number;
    finalRoi?: number;
    finalTenure?: number;
  }) => void;
}

export function FinalApprovedTermsCard({
  fileId,
  stage,
  finalLoanAmount,
  finalRoi,
  finalTenure,
  finalApprovalDate,
  disabled,
  layout = "row",
  onChange,
}: FinalApprovedTermsCardProps) {
  const unlocked = shouldShowFinalLoanAmount(stage);
  const insight = pickChanakyaInsight(fileId);
  const emi = calculateMonthlyEmi(
    finalLoanAmount ?? 0,
    finalRoi ?? 0,
    finalTenure ?? 0,
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-all",
        layout === "panel" ? "w-full" : "min-h-[118px]",
        unlocked
          ? "border-emerald-600/45 bg-gradient-to-br from-emerald-600/[0.20] via-emerald-500/[0.12] to-teal-400/[0.06] shadow-xl shadow-emerald-900/[0.12] ring-1 ring-emerald-500/25"
          : "border-border/50 bg-muted/20 opacity-80",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg ring-1",
            unlocked
              ? "bg-emerald-600/20 text-emerald-700 ring-emerald-600/25 dark:text-emerald-300"
              : "bg-muted text-muted-foreground ring-border/40",
          )}
        >
          {unlocked ? <Sparkles className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm font-semibold tracking-wide",
              unlocked ? "text-emerald-800 dark:text-emerald-200" : "text-muted-foreground",
            )}
          >
            Final Approved Terms
          </h3>
          {!unlocked && (
            <p className="text-[11px] text-muted-foreground">Available after Final Approval</p>
          )}
        </div>
      </div>

      {!unlocked ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            This card unlocks when the loan reaches the Final Approved stage.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <div className={cn("grid gap-2", layout === "panel" ? "grid-cols-1" : "grid-cols-2")}>
            <CompactField label="Final Loan Amount (₹)">
              <INRCurrencyInput
                value={finalLoanAmount}
                disabled={disabled}
                className="border-emerald-600/20 bg-background/80 font-semibold"
                onChange={(v) => onChange({ finalLoanAmount: v })}
              />
            </CompactField>
            <CompactField label="Final ROI %">
              <Input
                type="number"
                step="0.1"
                className="h-8 border-emerald-600/20 bg-background/80 text-xs font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={finalRoi ?? ""}
                disabled={disabled}
                onChange={(e) => onChange({ finalRoi: Number(e.target.value) || undefined })}
              />
            </CompactField>
            <CompactField label="Final Tenure (mo)">
              <Input
                type="number"
                className="h-8 border-emerald-600/20 bg-background/80 text-xs font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={finalTenure ?? ""}
                disabled={disabled}
                onChange={(e) => onChange({ finalTenure: Number(e.target.value) || undefined })}
              />
            </CompactField>
            <CompactField label="EMI">
              <div className="flex h-8 items-center rounded-md border border-emerald-600/20 bg-emerald-500/10 px-2.5 text-xs font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
                {emi != null ? formatINR(emi) : "—"}
              </div>
            </CompactField>
          </div>

          <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
            Final Approval Date:{" "}
            <span className="font-semibold">{formatWorkflowTimestamp(finalApprovalDate)}</span>
          </p>

          <div className="rounded-lg border border-emerald-600/20 bg-emerald-950/[0.03] p-2.5 dark:bg-emerald-500/[0.06]">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
              <span aria-hidden>🧠</span>
              Chanakya&apos;s Insight
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
              {insight}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {CHANAKYA_PERFORMANCE_BADGE_PLACEHOLDERS.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-dashed border-emerald-600/25 px-2 py-0.5 text-[9px] text-emerald-800/60 dark:text-emerald-300/60"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
