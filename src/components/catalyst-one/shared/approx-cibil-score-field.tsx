"use client";

import { HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  APPROX_CIBIL_SCORE_OPTIONS,
  APPROX_CIBIL_SCORE_TOOLTIP,
  type ApproxCibilScoreBand,
} from "@/constants/cibil-score-master";
import { cn } from "@/lib/utils";

interface ApproxCibilScoreFieldProps {
  value?: ApproxCibilScoreBand | "";
  onChange: (value: ApproxCibilScoreBand) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Compact loan-journey styling */
  triggerClassName?: string;
  id?: string;
}

/**
 * CO-SPRINT-101 — Shared Approximate CIBIL Score control (Loan Journey + Wealth Partner).
 */
export function ApproxCibilScoreField({
  value,
  onChange,
  error,
  required = true,
  disabled,
  className,
  triggerClassName,
  id = "approx-cibil-score",
}: ApproxCibilScoreFieldProps) {
  return (
    <div className={cn(className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-[10px] uppercase text-muted-foreground">
          Approximate CIBIL Score{required ? " *" : ""}
        </Label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex text-muted-foreground hover:text-foreground"
                aria-label="Approximate CIBIL Score help"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-snug">
              {APPROX_CIBIL_SCORE_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mt-1">
        <Select
          value={value || undefined}
          onValueChange={(v) => onChange(v as ApproxCibilScoreBand)}
          disabled={disabled}
        >
          <SelectTrigger
            id={id}
            className={cn("h-8 text-xs", error && "border-destructive", triggerClassName)}
          >
            <SelectValue placeholder="Select approximate CIBIL score" />
          </SelectTrigger>
          <SelectContent>
            {APPROX_CIBIL_SCORE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
