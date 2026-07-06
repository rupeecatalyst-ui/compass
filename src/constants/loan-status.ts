import type { LoanFile, LoanFilePriority } from "@/types/catalyst-one";

/** Catalyst One — unified status & priority colours (Loan Board v1.0) */
export const LOAN_FILE_STATUS_STYLES: Record<
  LoanFile["status"],
  { label: string; className: string }
> = {
  on_track: { label: "On Track", className: "text-success" },
  delayed: { label: "Delayed", className: "text-destructive" },
  at_risk: { label: "At Risk", className: "text-warning" },
  completed: { label: "Completed", className: "text-muted-foreground" },
};

export const LOAN_FILE_PRIORITY_STYLES: Record<
  LoanFilePriority,
  { className: string }
> = {
  urgent: { className: "border-destructive/40 text-destructive bg-destructive/10" },
  high: { className: "border-warning/40 text-warning bg-warning/10" },
  medium: { className: "border-info/40 text-info bg-info/10" },
  low: { className: "border-border text-muted-foreground bg-muted/50" },
};

/** Premium amber/gold for lender names */
export const LENDER_NAME_CLASS = "text-amber-700 dark:text-amber-400 font-medium";

/** Financial values on cards */
export const FINANCIAL_PRIMARY_CLASS = "font-bold text-success tabular-nums";
export const FINANCIAL_SECONDARY_CLASS = "font-semibold text-success tabular-nums";
